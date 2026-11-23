import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  AiGenerationKind,
  LandingPage,
  LandingPageStatus,
  Prisma,
} from '@prisma/client';
import { resolve4, resolveCname } from 'node:dns/promises';
import { config } from '../config/configuration';
import { PrismaService } from '../prisma/prisma.service';
import { ClientAiService } from './client-ai.service';
import { escapeHtml } from './client-ai.utils';
import {
  CaptureLandingLeadDto,
  GenerateLandingPageDto,
  IterateLandingPageDto,
  LpVisualStyle,
  UpdateLandingPageDto,
} from './dto/landing-page.dto';
import { createZipBuffer } from './zip.utils';

const STYLE_GUIDANCE: Record<LpVisualStyle, string> = {
  MODERN_DARK:
    'Visual escuro sofisticado (#0B0D12 fundo, superfícies #141821, texto #F5F7FA, destaque vibrante em verde-limão #B6E829 ou ciano, gradientes sutis e cards com borda translúcida).',
  EDITORIAL_LIGHT:
    'Visual editorial claro e elegante (#FAF8F5 fundo, tipografia serifada elegante para títulos combinada com sans-serif limpa, contraste alto #161616, espaçamento generoso).',
  CORPORATE_CLEAN:
    'Visual corporativo moderno e confiável (fundo branco #FFFFFF e cinza suave #F4F6F9, azul profundo #0F2942, acentos claros, blocos bem estruturados).',
  HIGH_CONVERSION:
    'Visual focado em alta conversão e resposta direta (hero de impacto imediato acima da dobra, contraste forte nos botões CTA, badges de prova social, blocos de objeção e urgência ética).',
};

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function normalizeDomain(raw?: string | null): string | null {
  if (!raw || !raw.trim()) return null;
  const cleaned = raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/:\d+$/, '');
  if (!cleaned) return null;
  if (
    !/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/.test(
      cleaned,
    )
  ) {
    throw new BadRequestException(
      'Domínio inválido. Informe apenas o domínio/subdomínio, ex.: lp.suaempresa.com.br',
    );
  }
  return cleaned;
}

function sanitizeGeneratedHtml(raw: string): string {
  const cleaned = raw
    .trim()
    .replace(/^```html?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();
  if (!/<html[\s>]/i.test(cleaned)) {
    return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Landing Page</title></head><body>${cleaned}</body></html>`;
  }
  return cleaned;
}

@Injectable()
export class LandingPagesService {
  private readonly logger = new Logger(LandingPagesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly clientAi: ClientAiService,
  ) {}

