import { useMemo, useState } from 'react';
import styled from 'styled-components';
import { CaseCard } from '../../components/public/cards';
import { CtaBand } from '../../components/public/CtaBand';
import { ButtonLink } from '../../components/ui/Button';
import { Chip, Chips } from '../../components/ui/Chips';
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/Feedback';
import { Container, Grid, Highlight, PageHero, Section } from '../../components/ui/Layout';
import { Reveal } from '../../components/ui/Reveal';
import { useFetch } from '../../hooks/useFetch';
import { usePageMeta } from '../../hooks/usePageMeta';
import type { SuccessCase } from '../../lib/types';

const FilterBar = styled.div`
  margin-bottom: 2.5rem;
`;

export function Cases() {
  usePageMeta('Cases de Sucesso', 'Conheça projetos desenvolvidos pela PicPlus, unindo estratégia, produção e influência, e os seus resultados.');
  const { data, loading, error, reload } = useFetch<SuccessCase[]>('/cases');
  const [segment, setSegment] = useState<string | null>(null);

  const segments = useMemo(
    () => [...new Set((data ?? []).map((item) => item.segment).filter((s): s is string => !!s))].sort(),
    [data],
  );
  const visible = (data ?? []).filter((item) => !segment || item.segment === segment);

  return (
    <>
      <PageHero
        eyebrow="Cases de sucesso"
        title={
          <>
            Campanhas que geram <Highlight>resultado</Highlight>
          </>
        }
        description="Veja como unimos estratégia, produção e influência para entregar resultado para as marcas."
      />

      <Section>
        <Container>
          {segments.length > 1 && (
            <FilterBar>
              <Chips role="group" aria-label="Filtrar por segmento">
                <Chip $active={segment === null} onClick={() => setSegment(null)}>
                  Todos
                </Chip>
                {segments.map((item) => (
                  <Chip key={item} $active={segment === item} onClick={() => setSegment(item)}>
                    {item}
                  </Chip>
                ))}
              </Chips>
            </FilterBar>
          )}

          {error ? (
            <ErrorState message={error.message} onRetry={reload} />
          ) : loading && !data ? (
            <Grid $min="340px">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} $h="380px" $radius="16px" />
              ))}
            </Grid>
          ) : visible.length > 0 ? (
            <Grid $min="340px">
              {visible.map((item, index) => (
                <Reveal key={item.id} delay={(index % 3) * 80}>
                  <CaseCard item={item} />
                </Reveal>
              ))}
            </Grid>
          ) : (
            <EmptyState
              title="Nenhum case por aqui ainda"
              description="Em breve compartilharemos os resultados das nossas campanhas."
            />
          )}
        </Container>
      </Section>

      <CtaBand title="Sua marca pode ser o próximo case" description="Fale com a gente e comece a planejar a sua campanha.">
        <ButtonLink to="/orcamento" $variant="dark" $size="lg">
          Solicitar orçamento
        </ButtonLink>
      </CtaBand>
    </>
  );
}
