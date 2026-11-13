import { type FormEvent, useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import styled from 'styled-components';
import {
  ArrowLeft,
  Award,
  CheckCircle2,
  Clock,
  CreditCard,
  Eye,
  EyeOff,
  FileText,
  Lock,
  MessageCircle,
  QrCode,
  ShieldCheck,
  Sparkles,
  Tag,
  UserCheck,
  UserPlus,
} from 'lucide-react';
import { Button, ButtonLink } from '../../../components/ui/Button';
import { ErrorState, Skeleton } from '../../../components/ui/Feedback';
import { Container, Section } from '../../../components/ui/Layout';
import { useStudentAuth } from '../../../context/student-auth-context';
import { usePageMeta } from '../../../hooks/usePageMeta';
import { api, assetUrl } from '../../../lib/api';
import {
  COURSE_LEVEL_LABEL,
  formatCentsBRL,
  studentApi,
  studentTokenStore,
  type CheckoutResponse,
  type CouponValidationResult,
  type Course,
  type StudentEnrolledCourse,
} from '../../../lib/academy';

/* ── Estilos da Página de Checkout ────────────────────────── */

const CheckoutHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2rem;
  padding-bottom: 1.25rem;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  flex-wrap: wrap;
  gap: 0.75rem 1rem;

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    margin-bottom: 1.25rem;
    padding-bottom: 1rem;
  }

  .back-link {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.88rem;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.textSecondary};
    text-decoration: none;
    transition: color ${({ theme }) => theme.transitions.fast};

    &:hover {
      color: ${({ theme }) => theme.colors.primary};
    }
  }

  .security-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    font-size: 0.82rem;
    font-weight: 700;
    color: ${({ theme }) => theme.colors.success};
    background: ${({ theme }) => theme.colors.successSoft};
    padding: 0.35rem 0.85rem;
    border-radius: ${({ theme }) => theme.radii.pill};
    border: 1px solid rgba(74, 222, 128, 0.2);
    max-width: 100%;

    @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
      font-size: 0.75rem;
      padding: 0.3rem 0.7rem;
    }
  }
`;

const MobileCourseBanner = styled.div`
  display: none;

  @media (max-width: ${({ theme }) => theme.breakpoints.laptop}) {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.85rem;
    background: ${({ theme }) => theme.colors.surface};
    border: 1px solid ${({ theme }) => theme.colors.borderStrong};
    border-radius: ${({ theme }) => theme.radii.lg};
    padding: 0.85rem 1rem;
    margin-bottom: 1.25rem;
    min-width: 0;
    width: 100%;
  }

  .banner-left {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    min-width: 0;
    flex: 1;

    .thumb {
      width: 56px;
      height: 40px;
      border-radius: ${({ theme }) => theme.radii.sm};
      overflow: hidden;
      background: #111;
      flex-shrink: 0;
      display: grid;
      place-items: center;
      color: ${({ theme }) => theme.colors.primary};

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
    }

    .info {
      display: flex;
      flex-direction: column;
      min-width: 0;

      strong {
        font-size: 0.9rem;
        line-height: 1.25;
        color: ${({ theme }) => theme.colors.text};
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      a {
        font-size: 0.76rem;
        color: ${({ theme }) => theme.colors.textSecondary};
        text-decoration: underline;
        margin-top: 0.15rem;
      }
    }
  }

  .banner-price {
    font-size: 1.05rem;
    font-weight: 800;
    color: ${({ theme }) => theme.colors.primary};
    white-space: nowrap;
    flex-shrink: 0;
  }
`;

const CheckoutGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 420px;
  gap: 2.5rem;
  align-items: start;
  width: 100%;
  min-width: 0;

  & > * {
    min-width: 0;
  }

  @media (max-width: ${({ theme }) => theme.breakpoints.laptop}) {
    grid-template-columns: minmax(0, 1fr);
    gap: 1.5rem;
  }
`;

const CheckoutCard = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  border-radius: ${({ theme }) => theme.radii.xl};
  padding: 2rem;
  box-shadow: ${({ theme }) => theme.shadows.card};
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  min-width: 0;
  width: 100%;

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    padding: 1.15rem;
    border-radius: ${({ theme }) => theme.radii.lg};
    gap: 1.15rem;
  }

  .card-title {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-size: 1.15rem;
    font-weight: 700;
    margin: 0;

    .card-icon {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: ${({ theme }) => theme.colors.primarySoft};
      border: 1px solid ${({ theme }) => theme.colors.primaryBorder};
      color: ${({ theme }) => theme.colors.primary};
      display: grid;
      place-items: center;
      flex-shrink: 0;
    }
  }
