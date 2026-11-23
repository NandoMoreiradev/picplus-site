import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  AiGenerationKind,
  ClientBrandProfile,
  ClientCompetitor,
} from '@prisma/client';
import { AiChatbotService } from '../ai-chatbot/ai-chatbot.service';
import { PrismaService } from '../prisma/prisma.service';
import { simpleMarkdownToHtml } from './client-ai.utils';
import {
  AiModelTier,
  CopyFormat,
  CreateCompetitorDto,
  GenerateBrandDraftDto,
  GenerateTaskCopyDto,
  ProjectAssistantAction,
  ProjectAssistantDto,
  UpdateCompetitorDto,
  UpsertBrandProfileDto,
} from './dto/client-ai.dto';

const PRO_MODEL = 'gemini-2.5-pro';

const FORMAT_LABELS: Record<CopyFormat, string> = {
  INSTAGRAM_POST: 'Post / Legenda para Instagram',
  REELS_SCRIPT: 'Roteiro de Reels / Vídeo Curto',
  CAROUSEL: 'Carrossel Educativo / Persuasivo (Slide a Slide)',
  BLOG_ARTICLE: 'Artigo de Blog Otimizado (SEO)',
  SALES_EMAIL: 'E-mail de Vendas / Nutrição',
  AD_COPY: 'Copy de Anúncio (Meta/Google Ads)',
  TASK_BRIEFING: 'Briefing Operacional da Tarefa',
  CUSTOM: 'Conteúdo Personalizado',
};

const PROJECT_ACTION_LABELS: Record<ProjectAssistantAction, string> = {
  CONTENT_IDEAS: 'Ideias de Pautas & Conteúdo',
  CAMPAIGN_BRIEF: 'Briefing Estratégico do Projeto',
  COPY_VARIATIONS: 'Ângulos e Variações de Copy',
  CUSTOM: 'Solicitação Personalizada',
};

function stripHtml(html?: string | null): string {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|li|h[1-6]|div|blockquote)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function cleanModelOutput(text?: string | null): string {
  return (text ?? '')
    .trim()
    .replace(/^```[a-z]*\n?/i, '')
    .replace(/\n?```$/, '')
    .trim();
}

function cleanStringArray(items?: string[]): string[] {
  if (!items) return [];
  return [...new Set(items.map((item) => item.trim()).filter(Boolean))].slice(
    0,
    40,
  );
}

@Injectable()
export class ClientAiService {
  private readonly logger = new Logger(ClientAiService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gemini: AiChatbotService,
  ) {}

  /* ── Inteligência do Cliente ─────────────────────────── */

  async getIntelligence(clientId: string) {
    const client = await this.requireClientWithContext(clientId);
    const logs = await this.prisma.aiGenerationLog.findMany({
      where: { clientId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        user: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
        task: { select: { id: true, title: true } },
      },
    });

    return {
      client: {
        id: client.id,
        tradeName: client.tradeName,
        corporateName: client.corporateName,
        segment: client.segment,
        website: client.website,
      },
      brandProfile: client.brandProfile,
      competitors: client.competitors,
      logs,
    };
  }

  async upsertBrandProfile(clientId: string, dto: UpsertBrandProfileDto) {
    await this.requireClient(clientId);
    const data = {
      positioning: dto.positioning?.trim() || null,
      targetAudience: dto.targetAudience?.trim() || null,
      painsAndDesires: dto.painsAndDesires?.trim() || null,
      toneOfVoice: dto.toneOfVoice?.trim() || null,
      valueProposition: dto.valueProposition?.trim() || null,
      productsAndOffers: dto.productsAndOffers?.trim() || null,
      ctaGuidelines: dto.ctaGuidelines?.trim() || null,
      keywords: cleanStringArray(dto.keywords),
      forbiddenWords: cleanStringArray(dto.forbiddenWords),
      extraContext: dto.extraContext?.trim() || null,
    };

    return this.prisma.clientBrandProfile.upsert({
      where: { clientId },
      create: { clientId, ...data },
      update: data,
    });
  }

