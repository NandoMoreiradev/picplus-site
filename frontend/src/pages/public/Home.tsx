import { useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { ArrowRight, Check, X } from 'lucide-react';
import { ArticleCard, CaseCard, InfluencerCard } from '../../components/public/cards';
import { BrandStrip } from '../../components/public/BrandStrip';
import { CtaBand } from '../../components/public/CtaBand';
import { InfluencerModal } from '../../components/public/InfluencerModal';
import { PillarCard } from '../../components/public/PillarCard';
import { TestimonialsSection } from '../../components/public/TestimonialsSection';
import { ButtonLink } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Feedback';
import { Card, Container, Eyebrow, Grid, Highlight, Section, SectionHeader } from '../../components/ui/Layout';
import { Reveal } from '../../components/ui/Reveal';
import { positioning, uvp } from '../../content/positioning';
import { useFetch } from '../../hooks/useFetch';
import { usePageMeta } from '../../hooks/usePageMeta';
import type {
  ArticleSummary,
  Brand,
  Paginated,
  PublicStats,
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
    font-size: clamp(2.4rem, 6.2vw, 4.6rem);
    font-weight: 900;
    max-width: 980px;
    letter-spacing: -0.035em;
  }
  .lead {
    font-size: clamp(1.1rem, 2vw, 1.35rem);
    color: ${({ theme }) => theme.colors.textSecondary};
    max-width: 720px;
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    justify-content: center;
  }
`;

const Chain = styled.ul`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 0.6rem 0.9rem;
  margin-top: 0.5rem;

  li {
    display: inline-flex;
    align-items: center;
    gap: 0.9rem;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-weight: 800;
    font-size: 0.95rem;
  }
  li:not(:last-child)::after {
    content: '→';
    color: ${({ theme }) => theme.colors.primary};
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
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
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
`;

function Hero({ stats }: { stats: PublicStats | null }) {
  const items = stats
    ? [
        { value: stats.influencers, label: 'Criadores na vitrine' },
        { value: stats.cases, label: 'Cases publicados' },
        // Marcas ficam de fora de propósito: o número seria só a contagem de logos
        // cadastrados no painel, e não o total de marcas atendidas.
      ].filter((item) => item.value > 0)
    : [];

  return (
    <HeroSection>
      <Orb $top="-120px" $left="55%" $size="520px" />
      <Orb $top="260px" $left="-8%" $size="380px" $delay="-6s" />
      <Container>
        <HeroContent>
          <Reveal>
            <Eyebrow>{positioning.category}</Eyebrow>
          </Reveal>
          <Reveal delay={80}>
            <h1>
              <Highlight>Estratégia</Highlight> que converte. Produção que <Highlight>impressiona</Highlight>. Influência que <Highlight>vende</Highlight>.
            </h1>
          </Reveal>
          <Reveal delay={160}>
            <p className="lead">{uvp.support}</p>
          </Reveal>
          <Reveal delay={240}>
            <div className="actions">
              <ButtonLink to="/orcamento" $size="lg">
                Solicitar orçamento <ArrowRight size={20} aria-hidden />
              </ButtonLink>
              <ButtonLink to="/servicos" $variant="secondary" $size="lg">
                Conheça o hub
              </ButtonLink>
            </div>
          </Reveal>
          <Reveal delay={300}>
            <Chain aria-label="Cadeia de entrega">
              {['Estratégia', 'Produção', 'Influência', 'Resultado'].map((step) => (
                <li key={step}>{step}</li>
              ))}
            </Chain>
          </Reveal>
          {items.length > 0 && (
            <Reveal delay={360}>
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

/* ── O custo da fragmentação ─────────────────────────── */

const Versus = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;

  @media (max-width: ${({ theme }) => theme.breakpoints.laptop}) {
    grid-template-columns: 1fr;
  }
`;

const VersusCard = styled(Card)<{ $good?: boolean }>`
  padding: 2rem;
  height: 100%;
  border-color: ${({ $good, theme }) => ($good ? theme.colors.primaryBorder : theme.colors.border)};
  background: ${({ $good, theme }) =>
    $good
      ? `radial-gradient(circle at 100% 0%, rgba(182, 232, 41, 0.14), transparent 55%), ${theme.colors.surface}`
      : theme.colors.surface};

  h3 {
    font-size: 1.3rem;
    font-weight: 800;
    margin-bottom: 1.25rem;
    color: ${({ $good, theme }) => ($good ? theme.colors.primary : theme.colors.textSecondary)};
  }
  ul {
    display: flex;
    flex-direction: column;
    gap: 0.95rem;
  }
  li {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    color: ${({ $good, theme }) => ($good ? theme.colors.text : theme.colors.textSecondary)};
    line-height: 1.55;
  }
  li svg {
    flex-shrink: 0;
    margin-top: 3px;
    color: ${({ $good, theme }) => ($good ? theme.colors.primary : theme.colors.danger)};
  }
`;

/* ── Processo ────────────────────────────────────────── */

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
    display: block;
    margin-bottom: 1rem;
    font-size: 2.2rem;
    font-weight: 900;
    line-height: 1;
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

/* ── Público-alvo ────────────────────────────────────── */

const AudienceGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
  gap: 1.25rem;

  div.item {
    padding: 1.5rem;
    border-left: 3px solid ${({ theme }) => theme.colors.primary};
    background: ${({ theme }) => theme.colors.surface};
    border-radius: 0 ${({ theme }) => theme.radii.md} ${({ theme }) => theme.radii.md} 0;
  }
  h3 {
    font-size: 1.1rem;
    font-weight: 800;
    margin-bottom: 0.35rem;
  }
  p {
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 0.93rem;
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
  const cases = useFetch<SuccessCase[]>('/cases');
  const influencers = useFetch<Paginated<ShowcaseInfluencer>>('/influencers/showcase', { limit: 4 });
  const articles = useFetch<Paginated<ArticleSummary>>('/articles', { limit: 3 });

  const featuredCases = (cases.data ?? []).slice(0, 3);
  const showcase = influencers.data?.items ?? [];
  const posts = articles.data?.items ?? [];
  const { problem, pillars, process, audience, cta } = positioning;

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

      <Section>
        <Container>
          <SectionHeader eyebrow={problem.eyebrow} title={problem.title} description={problem.description} />
          <Versus>
            <Reveal>
              <VersusCard>
                <h3>{problem.fragmented.title}</h3>
                <ul>
                  {problem.fragmented.items.map((item) => (
                    <li key={item}>
                      <X size={18} aria-hidden /> {item}
                    </li>
                  ))}
                </ul>
              </VersusCard>
            </Reveal>
            <Reveal delay={120}>
              <VersusCard $good>
                <h3>{problem.integrated.title}</h3>
                <ul>
                  {problem.integrated.items.map((item) => (
                    <li key={item}>
                      <Check size={18} aria-hidden /> {item}
                    </li>
                  ))}
                </ul>
              </VersusCard>
            </Reveal>
          </Versus>
        </Container>
      </Section>

      <Section $surface id="pilares">
        <Container>
          <SectionHeader
            eyebrow="Os três pilares"
            title={
              <>
                Um hub, três frentes, <Highlight>um único responsável</Highlight>
              </>
            }
            description="Estratégia, produção e distribuição desenhadas juntas desde o primeiro dia."
          />
          <Grid $min="300px" $gap="1.5rem">
            {pillars.map((pillar, index) => (
              <Reveal key={pillar.key} delay={index * 90}>
                <PillarCard pillar={pillar} index={index} />
              </Reveal>
            ))}
          </Grid>
          <MoreLink>
            <ButtonLink to="/servicos" $variant="secondary">
              Ver o que entregamos em cada pilar <ArrowRight size={18} aria-hidden />
            </ButtonLink>
          </MoreLink>
        </Container>
      </Section>

      <Section>
        <Container>
          <SectionHeader
            eyebrow="Como trabalhamos"
            title="Da estratégia ao resultado, em uma única cadeia"
            description="Cada etapa nasce da anterior, e todas respondem à mesma meta de negócio."
          />
          <Steps>
            {process.map(({ title, text }, index) => (
              <Reveal key={title} delay={index * 90}>
                <li>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </li>
              </Reveal>
            ))}
          </Steps>
        </Container>
      </Section>

      <TestimonialsSection />

      <Section $tight>
        <Container>
          <SectionHeader eyebrow={audience.eyebrow} title={audience.title} />
          <AudienceGrid>
            {audience.items.map((item, index) => (
              <Reveal key={item.title} delay={index * 70}>
                <div className="item">
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </div>
              </Reveal>
            ))}
          </AudienceGrid>
        </Container>
      </Section>

      {(cases.loading || featuredCases.length > 0) && (
        <Section>
          <Container>
            <SectionHeader
              eyebrow="Cases de sucesso"
              title="Resultados que falam por si"
              description="Campanhas em que estratégia, produção e influência trabalharam juntas."
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
              eyebrow="O Megafone"
              title="As vozes certas para distribuir a sua mensagem"
              description="Criadores selecionados pela nossa equipe para transferir autoridade e gerar demanda."
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
              title="Conteúdo para quem decide sobre marketing"
              description="Posicionamento, funil, produção e influência, com foco em resultado de negócio."
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

      <CtaBand title={cta.title} description={cta.description}>
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
