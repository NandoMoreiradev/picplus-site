import type { ReactNode } from 'react';
import styled from 'styled-components';
import { Reveal } from './Reveal';

export const Container = styled.div<{ $narrow?: boolean }>`
  width: 100%;
  max-width: ${({ $narrow, theme }) => ($narrow ? '860px' : theme.layout.maxWidth)};
  margin: 0 auto;
  padding: 0 1.5rem;

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    padding: 0 1.1rem;
  }
`;

export const Section = styled.section<{ $surface?: boolean; $tight?: boolean }>`
  padding: ${({ $tight }) => ($tight ? '3.5rem 0' : '6rem 0')};
  background: ${({ $surface, theme }) => ($surface ? theme.colors.surface : 'transparent')};
  ${({ $surface, theme }) =>
    $surface &&
    `border-top: 1px solid ${theme.colors.border}; border-bottom: 1px solid ${theme.colors.border};`}

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    padding: ${({ $tight }) => ($tight ? '2.5rem 0' : '4rem 0')};
  }
`;

/* ── Cabeçalho de seção ──────────────────────────────── */

export const Eyebrow = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.35rem 0.9rem;
  border-radius: ${({ theme }) => theme.radii.pill};
  background: ${({ theme }) => theme.colors.primarySoft};
  border: 1px solid ${({ theme }) => theme.colors.primaryBorder};
  color: ${({ theme }) => theme.colors.primary};
  font-size: 0.8rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

const HeaderWrap = styled.div<{ $align: 'left' | 'center' }>`
  display: flex;
  flex-direction: column;
  align-items: ${({ $align }) => ($align === 'center' ? 'center' : 'flex-start')};
  text-align: ${({ $align }) => $align};
  gap: 1rem;
  margin-bottom: 3rem;

  h2 {
    font-size: clamp(1.9rem, 4vw, 2.9rem);
    font-weight: 800;
    max-width: 780px;
  }
  p {
    font-size: 1.1rem;
    color: ${({ theme }) => theme.colors.textSecondary};
    max-width: 640px;
  }
`;

export function SectionHeader({
  eyebrow,
  title,
  description,
  align = 'center',
  action,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: string;
  align?: 'left' | 'center';
  action?: ReactNode;
}) {
  return (
    <Reveal>
      <HeaderWrap $align={align}>
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <h2>{title}</h2>
        {description && <p>{description}</p>}
        {action}
      </HeaderWrap>
    </Reveal>
  );
}

/** Texto destacado em verde dentro de títulos: <Highlight>palavra</Highlight>. */
export const Highlight = styled.span`
  color: ${({ theme }) => theme.colors.primary};
`;

/* ── Hero das páginas internas ───────────────────────── */

const HeroWrap = styled.header`
  position: relative;
  overflow: hidden;
  padding: 5.5rem 0 4rem;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  background:
    radial-gradient(ellipse 60% 80% at 80% -20%, rgba(182, 232, 41, 0.14), transparent 70%),
    ${({ theme }) => theme.colors.background};

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    padding: 3.5rem 0 2.5rem;
  }
`;

const HeroContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
  max-width: 760px;

  h1 {
    font-size: clamp(2.2rem, 5.5vw, 3.8rem);
    font-weight: 800;
  }
  p {
    font-size: 1.2rem;
    color: ${({ theme }) => theme.colors.textSecondary};
    max-width: 640px;
  }
`;

export function PageHero({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <HeroWrap>
      <Container>
        <HeroContent>
          {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
          <h1>{title}</h1>
          {description && <p>{description}</p>}
          {children}
        </HeroContent>
      </Container>
    </HeroWrap>
  );
}

/* ── Card base ───────────────────────────────────────── */

export const Card = styled.div<{ $interactive?: boolean }>`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  transition:
    transform ${({ theme }) => theme.transitions.default},
    border-color ${({ theme }) => theme.transitions.default},
    box-shadow ${({ theme }) => theme.transitions.default};

  ${({ $interactive, theme }) =>
    $interactive &&
    `
    &:hover {
      transform: translateY(-4px);
      border-color: ${theme.colors.primaryBorder};
      box-shadow: ${theme.shadows.cardHover};
    }
  `}
`;

/** Duas colunas (informação + formulário) que empilham em telas menores. */
export const TwoColumns = styled.div`
  display: grid;
  grid-template-columns: 1fr 1.3fr;
  gap: 3rem;
  align-items: start;

  @media (max-width: ${({ theme }) => theme.breakpoints.laptop}) {
    grid-template-columns: 1fr;
  }
`;

export const Grid = styled.div<{ $min?: string; $gap?: string }>`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(${({ $min = '280px' }) => $min}, 100%), 1fr));
  gap: ${({ $gap = '1.5rem' }) => $gap};
`;
