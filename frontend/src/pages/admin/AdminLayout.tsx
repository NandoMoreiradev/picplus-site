import { useEffect, useState } from 'react';
import { Navigate, NavLink, Outlet, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import {
  Building2,
  ExternalLink,
  Inbox,
  KeyRound,
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

  .group {
    margin: 1rem 0.75rem 0.4rem;
    font-size: 0.7rem;
    font-weight: 800;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: ${({ theme }) => theme.colors.textMuted};
  }
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
}
type NavEntry = NavItemDef | { group: string };

const NAV: NavEntry[] = [
  { to: '/admin', label: 'Visão geral', icon: LayoutDashboard, end: true },
  { group: 'Relacionamento' },
  { to: '/admin/influenciadores', label: 'Influenciadores', icon: Users, perm: 'influencers.view', badge: 'pendingInfluencers' },
  { to: '/admin/contatos', label: 'Contatos e orçamentos', icon: Inbox, perm: 'contacts.view', badge: 'inbox' },
  { group: 'Conteúdo do site' },
  { to: '/admin/blog', label: 'Blog', icon: Newspaper, perm: 'articles.view' },
  { to: '/admin/cases', label: 'Cases de sucesso', icon: Trophy, perm: 'cases.view' },
  { to: '/admin/depoimentos', label: 'Depoimentos', icon: Quote, perm: 'testimonials.view' },
  { to: '/admin/servicos', label: 'Serviços', icon: Sparkles, perm: 'services.view' },
  { to: '/admin/marcas', label: 'Marcas parceiras', icon: Building2, perm: 'brands.view' },
  { to: '/admin/equipe', label: 'Equipe do site', icon: UserSquare2, perm: 'team.view' },
  { group: 'Acesso' },
  { to: '/admin/usuarios', label: 'Usuários', icon: UserCog, perm: 'users.view' },
  { to: '/admin/cargos', label: 'Cargos e permissões', icon: ShieldCheck, perm: 'roles.view' },
  { group: 'Configurações' },
  { to: '/admin/conta', label: 'Minha conta', icon: KeyRound },
];

/** Itens do menu que o usuário pode ver, sem cabeçalhos de grupo que ficariam vazios. */
function visibleNav(entries: NavEntry[], can: (permission: string) => boolean): NavEntry[] {
  const isItem = (entry: NavEntry): entry is NavItemDef => !('group' in entry);
  const allowed = (entry: NavItemDef) => !entry.perm || can(entry.perm);

  return entries.filter((entry, index) => {
    if (isItem(entry)) return allowed(entry);
    // cabeçalho: mantém só se houver item visível antes do próximo cabeçalho
    const rest = entries.slice(index + 1);
    const nextGroup = rest.findIndex((e) => !isItem(e));
    const section = nextGroup === -1 ? rest : rest.slice(0, nextGroup);
    return section.some((e) => isItem(e) && allowed(e));
  });
}

export function AdminLayout() {
  const { user, loading, logout, can } = useAuth();
  const location = useLocation();
  // O menu mobile pertence à rota em que foi aberto: ao navegar, fecha sozinho.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === location.pathname;
  const setOpen = (value: boolean) => setOpenOn(value ? location.pathname : null);
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
            {visibleNav(NAV, can).map((entry, index) => {
              if ('group' in entry) {
                return (
                  <div className="group" key={`g-${index}`}>
                    {entry.group}
                  </div>
                );
              }
              const Icon = entry.icon;
              const badge = badgeFor(entry.badge);
              return (
                <Item key={entry.to} to={entry.to} end={entry.end ?? false}>
                  <Icon size={19} aria-hidden />
                  {entry.label}
                  {badge > 0 && <span className="badge">{badge}</span>}
                </Item>
              );
            })}
          </Nav>

          <Footer>
            <div className="user">
              <strong>{user.name}</strong>
              {user.isOwner ? 'Proprietário' : (user.role?.name ?? 'Sem cargo')} · {user.email}
            </div>
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
