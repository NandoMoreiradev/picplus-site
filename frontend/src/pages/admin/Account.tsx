import { useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import styled from 'styled-components';
import { FormStack, PageHeader, Panel } from '../../components/admin/AdminUI';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Feedback';
import { TextField } from '../../components/ui/Form';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../context/auth-context';
import { api } from '../../lib/api';
import type { AuthUser } from '../../lib/types';
import { errorMessage } from '../../lib/validation';

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

const Stack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const AvatarRow = styled.div`
  display: flex;
  align-items: center;
  gap: 1.25rem;
  flex-wrap: wrap;
  margin-bottom: 1.5rem;

  .actions {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .buttons {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  .hint {
    color: ${({ theme }) => theme.colors.textMuted};
    font-size: 0.8rem;
  }
  input[type='file'] {
    display: none;
  }
`;

const Card = styled(Panel)`
  max-width: 520px;
  padding: 1.75rem;

  h2 {
    font-size: 1.2rem;
    font-weight: 800;
    margin-bottom: 0.25rem;
  }
  p.sub {
    color: ${({ theme }) => theme.colors.textSecondary};
    margin-bottom: 1.5rem;
  }
`;

function ProfileCard({ user }: { user: AuthUser }) {
  const { setUser } = useAuth();
  const toast = useToast();
  const fileInput = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(user.name);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);

  const saveName = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    const trimmed = name.trim();
    if (trimmed.length < 2) return setError('Informe seu nome.');

    setSaving(true);
    try {
      setUser(await api.patch<AuthUser>('/auth/me', { name: trimmed }));
      setName(trimmed);
      toast.success('Nome atualizado.');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const changePhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = ''; // permite escolher o mesmo arquivo de novo
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast.error('Escolha uma imagem (JPG, PNG ou WebP).');
    if (file.size > MAX_AVATAR_BYTES) return toast.error('A imagem deve ter no máximo 5 MB.');

    setPhotoBusy(true);
    try {
      const form = new FormData();
      form.append('file', file);
      setUser(await api.postForm<AuthUser>('/auth/me/avatar', form));
      toast.success('Foto atualizada.');
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setPhotoBusy(false);
    }
  };

  const removePhoto = async () => {
    setPhotoBusy(true);
    try {
      setUser(await api.delete<AuthUser>('/auth/me/avatar'));
      toast.success('Foto removida.');
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setPhotoBusy(false);
    }
  };

  return (
    <Card>
      <h2>Perfil</h2>
      <p className="sub">Seu nome e sua foto aparecem apenas no painel.</p>
      <AvatarRow>
        <Avatar key={user.avatarUrl ?? 'none'} src={user.avatarUrl} name={user.name} size={88} />
        <div className="actions">
          <div className="buttons">
            <Button variant="secondary" size="sm" loading={photoBusy} onClick={() => fileInput.current?.click()}>
              {user.avatarUrl ? 'Trocar foto' : 'Enviar foto'}
            </Button>
            {user.avatarUrl && (
              <Button variant="ghost" size="sm" disabled={photoBusy} onClick={removePhoto}>
                Remover
              </Button>
            )}
          </div>
          <span className="hint">JPG, PNG ou WebP, até 5 MB. Será recortada em formato quadrado.</span>
          <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" onChange={changePhoto} />
        </div>
      </AvatarRow>
      <FormStack onSubmit={saveName}>
        {error && <Alert tone="danger">{error}</Alert>}
        <TextField
          label="Nome"
          required
          minLength={2}
          maxLength={120}
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <TextField label="E-mail" value={user.email} disabled hint="O e-mail é o seu login e não pode ser alterado aqui." />
        <div>
          <Button type="submit" loading={saving} disabled={name.trim() === user.name}>
            Salvar nome
          </Button>
        </div>
      </FormStack>
    </Card>
  );
}

export function Account() {
  const { user } = useAuth();
  const toast = useToast();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    if (next.length < 8) return setError('A nova senha deve ter ao menos 8 caracteres.');
    if (next !== confirm) return setError('A confirmação não confere com a nova senha.');

    setBusy(true);
    try {
      await api.patch('/auth/password', { currentPassword: current, newPassword: next });
      toast.success('Senha alterada com sucesso.');
      setCurrent('');
      setNext('');
      setConfirm('');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title="Minha conta" description={`${user?.name} · ${user?.email}`} />
      <Stack>
        {user && <ProfileCard user={user} />}
        <Card>
          <h2>Alterar senha</h2>
          <p className="sub">Use uma senha longa e exclusiva para o painel.</p>
          <FormStack onSubmit={submit}>
            {error && <Alert tone="danger">{error}</Alert>}
            <TextField
              label="Senha atual"
              type="password"
              required
              autoComplete="current-password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
            />
            <TextField
              label="Nova senha"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              hint="Mínimo de 8 caracteres."
            />
            <TextField
              label="Confirmar nova senha"
              type="password"
              required
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
            <div>
              <Button type="submit" loading={busy}>
                Salvar nova senha
              </Button>
            </div>
          </FormStack>
        </Card>
      </Stack>
    </>
  );
}
