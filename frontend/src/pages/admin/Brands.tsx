import { useState } from 'react';
import type { FormEvent } from 'react';
import styled from 'styled-components';
import { ExternalLink, Pencil, Plus, Trash2 } from 'lucide-react';
import { FormStack, IconButton, PageHeader, StatusPill } from '../../components/admin/AdminUI';
import { UploadField } from '../../components/admin/UploadField';
import { Button } from '../../components/ui/Button';
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/Feedback';
import { FormGrid, SelectField, Switch, TextField } from '../../components/ui/Form';
import { Card, Grid } from '../../components/ui/Layout';
import { ConfirmDialog, Modal } from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';
import { useCrud } from '../../hooks/useCrud';
import { assetUrl } from '../../lib/api';
import type { Brand } from '../../lib/types';

const BrandCard = styled(Card)<{ $muted?: boolean; $dark?: boolean }>`
  display: flex;
  flex-direction: column;
  overflow: hidden;
  opacity: ${({ $muted }) => ($muted ? 0.6 : 1)};

  .logo {
    display: grid;
    place-items: center;
    height: 110px;
    padding: 1rem;
    background: ${({ $dark }) => ($dark ? '#0f0f0f' : '#f5f5f5')};
  }
  .logo img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
  }
  .info {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    padding: 0.85rem 1rem 0.4rem;
  }
  .info strong {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .foot {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 0.6rem 0.6rem 1rem;
  }
  .foot a {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    color: ${({ theme }) => theme.colors.textMuted};
    font-size: 0.8rem;
  }
`;

interface FormState {
  name: string;
  logo: string | null;
  background: 'light' | 'dark';
  website: string;
  order: string;
  active: boolean;
}

const EMPTY: FormState = { name: '', logo: null, background: 'light', website: '', order: '0', active: true };

function BrandForm({
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
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!form.logo) {
      toast.error('Envie o logo da marca.');
      return;
    }
    onSubmit(form);
  };

  return (
    <Modal
      open
      variant="drawer"
      width="520px"
      title={title}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" form="brand-form" loading={saving}>
            Salvar
          </Button>
        </>
      }
    >
      <FormStack id="brand-form" onSubmit={submit}>
        <TextField label="Nome da marca" required value={form.name} onChange={(e) => set('name', e.target.value)} />
        <SelectField
          label="Fundo do logo no site"
          required
          options={[
            { value: 'light', label: 'Claro (para logos coloridos ou escuros)' },
            { value: 'dark', label: 'Escuro (para logos brancos)' },
          ]}
          value={form.background}
          onChange={(e) => set('background', e.target.value as FormState['background'])}
        />
        <UploadField
          label="Logo"
          required
          shape="logo"
          trim
          dark={form.background === 'dark'}
          value={form.logo}
          onChange={(url) => set('logo', url)}
          hint="As margens vazias são recortadas automaticamente para centralizar o logo. PNG com fundo transparente funciona melhor."
        />
        <TextField
          label="Site"
          type="url"
          placeholder="https://"
          value={form.website}
          onChange={(e) => set('website', e.target.value)}
        />
        <FormGrid>
          <TextField label="Ordem" type="number" min={0} value={form.order} onChange={(e) => set('order', e.target.value)} />
        </FormGrid>
        <Switch checked={form.active} onChange={(v) => set('active', v)} label="Exibir no site" />
      </FormStack>
    </Modal>
  );
}

export function Brands() {
  const { list, saving, save, remove } = useCrud<Brand>('/admin/brands', {
    saved: 'Marca salva.',
    removed: 'Marca excluída.',
  });
  const [editing, setEditing] = useState<Brand | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Brand | null>(null);

  const items = list.data ?? [];

  const submit = async (form: FormState) => {
    const ok = await save(editing === 'new' || !editing ? null : editing.id, {
      name: form.name.trim(),
      logo: form.logo,
      background: form.background,
      website: form.website.trim() || null,
      order: Number(form.order) || 0,
      active: form.active,
    });
    if (ok) setEditing(null);
  };

  return (
    <>
      <PageHeader
        title="Marcas parceiras"
        description="Logos das marcas com as quais a PicPlus trabalha ou já trabalhou."
        actions={
          <Button onClick={() => setEditing('new')}>
            <Plus size={18} aria-hidden /> Nova marca
          </Button>
        }
      />

      {list.error ? (
        <ErrorState message={list.error.message} onRetry={list.reload} />
      ) : list.loading && !list.data ? (
        <Grid $min="200px">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} $h="190px" $radius="16px" />
          ))}
        </Grid>
      ) : items.length === 0 ? (
        <EmptyState
          title="Nenhuma marca cadastrada"
          description="Adicione os logos das marcas parceiras para exibi-los no site."
          action={<Button onClick={() => setEditing('new')}>Nova marca</Button>}
        />
      ) : (
        <Grid $min="210px" $gap="1rem">
          {items.map((brand) => (
            <BrandCard key={brand.id} $muted={!brand.active} $dark={brand.background === 'dark'}>
              <div className="logo">
                <img src={assetUrl(brand.logo)} alt={brand.name} />
              </div>
              <div className="info">
                <strong>{brand.name}</strong>
                {!brand.active && <StatusPill tone="neutral">Oculta</StatusPill>}
              </div>
              <div className="foot">
                {brand.website ? (
                  <a href={brand.website} target="_blank" rel="noopener noreferrer">
                    Site <ExternalLink size={12} aria-hidden />
                  </a>
                ) : (
                  <span />
                )}
                <div>
                  <IconButton label={`Editar ${brand.name}`} onClick={() => setEditing(brand)}>
                    <Pencil size={16} />
                  </IconButton>
                  <IconButton label={`Excluir ${brand.name}`} danger onClick={() => setDeleting(brand)}>
                    <Trash2 size={16} />
                  </IconButton>
                </div>
              </div>
            </BrandCard>
          ))}
        </Grid>
      )}

      {editing && (
        <BrandForm
          key={editing === 'new' ? 'new' : editing.id}
          title={editing === 'new' ? 'Nova marca' : 'Editar marca'}
          initial={
            editing === 'new'
              ? EMPTY
              : {
                  name: editing.name,
                  logo: editing.logo,
                  background: editing.background ?? 'light',
                  website: editing.website ?? '',
                  order: String(editing.order),
                  active: editing.active,
                }
          }
          saving={saving}
          onSubmit={submit}
          onClose={() => setEditing(null)}
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        title="Excluir marca"
        message={
          <>
            Excluir <strong>{deleting?.name}</strong>? O logo também será apagado.
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
