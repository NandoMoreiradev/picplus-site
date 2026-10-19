import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { config } from '../config/configuration';

export interface CreateMpPreferenceInput {
  orderId: string;
  courseId: string;
  courseTitle: string;
  courseSubtitle?: string | null;
  coverImage?: string | null;
  priceCents: number;
  student: {
    name: string;
    email: string;
    cpf?: string | null;
  };
}

export interface MpPreferenceResult {
  preferenceId: string;
  checkoutUrl: string;
  simulated: boolean;
}

export interface MpPaymentInfo {
  id: string;
  status: string;
  externalReference: string | null;
  paymentTypeId: string | null;
  dateApproved: string | null;
}

/**
 * Integração com o Checkout Pro e API de Pagamentos do Mercado Pago.
 *
 * - Com `MP_ACCESS_TOKEN` configurado: cria a preferência oficial na API do Mercado Pago
 *   e valida notificações via `GET /v1/payments/{id}`.
 * - Sem `MP_ACCESS_TOKEN` (desenvolvimento local): gera uma URL de simulação local
 *   para que todo o fluxo de compra, retorno e liberação do curso possa ser testado.
 */
@Injectable()
export class MercadoPagoService {
  private readonly logger = new Logger(MercadoPagoService.name);

  get isConfigured(): boolean {
    return Boolean(config.mercadoPago.accessToken);
  }

