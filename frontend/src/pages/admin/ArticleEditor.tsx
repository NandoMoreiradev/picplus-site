import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import styled from 'styled-components';
import { ArrowLeft, Bold, ExternalLink, Heading2, Italic, Link2, List, Quote, Save } from 'lucide-react';
import { FormStack, PageHeader, Panel, Tabs } from '../../components/admin/AdminUI';
import { UploadField } from '../../components/admin/UploadField';
import { Prose } from '../../components/public/Prose';
import { Button } from '../../components/ui/Button';
import { Alert, ErrorState, PageLoader } from '../../components/ui/Feedback';
import { FormGrid, Switch, TextArea, TextField } from '../../components/ui/Form';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../context/auth-context';
import { useFetch } from '../../hooks/useFetch';
import { api } from '../../lib/api';
import type { Article } from '../../lib/types';
import { errorMessage } from '../../lib/validation';

interface FormState {
  title: string;
  excerpt: string;
  category: string;
  content: string;
  coverImage: string | null;
  published: boolean;
}

const EMPTY: FormState = { title: '', excerpt: '', category: '', content: '', coverImage: null, published: false };

const Layout = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 1.5rem;
  align-items: start;

  @media (max-width: ${({ theme }) => theme.breakpoints.laptop}) {
    grid-template-columns: 1fr;
  }
`;

const Editor = styled(Panel)`
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
`;

const Side = styled.div`
  position: sticky;
  top: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;

  @media (max-width: ${({ theme }) => theme.breakpoints.laptop}) {
    position: static;
  }
`;

const SidePanel = styled(Panel)`
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
`;

const Toolbar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;

  .tools {
    display: flex;
    gap: 0.25rem;
  }
  .tools button {
    display: grid;
    place-items: center;
    width: 36px;
    height: 36px;
    border-radius: ${({ theme }) => theme.radii.sm};
    color: ${({ theme }) => theme.colors.textSecondary};
  }
  .tools button:hover {
    background: ${({ theme }) => theme.colors.surfaceHover};
    color: ${({ theme }) => theme.colors.text};
  }
`;

const Preview = styled.div`
  min-height: 320px;
  padding: 1.5rem;
  background: ${({ theme }) => theme.colors.background};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};

  .empty {
    color: ${({ theme }) => theme.colors.textMuted};
  }
`;

/** Aplica formatação Markdown na seleção atual do textarea. */
function applyFormat(
  area: HTMLTextAreaElement,
  value: string,
  kind: 'bold' | 'italic' | 'h2' | 'list' | 'quote' | 'link',
): { value: string; cursor: [number, number] } {
  const { selectionStart: start, selectionEnd: end } = area;
  const selected = value.slice(start, end);
  const before = value.slice(0, start);
  const after = value.slice(end);

  const wrap = (open: string, close: string, placeholder: string) => {
    const text = selected || placeholder;
    return {
      value: `${before}${open}${text}${close}${after}`,
      cursor: [start + open.length, start + open.length + text.length] as [number, number],
    };
  };
  const linePrefix = (prefix: string, placeholder: string) => {
    const text = selected || placeholder;
    const lineStart = before.endsWith('\n') || before === '' ? '' : '\n';
    const result = text
      .split('\n')
      .map((line) => `${prefix}${line}`)
      .join('\n');
    return {
      value: `${before}${lineStart}${result}${after}`,
      cursor: [start + lineStart.length + prefix.length, start + lineStart.length + result.length] as [number, number],
    };
  };

  switch (kind) {
    case 'bold':
      return wrap('**', '**', 'texto em negrito');
    case 'italic':
      return wrap('*', '*', 'texto em itálico');
    case 'h2':
      return linePrefix('## ', 'Subtítulo');
    case 'list':
      return linePrefix('- ', 'Item da lista');
    case 'quote':
      return linePrefix('> ', 'Citação');
    case 'link': {
      const text = selected || 'texto do link';
      const result = `[${text}](https://)`;
      return {
        value: `${before}${result}${after}`,
        cursor: [start + text.length + 3, start + text.length + 11] as [number, number],
      };
    }
  }
}

const toForm = (article: Article): FormState => ({
  title: article.title,
  excerpt: article.excerpt ?? '',
  category: article.category ?? '',
  content: article.content,
  coverImage: article.coverImage,
  published: article.published,
});

