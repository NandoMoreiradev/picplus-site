import styled from 'styled-components';
import { Check } from 'lucide-react';
import { ContactForm } from '../../components/public/ContactForm';
import { Card, Container, Highlight, PageHero, Section, TwoColumns } from '../../components/ui/Layout';
import { usePageMeta } from '../../hooks/usePageMeta';

const NEXT_STEPS = [
  {
    title: 'Análise do pedido',
    text: 'Nossa equipe lê o seu briefing e entende o momento do negócio e a meta de faturamento.',
  },
  {
    title: 'Contato da equipe',
    text: 'Retornamos para alinhar detalhes e tirar dúvidas, se necessário.',
  },
  {
    title: 'Proposta sob medida',
    text: 'Você recebe um plano que conecta estratégia, produção e distribuição, com o investimento previsto.',
  },
];

const Steps = styled.ol`
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  margin-top: 1.5rem;

  li {
    display: flex;
    gap: 1rem;
  }
  .num {
    flex-shrink: 0;
    display: grid;
    place-items: center;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.textDark};
    font-weight: 800;
  }
  strong {
    display: block;
  }
  p {
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 0.95rem;
  }
`;

const Info = styled.div`
  h2 {
    font-size: 1.8rem;
    font-weight: 800;
  }
  > p {
    margin-top: 0.75rem;
    color: ${({ theme }) => theme.colors.textSecondary};
  }
  .perks {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    margin-top: 2rem;
    padding-top: 1.5rem;
    border-top: 1px solid ${({ theme }) => theme.colors.border};
  }
  .perks li {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    color: ${({ theme }) => theme.colors.textSecondary};
  }
  .perks svg {
    color: ${({ theme }) => theme.colors.primary};
  }
`;

const FormCard = styled(Card)`
  padding: 2.25rem;

  h2 {
    font-size: 1.5rem;
    font-weight: 800;
    margin-bottom: 1.5rem;
  }

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    padding: 1.4rem;
  }
`;

export function Orcamento() {
  usePageMeta('Solicitar Orçamento', 'Peça um orçamento para integrar estratégia, produção audiovisual e influenciadores com a PicPlus.');

  return (
    <>
      <PageHero
        eyebrow="Orçamento"
        title={
          <>
            Vamos desenhar o seu <Highlight>plano de crescimento</Highlight>
          </>
        }
        description="Conte o seu momento e o seu objetivo de faturamento. Retornamos com uma proposta personalizada."
      />

      <Section $tight>
        <Container>
          <TwoColumns>
            <Info>
              <h2>Como funciona</h2>
              <p>Simples e sem compromisso. Veja o que acontece depois que você enviar o pedido:</p>
              <Steps>
                {NEXT_STEPS.map((step, index) => (
                  <li key={step.title}>
                    <span className="num">{index + 1}</span>
                    <div>
                      <strong>{step.title}</strong>
                      <p>{step.text}</p>
                    </div>
                  </li>
                ))}
              </Steps>
              <ul className="perks">
                <li>
                  <Check size={18} aria-hidden /> Orçamento sem compromisso
                </li>
                <li>
                  <Check size={18} aria-hidden /> Estratégia, produção e influência em um único plano
                </li>
                <li>
                  <Check size={18} aria-hidden /> Acompanhamento do início ao fim
                </li>
              </ul>
            </Info>

            <FormCard>
              <h2>Dados do pedido</h2>
              <ContactForm type="BUDGET" />
            </FormCard>
          </TwoColumns>
        </Container>
      </Section>
    </>
  );
}
