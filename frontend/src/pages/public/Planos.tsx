import styled from 'styled-components';
import { Check, ChevronDown, X } from 'lucide-react';
import { CtaBand } from '../../components/public/CtaBand';
import { ButtonAnchor, ButtonLink } from '../../components/ui/Button';
import { Card, Container, Grid, Highlight, PageHero, Section, SectionHeader } from '../../components/ui/Layout';
import { Reveal } from '../../components/ui/Reveal';
import {
  plansCta,
  plansFaq,
  plansHero,
  plansMath,
  plansMeta,
  plansPackages,
  plansPaths,
} from '../../content/plans';
import type { PlanPackage, PlanPath } from '../../content/plans';
import { usePageMeta } from '../../hooks/usePageMeta';

const HeroActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.85rem;
  margin-top: 0.5rem;
`;

/* ── A conta ─────────────────────────────────────────── */

const RoleCard = styled(Card)`
  display: flex;
  gap: 0.9rem;
  align-items: flex-start;
  padding: 1.25rem;

  .index {
    flex-shrink: 0;
    min-width: 2rem;
    color: ${({ theme }) => theme.colors.primary};
    font-size: 1.1rem;
    font-weight: 800;
  }
  strong {
    display: block;
    font-weight: 700;
  }
  span {
    font-size: 0.92rem;
    color: ${({ theme }) => theme.colors.textSecondary};
  }
`;

const HiddenCosts = styled(Card)`
  margin-top: 1.5rem;
  padding: 2rem;
  border-color: rgba(239, 68, 68, 0.35);

  h3 {
    margin-bottom: 1.25rem;
    font-size: 1.3rem;
    font-weight: 800;
  }
  ul {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.9rem 2rem;

    @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
      grid-template-columns: 1fr;
    }
  }
  li {
    display: flex;
    align-items: flex-start;
    gap: 0.6rem;
    line-height: 1.55;
    color: ${({ theme }) => theme.colors.textSecondary};
  }
  li svg {
    flex-shrink: 0;
    margin-top: 4px;
    color: ${({ theme }) => theme.colors.danger};
  }
`;

const Closing = styled.p`
  margin-top: 2.5rem;
  text-align: center;
  font-size: clamp(1.3rem, 2.6vw, 1.9rem);
  font-weight: 800;
`;

/* ── Caminhos ────────────────────────────────────────── */

const PathGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
  align-items: stretch;

  @media (max-width: ${({ theme }) => theme.breakpoints.laptop}) {
    grid-template-columns: 1fr;
  }
`;