  async generateBrandDraft(
    clientId: string,
    dto: GenerateBrandDraftDto,
    userId: string,
  ) {
    const client = await this.requireClientWithContext(clientId);
    const notesText = client.notes
      .slice(0, 8)
      .map((n) => `- ${n.content}`)
      .join('\n');

    const prompt = [
      `Crie um rascunho de Perfil Estratégico de Marca (Brand Book) em português do Brasil para o cliente abaixo.`,
      `Nome fantasia: ${client.tradeName}`,
      `Razão social: ${client.corporateName}`,
      client.segment ? `Segmento: ${client.segment}` : null,
      client.website ? `Site: ${client.website}` : null,
      notesText ? `Notas internas da agência:\n${notesText}` : null,
      dto.extraNotes?.trim()
        ? `Informações adicionais enviadas pelo time:\n${dto.extraNotes.trim()}`
        : null,
      `\nRetorne APENAS um JSON válido com estas chaves exatas:
{
  "positioning": "string",
  "targetAudience": "string",
  "painsAndDesires": "string",
  "toneOfVoice": "string",
  "valueProposition": "string",
  "productsAndOffers": "string",
  "ctaGuidelines": "string",
  "keywords": ["string"],
  "forbiddenWords": ["string"],
  "extraContext": "string"
}
Seja específico, prático e orientado a marketing digital e conversão. Não invente dados financeiros ou prêmios falsos.`,
    ]
      .filter(Boolean)
      .join('\n');

    const { text, model } = await this.callGemini(
      prompt,
      {
        systemInstruction:
          'Você é um estrategista sênior de branding, posicionamento e copywriting de uma agência de marketing.',
        temperature: 0.4,
        responseMimeType: 'application/json',
      },
      dto.modelTier,
    );

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(text) as Record<string, unknown>;
    } catch {
      throw new BadGatewayException(
        'A IA retornou um formato inválido ao gerar o rascunho. Tente novamente.',
      );
    }

    const draft = {
      positioning:
        typeof parsed.positioning === 'string' ? parsed.positioning : '',
      targetAudience:
        typeof parsed.targetAudience === 'string' ? parsed.targetAudience : '',
      painsAndDesires:
        typeof parsed.painsAndDesires === 'string'
          ? parsed.painsAndDesires
          : '',
      toneOfVoice:
        typeof parsed.toneOfVoice === 'string' ? parsed.toneOfVoice : '',
      valueProposition:
        typeof parsed.valueProposition === 'string'
          ? parsed.valueProposition
          : '',
      productsAndOffers:
        typeof parsed.productsAndOffers === 'string'
          ? parsed.productsAndOffers
          : '',
      ctaGuidelines:
        typeof parsed.ctaGuidelines === 'string' ? parsed.ctaGuidelines : '',
      keywords: Array.isArray(parsed.keywords)
        ? parsed.keywords.filter((k): k is string => typeof k === 'string')
        : [],
      forbiddenWords: Array.isArray(parsed.forbiddenWords)
        ? parsed.forbiddenWords.filter(
            (k): k is string => typeof k === 'string',
          )
        : [],
      extraContext:
        typeof parsed.extraContext === 'string' ? parsed.extraContext : '',
    };

    await this.prisma.aiGenerationLog.create({
      data: {
        clientId: client.id,
        userId,
        kind: AiGenerationKind.BRAND_PROFILE,
        model,
        title: `Rascunho de marca: ${client.tradeName}`,
        prompt,
        output: JSON.stringify(draft, null, 2),
      },
    });

