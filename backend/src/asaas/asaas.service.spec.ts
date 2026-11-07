import { AsaasService } from './asaas.service';
import { config } from '../config/configuration';

describe('Asaas webhook authentication', () => {
  const service = new AsaasService();
  const originalSecret = config.asaas.webhookSecret;

  afterEach(() => {
    config.asaas.webhookSecret = originalSecret;
  });

  it('rejects requests when no secret is configured', () => {
    config.asaas.webhookSecret = '';
    expect(service.validateWebhookToken()).toBe(false);
    expect(service.validateWebhookToken('arbitrary-token')).toBe(false);
  });

  it('accepts only the configured secret', () => {
    config.asaas.webhookSecret = 'a'.repeat(64);
    expect(service.validateWebhookToken('a'.repeat(64))).toBe(true);
    expect(service.validateWebhookToken('b'.repeat(64))).toBe(false);
    expect(service.validateWebhookToken('short')).toBe(false);
    expect(service.validateWebhookToken()).toBe(false);
  });
});
