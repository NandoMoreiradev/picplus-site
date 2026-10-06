import { useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { ArrowRight, ClipboardList, LineChart, Rocket, UserCheck } from 'lucide-react';
import { ArticleCard, CaseCard, InfluencerCard, ServiceCard } from '../../components/public/cards';
import { BrandStrip } from '../../components/public/BrandStrip';
import { CtaBand } from '../../components/public/CtaBand';
import { InfluencerModal } from '../../components/public/InfluencerModal';
import { ButtonLink } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Feedback';
import { Container, Eyebrow, Grid, Highlight, Section, SectionHeader } from '../../components/ui/Layout';
import { Reveal } from '../../components/ui/Reveal';
import { useFetch } from '../../hooks/useFetch';
import { usePageMeta } from '../../hooks/usePageMeta';
import { site } from '../../config/site';
import type {
  ArticleSummary,
  Brand,
  Paginated,
  PublicStats,
  Service,
  ShowcaseInfluencer,
  SuccessCase,
} from '../../lib/types';

/* ── Hero ────────────────────────────────────────────── */

const float = keyframes`
  0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
  50% { transform: translate3d(30px, -24px, 0) scale(1.08); }
`;

const HeroSection = styled.section`
  position: relative;
  overflow: hidden;
  padding: 7rem 0 6rem;
  isolation: isolate;

  /* grade sutil com máscara radial */
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    z-index: -2;
    background-image:
      linear-gradient(rgba(255, 255, 255, 0.045) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255, 255, 255, 0.045) 1px, transparent 1px);
    background-size: 56px 56px;
    mask-image: radial-gradient(ellipse 70% 70% at 50% 30%, #000 20%, transparent 75%);
  }

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    padding: 4rem 0 3.5rem;
  }
`;

const Orb = styled.div<{ $top: string; $left: string; $size: string; $delay?: string }>`
  position: absolute;
  z-index: -1;
  top: ${({ $top }) => $top};
  left: ${({ $left }) => $left};
  width: ${({ $size }) => $size};
  height: ${({ $size }) => $size};
  border-radius: 50%;
  background: radial-gradient(circle, rgba(182, 232, 41, 0.28), transparent 68%);
  filter: blur(40px);
  animation: ${float} 14s ease-in-out infinite;
  animation-delay: ${({ $delay = '0s' }) => $delay};
`;

const HeroContent = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 1.75rem;

  h1 {
    font-size: clamp(2.6rem, 7vw, 5.2rem);
    font-weight: 900;
    max-width: 960px;
    letter-spacing: -0.035em;
  }
  .lead {
    font-size: clamp(1.1rem, 2vw, 1.4rem);
    color: ${({ theme }) => theme.colors.textSecondary};
    max-width: 680px;
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    justify-content: center;
  }
`;

const StatsRow = styled.dl`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 1rem 3.5rem;
  margin-top: 2rem;
  padding-top: 2.5rem;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  width: 100%;
  max-width: 760px;

  div {
    text-align: center;
  }
  dt {
    order: 2;
    color: ${({ theme }) => theme.colors.textMuted};
    font-size: 0.9rem;
    font-weight: 600;
  }
  dd {
    order: 1;
    font-size: 2.4rem;
    font-weight: 900;
    line-height: 1;
    color: ${({ theme }) => theme.colors.primary};
  }
  div {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }
`;

function Hero({ stats }: { stats: PublicStats | null }) {
  const items = stats
    ? [
        { value: stats.influencers, label: 'Criadores na vitrine' },
        { value: stats.cases, label: 'Cases publicados' },
        { value: stats.brands, label: 'Marcas parceiras' },
      ].filter((item) => item.value > 0)
    : [];

  return (
    <HeroSection>
      <Orb $top="-120px" $left="55%" $size="520px" />
      <Orb $top="260px" $left="-8%" $size="380px" $delay="-6s" />
      <Container>
        <HeroContent>
          <Reveal>
            <Eyebrow>Agência de marketing de influência</Eyebrow>
          </Reveal>
          <Reveal delay={80}>
            <h1>
              Conectamos marcas aos <Highlight>melhores criadores</Highlight> do mercado
            </h1>
          </Reveal>
          <Reveal delay={160}>
            <p className="lead">{site.tagline}</p>
          </Reveal>
          <Reveal delay={240}>
            <div className="actions">
              <ButtonLink to="/orcamento" $size="lg">
                Solicitar orçamento <ArrowRight size={20} aria-hidden />
              </ButtonLink>
              <ButtonLink to="/servicos" $variant="secondary" $size="lg">
                Conheça nossos serviços
              </ButtonLink>
            </div>
          </Reveal>
          {items.length > 0 && (
            <Reveal delay={320}>
              <StatsRow>
                {items.map((item) => (
                  <div key={item.label}>
                    <dt>{item.label}</dt>
                    <dd>{item.value}</dd>
                  </div>
                ))}
              </StatsRow>
            </Reveal>
          )}
        </HeroContent>
      </Container>
    </HeroSection>
  );
}

/* ── Como trabalhamos ────────────────────────────────── */

const STEPS = [
  {
    icon: ClipboardList,
    title: 'Briefing',
    text: 'Entendemos o seu negócio, o público e os objetivos da campanha.',
  },
  {
    icon: UserCheck,
    title: 'Curadoria',
    text: 'Selecionamos os criadores com o perfil, a audiência e os valores certos para a sua marca.',
  },
  {
    icon: Rocket,
    title: 'Execução',
    text: 'Gerenciamos roteiros, aprovações e entregas para que tudo saia no prazo e com qualidade.',
  },
  {
    icon: LineChart,
    title: 'Resultados',
    text: 'Medimos o desempenho e entregamos aprendizados claros para as próximas ações.',
  },
];

const Steps = styled.ol`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1.5rem;
  counter-reset: step;

  @media (max-width: ${({ theme }) => theme.breakpoints.laptop}) {
    grid-template-columns: repeat(2, 1fr);
  }
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    grid-template-columns: 1fr;
  }

  li {
    position: relative;
    padding: 1.75rem 1.5rem;
    border: 1px solid ${({ theme }) => theme.colors.border};
    border-radius: ${({ theme }) => theme.radii.lg};
    background: ${({ theme }) => theme.colors.background};
    height: 100%;
  }
  li::before {
    counter-increment: step;
    content: '0' counter(step);
    position: absolute;
    top: 1.25rem;
    right: 1.5rem;
    font-size: 2.2rem;
    font-weight: 900;
    color: ${({ theme }) => theme.colors.surfaceHover};
  }
  svg {
    color: ${({ theme }) => theme.colors.primary};
    margin-bottom: 1rem;
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

/* ── Utilitários de seção ────────────────────────────── */

const MoreLink = styled.div`
  display: flex;
  justify-content: center;
  margin-top: 2.5rem;
`;

function GridSkeleton({ count = 3, height = '340px' }: { count?: number; height?: string }) {
  return (
    <Grid $min="320px">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} $h={height} $radius="16px" />
      ))}
    </Grid>
  );
}

