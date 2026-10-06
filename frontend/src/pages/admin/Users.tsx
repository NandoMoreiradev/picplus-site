import { useState } from 'react';
import type { FormEvent } from 'react';
import styled from 'styled-components';
import { Check, Copy, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
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
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { Alert, EmptyState, ErrorState, Skeleton } from '../../components/ui/Feedback';
import { FormGrid, SelectField, Switch, TextField } from '../../components/ui/Form';
import { ConfirmDialog, Modal } from '../../components/ui/Modal';
import { useAuth } from '../../context/auth-context';
import { useCrud } from '../../hooks/useCrud';
import { useFetch } from '../../hooks/useFetch';
import { formatShortDate } from '../../lib/format';
import type { AdminUser } from '../../lib/types';

/** Senha aleatória de 16 caracteres, sem símbolos ambíguos (0/O, 1/l/I). */
function generatePassword(length = 16): string {
  const alphabet = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = new Uint32Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('');
}

const PasswordRow = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 0.5rem;

  > div:first-child {
    flex: 1;
  }
`;

interface FormState {
  name: string;
  email: string;
  roleId: string;
  isOwner: boolean;
  active: boolean;
  password: string;
}

function UserForm({
  user,
  saving,
  onSubmit,
  onClose,
}: {
  user: AdminUser | null;
  saving: boolean;
  onSubmit: (form: FormState) => void;
  onClose: () => void;
}) {
  const { user: me } = useAuth();
  const roles = useFetch<{ id: string; name: string }[]>('/admin/roles/options');
  const [form, setForm] = useState<FormState>({
    name: user?.name ?? '',
    email: user?.email ?? '',
    roleId: user?.role?.id ?? '',
    isOwner: user?.isOwner ?? false,
    active: user?.active ?? true,
    password: '',
  });
  const [copied, setCopied] = useState(false);
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));
  const isSelf = !!user && user.id === me?.id;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(form.password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard indisponível */
    }
  };

  return (
    <Modal
      open
      variant="drawer"
      width="580px"
      title={user ? 'Editar usuário' : 'Novo usuário'}
      description={user ? user.email : 'Defina o acesso inicial. A pessoa pode trocar a senha depois em Minha conta.'}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" form="user-form" loading={saving}>
            {user ? 'Salvar' : 'Criar usuário'}
          </Button>
        </>
      }
    >
      <FormStack
        id="user-form"
        onSubmit={(event: FormEvent) => {
          event.preventDefault();
          onSubmit(form);
        }}
      >
        <FormGrid>
          <TextField label="Nome" required minLength={2} value={form.name} onChange={(e) => set('name', e.target.value)} />
          <TextField
            label="E-mail"
            type="email"
            required
            autoComplete="off"
            value={form.email}
            onChange={(e) => set('email', e.target.value)}
          />
        </FormGrid>

        <SelectField
          label="Cargo"
          required={!form.isOwner}
          placeholder={form.isOwner ? 'Sem cargo (proprietário tem tudo)' : 'Selecione…'}
          options={(roles.data ?? []).map((role) => ({ value: role.id, label: role.name }))}
          value={form.roleId}
          onChange={(e) => set('roleId', e.target.value)}
          hint="O cargo define o que a pessoa pode ver e fazer."
        />

        <PasswordRow>
          <TextField
            label={user ? 'Nova senha' : 'Senha'}
            required={!user}
            minLength={8}
            autoComplete="new-password"
            value={form.password}
            onChange={(e) => set('password', e.target.value)}
            hint={
              user
                ? 'Deixe em branco para manter a senha atual.'
                : 'Mínimo de 8 caracteres. Envie à pessoa por um canal seguro.'
            }
          />
          <Button variant="secondary" onClick={() => set('password', generatePassword())} title="Gerar senha segura">
            <RefreshCw size={16} aria-hidden /> Gerar
          </Button>
          <Button variant="ghost" onClick={copy} disabled={!form.password} aria-label="Copiar senha">
            {copied ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />}
          </Button>
        </PasswordRow>

        <Switch
          checked={form.active}
          onChange={(value) => set('active', value)}
          disabled={isSelf}
          label="Usuário ativo"
          description={
            isSelf ? 'Você não pode desativar o próprio usuário.' : 'Desativados não conseguem entrar e perdem a sessão na hora.'
          }
        />

        {me?.isOwner && (
          <Switch
            checked={form.isOwner}
            onChange={(value) => set('isOwner', value)}
            label="Proprietário"
            description="Acesso total, independente de cargo. Use com cuidado."
          />
        )}
        {form.isOwner && (
          <Alert tone="warning">Proprietários podem tudo, inclusive gerenciar outros usuários e cargos.</Alert>
        )}
      </FormStack>
    </Modal>
  );
}

export function Users() {
  const { user: me, can } = useAuth();
  const { list, saving, save, remove } = useCrud<AdminUser>('/admin/users', {
    saved: 'Usuário salvo.',
    removed: 'Usuário excluído.',
  });
  const [editing, setEditing] = useState<AdminUser | 'new' | null>(null);
  const [deleting, setDeleting] = useState<AdminUser | null>(null);
  const users = list.data ?? [];

  const submit = async (form: FormState) => {
    const isNew = editing === 'new';
    const body: Record<string, unknown> = {
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      active: form.active,
      roleId: form.roleId || (isNew ? undefined : null),
    };
    if (me?.isOwner) body.isOwner = form.isOwner;
    if (form.password) body.password = form.password;

    const id = editing && editing !== 'new' ? editing.id : null;
    if (await save(id, body)) setEditing(null);
  };

  // O botão só aparece quando a ação é possível; o servidor revalida tudo.
  const canTouch = (target: AdminUser) => !target.isOwner || !!me?.isOwner;

  return (
    <>
      <PageHeader
        title="Usuários"
        description="Pessoas da equipe com acesso ao painel e o cargo de cada uma."
        actions={
          can('users.create') && (
            <Button onClick={() => setEditing('new')}>
              <Plus size={18} aria-hidden /> Novo usuário
            </Button>
          )
        }
      />

      {list.error ? (
        <ErrorState message={list.error.message} onRetry={list.reload} />
      ) : list.loading && !list.data ? (
        <Skeleton $h="240px" />
      ) : users.length === 0 ? (
        <EmptyState title="Nenhum usuário" description="Convide a primeira pessoa da equipe." />
      ) : (
        <TableWrap>
          <Table>
            <thead>
              <tr>
                <th>Usuário</th>
                <th>Cargo</th>
                <th>Status</th>
                <th>Criado em</th>
                <th className="right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {users.map((person) => (
                <tr key={person.id}>
                  <td>
                    <CellMain>
                      <Avatar name={person.name} size={42} />
                      <div>
                        <strong>
                          {person.name}
                          {person.id === me?.id && <span style={{ color: '#737373', fontWeight: 600 }}> (você)</span>}
                        </strong>
                        <small>{person.email}</small>
                      </div>
                    </CellMain>
                  </td>
                  <td>
                    {person.isOwner ? (
                      <StatusPill tone="primary">Proprietário</StatusPill>
                    ) : person.role ? (
                      <StatusPill tone="neutral">{person.role.name}</StatusPill>
                    ) : (
                      <StatusPill tone="warning">Sem cargo</StatusPill>
                    )}
                  </td>
                  <td>
                    <StatusPill tone={person.active ? 'success' : 'danger'}>{person.active ? 'Ativo' : 'Desativado'}</StatusPill>
                  </td>
                  <td className="muted">{formatShortDate(person.createdAt)}</td>
                  <td className="right">
                    <RowActions>
                      {can('users.edit') && canTouch(person) && (
                        <IconButton label={`Editar ${person.name}`} onClick={() => setEditing(person)}>
                          <Pencil size={17} />
                        </IconButton>
                      )}
                      {can('users.delete') && canTouch(person) && person.id !== me?.id && (
                        <IconButton label={`Excluir ${person.name}`} danger onClick={() => setDeleting(person)}>
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
        <UserForm
          key={editing === 'new' ? 'new' : editing.id}
          user={editing === 'new' ? null : editing}
          saving={saving}
          onSubmit={submit}
          onClose={() => setEditing(null)}
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        title="Excluir usuário"
        message={
          <>
            Excluir <strong>{deleting?.name}</strong>? A pessoa perde o acesso imediatamente. Para apenas bloquear o
            acesso, desative o usuário em vez de excluir.
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
