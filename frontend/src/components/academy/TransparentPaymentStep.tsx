import { useCallback, useEffect, useRef, useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { CardPayment, initMercadoPago } from '@mercadopago/sdk-react';
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  ExternalLink,
  Lock,
  PlayCircle,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { Button, ButtonLink } from '../ui/Button';
import {
  formatCentsBRL,
  studentApi,
  type Course,
  type CourseOrderItem,
  type PayOrderResponse,
  type StudentProfile,
} from '../../lib/academy';
import { centsToReais } from '../../lib/analytics';

let initializedMpPublicKey = '';

function ensureMercadoPagoInit(publicKey: string) {
  if (!publicKey || initializedMpPublicKey === publicKey) return;
  initMercadoPago(publicKey, { locale: 'pt-BR' });
  initializedMpPublicKey = publicKey;
}

function formatCPF(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 11);
  return digits
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1-$2');
}

function formatCountdown(msRemaining: number): string {
  if (msRemaining <= 0) return '00:00';
  const totalSec = Math.floor(msRemaining / 1000);
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

const pulse = keyframes`
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.45; transform: scale(0.85); }
`;

const StepContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  min-width: 0;
`;

const OrderBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.75rem;
  padding: 0.85rem 1rem;
  background: ${({ theme }) => theme.colors.background};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};

  .buyer-summary {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    min-width: 0;

    strong {
      font-size: 0.88rem;
      color: ${({ theme }) => theme.colors.text};
      overflow-wrap: anywhere;
    }

    span {
      font-size: 0.78rem;
      color: ${({ theme }) => theme.colors.textSecondary};
      overflow-wrap: anywhere;
    }
  }

  button.edit-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.8rem;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.textSecondary};
    background: transparent;
    border: 1px solid ${({ theme }) => theme.colors.borderStrong};
    border-radius: ${({ theme }) => theme.radii.md};
    padding: 0.4rem 0.75rem;
    cursor: pointer;
    transition: all ${({ theme }) => theme.transitions.fast};

    &:hover {
      border-color: ${({ theme }) => theme.colors.primary};
      color: ${({ theme }) => theme.colors.primary};
    }
  }
`;

const MethodTabs = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;

  @media (max-width: 460px) {
    grid-template-columns: 1fr;
  }

  button.method-tab {
    position: relative;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.95rem 1rem;
    border-radius: ${({ theme }) => theme.radii.lg};
    border: 1px solid ${({ theme }) => theme.colors.borderStrong};
    background: ${({ theme }) => theme.colors.background};
    color: ${({ theme }) => theme.colors.textSecondary};
    cursor: pointer;
    text-align: left;
    transition: all ${({ theme }) => theme.transitions.fast};

    &:hover {
      border-color: ${({ theme }) => theme.colors.primaryBorder};
      color: ${({ theme }) => theme.colors.text};
    }

    &.active {
      border-color: ${({ theme }) => theme.colors.primary};
      background: ${({ theme }) => theme.colors.primarySoft};
      color: ${({ theme }) => theme.colors.text};
      box-shadow: 0 0 0 1px ${({ theme }) => theme.colors.primaryBorder};
    }

    .tab-icon {
      width: 36px;
      height: 36px;
      border-radius: ${({ theme }) => theme.radii.md};
      background: ${({ theme }) => theme.colors.surface};
      border: 1px solid ${({ theme }) => theme.colors.border};
      color: ${({ theme }) => theme.colors.primary};
      display: grid;
      place-items: center;
      flex-shrink: 0;
    }

    .tab-copy {
      display: flex;
      flex-direction: column;
      gap: 0.1rem;
      min-width: 0;

      strong {
        font-size: 0.92rem;
        font-weight: 700;
        color: ${({ theme }) => theme.colors.text};
      }

      span {
        font-size: 0.75rem;
        color: ${({ theme }) => theme.colors.textSecondary};
      }
    }

    .fast-badge {
      position: absolute;
      top: -9px;
      right: 12px;
      padding: 0.15rem 0.55rem;
      border-radius: ${({ theme }) => theme.radii.pill};
      background: ${({ theme }) => theme.colors.primary};
      color: ${({ theme }) => theme.colors.textDark};
      font-size: 0.66rem;
      font-weight: 800;
      letter-spacing: 0.02em;
      text-transform: uppercase;
    }
  }
`;

const PaymentPanel = styled.div`
  background: ${({ theme }) => theme.colors.background};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: 1.35rem;
  display: flex;
  flex-direction: column;
  gap: 1.1rem;

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    padding: 1rem;
  }
