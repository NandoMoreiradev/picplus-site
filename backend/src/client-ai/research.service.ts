import {
  BadGatewayException,
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  AiGenerationKind,
  Prisma,
  ReferencePlatform,
  ResearchReportKind,
} from '@prisma/client';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { ClientAiService } from './client-ai.service';
import type { AiModelTier } from './dto/client-ai.dto';
import {
  CreateExtensionTokenDto,
  IngestReferenceDto,
  RunResearchDto,
} from './dto/research.dto';

const MAX_GEMINI_INLINE_BYTES = 18 * 1024 * 1024;
const MAX_TOTAL_INLINE_BYTES = 24 * 1024 * 1024;

const REPORT_KIND_LABELS: Record<ResearchReportKind, string> = {
  COMPETITOR_AUDIT: 'Auditoria Profunda de Concorrentes',
  VIRAL_TRENDS: 'Radar de Virais & Trends do Público-Alvo',
  COPY_MINING: 'Mineração de Copys & Ganchos que Convertem',
  WEBSITE_ANALYSIS: 'Análise de Site & Oferta Concorrente',
};

function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

function cleanOutput(text?: string | null): string {
  return (text ?? '')
    .trim()
    .replace(/^```[a-z]*\n?/i, '')
    .replace(/\n?```$/, '')
    .trim();
}

function parseMetrics(raw: unknown): Record<string, unknown> | undefined {
  if (!raw) return undefined;
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return undefined;
    }
  }
  return undefined;
}

function parseTags(raw?: string | string[]): string[] {
  if (!raw) return [];
  const arr = Array.isArray(raw) ? raw : raw.split(',');
  return [...new Set(arr.map((t) => t.trim()).filter(Boolean))].slice(0, 20);
}

