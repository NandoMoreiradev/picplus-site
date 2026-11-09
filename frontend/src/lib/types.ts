export interface Paginated<T> {
  items: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export type SocialNetwork = 'instagram' | 'tiktok' | 'youtube' | 'twitter' | 'twitch';
export interface SocialNetworkDetail {
  url: string;
  followers?: number;
}
export type SocialLinks = Partial<Record<SocialNetwork, SocialNetworkDetail | string>>;

export type InfluencerStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

/** Perfil exibido na vitrine pública (sem dados de contato). */
export interface ShowcaseInfluencer {
  id: string;
  name: string;
  niche: string | null;
  location: string | null;
  description: string | null;
  profileImage: string | null;
  coverImage: string | null;
  presentationPdf: string | null;
  socialNetworks: SocialLinks | null;
  totalFollowers?: number | null;
  impressions?: number | null;
}

export interface AdminInfluencer extends ShowcaseInfluencer {
  email: string;
  whatsapp: string | null;
  status: InfluencerStatus;
  showOnShowcase: boolean;
  rejectionReason: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InfluencerList extends Paginated<AdminInfluencer> {
  counts: Record<InfluencerStatus, number>;
}

export interface Service {
  id: string;
  name: string;
  slug: string;
  shortDescription: string | null;
  description: string;
  icon: string | null;
  pillar: string | null;
  features: string[];
  order: number;
  active: boolean;
}

export interface CaseMetric {
  label: string;
  value: string;
}

export interface SuccessCase {
  id: string;
  title: string;
  slug: string;
  clientName: string;
  segment: string | null;
  summary: string | null;
  description: string;
  coverImage: string | null;
  images: string[];
  /** Vídeo opcional: só uma das duas fontes vem preenchida (ou nenhuma). */
  youtubeId: string | null;
  videoFile: string | null;
  results: string | null;
  metrics: CaseMetric[] | null;
  featured: boolean;
  published: boolean;
  createdAt: string;
}

export interface ArticleSummary {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  coverImage: string | null;
  category: string | null;
  published: boolean;
  publishedAt: string | null;
  createdAt: string;
}

export interface Article extends ArticleSummary {
  content: string;
  author?: { name: string } | null;
}

export interface Brand {
  id: string;
  name: string;
  logo: string;
  /** Fundo do cartão do logo: "dark" para logos brancos. */
  background: 'light' | 'dark';
  website: string | null;
  order: number;
  active: boolean;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  bio: string | null;
  photo: string | null;
  instagram: string | null;
  linkedin: string | null;
  order: number;
  active: boolean;
}

export type ContactType = 'GENERAL' | 'BUDGET';
export type ContactStatus = 'NEW' | 'IN_PROGRESS' | 'DONE';

export interface ContactRequest {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  message: string;
  type: ContactType;
  status: ContactStatus;
  serviceInterest: string | null;
  budgetRange: string | null;
  createdAt: string;
}

export interface Testimonial {
  id: string;
  /** Pessoa que dá o depoimento. */
  clientName: string;
  role: string | null;
  company: string;
  /** Frase de destaque exibida no cartão. */
  quote: string;
  /** Fonte A: ID do vídeo no YouTube (o link é montado no site). */
  youtubeId: string | null;
  /** Fonte B: vídeo enviado pelo painel (URL do arquivo). Só uma das duas vem preenchida. */
  videoFile: string | null;
  photo: string | null;
  orientation: 'vertical' | 'horizontal';
  order: number;
  active: boolean;
}

export interface PublicStats {
  influencers: number;
  cases: number;
  brands: number;
}

export interface AdminStats {
  pendingInfluencers: number;
  onShowcase: number;
  newContacts: number;
  newBudgets: number;
  draftArticles: number;
  publishedArticles: number;
  cases: number;
  services: number;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  /** Proprietário: tem todas as permissões. */
  isOwner: boolean;
  role: { id: string; name: string } | null;
  /** Permissões efetivas, no formato "recurso.acao". */
  permissions: string[];
}

export interface PermissionDef {
  key: string;
  label: string;
}

export interface PermissionGroup {
  key: string;
  label: string;
  permissions: PermissionDef[];
}

export interface RoleItem {
  id: string;
  name: string;
  description: string | null;
  permissions: string[];
  createdAt: string;
  _count?: { users: number };
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  isOwner: boolean;
  active: boolean;
  createdAt: string;
  role: { id: string; name: string } | null;
}

export interface SiteSettings {
  ogImage: string | null;
  blogOgImage: string | null;
}

export type ClientStatus = 'PROSPECT' | 'ONBOARDING' | 'ACTIVE' | 'PAUSED' | 'CHURNED';
export type ContractType = 'RETAINER_FEE' | 'FIXED_SCOPE' | 'ON_DEMAND';
export type ChargeBillingType = 'BOLETO' | 'PIX' | 'CREDIT_CARD' | 'UNDEFINED';
export type ChargeStatus = 'PENDING' | 'RECEIVED' | 'CONFIRMED' | 'OVERDUE' | 'REFUNDED' | 'CANCELED';

export interface ClientContact {
  id: string;
  clientId: string;
  name: string;
  role: string | null;
  email: string;
  phone: string | null;
  whatsapp: string | null;
  isFinancial: boolean;
  isPrimary: boolean;
  createdAt: string;
}

export interface ClientCharge {
  id: string;
  clientId: string;
  description: string;
  valueCents: number;
  dueDate: string;
  billingType: ChargeBillingType;
  status: ChargeStatus;
  asaasPaymentId: string | null;
  invoiceUrl: string | null;
  bankSlipUrl: string | null;
  pixQrCodeUrl: string | null;
  pixPayload: string | null;
  nfeId: string | null;
  nfeStatus: string | null;
  nfeNumber: string | null;
  nfePdfUrl: string | null;
  nfeXmlUrl: string | null;
  asaasSubscriptionId: string | null;
  installmentCount: number | null;
  installmentNumber: number | null;
  paidAt: string | null;
  createdAt: string;
}

export interface ClientNote {
  id: string;
  clientId: string;
  content: string;
  author?: { id: string; name: string; avatarUrl: string | null } | null;
  createdAt: string;
}

export interface ClientSummary {
  id: string;
  corporateName: string;
  tradeName: string;
  cnpjCpf: string;
  segment: string | null;
  website: string | null;
  status: ClientStatus;
  contractType: ContractType;
  monthlyFeeCents: number | null;
  dueDay: number | null;
  asaasCustomerId: string | null;
  accountManager?: { id: string; name: string; email: string; avatarUrl: string | null } | null;
  _count?: {
    contacts: number;
    projects: number;
    charges: number;
  };
  createdAt: string;
}

export interface ClientDetail extends ClientSummary {
  stateRegistration: string | null;
  postalCode: string | null;
  address: string | null;
  addressNumber: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  contractStart: string | null;
  contractEnd: string | null;
  contacts: ClientContact[];
  projects: Array<{
    id: string;
    name: string;
    color: string;
    status: string;
    _count?: { tasks: number };
  }>;
  charges: ClientCharge[];
  notes: ClientNote[];
}

export interface ClientStats {
  activeClients: number;
  prospectClients: number;
  totalMrrCents: number;
  pendingTotalCents: number;
  overdueTotalCents: number;
}
