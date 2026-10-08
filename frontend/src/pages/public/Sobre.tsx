import styled from 'styled-components';
import { Eye, Handshake, Lightbulb, Quote, Target } from 'lucide-react';
import { BrandStrip } from '../../components/public/BrandStrip';
import { TeamCard } from '../../components/public/cards';
import { CtaBand } from '../../components/public/CtaBand';
import { ButtonLink } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Feedback';
import { Card, Container, Grid, Highlight, PageHero, Section, SectionHeader } from '../../components/ui/Layout';
import { Reveal } from '../../components/ui/Reveal';
import { about } from '../../content/about';
import { useFetch } from '../../hooks/useFetch';
import { usePageMeta } from '../../hooks/usePageMeta';
import type { Brand, TeamMember } from '../../lib/types';

const StoryGrid = styled.div`
  display: grid;
  grid-template-columns: 1.3fr 1fr;
  gap: 4rem;
  align-items: start;

  @media (max-width: ${({ theme }) => theme.breakpoints.laptop}) {
    grid-template-columns: 1fr;
    gap: 2.5rem;
  }
`;

const StoryText = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.25rem;

  p {
    font-size: 1.15rem;
    line-height: 1.8;
    color: ${({ theme }) => theme.colors.textSecondary};
  }
  p:first-child {
    font-size: 1.3rem;
    color: ${({ theme }) => theme.colors.text};
  }
`;

const SideColumn = styled.div`
  position: sticky;
  top: calc(${({ theme }) => theme.layout.headerHeight} + 1.5rem);
  display: flex;
  flex-direction: column;
  gap: 1.5rem;

  @media (max-width: ${({ theme }) => theme.breakpoints.laptop}) {
    position: static;
  }
`;

const FounderCard = styled.figure`
  margin: 0;
  overflow: hidden;
  border-radius: ${({ theme }) => theme.radii.lg};
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};

  .photo {
    display: grid;
    place-items: center;
    aspect-ratio: 4 / 5;
    background: ${({ theme }) => theme.colors.primarySoft};
    color: ${({ theme }) => theme.colors.primary};
    font-size: 4rem;
    font-weight: 800;
  }
  .photo img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  figcaption {
    padding: 1rem 1.25rem;
  }
  strong {
    display: block;
    font-size: 1.1rem;
    font-weight: 800;
  }
  span {
    font-size: 0.9rem;
    color: ${({ theme }) => theme.colors.textSecondary};
  }
`;

const MissionCard = styled(Card)`
  padding: 2.25rem;
  background:
    radial-gradient(circle at 100% 0%, rgba(182, 232, 41, 0.16), transparent 55%),
    ${({ theme }) => theme.colors.surface};
  border-color: ${({ theme }) => theme.colors.primaryBorder};

  svg {
    color: ${({ theme }) => theme.colors.primary};
    margin-bottom: 1rem;
  }
  h3 {
    font-size: 1.4rem;
    font-weight: 800;
    margin-bottom: 0.75rem;
  }
  p {
    font-size: 1.1rem;
    line-height: 1.7;
    color: ${({ theme }) => theme.colors.textSecondary};
  }
`;

const ValueCard = styled(Card)`
  padding: 1.75rem;
  height: 100%;

  .icon {
    display: grid;
    place-items: center;
    width: 48px;
    height: 48px;
    margin-bottom: 1rem;
    border-radius: ${({ theme }) => theme.radii.md};
    background: ${({ theme }) => theme.colors.primarySoft};
    color: ${({ theme }) => theme.colors.primary};
  }
  h3 {
    font-size: 1.2rem;
    font-weight: 800;
    margin-bottom: 0.5rem;
  }
  p {
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 0.95rem;
  }
