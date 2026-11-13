import { type FormEvent, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import styled from 'styled-components';
import { ArrowLeft, GraduationCap, KeyRound, LogIn, UserPlus } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Container, Section } from '../../../components/ui/Layout';
import { useStudentAuth } from '../../../context/student-auth-context';
import { usePageMeta } from '../../../hooks/usePageMeta';
import { trackEvent } from '../../../lib/analytics';
import { api } from '../../../lib/api';

const AuthBox = styled.div`
  max-width: 480px;
  margin: 0 auto;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  border-radius: ${({ theme }) => theme.radii.xl};
  padding: 2.25rem;
  box-shadow: ${({ theme }) => theme.shadows.card};

  .icon-top {
    width: 48px;
    height: 48px;
    border-radius: ${({ theme }) => theme.radii.md};
    background: ${({ theme }) => theme.colors.primarySoft};
    border: 1px solid ${({ theme }) => theme.colors.primaryBorder};
    color: ${({ theme }) => theme.colors.primary};
    display: grid;
    place-items: center;
    margin-bottom: 1.15rem;
  }

  h1 {
    font-size: 1.55rem;
    margin: 0 0 0.4rem 0;
  }

  p.sub {
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 0.9rem;
    margin: 0 0 1.5rem 0;
  }

  form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;

    label {
      font-size: 0.82rem;
      font-weight: 600;
      color: ${({ theme }) => theme.colors.textSecondary};
    }

    input {
      padding: 0.7rem 0.9rem;
      border-radius: ${({ theme }) => theme.radii.md};
      border: 1px solid ${({ theme }) => theme.colors.borderStrong};
      background: ${({ theme }) => theme.colors.background};
      color: ${({ theme }) => theme.colors.text};
      font-size: 0.92rem;
    }
  }

  .msg-err {
    padding: 0.7rem 0.9rem;
    border-radius: ${({ theme }) => theme.radii.md};
    background: ${({ theme }) => theme.colors.dangerSoft};
    color: ${({ theme }) => theme.colors.danger};
    font-size: 0.85rem;
  }

  .msg-ok {
    padding: 0.7rem 0.9rem;
    border-radius: ${({ theme }) => theme.radii.md};
    background: ${({ theme }) => theme.colors.successSoft};
    color: ${({ theme }) => theme.colors.success};
    font-size: 0.85rem;
  }

  .links {
    margin-top: 1.35rem;
    padding-top: 1.1rem;
    border-top: 1px solid ${({ theme }) => theme.colors.border};
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    font-size: 0.86rem;
    color: ${({ theme }) => theme.colors.textSecondary};

    a,
    button {
      color: ${({ theme }) => theme.colors.primary};
      font-weight: 600;
      background: none;
      border: 0;
      padding: 0;
      cursor: pointer;
      text-align: left;
    }
  }
`;

