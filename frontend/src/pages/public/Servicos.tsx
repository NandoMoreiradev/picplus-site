import styled from 'styled-components';
import { CtaBand } from '../../components/public/CtaBand';
import { PillarCard } from '../../components/public/PillarCard';
import { ServiceCard } from '../../components/public/cards';
import { ButtonLink } from '../../components/ui/Button';
import { ErrorState, Skeleton } from '../../components/ui/Feedback';
import { Container, Grid, Highlight, PageHero, Section, SectionHeader } from '../../components/ui/Layout';
import { Reveal } from '../../components/ui/Reveal';
import { positioning, uvp } from '../../content/positioning';
import { useFetch } from '../../hooks/useFetch';
import { usePageMeta } from '../../hooks/usePageMeta';
import type { Service } from '../../lib/types';

const Group = styled.div`
  & + & {
    margin-top: 3.5rem;
  }
`;

const GroupTitle = styled.div`
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 1.25rem;
  h3 {
    font-size: 1.5rem;
    font-weight: 800;
  }
  span {
    color: ${({ theme }) => theme.colors.primary};
    font-size: 0.8rem;
    font-weight: 800;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }
`;

export function Servicos() {
  usePageMeta(
    'Serviços',
    'Assessoria de marketing, produtora audiovisual e agenciamento de influenciadores integrados em um único hub de performance.',
  );
  const { data, loading, error, reload } = useFetch<Service[]>('/services');
  const services = data ?? [];

  // Entregas agrupadas por pilar; as sem pilar vão para o final.
  const groups = [
    ...positioning.pillars.map((pillar) => ({
      key: pillar.key as string,
      title: pillar.name,
      nickname: pillar.nickname,
      items: services.filter((service) => service.pillar === pillar.key),
    })),
    {
      key: 'outras',
      title: 'Outras entregas',
      nickname: '',
      items: services.filter((service) => !positioning.pillars.some((pillar) => pillar.key === service.pillar)),
    },
  ].filter((group) => group.items.length > 0);

  return (
    <>
      <PageHero
        eyebrow={positioning.category}
        title={
          <>
            Estratégia, produção e influência: <Highlight>um único hub</Highlight>
          </>
        }
        description={uvp.support}
      />

      <Section>
        <Container>
          <Grid $min="300px" $gap="1.5rem">
            {positioning.pillars.map((pillar, index) => (
              <Reveal key={pillar.key} delay={index * 90}>
                <PillarCard pillar={pillar} index={index} />
              </Reveal>
            ))}
          </Grid>
        </Container>
      </Section>

      {(loading || groups.length > 0 || error) && (
        <Section $surface>
          <Container>
            <SectionHeader
              eyebrow="O que entregamos"
              title="Entregas de cada pilar"
              description="O detalhamento do que está incluído em cada frente do hub."
            />
            {error ? (
              <ErrorState message={error.message} onRetry={reload} />
            ) : loading && !data ? (
              <Grid $min="340px">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} $h="280px" $radius="16px" />
                ))}
              </Grid>
            ) : (
              groups.map((group) => (
                <Group key={group.key}>
                  <GroupTitle>
                    <h3>{group.title}</h3>
                    {group.nickname && <span>{group.nickname}</span>}
                  </GroupTitle>
                  <Grid $min="320px">
                    {group.items.map((service, index) => (
                      <Reveal key={service.id} delay={(index % 3) * 80}>
                        <ServiceCard service={service} detailed />
                      </Reveal>
                    ))}
                  </Grid>
                </Group>
              ))
            )}
          </Container>
        </Section>
      )}

      <CtaBand title={positioning.cta.title} description={positioning.cta.description}>
        <ButtonLink to="/orcamento" $variant="dark" $size="lg">
          Solicitar orçamento
        </ButtonLink>
      </CtaBand>
    </>
  );
}
