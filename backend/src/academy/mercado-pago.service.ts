import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
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

export interface CreateMpPixPaymentInput {
  orderId: string;
  courseTitle: string;
  priceCents: number;
  student: {
    name: string;
    email: string;
    cpf: string;
  };
}

export interface CreateMpCardPaymentInput {
  orderId: string;
  courseTitle: string;
  priceCents: number;
  token: string;
  paymentMethodId: string;
  installments: number;
  issuerId?: string | number | null;
  payer: {
    name: string;
    email: string;
    identificationType?: string;
    identificationNumber: string;
  };
}

export interface MpPaymentInfo {
  id: string;
  status: string;
  statusDetail: string | null;
  externalReference: string | null;
  paymentTypeId: string | null;
  paymentMethodId: string | null;
  dateApproved: string | null;
  qrCode?: string | null;
  qrCodeBase64?: string | null;
  ticketUrl?: string | null;
  expiresAt?: string | null;
  simulated?: boolean;
}

interface MpPaymentApiResponse {
  id: number | string;
  status: string;
  status_detail?: string | null;
  external_reference?: string | null;
  payment_type_id?: string | null;
  payment_method_id?: string | null;
  date_approved?: string | null;
  date_of_expiration?: string | null;
  point_of_interaction?: {
    transaction_data?: {
      qr_code?: string | null;
      qr_code_base64?: string | null;
      ticket_url?: string | null;
    };
  };
}

const MP_REJECTION_MESSAGES: Record<string, string> = {
  cc_rejected_bad_filled_card_number: 'Confira o número do cartão informado.',
  cc_rejected_bad_filled_date: 'Confira a data de validade do cartão.',
  cc_rejected_bad_filled_other: 'Confira os dados do cartão e tente novamente.',
  cc_rejected_bad_filled_security_code: 'Código de segurança (CVV) inválido.',
  cc_rejected_blacklist:
    'Não foi possível processar este cartão. Tente outro cartão ou pague via Pix.',
  cc_rejected_call_for_authorize:
    'Seu banco solicitou autorização para esta compra. Ligue para o banco ou pague via Pix.',
  cc_rejected_card_disabled:
    'Cartão desativado. Ative no app do seu banco ou tente outra forma de pagamento.',
  cc_rejected_card_error:
    'Não conseguimos processar seu cartão agora. Tente novamente ou use o Pix.',
  cc_rejected_duplicated_payment:
    'Detectamos um pagamento idêntico recente. Aguarde alguns instantes antes de tentar novamente.',
  cc_rejected_high_risk:
    'Pagamento recusado pela análise de segurança. Tente outro cartão ou pague via Pix com aprovação imediata.',
  cc_rejected_insufficient_amount:
    'Saldo ou limite insuficiente no cartão. Tente outro cartão ou pague via Pix.',
  cc_rejected_invalid_installments:
    'Este cartão não aceita o número de parcelas selecionado.',
  cc_rejected_max_attempts:
    'Limite de tentativas atingido para este cartão. Use outro cartão ou pague via Pix.',
  cc_rejected_other_reason:
    'O banco emissor não autorizou o pagamento. Tente outro cartão ou pague via Pix.',
};

/**
 * Integração com o Checkout Transparente (API de Pagamentos) e Checkout Pro do Mercado Pago.
 *
 * - Com `MP_ACCESS_TOKEN` configurado: processa Pix e Cartão diretamente via `/v1/payments`,
 *   além de manter suporte a preferências do Checkout Pro como fallback.
 * - Sem `MP_ACCESS_TOKEN` (desenvolvimento local): simula Pix (com QR Code local) e Cartão
 *   para que todo o fluxo de compra, polling e liberação do curso possa ser testado.
 */
@Injectable()
export class MercadoPagoService {
  private readonly logger = new Logger(MercadoPagoService.name);

  get isConfigured(): boolean {
    return Boolean(config.mercadoPago.accessToken);
  }

  get publicKey(): string {
    return config.mercadoPago.publicKey;
  }

  /** Checkout simulado só existe fora de produção e sem token configurado. */
  get simulationAllowed(): boolean {
    return !this.isConfigured && process.env.NODE_ENV !== 'production';
  }

