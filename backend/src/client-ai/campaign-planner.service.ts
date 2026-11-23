import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AiGenerationKind,
  CampaignPlanScope,
  CampaignPlanStatus,
  Prisma,
  TaskActivityAction,
  TaskPriority,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TASK_INCLUDE } from '../tasks/tasks.service';
import { ClientAiService } from './client-ai.service';
import {
  buildPlannerTaskDescriptionHtml,
  parseUtcDateOnly,
} from './client-ai.utils';
import {
  GenerateCampaignPlanDto,
  PublishCampaignPlanDto,
  UpdateCampaignPlanItemDto,
} from './dto/campaign-planner.dto';

const SCOPE_LABELS: Record<CampaignPlanScope, string> = {
  MONTHLY: 'Planejamento Mensal (30 dias)',
  QUARTERLY: 'Planejamento Trimestral (90 dias)',
  SALES_CAMPAIGN: 'Campanha de Vendas / Lançamento',
  CUSTOM: 'Planejamento Personalizado',
};

const DEFAULT_COUNTS: Record<CampaignPlanScope, number> = {
  MONTHLY: 12,
  QUARTERLY: 24,
  SALES_CAMPAIGN: 10,
  CUSTOM: 10,
};

const DEFAULT_DAYS: Record<CampaignPlanScope, number> = {
  MONTHLY: 30,
  QUARTERLY: 90,
  SALES_CAMPAIGN: 14,
  CUSTOM: 30,
};

const PLAN_INCLUDE = {
  client: { select: { id: true, tradeName: true } },
  createdBy: { select: { id: true, name: true } },
  items: {
    orderBy: [{ order: 'asc' }, { scheduledDate: 'asc' }],
    include: {
      task: {
        select: {
          id: true,
          title: true,
          completedAt: true,
          stage: { select: { id: true, name: true, color: true } },
        },
      },
    },
  },
} satisfies Prisma.CampaignPlanInclude;

interface RawPlanResponse {
  title?: string;
  strategySummary?: string;
  pillars?: unknown[];
  items?: Array<{
    scheduledDate?: string;
    channel?: string;
    format?: string;
    funnelStage?: string;
    pillar?: string;
    title?: string;
    hook?: string;
    briefing?: string;
    copyDraft?: string;
    cta?: string;
    priority?: string;
  }>;
}

const VALID_PRIORITIES = new Set<string>(['LOW', 'MEDIUM', 'HIGH', 'URGENT']);

