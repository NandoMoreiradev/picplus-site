import {
  Briefcase,
  Building2,
  Bot,
  GraduationCap,
  Inbox,
  MessageSquare,
  ClipboardList,
  Mail,
  Settings as SettingsIcon,
  LayoutDashboard,
  Newspaper,
  Quote,
  ShieldCheck,
  Sparkles,
  Trophy,
  UserCog,
  UserSquare2,
  Users,
} from 'lucide-react';

export interface NavItemDef {
  to: string;
  label: string;
  icon: typeof Users;
  /** Permissão necessária para ver o item (sem ela, o item some do menu). */
  perm?: string;
  end?: boolean;
  badge?: 'pendingInfluencers' | 'inbox';
  /** Módulo ainda não implementado: aparece no menu, sem link. */
  soon?: boolean;
}

export interface NavGroupDef {
  key: string;
  label: string;
  items: NavItemDef[];
}

/** Itens soltos no topo do menu. */
export const NAV_TOP: NavItemDef[] = [{ to: '/admin', label: 'Visão geral', icon: LayoutDashboard, perm: 'dashboard.view', end: true }];

/**
 * Grupos recolhíveis do menu. Para um módulo novo (ex.: tarefas), acrescente um item a um
 * grupo existente ou um grupo novo aqui, e proteja a rota com a permissão correspondente.
 */
export const NAV_GROUPS: NavGroupDef[] = [
  {
    key: 'relacionamento',
    label: 'Relacionamento',
    items: [
      { to: '/admin/clientes', label: 'Clientes (CRM)', icon: Briefcase, perm: 'clients.view' },
      { to: '/admin/whatsapp', label: 'WhatsApp & Atendimento', icon: MessageSquare, perm: 'whatsapp.view' },
      { to: '/admin/influenciadores', label: 'Influenciadores', icon: Users, perm: 'influencers.view', badge: 'pendingInfluencers' },
      { to: '/admin/contatos', label: 'Contatos e orçamentos', icon: Inbox, perm: 'contacts.view', badge: 'inbox' },
    ],
  },
  {
    key: 'gestao',
    label: 'Gestão',
    items: [
      { to: '/admin/tarefas', label: 'Gestão de Tarefas', icon: ClipboardList, perm: 'tasks.view' },
      { to: '/admin/academy', label: 'PicPlus Academy', icon: GraduationCap, perm: 'academy.view' },
    ],
  },
  {
    key: 'conteudo',
    label: 'Conteúdo do site',
    items: [
      { to: '/admin/blog', label: 'Blog', icon: Newspaper, perm: 'articles.view' },
      { to: '/admin/cases', label: 'Cases de sucesso', icon: Trophy, perm: 'cases.view' },
      { to: '/admin/depoimentos', label: 'Depoimentos', icon: Quote, perm: 'testimonials.view' },
      { to: '/admin/servicos', label: 'Serviços', icon: Sparkles, perm: 'services.view' },
      { to: '/admin/marcas', label: 'Marcas parceiras', icon: Building2, perm: 'brands.view' },
      { to: '/admin/equipe', label: 'Equipe do site', icon: UserSquare2, perm: 'team.view' },
    ],
  },
  {
    key: 'administracao',
    label: 'Administração',
    items: [
      { to: '/admin/usuarios', label: 'Usuários', icon: UserCog, perm: 'users.view' },
      { to: '/admin/cargos', label: 'Cargos e permissões', icon: ShieldCheck, perm: 'roles.view' },
      { to: '/admin/templates-email', label: 'Templates de e-mail', icon: Mail, perm: 'email_templates.view' },
      { to: '/admin/configuracoes', label: 'Configurações do site', icon: SettingsIcon, perm: 'settings.view' },
      { to: '/admin/whatsapp/configuracoes', label: 'WhatsApp & IA (Cloe)', icon: Bot, perm: 'whatsapp.manage' },
    ],
  },
];

/**
 * Para onde mandar quem não tem acesso à página inicial (ou nenhum cargo útil):
 * a primeira página do menu que a pessoa pode abrir. "Minha conta" não exige permissão.
 */
export function firstAllowedAdminPath(can: (permission: string) => boolean): string {
  const items = [...NAV_TOP, ...NAV_GROUPS.flatMap((group) => group.items)];
  const first = items.find((item) => !item.soon && (!item.perm || can(item.perm)));
  return first?.to ?? '/admin/conta';
}
