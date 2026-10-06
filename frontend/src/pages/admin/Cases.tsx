import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import styled from 'styled-components';
import { Pencil, Plus, Star, Trash2, X } from 'lucide-react';
import {
  CellMain,
  FormStack,
  IconButton,
  PageHeader,
  RowActions,
  StatusPill,
  Table,
  TableWrap,
} from '../../components/admin/AdminUI';
import { GalleryField } from '../../components/admin/GalleryField';
import { UploadField } from '../../components/admin/UploadField';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/Feedback';
import { FormGrid, Switch, TextArea, TextField } from '../../components/ui/Form';
import { ConfirmDialog, Modal } from '../../components/ui/Modal';
import { useCrud } from '../../hooks/useCrud';
import { formatShortDate } from '../../lib/format';
import type { CaseMetric, SuccessCase } from '../../lib/types';

const MetricsBox = styled.fieldset`
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  border: none;

  legend {
    font-size: 0.9rem;
    font-weight: 700;
    margin-bottom: 0.45rem;
  }
  legend span {
    margin-left: 0.4rem;
    color: ${({ theme }) => theme.colors.textMuted};
    font-weight: 400;
    font-size: 0.8rem;
  }
  .row {
    display: grid;
    grid-template-columns: 1fr 1fr auto;
    gap: 0.5rem;
    align-items: center;
  }
  input {
    width: 100%;
    padding: 0.65rem 0.85rem;
    background: ${({ theme }) => theme.colors.background};
    border: 1px solid ${({ theme }) => theme.colors.borderStrong};
    border-radius: ${({ theme }) => theme.radii.md};
  }
  input:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
  }
  .remove {
    display: grid;
    place-items: center;
    width: 36px;
    height: 36px;
    border-radius: ${({ theme }) => theme.radii.md};
    color: ${({ theme }) => theme.colors.textMuted};
  }
  .remove:hover {
    background: ${({ theme }) => theme.colors.dangerSoft};
    color: ${({ theme }) => theme.colors.danger};
  }
`;

interface FormState {
  title: string;
  clientName: string;
  segment: string;
  summary: string;
  description: string;
  results: string;
  coverImage: string | null;
  images: string[];
  metrics: CaseMetric[];
  featured: boolean;
  published: boolean;
}

const EMPTY: FormState = {
  title: '',
  clientName: '',
  segment: '',
  summary: '',
  description: '',
  results: '',
  coverImage: null,
  images: [],
  metrics: [],
  featured: false,
  published: true,
};

const toForm = (item: SuccessCase): FormState => ({
  title: item.title,
  clientName: item.clientName,
  segment: item.segment ?? '',
  summary: item.summary ?? '',
  description: item.description,
  results: item.results ?? '',
  coverImage: item.coverImage,
  images: item.images,
  metrics: item.metrics ?? [],
  featured: item.featured,
  published: item.published,
});

function CaseForm({
  initial,
  title,
  saving,
  onSubmit,
  onClose,
}: {
  initial: FormState;
  title: string;
  saving: boolean;
  onSubmit: (form: FormState) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState(initial);
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  const setMetric = (index: number, patch: Partial<CaseMetric>) =>
    set(
      'metrics',
      form.metrics.map((metric, i) => (i === index ? { ...metric, ...patch } : metric)),
    );

  return (
    <Modal
      open
      variant="drawer"
      width="720px"
      title={title}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" form="case-form" loading={saving}>
            Salvar
          </Button>
        </>
      }
    >
      <FormStack
        id="case-form"
        onSubmit={(event: FormEvent) => {
          event.preventDefault();
          onSubmit(form);
        }}
      >
        <TextField label="Título do case" required minLength={3} value={form.title} onChange={(e) => set('title', e.target.value)} />
        <FormGrid>
          <TextField label="Cliente" required value={form.clientName} onChange={(e) => set('clientName', e.target.value)} />
          <TextField
            label="Segmento"
            placeholder="Ex.: Moda, Alimentos…"
            value={form.segment}
            onChange={(e) => set('segment', e.target.value)}
            hint="Usado nos filtros da página de cases."
          />
        </FormGrid>
        <TextField
          label="Resumo"
          maxLength={300}
          value={form.summary}
          onChange={(e) => set('summary', e.target.value)}
          hint="Exibido no card. Se vazio, usamos o início da descrição."
        />
        <TextArea
          label="Descrição (desafio e estratégia)"
          required
          minLength={10}
          rows={6}
          maxLength={10000}
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
        />
        <TextArea
          label="Resultados"
          rows={4}
          maxLength={5000}
          value={form.results}
          onChange={(e) => set('results', e.target.value)}
        />

        <MetricsBox>
          <legend>
            Números de destaque<span>(opcional, até 6)</span>
          </legend>
          {form.metrics.map((metric, index) => (
            <div className="row" key={index}>
              <input
                aria-label={`Indicador ${index + 1}`}
                placeholder="Indicador (ex.: Alcance)"
                maxLength={40}
                value={metric.label}
                onChange={(e) => setMetric(index, { label: e.target.value })}
              />
              <input
                aria-label={`Valor ${index + 1}`}
                placeholder="Valor (ex.: 2,4M)"
                maxLength={40}
                value={metric.value}
                onChange={(e) => setMetric(index, { value: e.target.value })}
              />
              <button
                type="button"
                className="remove"
                aria-label={`Remover indicador ${index + 1}`}
                onClick={() =>
                  set(
                    'metrics',
                    form.metrics.filter((_, i) => i !== index),
                  )
                }
              >
                <X size={16} />
              </button>
            </div>
          ))}
          {form.metrics.length < 6 && (
            <div>
              <Button variant="secondary" size="sm" onClick={() => set('metrics', [...form.metrics, { label: '', value: '' }])}>
                <Plus size={16} aria-hidden /> Adicionar número
              </Button>
            </div>
          )}
        </MetricsBox>

        <UploadField label="Imagem de capa" value={form.coverImage} onChange={(url) => set('coverImage', url)} />
        <GalleryField label="Galeria de imagens" value={form.images} onChange={(urls) => set('images', urls)} />

        <FormGrid>
          <Switch
            checked={form.featured}
            onChange={(v) => set('featured', v)}
            label="Destaque"
            description="Aparece primeiro na lista."
          />
          <Switch
            checked={form.published}
            onChange={(v) => set('published', v)}
            label="Publicado"
            description="Visível no site."
          />
        </FormGrid>
      </FormStack>
    </Modal>
  );
}