const PathCard = styled(Card)<{ $good?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  height: 100%;
  padding: 2rem;
  ${({ $good, theme }) =>
    $good &&
    `
    border-color: ${theme.colors.primaryBorder};
    box-shadow: ${theme.shadows.glow};
  `}

  .tag {
    font-size: 0.78rem;
    font-weight: 800;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: ${({ $good, theme }) => ($good ? theme.colors.primary : theme.colors.textMuted)};
  }
  h3 {
    margin-top: -0.4rem;
    font-size: 1.4rem;
    font-weight: 800;
  }
  ul {
    display: flex;
    flex-direction: column;
    gap: 0.8rem;
    flex: 1;
  }
  li {
    display: flex;
    align-items: flex-start;
    gap: 0.6rem;
    line-height: 1.55;
    color: ${({ theme }) => theme.colors.textSecondary};
  }
  li svg {
    flex-shrink: 0;
    margin-top: 4px;
    color: ${({ $good, theme }) => ($good ? theme.colors.primary : theme.colors.danger)};
  }
  .verdict {
    padding-top: 1rem;
    border-top: 1px solid ${({ theme }) => theme.colors.border};
    font-weight: 700;
    line-height: 1.5;
  }
`;

function PathCardItem({ path }: { path: PlanPath }) {
  const good = Boolean(path.highlight);
  const Icon = good ? Check : X;
  return (
    <PathCard $good={good}>
      <span className="tag">{path.tag}</span>
      <h3>{path.title}</h3>
      <ul>
        {path.items.map((item) => (
          <li key={item}>
            <Icon size={18} aria-hidden /> {item}
          </li>
        ))}
      </ul>
      <p className="verdict">{path.verdict}</p>
    </PathCard>
  );
}

/* ── Pacotes ─────────────────────────────────────────── */

const PackageGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1.25rem;
  align-items: stretch;

  @media (max-width: ${({ theme }) => theme.breakpoints.desktop}) {
    grid-template-columns: repeat(2, 1fr);
  }
  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    grid-template-columns: 1fr;
  }
`;

const PackageCard = styled(Card)<{ $featured?: boolean }>`
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
  height: 100%;
  padding: 2rem 1.6rem;
  ${({ $featured, theme }) =>
    $featured &&
    `
    border-color: ${theme.colors.primary};
    box-shadow: ${theme.shadows.glow};
  `}

  .badge {
    position: absolute;
    top: -0.8rem;
    left: 1.6rem;
    padding: 0.25rem 0.8rem;
    border-radius: ${({ theme }) => theme.radii.pill};
    background: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.textDark};
    font-size: 0.72rem;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  h3 {
    font-size: 1.35rem;
    font-weight: 800;
  }
  .for {
    margin-top: -0.5rem;
    font-size: 0.95rem;
    color: ${({ theme }) => theme.colors.textSecondary};
  }
  .price {
    padding: 1rem 0;
    border-top: 1px solid ${({ theme }) => theme.colors.border};
    border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  }
  .price strong {
    display: block;
    font-size: 1.5rem;
    font-weight: 800;
    color: ${({ theme }) => theme.colors.primary};
  }
  ul {
    display: flex;
    flex-direction: column;
    gap: 0.7rem;
    flex: 1;
  }
  li {
    display: flex;
    align-items: flex-start;
    gap: 0.55rem;
    font-size: 0.95rem;
    line-height: 1.5;
  }
  li svg {
    flex-shrink: 0;
    margin-top: 3px;
    color: ${({ theme }) => theme.colors.primary};
  }
`;

function PackageCardItem({ pkg }: { pkg: PlanPackage }) {
  return (
    <PackageCard $featured={pkg.featured}>
      {pkg.featured && <span className="badge">{plansPackages.featuredBadge}</span>}
      <h3>{pkg.name}</h3>
      <p className="for">{pkg.forWho}</p>
      <div className="price">
        <strong>{plansPackages.priceLabel}</strong>
      </div>
      <ul>
        {pkg.features.map((feature) => (
          <li key={feature}>
            <Check size={16} aria-hidden /> {feature}
          </li>
        ))}
      </ul>
      <ButtonLink to="/orcamento" $variant={pkg.featured ? 'primary' : 'secondary'} $block>
        {plansPackages.cta}
      </ButtonLink>
    </PackageCard>
  );
}

const PriceNote = styled.p`
  margin-top: 1.5rem;
  text-align: center;
  font-size: 0.9rem;
  color: ${({ theme }) => theme.colors.textMuted};
`;

const Included = styled.div`
  margin-top: 3rem;
  padding: 2rem;
  border: 1px dashed ${({ theme }) => theme.colors.primaryBorder};
  border-radius: ${({ theme }) => theme.radii.lg};
  background: ${({ theme }) => theme.colors.primarySoft};

  h3 {
    margin-bottom: 1.25rem;
    font-size: 1.15rem;
    font-weight: 800;
  }
  ul {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.8rem 2rem;

    @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
      grid-template-columns: 1fr;
    }
  }
  li {
    display: flex;
    align-items: flex-start;
    gap: 0.6rem;
    line-height: 1.5;
  }
  li svg {
    flex-shrink: 0;
    margin-top: 4px;
    color: ${({ theme }) => theme.colors.primary};
  }
`;

/* ── FAQ ─────────────────────────────────────────────── */

const FaqList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
`;

const FaqItem = styled.details`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  background: ${({ theme }) => theme.colors.surface};
  transition: border-color ${({ theme }) => theme.transitions.default};

  &[open] {
    border-color: ${({ theme }) => theme.colors.primaryBorder};
  }
  summary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 1.25rem 1.5rem;
    font-size: 1.05rem;
    font-weight: 700;
    cursor: pointer;
    list-style: none;
  }
  summary::-webkit-details-marker {
    display: none;
  }
  summary svg {
    flex-shrink: 0;
    color: ${({ theme }) => theme.colors.primary};
    transition: transform ${({ theme }) => theme.transitions.fast};
  }
  &[open] summary svg {
    transform: rotate(180deg);
  }
  p {
    padding: 0 1.5rem 1.4rem;
    line-height: 1.75;
    color: ${({ theme }) => theme.colors.textSecondary};
  }