`;

const VALUE_ICONS = [Quote, Lightbulb, Target, Handshake];

const founderInitials = about.founder.name
  .split(/\s+/)
  .slice(0, 2)
  .map((part) => part[0])
  .join('');

export function Sobre() {
  usePageMeta(
    'Sobre a Agência',
    'Conheça a história, a missão e os valores da PicPlus: estratégia, produção e influência sob o mesmo teto.',
  );
  const brands = useFetch<Brand[]>('/brands');
  const team = useFetch<TeamMember[]>('/team');

  return (
    <>
      <PageHero
        eyebrow="Sobre a agência"
        title={
          <>
            Nossa <Highlight>história</Highlight>
          </>
        }
        description="Uma agência nascida no campo de batalha, movida por performance e focada em transformar marketing em vendas."
      />

      <Section>
        <Container>
          <StoryGrid>
            <Reveal>
              <StoryText>
                {about.story.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </StoryText>
            </Reveal>
            <Reveal delay={120}>
              <SideColumn>
                <FounderCard>
                  <div className="photo">
                    {about.founder.photo ? (
                      <img src={about.founder.photo} alt={about.founder.name} loading="lazy" />
                    ) : (
                      <span aria-hidden>{founderInitials}</span>
                    )}
                  </div>
                  <figcaption>
                    <strong>{about.founder.name}</strong>
                    <span>{about.founder.role}</span>
                  </figcaption>
                </FounderCard>
                <MissionCard>
                  <Target size={32} aria-hidden />
                  <h3>{about.mission.title}</h3>
                  <p>{about.mission.text}</p>
                </MissionCard>
                <MissionCard>
                  <Eye size={32} aria-hidden />
                  <h3>{about.vision.title}</h3>
                  <p>{about.vision.text}</p>
                </MissionCard>
              </SideColumn>
            </Reveal>
          </StoryGrid>
        </Container>
      </Section>

      <Section $surface>
        <Container>
          <SectionHeader eyebrow="Nossos valores" title="O que guia o nosso trabalho" />
          <Grid $min="240px">
            {about.values.map((value, index) => {
              const Icon = VALUE_ICONS[index % VALUE_ICONS.length];
              return (
                <Reveal key={value.title} delay={index * 80}>
                  <ValueCard>
                    <div className="icon">
                      <Icon size={24} aria-hidden />
                    </div>
                    <h3>{value.title}</h3>
                    <p>{value.text}</p>
                  </ValueCard>
                </Reveal>
              );
            })}
          </Grid>
        </Container>
      </Section>

      {(brands.data?.length ?? 0) > 0 && (
        <Section $tight>
          <Container>
            <SectionHeader
              eyebrow="Marcas"
              title="Com quem já trabalhamos"
              description="Empresas que confiaram na PicPlus para falar com o seu público."
            />
            <BrandStrip brands={brands.data ?? []} />
          </Container>
        </Section>
      )}

      {(team.loading || (team.data?.length ?? 0) > 0) && (
        <Section $surface>
          <Container>
            <SectionHeader
              eyebrow="Equipe"
              title="As pessoas por trás da PicPlus"
              description="Um time apaixonado por criar conexões que geram resultado."
            />
            {team.loading && !team.data ? (
              <Grid $min="220px">
                {[0, 1, 2, 3].map((i) => (
                  <Skeleton key={i} $h="300px" $radius="24px" />
                ))}
              </Grid>
            ) : (
              <Grid $min="220px" $gap="2rem">
                {(team.data ?? []).map((member, index) => (
                  <Reveal key={member.id} delay={index * 70}>
                    <TeamCard member={member} />
                  </Reveal>
                ))}
              </Grid>
            )}
          </Container>
        </Section>
      )}

      <CtaBand
        title="Vamos construir algo juntos?"
        description="Conte o que você precisa e retornamos com uma proposta."
      >
        <ButtonLink to="/orcamento" $variant="dark" $size="lg">
          Solicitar orçamento
        </ButtonLink>
        <ButtonLink to="/contato" $variant="outlineDark" $size="lg">
          Falar com a equipe
        </ButtonLink>
      </CtaBand>
    </>
  );
}