function ArticleForm({
  id,
  isNew,
  data,
  reload,
}: {
  id?: string;
  isNew: boolean;
  data: Article | null;
  reload: () => void;
}) {
  const navigate = useNavigate();
  const toast = useToast();
  const { can } = useAuth();
  const canSave = isNew ? can('articles.create') : can('articles.edit');
  const canPublish = can('articles.publish');
  const [form, setForm] = useState<FormState>(() => (data ? toForm(data) : EMPTY));
  const [tab, setTab] = useState<'write' | 'preview'>('write');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [dirty, setDirty] = useState(false);
  const areaRef = useRef<HTMLDivElement>(null);

  // Avisa ao tentar fechar a aba com alterações não salvas.
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setDirty(true);
  };

  const format = (kind: Parameters<typeof applyFormat>[2]) => {
    const area = areaRef.current?.querySelector('textarea');
    if (!area) return;
    const result = applyFormat(area, form.content, kind);
    set('content', result.value);
    requestAnimationFrame(() => {
      area.focus();
      area.setSelectionRange(result.cursor[0], result.cursor[1]);
    });
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      const body = {
        title: form.title.trim(),
        excerpt: form.excerpt.trim(),
        category: form.category.trim() || null,
        content: form.content,
        coverImage: form.coverImage,
        published: form.published,
      };
      if (isNew) {
        const created = await api.post<Article>('/admin/articles', body);
        setDirty(false);
        toast.success(form.published ? 'Artigo publicado.' : 'Rascunho salvo.');
        navigate(`/admin/blog/${created.id}`, { replace: true });
      } else {
        await api.patch(`/admin/articles/${id}`, body);
        setDirty(false);
        toast.success(form.published ? 'Artigo salvo e publicado.' : 'Artigo salvo.');
        reload();
      }
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        title={isNew ? 'Novo artigo' : 'Editar artigo'}
        description={isNew ? 'O artigo só aparece no site depois de publicado.' : data?.slug && `/blog/${data.slug}`}
        actions={
          <>
            <Link to="/admin/blog">
              <Button variant="ghost">
                <ArrowLeft size={18} aria-hidden /> Voltar
              </Button>
            </Link>
            {data?.published && (
              <Button variant="secondary" onClick={() => window.open(`/blog/${data.slug}`, '_blank', 'noopener')}>
                <ExternalLink size={16} aria-hidden /> Ver no site
              </Button>
            )}
          </>
        }
      />

      <FormStack id="article-form" onSubmit={submit}>
        {formError && <Alert tone="danger">{formError}</Alert>}
        <Layout>
          <Editor>
            <TextField
              label="Título"
              required
              minLength={3}
              maxLength={180}
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
            />
            <TextArea
              label="Resumo"
              rows={2}
              maxLength={400}
              value={form.excerpt}
              onChange={(e) => set('excerpt', e.target.value)}
              hint="Exibido nos cards e nos resultados de busca."
            />

            <div>
              <Toolbar>
                <Tabs
                  value={tab}
                  onChange={setTab}
                  tabs={[
                    { key: 'write', label: 'Escrever' },
                    { key: 'preview', label: 'Pré-visualizar' },
                  ]}
                />
                {tab === 'write' && (
                  <div className="tools" role="toolbar" aria-label="Formatação">
                    <button type="button" title="Negrito" aria-label="Negrito" onClick={() => format('bold')}>
                      <Bold size={17} />
                    </button>
                    <button type="button" title="Itálico" aria-label="Itálico" onClick={() => format('italic')}>
                      <Italic size={17} />
                    </button>
                    <button type="button" title="Subtítulo" aria-label="Subtítulo" onClick={() => format('h2')}>
                      <Heading2 size={17} />
                    </button>
                    <button type="button" title="Lista" aria-label="Lista" onClick={() => format('list')}>
                      <List size={17} />
                    </button>
                    <button type="button" title="Citação" aria-label="Citação" onClick={() => format('quote')}>
                      <Quote size={17} />
                    </button>
                    <button type="button" title="Link" aria-label="Link" onClick={() => format('link')}>
                      <Link2 size={17} />
                    </button>
                  </div>
                )}
              </Toolbar>

              <div style={{ marginTop: '0.9rem' }}>
                {tab === 'write' ? (
                  <div ref={areaRef}>
                    <TextArea
                      label="Conteúdo (Markdown)"
                      required
                      rows={20}
                      minLength={20}
                      value={form.content}
                      onChange={(e) => set('content', e.target.value)}
                      placeholder="Escreva aqui. Use ## para subtítulos, **negrito**, *itálico*, - para listas…"
                    />
                  </div>
                ) : (
                  <Preview>
                    {form.content.trim() ? <Prose>{form.content}</Prose> : <p className="empty">Nada para pré-visualizar ainda.</p>}
                  </Preview>
                )}
              </div>
            </div>
          </Editor>

          <Side>
            <SidePanel>
              <Switch
                checked={form.published}
                onChange={(value) => set('published', value)}
                label={form.published ? 'Publicado' : 'Rascunho'}
                disabled={!canPublish}
                description={
                  canPublish
                    ? form.published
                      ? 'Visível no site.'
                      : 'Não aparece no site.'
                    : 'Publicar exige a permissão "Publicar e despublicar artigos".'
                }
              />
              <Button type="submit" block loading={saving} disabled={!canSave}>
                {!saving && <Save size={18} aria-hidden />}
                {form.published ? 'Salvar e publicar' : 'Salvar rascunho'}
              </Button>
              {dirty && <small style={{ color: '#f59e0b' }}>Há alterações não salvas.</small>}
            </SidePanel>

            <SidePanel>
              <UploadField label="Imagem de capa" value={form.coverImage} onChange={(url) => set('coverImage', url)} hint="Formato horizontal (16:9)." />
              <FormGrid $cols={1}>
                <TextField
                  label="Categoria"
                  maxLength={60}
                  placeholder="Ex.: Tendências"
                  value={form.category}
                  onChange={(e) => set('category', e.target.value)}
                  hint="Usada nos filtros do blog."
                />
              </FormGrid>
            </SidePanel>
          </Side>
        </Layout>
      </FormStack>
    </>
  );
}

export function ArticleEditor() {
  const { id } = useParams();
  const isNew = !id || id === 'novo';
  const { data, loading, error, reload } = useFetch<Article>(isNew ? null : `/admin/articles/${id}`);

  if (!isNew && loading && !data) return <PageLoader />;
  if (!isNew && error) return <ErrorState message={error.message} onRetry={reload} />;

  // A key recria o formulário (com o estado inicial correto) ao trocar de artigo.
  return <ArticleForm key={isNew ? 'novo' : id} id={id} isNew={isNew} data={data} reload={reload} />;
}