  translateRejectionDetail(statusDetail?: string | null): string {
    if (!statusDetail) {
      return 'O pagamento não foi autorizado. Tente outro cartão ou pague via Pix.';
    }
    return (
      MP_REJECTION_MESSAGES[statusDetail] ??
      'O pagamento não foi aprovado pela operadora. Tente outro cartão ou pague via Pix.'
    );
  }

  private splitName(fullName: string): {
    firstName: string;
    lastName: string;
  } {
    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    const firstName = parts[0] || 'Aluno';
    const lastName = parts.slice(1).join(' ') || 'PicPlus';
    return { firstName, lastName };
  }

  private mapPaymentResponse(
    data: MpPaymentApiResponse,
    simulated = false,
  ): MpPaymentInfo {
    const txData = data.point_of_interaction?.transaction_data;
    return {
      id: String(data.id),
      status: data.status,
      statusDetail: data.status_detail ?? null,
      externalReference: data.external_reference ?? null,
      paymentTypeId: data.payment_type_id ?? null,
      paymentMethodId: data.payment_method_id ?? null,
      dateApproved: data.date_approved ?? null,
      qrCode: txData?.qr_code ?? null,
      qrCodeBase64: txData?.qr_code_base64 ?? null,
      ticketUrl: txData?.ticket_url ?? null,
      expiresAt: data.date_of_expiration ?? null,
      simulated,
    };
  }

  private assertPaymentAvailable(): void {
    if (!this.isConfigured && !this.simulationAllowed) {
      this.logger.error(
        'MP_ACCESS_TOKEN não configurado em produção: checkout indisponível.',
      );
      throw new ServiceUnavailableException(
        'O checkout está temporariamente indisponível. Tente novamente mais tarde.',
      );
    }
  }

