import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { EmailLogStatus, EmailTriggerType, Prisma } from '@prisma/client';
import { pageArgs, paginated } from '../common/utils/paginate';
import { config } from '../config/configuration';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  AVAILABLE_MERGE_TAGS,
  AVAILABLE_TRIGGERS,
  DEFAULT_EMAIL_TEMPLATES,
} from './default-email-templates';
import {
  CreateEmailTemplateDto,
  UpdateEmailTemplateDto,
} from './dto/email-template.dto';
import {
  EmailDesignJson,
  EmailRendererService,
  MergeTagContext,
} from './email-renderer.service';

const MAX_BODY_LENGTH = 100_000;

@Injectable()
export class EmailTemplatesService implements OnApplicationBootstrap {
  private readonly logger = new Logger(EmailTemplatesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly renderer: EmailRendererService,
    private readonly mail: MailService,
  ) {}

  async onApplicationBootstrap() {
    await this.ensureDefaultTemplates();
  }

  private async ensureDefaultTemplates() {
    try {
      // Em testes unitários onde prisma.emailTemplate pode não estar no mock, ignora silenciosamente.
      if (!this.prisma.emailTemplate?.findMany) return;
      // Cria só os gatilhos que ainda não têm template (instalações antigas ganham os novos).
      const existing = await this.prisma.emailTemplate.findMany({
        where: { trigger: { not: null } },
        select: { trigger: true },
      });
      const taken = new Set(existing.map((item) => item.trigger));
      const missing = DEFAULT_EMAIL_TEMPLATES.filter(
        (seed) => !taken.has(seed.trigger),
      );
      if (!missing.length) return;

      for (const seed of missing) {
        const inner = this.renderer.renderDesignJson(seed.designJson);
        const body = this.renderer.wrapInBrandLayout(
          inner,
          seed.designJson.settings,
        );
        await this.prisma.emailTemplate.create({
          data: {
            name: seed.name,
            subject: seed.subject,
            trigger: seed.trigger,
            body,
            designJson: seed.designJson as unknown as Prisma.InputJsonValue,
            active: true,
          },
        });
      }
      this.logger.log(
        `Templates de e-mail padrão criados (${missing.length}).`,
      );
    } catch (error) {
      this.logger.warn(
        `Seed de templates de e-mail ignorado: ${(error as Error).message}`,
      );
    }
  }

  getTriggers() {
    return AVAILABLE_TRIGGERS;
  }

  getMergeTags() {
    return AVAILABLE_MERGE_TAGS;
  }

