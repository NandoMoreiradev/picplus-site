import { useEffect, useState } from 'react';
import { Navigate, NavLink, Outlet, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import {
  Building2,
  ExternalLink,
  Inbox,
  ChevronDown,
  ClipboardList,
  KeyRound,
  Settings as SettingsIcon,
  LayoutDashboard,
  LogOut,
  Menu,
  Newspaper,
  Quote,
  ShieldCheck,
  Sparkles,
  Trophy,
  UserCog,
  UserSquare2,
  Users,
  X,
} from 'lucide-react';
import { Logo } from '../../components/layout/Logo';
import { PageLoader } from '../../components/ui/Feedback';
import { ToastProvider } from '../../components/ui/Toast';
import { useAuth } from '../../context/auth-context';
import { useFetch } from '../../hooks/useFetch';
import type { AdminStats } from '../../lib/types';

const SIDEBAR_WIDTH = '264px';

const Shell = styled.div`
  display: flex;
  min-height: 100vh;
`;

const Sidebar = styled.aside<{ $open: boolean }>`
  position: fixed;
  inset: 0 auto 0 0;
  z-index: 200;
  width: ${SIDEBAR_WIDTH};
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1.5rem 1rem;
  background: ${({ theme }) => theme.colors.surface};
  border-right: 1px solid ${({ theme }) => theme.colors.border};
  overflow-y: auto;
  transition: transform ${({ theme }) => theme.transitions.default};

  @media (max-width: ${({ theme }) => theme.breakpoints.laptop}) {
    transform: translateX(${({ $open }) => ($open ? '0' : '-100%')});
    box-shadow: ${({ $open, theme }) => ($open ? theme.shadows.overlay : 'none')};
  }
`;

const Brand = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 0.5rem;

  small {
    display: block;
    margin-top: 0.25rem;
    color: ${({ theme }) => theme.colors.textMuted};
    font-size: 0.72rem;
    font-weight: 800;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }
`;

const Nav = styled.nav`
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  flex: 1;

  .top {
    margin-bottom: 0.25rem;
  }
`;

const GroupToggle = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  margin-top: 0.9rem;
  padding: 0.35rem 0.75rem;
  border-radius: ${({ theme }) => theme.radii.md};
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  text-align: left;

  &:hover {
    color: ${({ theme }) => theme.colors.text};
  }
  .chevron {
    margin-left: auto;
    transition: transform ${({ theme }) => theme.transitions.fast};
  }
  &[aria-expanded='false'] .chevron {
    transform: rotate(-90deg);
  }
  .badge {
    min-width: 18px;
    padding: 0 0.35rem;
    border-radius: 999px;
    background: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.textDark};
    font-size: 0.68rem;
    line-height: 18px;
    text-align: center;
  }
`;

const SoonItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.7rem 0.75rem;
  color: ${({ theme }) => theme.colors.textMuted};
  font-weight: 700;
  font-size: 0.95rem;
  cursor: not-allowed;
  opacity: 0.6;

  .soon {
    margin-left: auto;
    font-size: 0.68rem;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }
`;

const GroupItems = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
`;

const Item = styled(NavLink)`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.7rem 0.75rem;
  border-radius: ${({ theme }) => theme.radii.md};
  color: ${({ theme }) => theme.colors.textSecondary};
  font-weight: 700;
  font-size: 0.95rem;
  transition: all ${({ theme }) => theme.transitions.fast};

  &:hover {
    background: ${({ theme }) => theme.colors.surfaceHover};
    color: ${({ theme }) => theme.colors.text};
  }
  &.active {
    background: ${({ theme }) => theme.colors.primarySoft};
    color: ${({ theme }) => theme.colors.primary};
  }
  .badge {
    margin-left: auto;
    min-width: 22px;
    padding: 0 0.4rem;
    border-radius: 999px;
    background: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.textDark};
    font-size: 0.75rem;
    line-height: 22px;
    text-align: center;
  }
`;

const Footer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding-top: 1rem;
  border-top: 1px solid ${({ theme }) => theme.colors.border};

  .user {
    padding: 0 0.75rem;
    font-size: 0.85rem;
    color: ${({ theme }) => theme.colors.textSecondary};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .user strong {
    display: block;
    color: ${({ theme }) => theme.colors.text};
  }
  a.ext,
  button.logout {
    display: flex;
    align-items: center;
    gap: 0.7rem;
    width: 100%;
    padding: 0.6rem 0.75rem;
    border-radius: ${({ theme }) => theme.radii.md};
    color: ${({ theme }) => theme.colors.textSecondary};
    font-weight: 700;
    font-size: 0.9rem;
    text-align: left;
  }
  a.ext:hover,
  button.logout:hover {
    background: ${({ theme }) => theme.colors.surfaceHover};
    color: ${({ theme }) => theme.colors.text};
  }
`;

const Main = styled.div`
  flex: 1;
  min-width: 0;
  margin-left: ${SIDEBAR_WIDTH};

  @media (max-width: ${({ theme }) => theme.breakpoints.laptop}) {
    margin-left: 0;
  }
`;

const TopBar = styled.header`
  display: none;
  align-items: center;
  gap: 1rem;
  position: sticky;
  top: 0;
  z-index: 150;
  height: 64px;
  padding: 0 1rem;
  background: rgba(10, 10, 10, 0.9);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};

  button {
    display: grid;
    place-items: center;
    width: 40px;
    height: 40px;
    border-radius: ${({ theme }) => theme.radii.md};
    border: 1px solid ${({ theme }) => theme.colors.border};
  }

  @media (max-width: ${({ theme }) => theme.breakpoints.laptop}) {
    display: flex;
  }
`;

const Content = styled.main`
  max-width: 1280px;
  margin: 0 auto;
  padding: 2.25rem 2rem 4rem;

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    padding: 1.5rem 1rem 3rem;
  }
