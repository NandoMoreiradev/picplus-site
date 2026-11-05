import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import styled from 'styled-components';
import { KeyRound, Send } from 'lucide-react';
import { Logo } from '../../components/layout/Logo';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Feedback';
import { TextField } from '../../components/ui/Form';
import { usePageMeta } from '../../hooks/usePageMeta';
import { ApiError, api } from '../../lib/api';

const Page = styled.div`
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 1.5rem;
  background:
    radial-gradient(ellipse 60% 50% at 50% 0%, rgba(182, 232, 41, 0.14), transparent 70%),
    ${({ theme }) => theme.colors.background};
`;

const Card = styled.div`
  width: 100%;
  max-width: 420px;
  padding: 2.5rem 2.25rem;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.xl};
  box-shadow: ${({ theme }) => theme.shadows.overlay};

  header {
    margin-bottom: 2rem;
  }
  h1 {
    margin-top: 1.25rem;
    font-size: 1.6rem;
    font-weight: 800;
  }
  p.sub {
    margin-top: 0.3rem;
    color: ${({ theme }) => theme.colors.textSecondary};
  }
  form {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }
  .back {
    display: block;
    margin-top: 1.5rem;
    text-align: center;
    color: ${({ theme }) => theme.colors.textMuted};
    font-size: 0.9rem;
  }
`;

const MIN_PASSWORD = 8;

/** Passo 1: pede o e-mail e dispara o link de redefinição. */
export function ForgotPassword() {
  usePageMeta('Esqueci minha senha');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await api.post<{ message: string }>('/auth/forgot-password', { email: email.trim() });
      setMessage(res.message);
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 429
          ? 'Muitas tentativas. Aguarde um minuto e tente novamente.'
          : err instanceof Error
            ? err.message
            : 'Não foi possível enviar o link.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Page>
      <Card>
        <header>
          <Logo size="2rem" />
          <h1>Esqueci minha senha</h1>
          <p className="sub">Informe o e-mail da sua conta e enviaremos um link para criar uma nova senha.</p>
        </header>

        {message ? (
          <Alert tone="success">{message}</Alert>
        ) : (
          <form onSubmit={onSubmit}>
            {error && <Alert tone="danger">{error}</Alert>}
            <TextField
              label="E-mail"
              type="email"
              required
              autoComplete="username"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Button type="submit" size="lg" block loading={submitting}>
              {!submitting && <Send size={18} aria-hidden />}
              Enviar link
            </Button>
          </form>
        )}

        <Link className="back" to="/admin/login">
          ← Voltar ao login
        </Link>
      </Card>
    </Page>
  );
}

/** Passo 2: abre pelo link do e-mail (?token=...) e grava a nova senha. */
export function ResetPassword() {
  usePageMeta('Redefinir senha');
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    if (password.length < MIN_PASSWORD) {
      setError(`A senha deve ter ao menos ${MIN_PASSWORD} caracteres.`);
      return;
    }
    if (password !== confirm) {
      setError('As senhas não coincidem.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/auth/reset-password', { token, newPassword: password });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível redefinir a senha.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Page>
      <Card>
        <header>
          <Logo size="2rem" />
          <h1>Criar nova senha</h1>
          <p className="sub">Escolha uma senha com pelo menos {MIN_PASSWORD} caracteres.</p>
        </header>

        {done ? (
          <Alert tone="success">Senha atualizada com sucesso! Já pode entrar no painel com a nova senha.</Alert>
        ) : !token ? (
          <Alert tone="danger">Link inválido. Solicite um novo link de redefinição.</Alert>
        ) : (
          <form onSubmit={onSubmit}>
            {error && <Alert tone="danger">{error}</Alert>}
            <TextField
              label="Nova senha"
              type="password"
              required
              autoComplete="new-password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <TextField
              label="Confirmar nova senha"
              type="password"
              required
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
            <Button type="submit" size="lg" block loading={submitting}>
              {!submitting && <KeyRound size={18} aria-hidden />}
              Salvar nova senha
            </Button>
          </form>
        )}

        <Link className="back" to={done ? '/admin/login' : '/admin/esqueci-senha'}>
          {done ? '← Ir para o login' : 'Solicitar novo link'}
        </Link>
      </Card>
    </Page>
  );
}
