/**
 * Informações institucionais configuráveis por variáveis de ambiente (ver .env.example).
 * Campos vazios simplesmente não são exibidos no site.
 */
import { positioning } from '../content/positioning';

const env = import.meta.env;

const whatsappDigits = (env.VITE_WHATSAPP ?? '').replace(/\D/g, '');

export const site = {
  name: 'PicPlus',
  tagline: positioning.tagline,
  email: (env.VITE_CONTACT_EMAIL as string | undefined) || '',
  phone: (env.VITE_CONTACT_PHONE as string | undefined) || '',
  address: (env.VITE_ADDRESS as string | undefined) || '',
  whatsapp: whatsappDigits
    ? `https://wa.me/${whatsappDigits}?text=${encodeURIComponent('Olá! Vim pelo site da PicPlus.')}`
    : '',
  social: {
    instagram: (env.VITE_INSTAGRAM as string | undefined) || '',
    tiktok: (env.VITE_TIKTOK as string | undefined) || '',
    youtube: (env.VITE_YOUTUBE as string | undefined) || '',
    linkedin: (env.VITE_LINKEDIN as string | undefined) || '',
  },
};

/** Faixas de investimento oferecidas no formulário de orçamento. */
export const BUDGET_RANGES = [
  'Até R$ 5 mil',
  'R$ 5 mil – R$ 15 mil',
  'R$ 15 mil – R$ 50 mil',
  'Acima de R$ 50 mil',
  'Ainda não sei',
];

/** Sugestões de nicho no cadastro de influenciadores. */
export const NICHES = [
  'Moda',
  'Beleza',
  'Lifestyle',
  'Games',
  'Fitness e Saúde',
  'Gastronomia',
  'Viagem',
  'Tecnologia',
  'Humor',
  'Educação',
  'Família e Maternidade',
  'Finanças',
  'Música',
  'Esportes',
  'Outro',
];