    return { draft, model };
  }

  /* ── Concorrentes ────────────────────────────────────── */

  async createCompetitor(clientId: string, dto: CreateCompetitorDto) {
    await this.requireClient(clientId);
    return this.prisma.clientCompetitor.create({
      data: {
        clientId,
        name: dto.name.trim(),
        websiteUrl: dto.websiteUrl?.trim() || null,
        instagramHandle: dto.instagramHandle?.trim() || null,
        tiktokHandle: dto.tiktokHandle?.trim() || null,
        youtubeHandle: dto.youtubeHandle?.trim() || null,
        notes: dto.notes?.trim() || null,
        strengths: dto.strengths?.trim() || null,
        weaknesses: dto.weaknesses?.trim() || null,
      },
    });
  }

  async updateCompetitor(
    clientId: string,
    competitorId: string,
    dto: UpdateCompetitorDto,
  ) {
    const existing = await this.prisma.clientCompetitor.findFirst({
      where: { id: competitorId, clientId },
    });
    if (!existing) throw new NotFoundException('Concorrente não encontrado.');

    return this.prisma.clientCompetitor.update({
      where: { id: competitorId },
      data: {
        name: dto.name?.trim(),
        websiteUrl:
          dto.websiteUrl === undefined
            ? undefined
            : dto.websiteUrl.trim() || null,
        instagramHandle:
          dto.instagramHandle === undefined
            ? undefined
            : dto.instagramHandle.trim() || null,
        tiktokHandle:
          dto.tiktokHandle === undefined
            ? undefined
            : dto.tiktokHandle.trim() || null,
        youtubeHandle:
          dto.youtubeHandle === undefined
            ? undefined
            : dto.youtubeHandle.trim() || null,
        notes: dto.notes === undefined ? undefined : dto.notes.trim() || null,
        strengths:
          dto.strengths === undefined
            ? undefined
            : dto.strengths.trim() || null,
        weaknesses:
          dto.weaknesses === undefined
            ? undefined
            : dto.weaknesses.trim() || null,
      },
    });
  }

  async deleteCompetitor(clientId: string, competitorId: string) {
    const existing = await this.prisma.clientCompetitor.findFirst({
      where: { id: competitorId, clientId },
    });
    if (!existing) throw new NotFoundException('Concorrente não encontrado.');
    await this.prisma.clientCompetitor.delete({ where: { id: competitorId } });
    return { deleted: true };
  }

  /* ── IA nas Tarefas e Projetos ───────────────────────── */

  async getTaskHistory(taskId: string) {
    await this.requireTask(taskId);
    return this.prisma.aiGenerationLog.findMany({
      where: { taskId },
      orderBy: { createdAt: 'desc' },
      take: 15,
      include: { user: { select: { id: true, name: true } } },
    });
  }

  async generateTaskCopy(
    taskId: string,
    dto: GenerateTaskCopyDto,
    userId: string,
  ) {
    const task = await this.requireTask(taskId);
    const client = task.project.client;
    const formatLabel = FORMAT_LABELS[dto.format];
    const variations = dto.variations ?? 1;

    const taskDescription = stripHtml(task.description);
    const commentsText = task.comments
      .map((c) => `- ${c.user?.name || 'Equipe'}: ${stripHtml(c.content)}`)
      .filter((line) => line.length > 4)
      .join('\n');
    const subtasksText = task.subtasks
      .map((s) => `- [${s.completedAt ? 'x' : ' '}] ${s.title}`)
      .join('\n');

    const prompt = [
      client
        ? this.buildClientContextBlock(
            client,
            client.brandProfile,
            client.competitors,
            client.competitorRefs,
          )
        : '=== CONTEXTO DO CLIENTE ===\nProjeto interno sem cliente vinculado.',
      '',
      '=== CONTEXTO DO PROJETO E TAREFA ===',
      `Projeto: ${task.project.name}`,
      task.project.description
        ? `Descrição do projeto: ${task.project.description}`
        : null,
      `Título da tarefa: ${task.title}`,
      task.tags.length
        ? `Tags: ${task.tags.map((t) => t.name).join(', ')}`
        : null,
      taskDescription ? `Descrição atual:\n${taskDescription}` : null,
      subtasksText ? `Checklist:\n${subtasksText}` : null,
      commentsText ? `Comentários recentes:\n${commentsText}` : null,
      '',
      '=== PEDIDO DE GERAÇÃO ===',
      `Formato desejado: ${formatLabel}`,
      `Quantidade de variações/opções: ${variations}`,
      dto.objective?.trim()
        ? `Objetivo principal: ${dto.objective.trim()}`
        : null,
      dto.extraInstructions?.trim()
        ? `Instruções extras da equipe:\n${dto.extraInstructions.trim()}`
        : null,
      '',
      `Entregue o conteúdo em Markdown bem estruturado (títulos ## / ###, listas, destaques em **negrito**), pronto para a equipe revisar e usar. Seja persuasivo, fiel ao tom de voz do cliente e evite clichês genéricos.`,
    ]
      .filter(Boolean)
      .join('\n');

    const { text, model } = await this.callGemini(
      prompt,
      {
        systemInstruction:
          'Você é um head de conteúdo, copywriter e estrategista criativo da agência PicPlus. Escreva sempre em português do Brasil.',
        temperature: 0.7,
      },
      dto.modelTier,
    );

    const html = simpleMarkdownToHtml(text);
    const kind =
      dto.format === 'TASK_BRIEFING'
        ? AiGenerationKind.BRIEFING
        : AiGenerationKind.COPY;

    const log = await this.prisma.aiGenerationLog.create({
      data: {
        clientId: client?.id ?? null,
        projectId: task.projectId,
        taskId: task.id,
        userId,
        kind,
        model,
        title: `${formatLabel} — ${task.title}`,
        prompt,
        output: text,
        metadata: {
          format: dto.format,
          variations,
          objective: dto.objective ?? null,
        },
      },
      include: { user: { select: { id: true, name: true } } },
    });

    return {
      markdown: text,
      html,
      model,
      log,
    };
  }

  async getProjectHistory(projectId: string) {
    await this.requireProject(projectId);
    return this.prisma.aiGenerationLog.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        user: { select: { id: true, name: true } },
        task: { select: { id: true, title: true } },
      },
    });
  }

  async runProjectAssistant(
    projectId: string,
    dto: ProjectAssistantDto,
    userId: string,
  ) {
    const project = await this.requireProject(projectId);
    const client = project.client;
    const actionLabel = PROJECT_ACTION_LABELS[dto.action];

    const tasksSummary = project.tasks
      .map((t) => `- ${t.title} (${t.stage.name})`)
      .join('\n');

    const prompt = [
      client
        ? this.buildClientContextBlock(
            client,
            client.brandProfile,
            client.competitors,
            client.competitorRefs,
          )
        : '=== CONTEXTO DO CLIENTE ===\nProjeto sem cliente vinculado.',
      '',
      '=== PROJETO ===',
      `Nome: ${project.name}`,
      project.description ? `Descrição: ${project.description}` : null,
      tasksSummary ? `Tarefas atuais do projeto:\n${tasksSummary}` : null,
      '',
      '=== SOLICITAÇÃO ===',
      `Tipo de assistência: ${actionLabel}`,
      dto.channel?.trim() ? `Canal / Foco: ${dto.channel.trim()}` : null,
      dto.prompt?.trim()
        ? `Pedido específico:\n${dto.prompt.trim()}`
        : `Gere um material completo de ${actionLabel} alinhado ao cliente e ao projeto.`,
      '',
      'Responda em Markdown claro e acionável em português do Brasil.',
    ]
      .filter(Boolean)
      .join('\n');

    const { text, model } = await this.callGemini(
      prompt,
      {
        systemInstruction:
          'Você é um diretor de estratégia e planejamento criativo da agência PicPlus.',
        temperature: 0.65,
      },
      dto.modelTier,
    );

    const html = simpleMarkdownToHtml(text);
    const log = await this.prisma.aiGenerationLog.create({
      data: {
        clientId: client?.id ?? null,
        projectId: project.id,
        userId,
        kind:
          dto.action === 'CAMPAIGN_BRIEF'
            ? AiGenerationKind.BRIEFING
            : AiGenerationKind.COPY,
        model,
        title: `${actionLabel} — ${project.name}`,
        prompt,
        output: text,
        metadata: {
          action: dto.action,
          channel: dto.channel ?? null,
        },
      },
      include: { user: { select: { id: true, name: true } } },
    });

    return {
      markdown: text,
      html,
      model,
      log,
    };
  }

  /* ── Helpers compartilhados no módulo ────────────────── */

  buildClientContextBlock(
    client: {
      tradeName: string;
      corporateName: string;
      segment: string | null;
      website: string | null;
    },
    profile: ClientBrandProfile | null,
    competitors: ClientCompetitor[],
    references?: Array<{
      platform: string;
      authorHandle: string | null;
      extractedHooks: string[];
      adaptedAngles: string | null;
      isViral: boolean;
    }>,
  ): string {
    const parts: string[] = [
      '=== CÉREBRO DO CLIENTE ===',
      `Marca: ${client.tradeName} (${client.corporateName})`,
    ];
    if (client.segment) parts.push(`Segmento: ${client.segment}`);
    if (client.website) parts.push(`Site: ${client.website}`);

    if (profile) {
      if (profile.positioning)
        parts.push(`Posicionamento: ${profile.positioning}`);
      if (profile.targetAudience)
        parts.push(`Público-alvo / Persona: ${profile.targetAudience}`);
      if (profile.painsAndDesires)
        parts.push(`Dores e desejos: ${profile.painsAndDesires}`);
      if (profile.toneOfVoice) parts.push(`Tom de voz: ${profile.toneOfVoice}`);
      if (profile.valueProposition)
        parts.push(
          `Proposta de valor / Diferenciais: ${profile.valueProposition}`,
        );
      if (profile.productsAndOffers)
        parts.push(`Produtos e ofertas: ${profile.productsAndOffers}`);
      if (profile.ctaGuidelines)
        parts.push(`Diretrizes de CTA: ${profile.ctaGuidelines}`);
      if (profile.keywords.length)
        parts.push(`Palavras-chave / Temas: ${profile.keywords.join(', ')}`);
      if (profile.forbiddenWords.length)
        parts.push(
          `Termos proibidos / Evitar: ${profile.forbiddenWords.join(', ')}`,
        );
      if (profile.extraContext)
        parts.push(`Contexto adicional: ${profile.extraContext}`);
    }

    if (competitors.length) {
      parts.push('\nConcorrentes mapeados:');
      for (const comp of competitors) {
        const handles = [
          comp.instagramHandle ? `IG: ${comp.instagramHandle}` : null,
          comp.tiktokHandle ? `TikTok: ${comp.tiktokHandle}` : null,
          comp.youtubeHandle ? `YouTube: ${comp.youtubeHandle}` : null,
          comp.websiteUrl ? `Site: ${comp.websiteUrl}` : null,
        ]
          .filter(Boolean)
          .join(' | ');
        parts.push(
          `- ${comp.name}${handles ? ` (${handles})` : ''}${comp.strengths ? ` — Pontos fortes: ${comp.strengths}` : ''}${comp.weaknesses ? ` — Brechas/Fraquezas: ${comp.weaknesses}` : ''}`,
        );
      }
    }

    if (references?.length) {
      parts.push('\nReferências virais e copys vencedoras do Swipe File:');
      for (const ref of references) {
        const hooks = ref.extractedHooks.slice(0, 3).join(' | ');
        parts.push(
          `- [${ref.platform}${ref.isViral ? ' · VIRAL' : ''}] ${ref.authorHandle || 'Referência'}${hooks ? ` — Hooks: ${hooks}` : ''}${ref.adaptedAngles ? ` — Adaptação: ${ref.adaptedAngles.slice(0, 180)}` : ''}`,
        );
      }
    }

    return parts.join('\n');
  }

  private async requireClient(clientId: string) {
    const client = await this.prisma.client.findFirst({
      where: { id: clientId, deletedAt: null },
    });
    if (!client) throw new NotFoundException('Cliente não encontrado.');
    return client;
  }

  private async requireClientWithContext(clientId: string) {
    const client = await this.prisma.client.findFirst({
      where: { id: clientId, deletedAt: null },
      include: {
        brandProfile: true,
        competitors: { orderBy: { createdAt: 'asc' } },
        notes: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    });
    if (!client) throw new NotFoundException('Cliente não encontrado.');
    return client;
  }

  async requireProject(projectId: string) {
    const project = await this.prisma.taskProject.findFirst({
      where: { id: projectId, deletedAt: null },
      include: {
        client: {
          include: {
            brandProfile: true,
            competitors: { orderBy: { createdAt: 'asc' } },
            competitorRefs: {
              orderBy: [{ isViral: 'desc' }, { createdAt: 'desc' }],
              take: 5,
            },
          },
        },
        tasks: {
          where: { deletedAt: null, parentTaskId: null },
          orderBy: { createdAt: 'desc' },
          take: 25,
          select: {
            id: true,
            title: true,
            stage: { select: { name: true } },
          },
        },
      },
    });
    if (!project) throw new NotFoundException('Projeto não encontrado.');
    return project;
  }

  private async requireTask(taskId: string) {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, deletedAt: null, project: { deletedAt: null } },
      include: {
        tags: { select: { name: true } },
        subtasks: {
          where: { deletedAt: null },
          orderBy: { order: 'asc' },
          select: { title: true, completedAt: true },
        },
        comments: {
          where: { isDeleted: false },
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: {
            content: true,
            user: { select: { name: true } },
          },
        },
        project: {
          include: {
            client: {
              include: {
                brandProfile: true,
                competitors: { orderBy: { createdAt: 'asc' } },
                competitorRefs: {
                  orderBy: [{ isViral: 'desc' }, { createdAt: 'desc' }],
                  take: 5,
                },
              },
            },
          },
        },
      },
    });
    if (!task) throw new NotFoundException('Tarefa não encontrada.');
    return task;
  }

  async getGeminiInstance(modelTier: AiModelTier = 'fast') {
    let client: Awaited<ReturnType<AiChatbotService['getClient']>>;
    try {
      client = await this.gemini.getClient();
    } catch (error) {
      throw new BadRequestException((error as Error).message);
    }
    return {
      ai: client.ai,
      model: modelTier === 'pro' ? PRO_MODEL : client.model,
    };
  }

  async callGemini(
    prompt: string,
    config: {
      systemInstruction: string;
      temperature: number;
      responseMimeType?: string;
    },
    modelTier: AiModelTier = 'fast',
  ): Promise<{ text: string; model: string }> {
    const { ai, model } = await this.getGeminiInstance(modelTier);
    try {
      const response = await ai.models.generateContent({
        model,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config,
      });
      const text = cleanModelOutput(response.text);
      if (!text) {
        throw new Error('Resposta vazia do Gemini.');
      }
      return { text, model };
    } catch (error) {
      this.logger.error(
        `Falha no Gemini (${model}): ${(error as Error).message}`,
      );
      throw new BadGatewayException(
        'Não foi possível gerar conteúdo com a IA agora. Verifique a chave/modelo ou tente novamente.',
      );
    }
  }
}
