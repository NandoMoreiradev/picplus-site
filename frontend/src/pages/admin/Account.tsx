import { useState } from 'react';
import type { FormEvent } from 'react';
import styled from 'styled-components';
import { FormStack, PageHeader, Panel } from '../../components/admin/AdminUI';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Feedback';
import { TextField } from '../../components/ui/Form';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../context/auth-context';
import { api } from '../../lib/api';
import { errorMessage } from '../../lib/validation';

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
    </>
  );
}
