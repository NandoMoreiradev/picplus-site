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