`;

export function Planos() {
  usePageMeta(plansMeta.title, plansMeta.description);

  return (
    <>
      <PageHero
        eyebrow={plansHero.eyebrow}
        title={
          <>
            {plansHero.titleStart} <Highlight>{plansHero.highlight}</Highlight>
          </>
        }
        description={plansHero.description}
      >
        <HeroActions>
          <ButtonLink to="/orcamento" $size="lg">
            {plansPackages.cta}
          </ButtonLink>
          <ButtonAnchor href="#pacotes" $variant="secondary" $size="lg">
            Ver os pacotes
          </ButtonAnchor>
        </HeroActions>
      </PageHero>

      <Section>
        <Container>
          <SectionHeader eyebrow={plansMath.eyebrow} title={plansMath.title} description={plansMath.description} />
          <Grid $min="260px" $gap="1rem">
            {plansMath.roles.map((role, index) => (
              <Reveal key={role.title} delay={(index % 3) * 70}>
                <RoleCard>
                  <span className="index" aria-hidden>
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <strong>{role.title}</strong>
                    <span>{role.text}</span>
                  </div>
                </RoleCard>
              </Reveal>
            ))}
          </Grid>
          <Reveal>
            <HiddenCosts>
              <h3>{plansMath.hidden.title}</h3>
              <ul>
                {plansMath.hidden.items.map((item) => (
                  <li key={item}>
                    <X size={18} aria-hidden /> {item}
                  </li>
                ))}
              </ul>
            </HiddenCosts>
          </Reveal>
          <Reveal>
            <Closing>{plansMath.closing}</Closing>
          </Reveal>
        </Container>
      </Section>

      <Section $surface>
        <Container>
          <SectionHeader eyebrow={plansPaths.eyebrow} title={plansPaths.title} description={plansPaths.description} />
          <PathGrid>
            {plansPaths.paths.map((path, index) => (
              <Reveal key={path.key} delay={index * 90}>
                <PathCardItem path={path} />
              </Reveal>
            ))}
          </PathGrid>
        </Container>
      </Section>

      <Section id="pacotes" style={{ scrollMarginTop: '76px' }}>
        <Container>
          <SectionHeader
            eyebrow={plansPackages.eyebrow}
            title={plansPackages.title}
            description={plansPackages.description}
          />
          <PackageGrid>
            {plansPackages.packages.map((pkg, index) => (
              <Reveal key={pkg.id} delay={index * 80}>
                <PackageCardItem pkg={pkg} />
              </Reveal>
            ))}
          </PackageGrid>
          <PriceNote>{plansPackages.priceNote}</PriceNote>
          <Reveal>
            <Included>
              <h3>{plansPackages.included.title}</h3>
              <ul>
                {plansPackages.included.items.map((item) => (
                  <li key={item}>
                    <Check size={18} aria-hidden /> {item}
                  </li>
                ))}
              </ul>
            </Included>
          </Reveal>
        </Container>
      </Section>

      <Section $surface>
        <Container $narrow>
          <SectionHeader eyebrow={plansFaq.eyebrow} title={plansFaq.title} />
          <FaqList>
            {plansFaq.items.map((item) => (
              <Reveal key={item.question}>
                <FaqItem>
                  <summary>
                    {item.question}
                    <ChevronDown size={20} aria-hidden />
                  </summary>
                  <p>{item.answer}</p>
                </FaqItem>
              </Reveal>
            ))}
          </FaqList>
        </Container>
      </Section>

      <CtaBand title={plansCta.title} description={plansCta.description}>
        <ButtonLink to="/orcamento" $variant="dark" $size="lg">
          {plansPackages.cta}
        </ButtonLink>
      </CtaBand>
    </>
  );
}