  async list(filters?: { clientId?: string; projectId?: string }) {
    return this.prisma.landingPage.findMany({
      where: {
        clientId: filters?.clientId || undefined,
        projectId: filters?.projectId || undefined,
      },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        visualStyle: true,
        customDomain: true,
        domainVerified: true,
        viewsCount: true,
        publishedAt: true,
        createdAt: true,
        updatedAt: true,
        clientId: true,
        projectId: true,
        client: { select: { id: true, tradeName: true } },
        project: { select: { id: true, name: true } },
        _count: { select: { leads: true } },
      },
    });
  }

  async getOne(id: string) {
    const lp = await this.prisma.landingPage.findUnique({
      where: { id },
      include: {
        client: { select: { id: true, tradeName: true, corporateName: true } },
        project: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
        leads: { orderBy: { createdAt: 'desc' }, take: 50 },
        _count: { select: { leads: true } },
      },
    });
    if (!lp) throw new NotFoundException('Landing Page não encontrada.');
    return lp;
  }

  async generate(dto: GenerateLandingPageDto, userId: string) {
    const context = await this.resolveClientAndProject(
      dto.clientId,
      dto.projectId,
    );
    const visualStyle = dto.visualStyle ?? 'MODERN_DARK';

    const prompt = [
      context.clientBlock,
      '',
      '=== BRIEFING DA LANDING PAGE ===',
      dto.title?.trim() ? `Título desejado: ${dto.title.trim()}` : null,
      `Objetivo principal: ${dto.objective.trim()}`,
      dto.offer?.trim()
        ? `Oferta / Produto / Condição: ${dto.offer.trim()}`
        : null,
      dto.ctaText?.trim()
        ? `Texto principal do botão CTA: ${dto.ctaText.trim()}`
        : null,
      `Direção visual: ${STYLE_GUIDANCE[visualStyle]}`,
      dto.extraInstructions?.trim()
        ? `Instruções adicionais:\n${dto.extraInstructions.trim()}`
        : null,
      '',
      `Crie uma Landing Page completa em HTML5 único e autocontido (CSS inline dentro de <style>, responsivo para mobile e desktop, sem frameworks externos obrigatórios além de Google Fonts opcionais).
REGRAS OBRIGATÓRIAS:
1. Retorne SOMENTE o código HTML5 completo começando com <!DOCTYPE html> e terminando com </html>, sem markdown ou explicações.
2. Estruture seções de alta conversão: Header enxuto com CTA, Hero impactante acima da dobra, Seção de Dores/Problema, Solução e Benefícios em cards, Prova Social / Autoridade, Oferta + Garantia / FAQ em <details>/<summary>, e Seção final com Formulário de Captura de Leads.
3. No formulário de leads, use EXATAMENTE o atributo data-picplus-lead-form na tag <form>, com campos name="name", name="email", name="phone", name="message" (opcionais conforme o contexto, mas mantendo ao menos name, email e phone) e um elemento <p data-picplus-form-status></p> para feedback de envio.
4. Use copy persuasiva em português do Brasil fiel ao Brand Book do cliente.`,
    ]
      .filter(Boolean)
      .join('\n');

    const { text, model } = await this.clientAi.callGemini(
      prompt,
      {
        systemInstruction:
          'Você é um especialista em UI/UX Design, Web Design responsivo e Copywriting de Landing Pages de alta conversão.',
        temperature: 0.55,
      },
      dto.modelTier ?? 'pro',
    );

    const htmlContent = sanitizeGeneratedHtml(text);
    const title =
      dto.title?.trim() ||
      (context.clientName
        ? `LP ${context.clientName} — ${dto.objective.trim().slice(0, 50)}`
        : `Landing Page — ${dto.objective.trim().slice(0, 60)}`);

    const slug = await this.ensureUniqueSlug(title);

    const created = await this.prisma.landingPage.create({
      data: {
        title: title.slice(0, 180),
        slug,
        status: LandingPageStatus.DRAFT,
        objective: dto.objective.trim(),
        visualStyle,
        metaTitle: title.slice(0, 180),
        metaDescription: dto.objective.trim().slice(0, 300),
        htmlContent,
        clientId: context.clientId,
        projectId: context.projectId,
        createdById: userId,
      },
      include: {
        client: { select: { id: true, tradeName: true, corporateName: true } },
        project: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
        leads: true,
        _count: { select: { leads: true } },
      },
    });

    await this.prisma.aiGenerationLog.create({
      data: {
        clientId: context.clientId,
        projectId: context.projectId,
        userId,
        kind: AiGenerationKind.LANDING_PAGE,
        model,
        title: created.title,
        prompt,
        output: `Landing Page criada (${created.slug})`,
        metadata: { landingPageId: created.id, visualStyle },
      },
    });

    return { landingPage: created, model };
  }

  async iterate(id: string, dto: IterateLandingPageDto, userId: string) {
    const lp = await this.getOne(id);
    const context = await this.resolveClientAndProject(
      lp.clientId,
      lp.projectId,
    );

    const prompt = [
      context.clientBlock,
      '',
      '=== HTML ATUAL DA LANDING PAGE ===',
      lp.htmlContent,
      '',
      '=== AJUSTE SOLICITADO ===',
      dto.instruction.trim(),
      '',
      'Aplique a alteração solicitada mantendo o restante da página coerente, responsiva e preservando o atributo data-picplus-lead-form no formulário de captura. Retorne SOMENTE o HTML5 completo atualizado (<!DOCTYPE html>...</html>).',
    ].join('\n');

    const { text, model } = await this.clientAi.callGemini(
      prompt,
      {
        systemInstruction:
          'Você edita Landing Pages HTML5/CSS mantendo código limpo, responsivo e focado em conversão.',
        temperature: 0.45,
      },
      dto.modelTier ?? 'pro',
    );

    const htmlContent = sanitizeGeneratedHtml(text);
    const updated = await this.prisma.landingPage.update({
      where: { id },
      data: { htmlContent },
      include: {
        client: { select: { id: true, tradeName: true, corporateName: true } },
        project: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
        leads: { orderBy: { createdAt: 'desc' }, take: 50 },
        _count: { select: { leads: true } },
      },
    });

    await this.prisma.aiGenerationLog.create({
      data: {
        clientId: lp.clientId,
        projectId: lp.projectId,
        userId,
        kind: AiGenerationKind.LANDING_PAGE,
        model,
        title: `Ajuste LP: ${lp.title}`,
        prompt: dto.instruction.trim(),
        output: `HTML atualizado (${htmlContent.length} caracteres)`,
        metadata: { landingPageId: lp.id },
      },
    });

    return { landingPage: updated, model };
  }

  async update(id: string, dto: UpdateLandingPageDto) {
    const current = await this.prisma.landingPage.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Landing Page não encontrada.');

    let nextSlug: string | undefined;
    if (dto.slug !== undefined) {
      const normalized = slugify(dto.slug);
      if (normalized.length < 2) {
        throw new BadRequestException('Slug inválido.');
      }
      const conflict = await this.prisma.landingPage.findFirst({
        where: { slug: normalized, id: { not: id } },
        select: { id: true },
      });
      if (conflict) {
        throw new ConflictException(
          'Este slug já está em uso por outra página.',
        );
      }
      nextSlug = normalized;
    }

    let nextDomain: string | null | undefined;
    let domainChanged = false;
    if (dto.customDomain !== undefined) {
      nextDomain = normalizeDomain(dto.customDomain);
      if (nextDomain) {
        const conflict = await this.prisma.landingPage.findFirst({
          where: { customDomain: nextDomain, id: { not: id } },
          select: { id: true },
        });
        if (conflict) {
          throw new ConflictException(
            'Este domínio personalizado já está conectado a outra Landing Page.',
          );
        }
      }
      domainChanged = nextDomain !== current.customDomain;
    }

    const publishedAt =
      dto.status === LandingPageStatus.PUBLISHED && !current.publishedAt
        ? new Date()
        : undefined;

    return this.prisma.landingPage.update({
      where: { id },
      data: {
        title: dto.title?.trim(),
        slug: nextSlug,
        status: dto.status,
        publishedAt,
        metaTitle:
          dto.metaTitle === undefined
            ? undefined
            : dto.metaTitle?.trim() || null,
        metaDescription:
          dto.metaDescription === undefined
            ? undefined
            : dto.metaDescription?.trim() || null,
        htmlContent: dto.htmlContent,
        customDomain: nextDomain,
        clientId: dto.clientId,
        projectId: dto.projectId,
        ...(domainChanged
          ? { domainVerified: false, domainVerificationError: null }
          : {}),
      },
      include: {
        client: { select: { id: true, tradeName: true, corporateName: true } },
        project: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
        leads: { orderBy: { createdAt: 'desc' }, take: 50 },
        _count: { select: { leads: true } },
      },
    });
  }

  async verifyCustomDomain(id: string) {
    const lp = await this.prisma.landingPage.findUnique({ where: { id } });
    if (!lp) throw new NotFoundException('Landing Page não encontrada.');
    if (!lp.customDomain) {
      throw new BadRequestException(
        'Configure um domínio personalizado antes de verificar o DNS.',
      );
    }

    let expectedHost = 'seu-backend.up.railway.app';
    try {
      expectedHost = new URL(config.backendUrl).hostname;
    } catch {
      /* fallback */
    }

    let verified = false;
    let resolvedRecords: string[] = [];
    let errorMessage: string | null = null;

    try {
      const cnames = await resolveCname(lp.customDomain).catch(() => []);
      if (cnames.length > 0) {
        resolvedRecords = cnames;
        verified =
          expectedHost === 'localhost'
            ? true
            : cnames.some(
                (c) =>
                  c.replace(/\.$/, '').toLowerCase() ===
                  expectedHost.toLowerCase(),
              );
        if (!verified) {
          errorMessage = `CNAME aponta para ${cnames.join(', ')}, esperado: ${expectedHost}.`;
        }
      } else {
        const ips = await resolve4(lp.customDomain).catch(() => []);
        resolvedRecords = ips;
        if (ips.length > 0) {
          verified = true;
        } else {
          errorMessage =
            'Nenhum registro CNAME ou A encontrado ainda para este domínio.';
        }
      }
    } catch (err) {
      errorMessage = `Falha ao consultar DNS: ${(err as Error).message}`;
    }

    await this.prisma.landingPage.update({
      where: { id },
      data: {
        domainVerified: verified,
        domainVerificationError: errorMessage,
      },
    });

    return {
      verified,
      customDomain: lp.customDomain,
      expectedTarget: expectedHost,
      resolvedRecords,
      errorMessage,
    };
  }

  async remove(id: string) {
    const lp = await this.prisma.landingPage.findUnique({ where: { id } });
    if (!lp) throw new NotFoundException('Landing Page não encontrada.');
    await this.prisma.landingPage.delete({ where: { id } });
    return { deleted: true };
  }

  exportZip(
    lp: Pick<
      LandingPage,
      'slug' | 'title' | 'metaTitle' | 'metaDescription' | 'htmlContent'
    >,
    publicOrigin: string,
  ): Buffer {
    const cleanOrigin = publicOrigin.replace(/\/+$/, '');
    const indexHtml = this.injectRuntimeIntoHtml(lp, cleanOrigin);
    const readme = [
      `# ${lp.title}`,
      '',
      'Pacote estático gerado pelo PicPlus AI Studio.',
      '',
      '## Como publicar em hospedagem própria',
      '- **GitHub Pages:** suba `index.html` na raiz de um repositório e ative Pages (Settings → Pages).',
      '- **Vercel / Netlify / Cloudflare Pages:** arraste a pasta descompactada ou conecte ao repositório GitHub.',
      '- **Servidor tradicional / cPanel:** envie `index.html` para a pasta `public_html`.',
      '',
      `O formulário desta página já envia leads automaticamente para: ${cleanOrigin}/api/public/landing-pages/${lp.slug}/leads`,
    ].join('\n');

    const vercelConfig = JSON.stringify(
      { cleanUrls: true, trailingSlash: false },
      null,
      2,
    );

    return createZipBuffer([
      { name: 'index.html', content: indexHtml },
      { name: 'README.md', content: readme },
      { name: 'vercel.json', content: vercelConfig },
    ]);
  }

  /* ── Roteamento Público & Captura de Leads ───────────── */

  async findPublishedBySlugHtml(slug: string) {
    const lp = await this.prisma.landingPage.findFirst({
      where: { slug, status: LandingPageStatus.PUBLISHED },
    });
    if (!lp) return null;
    void this.incrementViews(lp.id);
    return this.injectRuntimeIntoHtml(lp, '');
  }

  async findPublishedForHostHtml(rawHost: string) {
    const host = rawHost
      .split(',')[0]
      .trim()
      .toLowerCase()
      .replace(/:\d+$/, '');
    if (!host) return null;
    const candidates = [host];
    if (host.startsWith('www.')) candidates.push(host.slice(4));

    const lp = await this.prisma.landingPage.findFirst({
      where: {
        customDomain: { in: candidates },
        status: LandingPageStatus.PUBLISHED,
      },
    });
    if (!lp) return null;
    void this.incrementViews(lp.id);
    return this.injectRuntimeIntoHtml(lp, '');
  }

  async captureLead(slug: string, dto: CaptureLandingLeadDto) {
    const lp = await this.prisma.landingPage.findFirst({
      where: { slug, status: LandingPageStatus.PUBLISHED },
      select: { id: true },
    });
    if (!lp) {
      throw new NotFoundException(
        'Landing Page não encontrada ou não publicada.',
      );
    }
    if (!dto.name?.trim() && !dto.email?.trim() && !dto.phone?.trim()) {
      throw new BadRequestException(
        'Informe ao menos nome, e-mail ou telefone para enviar.',
      );
    }

    const lead = await this.prisma.landingPageLead.create({
      data: {
        landingPageId: lp.id,
        name: dto.name?.trim() || null,
        email: dto.email?.trim() || null,
        phone: dto.phone?.trim() || null,
        message: dto.message?.trim() || null,
        utmSource: dto.utmSource?.trim() || null,
        utmMedium: dto.utmMedium?.trim() || null,
        utmCampaign: dto.utmCampaign?.trim() || null,
        payload: dto.payload
          ? (dto.payload as Prisma.InputJsonValue)
          : undefined,
      },
    });

    return {
      ok: true,
      leadId: lead.id,
      message: 'Recebemos seus dados com sucesso!',
    };
  }

  /* ── Helpers ─────────────────────────────────────────── */

  injectRuntimeIntoHtml(
    lp: Pick<
      LandingPage,
      'slug' | 'title' | 'metaTitle' | 'metaDescription' | 'htmlContent'
    >,
    origin: string,
  ): string {
    const endpoint = `${origin.replace(/\/+$/, '')}/api/public/landing-pages/${encodeURIComponent(lp.slug)}/leads`;
    const metaTags = [
      lp.metaTitle
        ? `<meta property="og:title" content="${escapeHtml(lp.metaTitle)}" />`
        : '',
      lp.metaDescription
        ? `<meta name="description" content="${escapeHtml(lp.metaDescription)}" /><meta property="og:description" content="${escapeHtml(lp.metaDescription)}" />`
        : '',
    ]
      .filter(Boolean)
      .join('\n');

    const leadScript = `<script>
(function(){
  var forms = document.querySelectorAll('form[data-picplus-lead-form]');
  if (!forms.length) return;
  var params = new URLSearchParams(window.location.search);
  forms.forEach(function(form){
    form.addEventListener('submit', function(e){
      e.preventDefault();
      var statusEl = form.querySelector('[data-picplus-form-status]');
      var btn = form.querySelector('button[type="submit"],input[type="submit"]');
      var fd = new FormData(form);
      var extra = {};
      fd.forEach(function(v, k){
        if (['name','email','phone','message'].indexOf(k) === -1) extra[k] = v;
      });
      var body = {
        name: fd.get('name') || undefined,
        email: fd.get('email') || undefined,
        phone: fd.get('phone') || undefined,
        message: fd.get('message') || undefined,
        utmSource: params.get('utm_source') || undefined,
        utmMedium: params.get('utm_medium') || undefined,
        utmCampaign: params.get('utm_campaign') || undefined,
        payload: Object.keys(extra).length ? extra : undefined
      };
      if (btn) btn.disabled = true;
      if (statusEl) statusEl.textContent = 'Enviando...';
      fetch(${JSON.stringify(endpoint)}, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      }).then(function(res){
        return res.json().then(function(data){ return { ok: res.ok, data: data }; });
      }).then(function(r){
        if (r.ok) {
          form.reset();
          if (statusEl) statusEl.textContent = r.data.message || 'Dados enviados com sucesso!';
        } else {
          if (statusEl) statusEl.textContent = (r.data && r.data.message) || 'Erro ao enviar. Verifique seus dados.';
        }
      }).catch(function(){
        if (statusEl) statusEl.textContent = 'Erro de conexão. Tente novamente.';
      }).finally(function(){
        if (btn) btn.disabled = false;
      });
    });
  });
})();
</script>`;

    let html = lp.htmlContent;
    if (metaTags && /<\/head>/i.test(html)) {
      html = html.replace(/<\/head>/i, `${metaTags}\n</head>`);
    }
    if (/<\/body>/i.test(html)) {
      html = html.replace(/<\/body>/i, `${leadScript}\n</body>`);
    } else {
      html = `${html}\n${leadScript}`;
    }
    return html;
  }

  private async incrementViews(id: string) {
    try {
      await this.prisma.landingPage.update({
        where: { id },
        data: { viewsCount: { increment: 1 } },
      });
    } catch (err) {
      this.logger.debug(
        `Falha ao incrementar views (${id}): ${(err as Error).message}`,
      );
    }
  }

  private async ensureUniqueSlug(baseTitle: string): Promise<string> {
    const base = slugify(baseTitle) || `lp-${Date.now()}`;
    let candidate = base;
    let suffix = 1;
    while (
      await this.prisma.landingPage.findUnique({
        where: { slug: candidate },
        select: { id: true },
      })
    ) {
      candidate = `${base.slice(0, 70)}-${++suffix}`;
    }
    return candidate;
  }

  private async resolveClientAndProject(
    rawClientId?: string | null,
    rawProjectId?: string | null,
  ): Promise<{
    clientId: string | null;
    projectId: string | null;
    clientName: string | null;
    clientBlock: string;
  }> {
    let clientId = rawClientId || null;
    const projectId = rawProjectId || null;

    if (projectId) {
      const project = await this.clientAi.requireProject(projectId);
      if (!clientId && project.clientId) clientId = project.clientId;
    }

    if (clientId) {
      const client = await this.prisma.client.findFirst({
        where: { id: clientId, deletedAt: null },
        include: {
          brandProfile: true,
          competitors: { orderBy: { createdAt: 'asc' } },
        },
      });
      if (!client) throw new NotFoundException('Cliente não encontrado.');
      return {
        clientId: client.id,
        projectId,
        clientName: client.tradeName,
        clientBlock: this.clientAi.buildClientContextBlock(
          client,
          client.brandProfile,
          client.competitors,
        ),
      };
    }

    return {
      clientId: null,
      projectId,
      clientName: null,
      clientBlock:
        '=== CONTEXTO DO CLIENTE ===\nLanding Page sem cliente específico vinculado.',
    };
  }
}