`;

const Scrim = styled.div`
  position: fixed;
  inset: 0;
  z-index: 190;
  background: ${({ theme }) => theme.colors.overlay};
`;

interface NavItemDef {
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

interface NavGroupDef {
  key: string;
  label: string;
  items: NavItemDef[];
}

/** Itens soltos no topo do menu (sempre visíveis). */
const NAV_TOP: NavItemDef[] = [{ to: '/admin', label: 'Visão geral', icon: LayoutDashboard, end: true }];

/**
 * Grupos recolhíveis do menu. Para um módulo novo (ex.: tarefas), acrescente um item a um
 * grupo existente ou um grupo novo aqui, e proteja a rota com a permissão correspondente.
 */
const NAV_GROUPS: NavGroupDef[] = [
  {
    key: 'relacionamento',
    label: 'Relacionamento',
    items: [
      { to: '/admin/influenciadores', label: 'Influenciadores', icon: Users, perm: 'influencers.view', badge: 'pendingInfluencers' },
      { to: '/admin/contatos', label: 'Contatos e orçamentos', icon: Inbox, perm: 'contacts.view', badge: 'inbox' },
    ],
  },
  {
    key: 'gestao',
    label: 'Gestão',
    items: [{ to: '/admin/tarefas', label: 'Gestão de Tarefas', icon: ClipboardList, soon: true }],
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
      { to: '/admin/configuracoes', label: 'Configurações do site', icon: SettingsIcon, perm: 'settings.view' },
    ],
  },
];

const NAV_STATE_KEY = 'picplus_admin_nav_closed';

function readClosedGroups(): string[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(NAV_STATE_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

const isActivePath = (pathname: string, to: string) => pathname === to || pathname.startsWith(`${to}/`);

export function AdminLayout() {
  const { user, loading, logout, can } = useAuth();
  const location = useLocation();
  // O menu mobile pertence à rota em que foi aberto: ao navegar, fecha sozinho.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === location.pathname;
  const setOpen = (value: boolean) => setOpenOn(value ? location.pathname : null);
  // Grupos recolhidos pelo usuário (lembrados no navegador). O grupo da página atual abre sozinho.
  const [closed, setClosed] = useState<string[]>(readClosedGroups);
  const toggleGroup = (key: string) =>
    setClosed((previous) => {
      const next = previous.includes(key) ? previous.filter((k) => k !== key) : [...previous, key];
      try {
        localStorage.setItem(NAV_STATE_KEY, JSON.stringify(next));
      } catch {
        /* storage indisponível */
      }
      return next;
    });
  // Os contadores do menu são recarregados a cada navegação.
  const stats = useFetch<AdminStats>(user ? '/admin/stats' : null, undefined, location.pathname);

  // Painel administrativo não deve ser indexado.
  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex, nofollow';
    document.head.appendChild(meta);
    document.title = 'Painel | PicPlus';
    return () => meta.remove();
  }, []);

  if (loading) return <PageLoader label="Verificando sessão…" />;
  if (!user) return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;

  const badgeFor = (key?: string) => {
    if (!stats.data) return 0;
    if (key === 'pendingInfluencers') return stats.data.pendingInfluencers;
    if (key === 'inbox') return stats.data.newContacts + stats.data.newBudgets;
    return 0;
  };

  const renderItem = (entry: NavItemDef) => {
    const Icon = entry.icon;
    if (entry.soon) {
      return (
        <SoonItem key={entry.to} aria-disabled="true">
          <Icon size={19} aria-hidden />
          {entry.label}
          <span className="soon">Em breve</span>
        </SoonItem>
      );
    }
    const badge = badgeFor(entry.badge);
    return (
      <Item key={entry.to} to={entry.to} end={entry.end ?? false}>
        <Icon size={19} aria-hidden />
        {entry.label}
        {badge > 0 && <span className="badge">{badge}</span>}
      </Item>
    );
  };

  return (
    <ToastProvider>
      <Shell>
        {open && <Scrim onClick={() => setOpen(false)} />}
        <Sidebar $open={open} aria-label="Menu do painel">
          <Brand>
            <div>
              <Logo to="/admin" size="1.6rem" label="Painel PicPlus" />
              <small>Painel</small>
            </div>
          </Brand>

          <Nav>
            {NAV_TOP.map(renderItem)}
            {NAV_GROUPS.map((group) => {
              const items = group.items.filter((item) => !item.perm || can(item.perm));
              if (items.length === 0) return null;
              const hasActive = items.some((item) => isActivePath(location.pathname, item.to));
              const expanded = hasActive || !closed.includes(group.key);
              const pending = items.reduce((sum, item) => sum + badgeFor(item.badge), 0);
              return (
                <div key={group.key}>
                  <GroupToggle
                    type="button"
                    aria-expanded={expanded}
                    aria-controls={`nav-${group.key}`}
                    onClick={() => !hasActive && toggleGroup(group.key)}
                  >
                    {group.label}
                    {!expanded && pending > 0 && <span className="badge">{pending}</span>}
                    <ChevronDown className="chevron" size={14} aria-hidden />
                  </GroupToggle>
                  {expanded && <GroupItems id={`nav-${group.key}`}>{items.map(renderItem)}</GroupItems>}
                </div>
              );
            })}
          </Nav>

          <Footer>
            <div className="user">
              <strong>{user.name}</strong>
              {user.isOwner ? 'Proprietário' : (user.role?.name ?? 'Sem cargo')} · {user.email}
            </div>
            <Item to="/admin/conta">
              <KeyRound size={19} aria-hidden /> Minha conta
            </Item>
            <a className="ext" href="/" target="_blank" rel="noopener noreferrer">
              <ExternalLink size={18} aria-hidden /> Ver o site
            </a>
            <button type="button" className="logout" onClick={logout}>
              <LogOut size={18} aria-hidden /> Sair
            </button>
          </Footer>
        </Sidebar>

        <Main>
          <TopBar>
            <button type="button" onClick={() => setOpen(!open)} aria-label={open ? 'Fechar menu' : 'Abrir menu'}>
              {open ? <X size={20} /> : <Menu size={20} />}
            </button>
            <Logo to="/admin" size="1.4rem" label="Painel PicPlus" />
          </TopBar>
          <Content>
            <Outlet />
          </Content>
        </Main>
      </Shell>
    </ToastProvider>
  );
}
