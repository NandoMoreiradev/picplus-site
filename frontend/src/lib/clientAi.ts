import { API_URL, api, tokenStore } from './api';
import type { Task, TaskPriority } from './tasks';

export type CopyFormat =
  | 'INSTAGRAM_POST'
  | 'REELS_SCRIPT'
  | 'CAROUSEL'
  | 'BLOG_ARTICLE'
  | 'SALES_EMAIL'
  | 'AD_COPY'
  | 'TASK_BRIEFING'
  | 'CUSTOM';

export type ProjectAssistantAction =
  | 'CONTENT_IDEAS'
  | 'CAMPAIGN_BRIEF'
  | 'COPY_VARIATIONS'
  | 'CUSTOM';

export type AiModelTier = 'fast' | 'pro';

export interface ClientBrandProfile {
  id: string;
  clientId: string;
  positioning: string | null;
  targetAudience: string | null;
  painsAndDesires: string | null;
  toneOfVoice: string | null;
  valueProposition: string | null;
  productsAndOffers: string | null;
  ctaGuidelines: string | null;
  keywords: string[];
  forbiddenWords: string[];
  extraContext: string | null;
  updatedAt: string;
}

export interface BrandProfilePayload {
  positioning?: string;
  targetAudience?: string;
  painsAndDesires?: string;
  toneOfVoice?: string;
  valueProposition?: string;
  productsAndOffers?: string;
  ctaGuidelines?: string;
  keywords?: string[];
  forbiddenWords?: string[];
  extraContext?: string;
}