`;

const PixQrBox = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  text-align: center;

  .status-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.38rem 0.9rem;
    border-radius: ${({ theme }) => theme.radii.pill};
    background: ${({ theme }) => theme.colors.warningSoft};
    color: ${({ theme }) => theme.colors.warning};
    font-size: 0.8rem;
    font-weight: 700;

    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: currentColor;
      animation: ${pulse} 1.4s ease-in-out infinite;
    }
  }

  .qr-frame {
    background: #ffffff;
    padding: 14px;
    border-radius: 18px;
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.45);
    display: grid;
    place-items: center;

    img {
      width: 210px;
      height: 210px;
      display: block;
      object-fit: contain;
    }
  }

  .timer-note {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.8rem;
    color: ${({ theme }) => theme.colors.textSecondary};
  }

  .copy-group {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    text-align: left;

    label {
      font-size: 0.78rem;
      font-weight: 600;
      color: ${({ theme }) => theme.colors.textSecondary};
    }

    .code-row {
      display: flex;
      gap: 0.5rem;

      @media (max-width: 480px) {
        flex-direction: column;
      }

      input {
        flex: 1;
        min-width: 0;
        padding: 0.7rem 0.85rem;
        border-radius: ${({ theme }) => theme.radii.md};
        border: 1px solid ${({ theme }) => theme.colors.borderStrong};
        background: ${({ theme }) => theme.colors.surface};
        color: ${({ theme }) => theme.colors.textSecondary};
        font-size: 0.8rem;
        font-family: monospace;
      }
    }
  }
`;

const CpfInlineField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.4rem;

  label {
    font-size: 0.84rem;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.textSecondary};

    span {
      color: ${({ theme }) => theme.colors.primary};
    }
  }

  input {
    width: 100%;
    padding: 0.75rem 0.95rem;
    border-radius: ${({ theme }) => theme.radii.md};
    border: 1px solid ${({ theme }) => theme.colors.borderStrong};
    background: ${({ theme }) => theme.colors.surface};
    color: ${({ theme }) => theme.colors.text};
    font-size: 0.94rem;

    &:focus {
      outline: none;
      border-color: ${({ theme }) => theme.colors.primary};
      box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.primarySoft};
    }
  }

  .hint {
    font-size: 0.76rem;
    color: ${({ theme }) => theme.colors.textMuted};
  }
`;

const FeedbackBanner = styled.div<{ $tone: 'error' | 'info' | 'warning' | 'success' }>`
  padding: 0.9rem 1rem;
  border-radius: ${({ theme }) => theme.radii.md};
  font-size: 0.86rem;
  line-height: 1.5;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;

  ${({ $tone, theme }) => {
    if ($tone === 'error') {
      return `background: ${theme.colors.dangerSoft}; color: ${theme.colors.danger}; border: 1px solid rgba(239, 68, 68, 0.25);`;
    }
    if ($tone === 'warning') {
      return `background: ${theme.colors.warningSoft}; color: ${theme.colors.warning}; border: 1px solid rgba(245, 158, 11, 0.25);`;
    }
    if ($tone === 'success') {
      return `background: ${theme.colors.successSoft}; color: ${theme.colors.success}; border: 1px solid rgba(34, 197, 94, 0.25);`;
    }
    return `background: ${theme.colors.primarySoft}; color: ${theme.colors.primary}; border: 1px solid ${theme.colors.primaryBorder};`;
  }}

  .banner-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 700;
  }

  button.inline-action {
    align-self: flex-start;
    background: none;
    border: 0;
    padding: 0;
    color: inherit;
    font-weight: 700;
    text-decoration: underline;
    cursor: pointer;
    font-size: 0.84rem;
  }