@Injectable()
export class CampaignPlannerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clientAi: ClientAiService,
  ) {}

  async listPlans(projectId: string) {
    await this.clientAi.requireProject(projectId);
    return this.prisma.campaignPlan.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: { select: { id: true, name: true } },
        _count: { select: { items: true } },
        items: { select: { id: true, taskId: true } },
      },
    });
  }

  async getPlan(planId: string) {
    const plan = await this.prisma.campaignPlan.findUnique({
      where: { id: planId },
      include: PLAN_INCLUDE,
    });
    if (!plan) throw new NotFoundException('Plano de campanha não encontrado.');
    return plan;
  }

  async generatePlan(
    projectId: string,
    dto: GenerateCampaignPlanDto,
    userId: string,
  ) {
    const project = await this.clientAi.requireProject(projectId);
    const client = project.client;

    const start = parseUtcDateOnly(dto.startDate);
    if (!start) throw new BadRequestException('Data inicial inválida.');

    const end =
      parseUtcDateOnly(dto.endDate) ??
      new Date(start.getTime() + DEFAULT_DAYS[dto.scope] * 86_400_000);
    if (end.getTime() < start.getTime()) {
      throw new BadRequestException(
        'A data final precisa ser igual ou posterior à data inicial.',
      );
    }

    const itemCount = dto.itemCount ?? DEFAULT_COUNTS[dto.scope];
    const startYmd = start.toISOString().slice(0, 10);
    const endYmd = end.toISOString().slice(0, 10);
    const channels = dto.channels.map((c) => c.trim()).filter(Boolean);
    if (!channels.length) {
      throw new BadRequestException('Selecione ao menos um canal.');
    }

    const prompt = [
      client
        ? this.clientAi.buildClientContextBlock(
            client,
            client.brandProfile,
            client.competitors,
          )
        : '=== CONTEXTO DO CLIENTE ===\nProjeto sem cliente vinculado.',
      '',
      '=== PARÂMETROS DO PLANEJAMENTO ===',
      `Projeto: ${project.name}`,
      `Escopo: ${SCOPE_LABELS[dto.scope]}`,
      `Período: ${startYmd} até ${endYmd}`,
      `Quantidade exata de entregas: ${itemCount}`,
      `Canais contemplados: ${channels.join(', ')}`,
      `Objetivo principal: ${dto.objective.trim()}`,
      dto.title?.trim() ? `Título sugerido: ${dto.title.trim()}` : null,
      dto.extraInstructions?.trim()
        ? `Instruções adicionais:\n${dto.extraInstructions.trim()}`
        : null,
      '',
      `Monte um plano estratégico completo distribuindo exatamente ${itemCount} entregas entre ${startYmd} e ${endYmd}, alternando estágios do funil (TOPO, MEIO, FUNDO) e pilares editoriais.
Retorne APENAS um JSON válido com esta estrutura exata:
{
  "title": "string (título claro do plano)",
  "strategySummary": "string (resumo executivo da estratégia e cadência)",
  "pillars": ["string (3 a 5 pilares editoriais)"],
  "items": [
    {
      "scheduledDate": "YYYY-MM-DD (entre ${startYmd} e ${endYmd})",
      "channel": "string (um dos canais informados)",
      "format": "INSTAGRAM_POST | REELS_SCRIPT | CAROUSEL | BLOG_ARTICLE | SALES_EMAIL | AD_COPY | CUSTOM",
      "funnelStage": "TOPO | MEIO | FUNDO",
      "pillar": "string",
      "title": "string (título curto e acionável da tarefa/peça)",
      "hook": "string (gancho de abertura que prende atenção)",
      "briefing": "string (orientações visuais/roteiro/estrutura para produção)",
      "copyDraft": "string (rascunho completo de legenda, roteiro ou texto)",
      "cta": "string (chamada para ação)",
      "priority": "LOW | MEDIUM | HIGH | URGENT"
    }
  ]
}`,
    ]
      .filter(Boolean)
      .join('\n');

    const { text, model } = await this.clientAi.callGemini(
      prompt,
      {
        systemInstruction:
          'Você é diretor de planejamento e conteúdo estratégico da agência PicPlus. Responda sempre em português do Brasil com alto nível estratégico e praticidade para execução.',
        temperature: 0.6,
        responseMimeType: 'application/json',
      },
      dto.modelTier,
    );

    let parsed: RawPlanResponse;
    try {
      parsed = JSON.parse(text) as RawPlanResponse;
    } catch {
      throw new BadGatewayException(
        'A IA não retornou um JSON válido para o plano. Tente novamente.',
      );
    }

    const rawItems = Array.isArray(parsed.items) ? parsed.items : [];
    if (!rawItems.length) {
      throw new BadGatewayException(
        'A IA retornou um plano vazio. Tente ajustar o objetivo ou tentar novamente.',
      );
    }

    const pillars = Array.isArray(parsed.pillars)
      ? parsed.pillars
          .filter((p): p is string => typeof p === 'string' && !!p.trim())
          .map((p) => p.trim())
          .slice(0, 10)
      : [];

    const planTitle =
      dto.title?.trim() ||
      (typeof parsed.title === 'string' && parsed.title.trim()) ||
      `${SCOPE_LABELS[dto.scope]} — ${project.name}`;

    const spanMs = Math.max(1, end.getTime() - start.getTime());

    const createdPlan = await this.prisma.$transaction(async (tx) => {
      const plan = await tx.campaignPlan.create({
        data: {
          title: planTitle.slice(0, 180),
          scope: dto.scope,
          status: CampaignPlanStatus.DRAFT,
          objective: dto.objective.trim(),
          strategySummary:
            typeof parsed.strategySummary === 'string'
              ? parsed.strategySummary.trim()
              : null,
          pillars,
          channels,
          startDate: start,
          endDate: end,
          clientId: client?.id ?? null,
          projectId: project.id,
          createdById: userId,
          items: {
            create: rawItems.slice(0, 40).map((item, idx, arr) => {
              const parsedDate = parseUtcDateOnly(item.scheduledDate);
              const fallbackDate = new Date(
                start.getTime() +
                  Math.round((spanMs * idx) / Math.max(1, arr.length - 1)),
              );
              const scheduledDate =
                parsedDate ?? parseUtcDateOnly(fallbackDate.toISOString());
              const priority =
                item.priority && VALID_PRIORITIES.has(item.priority)
                  ? (item.priority as TaskPriority)
                  : TaskPriority.MEDIUM;

              return {
                order: idx,
                scheduledDate,
                channel:
                  typeof item.channel === 'string' && item.channel.trim()
                    ? item.channel.trim().slice(0, 80)
                    : channels[idx % channels.length],
                format:
                  typeof item.format === 'string' && item.format.trim()
                    ? item.format.trim().slice(0, 60)
                    : null,
                funnelStage:
                  typeof item.funnelStage === 'string' &&
                  item.funnelStage.trim()
                    ? item.funnelStage.trim().slice(0, 40)
                    : null,
                pillar:
                  typeof item.pillar === 'string' && item.pillar.trim()
                    ? item.pillar.trim().slice(0, 120)
                    : null,
                title:
                  typeof item.title === 'string' && item.title.trim()
                    ? item.title.trim().slice(0, 200)
                    : `Entrega ${idx + 1}`,
                hook:
                  typeof item.hook === 'string'
                    ? item.hook.trim() || null
                    : null,
                briefing:
                  typeof item.briefing === 'string'
                    ? item.briefing.trim() || null
                    : null,
                copyDraft:
                  typeof item.copyDraft === 'string'
                    ? item.copyDraft.trim() || null
                    : null,
                cta:
                  typeof item.cta === 'string'
                    ? item.cta.trim().slice(0, 500) || null
                    : null,
                priority,
              };
            }),
          },
        },
        include: PLAN_INCLUDE,
      });

      await tx.aiGenerationLog.create({
        data: {
          clientId: client?.id ?? null,
          projectId: project.id,
          userId,
          kind: AiGenerationKind.CAMPAIGN_PLAN,
          model,
          title: plan.title,
          prompt,
          output: JSON.stringify(parsed, null, 2),
          metadata: {
            planId: plan.id,
            scope: dto.scope,
            itemCount: plan.items.length,
          },
        },
      });

      return plan;
    });

    return { plan: createdPlan, model };
  }

  async updateItem(itemId: string, dto: UpdateCampaignPlanItemDto) {
    const existing = await this.prisma.campaignPlanItem.findUnique({
      where: { id: itemId },
    });
    if (!existing) throw new NotFoundException('Item do plano não encontrado.');

    return this.prisma.campaignPlanItem.update({
      where: { id: itemId },
      data: {
        scheduledDate:
          dto.scheduledDate === undefined
            ? undefined
            : parseUtcDateOnly(dto.scheduledDate),
        channel: dto.channel?.trim(),
        format:
          dto.format === undefined ? undefined : dto.format?.trim() || null,
        funnelStage:
          dto.funnelStage === undefined
            ? undefined
            : dto.funnelStage?.trim() || null,
        pillar:
          dto.pillar === undefined ? undefined : dto.pillar?.trim() || null,
        title: dto.title?.trim(),
        hook: dto.hook === undefined ? undefined : dto.hook?.trim() || null,
        briefing:
          dto.briefing === undefined ? undefined : dto.briefing?.trim() || null,
        copyDraft:
          dto.copyDraft === undefined
            ? undefined
            : dto.copyDraft?.trim() || null,
        cta: dto.cta === undefined ? undefined : dto.cta?.trim() || null,
        priority: dto.priority,
      },
      include: {
        task: {
          select: {
            id: true,
            title: true,
            completedAt: true,
            stage: { select: { id: true, name: true, color: true } },
          },
        },
      },
    });
  }

  async deleteItem(itemId: string) {
    const existing = await this.prisma.campaignPlanItem.findUnique({
      where: { id: itemId },
    });
    if (!existing) throw new NotFoundException('Item do plano não encontrado.');
    await this.prisma.campaignPlanItem.delete({ where: { id: itemId } });
    return { deleted: true };
  }

  async deletePlan(planId: string) {
    await this.getPlan(planId);
    await this.prisma.campaignPlan.delete({ where: { id: planId } });
    return { deleted: true };
  }

  async publishPlan(
    planId: string,
    dto: PublishCampaignPlanDto,
    userId: string,
  ) {
    const plan = await this.getPlan(planId);
    const project = await this.prisma.taskProject.findFirst({
      where: { id: plan.projectId, deletedAt: null },
      include: { stages: { orderBy: { order: 'asc' } } },
    });
    if (!project) throw new NotFoundException('Projeto não encontrado.');

    const stage = dto.stageId
      ? project.stages.find((s) => s.id === dto.stageId)
      : (project.stages.find((s) => !s.isCompleted) ?? project.stages[0]);
    if (!stage) {
      throw new BadRequestException(
        'O projeto não possui estágio válido para receber tarefas.',
      );
    }

    if (dto.assignedToId) {
      const user = await this.prisma.user.findFirst({
        where: { id: dto.assignedToId, active: true },
        select: { id: true },
      });
      if (!user) throw new BadRequestException('Responsável inválido.');
    }

    const wantedIds = dto.itemIds?.length ? new Set(dto.itemIds) : null;
    const pendingItems = plan.items.filter(
      (item) => !item.taskId && (!wantedIds || wantedIds.has(item.id)),
    );

    if (!pendingItems.length) {
      throw new BadRequestException(
        'Nenhum item pendente selecionado para publicar no Kanban.',
      );
    }

    const createdTasks = await this.prisma.$transaction(async (tx) => {
      const last = await tx.task.aggregate({
        where: {
          projectId: project.id,
          stageId: stage.id,
          parentTaskId: null,
        },
        _max: { order: true },
      });
      let nextOrder = (last._max.order ?? -1) + 1;

      const created: Array<Awaited<ReturnType<typeof tx.task.create>>> = [];

      for (const item of pendingItems) {
        const description = buildPlannerTaskDescriptionHtml(item);
        const task = await tx.task.create({
          data: {
            title: item.title.slice(0, 200),
            description,
            priority: item.priority,
            dueDate: item.scheduledDate,
            completedAt: stage.isCompleted ? new Date() : null,
            order: nextOrder++,
            projectId: project.id,
            stageId: stage.id,
            assignedToId: dto.assignedToId ?? null,
            createdById: userId,
          },
          include: TASK_INCLUDE,
        });

        await tx.taskActivityLog.create({
          data: {
            taskId: task.id,
            userId,
            action: TaskActivityAction.CREATED,
            description: `Criada via Planejador de Campanhas (${plan.title})`,
          },
        });

        await tx.campaignPlanItem.update({
          where: { id: item.id },
          data: { taskId: task.id },
        });

        created.push(task);
      }

      await tx.campaignPlan.update({
        where: { id: plan.id },
        data: { status: CampaignPlanStatus.PUBLISHED },
      });

      return created;
    });

    const updatedPlan = await this.getPlan(plan.id);
    return {
      createdCount: createdTasks.length,
      tasks: createdTasks,
      plan: updatedPlan,
    };
  }
}
