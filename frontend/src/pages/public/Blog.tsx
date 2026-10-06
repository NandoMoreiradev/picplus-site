import { useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import { ArticleCard } from '../../components/public/cards';
import { Button } from '../../components/ui/Button';
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
import type { ArticleSummary, Paginated } from '../../lib/types';

const PAGE_SIZE = 9;

const Filters = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  margin-bottom: 2.5rem;
  scroll-margin-top: 100px;

  .search {
    max-width: 520px;
  }
`;

export function Blog() {
  usePageMeta('Blog', 'Artigos sobre posicionamento, funil de vendas, produção audiovisual e influência, direto da equipe PicPlus.');

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const debouncedSearch = useDebounce(search);
  const [page, setPage] = usePage(`${debouncedSearch}|${category}`);

  const categories = useFetch<string[]>('/articles/categories');
  const query = useMemo(
    () => ({ page, limit: PAGE_SIZE, search: debouncedSearch.trim() || undefined, category: category ?? undefined }),
    [page, debouncedSearch, category],
  );
  const { data, loading, error, reload } = useFetch<Paginated<ArticleSummary>>('/articles', query);

  const items = data?.items ?? [];
  const filtered = !!(debouncedSearch.trim() || category);

  const changePage = (next: number) => {
    setPage(next);
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <>
      <PageHero
        eyebrow="Blog"
        title={
          <>
            Marketing com foco em <Highlight>resultado de negócio</Highlight>
          </>
        }
        description="Posicionamento, funil, produção e influência: conteúdo da equipe PicPlus para quem decide sobre marketing."
      />

      <Section $tight>
        <Container>
          <Filters ref={topRef}>
            <div className="search">
              <SearchInput
                value={search}
                onChange={setSearch}
                label="Buscar artigos"
                placeholder="Buscar artigos…"
              />
            </div>
            {(categories.data?.length ?? 0) > 0 && (
              <Chips role="group" aria-label="Filtrar por categoria">
                <Chip $active={category === null} onClick={() => setCategory(null)}>
                  Todos
                </Chip>
                {categories.data?.map((item) => (
                  <Chip key={item} $active={category === item} onClick={() => setCategory(item)}>
                    {item}
                  </Chip>
                ))}
              </Chips>
            )}
          </Filters>

          {error ? (
            <ErrorState message={error.message} onRetry={reload} />
          ) : loading && !data ? (
            <Grid $min="320px">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} $h="380px" $radius="16px" />
              ))}
            </Grid>
          ) : items.length > 0 ? (
            <>
              <Grid $min="320px" style={{ opacity: loading ? 0.6 : 1, transition: 'opacity .2s' }}>
                {items.map((article, index) => (
                  <Reveal key={article.id} delay={(index % 3) * 70}>
                    <ArticleCard article={article} />
                  </Reveal>
                ))}
              </Grid>
              <Pagination page={page} totalPages={data?.meta.totalPages ?? 1} onChange={changePage} />
            </>
          ) : (
            <EmptyState
              title={filtered ? 'Nenhum artigo encontrado' : 'Em breve, novos artigos'}
              description={
                filtered
                  ? 'Tente outro termo de busca ou remova os filtros.'
                  : 'Estamos preparando conteúdos para você. Volte em breve!'
              }
              action={
                filtered ? (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setSearch('');
                      setCategory(null);
                    }}
                  >
                    Limpar filtros
                  </Button>
                ) : undefined
              }
            />
          )}
        </Container>
      </Section>
    </>
  );
}
