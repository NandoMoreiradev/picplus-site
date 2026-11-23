import { PGlite } from '@electric-sql/pglite';
import { PrismaClient } from '@prisma/client';
import { PrismaPGlite } from 'pglite-prisma-adapter';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { AiChatbotService } from '../src/ai-chatbot/ai-chatbot.service';
import { CampaignPlannerService } from '../src/client-ai/campaign-planner.service';
import { ClientAiService } from '../src/client-ai/client-ai.service';
import { LandingPagesService } from '../src/client-ai/landing-pages.service';
import type { PrismaService } from '../src/prisma/prisma.service';

describe('Estúdio IA de Clientes e Tarefas (integração, PGlite)', () => {
  let db: PGlite;
  let prisma: PrismaClient;
  let service: ClientAiService;
  let planner: CampaignPlannerService;
  let landingPages: LandingPagesService;

  const generateContentMock = jest.fn();
  const fakeAiChatbot = {
    getClient: jest.fn(() =>
      Promise.resolve({
        model: 'gemini-3.8-flash',
        ai: {
          models: {
            generateContent: generateContentMock,
          },
        },
      }),
    ),
  } as unknown as AiChatbotService;

  let userId: string;
  let clientId: string;
  let projectId: string;
  let taskId: string;

  beforeAll(async () => {
    db = new PGlite();
    const dir = join(__dirname, '../prisma/migrations');
    for (const name of readdirSync(dir).sort()) {
      const file = join(dir, name, 'migration.sql');
      if (existsSync(file)) {
        await db.exec(readFileSync(file, 'utf8'));
      }
    }

    prisma = new PrismaClient({ adapter: new PrismaPGlite(db) });
    await prisma.$connect();
    service = new ClientAiService(
      prisma as unknown as PrismaService,
      fakeAiChatbot,
    );
    planner = new CampaignPlannerService(
      prisma as unknown as PrismaService,
      service,
    );
    landingPages = new LandingPagesService(
      prisma as unknown as PrismaService,
      service,
    );

    const user = await prisma.user.create({
      data: {
        email: 'estrategista@picplus.com',
        password: 'hash',
        name: 'Estrategista',
      },
    });
    userId = user.id;

    const client = await prisma.client.create({
      data: {
        corporateName: 'Clínica Sorriso Real Ltda',
        tradeName: 'Sorriso Real',
        cnpjCpf: '12345678000199',
        segment: 'Odontologia Estética',
        website: 'https://sorrisoreal.com.br',
      },
    });
    clientId = client.id;

    const project = await prisma.taskProject.create({
      data: {
        name: 'Campanha Lentes Q4',
        clientId,
        ownerId: userId,
        stages: {
          create: [{ name: 'A fazer', order: 0, isCompleted: false }],
        },
      },
      include: { stages: true },
    });
    projectId = project.id;

    const task = await prisma.task.create({
      data: {
        title: 'Reels sobre dor de sensibilidade em lentes',
        description: '<p>Focar em procedimento minimamente invasivo.</p>',
        projectId,
        stageId: project.stages[0].id,
        createdById: userId,
      },
    });
    taskId = task.id;
  });

  afterAll(async () => {
    await prisma?.$disconnect();
    await db?.close();
  });

  beforeEach(() => {
    generateContentMock.mockReset();
  });

  it('salva e consulta o Brand Profile e concorrentes do cliente', async () => {
    await service.upsertBrandProfile(clientId, {
      positioning: 'Clínica boutique referência em estética natural',
      targetAudience: 'Mulheres e homens de 28 a 50 anos classe A/B',
      painsAndDesires: 'Medo de ficar artificial ou ter desgaste excessivo',
      toneOfVoice: 'Elegante, acolhedor e técnico sem jargões',
      keywords: ['lentes de contato', 'sorriso natural'],
      forbiddenWords: ['barato', 'promoção relâmpago'],
    });

    const comp = await service.createCompetitor(clientId, {
      name: 'Odonto Prime',
      instagramHandle: '@odontoprime',
      strengths: 'Reels de antes e depois com alta retenção',
    });

    await service.updateCompetitor(clientId, comp.id, {
      weaknesses: 'Comunicação muito fria e impessoal',
    });

    const intel = await service.getIntelligence(clientId);
    expect(intel.brandProfile?.positioning).toContain('estética natural');
    expect(intel.brandProfile?.keywords).toEqual([
      'lentes de contato',
      'sorriso natural',
    ]);
    expect(intel.competitors).toHaveLength(1);
    expect(intel.competitors[0].weaknesses).toContain('fria');
  });

  it('gera rascunho de Brand Book estruturado com Gemini', async () => {
    generateContentMock.mockResolvedValueOnce({
      text: JSON.stringify({
        positioning: 'Estética dental de alta precisão',
        targetAudience: 'Executivos e profissionais liberais',
        painsAndDesires: 'Segurança e naturalidade',
        toneOfVoice: 'Confiante e humano',
        valueProposition: 'Planejamento digital 3D sem dor',
        productsAndOffers: 'Lentes de porcelana ultrafinas',
        ctaGuidelines: 'Agendar avaliação personalizada',
        keywords: ['porcelana', 'planejamento 3D'],
        forbiddenWords: ['milagre'],
        extraContext: 'Atendimento com hora marcada',
      }),
    });

    const res = await service.generateBrandDraft(
      clientId,
      { extraNotes: 'Foco em planejamento 3D', modelTier: 'pro' },
      userId,
    );

    expect(res.model).toBe('gemini-2.5-pro');
    expect(res.draft.valueProposition).toContain('3D');
    expect(generateContentMock).toHaveBeenCalledTimes(1);
  });

  it('gera copy na tarefa usando contexto do cliente e salva no histórico', async () => {
    generateContentMock.mockResolvedValueOnce({
      text: '## Gancho\n**Lentes naturais sem dor?**\n\n- Mostre o planejamento 3D\n- Quebre a objeção de desgaste',
    });

    const res = await service.generateTaskCopy(
      taskId,
      {
        format: 'REELS_SCRIPT',
        objective: 'Agendamentos pelo WhatsApp',
        variations: 1,
      },
      userId,
    );

    expect(res.html).toContain('<h2>Gancho</h2>');
    expect(res.html).toContain('<strong>Lentes naturais sem dor?</strong>');

    const promptSent = generateContentMock.mock.calls[0][0].contents[0].parts[0]
      .text as string;
    expect(promptSent).toContain('Sorriso Real');
    expect(promptSent).toContain('Odonto Prime');
    expect(promptSent).toContain('Reels sobre dor de sensibilidade em lentes');

    const history = await service.getTaskHistory(taskId);
    expect(history).toHaveLength(1);
    expect(history[0].kind).toBe('COPY');
  });

  it('executa assistente no nível do projeto e registra no histórico', async () => {
    generateContentMock.mockResolvedValueOnce({
      text: '### Pautas sugeridas\n- Mito vs Verdade sobre desgaste',
    });

    const res = await service.runProjectAssistant(
      projectId,
      { action: 'CONTENT_IDEAS', channel: 'Instagram Reels' },
      userId,
    );

    expect(res.html).toContain('<h3>Pautas sugeridas</h3>');
    const history = await service.getProjectHistory(projectId);
    expect(history.length).toBeGreaterThanOrEqual(2);
  });

  it('gera plano trimestral/mensal e publica entregas em lote no Kanban', async () => {
    generateContentMock.mockResolvedValueOnce({
      text: JSON.stringify({
        title: 'Plano Mensal Lentes Naturais',
        strategySummary:
          'Sequência semanal alternando autoridade, quebra de objeções e oferta.',
        pillars: ['Naturalidade', 'Prova Social', 'Quebra de Objeções'],
        items: [
          {
            scheduledDate: '2026-12-01',
            channel: 'Instagram Reels',
            format: 'REELS_SCRIPT',
            funnelStage: 'TOPO',
            pillar: 'Quebra de Objeções',
            title: 'Mito sobre desgaste dental',
            hook: 'Você acha que lente precisa desgastar o dente todo?',
            briefing: 'Vídeo curto com modelo 3D.',
            copyDraft: 'Mostre o antes e depois com planejamento digital.',
            cta: 'Comente LENTE para agendar avaliação',
            priority: 'HIGH',
          },
          {
            scheduledDate: '2026-12-04',
            channel: 'Carrossel Instagram',
            format: 'CAROUSEL',
            funnelStage: 'FUNDO',
            pillar: 'Prova Social',
            title: '3 sinais de que o planejamento 3D é para você',
            hook: 'O segredo de um sorriso natural',
            briefing: 'Carrossel de 6 slides.',
            copyDraft: 'Slide 1: O segredo...\nSlide 6: Agende pelo WhatsApp.',
            cta: 'Clique no link da bio',
            priority: 'MEDIUM',
          },
        ],
      }),
    });

    const { plan } = await planner.generatePlan(
      projectId,
      {
        scope: 'MONTHLY',
        objective: 'Gerar agendamentos pelo WhatsApp',
        startDate: '2026-12-01',
        endDate: '2026-12-30',
        channels: ['Instagram Reels', 'Carrossel Instagram'],
        itemCount: 4,
      },
      userId,
    );

    expect(plan.title).toBe('Plano Mensal Lentes Naturais');
    expect(plan.items).toHaveLength(2);
    expect(plan.status).toBe('DRAFT');

    await planner.updateItem(plan.items[0].id, {
      title: 'Mito vs Verdade sobre desgaste dental',
    });

    const published = await planner.publishPlan(
      plan.id,
      { assignedToId: userId },
      userId,
    );

    expect(published.createdCount).toBe(2);
    expect(published.plan.status).toBe('PUBLISHED');
    expect(published.tasks[0].title).toBe(
      'Mito vs Verdade sobre desgaste dental',
    );
    expect(published.tasks[0].dueDate?.toISOString().slice(0, 10)).toBe(
      '2026-12-01',
    );
    expect(published.tasks[0].description).toContain('Gancho (Hook)');

    const persistedTasks = await prisma.task.findMany({
      where: { projectId, deletedAt: null },
    });
    expect(persistedTasks.length).toBeGreaterThanOrEqual(3);
  });

  it('gera, itera, publica com domínio próprio, captura leads e exporta ZIP de Landing Page', async () => {
    generateContentMock.mockResolvedValueOnce({
      text: '```html\n<!DOCTYPE html><html><head><title>Sorriso</title></head><body><h1>Lentes Naturais</h1><form data-picplus-lead-form><input name="name"/><input name="email"/><p data-picplus-form-status></p><button type="submit">Enviar</button></form></body></html>\n```',
    });

    const { landingPage } = await landingPages.generate(
      {
        projectId,
        title: 'LP Lentes Naturais',
        objective: 'Captar pacientes para avaliação 3D',
        visualStyle: 'MODERN_DARK',
      },
      userId,
    );

    expect(landingPage.slug).toBe('lp-lentes-naturais');
    expect(landingPage.clientId).toBe(clientId);
    expect(landingPage.htmlContent).toContain('<!DOCTYPE html>');

    generateContentMock.mockResolvedValueOnce({
      text: '<!DOCTYPE html><html><head><title>Sorriso</title></head><body><h1>Lentes 3D sem dor</h1><form data-picplus-lead-form><input name="name"/><p data-picplus-form-status></p></form></body></html>',
    });

    const iterated = await landingPages.iterate(
      landingPage.id,
      { instruction: 'Trocar título para Lentes 3D sem dor' },
      userId,
    );
    expect(iterated.landingPage.htmlContent).toContain('Lentes 3D sem dor');

    await landingPages.update(landingPage.id, {
      status: 'PUBLISHED',
      customDomain: 'https://LP.SorrisoReal.com.br/',
    });

    const hostHtml = await landingPages.findPublishedForHostHtml(
      'www.lp.sorrisoreal.com.br',
    );
    expect(hostHtml).toContain('Lentes 3D sem dor');
    expect(hostHtml).toContain(
      '/api/public/landing-pages/lp-lentes-naturais/leads',
    );

    const leadRes = await landingPages.captureLead(landingPage.slug, {
      name: 'Maria Clara',
      email: 'maria@exemplo.com',
      utmSource: 'instagram',
    });
    expect(leadRes.ok).toBe(true);

    const refreshed = await landingPages.getOne(landingPage.id);
    expect(refreshed._count.leads).toBe(1);
    expect(refreshed.customDomain).toBe('lp.sorrisoreal.com.br');

    const zip = landingPages.exportZip(refreshed, 'https://api.picplus.com.br');
    expect(
      zip.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04])),
    ).toBe(true);
    expect(zip.toString('utf8')).toContain('index.html');
  });
});
