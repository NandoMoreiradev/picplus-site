import { useState } from 'react';
import type { FormEvent } from 'react';
import styled from 'styled-components';
import { CheckCircle2, Pencil, Plus, Trash2 } from 'lucide-react';
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
import { UploadField } from '../../components/admin/UploadField';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/Feedback';
import { FormGrid, SelectField, Switch, TextArea, TextField } from '../../components/ui/Form';
import { ConfirmDialog, Modal } from '../../components/ui/Modal';
import { useAuth } from '../../context/auth-context';
import { useCrud } from '../../hooks/useCrud';
import type { Testimonial } from '../../lib/types';
import { parseYoutubeId, youtubeThumbnail } from '../../lib/youtube';

const Preview = styled.div<{ $ok: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.9rem;
  padding: 0.75rem;
  border: 1px solid ${({ $ok, theme }) => ($ok ? theme.colors.primaryBorder : theme.colors.border)};
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.colors.background};
  font-size: 0.88rem;
  color: ${({ theme }) => theme.colors.textSecondary};

  img {
    width: 96px;
    aspect-ratio: 16 / 9;
    object-fit: cover;
    border-radius: ${({ theme }) => theme.radii.sm};
    background: #000;
  }
  strong {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    color: ${({ theme }) => theme.colors.primary};
  }
`;

interface FormState {
  clientName: string;
  role: string;
  company: string;
  quote: string;
  videoUrl: string;
  photo: string | null;
  orientation: 'vertical' | 'horizontal';
  order: string;
  active: boolean;
}

const EMPTY: FormState = {
  clientName: '',
  role: '',
  company: '',
  quote: '',
  videoUrl: '',
  photo: null,
  orientation: 'vertical',
  order: '0',
  active: true,
};

const toForm = (item: Testimonial): FormState => ({
  clientName: item.clientName,
  role: item.role ?? '',
  company: item.company,
  quote: item.quote,
  videoUrl: `https://youtu.be/${item.youtubeId}`,
  photo: item.photo,
  orientation: item.orientation,
  order: String(item.order),
  active: item.active,
});

function TestimonialForm({
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

  const videoId = form.videoUrl.trim() ? parseYoutubeId(form.videoUrl) : null;
  const videoError = form.videoUrl.trim() && !videoId ? 'Cole o link de um vídeo do YouTube (ex.: https://youtu.be/…).' : undefined;

  return (
    <Modal
      open
      variant="drawer"
      width="600px"
      title={title}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" form="testimonial-form" loading={saving} disabled={!videoId}>
            Salvar
          </Button>
        </>
      }
    >
      <FormStack
        id="testimonial-form"
        onSubmit={(event: FormEvent) => {
          event.preventDefault();
          if (videoId) onSubmit(form);
        }}
      >
        <TextField
          label="Link do vídeo no YouTube"
          required
          placeholder="https://youtube.com/shorts/…"
          value={form.videoUrl}
          onChange={(e) => set('videoUrl', e.target.value)}
          error={videoError}
          hint="Aceita link normal, curto (youtu.be) ou de Shorts. O vídeo pode estar como Não listado."
        />
        {videoId && (
          <Preview $ok>
            <img src={youtubeThumbnail(videoId)} alt="" />
            <div>
              <strong>
                <CheckCircle2 size={16} aria-hidden /> Vídeo reconhecido
              </strong>
              ID: {videoId}
            </div>
          </Preview>
        )}

        <FormGrid>
          <TextField label="Nome de quem dá o depoimento" required value={form.clientName} onChange={(e) => set('clientName', e.target.value)} />
          <TextField label="Empresa" required value={form.company} onChange={(e) => set('company', e.target.value)} />
        </FormGrid>
        <TextField label="Cargo" placeholder="Ex.: Diretora de Marketing" value={form.role} onChange={(e) => set('role', e.target.value)} />

        <TextArea
          label="Frase de destaque"
          required
          rows={3}
          minLength={10}
          maxLength={280}
          value={form.quote}
          onChange={(e) => set('quote', e.target.value)}
          hint="Aparece no cartão. De preferência com um resultado concreto, dito pelo próprio cliente."
        />

        <UploadField
          label="Foto do cliente"
          shape="square"
          value={form.photo}
          onChange={(url) => set('photo', url)}
          hint="Se não enviar, o cartão usa um quadro do próprio vídeo."
        />

        <FormGrid>
          <SelectField
            label="Formato do vídeo"
            required
            options={[
              { value: 'vertical', label: 'Vertical (9:16 — Shorts, Reels)' },
              { value: 'horizontal', label: 'Horizontal (16:9)' },
            ]}
            value={form.orientation}
            onChange={(e) => set('orientation', e.target.value as FormState['orientation'])}
          />
          <TextField
            label="Ordem de exibição"
            type="number"
            min={0}
            value={form.order}
            onChange={(e) => set('order', e.target.value)}
            hint="Menor número aparece primeiro."
          />
        </FormGrid>

        <Switch
          checked={form.active}
          onChange={(value) => set('active', value)}
          label="Exibir no site"
          description="Desative para ocultar sem excluir."
        />
      </FormStack>
    </Modal>
  );
}