/* ── Página ──────────────────────────────────────────── */

export function Home() {
  usePageMeta();
  const [selected, setSelected] = useState<ShowcaseInfluencer | null>(null);

  const stats = useFetch<PublicStats>('/stats');
  const brands = useFetch<Brand[]>('/brands');
  const services = useFetch<Service[]>('/services');
  const cases = useFetch<SuccessCase[]>('/cases');
  const influencers = useFetch<Paginated<ShowcaseInfluencer>>('/influencers/showcase', { limit: 4 });
  const articles = useFetch<Paginated<ArticleSummary>>('/articles', { limit: 3 });

  const featuredCases = (cases.data ?? []).slice(0, 3);
  const showcase = influencers.data?.items ?? [];
  const posts = articles.data?.items ?? [];

  return (
    <>
      <Hero stats={stats.data} />

      {(brands.data?.length ?? 0) > 0 && (
        <Section $tight $surface>
          <Container>
            <SectionHeader align="center" title="Marcas que confiam na PicPlus" />
            <BrandStrip brands={brands.data ?? []} />
          </Container>
        </Section>
      )}

      <Section id="servicos">
        <Container>
          <SectionHeader
            eyebrow="O que fazemos"
            title={
              <>
                Estratégia, criadores e <Highlight>resultado</Highlight>
              </>
            }
            description="Do planejamento à análise de performance, cuidamos de cada etapa para que a sua marca converse com a audiência certa."
          />
          {services.loading && !services.data ? (
            <GridSkeleton count={3} height="260px" />
          ) : (
            <Grid $min="320px">
              {(services.data ?? []).slice(0, 6).map((service, index) => (
                <Reveal key={service.id} delay={index * 70}>
                  <ServiceCard service={service} />
                </Reveal>
              ))}
            </Grid>
          )}
          <MoreLink>
            <ButtonLink to="/servicos" $variant="secondary">
              Ver todos os serviços <ArrowRight size={18} aria-hidden />
            </ButtonLink>
          </MoreLink>
        </Container>
      </Section>

      <Section $surface>
        <Container>
          <SectionHeader
            eyebrow="Como trabalhamos"
            title="Um processo simples, do briefing ao relatório"
            description="Transparência em cada fase para você acompanhar tudo de perto."
          />
          <Steps>
            {STEPS.map(({ icon: Icon, title, text }, index) => (
              <Reveal key={title} delay={index * 90}>
                <li>
                  <Icon size={30} aria-hidden />
                  <h3>{title}</h3>
                  <p>{text}</p>
                </li>
              </Reveal>
            ))}
          </Steps>
        </Container>
      </Section>

      {(cases.loading || featuredCases.length > 0) && (
        <Section>
          <Container>
            <SectionHeader
              eyebrow="Cases de sucesso"
              title="Resultados que falam por si"
              description="Campanhas em que unimos criatividade, criadores e dados."
            />
            {cases.loading && !cases.data ? (
              <GridSkeleton />
            ) : (
              <Grid $min="340px">
                {featuredCases.map((item, index) => (
                  <Reveal key={item.id} delay={index * 80}>
                    <CaseCard item={item} />
                  </Reveal>
                ))}
              </Grid>
            )}
            <MoreLink>
              <ButtonLink to="/cases" $variant="secondary">
                Ver todos os cases <ArrowRight size={18} aria-hidden />
              </ButtonLink>
            </MoreLink>
          </Container>
        </Section>
      )}

      {(influencers.loading || showcase.length > 0) && (
        <Section $surface>
          <Container>
            <SectionHeader
              eyebrow="Nossos parceiros"
              title="Criadores que fazem a diferença"
              description="Conheça alguns dos influenciadores que fazem parte da rede PicPlus."
            />
            {influencers.loading && !influencers.data ? (
              <GridSkeleton count={4} height="300px" />
            ) : (
              <Grid $min="260px">
                {showcase.map((item, index) => (
                  <Reveal key={item.id} delay={index * 80}>
                    <InfluencerCard influencer={item} onSelect={setSelected} />
                  </Reveal>
                ))}
              </Grid>
            )}
            <MoreLink>
              <ButtonLink to="/influenciadores" $variant="secondary">
                Ver vitrine completa <ArrowRight size={18} aria-hidden />
              </ButtonLink>
            </MoreLink>
          </Container>
        </Section>
      )}

      {posts.length > 0 && (
        <Section>
          <Container>
            <SectionHeader
              eyebrow="Blog"
              title="Conteúdo para quem vive de marketing"
              description="Tendências, boas práticas e bastidores do marketing de influência."
            />
            <Grid $min="320px">
              {posts.map((post, index) => (
                <Reveal key={post.id} delay={index * 80}>
                  <ArticleCard article={post} />
                </Reveal>
              ))}
            </Grid>
            <MoreLink>
              <ButtonLink to="/blog" $variant="secondary">
                Ir para o blog <ArrowRight size={18} aria-hidden />
              </ButtonLink>
            </MoreLink>
          </Container>
        </Section>
      )}

      <CtaBand
        title="Pronto para o próximo nível da sua marca?"
        description="Conte o seu objetivo e montamos uma proposta sob medida, com os criadores certos para o seu público."
      >
        <ButtonLink to="/orcamento" $variant="dark" $size="lg">
          Solicitar orçamento
        </ButtonLink>
        <ButtonLink to="/cadastro-influenciador" $variant="outlineDark" $size="lg">
          Sou influenciador
        </ButtonLink>
      </CtaBand>

      <InfluencerModal influencer={selected} onClose={() => setSelected(null)} />
    </>
  );
}
