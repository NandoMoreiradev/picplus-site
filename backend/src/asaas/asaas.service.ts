import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';
import { config } from '../config/configuration';

export interface AsaasCustomerInput {
  name: string;
  cpfCnpj: string;
  email: string;
  phone?: string | null;
  mobilePhone?: string | null;
  postalCode?: string | null;
  address?: string | null;
  addressNumber?: string | null;
  complement?: string | null;
  province?: string | null;
  externalReference?: string | null;
  notificationDisabled?: boolean;
}

export interface AsaasPaymentInput {
  customerId: string;
  billingType: 'BOLETO' | 'PIX' | 'CREDIT_CARD' | 'UNDEFINED';
  value: number;
  dueDate: string;
  description: string;
  externalReference?: string;
  postalService?: boolean;
}

export interface AsaasPaymentResult {
  id: string;
  customer: string;
  value: number;
  netValue: number;
  billingType: string;
  status: string;
  dueDate: string;
  invoiceUrl: string;
  bankSlipUrl?: string | null;
  simulated?: boolean;
}

export interface AsaasSubscriptionInput {
  customerId: string;
  billingType: 'BOLETO' | 'PIX' | 'CREDIT_CARD' | 'UNDEFINED';
  value: number;
  nextDueDate: string;
  cycle: 'MONTHLY' | 'BIMONTHLY' | 'QUARTERLY' | 'SEMIANNUALLY' | 'YEARLY';
  description: string;
}

export interface AsaasPixQrCodeResult {
  encodedImage: string;
  payload: string;
  expirationDate: string;
}

interface AsaasApiError {
  errors?: Array<{ description?: string }>;
}

interface AsaasCustomerResponse {
  id: string;
}

interface AsaasPaymentResponse {
  id: string;
  customer: string;
  value: number;
  netValue: number;
  billingType: string;
  status: string;
  dueDate: string;
  invoiceUrl: string;
  bankSlipUrl?: string | null;
}

interface AsaasPixQrCodeResponse {
  encodedImage: string;
  payload: string;
  expirationDate: string;
}

interface AsaasSubscriptionResponse {
  id: string;
  status: string;
}

interface AsaasAccountResponse {
  id?: string;
  name?: string;
  email?: string;
  commercialInfo?: { name?: string };
}

export interface AsaasCustomerRecord {
  id: string;
  name: string;
  cpfCnpj?: string | null;
  email?: string | null;
  phone?: string | null;
  mobilePhone?: string | null;
  postalCode?: string | null;
  address?: string | null;
  addressNumber?: string | null;
  complement?: string | null;
  province?: string | null;
  externalReference?: string | null;
}

export interface AsaasPaymentRecord {
  id: string;
  customer: string;
  value: number;
  billingType?: string | null;
  status?: string | null;
  dueDate: string;
  description?: string | null;
  invoiceUrl?: string | null;
  bankSlipUrl?: string | null;
  externalReference?: string | null;
  paymentDate?: string | null;
}

@Injectable()
export class AsaasService {
  private readonly logger = new Logger(AsaasService.name);

  get isConfigured(): boolean {
    return Boolean(config.asaas.apiKey);
  }

  get baseUrl(): string {
    return config.asaas.isSandbox
      ? 'https://api-sandbox.asaas.com/v3'
      : 'https://api.asaas.com/v3';
  }

  async testConnection(): Promise<{
    connected: true;
    sandbox: boolean;
    account: { id?: string; name?: string; email?: string };
  }> {
    if (!this.isConfigured) {
      throw new BadRequestException(
        'A chave ASAAS_API_KEY não está configurada no servidor.',
      );
    }

    try {
      const response = await fetch(`${this.baseUrl}/myAccount`, {
        headers: this.headers,
        signal: AbortSignal.timeout(10000),
      });
      const data = (await response
        .json()
        .catch(() => ({}))) as AsaasAccountResponse;
      if (!response.ok) {
        throw new BadRequestException(
          `Asaas recusou a conexão: ${data?.email ?? response.statusText}`,
        );
      }
      return {
        connected: true,
        sandbox: config.asaas.isSandbox,
        account: { id: data.id, name: data.name, email: data.email },
      };
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      this.logger.error(`Falha ao testar conexão com Asaas: ${err}`);
      throw new BadRequestException('Não foi possível conectar com o Asaas.');
    }
  }

