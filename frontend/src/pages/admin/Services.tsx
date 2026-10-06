import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import styled from 'styled-components';
import { Pencil, Plus, Trash2 } from 'lucide-react';
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
import { TagInput } from '../../components/admin/TagInput';
import { Button } from '../../components/ui/Button';
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/Feedback';
import { FormGrid, SelectField, Switch, TextArea, TextField } from '../../components/ui/Form';
import { SERVICE_ICONS, ServiceIcon } from '../../components/ui/icons';
import { ConfirmDialog, Modal } from '../../components/ui/Modal';
import { PILLAR_OPTIONS, pillarName } from '../../content/positioning';
import { useCrud } from '../../hooks/useCrud';
import type { Service } from '../../lib/types';

const IconBox = styled.span`
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.colors.primarySoft};
  color: ${({ theme }) => theme.colors.primary};
`;

interface FormState {
  name: string;
  shortDescription: string;
  description: string;
  icon: string;
  pillar: string;
  features: string[];
  order: string;
  active: boolean;
}

const EMPTY: FormState = {
  name: '',
  shortDescription: '',
  description: '',
  icon: 'sparkles',
  pillar: '',
  features: [],
  order: '0',
  active: true,
};

const toForm = (service: Service): FormState => ({
  name: service.name,
  shortDescription: service.shortDescription ?? '',
  description: service.description,
  icon: service.icon ?? 'sparkles',
  pillar: service.pillar ?? '',
  features: service.features,
  order: String(service.order),
  active: service.active,
});

function ServiceForm({
  initial,
  saving,
  onSubmit,
  onClose,
  title,
}: {
  initial: FormState;
  saving: boolean;
  onSubmit: (values: FormState) => void;
  onClose: () => void;
  title: string;
}) {
  const [form, setForm] = useState(initial);
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <Modal
      open
      variant="drawer"
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" form="service-form" loading={saving}>
            Salvar
          </Button>
        </>
      }
    >
      <FormStack
        id="service-form"
        onSubmit={(event: FormEvent) => {
          event.preventDefault();
          onSubmit(form);
        }}
      >
        <TextField label="Nome do serviço" required minLength={2} value={form.name} onChange={(e) => set('name', e.target.value)} />
        <TextField
          label="Resumo"
          maxLength={220}
          value={form.shortDescription}
          onChange={(e) => set('shortDescription', e.target.value)}
          hint="Frase curta exibida nos cards da página inicial."
        />
        <TextArea
          label="Descrição completa"
          required
          minLength={10}
          rows={6}
          maxLength={5000}
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
        />
        <SelectField
          label="Pilar do hub"
          options={PILLAR_OPTIONS}
          value={form.pillar}
          onChange={(e) => set('pillar', e.target.value)}
          hint="Agrupa a entrega sob um dos três pilares na página Serviços."
        />
        <FormGrid>
          <SelectField
            label="Ícone"
            required
            options={Object.keys(SERVICE_ICONS)}
            value={form.icon}
            onChange={(e) => set('icon', e.target.value)}
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
        <TagInput
          label="Entregas / diferenciais"
          value={form.features}
          onChange={(features) => set('features', features)}
          hint="Pressione Enter para adicionar cada item."
        />
        <Switch
          checked={form.active}
          onChange={(value) => set('active', value)}
          label="Ativo no site"
          description="Desative para ocultar sem excluir."
        />
      </FormStack>
    </Modal>
  );
}

export function Services() {
  const [params, setParams] = useSearchParams();
  const { list, saving, save, remove } = useCrud<Service>('/admin/services', {
    saved: 'Serviço salvo.',
    removed: 'Serviço excluído.',
  });
  // Atalho do dashboard: /admin/servicos?novo=1 abre o formulário de criação.
  const [editing, setEditing] = useState<Service | 'new' | null>(() => (params.get('novo') ? 'new' : null));
  const [deleting, setDeleting] = useState<Service | null>(null);

  useEffect(() => {
    if (params.has('novo')) setParams({}, { replace: true });
  }, [params, setParams]);

  const submit = async (form: FormState) => {
    const ok = await save(editing === 'new' || !editing ? null : editing.id, {
      name: form.name.trim(),
      shortDescription: form.shortDescription.trim() || null,
      description: form.description.trim(),
      icon: form.icon,
      pillar: form.pillar || null,
      features: form.features,
      order: Number(form.order) || 0,
      active: form.active,
    });
    if (ok) setEditing(null);
  };

  const items = list.data ?? [];

  return (
    <>
      <PageHeader
        title="Serviços"
        description="Serviços exibidos na página inicial e em Serviços."
        actions={
          <Button onClick={() => setEditing('new')}>
            <Plus size={18} aria-hidden /> Novo serviço
          </Button>
        }
      />

      {list.error ? (
        <ErrorState message={list.error.message} onRetry={list.reload} />
      ) : list.loading && !list.data ? (
        <Skeleton $h="240px" />
      ) : items.length === 0 ? (
        <EmptyState
          title="Nenhum serviço cadastrado"
          description="Cadastre o primeiro serviço da agência."
          action={<Button onClick={() => setEditing('new')}>Novo serviço</Button>}
        />
      ) : (
        <TableWrap>
          <Table>
            <thead>
              <tr>
                <th>Serviço</th>
                <th>Pilar</th>
                <th>Entregas</th>
                <th>Ordem</th>
                <th>Status</th>
                <th className="right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {items.map((service) => (
                <tr key={service.id}>
                  <td>
                    <CellMain>
                      <IconBox>
                        <ServiceIcon icon={service.icon} size={20} />
                      </IconBox>
                      <div>
                        <strong>{service.name}</strong>
                        <small>{service.shortDescription ?? service.slug}</small>
                      </div>
                    </CellMain>
                  </td>
                  <td className="muted">{pillarName(service.pillar) ?? '—'}</td>
                  <td className="muted">{service.features.length}</td>
                  <td className="muted">{service.order}</td>
                  <td>
                    <StatusPill tone={service.active ? 'success' : 'neutral'}>{service.active ? 'Ativo' : 'Oculto'}</StatusPill>
                  </td>
                  <td className="right">
                    <RowActions>
                      <IconButton label={`Editar ${service.name}`} onClick={() => setEditing(service)}>
                        <Pencil size={17} />
                      </IconButton>
                      <IconButton label={`Excluir ${service.name}`} danger onClick={() => setDeleting(service)}>
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
        <ServiceForm
          key={editing === 'new' ? 'new' : editing.id}
          title={editing === 'new' ? 'Novo serviço' : 'Editar serviço'}
          initial={editing === 'new' ? EMPTY : toForm(editing)}
          saving={saving}
          onSubmit={submit}
          onClose={() => setEditing(null)}
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        title="Excluir serviço"
        message={
          <>
            Excluir <strong>{deleting?.name}</strong>? Para apenas ocultá-lo do site, use a opção "Ativo no site".
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