`;

const AuthTabs = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  background: ${({ theme }) => theme.colors.background};
  padding: 0.3rem;
  border-radius: ${({ theme }) => theme.radii.lg};
  border: 1px solid ${({ theme }) => theme.colors.border};
  gap: 0.35rem;
  min-width: 0;
  width: 100%;

  @media (max-width: 340px) {
    grid-template-columns: 1fr;
  }

  button {
    min-width: 0;
    padding: 0.65rem 0.85rem;
    font-size: 0.88rem;
    font-weight: 700;
    border-radius: ${({ theme }) => theme.radii.md};
    border: 0;
    background: transparent;
    color: ${({ theme }) => theme.colors.textSecondary};
    cursor: pointer;
    transition: all ${({ theme }) => theme.transitions.fast};
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;

    @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
      padding: 0.6rem 0.45rem;
      font-size: 0.8rem;
      gap: 0.35rem;
    }

    &.active {
      background: ${({ theme }) => theme.colors.surface};
      color: ${({ theme }) => theme.colors.text};
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    }
  }
`;

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  min-width: 0;

  label {
    font-size: 0.84rem;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.textSecondary};
    overflow-wrap: break-word;

    span.req {
      color: ${({ theme }) => theme.colors.primary};
      margin-left: 0.2rem;
    }
    span.opt {
      color: ${({ theme }) => theme.colors.textMuted};
      font-weight: 400;
      font-size: 0.78rem;
      margin-left: 0.35rem;
    }
  }

  .input-wrap {
    position: relative;
    display: flex;
    align-items: center;
    min-width: 0;
    width: 100%;

    input {
      width: 100%;
      min-width: 0;
      padding: 0.75rem 0.95rem;
      border-radius: ${({ theme }) => theme.radii.md};
      border: 1px solid ${({ theme }) => theme.colors.borderStrong};
      background: ${({ theme }) => theme.colors.background};
      color: ${({ theme }) => theme.colors.text};
      font-size: 0.94rem;
      transition: border-color ${({ theme }) => theme.transitions.fast};

      &:focus {
        outline: none;
        border-color: ${({ theme }) => theme.colors.primary};
        box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.primarySoft};
      }
    }

    button.toggle-pw {
      position: absolute;
      right: 0.75rem;
      background: transparent;
      border: 0;
      color: ${({ theme }) => theme.colors.textMuted};
      cursor: pointer;
      display: grid;
      place-items: center;
      padding: 0.25rem;

      &:hover {
        color: ${({ theme }) => theme.colors.text};
      }
    }
  }

  .hint {
    font-size: 0.78rem;
    color: ${({ theme }) => theme.colors.textMuted};
  }
`;

const FormGridTwo = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 1rem;
  min-width: 0;

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

const AlertBox = styled.div<{ $type?: 'error' | 'success' | 'info' }>`
  padding: 0.85rem 1.15rem;
  border-radius: ${({ theme }) => theme.radii.md};
  font-size: 0.88rem;
  line-height: 1.5;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  min-width: 0;
  max-width: 100%;
  overflow-wrap: anywhere;

  ${({ $type = 'info', theme }) => {
    switch ($type) {
      case 'error':
        return `background: ${theme.colors.dangerSoft}; color: ${theme.colors.danger}; border: 1px solid rgba(239, 68, 68, 0.2);`;
      case 'success':
        return `background: ${theme.colors.successSoft}; color: ${theme.colors.success}; border: 1px solid rgba(74, 222, 128, 0.2);`;
      default:
        return `background: ${theme.colors.primarySoft}; color: ${theme.colors.primary}; border: 1px solid ${theme.colors.primaryBorder};`;
    }
  }}

  button {
    align-self: flex-start;
    text-align: left;
    background: none;
    border: 0;
    color: inherit;
    font-weight: 700;
    text-decoration: underline;
    cursor: pointer;
    padding: 0;
    font-size: 0.86rem;
  }
`;

const LoggedCard = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  padding: 1.15rem;
  background: ${({ theme }) => theme.colors.background};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  gap: 0.85rem 1rem;
  min-width: 0;

  .user-info {
    display: flex;
    align-items: center;
    gap: 0.85rem;
    min-width: 0;
    flex: 1 1 200px;

    .avatar {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: ${({ theme }) => theme.colors.primarySoft};
      border: 1px solid ${({ theme }) => theme.colors.primaryBorder};
      color: ${({ theme }) => theme.colors.primary};
      display: grid;
      place-items: center;
      font-weight: 800;
      font-size: 1rem;
      flex-shrink: 0;
    }

    .details {
      display: flex;
      flex-direction: column;
      min-width: 0;

      strong {
        font-size: 0.95rem;
        color: ${({ theme }) => theme.colors.text};
        overflow-wrap: anywhere;
      }
      span {
        font-size: 0.82rem;
        color: ${({ theme }) => theme.colors.textSecondary};
        overflow-wrap: anywhere;
      }
    }
  }

  button.change-btn {
    font-size: 0.82rem;
    color: ${({ theme }) => theme.colors.textMuted};
    background: transparent;
    border: 0;
    cursor: pointer;
    text-decoration: underline;
    flex-shrink: 0;

    &:hover {
      color: ${({ theme }) => theme.colors.primary};
    }
  }
`;

