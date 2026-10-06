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
  mail: {
    apiKey: process.env.RESEND_API_KEY,
    from: process.env.MAIL_FROM ?? 'PicPlus <onboarding@resend.dev>',
    // Caixa que recebe os avisos de novos cadastros/contatos.
    notifyTo: toList(process.env.ADMIN_NOTIFY_EMAIL, []),
  },
};

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
  if (config.isProduction && config.jwt.secret.length < 32) {
    throw new Error('JWT_SECRET deve ter ao menos 32 caracteres em produção.');
  }
}