  async findAll(query: { search?: string; trigger?: string } = {}) {
    const where: Prisma.EmailTemplateWhereInput = {};
    if (query.search?.trim()) {
      where.OR = [
        { name: { contains: query.search.trim(), mode: 'insensitive' } },
        { subject: { contains: query.search.trim(), mode: 'insensitive' } },
      ];
    }
    if (query.trigger === '__manual__') {
      where.trigger = null;
    } else if (query.trigger) {
      where.trigger = query.trigger as EmailTriggerType;
    }

    return this.prisma.emailTemplate.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }],
      include: {
        createdBy: { select: { id: true, name: true } },
      },
    });
  }

  async findOne(id: string) {
    const template = await this.prisma.emailTemplate.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, name: true } },
      },
    });
    if (!template) {
      throw new NotFoundException('Template de e-mail não encontrado.');
    }
    return template;
  }

  async create(dto: CreateEmailTemplateDto, userId?: string) {
    if (dto.body && dto.body.length > MAX_BODY_LENGTH) {
      throw new BadRequestException(
        `O corpo do e-mail excede o limite de ${MAX_BODY_LENGTH} caracteres.`,
      );
    }

    let body = dto.body?.trim() || '';
    if (dto.designJson && Array.isArray(dto.designJson.blocks)) {
      const inner = this.renderer.renderDesignJson(dto.designJson);
      body = this.renderer.wrapInBrandLayout(inner, dto.designJson.settings);
    } else if (!body) {
      body = this.renderer.wrapInBrandLayout(
        '<p>Edite o conteúdo deste template.</p>',
      );
    }

    try {
      return await this.prisma.emailTemplate.create({
        data: {
          name: dto.name.trim(),
          subject: dto.subject.trim(),
          trigger: dto.trigger ?? null,
          body,
          designJson: dto.designJson
            ? (dto.designJson as unknown as Prisma.InputJsonValue)
            : Prisma.JsonNull,
          active: dto.active ?? true,
          createdById: userId ?? null,
        },
      });
    } catch (error) {
      if ((error as { code?: string })?.code === 'P2002') {
        throw new ConflictException(
          'Já existe um template vinculado a este gatilho automático. Edite o existente ou escolha outro gatilho.',
        );
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateEmailTemplateDto) {
    const existing = await this.findOne(id);
    if (dto.body && dto.body.length > MAX_BODY_LENGTH) {
      throw new BadRequestException(
        `O corpo do e-mail excede o limite de ${MAX_BODY_LENGTH} caracteres.`,
      );
    }

    let body = dto.body !== undefined ? dto.body : existing.body;
    const designToUse =
      dto.designJson !== undefined
        ? dto.designJson
        : (existing.designJson as EmailDesignJson | null);

    if (
      dto.designJson &&
      typeof dto.designJson === 'object' &&
      Array.isArray(dto.designJson.blocks)
    ) {
      const inner = this.renderer.renderDesignJson(dto.designJson);
      body = this.renderer.wrapInBrandLayout(inner, dto.designJson.settings);
    }

    try {
      return await this.prisma.emailTemplate.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
          ...(dto.subject !== undefined ? { subject: dto.subject.trim() } : {}),
          ...(dto.trigger !== undefined ? { trigger: dto.trigger } : {}),
          ...(dto.active !== undefined ? { active: dto.active } : {}),
          body,
          ...(dto.designJson !== undefined
            ? {
                designJson: designToUse
                  ? (designToUse as unknown as Prisma.InputJsonValue)
                  : Prisma.JsonNull,
              }
            : {}),
        },
      });
    } catch (error) {
      if ((error as { code?: string })?.code === 'P2002') {
        throw new ConflictException(
          'Já existe outro template vinculado a este gatilho.',
        );
      }
      throw error;
    }
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.emailTemplate.delete({ where: { id } });
    return { ok: true };
  }

  private getSampleContext(): MergeTagContext {
    const frontendUrl = config.frontendUrl;
    return {
      student: {
        name: 'Camila Mendes',
        first_name: 'Camila',
        email: 'camila@exemplo.com.br',
      },
      course: {
        title: 'Posicionamento e Conteúdo para Criadores',
        instructor: 'Equipe PicPlus',
        workload_hours: '12',
        url: `${frontendUrl}/academy/minha-area`,
      },
      lesson: {
        title: 'Aula 01 — Estrutura de Roteiro que Converte',
      },
      order: {
        id: 'ORD-TESTE-01',
        amount: 'R$ 297,00',
      },
      certificate: {
        code: 'PIC-2026-DEMO99',
        url: `${frontendUrl}/academy/certificado/PIC-2026-DEMO99`,
      },
      user: {
        name: 'Marina Alves',
        first_name: 'Marina',
        email: 'marina@picplus.com.br',
      },
      influencer: { name: 'Bruna Lima' },
      contact: { name: 'Carlos Souza' },
      action_url: `${frontendUrl}/academy/minha-area`,
      reply_content:
        'Excelente dúvida! Você pode baixar o checklist na aba de Materiais desta aula.',
    };
  }

  /** Renderiza um template (com variáveis reais ou de demonstração) sem enviar. */
  renderTemplateContent(
    template: {
      subject: string;
      body: string;
      designJson?: unknown;
    },
    context: MergeTagContext,
  ): { subject: string; html: string } {
    const subject = this.renderer.replaceMergeTags(
      template.subject,
      context,
      false,
    );
    const design = template.designJson as EmailDesignJson | null;
    if (design && Array.isArray(design.blocks) && design.blocks.length > 0) {
      const inner = this.renderer.renderDesignJson(design, context);
      const html = this.renderer.wrapInBrandLayout(
        inner,
        design.settings,
        context,
      );
      return { subject, html };
    }
    const html = this.renderer.replaceMergeTags(template.body, context);
    return { subject, html };
  }

  async previewTemplate(id: string) {
    const template = await this.findOne(id);
    return this.renderTemplateContent(template, this.getSampleContext());
  }

  async sendTestEmail(id: string, to: string) {
    const template = await this.findOne(id);
    const { subject, html } = this.renderTemplateContent(
      template,
      this.getSampleContext(),
    );
    const sent = await this.mail.send({
      to,
      subject: `[TESTE] ${subject}`,
      html,
      trigger: template.trigger,
      templateId: template.id,
      templateName: `[TESTE] ${template.name}`,
    });
    return {
      ok: true,
      sent,
      message: sent
        ? `E-mail de teste enviado para ${to}.`
        : `Prévia gerada no log do servidor (configure RESEND_API_KEY para disparo real).`,
    };
  }

  /**
   * Dispara o e-mail associado a um gatilho (trigger). Se não existir template ativo no banco,
   * usa o template padrão em memória daquele gatilho.
   */
  async sendByTrigger(
    trigger: EmailTriggerType,
    to: string | string[],
    context: MergeTagContext,
  ): Promise<boolean> {
    try {
      const dbTemplate = this.prisma.emailTemplate?.findUnique
        ? await this.prisma.emailTemplate.findUnique({ where: { trigger } })
        : null;

      if (dbTemplate && !dbTemplate.active) {
        return false;
      }

      if (dbTemplate) {
        const { subject, html } = this.renderTemplateContent(
          dbTemplate,
          context,
        );
        return await this.mail.send({
          to,
          subject,
          html,
          trigger,
          templateId: dbTemplate.id,
          templateName: dbTemplate.name,
        });
      }

      const fallback = DEFAULT_EMAIL_TEMPLATES.find(
        (item) => item.trigger === trigger,
      );
      if (!fallback) return false;

      const { subject, html } = this.renderTemplateContent(
        {
          subject: fallback.subject,
          body: '',
          designJson: fallback.designJson,
        },
        context,
      );
      return await this.mail.send({
        to,
        subject,
        html,
        trigger,
        templateName: fallback.name,
      });
    } catch (error) {
      this.logger.error(
        `Falha ao enviar e-mail do gatilho ${trigger}: ${(error as Error).message}`,
      );
      return false;
    }
  }

  async listLogs(
    query: {
      search?: string;
      status?: string;
      trigger?: string;
      page?: number;
      limit?: number;
    } = {},
  ) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 25));

    const where: Prisma.EmailLogWhereInput = {};
    if (query.search?.trim()) {
      const q = query.search.trim();
      where.OR = [
        { to: { contains: q, mode: 'insensitive' } },
        { subject: { contains: q, mode: 'insensitive' } },
        { templateName: { contains: q, mode: 'insensitive' } },
        { resendEmailId: { contains: q, mode: 'insensitive' } },
      ];
    }
    if (
      query.status &&
      Object.values(EmailLogStatus).includes(query.status as EmailLogStatus)
    ) {
      where.status = query.status as EmailLogStatus;
    }
    if (query.trigger === '__manual__') {
      where.trigger = null;
    } else if (
      query.trigger &&
      Object.values(EmailTriggerType).includes(
        query.trigger as EmailTriggerType,
      )
    ) {
      where.trigger = query.trigger as EmailTriggerType;
    }

    const [items, total, grouped] = await Promise.all([
      this.prisma.emailLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        ...pageArgs(page, limit),
      }),
      this.prisma.emailLog.count({ where }),
      this.prisma.emailLog.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
    ]);

    const summary = {
      total: 0,
      sent: 0,
      delivered: 0,
      opened: 0,
      clicked: 0,
      issues: 0,
      simulated: 0,
    };

    for (const row of grouped) {
      const count = row._count._all;
      summary.total += count;
      if (
        row.status === EmailLogStatus.SENT ||
        row.status === EmailLogStatus.SCHEDULED
      ) {
        summary.sent += count;
      } else if (row.status === EmailLogStatus.DELIVERED) {
        summary.delivered += count;
      } else if (row.status === EmailLogStatus.OPENED) {
        summary.opened += count;
      } else if (row.status === EmailLogStatus.CLICKED) {
        summary.clicked += count;
      } else if (row.status === EmailLogStatus.SIMULATED) {
        summary.simulated += count;
      } else {
        summary.issues += count;
      }
    }

    return {
      ...paginated(items, total, page, limit),
      summary,
      webhookConfigured: Boolean(config.mail.webhookSecret),
      resendConfigured: Boolean(config.mail.apiKey),
    };
  }
}
