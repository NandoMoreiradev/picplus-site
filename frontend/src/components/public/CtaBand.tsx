import type { ReactNode } from 'react';
import styled from 'styled-components';
import { Reveal } from '../ui/Reveal';
import { Container, Section } from '../ui/Layout';

const Band = styled.div`
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 2rem;
  padding: 3.5rem;
  border-radius: ${({ theme }) => theme.radii.xl};
  background:
    radial-gradient(circle at 100% 0%, rgba(255, 255, 255, 0.35), transparent 50%),
    ${({ theme }) => theme.colors.primary};
  color: ${({ theme }) => theme.colors.textDark};

  h2 {
    font-size: clamp(1.7rem, 3.5vw, 2.5rem);
    font-weight: 800;
    max-width: 640px;
  }
  p {
    margin-top: 0.75rem;
    font-size: 1.1rem;
    max-width: 560px;
    opacity: 0.85;
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.85rem;
    flex-shrink: 0;
  }

  @media (max-width: ${({ theme }) => theme.breakpoints.laptop}) {
    flex-direction: column;
    align-items: flex-start;
    padding: 2.25rem 1.75rem;
  }
`;

export function CtaBand({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Section $tight>
      <Container>
        <Reveal>
          <Band>
            <div>
              <h2>{title}</h2>
              {description && <p>{description}</p>}
            </div>
            <div className="actions">{children}</div>
          </Band>
        </Reveal>
      </Container>
    </Section>
  );
}