function isSafePublicUrl(rawUrl: string): URL | null {
  try {
    const parsed = new URL(rawUrl.trim());
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:')
      return null;
    const host = parsed.hostname.toLowerCase();
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '::1' ||
      host.startsWith('10.') ||
      host.startsWith('192.168.') ||
      host.startsWith('169.254.') ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
      host.endsWith('.local') ||
      host.endsWith('.internal')
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function extractReadableWebText(html: string): string {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const descMatch = html.match(
    /<meta[^>]+name=["']description["'][^>]+content=["']([\s\S]*?)["']/i,
  );
  const body = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<\/(p|div|li|h[1-6]|section|article|br)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return [
    titleMatch ? `Título: ${titleMatch[1].trim()}` : null,
    descMatch ? `Meta Description: ${descMatch[1].trim()}` : null,
    `Conteúdo extraído:\n${body.slice(0, 10_000)}`,
  ]
    .filter(Boolean)
    .join('\n\n');
}

@Injectable()
export class ResearchService {
  private readonly logger = new Logger(ResearchService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly clientAi: ClientAiService,
  ) {}

  /* ── Tokens da Extensão Chrome ───────────────────────── */

  listTokens(userId: string) {
    return this.prisma.extensionApiToken.findMany({
      where: { userId, revokedAt: null },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        prefix: true,
        lastUsedAt: true,
        createdAt: true,
      },
    });
  }

  async createToken(userId: string, dto: CreateExtensionTokenDto) {
    const rawToken = `picext_${randomBytes(24).toString('hex')}`;
    const token = await this.prisma.extensionApiToken.create({
      data: {
        userId,
        name: dto.name.trim(),
        tokenHash: hashToken(rawToken),
        prefix: rawToken.slice(0, 14),
      },
      select: {
        id: true,
        name: true,
        prefix: true,
        createdAt: true,
      },
    });
    // O token completo só é devolvido uma única vez na criação.
    return { token, rawToken };
  }

  async revokeToken(userId: string, id: string) {
    const existing = await this.prisma.extensionApiToken.findFirst({
      where: { id, userId, revokedAt: null },
    });
    if (!existing) throw new NotFoundException('Token não encontrado.');
    await this.prisma.extensionApiToken.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
    return { revoked: true };
  }

  async authenticateExtensionToken(rawToken?: string) {
    if (!rawToken || !rawToken.startsWith('picext_')) {
      throw new UnauthorizedException('Token da extensão ausente ou inválido.');
    }
    const token = await this.prisma.extensionApiToken.findUnique({
      where: { tokenHash: hashToken(rawToken.trim()) },
      include: {
        user: {
          include: { role: true },
        },
      },
    });
    if (!token || token.revokedAt || !token.user.active) {
      throw new UnauthorizedException('Token revogado, expirado ou inválido.');
    }
    const canManage =
      token.user.isOwner ||
      (token.user.role?.permissions ?? []).includes('ai_studio.manage');
    if (!canManage) {
      throw new ForbiddenException(
        'Seu cargo não possui permissão para enviar referências ao Estúdio de IA.',
      );
    }

    void this.prisma.extensionApiToken
      .update({
        where: { id: token.id },
        data: { lastUsedAt: new Date() },
      })
      .catch(() => undefined);

    return token.user;
  }

  listExtensionClients() {
    return this.prisma.client.findMany({
      where: { deletedAt: null },
      orderBy: { tradeName: 'asc' },
      select: {
        id: true,
        tradeName: true,
        segment: true,
        competitors: {
          orderBy: { name: 'asc' },
          select: { id: true, name: true, instagramHandle: true },
        },
      },
    });
  }

  /* ── Listagem & Swipe File ───────────────────────────── */

  async getClientResearch(clientId: string) {
    const client = await this.prisma.client.findFirst({
      where: { id: clientId, deletedAt: null },
      select: { id: true },
    });
    if (!client) throw new NotFoundException('Cliente não encontrado.');

    const [references, reports] = await Promise.all([
      this.prisma.competitorReference.findMany({
        where: { clientId },
        orderBy: [{ isViral: 'desc' }, { createdAt: 'desc' }],
        take: 60,
        include: {
          competitor: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true } },
        },
      }),
      this.prisma.researchReport.findMany({
        where: { clientId },
        orderBy: { createdAt: 'desc' },
        take: 30,
        include: {
          createdBy: { select: { id: true, name: true } },
          project: { select: { id: true, name: true } },
        },
      }),
    ]);

    return { references, reports };
  }

  /* ── Ingestão Multimodal (Extensão Chrome / Painel) ──── */

  async ingestReference(
    clientId: string,
    dto: IngestReferenceDto,
    files: Express.Multer.File[],
    userId: string,
  ) {
    const client = await this.prisma.client.findFirst({
      where: { id: clientId, deletedAt: null },
      include: {
        brandProfile: true,
        competitors: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!client) throw new NotFoundException('Cliente não encontrado.');

    if (dto.competitorId) {
      const comp = await this.prisma.clientCompetitor.findFirst({
        where: { id: dto.competitorId, clientId },
        select: { id: true },
      });
      if (!comp) {
        throw new BadRequestException(
          'Concorrente informado não pertence a este cliente.',
        );
      }
    }

    const mediaUrls: string[] = [];
    const mediaTypes: string[] = [];
    const inlineParts: Array<{
      inlineData: { mimeType: string; data: string };
    }> = [];
    let inlineBytes = 0;

    for (const file of files ?? []) {
      const saved = await this.storage.saveAny(
        file,
        ['image', 'video', 'audio', 'pdf'],
        { optimize: true },
      );
      mediaUrls.push(saved.url);
      mediaTypes.push(saved.mime);

      if (
        file.buffer.length <= MAX_GEMINI_INLINE_BYTES &&
        inlineBytes + file.buffer.length <= MAX_TOTAL_INLINE_BYTES
      ) {
        inlineParts.push({
          inlineData: {
            mimeType: saved.mime,
            data: file.buffer.toString('base64'),
          },
        });
        inlineBytes += file.buffer.length;
      }
    }

    const metrics = parseMetrics(dto.metrics);
    const tags = parseTags(dto.tags);
    const platform = dto.platform ?? ReferencePlatform.INSTAGRAM;

    let aiAnalysis: string | null = null;
    let extractedHooks: string[] = [];
    let adaptedAngles: string | null = null;

    if (dto.analyzeNow !== false) {
      const analyzed = await this.analyzeReferenceWithGemini({
        clientBlock: this.clientAi.buildClientContextBlock(
          client,
          client.brandProfile,
          client.competitors,
        ),
        platform,
        sourceUrl: dto.sourceUrl,
        authorHandle: dto.authorHandle,
        title: dto.title,
        caption: dto.caption,
        metrics,
        inlineParts,
        mediaCount: mediaUrls.length,
        modelTier: dto.modelTier,
      });

      aiAnalysis = analyzed.summary;
      extractedHooks = analyzed.extractedHooks;
      adaptedAngles = analyzed.adaptedAngles;
      for (const t of analyzed.suggestedTags) {
        if (!tags.includes(t) && tags.length < 20) tags.push(t);
      }
    }

    const reference = await this.prisma.competitorReference.create({
      data: {
        clientId,
        competitorId: dto.competitorId || null,
        createdById: userId,
        platform,
        sourceUrl: dto.sourceUrl?.trim() || null,
        authorHandle: dto.authorHandle?.trim() || null,
        title:
          dto.title?.trim() ||
          (dto.authorHandle?.trim()
            ? `Referência ${dto.authorHandle.trim()}`
            : `Referência ${platform}`),
        caption: dto.caption?.trim() || null,
        metrics: metrics ? (metrics as Prisma.InputJsonValue) : undefined,
        mediaUrls,
        mediaTypes,
        aiAnalysis,
        extractedHooks,
        adaptedAngles,
        isViral: dto.isViral ?? false,
        tags,
      },
      include: {
        competitor: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    if (aiAnalysis) {
      await this.prisma.aiGenerationLog.create({
        data: {
          clientId,
          userId,
          kind: AiGenerationKind.COMPETITOR_ANALYSIS,
          model:
            dto.modelTier === 'pro' ? 'gemini-4-argon' : 'gemini-multimodal',
          title: `Análise de referência: ${reference.title ?? reference.platform}`,
          prompt: dto.caption?.slice(0, 1000) || dto.sourceUrl || platform,
          output: aiAnalysis,
          metadata: {
            referenceId: reference.id,
            mediaCount: mediaUrls.length,
          },
        },
      });
    }

    return reference;
  }

  async toggleViral(id: string, isViral: boolean) {
    const existing = await this.prisma.competitorReference.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Referência não encontrada.');
    return this.prisma.competitorReference.update({
      where: { id },
      data: { isViral },
      include: {
        competitor: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });
  }

  async reanalyzeReference(
    id: string,
    userId: string,
    modelTier: AiModelTier = 'pro',
  ) {
    const ref = await this.prisma.competitorReference.findUnique({
      where: { id },
      include: {
        client: {
          include: {
            brandProfile: true,
            competitors: { orderBy: { createdAt: 'asc' } },
          },
        },
      },
    });
    if (!ref) throw new NotFoundException('Referência não encontrada.');

    const analyzed = await this.analyzeReferenceWithGemini({
      clientBlock: this.clientAi.buildClientContextBlock(
        ref.client,
        ref.client.brandProfile,
        ref.client.competitors,
      ),
      platform: ref.platform,
      sourceUrl: ref.sourceUrl ?? undefined,
      authorHandle: ref.authorHandle ?? undefined,
      title: ref.title ?? undefined,
      caption: ref.caption ?? undefined,
      metrics: (ref.metrics as Record<string, unknown> | null) ?? undefined,
      inlineParts: [],
      mediaCount: ref.mediaUrls.length,
      modelTier,
    });

    const updated = await this.prisma.competitorReference.update({
      where: { id },
      data: {
        aiAnalysis: analyzed.summary,
        extractedHooks: analyzed.extractedHooks,
        adaptedAngles: analyzed.adaptedAngles,
      },
      include: {
        competitor: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    await this.prisma.aiGenerationLog.create({
      data: {
        clientId: ref.clientId,
        userId,
        kind: AiGenerationKind.COMPETITOR_ANALYSIS,
        model: analyzed.model,
        title: `Reanálise: ${ref.title ?? ref.platform}`,
        prompt: ref.caption?.slice(0, 1000) || ref.sourceUrl || ref.platform,
        output: analyzed.summary,
      },
    });

    return updated;
  }

  async deleteReference(id: string) {
    const ref = await this.prisma.competitorReference.findUnique({
      where: { id },
    });
    if (!ref) throw new NotFoundException('Referência não encontrada.');

    for (const url of ref.mediaUrls) {
      await this.storage.remove(url);
    }
    await this.prisma.competitorReference.delete({ where: { id } });
    return { deleted: true };
  }

  /* ── Pesquisa Profunda: Trends, Sites & Concorrentes ─── */

  async runResearch(clientId: string, dto: RunResearchDto, userId: string) {
    const client = await this.prisma.client.findFirst({
      where: { id: clientId, deletedAt: null },
      include: {
        brandProfile: true,
        competitors: { orderBy: { createdAt: 'asc' } },
        competitorRefs: {
          orderBy: [{ isViral: 'desc' }, { createdAt: 'desc' }],
          take: 8,
        },
      },
    });
    if (!client) throw new NotFoundException('Cliente não encontrado.');

    let fetchedPageContent = '';
    const urlsToInspect: string[] = [];
    if (dto.targetUrl?.trim()) urlsToInspect.push(dto.targetUrl.trim());
    else if (dto.kind === ResearchReportKind.WEBSITE_ANALYSIS) {
      for (const comp of client.competitors.slice(0, 3)) {
        if (comp.websiteUrl) urlsToInspect.push(comp.websiteUrl);
      }
    }

    for (const rawUrl of urlsToInspect.slice(0, 2)) {
      const safe = isSafePublicUrl(rawUrl);
      if (!safe) continue;
      try {
        const res = await fetch(safe.toString(), {
          signal: AbortSignal.timeout(7000),
          headers: { 'User-Agent': 'PicPlusResearchBot/1.0' },
        });
        if (res.ok) {
          const html = await res.text();
          fetchedPageContent += `\n\n--- SITE ANALISADO (${safe.toString()}) ---\n${extractReadableWebText(html)}`;
        }
      } catch (err) {
        this.logger.debug(
          `Não foi possível ler ${safe.toString()}: ${(err as Error).message}`,
        );
      }
    }

    const refsSummary = client.competitorRefs
      .map(
        (r) =>
          `- [${r.platform}${r.isViral ? ' · VIRAL' : ''}] ${r.authorHandle || r.title || 'Post'}: ${r.extractedHooks.join(' / ') || r.caption?.slice(0, 140) || ''}`,
      )
      .join('\n');

    const prompt = [
      this.clientAi.buildClientContextBlock(
        client,
        client.brandProfile,
        client.competitors,
      ),
      refsSummary
        ? `\n=== REFERÊNCIAS E VIRAIS JÁ COLETADOS ===\n${refsSummary}`
        : null,
      fetchedPageContent || null,
      '',
      '=== MISSÃO DE PESQUISA ===',
      `Tipo de investigação: ${REPORT_KIND_LABELS[dto.kind]}`,
      `Tema / Foco: ${dto.topic.trim()}`,
      '',
      `Entregue um dossiê estratégico completo em Markdown (português do Brasil) contendo:
1. **Resumo Executivo** (principais achados e oportunidades imediatas)
2. **Análise de Tendências, Formatos & Virais** para o público-alvo do cliente
3. **Copys, Ganchos (Hooks) & Estruturas que Funcionam** (com exemplos práticos prontos para adaptar)
4. **Brechas Competitivas** (o que os concorrentes não estão fazendo e o cliente pode dominar)
5. **Plano de Ação Rápido** (5 ideias acionáveis para Social, Blog ou Campanha de Vendas).`,
    ]
      .filter(Boolean)
      .join('\n');

    const { ai, model } = await this.clientAi.getGeminiInstance(
      dto.modelTier ?? 'pro',
    );

    const systemInstruction =
      'Você é um estrategista sênior de inteligência competitiva, pesquisa de mercado, tendências virais e copywriting da agência PicPlus.';

    let rawText = '';
    const sources: Array<{ title?: string; url: string }> = [];

    try {
      const response = await ai.models.generateContent({
        model,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          systemInstruction,
          temperature: 0.5,
          ...(dto.useWebSearch !== false
            ? { tools: [{ googleSearch: {} }] }
            : {}),
        },
      });
      rawText = cleanOutput(response.text);
      const chunks = (
        response as unknown as {
          candidates?: Array<{
            groundingMetadata?: {
              groundingChunks?: Array<{
                web?: { uri?: string; title?: string };
              }>;
            };
          }>;
        }
      ).candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (Array.isArray(chunks)) {
        for (const c of chunks) {
          if (c.web?.uri) {
            sources.push({ title: c.web.title, url: c.web.uri });
          }
        }
      }
    } catch (err) {
      if (dto.useWebSearch !== false) {
        this.logger.warn(
          `Google Search Grounding indisponível para ${model}, executando sem busca web: ${(err as Error).message}`,
        );
        const fallback = await this.clientAi.callGemini(
          prompt,
          { systemInstruction, temperature: 0.5 },
          dto.modelTier ?? 'pro',
        );
        rawText = fallback.text;
      } else {
        throw new BadGatewayException(
          'Não foi possível concluir a pesquisa com a IA agora.',
        );
      }
    }

    if (!rawText) {
      throw new BadGatewayException('A IA retornou um relatório vazio.');
    }

    const summary = rawText.split('\n').slice(0, 6).join('\n').slice(0, 800);

    const report = await this.prisma.researchReport.create({
      data: {
        clientId,
        projectId: dto.projectId || null,
        createdById: userId,
        kind: dto.kind,
        topic: dto.topic.trim(),
        model,
        summary,
        rawMarkdown: rawText,
        sources: sources.length
          ? (sources as Prisma.InputJsonValue)
          : undefined,
      },
      include: {
        createdBy: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
      },
    });

    await this.prisma.aiGenerationLog.create({
      data: {
        clientId,
        projectId: dto.projectId || null,
        userId,
        kind: AiGenerationKind.COMPETITOR_ANALYSIS,
        model,
        title: `${REPORT_KIND_LABELS[dto.kind]}: ${dto.topic.trim()}`,
        prompt,
        output: rawText,
        metadata: { reportId: report.id, sourcesCount: sources.length },
      },
    });

    return report;
  }

  async deleteReport(id: string) {
    const existing = await this.prisma.researchReport.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Relatório não encontrado.');
    await this.prisma.researchReport.delete({ where: { id } });
    return { deleted: true };
  }

  /* ── Análise Multimodal Privada ──────────────────────── */

  private async analyzeReferenceWithGemini(input: {
    clientBlock: string;
    platform: ReferencePlatform;
    sourceUrl?: string;
    authorHandle?: string;
    title?: string;
    caption?: string;
    metrics?: Record<string, unknown>;
    inlineParts: Array<{ inlineData: { mimeType: string; data: string } }>;
    mediaCount: number;
    modelTier?: AiModelTier;
  }): Promise<{
    summary: string;
    extractedHooks: string[];
    adaptedAngles: string;
    suggestedTags: string[];
    model: string;
  }> {
    const { ai, model } = await this.clientAi.getGeminiInstance(
      input.modelTier ?? 'fast',
    );

    const promptText = [
      input.clientBlock,
      '',
      '=== PUBLICAÇÃO / CONTEÚDO CAPTURADO ===',
      `Plataforma: ${input.platform}`,
      input.authorHandle ? `Perfil / Autor: ${input.authorHandle}` : null,
      input.sourceUrl ? `URL: ${input.sourceUrl}` : null,
      input.title ? `Título: ${input.title}` : null,
      input.metrics
        ? `Métricas observadas: ${JSON.stringify(input.metrics)}`
        : null,
      input.caption ? `Legenda / Texto capturado:\n${input.caption}` : null,
      input.mediaCount > 0
        ? `Mídias anexadas (${input.mediaCount} arquivo(s) enviados para análise multimodal de imagem/vídeo/áudio).`
        : null,
      '',
      `Analise profundamente este conteúdo (incluindo texto na imagem, fala/áudio do vídeo, ritmo visual, legenda e oferta se presentes) e responda APENAS um JSON válido com estas chaves:
{
  "summary": "string (análise detalhada: por que funciona/viraliza, transcrição dos pontos-chave do áudio/vídeo se houver, estrutura da copy, gatilhos e retenção)",
  "extractedHooks": ["string (3 a 6 ganchos de abertura exatos ou adaptáveis)"],
  "adaptedAngles": "string (3 ideias práticas de como adaptar esta exata estrutura/copy para o público-alvo do cliente)",
  "suggestedTags": ["string (2 a 5 tags curtas, ex: reels, dor-preco, antes-depois)"]
}`,
    ]
      .filter(Boolean)
      .join('\n');

    try {
      const response = await ai.models.generateContent({
        model,
        contents: [
          {
            role: 'user',
            parts: [...input.inlineParts, { text: promptText }],
          },
        ],
        config: {
          systemInstruction:
            'Você é especialista em engenharia reversa de conteúdos virais, análise multimodal de vídeo/áudio/imagem e copywriting.',
          temperature: 0.45,
          responseMimeType: 'application/json',
        },
      });

      const cleaned = cleanOutput(response.text);
      const parsed = JSON.parse(cleaned) as {
        summary?: string;
        extractedHooks?: unknown[];
        adaptedAngles?: string;
        suggestedTags?: unknown[];
      };

      return {
        summary:
          typeof parsed.summary === 'string' && parsed.summary.trim()
            ? parsed.summary.trim()
            : cleaned,
        extractedHooks: Array.isArray(parsed.extractedHooks)
          ? parsed.extractedHooks.filter(
              (h): h is string => typeof h === 'string' && !!h.trim(),
            )
          : [],
        adaptedAngles:
          typeof parsed.adaptedAngles === 'string'
            ? parsed.adaptedAngles.trim()
            : '',
        suggestedTags: Array.isArray(parsed.suggestedTags)
          ? parsed.suggestedTags.filter(
              (t): t is string => typeof t === 'string' && !!t.trim(),
            )
          : [],
        model,
      };
    } catch (err) {
      this.logger.warn(
        `Análise multimodal fallback (${model}): ${(err as Error).message}`,
      );
      return {
        summary:
          'Referência salva com sucesso. Execute "Reanalisar com IA" para tentar nova análise detalhada.',
        extractedHooks: [],
        adaptedAngles: '',
        suggestedTags: [],
        model,
      };
    }
  }
}