  async createPreference(
    input: CreateMpPreferenceInput,
  ): Promise<MpPreferenceResult> {
    const returnBase = `${config.frontendUrl}/academy/checkout/retorno?orderId=${encodeURIComponent(input.orderId)}`;

    if (!this.isConfigured) {
      this.logger.warn(
        `[Mercado Pago sem MP_ACCESS_TOKEN] Gerando checkout simulado para pedido ${input.orderId}`,
      );
      return {
        preferenceId: `sim_pref_${input.orderId}`,
        checkoutUrl: `${returnBase}&status=approved&payment_id=sim_pay_${input.orderId}&simulated=1`,
        simulated: true,
      };
    }

    const unitPrice = Number((input.priceCents / 100).toFixed(2));
    const cleanCpf = input.student.cpf?.replace(/\D/g, '') ?? '';

    const payload: Record<string, unknown> = {
      items: [
        {
          id: input.courseId,
          title: `PicPlus Academy — ${input.courseTitle}`,
          description: input.courseSubtitle || input.courseTitle,
          quantity: 1,
          currency_id: 'BRL',
          unit_price: unitPrice,
          ...(input.coverImage?.startsWith('http')
            ? { picture_url: input.coverImage }
            : {}),
        },
      ],
      payer: {
        name: input.student.name,
        email: input.student.email,
        ...(cleanCpf.length === 11
          ? {
              identification: {
                type: 'CPF',
                number: cleanCpf,
              },
            }
          : {}),
      },
      external_reference: input.orderId,
      back_urls: {
        success: `${returnBase}&status=approved`,
        pending: `${returnBase}&status=pending`,
        failure: `${returnBase}&status=failure`,
      },
      auto_return: 'approved',
      notification_url: `${config.backendUrl}/api/academy/webhooks/mercadopago`,
      statement_descriptor: 'PICPLUS ACADEMY',
    };

    try {
      const response = await fetch(
        'https://api.mercadopago.com/checkout/preferences',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${config.mercadoPago.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        const errBody = await response.text();
        this.logger.error(
          `Mercado Pago recusou criação de preferência (${response.status}): ${errBody}`,
        );
        throw new BadGatewayException(
          'Não foi possível iniciar o checkout no Mercado Pago. Tente novamente em instantes.',
        );
      }

      const data = (await response.json()) as {
        id: string;
        init_point: string;
        sandbox_init_point?: string;
      };

      const isTestToken = config.mercadoPago.accessToken.startsWith('TEST-');
      const checkoutUrl =
        isTestToken && data.sandbox_init_point
          ? data.sandbox_init_point
          : data.init_point;

      return {
        preferenceId: data.id,
        checkoutUrl,
        simulated: false,
      };
    } catch (error) {
      if (error instanceof BadGatewayException) throw error;
      this.logger.error(
        `Erro de rede ao criar preferência no Mercado Pago: ${(error as Error).message}`,
      );
      throw new BadGatewayException('Falha de comunicação com o Mercado Pago.');
    }
  }

  /** Consulta um pagamento diretamente na API do Mercado Pago. */
  async getPayment(paymentId: string): Promise<MpPaymentInfo | null> {
    if (!this.isConfigured) return null;

    try {
      const response = await fetch(
        `https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`,
        {
          headers: {
            Authorization: `Bearer ${config.mercadoPago.accessToken}`,
          },
        },
      );
      if (!response.ok) {
        this.logger.warn(
          `Falha ao consultar pagamento ${paymentId} no Mercado Pago (${response.status})`,
        );
        return null;
      }

      const data = (await response.json()) as {
        id: number | string;
        status: string;
        external_reference?: string | null;
        payment_type_id?: string | null;
        date_approved?: string | null;
      };

      return {
        id: String(data.id),
        status: data.status,
        externalReference: data.external_reference ?? null,
        paymentTypeId: data.payment_type_id ?? null,
        dateApproved: data.date_approved ?? null,
      };
    } catch (error) {
      this.logger.error(
        `Erro ao consultar pagamento ${paymentId}: ${(error as Error).message}`,
      );
      return null;
    }
  }

  /** Busca o pagamento mais recente de um pedido (external_reference) no Mercado Pago. */
  async findLatestPaymentByOrder(
    orderId: string,
  ): Promise<MpPaymentInfo | null> {
    if (!this.isConfigured) return null;

    try {
      const url = `https://api.mercadopago.com/v1/payments/search?external_reference=${encodeURIComponent(orderId)}&sort=date_created&criteria=desc`;
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${config.mercadoPago.accessToken}`,
        },
      });
      if (!response.ok) return null;

      const data = (await response.json()) as {
        results?: Array<{
          id: number | string;
          status: string;
          external_reference?: string | null;
          payment_type_id?: string | null;
          date_approved?: string | null;
        }>;
      };

      const item = data.results?.[0];
      if (!item) return null;

      return {
        id: String(item.id),
        status: item.status,
        externalReference: item.external_reference ?? null,
        paymentTypeId: item.payment_type_id ?? null,
        dateApproved: item.date_approved ?? null,
      };
    } catch (error) {
      this.logger.error(
        `Erro ao buscar pagamentos do pedido ${orderId}: ${(error as Error).message}`,
      );
      return null;
    }
  }

  /**
   * Valida o cabeçalho `x-signature` do Mercado Pago se `MP_WEBHOOK_SECRET` estiver configurado.
   */
  verifyWebhookSignature(params: {
    xSignature?: string;
    xRequestId?: string;
    dataId?: string;
  }): boolean {
    const secret = config.mercadoPago.webhookSecret;
    if (!secret) return true; // Sem segredo configurado, a segurança se apoia na consulta ativa à API do MP.

    const { xSignature, xRequestId, dataId } = params;
    if (!xSignature || !dataId) return false;

    const parts = Object.fromEntries(
      xSignature.split(',').map((part) => {
        const [k, v] = part.trim().split('=');
        return [k, v];
      }),
    );
    const ts = parts.ts;
    const v1 = parts.v1;
    if (!ts || !v1) return false;

    const manifest = `id:${dataId};request-id:${xRequestId ?? ''};ts:${ts};`;
    const expected = createHmac('sha256', secret)
      .update(manifest)
      .digest('hex');

    try {
      return timingSafeEqual(Buffer.from(v1), Buffer.from(expected));
    } catch {
      return false;
    }
  }
}
