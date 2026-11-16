import { createHmac } from 'node:crypto';
import { config } from '../config/configuration';
import { MercadoPagoService } from './mercado-pago.service';

describe('MercadoPagoService - verifyWebhookSignature', () => {
  let service: MercadoPagoService;
  const originalSecret = config.mercadoPago.webhookSecret;

  beforeEach(() => {
    service = new MercadoPagoService();
  });

  afterEach(() => {
    config.mercadoPago.webhookSecret = originalSecret;
  });

  it('deve retornar true se nenhum segredo estiver configurado (modo fallback)', () => {
    config.mercadoPago.webhookSecret = '';
    const result = service.verifyWebhookSignature({
      xSignature: 'ts=1700000000,v1=abcdef',
      xRequestId: 'req-123',
      dataId: '189241850210',
    });
    expect(result).toBe(true);
  });

  it('deve validar com sucesso a assinatura oficial com request-id', () => {
    const secret = 'my-webhook-secret-key';
    config.mercadoPago.webhookSecret = secret;

    const dataId = '189241850210';
    const requestId = 'req-abc-123';
    const ts = '1731427963';

    const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
    const v1 = createHmac('sha256', secret).update(manifest).digest('hex');

    const result = service.verifyWebhookSignature({
      xSignature: `ts=${ts},v1=${v1}`,
      xRequestId: requestId,
      dataId,
    });

    expect(result).toBe(true);
  });

  it('deve validar com sucesso a assinatura quando o request-id foi omitido', () => {
    const secret = 'my-webhook-secret-key';
    config.mercadoPago.webhookSecret = secret;

    const dataId = '189241850210';
    const ts = '1731427963';

    // Manifesto sem request-id conforme doc do MP
    const manifest = `id:${dataId};ts:${ts};`;
    const v1 = createHmac('sha256', secret).update(manifest).digest('hex');

    const result = service.verifyWebhookSignature({
      xSignature: `ts=${ts}, v1=${v1}`,
      xRequestId: undefined,
      dataId,
    });

    expect(result).toBe(true);
  });

  it('deve tolerar espaços extras no header x-signature', () => {
    const secret = 'my-webhook-secret-key';
    config.mercadoPago.webhookSecret = secret;

    const dataId = '189241850210';
    const requestId = 'req-xyz';
    const ts = '1731427963';

    const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
    const v1 = createHmac('sha256', secret).update(manifest).digest('hex');

    const result = service.verifyWebhookSignature({
      xSignature: `  ts = ${ts} ,  v1 = ${v1.toUpperCase()}  `,
      xRequestId: requestId,
      dataId,
    });

    expect(result).toBe(true);
  });

  it('deve rejeitar assinatura com hash incorreto', () => {
    const secret = 'my-webhook-secret-key';
    config.mercadoPago.webhookSecret = secret;

    const result = service.verifyWebhookSignature({
      xSignature:
        'ts=1731427963,v1=0000000000000000000000000000000000000000000000000000000000000000',
      xRequestId: 'req-xyz',
      dataId: '189241850210',
    });

    expect(result).toBe(false);
  });

  it('deve rejeitar se faltar xSignature ou dataId', () => {
    config.mercadoPago.webhookSecret = 'secret';
    expect(service.verifyWebhookSignature({ dataId: '123' })).toBe(false);
    expect(service.verifyWebhookSignature({ xSignature: 'ts=1,v1=a' })).toBe(
      false,
    );
  });
});

describe('MercadoPagoService - Checkout Transparente', () => {
  let service: MercadoPagoService;
  const originalToken = config.mercadoPago.accessToken;
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    service = new MercadoPagoService();
  });

  afterEach(() => {
    config.mercadoPago.accessToken = originalToken;
    process.env.NODE_ENV = originalEnv;
    jest.restoreAllMocks();
  });

  it('deve validar CPF com 11 dígitos antes de gerar Pix', async () => {
    config.mercadoPago.accessToken = '';
    process.env.NODE_ENV = 'development';
    await expect(
      service.createPixPayment({
        orderId: 'order-123',
        courseTitle: 'Curso Teste',
        priceCents: 9700,
        student: { name: 'Ana Silva', email: 'ana@picplus.com.br', cpf: '123' },
      }),
    ).rejects.toThrow('CPF válido');
  });

  it('deve gerar Pix simulado com QR Code em desenvolvimento sem MP_ACCESS_TOKEN', async () => {
    config.mercadoPago.accessToken = '';
    process.env.NODE_ENV = 'development';
    const res = await service.createPixPayment({
      orderId: 'order-123',
      courseTitle: 'Curso Teste',
      priceCents: 9700,
      student: {
        name: 'Ana Silva',
        email: 'ana@picplus.com.br',
        cpf: '123.456.789-01',
      },
    });
    expect(res.simulated).toBe(true);
    expect(res.status).toBe('pending');
    expect(res.qrCode).toContain('BR.GOV.BCB.PIX');
    expect(res.qrCodeBase64).toBeTruthy();
  });

  it('deve enviar payload correto para Pix na API /v1/payments', async () => {
    config.mercadoPago.accessToken = 'APP_USR-fake-token';
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          id: 998877,
          status: 'pending',
          status_detail: 'pending_waiting_transfer',
          external_reference: 'order-123',
          payment_type_id: 'bank_transfer',
          payment_method_id: 'pix',
          date_of_expiration: '2026-11-16T15:00:00.000Z',
          point_of_interaction: {
            transaction_data: {
              qr_code: '000201...',
              qr_code_base64: 'base64png',
              ticket_url: 'https://mpago.la/ticket',
            },
          },
        }),
    } as Response);

    const res = await service.createPixPayment({
      orderId: 'order-123',
      courseTitle: 'Domine o Grok',
      priceCents: 9700,
      student: {
        name: 'Maria Souza',
        email: 'maria@picplus.com.br',
        cpf: '123.456.789-01',
      },
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe('https://api.mercadopago.com/v1/payments');
    const body = JSON.parse(init?.body as string);
    expect(body.payment_method_id).toBe('pix');
    expect(body.transaction_amount).toBe(97);
    expect(body.payer.identification).toEqual({
      type: 'CPF',
      number: '12345678901',
    });
    expect(res.id).toBe('998877');
    expect(res.qrCode).toBe('000201...');
    expect(res.qrCodeBase64).toBe('base64png');
  });

  it('deve traduzir motivos de recusa do cartão em mensagens claras', () => {
    expect(
      service.translateRejectionDetail('cc_rejected_insufficient_amount'),
    ).toContain('Saldo ou limite insuficiente');
    expect(
      service.translateRejectionDetail('cc_rejected_bad_filled_security_code'),
    ).toContain('CVV');
    expect(service.translateRejectionDetail('unknown_code')).toContain(
      'Tente outro cartão ou pague via Pix',
    );
  });
});
