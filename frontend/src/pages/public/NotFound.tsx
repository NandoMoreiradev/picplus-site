import styled from 'styled-components';
import { ButtonLink } from '../../components/ui/Button';
import { Container, Section } from '../../components/ui/Layout';
import { usePageMeta } from '../../hooks/usePageMeta';

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 1rem;
  padding: 3rem 0;

  .code {
    font-size: clamp(5rem, 18vw, 10rem);
    font-weight: 900;
    line-height: 1;
    color: ${({ theme }) => theme.colors.primary};
    letter-spacing: -0.05em;
  }
  h1 {
    font-size: 2rem;
    font-weight: 800;
  }
  p {
    color: ${({ theme }) => theme.colors.textSecondary};
    max-width: 440px;
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    justify-content: center;
    margin-top: 1rem;
  }
`;

export function NotFound() {
  usePageMeta('Página não encontrada');
  return (
    <Section>
      <Container>
        <Wrap>
          <div className="code" aria-hidden>
            404
          </div>
          <h1>Página não encontrada</h1>
          <p>O endereço que você acessou não existe ou foi movido.</p>
          <div className="actions">
            <ButtonLink to="/">Voltar ao início</ButtonLink>
            <ButtonLink to="/contato" $variant="secondary">
              Falar com a equipe
            </ButtonLink>
          </div>
        </Wrap>
      </Container>
    </Section>
  );
}
