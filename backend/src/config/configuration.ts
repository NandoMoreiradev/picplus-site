import 'dotenv/config';
import { join } from 'node:path';

const toList = (value: string | undefined, fallback: string[]) =>
  value
    ? value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    : fallback;

export const config = {
  port: Number(process.env.PORT ?? 3000),
  isProduction: process.env.NODE_ENV === 'production',
  databaseUrl: process.env.DATABASE_URL,
  corsOrigins: toList(process.env.FRONTEND_URL, ['http://localhost:5173']),
  frontendUrl: toList(process.env.FRONTEND_URL, ['http://localhost:5173'])[0],
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
    from: process.env.MAIL_FROM ?? 'PicPlus <onboarding@resend.dev>',
    // Caixa que recebe os avisos de novos cadastros/contatos.
    notifyTo: toList(process.env.ADMIN_NOTIFY_EMAIL, []),
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
