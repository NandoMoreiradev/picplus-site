import 'dotenv/config';
import { join } from 'node:path';

const toList = (value: string | undefined, fallback: string[]) => {
  const raw = value
    ? value
        .split(',')
        .map((item) => item.trim().replace(/\/+$/, ''))
        .filter(Boolean)
    : fallback;

  const set = new Set<string>();
  for (const item of raw) {
    const clean = item.replace(/\/+$/, '');
    set.add(clean);
    try {
      const parsed = new URL(clean);
      if (parsed.hostname.startsWith('www.')) {
        set.add(
          `${parsed.protocol}//${parsed.hostname.replace(/^www\./, '')}${parsed.port ? `:${parsed.port}` : ''}`,
        );
      } else if (
        !parsed.hostname.includes('localhost') &&
        !parsed.hostname.includes('127.0.0.1')
      ) {
        set.add(
          `${parsed.protocol}//www.${parsed.hostname}${parsed.port ? `:${parsed.port}` : ''}`,
        );
      }
    } catch {
      /* ignore invalid URLs */
    }
  }
  return Array.from(set);
};

export const config = {
  port: Number(process.env.PORT ?? 3000),
  isProduction: process.env.NODE_ENV === 'production',
  databaseUrl: process.env.DATABASE_URL,
  corsOrigins: toList(process.env.FRONTEND_URL, ['http://localhost:5173']),
  frontendUrl: toList(process.env.FRONTEND_URL, ['http://localhost:5173'])[0],
  backendUrl: (
    process.env.BACKEND_URL ??
    `http://localhost:${Number(process.env.PORT ?? 3000)}`
  ).replace(/\/+$/, ''),
  jwt: {
    secret: process.env.JWT_SECRET ?? '',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '8h',
  },
  uploads: {
    dir: process.env.UPLOADS_DIR ?? join(process.cwd(), 'uploads'),
    publicPath: '/uploads',
  },
  // Cloudflare R2 (compatível com S3). Se estiver completo, substitui o disco local.
  r2: {
    accountId: process.env.R2_ACCOUNT_ID ?? '',
    accessKeyId: process.env.R2_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? '',
    bucket: process.env.R2_BUCKET ?? '',
    // URL pública do bucket, sem barra final (ex.: https://cdn.seudominio.com.br)
    publicUrl: (process.env.R2_PUBLIC_URL ?? '').replace(/\/+$/, ''),
  },
  mail: {
    apiKey: process.env.RESEND_API_KEY,
    // Remove espaços e aspas externas (comum em painéis de deploy que
    // guardam o valor literalmente com aspas) para não invalidar o `from`.
    from:
      (process.env.MAIL_FROM ?? '').trim().replace(/^(["'])(.*)\1$/, '$2').trim() ||
      'PicPlus <onboarding@resend.dev>',
    // Caixa que recebe os avisos de novos cadastros/contatos.
    notifyTo: toList(process.env.ADMIN_NOTIFY_EMAIL, []),
    webhookSecret: process.env.RESEND_WEBHOOK_SECRET ?? '',
  },
  mercadoPago: {
    accessToken: (process.env.MP_ACCESS_TOKEN ?? '')
      .trim()
      .replace(/^(["'])(.*)\1$/, '$2')
      .trim(),
    webhookSecret: (process.env.MP_WEBHOOK_SECRET ?? '')
      .trim()
      .replace(/^(["'])(.*)\1$/, '$2')
      .trim(),
  },
  asaas: {
    apiKey: process.env.ASAAS_API_KEY ?? '',
    isSandbox:
      process.env.ASAAS_SANDBOX === 'true' || !process.env.ASAAS_API_KEY,
    webhookSecret: process.env.ASAAS_WEBHOOK_SECRET ?? '',
    defaultTaxes: {
      retainIss: process.env.ASAAS_TAX_RETAIN_ISS === 'true',
      iss: Number(process.env.ASAAS_TAX_ISS ?? 0),
      cofins: Number(process.env.ASAAS_TAX_COFINS ?? 0),
      csll: Number(process.env.ASAAS_TAX_CSLL ?? 0),
      inss: Number(process.env.ASAAS_TAX_INSS ?? 0),
      ir: Number(process.env.ASAAS_TAX_IR ?? 0),
      pis: Number(process.env.ASAAS_TAX_PIS ?? 0),
    },
    defaultMunicipalService: {
      id: process.env.ASAAS_MUNICIPAL_SERVICE_ID || undefined,
      code: process.env.ASAAS_MUNICIPAL_SERVICE_CODE || undefined,
      name: process.env.ASAAS_MUNICIPAL_SERVICE_NAME || undefined,
    },
  },
};

const R2_VARS = [
  'R2_ACCOUNT_ID',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_BUCKET',
  'R2_PUBLIC_URL',
] as const;

/** true quando todas as variáveis do R2 estão preenchidas. */
export const isR2Enabled = () => R2_VARS.every((name) => !!process.env[name]);

/** Falha cedo, na inicialização, quando faltar configuração crítica. */
export function assertConfig() {
  const missing: string[] = [];
  if (!config.databaseUrl) missing.push('DATABASE_URL');
  if (!config.jwt.secret) missing.push('JWT_SECRET');
  if (missing.length) {
    throw new Error(
      `Variáveis de ambiente obrigatórias ausentes: ${missing.join(', ')}. ` +
        'Copie backend/.env.example para backend/.env e preencha.',
    );
  }
  // Configuração parcial do R2 quase sempre é engano: melhor falhar do que gravar em disco sem perceber.
  const r2Set = R2_VARS.filter((name) => !!process.env[name]);
  if (r2Set.length > 0 && r2Set.length < R2_VARS.length) {
    const missingR2 = R2_VARS.filter((name) => !process.env[name]);
    throw new Error(
      `Configuração do R2 incompleta. Faltam: ${missingR2.join(', ')}.`,
    );
  }
  if (config.isProduction && config.jwt.secret.length < 32) {
    throw new Error('JWT_SECRET deve ter ao menos 32 caracteres em produção.');
  }
}