export function Cases() {
  const [params, setParams] = useSearchParams();
  const { list, saving, save, remove } = useCrud<SuccessCase>('/admin/cases', {
    saved: 'Case salvo.',
    removed: 'Case excluído.',
  });
  const [editing, setEditing] = useState<SuccessCase | 'new' | null>(() => (params.get('novo') ? 'new' : null));
  const [deleting, setDeleting] = useState<SuccessCase | null>(null);

  // Atalho do dashboard (?novo=1): o formulário já abre pelo estado inicial; só limpa a URL.
  useEffect(() => {
    if (params.has('novo')) setParams({}, { replace: true });
  }, [params, setParams]);

  const items = list.data ?? [];

  const submit = async (form: FormState) => {
    const ok = await save(editing === 'new' || !editing ? null : editing.id, {
      title: form.title.trim(),
      clientName: form.clientName.trim(),
      segment: form.segment.trim() || null,
      summary: form.summary.trim() || null,
      description: form.description.trim(),
      results: form.results.trim() || null,
      coverImage: form.coverImage,
      images: form.images,
      metrics: form.metrics.filter((m) => m.label.trim() && m.value.trim()),
      featured: form.featured,
      published: form.published,
    });
    if (ok) setEditing(null);
  };

  return (
    <>
      <PageHeader
        title="Cases de sucesso"
        description="Campanhas e resultados exibidos no site."
        actions={
          <Button onClick={() => setEditing('new')}>
            <Plus size={18} aria-hidden /> Novo case
          </Button>
        }
      />

      {list.error ? (
        <ErrorState message={list.error.message} onRetry={list.reload} />
      ) : list.loading && !list.data ? (
        <Skeleton $h="240px" />
      ) : items.length === 0 ? (
        <EmptyState
          title="Nenhum case cadastrado"
          description="Conte as histórias de sucesso da agência."
          action={<Button onClick={() => setEditing('new')}>Novo case</Button>}
        />
      ) : (
        <TableWrap>
          <Table>
            <thead>
              <tr>
                <th>Case</th>
                <th>Segmento</th>
                <th>Status</th>
                <th>Criado em</th>
                <th className="right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <CellMain>
                      <Avatar src={item.coverImage ?? item.images[0]} name={item.clientName} size={46} square />
                      <div>
                        <strong>
                          {item.title} {item.featured && <Star size={14} color="#B6E829" aria-label="Destaque" />}
                        </strong>
                        <small>{item.clientName}</small>
                      </div>
                    </CellMain>
                  </td>
                  <td className="muted">{item.segment ?? '—'}</td>
                  <td>
                    <StatusPill tone={item.published ? 'success' : 'neutral'}>{item.published ? 'Publicado' : 'Rascunho'}</StatusPill>
                  </td>
                  <td className="muted">{formatShortDate(item.createdAt)}</td>
                  <td className="right">
                    <RowActions>
                      <IconButton label={`Editar ${item.title}`} onClick={() => setEditing(item)}>
                        <Pencil size={17} />
                      </IconButton>
                      <IconButton label={`Excluir ${item.title}`} danger onClick={() => setDeleting(item)}>
                        <Trash2 size={17} />
                      </IconButton>
                    </RowActions>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </TableWrap>
      )}

      {editing && (
        <CaseForm
          key={editing === 'new' ? 'new' : editing.id}
          title={editing === 'new' ? 'Novo case' : 'Editar case'}
          initial={editing === 'new' ? EMPTY : toForm(editing)}
          saving={saving}
          onSubmit={submit}
          onClose={() => setEditing(null)}
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        title="Excluir case"
        message={
          <>
            Excluir <strong>{deleting?.title}</strong>? As imagens enviadas também serão apagadas.
          </>
        }
        loading={saving}
        onCancel={() => setDeleting(null)}
        onConfirm={async () => {
          if (deleting && (await remove(deleting.id))) setDeleting(null);
        }}
      />
    </>
  );
}
