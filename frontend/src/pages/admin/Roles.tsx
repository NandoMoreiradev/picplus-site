import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import styled from 'styled-components';
import { Pencil, Plus, ShieldCheck, Trash2, Users } from 'lucide-react';
import {
  FormStack,
  IconButton,
  PageHeader,
  RowActions,
  StatusPill,
  Table,
  TableWrap,
} from '../../components/admin/AdminUI';
import { Button } from '../../components/ui/Button';
import { Alert, EmptyState, ErrorState, Skeleton } from '../../components/ui/Feedback';
import { TextArea, TextField } from '../../components/ui/Form';
import { ConfirmDialog, Modal } from '../../components/ui/Modal';
import { useAuth } from '../../context/auth-context';
import { useCrud } from '../../hooks/useCrud';
import { useFetch } from '../../hooks/useFetch';
import type { PermissionGroup, RoleItem } from '../../lib/types';

/* ── Matriz de permissões ────────────────────────────── */

const Matrix = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
`;

const Group = styled.fieldset`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.colors.background};
  overflow: hidden;

  .head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.75rem 1rem;
    background: ${({ theme }) => theme.colors.surfaceElevated};
    border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  }
  .head label {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    font-weight: 800;
    cursor: pointer;
  }
  .count {
    color: ${({ theme }) => theme.colors.textMuted};
    font-size: 0.8rem;
    font-weight: 700;
  }
  .items {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.15rem 1rem;
    padding: 0.6rem 1rem 0.8rem;

    @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
      grid-template-columns: 1fr;
    }
  }
  .item {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.35rem 0;
    font-size: 0.92rem;
    color: ${({ theme }) => theme.colors.textSecondary};
    cursor: pointer;
  }
  .item.locked {
    opacity: 0.45;
    cursor: not-allowed;
  }
  input[type='checkbox'] {
    width: 17px;
    height: 17px;
    accent-color: ${({ theme }) => theme.colors.primary};
    cursor: inherit;
  }