const PaymentTrustStrip = styled.div`
  padding: 1rem 1.15rem;
  border-radius: ${({ theme }) => theme.radii.lg};
  background: ${({ theme }) => theme.colors.background};
  border: 1px solid ${({ theme }) => theme.colors.border};
  display: flex;
  flex-direction: column;
  gap: 0.65rem;

  .trust-header {
    display: flex;
    align-items: flex-start;
    gap: 0.55rem;
    font-size: 0.84rem;
    color: ${({ theme }) => theme.colors.textSecondary};
    line-height: 1.45;

    svg {
      color: ${({ theme }) => theme.colors.success};
      flex-shrink: 0;
      margin-top: 2px;
    }

    strong {
      color: ${({ theme }) => theme.colors.text};
    }
  }

  .accepted-methods {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem 1.15rem;
    font-size: 0.78rem;
    color: ${({ theme }) => theme.colors.textMuted};
    padding-top: 0.6rem;
    border-top: 1px dashed ${({ theme }) => theme.colors.border};

    .method-item {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;

      svg {
        color: ${({ theme }) => theme.colors.primary};
      }

      strong {
        color: ${({ theme }) => theme.colors.textSecondary};
        font-weight: 600;
      }
    }
  }
`;

/* ── Coluna Direita (Resumo do Pedido) ────────────────────── */

const StickySummary = styled.aside`
  position: sticky;
  top: 96px;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  border-radius: ${({ theme }) => theme.radii.xl};
  overflow: hidden;
  box-shadow: ${({ theme }) => theme.shadows.card};
  min-width: 0;
  width: 100%;

  @media (max-width: ${({ theme }) => theme.breakpoints.laptop}) {
    position: static;
    top: auto;
  }

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    border-radius: ${({ theme }) => theme.radii.lg};
  }

  .cover-box {
    aspect-ratio: 16 / 9;
    background: #111;
    position: relative;
    overflow: hidden;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }

  .summary-content {
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    min-width: 0;

    @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
      padding: 1.15rem;
      gap: 1rem;
    }
  }

  .course-headline {
    min-width: 0;
    h2 {
      font-size: 1.25rem;
      font-weight: 800;
      margin: 0 0 0.35rem 0;
      line-height: 1.3;
      overflow-wrap: break-word;
    }
    p {
      font-size: 0.86rem;
      color: ${({ theme }) => theme.colors.textSecondary};
      margin: 0;
      line-height: 1.5;
      overflow-wrap: break-word;
    }
  }

  .badges-row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;

    span {
      padding: 0.2rem 0.65rem;
      border-radius: ${({ theme }) => theme.radii.pill};
      font-size: 0.74rem;
      font-weight: 700;
      background: ${({ theme }) => theme.colors.background};
      border: 1px solid ${({ theme }) => theme.colors.border};
      color: ${({ theme }) => theme.colors.textSecondary};
    }
  }

  .coupon-box {
    border-top: 1px solid ${({ theme }) => theme.colors.border};
    padding-top: 1.15rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    min-width: 0;

    .coupon-row {
      display: flex;
      gap: 0.5rem;
      min-width: 0;
      width: 100%;

      @media (max-width: 360px) {
        flex-direction: column;
      }

      input {
        flex: 1;
        min-width: 0;
        width: 100%;
        padding: 0.6rem 0.8rem;
        border-radius: ${({ theme }) => theme.radii.md};
        border: 1px solid ${({ theme }) => theme.colors.borderStrong};
        background: ${({ theme }) => theme.colors.background};
        color: ${({ theme }) => theme.colors.text};
        font-size: 0.86rem;
        text-transform: uppercase;
      }

      button {
        flex-shrink: 0;
      }
    }
  }

  .pricing-table {
    border-top: 1px solid ${({ theme }) => theme.colors.border};
    padding-top: 1.15rem;
    display: flex;
    flex-direction: column;
    gap: 0.65rem;

    .row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.9rem;
      color: ${({ theme }) => theme.colors.textSecondary};

      &.discount {
        color: ${({ theme }) => theme.colors.success};
      }

      &.total {
        font-size: 1.3rem;
        font-weight: 800;
        color: ${({ theme }) => theme.colors.primary};
        border-top: 1px dashed ${({ theme }) => theme.colors.border};
        padding-top: 0.65rem;
        margin-top: 0.25rem;
      }
    }
  }

  .perks-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.55rem;
    font-size: 0.84rem;
    color: ${({ theme }) => theme.colors.textSecondary};

    li {
      display: flex;
      align-items: center;
      gap: 0.55rem;
    }
  }
`;

