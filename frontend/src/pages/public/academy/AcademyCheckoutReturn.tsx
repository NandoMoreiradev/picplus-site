import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import styled from 'styled-components';
import { AlertCircle, CheckCircle2, Clock, PlayCircle, RefreshCw } from 'lucide-react';
import { Button, ButtonLink } from '../../../components/ui/Button';
import { Container, Section } from '../../../components/ui/Layout';
import { usePageMeta } from '../../../hooks/usePageMeta';
import { formatCentsBRL, studentApi, type CourseOrderItem } from '../../../lib/academy';
import {
  centsToReais,
  hasTrackedPurchase,
  markPurchaseTracked,
  trackEcommerceEvent,
} from '../../../lib/analytics';

const Card = styled.div`
  max-width: 560px;
  margin: 0 auto;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  border-radius: ${({ theme }) => theme.radii.xl};
  padding: 2.5rem;
  text-align: center;
  box-shadow: ${({ theme }) => theme.shadows.card};

  .icon {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    margin: 0 auto 1.25rem auto;
    display: grid;
    place-items: center;
  }

  .icon.approved {
    background: ${({ theme }) => theme.colors.successSoft};
    color: ${({ theme }) => theme.colors.success};
  }

  .icon.pending {
    background: ${({ theme }) => theme.colors.warningSoft};
    color: ${({ theme }) => theme.colors.warning};
  }

  .icon.rejected {
    background: ${({ theme }) => theme.colors.dangerSoft};
    color: ${({ theme }) => theme.colors.danger};
  }

  h1 {
    font-size: 1.6rem;
    margin: 0 0 0.65rem 0;
  }

  p {
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 0.95rem;
    line-height: 1.6;
    margin: 0 0 1.75rem 0;
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.75rem;
  }
`;

export function AcademyCheckoutReturn() {
  usePageMeta('Status do Pagamento — PicPlus Academy', 'Confirmação de pedido na PicPlus Academy.');

  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId') || searchParams.get('external_reference') || '';
  const paymentId = searchParams.get('payment_id') || searchParams.get('collection_id') || '';
  const mpStatus = searchParams.get('status') || searchParams.get('collection_status') || '';
  const simulated = searchParams.get('simulated') || '';

  const [order, setOrder] = useState<CourseOrderItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const verifyOrder = async () => {
    if (!orderId) {
      setError('Identificador do pedido não informado.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await studentApi.get<CourseOrderItem>(
        `/academy/orders/${orderId}/verify`,
        {
          payment_id: paymentId || undefined,
          simulated: simulated || undefined,
          status: mpStatus || (simulated ? 'approved' : undefined),
        },
      );
      setOrder(res);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Não foi possível verificar o status do pedido.',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    studentApi
      .get<CourseOrderItem>(`/academy/orders/${orderId}/verify`, {
        payment_id: paymentId || undefined,
        simulated: simulated || undefined,
        status: mpStatus || (simulated ? 'approved' : undefined),
      })
      .then((res) => {
        if (!active) return;
        setOrder(res);
        setError(null);
      })
      .catch((err) => {
        if (!active) return;
        setError(
          err instanceof Error
            ? err.message
            : 'Não foi possível verificar o status do pedido.',
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [orderId, paymentId, simulated, mpStatus]);

  useEffect(() => {
    if (!order || order.status !== 'APPROVED') return;
    if (hasTrackedPurchase(order.id)) return;
    markPurchaseTracked(order.id);
    trackEcommerceEvent(
      'purchase',
      {
        transaction_id: order.id,
        value: centsToReais(order.finalPriceCents),
        coupon: order.coupon?.code || undefined,
        items: [
          {
            item_id: order.course?.id || order.courseId,
            item_name: order.course?.title || 'Curso PicPlus Academy',
            item_category: 'PicPlus Academy',
            item_variant: order.course?.slug,
            price: centsToReais(order.finalPriceCents),
            quantity: 1,
          },
        ],
      },
      {
        payment_method: order.paymentMethod || undefined,
      },
    );
  }, [order]);

  const courseTitle = order?.course?.title ?? 'seu curso';
  const courseSlug = order?.course?.slug ?? '';

  return (
    <Section>
      <Container>
        <Card>
          {loading ? (
            <>
              <div className="icon pending">
                <Clock size={32} />
              </div>
              <h1>Verificando seu pagamento…</h1>
              <p>Aguarde um instante enquanto confirmamos os dados junto ao Mercado Pago.</p>
            </>
          ) : error ? (
            <>
              <div className="icon rejected">
                <AlertCircle size={32} />
              </div>
              <h1>Não foi possível confirmar agora</h1>
              <p>{error}</p>
              <div className="actions">
                <Button type="button" onClick={verifyOrder}>
                  <RefreshCw size={16} /> Tentar novamente
                </Button>
                <ButtonLink to="/academy/minha-area" $variant="secondary">
                  Ir para Minha Área
                </ButtonLink>
              </div>
            </>
          ) : order?.status === 'APPROVED' ? (
            <>
              <div className="icon approved">
                <CheckCircle2 size={34} />
              </div>
              <h1>Matrícula confirmada!</h1>
              <p>
                Seu acesso ao curso <strong>{courseTitle}</strong> ({formatCentsBRL(order.finalPriceCents)}) já está liberado. Bons estudos!
              </p>
              <div className="actions">
                <ButtonLink to={courseSlug ? `/academy/aula/${courseSlug}` : '/academy/minha-area'} $size="lg">
                  <PlayCircle size={18} /> Começar a assistir agora
                </ButtonLink>
                <ButtonLink to="/academy/minha-area" $variant="secondary" $size="lg">
                  Ir para Minha Área
                </ButtonLink>
              </div>
            </>
          ) : order?.status === 'PENDING' ? (
            <>
              <div className="icon pending">
                <Clock size={32} />
              </div>
              <h1>Pagamento em processamento</h1>
              <p>
                Seu pedido do curso <strong>{courseTitle}</strong> está aguardando a confirmação do pagamento (Pix ou Boleto). Assim que compensado, seu acesso será liberado automaticamente e você receberá um e-mail.
              </p>
              <div className="actions">
                <Button type="button" onClick={verifyOrder}>
                  <RefreshCw size={16} /> Atualizar status
                </Button>
                <ButtonLink to="/academy/minha-area" $variant="secondary">
                  Ir para Minha Área
                </ButtonLink>
              </div>
            </>
          ) : (
            <>
              <div className="icon rejected">
                <AlertCircle size={32} />
              </div>
              <h1>Pagamento não concluído</h1>
              <p>
                O pagamento do curso <strong>{courseTitle}</strong> não foi aprovado ou foi cancelado. Você pode tentar novamente a qualquer momento.
              </p>
              <div className="actions">
                {courseSlug && (
                  <ButtonLink to={`/academy/curso/${courseSlug}`}>
                    Voltar para a página do curso
                  </ButtonLink>
                )}
                <ButtonLink to="/academy" $variant="secondary">
                  Ver catálogo de cursos
                </ButtonLink>
              </div>
            </>
          )}
        </Card>
      </Container>
    </Section>
  );
}
