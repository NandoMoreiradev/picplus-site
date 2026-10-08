import styled from 'styled-components';
import { Check, Link2, Target } from 'lucide-react';
import { CtaBand } from '../../components/public/CtaBand';
import { ButtonLink } from '../../components/ui/Button';
import { Card, Container, Highlight, PageHero, Section } from '../../components/ui/Layout';
import { Reveal } from '../../components/ui/Reveal';
import { ServiceIcon } from '../../components/ui/icons';
import { positioning, uvp } from '../../content/positioning';
import { pillarDetails } from '../../content/services';
import type { ServiceDetail } from '../../content/services';
import { usePageMeta } from '../../hooks/usePageMeta';

const PillarNav = styled.nav`
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;

  a {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.55rem 0.95rem;
    border-radius: 999px;
    border: 1px solid ${({ theme }) => theme.colors.border};
    background: ${({ theme }) => theme.colors.surface};
    color: ${({ theme }) => theme.colors.text};
    font-size: 0.9rem;
    font-weight: 700;
    transition: all ${({ theme }) => theme.transitions.default};
  }
  a:hover {
    border-color: ${({ theme }) => theme.colors.primaryBorder};
    color: ${({ theme }) => theme.colors.primary};
  }
  span {
    color: ${({ theme }) => theme.colors.primary};
    font-size: 0.75rem;
    font-weight: 800;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }
`;

const PillarSection = styled(Section)`
  scroll-margin-top: ${({ theme }) => theme.layout.headerHeight};
`;

const PillarHead = styled.div`
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0 2rem;
  align-items: start;
  margin-bottom: 3rem;

  .number {
    font-size: 5rem;
    font-weight: 900;
    line-height: 0.9;
    color: ${({ theme }) => theme.colors.primary};
    opacity: 0.9;
  }
  .nick {
    color: ${({ theme }) => theme.colors.primary};
    font-size: 0.8rem;
    font-weight: 800;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }
  h2 {
    margin: 0.25rem 0 1rem;
    font-size: clamp(1.8rem, 3.2vw, 2.5rem);
    font-weight: 800;
  }
  .statement {
    margin-bottom: 0.5rem;
    font-size: 1.25rem;
    font-weight: 700;
  }
  .intro {
    max-width: 720px;
    font-size: 1.05rem;
    line-height: 1.7;
    color: ${({ theme }) => theme.colors.textSecondary};
  }

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    grid-template-columns: 1fr;
    gap: 0.75rem;
    .number {
      font-size: 3.5rem;
    }
  }
`;

const ServiceList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const ServiceBlock = styled(Card)`
  display: grid;
  grid-template-columns: 1.15fr 1fr;
  overflow: hidden;

  @media (max-width: ${({ theme }) => theme.breakpoints.laptop}) {
    grid-template-columns: 1fr;
  }

  .main {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 2rem;
  }
  .icon {
    display: grid;
    place-items: center;
    width: 56px;
    height: 56px;
    border-radius: ${({ theme }) => theme.radii.md};
    background: ${({ theme }) => theme.colors.primarySoft};
    color: ${({ theme }) => theme.colors.primary};
    transition: all ${({ theme }) => theme.transitions.default};
  }
  &:hover .icon {
    background: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.textDark};
  }
  .tag {
    color: ${({ theme }) => theme.colors.primary};
    font-size: 0.78rem;
    font-weight: 800;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }
  h3 {
    margin-top: -0.5rem;
    font-size: 1.5rem;
    font-weight: 800;
  }
  .lead {
    line-height: 1.75;
    color: ${({ theme }) => theme.colors.textSecondary};
  }

  .side {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    padding: 2rem;
    border-left: 1px solid ${({ theme }) => theme.colors.border};
    background: ${({ theme }) => theme.colors.background};

    @media (max-width: ${({ theme }) => theme.breakpoints.laptop}) {
      border-left: 0;
      border-top: 1px solid ${({ theme }) => theme.colors.border};
    }
  }
  .label {
    margin-bottom: 0.75rem;
    font-size: 0.75rem;
    font-weight: 800;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: ${({ theme }) => theme.colors.textSecondary};
  }
  ul {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  li {
    display: flex;
    align-items: flex-start;
    gap: 0.6rem;
    font-size: 0.95rem;
    line-height: 1.5;
  }
  li svg {
    flex-shrink: 0;
    margin-top: 3px;
    color: ${({ theme }) => theme.colors.primary};
  }
  li strong {
    display: block;
    font-weight: 700;
  }
  li span {
    color: ${({ theme }) => theme.colors.textSecondary};
  }

  .goal {
    display: flex;
    gap: 0.75rem;
    padding: 1rem 1.1rem;
    border: 1px solid ${({ theme }) => theme.colors.primaryBorder};
    border-radius: ${({ theme }) => theme.radii.md};
    background: ${({ theme }) => theme.colors.primarySoft};
    font-size: 0.95rem;
    line-height: 1.55;
  }
  .goal svg {
    flex-shrink: 0;
    margin-top: 2px;
    color: ${({ theme }) => theme.colors.primary};
  }
  .goal b {
    display: block;
    margin-bottom: 0.15rem;
    font-size: 0.75rem;
    font-weight: 800;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: ${({ theme }) => theme.colors.primary};
  }

  .synergy {
    display: flex;
    align-items: flex-start;
    gap: 0.6rem;
    font-size: 0.88rem;
    line-height: 1.5;
    color: ${({ theme }) => theme.colors.textSecondary};
  }
  .synergy svg {
    flex-shrink: 0;
    margin-top: 2px;
  }
`;

