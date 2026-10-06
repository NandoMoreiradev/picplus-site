import { useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import { InfluencerCard } from '../../components/public/cards';
import { CtaBand } from '../../components/public/CtaBand';
import { InfluencerModal } from '../../components/public/InfluencerModal';
import { Button, ButtonLink } from '../../components/ui/Button';
import { Chip, Chips } from '../../components/ui/Chips';
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/Feedback';
import { Container, Grid, Highlight, PageHero, Section } from '../../components/ui/Layout';
import { Pagination } from '../../components/ui/Pagination';
import { Reveal } from '../../components/ui/Reveal';
import { SearchInput } from '../../components/ui/SearchInput';
import { useDebounce } from '../../hooks/useDebounce';
import { useFetch } from '../../hooks/useFetch';
import { usePage } from '../../hooks/usePage';
import { usePageMeta } from '../../hooks/usePageMeta';
import type { Paginated, ShowcaseInfluencer } from '../../lib/types';

const PAGE_SIZE = 12;

const Filters = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  margin-bottom: 2.5rem;

  .search {
    max-width: 520px;
  }
`;

const ResultInfo = styled.p`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 0.9rem;
  margin-bottom: 1.25rem;
`;

export function Influenciadores() {
  usePageMeta(
    'Nossos Parceiros',
    'Conheça os influenciadores parceiros da PicPlus: perfis, nichos, redes sociais e materiais de apresentação.',
  );

  const [search, setSearch] = useState('');
  const [niche, setNiche] = useState<string | null>(null);
  const [selected, setSelected] = useState<ShowcaseInfluencer | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const debouncedSearch = useDebounce(search);
  // Qualquer mudança de filtro volta para a primeira página.
  const [page, setPage] = usePage(`${debouncedSearch}|${niche}`);

  const niches = useFetch<string[]>('/influencers/showcase/niches');
  const query = useMemo(
    () => ({ page, limit: PAGE_SIZE, search: debouncedSearch.trim() || undefined, niche: niche ?? undefined }),
    [page, debouncedSearch, niche],
  );
  const { data, loading, error, reload } = useFetch<Paginated<ShowcaseInfluencer>>('/influencers/showcase', query);

  const changePage = (next: number) => {
    setPage(next);
    resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const items = data?.items ?? [];
  const filtered = !!(debouncedSearch.trim() || niche);

  return (
    <>
      <PageHero
        eyebrow="Vitrine de parceiros"
        title={
          <>
            Criadores que <Highlight>conectam</Highlight> marcas e pessoas
          </>
        }
        description="Perfis selecionados pela nossa equipe, com audiência engajada e conteúdo autêntico."
      >
        <div>
          <ButtonLink to="/cadastro-influenciador" $variant="secondary">
            Quero fazer parte da vitrine
          </ButtonLink>
        </div>
      </PageHero>

      <Section $tight>
        <Container>
          <Filters ref={resultsRef} style={{ scrollMarginTop: '100px' }}>
            <div className="search">
              <SearchInput
                value={search}
                onChange={setSearch}
                label="Buscar influenciador"
                placeholder="Buscar por nome, nicho ou cidade…"
              />
            </div>
            {(niches.data?.length ?? 0) > 1 && (
              <Chips role="group" aria-label="Filtrar por nicho">
                <Chip $active={niche === null} onClick={() => setNiche(null)}>
                  Todos
                </Chip>
                {niches.data?.map((item) => (
                  <Chip key={item} $active={niche === item} onClick={() => setNiche(item)}>
                    {item}
                  </Chip>
                ))}
              </Chips>
            )}
          </Filters>

          {error ? (
            <ErrorState message={error.message} onRetry={reload} />
          ) : loading && !data ? (
            <Grid $min="260px">
              {Array.from({ length: 8 }, (_, i) => (
                <Skeleton key={i} $h="300px" $radius="16px" />
              ))}
            </Grid>
          ) : items.length > 0 ? (
            <>
              <ResultInfo aria-live="polite">
                {data?.meta.total} {data?.meta.total === 1 ? 'perfil encontrado' : 'perfis encontrados'}
              </ResultInfo>
              <Grid $min="260px" style={{ opacity: loading ? 0.6 : 1, transition: 'opacity .2s' }}>
                {items.map((item, index) => (
                  <Reveal key={item.id} delay={(index % 4) * 60}>
                    <InfluencerCard influencer={item} onSelect={setSelected} />
                  </Reveal>
                ))}
              </Grid>
              <Pagination page={page} totalPages={data?.meta.totalPages ?? 1} onChange={changePage} />
            </>
          ) : (
            <EmptyState
              title={filtered ? 'Nenhum perfil encontrado' : 'Nossa vitrine está sendo montada'}
              description={
                filtered
                  ? 'Tente outro termo de busca ou remova os filtros.'
                  : 'Em breve novos criadores estarão por aqui. Quer ser um dos primeiros?'
              }
              action={
                filtered ? (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setSearch('');
                      setNiche(null);
                    }}
                  >
                    Limpar filtros
                  </Button>
                ) : (
                  <ButtonLink to="/cadastro-influenciador">Cadastrar meu perfil</ButtonLink>
                )
              }
            />
          )}
        </Container>
      </Section>

      <CtaBand
        title="É criador de conteúdo?"
        description="Cadastre o seu perfil e participe da curadoria da PicPlus para ser apresentado às marcas que atendemos."
      >
        <ButtonLink to="/cadastro-influenciador" $variant="dark" $size="lg">
          Cadastrar meu perfil
        </ButtonLink>
      </CtaBand>

      <InfluencerModal influencer={selected} onClose={() => setSelected(null)} />
    </>
  );
}
