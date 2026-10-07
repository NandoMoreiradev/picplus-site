export interface Paginated<T> {
  items: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export type SocialNetwork = 'instagram' | 'tiktok' | 'youtube' | 'twitter' | 'twitch';
export type SocialLinks = Partial<Record<SocialNetwork, string>>;

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
  isOwner: boolean;
  active: boolean;
  createdAt: string;
  role: { id: string; name: string } | null;
}
