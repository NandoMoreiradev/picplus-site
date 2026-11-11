import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { EmailLogStatus } from '@prisma/client';
import { createHmac } from 'node:crypto';
import { config } from '../config/configuration';
import { MailService } from './mail.service';

function signSvixPayload(
  secret: string,
  id: string,
  timestamp: string,
  payload: string,
): string {
  const rawKey = Buffer.from(secret.replace(/^whsec_/, ''), 'base64');
  const toSign = `${id}.${timestamp}.${payload}`;
  const sig = createHmac('sha256', rawKey).update(toSign).digest('base64');
  return `v1,${sig}`;
}

describe('MailService webhook & logging', () => {
  const originalSecret = config.mail.webhookSecret;
  const testSecret = `whsec_${Buffer.from('picplus-resend-webhook-test-key').toString('base64')}`;

  afterEach(() => {
    config.mail.webhookSecret = originalSecret;
  });

  function createMockPrisma() {
    const store = new Map<string, Record<string, unknown>>();
    return {
      store,
      emailLog: {
        create: jest.fn(({ data }: { data: Record<string, unknown> }) => {
          const id = `log_${store.size + 1}`;
          const row = { id, ...data };
          if (typeof data.resendEmailId === 'string') {
            store.set(data.resendEmailId, row);
          }
          return Promise.resolve(row);
        }),
        findUnique: jest.fn(({ where }: { where: { resendEmailId: string } }) =>
          Promise.resolve(store.get(where.resendEmailId) ?? null),
        ),
        update: jest.fn(
          ({
            where,
            data,
          }: {
            where: { id: string };
            data: Record<string, unknown>;
          }) => {
            for (const [key, val] of store.entries()) {
              if (val.id === where.id) {
                const updated = { ...val, ...data };
                store.set(key, updated);
                return Promise.resolve(updated);
              }
            }
            return Promise.resolve(null);
          },
        ),
      },
    };
  }

  it('rejects webhooks when RESEND_WEBHOOK_SECRET is not configured', async () => {
    config.mail.webhookSecret = '';
    const service = new MailService(createMockPrisma() as never);

    await expect(
      service.handleResendWebhook('{}', {
        id: 'msg_1',
        timestamp: String(Math.floor(Date.now() / 1000)),
        signature: 'v1,invalid',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects webhooks with missing or invalid Svix signature', async () => {
    config.mail.webhookSecret = testSecret;
    const service = new MailService(createMockPrisma() as never);

    await expect(service.handleResendWebhook('{}', {})).rejects.toBeInstanceOf(
      UnauthorizedException,
    );

    await expect(
      service.handleResendWebhook('{"type":"email.delivered"}', {
        id: 'msg_1',
        timestamp: String(Math.floor(Date.now() / 1000)),
        signature: 'v1,wrong',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('verifies valid Resend webhook signature and advances status without regressing', async () => {
    config.mail.webhookSecret = testSecret;
    const mockPrisma = createMockPrisma();
    const service = new MailService(mockPrisma as never);

    mockPrisma.store.set('re_123', {
      id: 'log_1',
      resendEmailId: 're_123',
      status: EmailLogStatus.SENT,
      to: 'aluno@exemplo.com',
      subject: 'Bem-vindo',
    });

    const deliveredPayload = JSON.stringify({
      type: 'email.delivered',
      created_at: '2026-11-11T15:00:00.000Z',
      data: {
        email_id: 're_123',
        from: 'PicPlus <contato@picplus.com.br>',
        to: ['aluno@exemplo.com'],
        subject: 'Bem-vindo',
        created_at: '2026-11-11T14:59:50.000Z',
      },
    });
    const ts = String(Math.floor(Date.now() / 1000));
    const deliveredSig = signSvixPayload(
      testSecret,
      'msg_delivered',
      ts,
      deliveredPayload,
    );

    await expect(
      service.handleResendWebhook(deliveredPayload, {
        id: 'msg_delivered',
        timestamp: ts,
        signature: deliveredSig,
      }),
    ).resolves.toEqual({ ok: true });

    expect(mockPrisma.store.get('re_123')?.status).toBe(
      EmailLogStatus.DELIVERED,
    );

    // Evento atrasado `email.sent` não deve rebaixar status de DELIVERED para SENT
    const lateSentPayload = JSON.stringify({
      type: 'email.sent',
      created_at: '2026-11-11T14:59:55.000Z',
      data: {
        email_id: 're_123',
        from: 'PicPlus <contato@picplus.com.br>',
        to: ['aluno@exemplo.com'],
        subject: 'Bem-vindo',
        created_at: '2026-11-11T14:59:50.000Z',
      },
    });
    const lateSig = signSvixPayload(
      testSecret,
      'msg_sent',
      ts,
      lateSentPayload,
    );

    await service.handleResendWebhook(lateSentPayload, {
      id: 'msg_sent',
      timestamp: ts,
      signature: lateSig,
    });

    expect(mockPrisma.store.get('re_123')?.status).toBe(
      EmailLogStatus.DELIVERED,
    );
  });

  it('records SIMULATED log when RESEND_API_KEY is missing', async () => {
    const mockPrisma = createMockPrisma();
    const service = new MailService(mockPrisma as never);

    const ok = await service.send({
      to: 'aluno@exemplo.com',
      subject: 'Teste local',
      html: '<p>Olá</p>',
      templateName: 'Boas-vindas',
    });

    expect(ok).toBe(false);
    expect(mockPrisma.emailLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          to: 'aluno@exemplo.com',
          subject: 'Teste local',
          templateName: 'Boas-vindas',
          status: EmailLogStatus.SIMULATED,
        }),
      }),
    );
  });
});