  private async postTransparentPayment(
    payload: Record<string, unknown>,
    idempotencyKey: string,
  ): Promise<MpPaymentInfo> {
    try {
      const response = await fetch('https://api.mercadopago.com/v1/payments', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.mercadoPago.accessToken}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errBody = await response.text();
        this.logger.error(
          `Mercado Pago recusou pagamento transparente (${response.status}): ${errBody}`,
        );
        let parsedMessage = '';
        try {
          const parsed = JSON.parse(errBody) as {
            message?: string;
            cause?: Array<{ description?: string; code?: number }>;
          };
          parsedMessage =
            parsed.cause?.[0]?.description || parsed.message || '';
        } catch {
          /* ignore non-json error body */
        }

        if (response.status >= 400 && response.status < 500) {
          throw new BadRequestException(
            parsedMessage
              ? `Dados de pagamento recusados: ${parsedMessage}`
              : 'Não foi possível processar os dados do pagamento. Verifique as informações e tente novamente.',
          );
        }

        throw new BadGatewayException(
          'Não foi possível processar o pagamento no Mercado Pago. Tente novamente em instantes.',
        );
      }

      const data = (await response.json()) as MpPaymentApiResponse;
      return this.mapPaymentResponse(data, false);
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof BadGatewayException
      ) {
        throw error;
      }
      this.logger.error(
        `Erro de rede ao processar pagamento no Mercado Pago: ${(error as Error).message}`,
      );
      throw new BadGatewayException('Falha de comunicação com o Mercado Pago.');
    }
  }

  async createPixPayment(
    input: CreateMpPixPaymentInput,
  ): Promise<MpPaymentInfo> {
    this.assertPaymentAvailable();

    const cleanCpf = input.student.cpf.replace(/\D/g, '');
    if (cleanCpf.length !== 11) {
      throw new BadRequestException(
        'Informe um CPF válido (11 dígitos) para gerar o Pix.',
      );
    }

    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    if (!this.isConfigured) {
      this.logger.warn(
        `[Mercado Pago sem MP_ACCESS_TOKEN] Gerando Pix simulado para pedido ${input.orderId}`,
      );
      const fakePixPayload = `00020126580014BR.GOV.BCB.PIX0136picplus-sim-${input.orderId.slice(0, 12)}5204000053039865405${(input.priceCents / 100).toFixed(2)}5802BR5915PICPLUS ACADEMY6007ARACAJU62070503***6304ABCD`;
      const svgQr = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="240" height="240"><rect width="120" height="120" fill="#ffffff"/><g fill="#111111"><rect x="10" y="10" width="30" height="30"/><rect x="15" y="15" width="20" height="20" fill="#ffffff"/><rect x="20" y="20" width="10" height="10"/><rect x="80" y="10" width="30" height="30"/><rect x="85" y="15" width="20" height="20" fill="#ffffff"/><rect x="90" y="20" width="10" height="10"/><rect x="10" y="80" width="30" height="30"/><rect x="15" y="85" width="20" height="20" fill="#ffffff"/><rect x="20" y="90" width="10" height="10"/><rect x="48" y="14" width="8" height="8"/><rect x="62" y="14" width="10" height="10"/><rect x="48" y="30" width="14" height="8"/><rect x="14" y="48" width="10" height="10"/><rect x="30" y="48" width="12" height="12"/><rect x="48" y="48" width="24" height="24"/><rect x="54" y="54" width="12" height="12" fill="#ffffff"/><rect x="80" y="48" width="12" height="10"/><rect x="98" y="48" width="12" height="12"/><rect x="14" y="66" width="18" height="8"/><rect x="80" y="66" width="16" height="10"/><rect x="48" y="80" width="10" height="14"/><rect x="64" y="80" width="12" height="12"/><rect x="82" y="84" width="14" height="14"/><rect x="100" y="82" width="10" height="18"/><rect x="48" y="100" width="20" height="10"/><rect x="74" y="100" width="14" height="10"/></g></svg>`;
      return {
        id: `sim_pix_${input.orderId}`,
        status: 'pending',
        statusDetail: 'pending_waiting_transfer',
        externalReference: input.orderId,
        paymentTypeId: 'bank_transfer',
        paymentMethodId: 'pix',
        dateApproved: null,
        qrCode: fakePixPayload,
        qrCodeBase64: Buffer.from(svgQr).toString('base64'),
        ticketUrl: null,
        expiresAt,
        simulated: true,
      };
    }

    const { firstName, lastName } = this.splitName(input.student.name);
    const amount = Number((input.priceCents / 100).toFixed(2));

    const payload: Record<string, unknown> = {
      transaction_amount: amount,
      description: `PicPlus Academy — ${input.courseTitle}`.slice(0, 250),
      payment_method_id: 'pix',
      external_reference: input.orderId,
      statement_descriptor: 'PICPLUS ACADEMY',
      date_of_expiration: expiresAt,
      payer: {
        email: input.student.email,
        first_name: firstName,
        last_name: lastName,
        identification: {
          type: 'CPF',
          number: cleanCpf,
        },
      },
      ...(config.backendUrl.startsWith('https://')
        ? {
            notification_url: `${config.backendUrl}/api/academy/webhooks/mercadopago`,
          }
        : {}),
    };

    return this.postTransparentPayment(
      payload,
      `pix-${input.orderId}-${randomUUID()}`,
    );
  }

  async createCardPayment(
    input: CreateMpCardPaymentInput,
  ): Promise<MpPaymentInfo> {
    this.assertPaymentAvailable();

    const cleanDoc = input.payer.identificationNumber.replace(/\D/g, '');
    if (!cleanDoc || cleanDoc.length < 11) {
      throw new BadRequestException(
        'Informe um CPF ou CNPJ válido para finalizar o pagamento no cartão.',
      );
    }

    if (!this.isConfigured) {
      this.logger.warn(
        `[Mercado Pago sem MP_ACCESS_TOKEN] Aprovando cartão simulado para pedido ${input.orderId}`,
      );
      return {
        id: `sim_card_${input.orderId}`,
        status: 'approved',
        statusDetail: 'accredited',
        externalReference: input.orderId,
        paymentTypeId: 'credit_card',
        paymentMethodId: input.paymentMethodId || 'visa',
        dateApproved: new Date().toISOString(),
        simulated: true,
      };
    }

    const { firstName, lastName } = this.splitName(input.payer.name);
    const amount = Number((input.priceCents / 100).toFixed(2));

    const payload: Record<string, unknown> = {
      transaction_amount: amount,
      token: input.token,
      description: `PicPlus Academy — ${input.courseTitle}`.slice(0, 250),
      installments: Math.max(1, Math.min(12, Number(input.installments || 1))),
      payment_method_id: input.paymentMethodId,
      ...(input.issuerId ? { issuer_id: Number(input.issuerId) } : {}),
      external_reference: input.orderId,
      statement_descriptor: 'PICPLUS ACADEMY',
      payer: {
        email: input.payer.email,
        first_name: firstName,
        last_name: lastName,
        identification: {
          type:
            input.payer.identificationType ||
            (cleanDoc.length === 14 ? 'CNPJ' : 'CPF'),
          number: cleanDoc,
        },
      },
      ...(config.backendUrl.startsWith('https://')
        ? {
            notification_url: `${config.backendUrl}/api/academy/webhooks/mercadopago`,
          }
        : {}),
    };

    return this.postTransparentPayment(
      payload,
      `card-${input.orderId}-${randomUUID()}`,
    );
  }

  async createPreference(
    input: CreateMpPreferenceInput,
  ): Promise<MpPreferenceResult> {
    const returnBase = `${config.frontendUrl}/academy/checkout/retorno?orderId=${encodeURIComponent(input.orderId)}`;

    if (!this.isConfigured) {
      if (!this.simulationAllowed) {
        this.logger.error(
          'MP_ACCESS_TOKEN não configurado em produção: checkout indisponível.',
        );
        throw new ServiceUnavailableException(
          'O checkout está temporariamente indisponível. Tente novamente mais tarde.',
        );
      }
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
      // O Mercado Pago exige URLs públicas em HTTPS para auto_return e notificações;
      // em localhost esses campos fazem a API recusar a preferência.
      ...(config.frontendUrl.startsWith('https://')
        ? { auto_return: 'approved' }
        : {}),
      ...(config.backendUrl.startsWith('https://')
        ? {
            notification_url: `${config.backendUrl}/api/academy/webhooks/mercadopago`,
          }
        : {}),
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

      const data = (await response.json()) as MpPaymentApiResponse;
      return this.mapPaymentResponse(data, false);
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
        results?: MpPaymentApiResponse[];
      };

      const item = data.results?.[0];
      if (!item) return null;

      return this.mapPaymentResponse(item, false);
    } catch (error) {
      this.logger.error(
        `Erro ao buscar pagamentos do pedido ${orderId}: ${(error as Error).message}`,
      );
      return null;
    }
  }

  /**
   * Valida o cabeçalho `x-signature` do Mercado Pago se `MP_WEBHOOK_SECRET` estiver configurado.
   *
   * Suporta o formato oficial do Mercado Pago:
   *   id:<data.id>;request-id:<x-request-id>;ts:<ts>;
   * e, conforme a documentação, se `x-request-id` não estiver presente ou for
   * omitido/reescrito por proxies reversos, valida também a versão sem `request-id`:
   *   id:<data.id>;ts:<ts>;
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

    let ts = '';
    let v1 = '';
    for (const part of xSignature.split(',')) {
      const [rawKey, ...rest] = part.split('=');
      const key = rawKey?.trim().toLowerCase();
      const val = rest.join('=').trim();
      if (key === 'ts') ts = val;
      if (key === 'v1') v1 = val.toLowerCase();
    }
    if (!ts || !v1) return false;

    const trimmedDataId = String(dataId).trim();
    const candidateManifests: string[] = [];

    if (xRequestId && xRequestId.trim()) {
      candidateManifests.push(
        `id:${trimmedDataId};request-id:${xRequestId.trim()};ts:${ts};`,
      );
    }
    candidateManifests.push(`id:${trimmedDataId};ts:${ts};`);

    for (const manifest of candidateManifests) {
      const expected = createHmac('sha256', secret)
        .update(manifest)
        .digest('hex')
        .toLowerCase();

      try {
        if (
          v1.length === expected.length &&
          timingSafeEqual(Buffer.from(v1), Buffer.from(expected))
        ) {
          return true;
        }
      } catch {
        // Ignora e testa próximo candidato
      }
    }

    return false;
  }
}
