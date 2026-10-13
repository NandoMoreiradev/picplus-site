import { useEffect, useState } from 'react';
import { Link, NavLink as RouterNavLink, useLocation } from 'react-router-dom';
import styled, { css } from 'styled-components';
import { Menu, X } from 'lucide-react';
import { ButtonLink } from '../ui/Button';
import { Logo } from './Logo';

const NAV_ITEMS: { to: string; label: string; anchor?: string }[] = [
  { to: '/sobre', label: 'Sobre a PicPlus' },
  { to: '/servicos', label: 'Serviços' },
  { to: '/planos', label: 'Planos' },
  // Âncora da página inicial. Fica fora do NavLink, que marcaria o item ativo em toda a home.
  { to: '/#depoimentos', label: 'Depoimentos', anchor: 'depoimentos' },
  { to: '/influenciadores', label: 'Influenciadores' },
  { to: '/blog', label: 'Blog' },
  { to: '/piccast', label: 'PicCast' },
  { to: '/contato', label: 'Contato' },
];

// Abaixo disso os 8 itens + botão não cabem em uma linha: troca pelo menu hambúrguer.
const NAV_BREAKPOINT = '1180px';

const HeaderContainer = styled.header<{ $scrolled: boolean }>`
  position: sticky;
  top: 0;
  z-index: 100;
  background: ${({ $scrolled }) => ($scrolled ? 'rgba(10, 10, 10, 0.82)' : 'transparent')};
  backdrop-filter: ${({ $scrolled }) => ($scrolled ? 'blur(14px) saturate(160%)' : 'none')};
  border-bottom: 1px solid ${({ $scrolled, theme }) => ($scrolled ? theme.colors.border : 'transparent')};
  transition:
    background ${({ theme }) => theme.transitions.default},
    border-color ${({ theme }) => theme.transitions.default};
`;

const Bar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
  height: ${({ theme }) => theme.layout.headerHeight};
  max-width: 1360px;
  margin: 0 auto;
  padding: 0 1.5rem;
`;

const Nav = styled.nav`
  display: flex;
  gap: clamp(1rem, 1.5vw, 1.75rem);
  align-items: center;

  @media (max-width: ${NAV_BREAKPOINT}) {
    display: none;
  }
`;

const navItemStyles = css`
  position: relative;
  font-size: 0.95rem;
  font-weight: 700;
  white-space: nowrap;
  color: ${({ theme }) => theme.colors.textSecondary};
  padding: 0.35rem 0;

  &::after {
    content: '';
    position: absolute;
    left: 0;
    bottom: -2px;
    height: 2px;
    width: 100%;
    background: ${({ theme }) => theme.colors.primary};
    transform: scaleX(0);
    transform-origin: left;
    transition: transform ${({ theme }) => theme.transitions.fast};
  }
  &:hover {
    color: ${({ theme }) => theme.colors.text};
  }
  &.active {
    color: ${({ theme }) => theme.colors.text};
  }
  &.active::after,
  &:hover::after {
    transform: scaleX(1);
  }
`;

const NavItem = styled(RouterNavLink)`
  ${navItemStyles}
`;

const AnchorItem = styled(Link)`
  ${navItemStyles}
`;

const Actions = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;

  .cta {
    @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
      display: none;
    }
  }
`;

const MenuButton = styled.button`
  display: none;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: ${({ theme }) => theme.radii.md};
  border: 1px solid ${({ theme }) => theme.colors.border};

  @media (max-width: ${NAV_BREAKPOINT}) {
    display: grid;
  }
`;

const MobileMenu = styled.div`
  position: fixed;
  inset: ${({ theme }) => theme.layout.headerHeight} 0 0 0;
  z-index: 99;
  background: ${({ theme }) => theme.colors.background};
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  overflow-y: auto;

  a.link {
    padding: 1rem 0.5rem;
    font-size: 1.25rem;
    font-weight: 700;
    border-bottom: 1px solid ${({ theme }) => theme.colors.border};
    color: ${({ theme }) => theme.colors.textSecondary};
  }
  a.link.active {
    color: ${({ theme }) => theme.colors.primary};
  }
  .mobile-cta {
    margin-top: 1.5rem;
  }
`;

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const { pathname, hash } = useLocation();
  const isAnchorActive = (anchor: string) => pathname === '/' && hash === `#${anchor}`;
  // O menu "pertence" à rota em que foi aberto: ao navegar ele fecha sozinho.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  const setOpen = (value: boolean | ((current: boolean) => boolean)) => {
    const next = typeof value === 'function' ? value(open) : value;
    setOpenOn(next ? pathname : null);
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpenOn(null);
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <>
    <HeaderContainer $scrolled={scrolled || open}>
      <Bar>
        <Logo />

        <Nav aria-label="Navegação principal">
          {NAV_ITEMS.map((item) =>
            item.anchor ? (
              <AnchorItem key={item.to} to={item.to} className={isAnchorActive(item.anchor) ? 'active' : undefined}>
                {item.label}
              </AnchorItem>
            ) : (
              <NavItem key={item.to} to={item.to}>
                {item.label}
              </NavItem>
            ),
          )}
        </Nav>

        <Actions>
          <ButtonLink to="/orcamento" className="cta" $size="sm">
            Solicitar orçamento
          </ButtonLink>
          <MenuButton
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? 'Fechar menu' : 'Abrir menu'}
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </MenuButton>
        </Actions>
      </Bar>
    </HeaderContainer>

      {/* Fora do <header>: o backdrop-filter dele criaria um bloco de contenção e quebraria o position: fixed. */}
      {open && (
        <MobileMenu id="mobile-menu" role="dialog" aria-label="Menu">
          {NAV_ITEMS.map((item) =>
            item.anchor ? (
              <Link key={item.to} to={item.to} className={`link${isAnchorActive(item.anchor) ? ' active' : ''}`}>
                {item.label}
              </Link>
            ) : (
              <RouterNavLink key={item.to} to={item.to} className={({ isActive }) => `link${isActive ? ' active' : ''}`}>
                {item.label}
              </RouterNavLink>
            ),
          )}
          <ButtonLink to="/orcamento" className="mobile-cta" $size="lg" $block>
            Solicitar orçamento
          </ButtonLink>
          <ButtonLink to="/cadastro-influenciador" $variant="secondary" $size="lg" $block>
            Sou influenciador
          </ButtonLink>
        </MobileMenu>
      )}
    </>
  );
}