`;

function GroupCheckbox({
  checked,
  indeterminate,
  disabled,
  onChange,
  label,
}: {
  checked: boolean;
  indeterminate: boolean;
  disabled: boolean;
  onChange: () => void;
  label: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);
  return (
    <label>
      <input ref={ref} type="checkbox" checked={checked} disabled={disabled} onChange={onChange} />
      {label}
    </label>
  );
}

function PermissionMatrix({
  groups,
  value,
  onChange,
  canGrant,
}: {
  groups: PermissionGroup[];
  value: string[];
  onChange: (permissions: string[]) => void;
  /** Permissões que o usuário logado pode conceder (proprietário: todas). */
  canGrant: (permission: string) => boolean;
}) {
  const selected = new Set(value);

  const toggle = (key: string) => {
    const next = new Set(selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onChange([...next]);
  };

  const toggleGroup = (group: PermissionGroup) => {
    const grantable = group.permissions.filter((p) => canGrant(p.key) || selected.has(p.key));
    const allOn = grantable.every((p) => selected.has(p.key));
    const next = new Set(selected);
    for (const permission of grantable) {
      if (allOn) next.delete(permission.key);
      else next.add(permission.key);
    }
    onChange([...next]);
  };

  return (
    <Matrix>
      {groups.map((group) => {
        const keys = group.permissions.map((p) => p.key);
        const on = keys.filter((k) => selected.has(k)).length;
        const groupLocked = group.permissions.every((p) => !canGrant(p.key) && !selected.has(p.key));
        return (
          <Group key={group.key}>
            <div className="head">
              <GroupCheckbox
                label={group.label}
                checked={on === keys.length}
                indeterminate={on > 0 && on < keys.length}
                disabled={groupLocked}
                onChange={() => toggleGroup(group)}
              />
              <span className="count">
                {on}/{keys.length}
              </span>
            </div>
            <div className="items">
              {group.permissions.map((permission) => {
                // Só se pode MARCAR o que se possui; desmarcar é sempre permitido.
                const locked = !canGrant(permission.key) && !selected.has(permission.key);
                return (
                  <label
                    key={permission.key}
                    className={`item${locked ? ' locked' : ''}`}
                    title={locked ? 'Você não possui esta permissão e não pode concedê-la.' : undefined}
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(permission.key)}
                      disabled={locked}
                      onChange={() => toggle(permission.key)}
                    />
                    {permission.label}
                  </label>
                );
              })}
            </div>
          </Group>
        );
      })}
    </Matrix>
  );
}

/* ── Formulário ──────────────────────────────────────── */

function RoleForm({
  role,
  groups,
  saving,
  onSubmit,
  onClose,
}: {
  role: RoleItem | null;
  groups: PermissionGroup[];
  saving: boolean;
  onSubmit: (body: { name: string; description: string | null; permissions: string[] }) => void;
  onClose: () => void;
}) {
  const { can } = useAuth();
  const [name, setName] = useState(role?.name ?? '');
  const [description, setDescription] = useState(role?.description ?? '');
  const [permissions, setPermissions] = useState<string[]>(role?.permissions ?? []);

  return (
    <Modal
      open
      variant="drawer"
      width="720px"
      title={role ? 'Editar cargo' : 'Novo cargo'}
      description={role ? undefined : 'Defina o que quem receber este cargo pode fazer.'}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" form="role-form" loading={saving}>
            Salvar cargo
          </Button>
        </>
      }
    >
      <FormStack
        id="role-form"
        onSubmit={(event: FormEvent) => {
          event.preventDefault();
          onSubmit({ name: name.trim(), description: description.trim() || null, permissions });
        }}
      >
        <TextField label="Nome do cargo" required minLength={2} maxLength={60} value={name} onChange={(e) => setName(e.target.value)} />
        <TextArea
          label="Descrição"
          rows={2}
          maxLength={300}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          hint="Ajuda a lembrar para que serve o cargo."
        />
        <div>
          <p style={{ fontWeight: 800, marginBottom: '0.6rem' }}>
            Permissões <span style={{ color: '#737373', fontWeight: 600 }}>({permissions.length} selecionadas)</span>
          </p>
          <PermissionMatrix groups={groups} value={permissions} onChange={setPermissions} canGrant={can} />
        </div>
        <Alert tone="info">
          As mudanças valem imediatamente para todos os usuários com este cargo. Você só pode conceder permissões que
          você mesmo possui.
        </Alert>
      </FormStack>
    </Modal>
  );
}

/* ── Página ──────────────────────────────────────────── */

export function Roles() {
  const { can } = useAuth();
  const { list, saving, save, remove } = useCrud<RoleItem>('/admin/roles', {
    saved: 'Cargo salvo.',
    removed: 'Cargo excluído.',
  });
  const catalog = useFetch<PermissionGroup[]>('/admin/permissions');
  const [editing, setEditing] = useState<RoleItem | 'new' | null>(null);
  const [deleting, setDeleting] = useState<RoleItem | null>(null);

  const roles = list.data ?? [];
  const totalPermissions = useMemo(
    () => (catalog.data ?? []).reduce((sum, group) => sum + group.permissions.length, 0),
    [catalog.data],
  );
  // Quem não é proprietário só gerencia cargos cujas permissões estão contidas nas suas.
  const manageable = (role: RoleItem) => role.permissions.every((permission) => can(permission));

  return (
    <>
      <PageHeader
        title="Cargos e permissões"
        description="Crie cargos e escolha exatamente o que cada um pode ver e fazer no painel."
        actions={
          can('roles.create') && (
            <Button onClick={() => setEditing('new')} disabled={!catalog.data}>
              <Plus size={18} aria-hidden /> Novo cargo
            </Button>
          )
        }
      />

      {list.error ? (
        <ErrorState message={list.error.message} onRetry={list.reload} />
      ) : list.loading && !list.data ? (
        <Skeleton $h="240px" />
      ) : roles.length === 0 ? (
        <EmptyState
          icon={<ShieldCheck size={36} aria-hidden />}
          title="Nenhum cargo criado"
          description="Crie o primeiro cargo para poder atribuir permissões à equipe."
        />
      ) : (
        <TableWrap>
          <Table>
            <thead>
              <tr>
                <th>Cargo</th>
                <th>Permissões</th>
                <th>Usuários</th>
                <th className="right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {roles.map((role) => {
                const canManage = manageable(role);
                return (
                  <tr key={role.id}>
                    <td>
                      <strong>{role.name}</strong>
                      {role.description && <small style={{ display: 'block', color: '#737373' }}>{role.description}</small>}
                    </td>
                    <td>
                      <StatusPill tone="primary">
                        {role.permissions.length}
                        {totalPermissions ? ` de ${totalPermissions}` : ''}
                      </StatusPill>
                    </td>
                    <td className="muted">
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Users size={15} aria-hidden /> {role._count?.users ?? 0}
                      </span>
                    </td>
                    <td className="right">
                      <RowActions>
                        {can('roles.edit') && canManage && (
                          <IconButton label={`Editar ${role.name}`} onClick={() => setEditing(role)} disabled={!catalog.data}>
                            <Pencil size={17} />
                          </IconButton>
                        )}
                        {can('roles.delete') && canManage && (
                          <IconButton label={`Excluir ${role.name}`} danger onClick={() => setDeleting(role)}>
                            <Trash2 size={17} />
                          </IconButton>
                        )}
                      </RowActions>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </TableWrap>
      )}

      {editing && catalog.data && (
        <RoleForm
          key={editing === 'new' ? 'new' : editing.id}
          role={editing === 'new' ? null : editing}
          groups={catalog.data}
          saving={saving}
          onSubmit={async (body) => {
            if (await save(editing === 'new' ? null : editing.id, body)) setEditing(null);
          }}
          onClose={() => setEditing(null)}
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        title="Excluir cargo"
        message={
          <>
            Excluir o cargo <strong>{deleting?.name}</strong>? Cargos atribuídos a usuários não podem ser excluídos:
            mude o cargo deles antes.
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
