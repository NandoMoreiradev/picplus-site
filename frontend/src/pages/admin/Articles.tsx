import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ExternalLink, Pencil, Plus, Trash2 } from 'lucide-react';
import {
  CellMain,
  IconButton,
  PageHeader,
  RowActions,
  StatusPill,
  Table,
  TableWrap,
  Toolbar,
} from '../../components/admin/AdminUI';
import { CoverImage } from '../../components/public/cards';
import { ButtonLink } from '../../components/ui/Button';
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/Feedback';
import { ConfirmDialog } from '../../components/ui/Modal';
import { Pagination } from '../../components/ui/Pagination';
import { SearchInput } from '../../components/ui/SearchInput';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../context/auth-context';
import { useDebounce } from '../../hooks/useDebounce';
import { useFetch } from '../../hooks/useFetch';
import { usePage } from '../../hooks/usePage';
import { api } from '../../lib/api';
import { formatShortDate } from '../../lib/format';
import type { ArticleSummary, Paginated } from '../../lib/types';
import { errorMessage } from '../../lib/validation';

export function Articles() {
  const { can } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [deleting, setDeleting] = useState<ArticleSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const debounced = useDebounce(search);
  const [page, setPage] = usePage(debounced);

  const query = useMemo(() => ({ search: debounced.trim() || undefined, page, limit: 12 }), [debounced, page]);
  const { data, loading, error, reload } = useFetch<Paginated<ArticleSummary>>('/admin/articles', query);
  const items = data?.items ?? [];

  const remove = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await api.delete(`/admin/articles/${deleting.id}`);
      toast.success('Artigo excluído.');
      setDeleting(null);
      reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Blog"
        description="Crie, edite e publique os artigos do blog."
        actions={can('articles.create') && (<ButtonLink to="/admin/blog/novo">
            <Plus size={18} aria-hidden /> Novo artigo
          </ButtonLink>)}
      />

      <Toolbar>
        <div className="grow">
          <SearchInput value={search} onChange={setSearch} label="Buscar artigos" placeholder="Buscar artigos…" />
        </div>
      </Toolbar>

      {error ? (
        <ErrorState message={error.message} onRetry={reload} />
      ) : loading && !data ? (
        <Skeleton $h="260px" />
      ) : items.length === 0 ? (
        <EmptyState
          title={debounced ? 'Nenhum artigo encontrado' : 'Nenhum artigo ainda'}
          description={debounced ? 'Tente outro termo.' : 'Escreva o primeiro artigo do blog.'}
          action={
            !debounced && can('articles.create') ? (
              <ButtonLink to="/admin/blog/novo">Novo artigo</ButtonLink>
            ) : undefined
          }
        />
      ) : (
        <>
          <TableWrap style={{ opacity: loading ? 0.6 : 1 }}>
            <Table>
              <thead>
                <tr>
                  <th>Artigo</th>
                  <th>Categoria</th>
                  <th>Status</th>
                  <th>Data</th>
                  <th className="right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {items.map((article) => (
                  <tr key={article.id} className="clickable" onClick={() => navigate(`/admin/blog/${article.id}`)}>
                    <td>
                      <CellMain>
                        <div style={{ width: 72, flexShrink: 0, borderRadius: 8, overflow: 'hidden' }}>
                          <CoverImage src={article.coverImage} alt="" ratio="16 / 10" />
                        </div>
                        <div>
                          <strong>{article.title}</strong>
                          <small>/blog/{article.slug}</small>
                        </div>
                      </CellMain>
                    </td>
                    <td className="muted">{article.category ?? '—'}</td>
                    <td>
                      <StatusPill tone={article.published ? 'success' : 'warning'}>
                        {article.published ? 'Publicado' : 'Rascunho'}
                      </StatusPill>
                    </td>
                    <td className="muted">{formatShortDate(article.publishedAt ?? article.createdAt)}</td>
                    <td className="right" onClick={(e) => e.stopPropagation()}>
                      <RowActions>
                        {article.published && (
                          <IconButton label="Ver no site" onClick={() => window.open(`/blog/${article.slug}`, '_blank', 'noopener')}>
                            <ExternalLink size={17} />
                          </IconButton>
                        )}
                        {can('articles.edit') && <Link to={`/admin/blog/${article.id}`} aria-label={`Editar ${article.title}`}>
                          <IconButton label="Editar" tabIndex={-1}>
                            <Pencil size={17} />
                          </IconButton>
                        </Link>}
                        {can('articles.delete') && <IconButton label="Excluir" danger onClick={() => setDeleting(article)}>
                          <Trash2 size={17} />
                        </IconButton>}
                      </RowActions>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </TableWrap>
          <Pagination page={page} totalPages={data?.meta.totalPages ?? 1} onChange={setPage} />
        </>
      )}

      <ConfirmDialog
        open={!!deleting}
        title="Excluir artigo"
        message={
          <>
            Excluir <strong>{deleting?.title}</strong>? Esta ação não pode ser desfeita.
          </>
        }
        loading={busy}
        onCancel={() => setDeleting(null)}
        onConfirm={remove}
      />
    </>
  );
}
