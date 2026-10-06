import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { Logo } from '../../components/layout/Logo';
import { Button } from '../../components/ui/Button';
import { Alert, PageLoader } from '../../components/ui/Feedback';
import { TextField } from '../../components/ui/Form';
import { useAuth } from '../../context/auth-context';
import { usePageMeta } from '../../hooks/usePageMeta';
import { ApiError } from '../../lib/api';

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

const PasswordRow = styled.div`
  position: relative;

  button {
    position: absolute;
    right: 0.5rem;
    bottom: 0.5rem;
    display: grid;
    place-items: center;
    width: 34px;
    height: 34px;
    border-radius: ${({ theme }) => theme.radii.sm};
    color: ${({ theme }) => theme.colors.textMuted};
  }
  button:hover {
    color: ${({ theme }) => theme.colors.text};
  }
  input {
    padding-right: 3rem;
  }
`;

export function Login() {
  usePageMeta('Entrar');
  const { user, loading, login } = useAuth();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/admin';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (loading) return <PageLoader />;
  if (user) return <Navigate to={from} replace />;

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 429
          ? 'Muitas tentativas. Aguarde um minuto e tente novamente.'
          : err instanceof Error
            ? err.message
            : 'Não foi possível entrar.',
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
          <h1>Acesse o painel</h1>
          <p className="sub">Entre com a sua conta de administrador.</p>
        </header>

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
          <PasswordRow>
            <TextField
              label="Senha"
              type={show ? 'text' : 'password'}
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}>
              {show ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </PasswordRow>
          <Button type="submit" size="lg" block loading={submitting}>
            {!submitting && <LogIn size={18} aria-hidden />}
            Entrar
          </Button>
        </form>

        <Link className="back" to="/">
          ← Voltar ao site
        </Link>
      </Card>
    </Page>
  );
}