export function AcademyAuth() {
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { student, login, register } = useStudentAuth();

  const redirectUrl = searchParams.get('redirect') || '/academy/minha-area';
  const resetToken = searchParams.get('token') || '';

  const initialMode = pathname.includes('cadastro')
    ? 'register'
    : pathname.includes('redefinir-senha')
      ? 'reset'
      : 'login';

  const [forgotOverride, setForgotOverride] = useState(false);
  const mode: 'login' | 'register' | 'forgot' | 'reset' =
    forgotOverride && initialMode === 'login' ? 'forgot' : initialMode;
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [cpf, setCpf] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (student && mode !== 'reset') {
      navigate(redirectUrl, { replace: true });
    }
  }, [student, mode, navigate, redirectUrl]);

  usePageMeta(
    mode === 'register'
      ? 'Criar Conta — PicPlus Academy'
      : mode === 'reset'
        ? 'Redefinir Senha — PicPlus Academy'
        : 'Área do Aluno — PicPlus Academy',
    'Acesse seus cursos, materiais complementares e certificados na PicPlus Academy.',
  );

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      if (mode === 'login') {
        await login(email.trim(), password);
        trackEvent('login', { method: 'academy_auth' });
        navigate(redirectUrl, { replace: true });
      } else if (mode === 'register') {
        await register({
          name: name.trim(),
          email: email.trim(),
          password,
          phone: phone.trim() || undefined,
          cpf: cpf.trim() || undefined,
        });
        trackEvent('sign_up', { method: 'academy_auth' });
        navigate(redirectUrl, { replace: true });
      } else if (mode === 'forgot') {
        const res = await api.post<{ message: string }>('/academy/auth/forgot-password', {
          email: email.trim(),
        });
        setSuccessMsg(res.message);
      } else if (mode === 'reset') {
        const res = await api.post<{ message: string }>('/academy/auth/reset-password', {
          token: resetToken,
          newPassword: password,
        });
        setSuccessMsg(res.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocorreu um erro. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Section>
      <Container>
        <div style={{ maxWidth: 480, margin: '0 auto 1rem auto' }}>
          <Link
            to="/academy"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: '0.86rem',
              color: '#A3A3A3',
            }}
          >
            <ArrowLeft size={15} /> Voltar para o catálogo da Academy
          </Link>
        </div>

        <AuthBox>
          <div className="icon-top">
            {mode === 'register' ? (
              <UserPlus size={22} />
            ) : mode === 'forgot' || mode === 'reset' ? (
              <KeyRound size={22} />
            ) : (
              <GraduationCap size={22} />
            )}
          </div>

          {mode === 'login' && (
            <>
              <h1>Entrar na Área do Aluno</h1>
              <p className="sub">Acesse seus cursos, aulas e certificados da PicPlus Academy.</p>
            </>
          )}
          {mode === 'register' && (
            <>
              <h1>Criar conta de aluno</h1>
              <p className="sub">
                Cadastre-se gratuitamente para adquirir cursos e acompanhar seu progresso.
              </p>
            </>
          )}
          {mode === 'forgot' && (
            <>
              <h1>Recuperar senha</h1>
              <p className="sub">
                Informe seu e-mail cadastrado e enviaremos um link para redefinir sua senha.
              </p>
            </>
          )}
          {mode === 'reset' && (
            <>
              <h1>Definir nova senha</h1>
              <p className="sub">Crie uma nova senha segura para sua conta da PicPlus Academy.</p>
            </>
          )}

          {error && <div className="msg-err">{error}</div>}
          {successMsg && <div className="msg-ok">{successMsg}</div>}

          <form onSubmit={handleSubmit}>
            {mode === 'register' && (
              <div className="field">
                <label htmlFor="st-name">Nome completo *</label>
                <input
                  id="st-name"
                  type="text"
                  required
                  minLength={2}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Como aparecerá no seu certificado"
                />
              </div>
            )}

            {mode !== 'reset' && (
              <div className="field">
                <label htmlFor="st-email">E-mail *</label>
                <input
                  id="st-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="voce@exemplo.com"
                />
              </div>
            )}

            {mode !== 'forgot' && (
              <div className="field">
                <label htmlFor="st-pass">
                  {mode === 'reset' ? 'Nova senha (mín. 6 caracteres) *' : 'Senha *'}
                </label>
                <input
                  id="st-pass"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••"
                />
              </div>
            )}

            {mode === 'register' && (
              <>
                <div className="field">
                  <label htmlFor="st-phone">WhatsApp / Telefone (opcional)</label>
                  <input
                    id="st-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(11) 99999-9999"
                  />
                </div>
                <div className="field">
                  <label htmlFor="st-cpf">CPF (opcional — para emissão de certificado)</label>
                  <input
                    id="st-cpf"
                    type="text"
                    value={cpf}
                    onChange={(e) => setCpf(e.target.value)}
                    placeholder="000.000.000-00"
                  />
                </div>
              </>
            )}

            <Button type="submit" size="lg" block disabled={submitting}>
              {submitting ? (
                'Aguarde…'
              ) : mode === 'login' ? (
                <>
                  <LogIn size={17} /> Entrar na minha conta
                </>
              ) : mode === 'register' ? (
                <>
                  <UserPlus size={17} /> Criar minha conta
                </>
              ) : mode === 'forgot' ? (
                'Enviar link de recuperação'
              ) : (
                'Salvar nova senha'
              )}
            </Button>
          </form>

          <div className="links">
            {mode === 'login' && (
              <>
                <div>
                  Ainda não tem conta?{' '}
                  <Link to={`/academy/cadastro?redirect=${encodeURIComponent(redirectUrl)}`}>
                    Criar conta grátis
                  </Link>
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setSuccessMsg(null);
                      setForgotOverride(true);
                    }}
                  >
                    Esqueci minha senha
                  </button>
                </div>
              </>
            )}

            {mode === 'register' && (
              <div>
                Já possui conta?{' '}
                <Link to={`/academy/entrar?redirect=${encodeURIComponent(redirectUrl)}`}>
                  Fazer login
                </Link>
              </div>
            )}

            {(mode === 'forgot' || mode === 'reset') && (
              <div>
                Lembrou a senha?{' '}
                <Link
                  to="/academy/entrar"
                  onClick={() => {
                    setError(null);
                    setSuccessMsg(null);
                    setForgotOverride(false);
                  }}
                >
                  Voltar para o login
                </Link>
              </div>
            )}
          </div>
        </AuthBox>
      </Container>
    </Section>
  );
}