`;

const BrickWrapper = styled.div`
  position: relative;
  min-height: 220px;

  /* Ajusta o contêiner do Brick ao tema escuro da PicPlus */
  .mp-brick-skeleton {
    padding: 1.25rem;
    border-radius: ${({ theme }) => theme.radii.md};
    background: ${({ theme }) => theme.colors.surface};
    border: 1px dashed ${({ theme }) => theme.colors.borderStrong};
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 0.86rem;
    text-align: center;
  }
`;

const SuccessCard = styled.div`
  padding: 2rem 1.5rem;
  border-radius: ${({ theme }) => theme.radii.lg};
  background: ${({ theme }) => theme.colors.background};
  border: 1px solid rgba(34, 197, 94, 0.35);
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;

  .success-icon {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    background: ${({ theme }) => theme.colors.successSoft};
    color: ${({ theme }) => theme.colors.success};
    display: grid;
    place-items: center;
  }

  h3 {
    margin: 0;
    font-size: 1.4rem;
    color: ${({ theme }) => theme.colors.text};
  }

  p {
    margin: 0;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 0.92rem;
    line-height: 1.55;
    max-width: 440px;
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.75rem;
    margin-top: 0.5rem;
  }
`;

export interface ActiveTransparentOrder {
  orderId: string;
  finalPriceCents: number;
  publicKey: string;
  simulated: boolean;
  initialPix?: {
    qrCode: string;
    qrCodeBase64?: string | null;
    ticketUrl?: string | null;
    expiresAt?: string | null;
  } | null;
}

interface Props {
  course: Course;
  student: StudentProfile;
  order: ActiveTransparentOrder;
  initialCpf: string;
  onBackToEdit: () => void;
  onApproved: (info: { orderId: string; paymentMethod?: string | null }) => void;
}

export function TransparentPaymentStep({
  course,
  student,
  order,
  initialCpf,
  onBackToEdit,
  onApproved,
}: Props) {
  const [method, setMethod] = useState<'pix' | 'credit_card'>('pix');
  const [cpfInput, setCpfInput] = useState(() =>
    formatCPF(initialCpf || student.cpf || ''),
  );

  // Estado do Pix
  const [pixLoading, setPixLoading] = useState(false);
  const [pixData, setPixData] = useState<{
    qrCode: string;
    qrCodeBase64?: string | null;
    ticketUrl?: string | null;
    expiresAt?: string | null;
    simulated?: boolean;
  } | null>(order.initialPix ?? null);
  const [copiedPix, setCopiedPix] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());

  // Estado do Cartão e Status Geral
  const [brickReady, setBrickReady] = useState(false);
  const [brickError, setBrickError] = useState<string | null>(null);
  const [processingCard, setProcessingCard] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [pendingReviewMessage, setPendingReviewMessage] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [approvedState, setApprovedState] = useState<{
    approved: boolean;
    paymentMethod?: string | null;
  }>({ approved: false });

  const approvedNotifiedRef = useRef(false);

  const resolvedPublicKey =
    order.publicKey || (import.meta.env.VITE_MP_PUBLIC_KEY as string | undefined) || '';

  useEffect(() => {
    if (resolvedPublicKey) {
      ensureMercadoPagoInit(resolvedPublicKey);
    }
  }, [resolvedPublicKey]);

  const markAsApproved = useCallback(
    (paymentMethod?: string | null) => {
      if (approvedNotifiedRef.current) return;
      approvedNotifiedRef.current = true;
      setApprovedState({ approved: true, paymentMethod });
      onApproved({ orderId: order.orderId, paymentMethod });
    },
    [onApproved, order.orderId],
  );

  // Countdown do Pix
  useEffect(() => {
    if (!pixData?.expiresAt) return;
    const id = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => window.clearInterval(id);
  }, [pixData?.expiresAt]);

  const countdownLabel = pixData?.expiresAt
    ? (() => {
        const diff = new Date(pixData.expiresAt).getTime() - nowMs;
        return diff > 0 ? formatCountdown(diff) : 'Expirado';
      })()
    : '';

  // Verificação manual / polling automático para Pix ou Cartão em análise
  const checkOrderStatus = useCallback(
    async (opts?: { simulated?: boolean }) => {
      try {
        const res = await studentApi.get<CourseOrderItem>(
          `/academy/orders/${order.orderId}/verify`,
          opts?.simulated ? { simulated: '1', status: 'approved' } : undefined,
        );
        if (res.status === 'APPROVED') {
          markAsApproved(res.paymentMethod);
          return true;
        }
        if (res.status === 'REJECTED' || res.status === 'CANCELED') {
          setPendingReviewMessage(null);
          setPaymentError(
            res.rejectionMessage ||
              'O pagamento não foi autorizado. Tente outro cartão ou pague via Pix.',
          );
          return true;
        }
      } catch {
        /* silencioso durante polling */
      }
      return false;
    },
    [markAsApproved, order.orderId],
  );

  useEffect(() => {
    if (approvedState.approved) return;
    if (!pixData && !pendingReviewMessage) return;

    const interval = window.setInterval(() => {
      void checkOrderStatus();
    }, 3000);

    return () => window.clearInterval(interval);
  }, [approvedState.approved, checkOrderStatus, pendingReviewMessage, pixData]);

  const handleGeneratePix = async () => {
    const cleanCpf = cpfInput.replace(/\D/g, '');
    if (cleanCpf.length !== 11) {
      setPaymentError('Informe um CPF válido (11 dígitos) para gerar o Pix.');
      return;
    }

    setPixLoading(true);
    setPaymentError(null);
    setPendingReviewMessage(null);

    try {
      const res = await studentApi.post<PayOrderResponse>(
        `/academy/orders/${order.orderId}/pay`,
        {
          paymentMethod: 'pix',
          cpf: cleanCpf,
        },
      );

      if (res.status === 'APPROVED') {
        markAsApproved(res.paymentMethod);
        return;
      }

      if (!res.qrCode) {
        throw new Error('Não foi possível obter o código Pix. Tente novamente.');
      }

      setPixData({
        qrCode: res.qrCode,
        qrCodeBase64: res.qrCodeBase64,
        ticketUrl: res.ticketUrl,
        expiresAt: res.expiresAt,
        simulated: res.simulated,
      });
    } catch (err) {
      setPaymentError(
        err instanceof Error
          ? err.message
          : 'Não foi possível gerar o QR Code Pix.',
      );
    } finally {
      setPixLoading(false);
    }
  };

  const handleCopyPix = async () => {
    if (!pixData?.qrCode) return;
    try {
      await navigator.clipboard.writeText(pixData.qrCode);
      setCopiedPix(true);
      window.setTimeout(() => setCopiedPix(false), 2500);
    } catch {
      /* fallback silencioso */
    }
  };

  const handleManualVerify = async (simulated = false) => {
    setVerifying(true);
    setPaymentError(null);
    const done = await checkOrderStatus({ simulated });
    setVerifying(false);
    if (!done && !simulated) {
      setPaymentError(
        'Pagamento ainda não compensado. Se você acabou de pagar o Pix, aguarde alguns segundos — a liberação é automática.',
      );
    }
  };

  const handleCardBrickSubmit = async (formData: {
    token: string;
    issuer_id: string;
    payment_method_id: string;
    installments: number;
    payer?: {
      email?: string;
      identification?: {
        type?: string;
        number?: string;
      };
    };
  }) => {
    setProcessingCard(true);
    setPaymentError(null);
    setPendingReviewMessage(null);

    try {
      const cleanFallbackCpf = cpfInput.replace(/\D/g, '');
      const res = await studentApi.post<PayOrderResponse>(
        `/academy/orders/${order.orderId}/pay`,
        {
          paymentMethod: 'credit_card',
          token: formData.token,
          paymentMethodId: formData.payment_method_id,
          issuerId: formData.issuer_id ? String(formData.issuer_id) : undefined,
          installments: Number(formData.installments || 1),
          payerEmail: formData.payer?.email || student.email,
          identificationType: formData.payer?.identification?.type || 'CPF',
          identificationNumber:
            formData.payer?.identification?.number || cleanFallbackCpf || undefined,
          cpf: cleanFallbackCpf || undefined,
        },
      );

      if (res.status === 'APPROVED') {
        markAsApproved(res.paymentMethod);
        return;
      }

      if (res.status === 'PENDING') {
        setPendingReviewMessage(
          res.message ||
            'Seu pagamento está em análise de segurança. Assim que aprovado, o acesso será liberado automaticamente.',
        );
        return;
      }

      setPaymentError(
        res.message ||
          'Pagamento não aprovado. Tente outro cartão ou finalize com Pix.',
      );
    } catch (err) {
      setPaymentError(
        err instanceof Error
          ? err.message
          : 'Não foi possível processar o pagamento no cartão.',
      );
    } finally {
      setProcessingCard(false);
    }
  };

  const handleSimulateCard = async () => {
    setProcessingCard(true);
    setPaymentError(null);
    try {
      const res = await studentApi.post<PayOrderResponse>(
        `/academy/orders/${order.orderId}/pay`,
        {
          paymentMethod: 'credit_card',
          cpf: cpfInput.replace(/\D/g, '') || '00000000000',
          installments: 1,
          paymentMethodId: 'visa',
        },
      );
      if (res.status === 'APPROVED') {
        markAsApproved(res.paymentMethod);
      }
    } catch (err) {
      setPaymentError(
        err instanceof Error ? err.message : 'Erro ao simular cartão.',
      );
    } finally {
      setProcessingCard(false);
    }
  };

  const handleFallbackPro = async () => {
    setProcessingCard(true);
    setPaymentError(null);
    try {
      const res = await studentApi.post<PayOrderResponse>(
        `/academy/orders/${order.orderId}/pay`,
        {
          paymentMethod: 'fallback_pro',
          cpf: cpfInput.replace(/\D/g, '') || undefined,
        },
      );
      if (res.checkoutUrl) {
        window.location.href = res.checkoutUrl;
      }
    } catch (err) {
      setPaymentError(
        err instanceof Error
          ? err.message
          : 'Não foi possível abrir o ambiente do Mercado Pago.',
      );
      setProcessingCard(false);
    }
  };

  if (approvedState.approved) {
    return (
      <SuccessCard>
        <div className="success-icon">
          <CheckCircle2 size={34} />
        </div>
        <h3>Matrícula confirmada!</h3>
        <p>
          Seu pagamento para <strong>{course.title}</strong> ({formatCentsBRL(order.finalPriceCents)}) foi aprovado e seu acesso já está liberado.
        </p>
        <div className="actions">
          <ButtonLink to={`/academy/aula/${course.slug}`} $size="lg">
            <PlayCircle size={18} /> Começar a assistir agora
          </ButtonLink>
          <ButtonLink to="/academy/minha-area" $variant="secondary" $size="lg">
            Ir para Minha Área
          </ButtonLink>
        </div>
      </SuccessCard>
    );
  }

  const cleanCpfDigits = cpfInput.replace(/\D/g, '');
  const pixImgSrc = pixData?.qrCodeBase64
    ? `data:${pixData.qrCodeBase64.startsWith('PHN2Zy') ? 'image/svg+xml' : 'image/png'};base64,${pixData.qrCodeBase64}`
    : null;

  return (
    <StepContainer>
      <OrderBar>
        <div className="buyer-summary">
          <strong>{student.name}</strong>
          <span>
            {student.email} • Pedido #{order.orderId.slice(0, 8).toUpperCase()}
          </span>
        </div>
        <button type="button" className="edit-btn" onClick={onBackToEdit}>
          <ArrowLeft size={14} /> Alterar dados / cupom
        </button>
      </OrderBar>

      <MethodTabs>
        <button
          type="button"
          className={`method-tab ${method === 'pix' ? 'active' : ''}`}
          onClick={() => {
            setMethod('pix');
            setPaymentError(null);
          }}
        >
          <span className="fast-badge">Aprovação imediata</span>
          <div className="tab-icon">
            <QrCode size={18} />
          </div>
          <div className="tab-copy">
            <strong>Pix</strong>
            <span>QR Code gerado na hora</span>
          </div>
        </button>

        <button
          type="button"
          className={`method-tab ${method === 'credit_card' ? 'active' : ''}`}
          onClick={() => {
            setMethod('credit_card');
            setPaymentError(null);
          }}
        >
          <div className="tab-icon">
            <CreditCard size={18} />
          </div>
          <div className="tab-copy">
            <strong>Cartão de Crédito</strong>
            <span>Parcele em até 12x</span>
          </div>
        </button>
      </MethodTabs>

      {paymentError && (
        <FeedbackBanner $tone="error">
          <div className="banner-title">
            <AlertCircle size={16} /> Não foi possível concluir
          </div>
          <span>{paymentError}</span>
          {method === 'credit_card' && (
            <button
              type="button"
              className="inline-action"
              onClick={() => {
                setMethod('pix');
                setPaymentError(null);
              }}
            >
              Pagar agora via Pix com aprovação imediata →
            </button>
          )}
        </FeedbackBanner>
      )}

      {pendingReviewMessage && (
        <FeedbackBanner $tone="warning">
          <div className="banner-title">
            <Clock size={16} /> Pagamento em análise
          </div>
          <span>{pendingReviewMessage}</span>
        </FeedbackBanner>
      )}

      {method === 'pix' ? (
        <PaymentPanel>
          {!pixData ? (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <strong style={{ fontSize: '0.98rem', color: '#FFFFFF' }}>
                  Pague com Pix sem sair desta página
                </strong>
                <span style={{ fontSize: '0.84rem', color: '#A3A3A3', lineHeight: 1.5 }}>
                  Ao gerar o QR Code, basta escanear no app do seu banco ou usar o Copia e Cola.
                  Seu acesso é liberado automaticamente em segundos.
                </span>
              </div>

              <CpfInlineField>
                <label htmlFor="pix-cpf">
                  CPF do pagador <span>*</span>
                </label>
                <input
                  id="pix-cpf"
                  type="text"
                  inputMode="numeric"
                  placeholder="000.000.000-00"
                  value={cpfInput}
                  onChange={(e) => setCpfInput(formatCPF(e.target.value))}
                />
                <span className="hint">
                  Exigido pelo Banco Central / Mercado Pago para emissão do QR Code Pix.
                </span>
              </CpfInlineField>

              <Button
                type="button"
                size="lg"
                block
                disabled={pixLoading || cleanCpfDigits.length !== 11}
                onClick={handleGeneratePix}
              >
                {pixLoading ? (
                  'Gerando QR Code Pix…'
                ) : (
                  <>
                    <QrCode size={18} /> Gerar QR Code Pix ({formatCentsBRL(order.finalPriceCents)})
                  </>
                )}
              </Button>
            </>
          ) : (
            <PixQrBox>
              <div className="status-pill">
                <span className="dot" />
                Aguardando pagamento do Pix…
              </div>

              {pixImgSrc && (
                <div className="qr-frame">
                  <img src={pixImgSrc} alt="QR Code Pix para pagamento do curso" />
                </div>
              )}

              {countdownLabel && (
                <div className="timer-note">
                  <Clock size={14} /> Código válido por{' '}
                  <strong style={{ color: '#FFFFFF' }}>{countdownLabel}</strong>
                </div>
              )}

              <div className="copy-group">
                <label htmlFor="pix-copy-paste">Pix Copia e Cola</label>
                <div className="code-row">
                  <input
                    id="pix-copy-paste"
                    type="text"
                    readOnly
                    value={pixData.qrCode}
                    onFocus={(e) => e.currentTarget.select()}
                  />
                  <Button
                    type="button"
                    variant="primary"
                    size="md"
                    onClick={handleCopyPix}
                  >
                    {copiedPix ? (
                      <>
                        <Check size={16} /> Copiado!
                      </>
                    ) : (
                      <>
                        <Copy size={16} /> Copiar código
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  justifyContent: 'center',
                  gap: '0.65rem',
                  width: '100%',
                }}
              >
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={verifying}
                  onClick={() => handleManualVerify(false)}
                >
                  <RefreshCw size={14} />{' '}
                  {verifying ? 'Verificando…' : 'Já paguei, verificar agora'}
                </Button>

                {pixData.simulated && (
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    disabled={verifying}
                    onClick={() => handleManualVerify(true)}
                  >
                    <Sparkles size={14} /> Simular Pix aprovado (Dev)
                  </Button>
                )}
              </div>

              <span style={{ fontSize: '0.78rem', color: '#737373' }}>
                Esta tela atualiza automaticamente assim que o banco confirmar a transferência.
              </span>
            </PixQrBox>
          )}
        </PaymentPanel>
      ) : (
        <PaymentPanel>
          {resolvedPublicKey ? (
            <BrickWrapper>
              {!brickReady && !brickError && (
                <div className="mp-brick-skeleton">
                  Carregando formulário seguro de cartão…
                </div>
              )}
              {brickError && (
                <FeedbackBanner $tone="error">
                  <div className="banner-title">
                    <AlertCircle size={16} /> Erro ao carregar formulário de cartão
                  </div>
                  <span>{brickError}</span>
                </FeedbackBanner>
              )}
              <CardPayment
                key={`${order.orderId}-${order.finalPriceCents}`}
                locale="pt-BR"
                initialization={{
                  amount: centsToReais(order.finalPriceCents),
                  payer: {
                    email: student.email,
                    ...(cleanCpfDigits.length === 11
                      ? {
                          identification: {
                            type: 'CPF',
                            number: cleanCpfDigits,
                          },
                        }
                      : {}),
                  },
                }}
                customization={{
                  paymentMethods: {
                    maxInstallments: 12,
                  },
                  visual: {
                    hideFormTitle: true,
                    style: {
                      theme: 'dark',
                      customVariables: {
                        baseColor: '#B6E829',
                        baseColorFirstVariant: '#9DD61E',
                        baseColorSecondVariant: '#84B817',
                        textPrimaryColor: '#FFFFFF',
                        textSecondaryColor: '#A3A3A3',
                        inputBackgroundColor: '#0a0a0a',
                        formBackgroundColor: '#0a0a0a',
                        borderRadiusMedium: '10px',
                        borderRadiusLarge: '14px',
                      },
                    },
                  },
                }}
                onReady={() => {
                  setBrickReady(true);
                  setBrickError(null);
                }}
                onError={(err) => {
                  setBrickReady(true);
                  setBrickError(
                    err?.message ||
                      'Não foi possível inicializar o pagamento por cartão. Tente usar o Pix.',
                  );
                }}
                onSubmit={handleCardBrickSubmit}
              />
              {processingCard && (
                <div
                  style={{
                    marginTop: '0.75rem',
                    fontSize: '0.84rem',
                    color: '#B6E829',
                    textAlign: 'center',
                    fontWeight: 600,
                  }}
                >
                  Processando pagamento com segurança…
                </div>
              )}
            </BrickWrapper>
          ) : order.simulated ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <FeedbackBanner $tone="info">
                <div className="banner-title">
                  <Sparkles size={16} /> Modo de simulação local
                </div>
                <span>
                  As credenciais do Mercado Pago não estão configuradas neste ambiente local. Você
                  pode simular a aprovação instantânea do cartão abaixo.
                </span>
              </FeedbackBanner>
              <Button
                type="button"
                size="lg"
                block
                disabled={processingCard}
                onClick={handleSimulateCard}
              >
                <Lock size={17} />{' '}
                {processingCard
                  ? 'Processando…'
                  : `Simular pagamento no Cartão (${formatCentsBRL(order.finalPriceCents)})`}
              </Button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <FeedbackBanner $tone="info">
                <div className="banner-title">
                  <ShieldCheck size={16} /> Pagamento por Cartão de Crédito
                </div>
                <span>
                  Para finalizar com cartão neste momento, clique abaixo para concluir no ambiente
                  criptografado do Mercado Pago — ou escolha <strong>Pix</strong> acima para pagar
                  aqui mesmo na página.
                </span>
              </FeedbackBanner>
              <Button
                type="button"
                size="lg"
                block
                disabled={processingCard}
                onClick={handleFallbackPro}
              >
                <ExternalLink size={17} />{' '}
                {processingCard
                  ? 'Abrindo Mercado Pago…'
                  : 'Pagar com Cartão no Mercado Pago'}
              </Button>
            </div>
          )}
        </PaymentPanel>
      )}

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.45rem',
          fontSize: '0.78rem',
          color: '#737373',
          textAlign: 'center',
        }}
      >
        <ShieldCheck size={14} color="#22c55e" /> Pagamento processado com criptografia pelo{' '}
        <strong style={{ color: '#A3A3A3' }}>Mercado Pago</strong>
      </div>
    </StepContainer>
  );
}
