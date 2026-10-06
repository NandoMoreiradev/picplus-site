import { useState } from 'react';
import type { FormEvent } from 'react';
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
import { UploadField } from '../../components/admin/UploadField';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/Feedback';
import { FormGrid, Switch, TextArea, TextField } from '../../components/ui/Form';
import { ConfirmDialog, Modal } from '../../components/ui/Modal';
import { useCrud } from '../../hooks/useCrud';
import type { TeamMember } from '../../lib/types';

interface FormState {
  name: string;
  role: string;
  bio: string;
  photo: string | null;
  instagram: string;
  linkedin: string;
  order: string;
  active: boolean;
}

const EMPTY: FormState = {
  name: '',
  role: '',
  bio: '',
  photo: null,
  instagram: '',
  linkedin: '',
  order: '0',
  active: true,
};

function MemberForm({
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

  return (
    <Modal
      open
      variant="drawer"
      width="560px"
      title={title}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" form="member-form" loading={saving}>
            Salvar
          </Button>
        </>
      }
    >
      <FormStack
        id="member-form"
        onSubmit={(event: FormEvent) => {
          event.preventDefault();
          onSubmit(form);
        }}
      >
        <UploadField label="Foto" shape="square" value={form.photo} onChange={(url) => set('photo', url)} hint="Quadrada, de preferência." />
        <FormGrid>
          <TextField label="Nome" required value={form.name} onChange={(e) => set('name', e.target.value)} />
          <TextField label="Cargo" required value={form.role} onChange={(e) => set('role', e.target.value)} />
        </FormGrid>
        <TextArea label="Mini bio" rows={3} maxLength={1000} value={form.bio} onChange={(e) => set('bio', e.target.value)} />
        <FormGrid>
          <TextField
            label="Instagram"
            type="url"
            placeholder="https://instagram.com/…"
            value={form.instagram}
            onChange={(e) => set('instagram', e.target.value)}
          />
          <TextField
            label="LinkedIn"
            type="url"
            placeholder="https://linkedin.com/in/…"
            value={form.linkedin}
            onChange={(e) => set('linkedin', e.target.value)}
          />
        </FormGrid>
        <FormGrid>
          <TextField label="Ordem" type="number" min={0} value={form.order} onChange={(e) => set('order', e.target.value)} />
        </FormGrid>
        <Switch checked={form.active} onChange={(v) => set('active', v)} label="Exibir no site" />
      </FormStack>
    </Modal>
  );
}

export function Team() {
  const { list, saving, save, remove } = useCrud<TeamMember>('/admin/team', {
    saved: 'Integrante salvo.',
    removed: 'Integrante excluído.',
  });
  const [editing, setEditing] = useState<TeamMember | 'new' | null>(null);
  const [deleting, setDeleting] = useState<TeamMember | null>(null);
  const items = list.data ?? [];

  const submit = async (form: FormState) => {
    const ok = await save(editing === 'new' || !editing ? null : editing.id, {
      name: form.name.trim(),
      role: form.role.trim(),
      bio: form.bio.trim() || null,
      photo: form.photo,
      instagram: form.instagram.trim() || null,
      linkedin: form.linkedin.trim() || null,
      order: Number(form.order) || 0,
      active: form.active,
    });
    if (ok) setEditing(null);
  };

  return (
    <>
      <PageHeader
        title="Equipe"
        description="Pessoas exibidas na página Sobre a Agência."
        actions={
          <Button onClick={() => setEditing('new')}>
            <Plus size={18} aria-hidden /> Novo integrante
          </Button>
        }
      />

      {list.error ? (
        <ErrorState message={list.error.message} onRetry={list.reload} />
      ) : list.loading && !list.data ? (
        <Skeleton $h="240px" />
      ) : items.length === 0 ? (
        <EmptyState
          title="Nenhum integrante cadastrado"
          description="Apresente o time da PicPlus no site."
          action={<Button onClick={() => setEditing('new')}>Novo integrante</Button>}
        />
      ) : (
        <TableWrap>
          <Table>
            <thead>
              <tr>
                <th>Integrante</th>
                <th>Ordem</th>
                <th>Status</th>
                <th className="right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {items.map((member) => (
                <tr key={member.id}>
                  <td>
                    <CellMain>
                      <Avatar src={member.photo} name={member.name} size={44} />
                      <div>
                        <strong>{member.name}</strong>
                        <small>{member.role}</small>
                      </div>
                    </CellMain>
                  </td>
                  <td className="muted">{member.order}</td>
                  <td>
                    <StatusPill tone={member.active ? 'success' : 'neutral'}>{member.active ? 'Visível' : 'Oculto'}</StatusPill>
                  </td>
                  <td className="right">
                    <RowActions>
                      <IconButton label={`Editar ${member.name}`} onClick={() => setEditing(member)}>
                        <Pencil size={17} />
                      </IconButton>
                      <IconButton label={`Excluir ${member.name}`} danger onClick={() => setDeleting(member)}>
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
        <MemberForm
          key={editing === 'new' ? 'new' : editing.id}
          title={editing === 'new' ? 'Novo integrante' : 'Editar integrante'}
          initial={
            editing === 'new'
              ? EMPTY
              : {
                  name: editing.name,
                  role: editing.role,
                  bio: editing.bio ?? '',
                  photo: editing.photo,
                  instagram: editing.instagram ?? '',
                  linkedin: editing.linkedin ?? '',
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
        title="Excluir integrante"
        message={
          <>
            Excluir <strong>{deleting?.name}</strong> da equipe?
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
