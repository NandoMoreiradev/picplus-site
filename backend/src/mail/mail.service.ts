import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';
import { config } from '../config/configuration';

interface SendMailInput {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
}

/**
 * Envio de e-mails via Resend. Falhas de envio nunca derrubam a requisição
 * principal: são registradas em log e `send` retorna false.
 * Sem RESEND_API_KEY (ambiente local) apenas registra o e-mail no log.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly client = config.mail.apiKey
    ? new Resend(config.mail.apiKey)
    : null;

  get adminRecipients(): string[] {
    return config.mail.notifyTo;
  }

  async send({ to, subject, html, replyTo }: SendMailInput): Promise<boolean> {
    const recipients = Array.isArray(to) ? to : [to];
    if (!recipients.length) return false;

    if (!this.client) {
      this.logger.warn(
        `[sem RESEND_API_KEY] E-mail não enviado → ${recipients.join(', ')} | ${subject}`,
      );
      return false;
    }

    try {
      const { error } = await this.client.emails.send({
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
        return false;
      }
      return true;
    } catch (err) {
      this.logger.error(
        `Falha ao enviar "${subject}": ${err instanceof Error ? err.message : String(err)}`,
      );
      return false;
    }
  }
}
