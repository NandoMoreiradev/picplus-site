import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import {
  ChevronDown,
  GraduationCap,
  LayoutDashboard,
  LogIn,
  LogOut,
  UserCheck,
} from 'lucide-react';
import { ButtonLink } from '../ui/Button';
import { Logo } from './Logo';
import { useStudentAuth } from '../../context/student-auth-context';

const HeaderContainer = styled.header<{ $scrolled: boolean }>`
  position: sticky;
  top: 0;
  z-index: 100;
  background: ${({ $scrolled }) =>
    $scrolled ? 'rgba(10, 10, 10, 0.92)' : 'rgba(10, 10, 10, 0.75)'};
  backdrop-filter: blur(14px) saturate(160%);
  border-bottom: 1px solid
    ${({ $scrolled, theme }) => ($scrolled ? theme.colors.borderStrong : theme.colors.border)};
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
  max-width: ${({ theme }) => theme.layout.maxWidth};
  margin: 0 auto;
  padding: 0 1.5rem;

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    padding: 0 1.1rem;
  }
`;

const BrandWrap = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;

  .academy-badge {
    font-size: 0.72rem;
    font-weight: 800;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: ${({ theme }) => theme.colors.primary};
    background: ${({ theme }) => theme.colors.primarySoft};
    border: 1px solid ${({ theme }) => theme.colors.primaryBorder};
    padding: 0.25rem 0.65rem;
    border-radius: ${({ theme }) => theme.radii.pill};

    @media (max-width: 440px) {
      display: none;
    }
  }
`;

const Actions = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const MenuWrap = styled.div`
  position: relative;
`;

const MenuTrigger = styled.button<{ $open: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.9rem;
  border-radius: 10px;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  color: #fff;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid
    ${({ $open }) => ($open ? 'rgba(182, 232, 41, 0.5)' : 'rgba(255, 255, 255, 0.14)')};
  transition:
    border-color 0.2s,
    background 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.08);
  }

  .chev {
    transition: transform 0.2s ease;
    transform: rotate(${({ $open }) => ($open ? '180deg' : '0deg')});
  }
`;

const MenuList = styled.div`
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  min-width: 230px;
  padding: 0.4rem;
  border-radius: 14px;
  background: #18181b;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 18px 40px -10px rgba(0, 0, 0, 0.7);
  z-index: 200;

  .menu-head {
    padding: 0.55rem 0.75rem 0.65rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.07);
    margin-bottom: 0.35rem;
    font-size: 0.78rem;
    color: #a1a1aa;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;

    strong {
      display: block;
      color: #fff;
      font-size: 0.88rem;
    }
  }

  .menu-item {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    width: 100%;
    padding: 0.6rem 0.75rem;
    border: none;
    border-radius: 9px;
    background: transparent;
    color: #e4e4e7;
    font-size: 0.86rem;
    font-weight: 600;
    text-align: left;
    cursor: pointer;
    text-decoration: none;

    &:hover {
      background: rgba(255, 255, 255, 0.07);
      color: #fff;
    }

    &.danger:hover {
      background: rgba(239, 68, 68, 0.12);
      color: #f87171;
    }
  }
`;

export function AcademyHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { student, logout } = useStudentAuth();

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <HeaderContainer $scrolled={scrolled}>
      <Bar>
        <BrandWrap>
          <Logo to="/academy" size="1.8rem" label="PicPlus Academy" />
          <span className="academy-badge">Academy</span>
        </BrandWrap>

        <Actions>
          {student ? (
            <MenuWrap ref={menuRef}>
              <MenuTrigger
                type="button"
                $open={menuOpen}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((v) => !v)}
              >
                <UserCheck size={16} /> Minha Área <ChevronDown size={14} className="chev" />
              </MenuTrigger>
              {menuOpen && (
                <MenuList role="menu">
                  <div className="menu-head">
                    <strong>{student.name}</strong>
                    {student.email}
                  </div>
                  <Link
                    role="menuitem"
                    className="menu-item"
                    to="/academy/minha-area"
                    onClick={() => setMenuOpen(false)}
                  >
                    <LayoutDashboard size={16} /> Meu painel
                  </Link>
                  <Link
                    role="menuitem"
                    className="menu-item"
                    to="/academy"
                    onClick={() => setMenuOpen(false)}
                  >
                    <GraduationCap size={16} /> Catálogo de cursos
                  </Link>
                  <button
                    type="button"
                    role="menuitem"
                    className="menu-item danger"
                    onClick={() => {
                      setMenuOpen(false);
                      logout();
                      navigate('/academy');
                    }}
                  >
                    <LogOut size={16} /> Sair
                  </button>
                </MenuList>
              )}
            </MenuWrap>
          ) : (
            <ButtonLink to="/academy/entrar" $size="sm">
              <LogIn size={16} /> Fazer Login
            </ButtonLink>
          )}
        </Actions>
      </Bar>
    </HeaderContainer>
  );
}