/* ── Funções de Formatação ───────────────────────────────── */

function formatCPF(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 11);
  return digits
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1-$2');
}

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 10) {
    return digits
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  }
  return digits
    .replace(/^(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2');
}

/* ── Componente Principal ────────────────────────────────── */

export function AcademyCheckoutPage() {
  const { slug = '' } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const { student, logout, setStudent } = useStudentAuth();

  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEnrolled, setIsEnrolled] = useState(false);

  // Modo de identificação do visitante: 'register' (criar conta) ou 'login' (já tem conta)
  const [authTab, setAuthTab] = useState<'register' | 'login'>('register');

  // Campos de Cadastro
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [cpf, setCpf] = useState('');
  const [phone, setPhone] = useState('');

  // Campos de Login Rápido
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Cupom de Desconto
  const initialCoupon = searchParams.get('coupon') || '';
  const [couponInput, setCouponInput] = useState(initialCoupon.toUpperCase());
  const [couponResult, setCouponResult] = useState<CouponValidationResult | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  // Submissão do Checkout
  const [submitting, setSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [isEmailConflict, setIsEmailConflict] = useState(false);

  usePageMeta(
    course ? `Checkout: ${course.title} — PicPlus Academy` : 'Checkout — PicPlus Academy',
    'Finalize sua matrícula com segurança na PicPlus Academy.',
  );

  // 1. Validação de Cupom
  const validateCouponCode = useCallback(async (code: string, courseId: string) => {
    setValidatingCoupon(true);
    setCouponError(null);
    try {
      const res = await api.post<CouponValidationResult>('/academy/coupons/validate', {
        code: code.trim().toUpperCase(),
        courseId,
      });
      setCouponResult(res);
    } catch (err) {
      setCouponResult(null);
      setCouponError(err instanceof Error ? err.message : 'Cupom inválido ou expirado.');
    } finally {
      setValidatingCoupon(false);
    }
  }, []);

  // 2. Carrega dados do curso
  const loadCourse = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const detail = await api.get<Course>(`/academy/courses/${slug}`);
      setCourse(detail);
      // Se veio cupom via query string, valida automaticamente
      if (initialCoupon.trim()) {
        validateCouponCode(initialCoupon.trim(), detail.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Curso não encontrado.');
    } finally {
      setLoading(false);
    }
  }, [slug, initialCoupon, validateCouponCode]);

  useEffect(() => {
    let active = true;
    api
      .get<Course>(`/academy/courses/${slug}`)
      .then((detail) => {
        if (!active) return;
        setCourse(detail);
        setError(null);
        // Se veio cupom via query string, valida automaticamente
        if (initialCoupon.trim()) {
          validateCouponCode(initialCoupon.trim(), detail.id);
        }
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Curso não encontrado.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [slug, initialCoupon, validateCouponCode]);

  // 3. Se já estiver logado, verifica se já tem matrícula ativa
  useEffect(() => {
    if (!student || !course) return;
    let active = true;
    studentApi
      .get<StudentEnrolledCourse[]>('/academy/my-courses')
      .then((list) => {
        if (active) {
          setIsEnrolled(list.some((item) => item.course.id === course.id));
        }
      })
      .catch(() => {
        if (active) setIsEnrolled(false);
      });
    return () => {
      active = false;
    };
  }, [student, course]);

  const handleApplyCoupon = () => {
    if (!course || !couponInput.trim()) return;
    validateCouponCode(couponInput, course.id);
  };

  // 4. Submissão Unificada do Checkout
  const handleProceedCheckout = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (!course) return;

    setSubmitting(true);
    setCheckoutError(null);
    setIsEmailConflict(false);

    try {
      let result: CheckoutResponse;

      if (student) {
        // Aluno já logado: usa o checkout direto
        const resolvedCpf = cpf.trim() || (student.cpf ? formatCPF(student.cpf) : '');
        const resolvedPhone = phone.trim() || (student.phone ? formatPhone(student.phone) : '');
        result = await studentApi.post<CheckoutResponse>('/academy/checkout', {
          courseId: course.id,
          couponCode: couponResult?.code || undefined,
          cpf: resolvedCpf || undefined,
          phone: resolvedPhone || undefined,
        });
      } else if (authTab === 'register') {
        // Visitante criando conta no ato da compra
        if (!name.trim()) throw new Error('Informe seu nome completo.');
        if (!email.trim() || !email.includes('@')) throw new Error('Informe um e-mail válido.');
        if (password.length < 6) throw new Error('A senha deve ter no mínimo 6 caracteres.');

        result = await api.post<CheckoutResponse>('/academy/checkout/register-and-buy', {
          courseId: course.id,
          couponCode: couponResult?.code || undefined,
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          cpf: cpf.trim() || undefined,
          phone: phone.trim() || undefined,
        });

        // Salva token e loga o aluno na hora
        if (result.accessToken) {
          studentTokenStore.set(result.accessToken);
        }
        if (result.student) {
          setStudent(result.student);
        }
      } else {
        // Visitante optou por logar e comprar na mesma tela
        if (!loginEmail.trim()) throw new Error('Informe seu e-mail.');
        if (!loginPassword) throw new Error('Informe sua senha.');

        result = await api.post<CheckoutResponse>('/academy/checkout/login-and-buy', {
          courseId: course.id,
          couponCode: couponResult?.code || undefined,
          email: loginEmail.trim().toLowerCase(),
          password: loginPassword,
        });

        if (result.accessToken) {
          studentTokenStore.set(result.accessToken);
        }
        if (result.student) {
          setStudent(result.student);
        }
      }

      // Redirecionamento de sucesso
      if (result.freeEnrollment) {
        // Curso gratuito: vai direto para a sala de aula!
        navigate(`/academy/aula/${course.slug}`);
        return;
      }

      if (result.checkoutUrl) {
        // Redireciona para o Mercado Pago (ou simulador em dev)
        window.location.href = result.checkoutUrl;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Não foi possível iniciar o checkout.';
      if (
        msg.toLowerCase().includes('já existe uma conta') ||
        msg.toLowerCase().includes('já existe')
      ) {
        setIsEmailConflict(true);
      }
      setCheckoutError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const switchToLoginWithEmail = () => {
    setLoginEmail(email);
    setAuthTab('login');
    setIsEmailConflict(false);
    setCheckoutError(null);
  };

  if (loading) {
    return (
      <Section>
        <Container>
          <Skeleton $h="480px" $radius="24px" />
        </Container>
      </Section>
    );
  }

  if (error || !course) {
    return (
      <Section>
        <Container>
          <ErrorState message={error ?? 'Curso não encontrado.'} onRetry={loadCourse} />
        </Container>
      </Section>
    );
  }

  const modules = course.modules ?? [];
  const totalLessons = modules.reduce((acc, m) => acc + m.lessons.length, 0);
  const finalPriceCents = couponResult ? couponResult.finalPriceCents : course.priceCents;
  const isFree = finalPriceCents === 0;

  return (
    <Section $tight>
      <Container>
        {/* Cabeçalho minimalista de checkout */}
        <CheckoutHeader>
          <Link to={`/academy/curso/${course.slug}`} className="back-link">
            <ArrowLeft size={16} /> Voltar aos detalhes do curso
          </Link>
          <div className="security-badge">
            <ShieldCheck size={15} /> Checkout Seguro PicPlus Academy
          </div>
        </CheckoutHeader>

        {isEnrolled && (
          <div style={{ marginBottom: '1.75rem' }}>
            <AlertBox $type="success">
              <strong>Você já possui acesso ativo a este curso!</strong>
              <span>Não é necessário realizar uma nova compra.</span>
              <ButtonLink
                to={`/academy/aula/${course.slug}`}
                $size="sm"
                style={{ marginTop: '0.4rem' }}
              >
                Acessar Sala de Aula Agora
              </ButtonLink>
            </AlertBox>
          </div>
        )}

        {/* Resumo compacto visível apenas em telas menores que laptop */}
        <MobileCourseBanner>
          <div className="banner-left">
            <div className="thumb">
              {course.coverImage ? (
                <img src={assetUrl(course.coverImage)} alt={course.title} />
              ) : (
                <Award size={20} />
              )}
            </div>
            <div className="info">
              <strong>{course.title}</strong>
              <a href="#resumo-pedido">Ver detalhes / aplicar cupom</a>
            </div>
          </div>
          <div className="banner-price">
            {isFree ? 'Gratuito' : formatCentsBRL(finalPriceCents)}
          </div>
        </MobileCourseBanner>

        <CheckoutGrid>
          {/* ── Coluna Esquerda: Identificação do Aluno e Finalização ── */}
          <div>
            <CheckoutCard>
              <h2 className="card-title">
                <span className="card-icon">
                  <UserCheck size={17} />
                </span>
                <span>Identificação do Aluno</span>
              </h2>

              {student ? (
                // Se já estiver logado
                <>
                  <LoggedCard>
                    <div className="user-info">
                      <div className="avatar">
                        {student.avatarUrl ? (
                          <img
                            src={assetUrl(student.avatarUrl)}
                            alt={student.name}
                            style={{ width: '100%', height: '100%', borderRadius: '50%' }}
                          />
                        ) : (
                          student.name.slice(0, 2).toUpperCase()
                        )}
                      </div>
                      <div className="details">
                        <strong>{student.name}</strong>
                        <span>{student.email}</span>
                      </div>
                    </div>
                    <button type="button" className="change-btn" onClick={logout}>
                      Trocar de conta
                    </button>
                  </LoggedCard>

                  {/* Campos adicionais opcionais se faltarem no perfil */}
                  {(!student.cpf || !student.phone) && (
                    <FormGridTwo>
                      {!student.cpf && (
                        <Field>
                          <label htmlFor="checkout-cpf">
                            CPF <span className="opt">(recomendado para nota e Pix)</span>
                          </label>
                          <div className="input-wrap">
                            <input
                              id="checkout-cpf"
                              type="text"
                              placeholder="000.000.000-00"
                              value={cpf}
                              onChange={(e) => setCpf(formatCPF(e.target.value))}
                            />
                          </div>
                        </Field>
                      )}
                      {!student.phone && (
                        <Field>
                          <label htmlFor="checkout-phone">
                            WhatsApp / Telefone <span className="opt">(para avisos do curso)</span>
                          </label>
                          <div className="input-wrap">
                            <input
                              id="checkout-phone"
                              type="tel"
                              placeholder="(00) 00000-0000"
                              value={phone}
                              onChange={(e) => setPhone(formatPhone(e.target.value))}
                            />
                          </div>
                        </Field>
                      )}
                    </FormGridTwo>
                  )}
                </>
              ) : (
                // Se não estiver logado: alternador entre Criar Conta e Já Tenho Conta
                <>
                  <AuthTabs>
                    <button
                      type="button"
                      className={authTab === 'register' ? 'active' : ''}
                      onClick={() => {
                        setAuthTab('register');
                        setCheckoutError(null);
                        setIsEmailConflict(false);
                      }}
                    >
                      <UserPlus size={16} /> Criar nova conta
                    </button>
                    <button
                      type="button"
                      className={authTab === 'login' ? 'active' : ''}
                      onClick={() => {
                        setAuthTab('login');
                        setCheckoutError(null);
                        setIsEmailConflict(false);
                      }}
                    >
                      <UserCheck size={16} /> Já sou aluno
                    </button>
                  </AuthTabs>

                  {isEmailConflict && (
                    <AlertBox $type="info">
                      <span>
                        Já identificamos uma conta com o e-mail <strong>{email}</strong> na PicPlus
                        Academy!
                      </span>
                      <button type="button" onClick={switchToLoginWithEmail}>
                        Clique aqui para entrar com sua senha e concluir a compra
                      </button>
                    </AlertBox>
                  )}

                  {authTab === 'register' ? (
                    // Formulário de Criação de Conta no Ato da Compra
                    <form
                      id="checkout-form"
                      onSubmit={handleProceedCheckout}
                      style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
                    >
                      <Field>
                        <label htmlFor="reg-name">
                          Nome Completo <span className="req">*</span>
                        </label>
                        <div className="input-wrap">
                          <input
                            id="reg-name"
                            type="text"
                            placeholder="Como aparecerá no seu certificado"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                          />
                        </div>
                      </Field>

                      <Field>
                        <label htmlFor="reg-email">
                          E-mail <span className="req">*</span>
                        </label>
                        <div className="input-wrap">
                          <input
                            id="reg-email"
                            type="email"
                            placeholder="exemplo@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                          />
                        </div>
                        <span className="hint">
                          Seu login e os dados de acesso ao curso serão enviados para este e-mail.
                        </span>
                      </Field>

                      <Field>
                        <label htmlFor="reg-password">
                          Criar Senha de Acesso <span className="req">*</span>
                        </label>
                        <div className="input-wrap">
                          <input
                            id="reg-password"
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Mínimo de 6 caracteres"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={6}
                          />
                          <button
                            type="button"
                            className="toggle-pw"
                            onClick={() => setShowPassword(!showPassword)}
                            aria-label={showPassword ? 'Ocultar senha' : 'Ver senha'}
                          >
                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </Field>

                      <FormGridTwo>
                        <Field>
                          <label htmlFor="reg-cpf">
                            CPF <span className="opt">(recomendado para nota e Pix)</span>
                          </label>
                          <div className="input-wrap">
                            <input
                              id="reg-cpf"
                              type="text"
                              placeholder="000.000.000-00"
                              value={cpf}
                              onChange={(e) => setCpf(formatCPF(e.target.value))}
                            />
                          </div>
                        </Field>

                        <Field>
                          <label htmlFor="reg-phone">
                            WhatsApp / Telefone <span className="opt">(opcional)</span>
                          </label>
                          <div className="input-wrap">
                            <input
                              id="reg-phone"
                              type="tel"
                              placeholder="(00) 00000-0000"
                              value={phone}
                              onChange={(e) => setPhone(formatPhone(e.target.value))}
                            />
                          </div>
                        </Field>
                      </FormGridTwo>
                    </form>
                  ) : (
                    // Formulário de Login Rápido
                    <form
                      id="checkout-form"
                      onSubmit={handleProceedCheckout}
                      style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
                    >
                      <Field>
                        <label htmlFor="login-email">
                          E-mail da sua conta <span className="req">*</span>
                        </label>
                        <div className="input-wrap">
                          <input
                            id="login-email"
                            type="email"
                            placeholder="Seu e-mail cadastrado"
                            value={loginEmail}
                            onChange={(e) => setLoginEmail(e.target.value)}
                            required
                          />
                        </div>
                      </Field>

                      <Field>
                        <label htmlFor="login-password">
                          Sua Senha <span className="req">*</span>
                        </label>
                        <div className="input-wrap">
                          <input
                            id="login-password"
                            type={showLoginPassword ? 'text' : 'password'}
                            placeholder="Sua senha atual"
                            value={loginPassword}
                            onChange={(e) => setLoginPassword(e.target.value)}
                            required
                          />
                          <button
                            type="button"
                            className="toggle-pw"
                            onClick={() => setShowLoginPassword(!showLoginPassword)}
                            aria-label={showLoginPassword ? 'Ocultar senha' : 'Ver senha'}
                          >
                            {showLoginPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                        <div style={{ textAlign: 'right', marginTop: '0.2rem' }}>
                          <Link
                            to="/academy/redefinir-senha"
                            target="_blank"
                            style={{
                              fontSize: '0.78rem',
                              color: '#A3A3A3',
                              textDecoration: 'underline',
                            }}
                          >
                            Esqueceu sua senha?
                          </Link>
                        </div>
                      </Field>
                    </form>
                  )}
                </>
              )}

              {checkoutError && !isEmailConflict && (
                <AlertBox $type="error">{checkoutError}</AlertBox>
              )}

              {isFree && (
                <AlertBox $type="success">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Sparkles size={18} />
                    <strong>Matrícula 100% Gratuita!</strong>
                  </div>
                  <span>
                    Nenhum valor será cobrado. Conclua sua matrícula para ativar seu acesso
                    imediatamente e começar a assistir às aulas!
                  </span>
                </AlertBox>
              )}

              <Button
                type="button"
                size="lg"
                block
                disabled={submitting || isEnrolled}
                onClick={() => handleProceedCheckout()}
              >
                {submitting ? (
                  'Processando…'
                ) : isEnrolled ? (
                  'Já Matriculado'
                ) : isFree ? (
                  <>
                    <Sparkles size={18} /> Concluir Matrícula Gratuita
                  </>
                ) : (
                  <>
                    <Lock size={18} /> Ir para o Pagamento Seguro
                  </>
                )}
              </Button>

              {!isFree && (
                <PaymentTrustStrip>
                  <div className="trust-header">
                    <ShieldCheck size={16} />
                    <span>
                      Pagamento 100% seguro processado pelo <strong>Mercado Pago</strong>. Você
                      escolherá como pagar na próxima tela:
                    </span>
                  </div>
                  <div className="accepted-methods">
                    <span className="method-item">
                      <QrCode size={14} /> <strong>Pix</strong> (aprovação imediata)
                    </span>
                    <span className="method-item">
                      <CreditCard size={14} /> <strong>Cartão</strong> (em até 12x)
                    </span>
                    <span className="method-item">
                      <FileText size={14} /> <strong>Boleto</strong> (até 3 dias úteis)
                    </span>
                  </div>
                </PaymentTrustStrip>
              )}
            </CheckoutCard>
          </div>

          {/* ── Coluna Direita: Resumo do Pedido (Sticky) ── */}
          <StickySummary id="resumo-pedido" style={{ scrollMarginTop: '92px' }}>
            <div className="cover-box">
              {course.coverImage ? (
                <img src={assetUrl(course.coverImage)} alt={course.title} />
              ) : (
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    display: 'grid',
                    placeItems: 'center',
                    background: '#1c1c1c',
                    color: '#B6E829',
                  }}
                >
                  <Award size={48} />
                </div>
              )}
            </div>

            <div className="summary-content">
              <div className="course-headline">
                <div className="badges-row" style={{ marginBottom: '0.65rem' }}>
                  {course.category && <span>{course.category}</span>}
                  <span>{COURSE_LEVEL_LABEL[course.level]}</span>
                  {course.workloadHours > 0 && (
                    <span>
                      <Clock size={11} style={{ display: 'inline', marginRight: 4 }} />
                      {course.workloadHours}h
                    </span>
                  )}
                </div>
                <h2>{course.title}</h2>
                {course.subtitle && <p>{course.subtitle}</p>}
              </div>

              {/* Cupom de Desconto */}
              {course.priceCents > 0 && (
                <div className="coupon-box">
                  <label
                    htmlFor="checkout-coupon-input"
                    style={{
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      color: '#A3A3A3',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <Tag size={13} /> Tem um cupom de desconto?
                  </label>
                  <div className="coupon-row">
                    <input
                      id="checkout-coupon-input"
                      type="text"
                      placeholder="EX: PICPLUS10"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={handleApplyCoupon}
                      disabled={validatingCoupon || !couponInput.trim()}
                    >
                      {validatingCoupon ? '…' : 'Aplicar'}
                    </Button>
                  </div>
                  {couponResult && (
                    <div style={{ color: '#4ade80', fontSize: '0.8rem', fontWeight: 600 }}>
                      ✓ Cupom <strong>{couponResult.code}</strong> aplicado! Desconto de{' '}
                      {formatCentsBRL(couponResult.discountCents)}.
                    </div>
                  )}
                  {couponError && (
                    <div style={{ color: '#ef4444', fontSize: '0.8rem' }}>{couponError}</div>
                  )}
                </div>
              )}

              {/* Tabela de Preços */}
              <div className="pricing-table">
                <div className="row">
                  <span>Preço original</span>
                  <span>{formatCentsBRL(course.priceCents)}</span>
                </div>

                {couponResult && couponResult.discountCents > 0 && (
                  <div className="row discount">
                    <span>Desconto ({couponResult.code})</span>
                    <span>- {formatCentsBRL(couponResult.discountCents)}</span>
                  </div>
                )}

                <div className="row total">
                  <span>Total</span>
                  <span>{isFree ? 'Gratuito' : formatCentsBRL(finalPriceCents)}</span>
                </div>
              </div>

              {/* Botão de Ação CTA */}
              <Button
                type="button"
                size="lg"
                block
                disabled={submitting || isEnrolled}
                onClick={() => handleProceedCheckout()}
              >
                {submitting ? (
                  'Processando…'
                ) : isEnrolled ? (
                  'Já Matriculado'
                ) : isFree ? (
                  <>
                    <Sparkles size={18} /> Concluir Matrícula Gratuita
                  </>
                ) : (
                  <>
                    <Lock size={18} /> Ir para o Pagamento Seguro
                  </>
                )}
              </Button>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexWrap: 'wrap',
                  gap: '0.45rem',
                  fontSize: '0.78rem',
                  color: '#737373',
                  textAlign: 'center',
                }}
              >
                <Lock size={13} style={{ flexShrink: 0 }} /> Dados 100% protegidos com criptografia SSL 256-bit
              </div>

              {/* Benefícios Inclusos */}
              <ul className="perks-list">
                <li>
                  <CheckCircle2 size={15} color="#B6E829" /> Acesso imediato às {totalLessons} aulas
                </li>
                <li>
                  <Award size={15} color="#B6E829" /> Certificado oficial com verificação digital
                </li>
                <li>
                  <ShieldCheck size={15} color="#B6E829" /> Garantia incondicional de 7 dias
                </li>
              </ul>

              <div
                style={{
                  marginTop: '1.25rem',
                  paddingTop: '1rem',
                  borderTop: '1px solid #262626',
                  textAlign: 'center',
                }}
              >
                <a
                  href={`https://wa.me/557991424233?text=${encodeURIComponent(
                    `Olá! Preciso de ajuda com a compra do curso ${course.title} na PicPlus Academy.`,
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexWrap: 'wrap',
                    gap: 7,
                    fontSize: '0.8rem',
                    color: '#A3A3A3',
                    textDecoration: 'none',
                  }}
                >
                  <MessageCircle size={14} color="#B6E829" style={{ flexShrink: 0 }} /> Dúvidas na compra? WhatsApp: (79) 9142-4233
                </a>
              </div>
            </div>
          </StickySummary>
        </CheckoutGrid>
      </Container>
    </Section>
  );
}