export function Testimonials() {
  const { can } = useAuth();
  const { list, saving, save, remove } = useCrud<Testimonial>('/admin/testimonials', {
    saved: 'Depoimento salvo.',
    removed: 'Depoimento excluído.',
  });
  const [editing, setEditing] = useState<Testimonial | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Testimonial | null>(null);
  const items = list.data ?? [];

  const submit = async (form: FormState) => {
    const ok = await save(editing === 'new' || !editing ? null : editing.id, {
      clientName: form.clientName.trim(),
      role: form.role.trim() || null,
      company: form.company.trim(),
      quote: form.quote.trim(),
      videoUrl: form.videoUrl.trim(),
      photo: form.photo,
      orientation: form.orientation,
      order: Number(form.order) || 0,
      active: form.active,
    });
    if (ok) setEditing(null);
  };

  return (
    <>
      <PageHeader
        title="Depoimentos em vídeo"
        description="Vídeos de clientes exibidos na página inicial. Até 3 ficam lado a lado; acima disso, vira carrossel."
        actions={
          can('testimonials.create') && (
            <Button onClick={() => setEditing('new')}>
              <Plus size={18} aria-hidden /> Novo depoimento
            </Button>
          )
        }
      />

      {list.error ? (
        <ErrorState message={list.error.message} onRetry={list.reload} />
      ) : list.loading && !list.data ? (
        <Skeleton $h="240px" />
      ) : items.length === 0 ? (
        <EmptyState
          title="Nenhum depoimento cadastrado"
          description="Enquanto não houver depoimentos ativos, a seção não aparece na página inicial."
          action={can('testimonials.create') ? <Button onClick={() => setEditing('new')}>Novo depoimento</Button> : undefined}
        />
      ) : (
        <TableWrap>
          <Table>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Frase</th>
                <th>Formato</th>
                <th>Status</th>
                <th className="right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <CellMain>
                      <Avatar src={item.photo} name={item.clientName} size={44} />
                      <div>
                        <strong>{item.clientName}</strong>
                        <small>{[item.role, item.company].filter(Boolean).join(' · ')}</small>
                      </div>
                    </CellMain>
                  </td>
                  <td className="muted" style={{ maxWidth: 320 }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.quote}</div>
                  </td>
                  <td className="muted">{item.orientation === 'vertical' ? 'Vertical' : 'Horizontal'}</td>
                  <td>
                    <StatusPill tone={item.active ? 'success' : 'neutral'}>{item.active ? 'Visível' : 'Oculto'}</StatusPill>
                  </td>
                  <td className="right">
                    <RowActions>
                      {can('testimonials.edit') && (
                        <IconButton label={`Editar ${item.clientName}`} onClick={() => setEditing(item)}>
                          <Pencil size={17} />
                        </IconButton>
                      )}
                      {can('testimonials.delete') && (
                        <IconButton label={`Excluir ${item.clientName}`} danger onClick={() => setDeleting(item)}>
                          <Trash2 size={17} />
                        </IconButton>
                      )}
                    </RowActions>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </TableWrap>
      )}

      {editing && (
        <TestimonialForm
          key={editing === 'new' ? 'new' : editing.id}
          title={editing === 'new' ? 'Novo depoimento' : 'Editar depoimento'}
          initial={editing === 'new' ? EMPTY : toForm(editing)}
          saving={saving}
          onSubmit={submit}
          onClose={() => setEditing(null)}
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        title="Excluir depoimento"
        message={
          <>
            Excluir o depoimento de <strong>{deleting?.clientName}</strong>? O vídeo no YouTube não é afetado. Para apenas
            ocultar do site, use "Exibir no site".
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
