import {
  BadRequestException,
  Injectable,
  Logger,
  Optional,
  UnauthorizedException,
} from '@nestjs/common';
import { EmailLogStatus, EmailTriggerType, Prisma } from '@prisma/client';
import { Resend, type WebhookEventPayload } from 'resend';
import { config } from '../config/configuration';
import { PrismaService } from '../prisma/prisma.service';

export interface SendMailInput {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
  trigger?: EmailTriggerType | null;
  templateId?: string | null;
  templateName?: string | null;
}

const STATUS_RANK: Record<EmailLogStatus, number> = {
  SIMULATED: 0,
  SCHEDULED: 1,
  SENT: 2,
  DELAYED: 3,
  DELIVERED: 4,
  OPENED: 5,
  CLICKED: 6,
  BOUNCED: 10,
  COMPLAINED: 10,
  SUPPRESSED: 10,
  FAILED: 10,
};

/**
 * Envio de e-mails via Resend e rastreamento de status (envio + webhooks).
 * Falhas de envio nunca derrubam a requisição principal: são registradas
 * em log e `send` retorna false.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly client = config.mail.apiKey
    ? new Resend(config.mail.apiKey)
    : null;

  constructor(@Optional() private readonly prisma?: PrismaService) {}

  get adminRecipients(): string[] {
    return config.mail.notifyTo;
  }

  private async recordLog(data: Prisma.EmailLogCreateInput): Promise<void> {
    if (!this.prisma?.emailLog?.create) return;
    try {
      await this.prisma.emailLog.create({ data });
    } catch (err) {
      this.logger.warn(
        `Não foi possível gravar histórico de e-mail: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  async send({
    to,
    subject,
    html,
    replyTo,
    trigger = null,
    templateId = null,
    templateName = null,
  }: SendMailInput): Promise<boolean> {
    const recipients = Array.isArray(to) ? to : [to];
    if (!recipients.length) return false;
    const recipientText = recipients.join(', ');

    if (!this.client) {
      this.logger.warn(
        `[sem RESEND_API_KEY] E-mail não enviado → ${recipientText} | ${subject}`,
      );
      await this.recordLog({
        trigger,
        templateId,
        templateName,
        to: recipientText,
        subject,
        status: EmailLogStatus.SIMULATED,
        lastEvent: 'simulated',
        errorMessage:
          'RESEND_API_KEY não configurada (registrado apenas em log).',
      });
      return false;
    }

    try {
      const { data, error } = await this.client.emails.send({
        from: config.mail.from,
        to: recipients,
        subject,
        html,
        replyTo,
      });

      if (error) {
        this.logger.error(
          `Resend recusou o e-mail "${subject}": ${error.message}`,
        );
        await this.recordLog({
          trigger,
          templateId,
          templateName,
          to: recipientText,
          subject,
          status: EmailLogStatus.FAILED,
          lastEvent: 'api.error',
          errorMessage: error.message,
          failedAt: new Date(),
        });
        return false;
      }

      await this.recordLog({
        resendEmailId: data?.id ?? null,
        trigger,
        templateId,
        templateName,
        to: recipientText,
        subject,
        status: EmailLogStatus.SENT,
        lastEvent: 'email.sent',
      });
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Falha ao enviar "${subject}": ${message}`);
      await this.recordLog({
        trigger,
        templateId,
        templateName,
        to: recipientText,
        subject,
        status: EmailLogStatus.FAILED,
        lastEvent: 'api.exception',
        errorMessage: message,
        failedAt: new Date(),
      });
      return false;
    }
  }

  /**
   * Valida a assinatura Svix enviada pelo Resend e atualiza o status do e-mail
   * correspondente em `EmailLog`.
   */
  async handleResendWebhook(
    rawPayload: string,
    headers: { id?: string; timestamp?: string; signature?: string },
  ) {
    const secret = config.mail.webhookSecret;
    if (!secret) {
      this.logger.warn(
        'RESEND_WEBHOOK_SECRET não configurado. Webhook do Resend rejeitado.',
      );
      throw new BadRequestException('RESEND_WEBHOOK_SECRET não configurado.');
    }

    if (!headers.id || !headers.timestamp || !headers.signature) {
      throw new UnauthorizedException(
        'Cabeçalhos de assinatura do webhook ausentes.',
      );
    }

    let event: WebhookEventPayload;
    try {
      const verifier = this.client ?? new Resend('re_webhook_verifier');
      event = verifier.webhooks.verify({
        payload: rawPayload,
        headers: {
          id: headers.id,
          timestamp: headers.timestamp,
          signature: headers.signature,
        },
        webhookSecret: secret,
      });
    } catch (err) {
      this.logger.warn(
        `Assinatura de webhook do Resend inválida: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw new UnauthorizedException('Assinatura do webhook inválida.');
    }

    return this.applyWebhookEvent(event);
  }

  async applyWebhookEvent(event: WebhookEventPayload) {
    if (!this.prisma?.emailLog) {
      return { ok: true, ignored: true };
    }

    const mapped = this.mapWebhookEvent(event);
    if (!mapped) {
      return { ok: true, ignored: true };
    }

    const eventDate = this.parseDate(event.created_at);
    const emailId = mapped.emailId;
    const existing = await this.prisma.emailLog.findUnique({
      where: { resendEmailId: emailId },
    });

    if (!existing) {
      await this.prisma.emailLog.create({
        data: {
          resendEmailId: emailId,
          to: mapped.to,
          subject: mapped.subject,
          status: mapped.status,
          lastEvent: event.type,
          errorMessage: mapped.errorMessage,
          metadata: mapped.metadata,
          sentAt: eventDate,
          ...mapped.timestamps(eventDate),
        },
      });
      return { ok: true, created: true };
    }

    const shouldAdvanceStatus =
      STATUS_RANK[mapped.status] >= STATUS_RANK[existing.status];

    await this.prisma.emailLog.update({
      where: { id: existing.id },
      data: {
        ...(shouldAdvanceStatus
          ? { status: mapped.status, lastEvent: event.type }
          : {}),
        ...(mapped.errorMessage ? { errorMessage: mapped.errorMessage } : {}),
        ...(mapped.metadata ? { metadata: mapped.metadata } : {}),
        ...mapped.timestamps(eventDate),
      },
    });

    return { ok: true };
  }

  private parseDate(iso?: string): Date {
    const parsed = iso ? new Date(iso) : new Date();
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  }

  private mapWebhookEvent(event: WebhookEventPayload): {
    emailId: string;
    to: string;
    subject: string;
    status: EmailLogStatus;
    errorMessage: string | null;
    metadata?: Prisma.InputJsonValue;
    timestamps: (at: Date) => {
      deliveredAt?: Date;
      openedAt?: Date;
      clickedAt?: Date;
      bouncedAt?: Date;
      complainedAt?: Date;
      failedAt?: Date;
    };
  } | null {
    const baseFrom = (data: {
      email_id: string;
      to: string[];
      subject: string;
    }) => ({
      emailId: data.email_id,
      to: Array.isArray(data.to) ? data.to.join(', ') : '',
      subject: data.subject ?? '(sem assunto)',
    });

    switch (event.type) {
      case 'email.sent':
        return {
          ...baseFrom(event.data),
          status: EmailLogStatus.SENT,
          errorMessage: null,
          timestamps: () => ({}),
        };
      case 'email.scheduled':
        return {
          ...baseFrom(event.data),
          status: EmailLogStatus.SCHEDULED,
          errorMessage: null,
          timestamps: () => ({}),
        };
      case 'email.delivered':
        return {
          ...baseFrom(event.data),
          status: EmailLogStatus.DELIVERED,
          errorMessage: null,
          timestamps: (at) => ({ deliveredAt: at }),
        };
      case 'email.delivery_delayed':
        return {
          ...baseFrom(event.data),
          status: EmailLogStatus.DELAYED,
          errorMessage: null,
          timestamps: () => ({}),
        };
      case 'email.opened':
        return {
          ...baseFrom(event.data),
          status: EmailLogStatus.OPENED,
          errorMessage: null,
          timestamps: (at) => ({ openedAt: at }),
        };
      case 'email.clicked':
        return {
          ...baseFrom(event.data),
          status: EmailLogStatus.CLICKED,
          errorMessage: null,
          metadata: event.data.click
            ? ({ click: event.data.click } as unknown as Prisma.InputJsonValue)
            : undefined,
          timestamps: (at) => ({ clickedAt: at }),
        };
      case 'email.bounced': {
        const bounce = event.data.bounce;
        const msg = bounce
          ? [bounce.type, bounce.subType, bounce.message]
              .filter(Boolean)
              .join(' — ')
          : 'E-mail retornou (bounce).';
        return {
          ...baseFrom(event.data),
          status: EmailLogStatus.BOUNCED,
          errorMessage: msg,
          metadata: bounce
            ? ({ bounce } as unknown as Prisma.InputJsonValue)
            : undefined,
          timestamps: (at) => ({ bouncedAt: at }),
        };
      }
      case 'email.complained':
        return {
          ...baseFrom(event.data),
          status: EmailLogStatus.COMPLAINED,
          errorMessage: 'Destinatário marcou o e-mail como spam.',
          timestamps: (at) => ({ complainedAt: at }),
        };
      case 'email.suppressed': {
        const sup = event.data.suppressed;
        return {
          ...baseFrom(event.data),
          status: EmailLogStatus.SUPPRESSED,
          errorMessage: sup?.message || 'Envio suprimido pelo Resend.',
          metadata: sup
            ? ({ suppressed: sup } as unknown as Prisma.InputJsonValue)
            : undefined,
          timestamps: (at) => ({ failedAt: at }),
        };
      }
      case 'email.failed': {
        const failed = event.data.failed;
        return {
          ...baseFrom(event.data),
          status: EmailLogStatus.FAILED,
          errorMessage: failed?.reason || 'Falha no envio do e-mail.',
          metadata: failed
            ? ({ failed } as unknown as Prisma.InputJsonValue)
            : undefined,
          timestamps: (at) => ({ failedAt: at }),
        };
      }
      default:
        return null;
    }
  }
}