  private get headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'User-Agent': 'PicPlus-Agency',
      access_token: config.asaas.apiKey,
    };
  }

  private async list<T>(resource: string): Promise<T[]> {
    if (!this.isConfigured) {
      throw new BadRequestException(
        'A chave ASAAS_API_KEY não está configurada no servidor.',
      );
    }
    const result: T[] = [];
    const limit = 100;
    try {
      for (let offset = 0; offset < 10000; offset += limit) {
        const response = await fetch(
          `${this.baseUrl}/${resource}?limit=${limit}&offset=${offset}`,
          { headers: this.headers, signal: AbortSignal.timeout(15000) },
        );
        const data = (await response.json().catch(() => ({}))) as {
          data?: T[];
          errors?: Array<{ description?: string }>;
        };
        if (!response.ok) {
          throw new BadRequestException(
            `Asaas recusou a importação: ${data.errors?.[0]?.description ?? response.statusText}`,
          );
        }
        const page = data.data ?? [];
        result.push(...page);
        if (page.length < limit) break;
      }
      return result;
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      this.logger.error(`Falha ao importar ${resource} do Asaas: ${err}`);
      throw new BadRequestException(
        `Não foi possível comunicar com o Asaas ao listar ${resource}. Verifique a chave de API e a conexão.`,
      );
    }
  }

  listCustomers() {
    return this.list<AsaasCustomerRecord>('customers');
  }

  listPayments() {
    return this.list<AsaasPaymentRecord>('payments');
  }

  async syncCustomer(
    input: AsaasCustomerInput,
  ): Promise<{ id: string; simulated?: boolean }> {
    if (!this.isConfigured) {
      this.logger.warn(
        `[Asaas Simulado] Sincronizando cliente ${input.name} (${input.cpfCnpj})`,
      );
      return {
        id: `sim_cus_${input.cpfCnpj.replace(/\D/g, '') || Date.now()}`,
        simulated: true,
      };
    }

    try {
      const cleanDoc = input.cpfCnpj.replace(/\D/g, '');
      const cleanPostal = input.postalCode?.replace(/\D/g, '');
      const cleanPhone = input.phone?.replace(/\D/g, '');
      const cleanMobile = input.mobilePhone?.replace(/\D/g, '');

      const body = {
        name: input.name,
        cpfCnpj: cleanDoc,
        email: input.email,
        phone: cleanPhone || undefined,
        mobilePhone: cleanMobile || undefined,
        postalCode: cleanPostal || undefined,
        address: input.address || undefined,
        addressNumber: input.addressNumber || undefined,
        complement: input.complement || undefined,
        province: input.province || undefined,
        externalReference: input.externalReference || undefined,
        notificationDisabled: input.notificationDisabled ?? false,
      };

      const response = await fetch(`${this.baseUrl}/customers`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = (await response
          .json()
          .catch(() => ({}))) as AsaasApiError;
        this.logger.error(
          `Erro ao criar cliente no Asaas: ${JSON.stringify(errorData)}`,
        );
        throw new BadRequestException(
          `Asaas recusou o cadastro do cliente: ${errorData.errors?.[0]?.description ?? response.statusText}`,
        );
      }

      const data = (await response.json()) as AsaasCustomerResponse;
      return { id: data.id };
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      this.logger.error(`Falha de comunicação com Asaas: ${err}`);
      throw new BadRequestException(
        'Não foi possível conectar com a API do Asaas.',
      );
    }
  }

  async createPayment(input: AsaasPaymentInput): Promise<AsaasPaymentResult> {
    if (!this.isConfigured) {
      this.logger.warn(
        `[Asaas Simulado] Criando cobrança de R$ ${input.value} para cliente ${input.customerId}`,
      );
      const simId = `sim_pay_${Date.now()}`;
      return {
        id: simId,
        customer: input.customerId,
        value: input.value,
        netValue: input.value,
        billingType: input.billingType,
        status: 'PENDING',
        dueDate: input.dueDate,
        invoiceUrl: `https://picplus.com.br/fatura-simulada/${simId}`,
        bankSlipUrl: `https://picplus.com.br/boleto-simulado/${simId}`,
        simulated: true,
      };
    }

    try {
      const response = await fetch(`${this.baseUrl}/payments`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          customer: input.customerId,
          billingType:
            input.billingType === 'UNDEFINED' ? undefined : input.billingType,
          value: input.value,
          dueDate: input.dueDate,
          description: input.description,
          externalReference: input.externalReference,
          postalService: input.postalService ?? false,
        }),
      });

      if (!response.ok) {
        const errorData = (await response
          .json()
          .catch(() => ({}))) as AsaasApiError;
        this.logger.error(
          `Erro ao criar cobrança no Asaas: ${JSON.stringify(errorData)}`,
        );
        throw new BadRequestException(
          `Asaas recusou a geração da cobrança: ${errorData.errors?.[0]?.description ?? response.statusText}`,
        );
      }

      const data = (await response.json()) as AsaasPaymentResponse;
      return {
        id: data.id,
        customer: data.customer,
        value: data.value,
        netValue: data.netValue,
        billingType: data.billingType,
        status: data.status,
        dueDate: data.dueDate,
        invoiceUrl: data.invoiceUrl,
        bankSlipUrl: data.bankSlipUrl,
      };
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      this.logger.error(`Falha ao conectar com o Asaas: ${err}`);
      throw new BadRequestException(
        'Falha de conexão com a API de pagamentos do Asaas.',
      );
    }
  }

  async getPixQrCode(paymentId: string): Promise<AsaasPixQrCodeResult> {
    if (!this.isConfigured || paymentId.startsWith('sim_')) {
      return {
        encodedImage:
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
        payload:
          '00020126580014br.gov.bcb.pix0136simulado-picplus-chave-pix5204000053039865802BR',
        expirationDate: new Date(Date.now() + 86400000).toISOString(),
      };
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/payments/${paymentId}/pixQrCode`,
        {
          headers: this.headers,
        },
      );

      if (!response.ok) {
        throw new BadRequestException(
          'Não foi possível obter os dados PIX da cobrança.',
        );
      }

      const data = (await response.json()) as AsaasPixQrCodeResponse;
      return {
        encodedImage: data.encodedImage,
        payload: data.payload,
        expirationDate: data.expirationDate,
      };
    } catch (err) {
      this.logger.error(`Erro ao buscar PIX QR Code: ${err}`);
      throw new BadRequestException('Erro ao consultar dados de PIX no Asaas.');
    }
  }

  async createSubscription(
    input: AsaasSubscriptionInput,
  ): Promise<{ id: string; status: string }> {
    if (!this.isConfigured) {
      return { id: `sim_sub_${Date.now()}`, status: 'ACTIVE' };
    }

    try {
      const response = await fetch(`${this.baseUrl}/subscriptions`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          customer: input.customerId,
          billingType:
            input.billingType === 'UNDEFINED' ? undefined : input.billingType,
          value: input.value,
          nextDueDate: input.nextDueDate,
          cycle: input.cycle,
          description: input.description,
        }),
      });

      if (!response.ok) {
        const errorData = (await response
          .json()
          .catch(() => ({}))) as AsaasApiError;
        throw new BadRequestException(
          `Erro ao criar assinatura no Asaas: ${errorData.errors?.[0]?.description ?? response.statusText}`,
        );
      }

      const data = (await response.json()) as AsaasSubscriptionResponse;
      return { id: data.id, status: data.status };
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      throw new BadRequestException(
        'Falha de conexão com a API de assinaturas do Asaas.',
      );
    }
  }

  validateWebhookToken(receivedToken?: string): boolean {
    const configuredToken = config.asaas.webhookSecret;
    if (!configuredToken) {
      this.logger.warn(
        'ASAAS_WEBHOOK_SECRET não configurado. Webhook rejeitado.',
      );
      return false;
    }
    if (!receivedToken) return false;

    try {
      const a = Buffer.from(receivedToken);
      const b = Buffer.from(configuredToken);
      return a.length === b.length && timingSafeEqual(a, b);
    } catch {
      return false;
    }
  }
}