function ServiceDetailCard({ service }: { service: ServiceDetail }) {
  return (
    <ServiceBlock $interactive>
      <div className="main">
        <div className="icon">
          <ServiceIcon icon={service.icon} size={28} aria-hidden />
        </div>
        <span className="tag">{service.tag}</span>
        <h3>{service.title}</h3>
        <p className="lead">{service.lead}</p>
        <div className="goal">
          <Target size={20} aria-hidden />
          <div>
            <b>Estratégia</b>
            {service.goal}
          </div>
        </div>
      </div>
      <div className="side">
        <div>
          <div className="label">O que entregamos</div>
          <ul>
            {service.deliverables.map((item) => (
              <li key={item.title}>
                <Check size={16} aria-hidden />
                <div>
                  <strong>{item.title}</strong>
                  {item.text && <span>{item.text}</span>}
                </div>
              </li>
            ))}
          </ul>
        </div>
        {service.synergy && (
          <p className="synergy">
            <Link2 size={16} aria-hidden />
            <span>
              <strong>No hub:</strong> {service.synergy}
            </span>
          </p>
        )}
      </div>
    </ServiceBlock>
  );
}

export function Servicos() {
  usePageMeta(
    'Serviços',
    'Assessoria de marketing, produtora audiovisual e agenciamento de influenciadores: conheça cada serviço e a estratégia por trás dele.',
  );

  return (
    <>
      <PageHero
        eyebrow={positioning.category}
        title={
          <>
            Estratégia, produção e influência: <Highlight>um único hub</Highlight>
          </>
        }
        description={`${uvp.support} Veja o que entregamos em cada pilar e a estratégia por trás de cada serviço.`}
      >
        <PillarNav aria-label="Pilares de serviço">
          {positioning.pillars.map((pillar, index) => (
            <a key={pillar.key} href={`#${pillar.key}`}>
              <span>0{index + 1}</span>
              {pillar.name}
            </a>
          ))}
        </PillarNav>
      </PageHero>

      {pillarDetails.map((detail, index) => {
        const pillar = positioning.pillars.find((item) => item.key === detail.key);
        if (!pillar) return null;
        return (
          <PillarSection key={detail.key} id={detail.key} $surface={index % 2 === 1}>
            <Container>
              <Reveal>
                <PillarHead>
                  <div className="number" aria-hidden>
                    0{index + 1}
                  </div>
                  <div>
                    <span className="nick">{pillar.nickname}</span>
                    <h2>{pillar.name}</h2>
                    <p className="statement">{detail.statement}</p>
                    <p className="intro">{detail.intro}</p>
                  </div>
                </PillarHead>
              </Reveal>
              <ServiceList>
                {detail.services.map((service, serviceIndex) => (
                  <Reveal key={service.id} delay={serviceIndex * 80}>
                    <ServiceDetailCard service={service} />
                  </Reveal>
                ))}
              </ServiceList>
            </Container>
          </PillarSection>
        );
      })}

      <CtaBand title={positioning.cta.title} description={positioning.cta.description}>
        <ButtonLink to="/orcamento" $variant="dark" $size="lg">
          Solicitar orçamento
        </ButtonLink>
      </CtaBand>
    </>
  );
}
