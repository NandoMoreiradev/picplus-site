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
import { VideoUploadField } from '../../components/admin/VideoUploadField';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { Chip, Chips } from '../../components/ui/Chips';
import { Alert, EmptyState, ErrorState, Skeleton } from '../../components/ui/Feedback';
import { FormGrid, SelectField, Switch, TextArea, TextField } from '../../components/ui/Form';
import { ConfirmDialog, Modal } from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../context/auth-context';
import { useCrud } from '../../hooks/useCrud';
import { api } from '../../lib/api';
import type { Testimonial } from '../../lib/types';
import { errorMessage } from '../../lib/validation';
import type { VideoProbe } from '../../lib/video';
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

const SourceBox = styled.fieldset`
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  border: none;

  legend {
    font-size: 0.9rem;
    font-weight: 700;
    margin-bottom: 0.6rem;
  }
`;

type Source = 'youtube' | 'file';

interface FormState {
  source: Source;
  videoUrl: string;
  videoFile: string | null;
  clientName: string;
  role: string;
  company: string;
  quote: string;
  photo: string | null;
  orientation: 'vertical' | 'horizontal';
  order: string;
  active: boolean;
}

const EMPTY: FormState = {
  source: 'youtube',
  videoUrl: '',
  videoFile: null,
  clientName: '',
  role: '',
  company: '',
  quote: '',
  photo: null,
  orientation: 'vertical',
  order: '0',
  active: true,
};

const toForm = (item: Testimonial): FormState => ({
  source: item.videoFile ? 'file' : 'youtube',
  videoUrl: item.youtubeId ? `https://youtu.be/${item.youtubeId}` : '',
  videoFile: item.videoFile,
  clientName: item.clientName,
  role: item.role ?? '',
  company: item.company,
  quote: item.quote,
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
  const toast = useToast();
  const [form, setForm] = useState(initial);
  const [autoCover, setAutoCover] = useState(false);
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  const videoId = form.videoUrl.trim() ? parseYoutubeId(form.videoUrl) : null;
  const videoError =
    form.source === 'youtube' && form.videoUrl.trim() && !videoId
      ? 'Cole o link de um vídeo do YouTube (ex.: https://youtu.be/…).'
      : undefined;
  const hasSource = form.source === 'youtube' ? !!videoId : !!form.videoFile;

  // Ao escolher o arquivo: ajusta o formato e, sem foto, usa um quadro do vídeo como capa.
  const handleProbe = async (probe: VideoProbe) => {
    if (!probe.readable) return;
    set('orientation', probe.vertical ? 'vertical' : 'horizontal');
    if (form.photo || !probe.poster) return;
    try {
      const url = await api.upload(new File([probe.poster], 'capa.jpg', { type: 'image/jpeg' }), 'image');
      setForm((f) => ({ ...f, photo: f.photo ?? url }));
      setAutoCover(true);
    } catch (error) {
      toast.error(errorMessage(error, 'Não foi possível gerar a capa do vídeo.'));
    }
  };

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
          <Button type="submit" form="testimonial-form" loading={saving} disabled={!hasSource}>
            Salvar
          </Button>
        </>
      }
    >
      <FormStack
        id="testimonial-form"
        onSubmit={(event: FormEvent) => {
          event.preventDefault();
          if (hasSource) onSubmit(form);
        }}
      >
        <SourceBox>
          <legend>Fonte do vídeo</legend>
          <Chips role="group" aria-label="Fonte do vídeo">
            <Chip type="button" $active={form.source === 'youtube'} onClick={() => set('source', 'youtube')}>
              Link do YouTube
            </Chip>
            <Chip type="button" $active={form.source === 'file'} onClick={() => set('source', 'file')}>
              Enviar vídeo
            </Chip>
          </Chips>

          {form.source === 'youtube' ? (
            <>
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
            </>
          ) : (
            <VideoUploadField
              label="Arquivo de vídeo"
              required
              value={form.videoFile}
              onChange={(url) => set('videoFile', url)}
              onProbe={(probe) => void handleProbe(probe)}
              hint="Dica: 30 a 60 segundos, em MP4 (H.264), com legenda no próprio vídeo. Vídeos pesados demoram para abrir em conexão fraca."
            />
          )}
        </SourceBox>

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
          onChange={(url) => {
            set('photo', url);
            setAutoCover(false);
          }}
          hint={
            form.source === 'file'
              ? 'Aparece no cartão e como capa do player. Se não enviar, usamos um quadro do vídeo.'
              : 'Se não enviar, o cartão usa um quadro do próprio vídeo.'
          }
        />
        {autoCover && <Alert tone="info">Capa gerada a partir de um quadro do vídeo. Você pode trocá-la enviando uma foto.</Alert>}

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
            hint={form.source === 'file' ? 'Detectado automaticamente ao enviar o arquivo.' : undefined}
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
    // Só a fonte escolhida é enviada; a outra vai como null para o servidor limpá-la.
    const ok = await save(editing === 'new' || !editing ? null : editing.id, {
      clientName: form.clientName.trim(),
      role: form.role.trim() || null,
      company: form.company.trim(),
      quote: form.quote.trim(),
      videoUrl: form.source === 'youtube' ? form.videoUrl.trim() : null,
      videoFile: form.source === 'file' ? form.videoFile : null,
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
        description="Vídeos de clientes exibidos na página inicial, do YouTube ou enviados por aqui. Até 3 ficam lado a lado; acima disso, vira carrossel."
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
                <th>Vídeo</th>
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
                  <td className="muted" style={{ maxWidth: 300 }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.quote}</div>
                  </td>
                  <td>
                    <StatusPill tone={item.videoFile ? 'info' : 'neutral'}>{item.videoFile ? 'Arquivo' : 'YouTube'}</StatusPill>{' '}
                    <span className="muted" style={{ fontSize: '0.85rem' }}>
                      {item.orientation === 'vertical' ? 'vertical' : 'horizontal'}
                    </span>
                  </td>
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
            Excluir o depoimento de <strong>{deleting?.clientName}</strong>?{' '}
            {deleting?.videoFile
              ? 'O arquivo de vídeo enviado também será apagado.'
              : 'O vídeo no YouTube não é afetado.'}{' '}
            Para apenas ocultar do site, use "Exibir no site".
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
