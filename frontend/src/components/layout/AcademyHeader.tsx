import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { LogIn, UserCheck } from 'lucide-react';
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

export function AcademyHeader() {
  const [scrolled, setScrolled] = useState(false);
  const { student } = useStudentAuth();

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
            <ButtonLink to="/academy/minha-area" $size="sm" $variant="secondary">
              <UserCheck size={16} /> Minha Área
            </ButtonLink>
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
