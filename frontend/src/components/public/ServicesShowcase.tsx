import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { ArrowRight } from 'lucide-react';
import { positioning } from '../../content/positioning';
import { pillarDetails } from '../../content/services';
import type { ServiceDetail } from '../../content/services';
import { Reveal } from '../ui/Reveal';

const Pillars = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2.5rem;
`;

const PillarTitle = styled.h3`
  display: flex;
  align-items: baseline;
  gap: 0.75rem;
  margin-bottom: 1rem;
  font-size: 1.15rem;
  font-weight: 800;

  span {
    color: ${({ theme }) => theme.colors.primary};
    font-size: 0.8rem;
    font-weight: 800;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }
`;

const Row = styled.div`
  display: flex;
  gap: 1rem;

  a {
    flex: 1 1 0;
    min-width: 0;
    transition: flex 0.55s cubic-bezier(0.22, 1, 0.36, 1);
  }
  /* Quando o mouse entra na fileira, os vizinhos cedem espaço para o card em foco. */
  &:hover a {
    flex-grow: 0.85;
  }
  a:hover,
  a:focus-visible {
    flex-grow: 1.9;
  }

  /* Telas sem hover (celular/tablet): empilha e mostra o texto direto. */
  @media (max-width: ${({ theme }) => theme.breakpoints.laptop}), (hover: none) {
    flex-direction: column;

    a,
    &:hover a,
    a:hover,
    a:focus-visible {
      flex: none;
    }
  }
`;

const Card = styled(Link)`
  position: relative;
  display: block;
  height: 380px;
  overflow: hidden;
  isolation: isolate;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.xl};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  transition:
    flex 0.55s cubic-bezier(0.22, 1, 0.36, 1),
    border-color ${({ theme }) => theme.transitions.default};

  &:hover,
  &:focus-visible {
    border-color: ${({ theme }) => theme.colors.primaryBorder};
  }

  /* Fundo de marca, visível quando o serviço ainda não tem foto. */
  .base {
    position: absolute;
    inset: 0;
    z-index: -4;
    background:
      radial-gradient(circle at 80% 0%, rgba(182, 232, 41, 0.22), transparent 60%),
      ${({ theme }) => theme.colors.surfaceElevated};
  }

  /* Foto do serviço (public/servicos/<id>.jpg): preto e branco, com opacidade reduzida. */
  .photo {
    position: absolute;
    inset: 0;
    z-index: -3;
    background-size: cover;
    background-position: center;
    filter: grayscale(1) contrast(1.1);
    opacity: 0.45;
    transition:
      transform 0.8s cubic-bezier(0.22, 1, 0.36, 1),
      opacity ${({ theme }) => theme.transitions.default};
  }
  &:hover .photo,
  &:focus-visible .photo {
    transform: scale(1.12);
    opacity: 0.65;
  }

  /* Verde da PicPlus aplicado sobre a foto (só cor, preserva a luminosidade da imagem). */
  .tint {
    position: absolute;
    inset: 0;
    z-index: -2;
    background: ${({ theme }) => theme.colors.primary};
    mix-blend-mode: color;
    opacity: 0.85;
  }

  .shade {
    position: absolute;
    inset: 0;
    z-index: -1;
    background:
      linear-gradient(180deg, rgba(10, 10, 10, 0.35) 0%, rgba(10, 10, 10, 0.5) 40%, rgba(10, 10, 10, 0.94) 100%),
      linear-gradient(135deg, rgba(182, 232, 41, 0.14), transparent 55%);
    transition: opacity ${({ theme }) => theme.transitions.default};
  }

  .content {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    padding: 1.5rem;
  }
  .arrow {
    display: grid;
    place-items: center;
    width: 28px;
    height: 28px;
    margin-bottom: auto;
    border-radius: 50%;
    background: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.textDark};
    transition: transform ${({ theme }) => theme.transitions.default};
  }
  &:hover .arrow,
  &:focus-visible .arrow {
    transform: translateX(4px) scale(1.12);
  }
  .tag {
    color: ${({ theme }) => theme.colors.primary};
    font-size: 0.72rem;
    font-weight: 800;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }
  h4 {
    font-size: 1.3rem;
    font-weight: 800;
    line-height: 1.2;
    transition: font-size ${({ theme }) => theme.transitions.default};
  }
  &:hover h4,
  &:focus-visible h4 {
    font-size: 1.5rem;
  }

  /* O texto abre junto com o card. */
  .summary {
    max-height: 0;
    overflow: hidden;
    opacity: 0;
    font-size: 0.95rem;
    line-height: 1.55;
    color: rgba(255, 255, 255, 0.85);
    transition:
      max-height 0.55s cubic-bezier(0.22, 1, 0.36, 1),
      opacity 0.4s ease-in-out 0.1s;
  }
  &:hover .summary,
  &:focus-visible .summary {
    max-height: 8rem;
    opacity: 1;
  }

  @media (max-width: ${({ theme }) => theme.breakpoints.laptop}), (hover: none) {
    height: 300px;

    .summary {
      max-height: none;
      opacity: 1;
    }
    h4,
    &:hover h4,
    &:focus-visible h4 {
      font-size: 1.3rem;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    &,
    .photo,
    .summary {
      transition: none;
    }
  }
`;

function ServiceTile({ service }: { service: ServiceDetail }) {
  return (
    <Card to={`/servicos#${service.id}`}>
      <div className="base" aria-hidden />
      <div className="photo" style={{ backgroundImage: `url(/servicos/${service.id}.jpg)` }} aria-hidden />
      <div className="tint" aria-hidden />
      <div className="shade" aria-hidden />
      <div className="content">
        <span className="arrow" aria-hidden>
          <ArrowRight size={16} />
        </span>
        <span className="tag">{service.tag}</span>
        <h4>{service.title}</h4>
        <p className="summary">{service.summary}</p>
      </div>
    </Card>
  );
}

/** Todos os serviços do hub, agrupados por pilar. O card em foco se expande com a foto e o texto. */
export function ServicesShowcase() {
  return (
    <Pillars>
      {pillarDetails.map((detail, index) => {
        const pillar = positioning.pillars.find((item) => item.key === detail.key);
        if (!pillar) return null;
        return (
          <Reveal key={detail.key} delay={index * 90}>
            <PillarTitle>
              <span>0{index + 1}</span>
              {pillar.name}
            </PillarTitle>
            <Row>
              {detail.services.map((service) => (
                <ServiceTile key={service.id} service={service} />
              ))}
            </Row>
          </Reveal>
        );
      })}
    </Pillars>
  );
}