export interface ClientCompetitor {
  id: string;
  clientId: string;
  name: string;
  websiteUrl: string | null;
  instagramHandle: string | null;
  tiktokHandle: string | null;
  youtubeHandle: string | null;
  notes: string | null;
  strengths: string | null;
  weaknesses: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CompetitorPayload {
  name: string;
  websiteUrl?: string;
  instagramHandle?: string;
  tiktokHandle?: string;
  youtubeHandle?: string;
  notes?: string;
  strengths?: string;
  weaknesses?: string;
}

export interface AiGenerationLog {
  id: string;
  clientId: string | null;
  projectId: string | null;
  taskId: string | null;
  kind: string;
  model: string;
  title: string | null;
  output: string;
  createdAt: string;
  user?: { id: string; name: string } | null;
  project?: { id: string; name: string } | null;
  task?: { id: string; title: string } | null;
}

export interface ClientIntelligenceData {
  client: {
    id: string;
    tradeName: string;
    corporateName: string;
    segment: string | null;
    website: string | null;
  };
  brandProfile: ClientBrandProfile | null;
  competitors: ClientCompetitor[];
  logs: AiGenerationLog[];
}

export interface AiCopyGenerationResult {
  markdown: string;
  html: string;
  model: string;
  log: AiGenerationLog;
}

export const COPY_FORMAT_OPTIONS: { value: CopyFormat; label: string }[] = [
  { value: 'INSTAGRAM_POST', label: 'Post / Legenda para Instagram' },
  { value: 'REELS_SCRIPT', label: 'Roteiro de Reels / Vídeo Curto' },
  { value: 'CAROUSEL', label: 'Carrossel (Slide a Slide)' },
  { value: 'BLOG_ARTICLE', label: 'Artigo de Blog (SEO)' },
  { value: 'SALES_EMAIL', label: 'E-mail de Vendas / Nutrição' },
  { value: 'AD_COPY', label: 'Copy de Anúncio (Meta / Google)' },
  { value: 'TASK_BRIEFING', label: 'Briefing Operacional da Tarefa' },
  { value: 'CUSTOM', label: 'Personalizado' },
];

export const PROJECT_ASSISTANT_OPTIONS: {
  value: ProjectAssistantAction;
  label: string;
}[] = [
  { value: 'CONTENT_IDEAS', label: 'Ideias de Pautas & Conteúdo' },
  { value: 'CAMPAIGN_BRIEF', label: 'Briefing Estratégico do Projeto' },
  { value: 'COPY_VARIATIONS', label: 'Ângulos e Variações de Copy' },
  { value: 'CUSTOM', label: 'Solicitação Personalizada' },
];

export const MODEL_TIER_OPTIONS: { value: AiModelTier; label: string }[] = [
  { value: 'fast', label: 'Padrão do Painel (Rápido / Flash)' },
  { value: 'pro', label: 'Estratégico (Gemini 4 Argon)' },
];

export const fetchClientIntelligence = (clientId: string) =>
  api.get<ClientIntelligenceData>(`/admin/ai-studio/clients/${clientId}`);

export const saveClientBrandProfile = (
  clientId: string,
  payload: BrandProfilePayload,
) =>
  api.put<ClientBrandProfile>(
    `/admin/ai-studio/clients/${clientId}/profile`,
    payload,
  );

export const generateClientBrandDraft = (
  clientId: string,
  payload: { extraNotes?: string; modelTier?: AiModelTier },
) =>
  api.post<{ draft: Required<BrandProfilePayload>; model: string }>(
    `/admin/ai-studio/clients/${clientId}/profile/draft`,
    payload,
  );

export const createClientCompetitor = (
  clientId: string,
  payload: CompetitorPayload,
) =>
  api.post<ClientCompetitor>(
    `/admin/ai-studio/clients/${clientId}/competitors`,
    payload,
  );

export const updateClientCompetitor = (
  clientId: string,
  competitorId: string,
  payload: Partial<CompetitorPayload>,
) =>
  api.patch<ClientCompetitor>(
    `/admin/ai-studio/clients/${clientId}/competitors/${competitorId}`,
    payload,
  );

export const deleteClientCompetitor = (
  clientId: string,
  competitorId: string,
) =>
  api.delete<{ deleted: boolean }>(
    `/admin/ai-studio/clients/${clientId}/competitors/${competitorId}`,
  );

export const fetchTaskAiHistory = (taskId: string) =>
  api.get<AiGenerationLog[]>(`/admin/ai-studio/tasks/${taskId}/history`);

export const generateTaskAiCopy = (
  taskId: string,
  payload: {
    format: CopyFormat;
    objective?: string;
    extraInstructions?: string;
    variations?: number;
    modelTier?: AiModelTier;
  },
) =>
  api.post<AiCopyGenerationResult>(
    `/admin/ai-studio/tasks/${taskId}/generate`,
    payload,
  );

export const fetchProjectAiHistory = (projectId: string) =>
  api.get<AiGenerationLog[]>(`/admin/ai-studio/projects/${projectId}/history`);

export const runProjectAiAssistant = (
  projectId: string,
  payload: {
    action: ProjectAssistantAction;
    prompt?: string;
    channel?: string;
    modelTier?: AiModelTier;
  },
) =>
  api.post<AiCopyGenerationResult>(
    `/admin/ai-studio/projects/${projectId}/assistant`,
    payload,
  );

export function markdownPreviewToHtml(markdown: string): string {
  const escaped = markdown
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return `<p>${escaped.replace(/\n\n+/g, '</p><p>').replace(/\n/g, '<br/>')}</p>`;
}

/* ── Planejador de Campanhas (Fase 2) ────────────────── */

export type CampaignPlanScope =
  | 'MONTHLY'
  | 'QUARTERLY'
  | 'SALES_CAMPAIGN'
  | 'CUSTOM';

export type CampaignPlanStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export interface CampaignPlanSummary {
  id: string;
  title: string;
  scope: CampaignPlanScope;
  status: CampaignPlanStatus;
  objective: string | null;
  channels: string[];
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  createdBy?: { id: string; name: string } | null;
  _count: { items: number };
  items: { id: string; taskId: string | null }[];
}

export interface CampaignPlanItem {
  id: string;
  planId: string;
  order: number;
  scheduledDate: string | null;
  channel: string;
  format: string | null;
  funnelStage: string | null;
  pillar: string | null;
  title: string;
  hook: string | null;
  briefing: string | null;
  copyDraft: string | null;
  cta: string | null;
  priority: TaskPriority;
  taskId: string | null;
  task?: {
    id: string;
    title: string;
    completedAt: string | null;
    stage: { id: string; name: string; color: string };
  } | null;
}

export interface CampaignPlanDetail {
  id: string;
  title: string;
  scope: CampaignPlanScope;
  status: CampaignPlanStatus;
  objective: string | null;
  strategySummary: string | null;
  pillars: string[];
  channels: string[];
  startDate: string | null;
  endDate: string | null;
  projectId: string;
  clientId: string | null;
  client?: { id: string; tradeName: string } | null;
  createdBy?: { id: string; name: string } | null;
  items: CampaignPlanItem[];
  createdAt: string;
}

export const PLAN_SCOPE_OPTIONS: {
  value: CampaignPlanScope;
  label: string;
  defaultDays: number;
  defaultCount: number;
}[] = [
  {
    value: 'MONTHLY',
    label: 'Planejamento Mensal (30 dias)',
    defaultDays: 30,
    defaultCount: 12,
  },
  {
    value: 'QUARTERLY',
    label: 'Planejamento Trimestral (90 dias)',
    defaultDays: 90,
    defaultCount: 24,
  },
  {
    value: 'SALES_CAMPAIGN',
    label: 'Campanha de Vendas / Lançamento',
    defaultDays: 14,
    defaultCount: 10,
  },
  {
    value: 'CUSTOM',
    label: 'Personalizado',
    defaultDays: 30,
    defaultCount: 10,
  },
];

export const DEFAULT_PLAN_CHANNELS = [
  'Instagram Reels',
  'Carrossel Instagram',
  'Post Estático',
  'Stories',
  'Blog SEO',
  'E-mail Marketing',
  'Anúncios Meta/Google',
];

export const generateCampaignPlan = (
  projectId: string,
  payload: {
    scope: CampaignPlanScope;
    title?: string;
    objective: string;
    startDate: string;
    endDate?: string;
    channels: string[];
    itemCount?: number;
    extraInstructions?: string;
    modelTier?: AiModelTier;
  },
) =>
  api.post<{ plan: CampaignPlanDetail; model: string }>(
    `/admin/ai-studio/planner/projects/${projectId}/generate`,
    payload,
  );

export const updateCampaignPlanItem = (
  itemId: string,
  payload: Partial<{
    scheduledDate: string | null;
    channel: string;
    funnelStage: string | null;
    pillar: string | null;
    title: string;
    hook: string | null;
    briefing: string | null;
    copyDraft: string | null;
    cta: string | null;
    priority: TaskPriority;
  }>,
) =>
  api.patch<CampaignPlanItem>(
    `/admin/ai-studio/planner/items/${itemId}`,
    payload,
  );

export const deleteCampaignPlanItem = (itemId: string) =>
  api.delete<{ deleted: boolean }>(`/admin/ai-studio/planner/items/${itemId}`);

export const deleteCampaignPlan = (planId: string) =>
  api.delete<{ deleted: boolean }>(`/admin/ai-studio/planner/${planId}`);

export const publishCampaignPlan = (
  planId: string,
  payload: {
    stageId?: string;
    assignedToId?: string | null;
    itemIds?: string[];
  },
) =>
  api.post<{
    createdCount: number;
    tasks: Task[];
    plan: CampaignPlanDetail;
  }>(`/admin/ai-studio/planner/${planId}/publish`, payload);

/* ── Landing Pages (Fase 3) ──────────────────────────── */

export type LandingPageStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type LpVisualStyle =
  | 'MODERN_DARK'
  | 'EDITORIAL_LIGHT'
  | 'CORPORATE_CLEAN'
  | 'HIGH_CONVERSION';

export interface LandingPageLead {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  message: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  createdAt: string;
}

export interface LandingPageSummary {
  id: string;
  title: string;
  slug: string;
  status: LandingPageStatus;
  visualStyle: string | null;
  customDomain: string | null;
  domainVerified: boolean;
  viewsCount: number;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  clientId: string | null;
  projectId: string | null;
  client?: { id: string; tradeName: string } | null;
  project?: { id: string; name: string } | null;
  _count: { leads: number };
}

export interface LandingPageDetail extends LandingPageSummary {
  objective: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  htmlContent: string;
  domainVerificationError: string | null;
  leads: LandingPageLead[];
}

export const LP_VISUAL_STYLE_OPTIONS: { value: LpVisualStyle; label: string }[] = [
  { value: 'MODERN_DARK', label: 'Moderno Escuro (Alto Contraste)' },
  { value: 'EDITORIAL_LIGHT', label: 'Editorial Claro & Sofisticado' },
  { value: 'CORPORATE_CLEAN', label: 'Corporativo Clean' },
  { value: 'HIGH_CONVERSION', label: 'Foco em Conversão Direta' },
];

export const landingPagePublicUrl = (slug: string) => `${API_URL}/lp/${slug}`;

export const generateLandingPage = (payload: {
  clientId?: string | null;
  projectId?: string | null;
  title?: string;
  objective: string;
  offer?: string;
  ctaText?: string;
  visualStyle?: LpVisualStyle;
  extraInstructions?: string;
  modelTier?: AiModelTier;
}) =>
  api.post<{ landingPage: LandingPageDetail; model: string }>(
    '/admin/ai-studio/landing-pages/generate',
    payload,
  );

export const iterateLandingPage = (
  id: string,
  payload: { instruction: string; modelTier?: AiModelTier },
) =>
  api.post<{ landingPage: LandingPageDetail; model: string }>(
    `/admin/ai-studio/landing-pages/${id}/iterate`,
    payload,
  );

export const updateLandingPage = (
  id: string,
  payload: Partial<{
    title: string;
    slug: string;
    status: LandingPageStatus;
    metaTitle: string | null;
    metaDescription: string | null;
    htmlContent: string;
    customDomain: string | null;
  }>,
) =>
  api.patch<LandingPageDetail>(
    `/admin/ai-studio/landing-pages/${id}`,
    payload,
  );

export const verifyLandingPageDomain = (id: string) =>
  api.post<{
    verified: boolean;
    customDomain: string;
    expectedTarget: string;
    resolvedRecords: string[];
    errorMessage: string | null;
  }>(`/admin/ai-studio/landing-pages/${id}/verify-domain`);

export const deleteLandingPage = (id: string) =>
  api.delete<{ deleted: boolean }>(`/admin/ai-studio/landing-pages/${id}`);

export async function downloadLandingPageZip(id: string, slug: string) {
  const token = tokenStore.get();
  const res = await fetch(
    `${API_URL}/api/admin/ai-studio/landing-pages/${id}/export`,
    {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    },
  );
  if (!res.ok) {
    throw new Error('Não foi possível exportar o pacote ZIP.');
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `landing-${slug}.zip`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

/* ── Pesquisa de Concorrentes, Virais & Extensão (Fase 4) ── */

export type ReferencePlatform =
  | 'INSTAGRAM'
  | 'TIKTOK'
  | 'YOUTUBE'
  | 'WEB'
  | 'OTHER';

export type ResearchReportKind =
  | 'COMPETITOR_AUDIT'
  | 'VIRAL_TRENDS'
  | 'COPY_MINING'
  | 'WEBSITE_ANALYSIS';

export interface CompetitorReference {
  id: string;
  clientId: string;
  competitorId: string | null;
  platform: ReferencePlatform;
  sourceUrl: string | null;
  authorHandle: string | null;
  title: string | null;
  caption: string | null;
  metrics: Record<string, unknown> | null;
  mediaUrls: string[];
  mediaTypes: string[];
  aiAnalysis: string | null;
  extractedHooks: string[];
  adaptedAngles: string | null;
  isViral: boolean;
  tags: string[];
  createdAt: string;
  competitor?: { id: string; name: string } | null;
  createdBy?: { id: string; name: string } | null;
}

export interface ResearchReport {
  id: string;
  clientId: string;
  projectId: string | null;
  kind: ResearchReportKind;
  topic: string;
  model: string;
  summary: string;
  rawMarkdown: string;
  sources: Array<{ title?: string; url: string }> | null;
  createdAt: string;
  createdBy?: { id: string; name: string } | null;
  project?: { id: string; name: string } | null;
}

export interface ExtensionApiToken {
  id: string;
  name: string;
  prefix: string;
  lastUsedAt: string | null;
  createdAt: string;
}

export interface ClientResearchData {
  references: CompetitorReference[];
  reports: ResearchReport[];
}

export const REFERENCE_PLATFORM_OPTIONS: {
  value: ReferencePlatform;
  label: string;
}[] = [
  { value: 'INSTAGRAM', label: 'Instagram' },
  { value: 'TIKTOK', label: 'TikTok' },
  { value: 'YOUTUBE', label: 'YouTube' },
  { value: 'WEB', label: 'Site / Página Web' },
  { value: 'OTHER', label: 'Outro' },
];

export const RESEARCH_KIND_OPTIONS: {
  value: ResearchReportKind;
  label: string;
}[] = [
  { value: 'VIRAL_TRENDS', label: 'Radar de Virais & Trends do Público-Alvo' },
  { value: 'COMPETITOR_AUDIT', label: 'Auditoria Profunda de Concorrentes' },
  { value: 'COPY_MINING', label: 'Mineração de Copys & Ganchos que Convertem' },
  { value: 'WEBSITE_ANALYSIS', label: 'Análise de Site / Página Concorrente' },
];

export const ingestReferenceForm = (clientId: string, form: FormData) =>
  api.postForm<CompetitorReference>(
    `/admin/ai-studio/research/clients/${clientId}/references`,
    form,
  );

export const toggleReferenceViral = (id: string, isViral: boolean) =>
  api.patch<CompetitorReference>(
    `/admin/ai-studio/research/references/${id}/viral`,
    { isViral },
  );

export const reanalyzeReference = (id: string, modelTier: AiModelTier = 'pro') =>
  api.post<CompetitorReference>(
    `/admin/ai-studio/research/references/${id}/reanalyze`,
    { modelTier },
  );

export const deleteReference = (id: string) =>
  api.delete<{ deleted: boolean }>(
    `/admin/ai-studio/research/references/${id}`,
  );

export const runClientResearch = (
  clientId: string,
  payload: {
    kind: ResearchReportKind;
    topic: string;
    targetUrl?: string;
    projectId?: string;
    useWebSearch?: boolean;
    modelTier?: AiModelTier;
  },
) =>
  api.post<ResearchReport>(
    `/admin/ai-studio/research/clients/${clientId}/reports`,
    payload,
  );

export const deleteResearchReport = (id: string) =>
  api.delete<{ deleted: boolean }>(`/admin/ai-studio/research/reports/${id}`);

export const createExtensionToken = (name: string) =>
  api.post<{ token: ExtensionApiToken; rawToken: string }>(
    '/admin/ai-studio/research/extension-tokens',
    { name },
  );

export const revokeExtensionToken = (id: string) =>
  api.delete<{ revoked: boolean }>(
    `/admin/ai-studio/research/extension-tokens/${id}`,
  );
