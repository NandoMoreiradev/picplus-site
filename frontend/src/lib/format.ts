import type { SocialLinks, SocialNetworkDetail } from './types';

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'long',
  year: 'numeric',
});
const shortDateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});
const dateTimeFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

export const formatDate = (iso?: string | null) => (iso ? dateFormatter.format(new Date(iso)) : '');
export const formatShortDate = (iso?: string | null) =>
  iso ? shortDateFormatter.format(new Date(iso)) : '';

/** Formata datas de calendário (YYYY-MM-DD armazenado em DateTime) sem conversão de fuso. */
export const formatDateOnly = (iso?: string | null) => {
  if (!iso) return '';
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return shortDateFormatter.format(new Date(iso));
  const [, year, month, day] = match;
  return shortDateFormatter.format(
    new Date(Number(year), Number(month) - 1, Number(day)),
  );
};
export const formatDateTime = (iso?: string | null) =>
  iso ? dateTimeFormatter.format(new Date(iso)) : '';

/** Tempo de leitura estimado (~200 palavras/min). */
export function readingTime(text: string): number {
  const words = text.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

/** Máscara de telefone brasileiro: (11) 98888-7777 */
export function maskPhone(value: string): string {
  let digits = value.replace(/\D/g, '');
  // Número colado com DDI (+55 11 98888-7777): remove o 55 para mascarar só o número nacional.
  if (digits.length > 11 && digits.startsWith('55')) digits = digits.slice(2);
  digits = digits.slice(0, 11);
  if (digits.length <= 2) return digits ? `(${digits}` : '';
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** Formatação numérica com separador de milhar pt-BR (ex: 50.000) */
export function formatNumber(value?: number | null): string {
  if (value === undefined || value === null || isNaN(value)) return '0';
  return Math.round(value).toLocaleString('pt-BR');
}

/** Formatação abreviada para métricas (ex: 850, 15K, 1,5M) */
export function formatCompactNumber(value?: number | null): string {
  if (value === undefined || value === null || isNaN(value) || value <= 0) return '0';
  if (value < 1000) return String(Math.round(value));
  if (value < 1_000_000) {
    const k = value / 1000;
    const formatted = k >= 100 || k % 1 === 0 ? Math.round(k) : k.toFixed(1).replace('.', ',');
    return `${formatted}K`;
  }
  const m = value / 1_000_000;
  const formatted = m >= 100 || m % 1 === 0 ? Math.round(m) : m.toFixed(1).replace('.', ',');
  return `${formatted}M`;
}

/** Normaliza a leitura de uma rede social vinda da API (aceita legado 'string' ou '{ url, followers }') */
export function parseSocialNetwork(
  value: SocialNetworkDetail | string | undefined | null,
): SocialNetworkDetail | null {
  if (!value) return null;
  if (typeof value === 'string') {
    return { url: value, followers: undefined };
  }
  return {
    url: value.url,
    followers: typeof value.followers === 'number' && value.followers >= 0 ? value.followers : undefined,
  };
}

/** Soma total de seguidores a partir das redes cadastradas (ou usa totalFollowers se presente) */
export function getTotalFollowers(
  socialNetworks?: SocialLinks | null,
  totalFollowers?: number | null,
): number {
  if (typeof totalFollowers === 'number' && totalFollowers > 0) {
    return totalFollowers;
  }
  if (!socialNetworks) return 0;
  let sum = 0;
  for (const item of Object.values(socialNetworks)) {
    const parsed = parseSocialNetwork(item);
    if (parsed?.followers) sum += parsed.followers;
  }
  return sum;
}

export function formatCents(cents?: number | null): string {
  if (cents === undefined || cents === null || isNaN(cents)) return 'R$ 0,00';
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export function maskCnpjCpf(value?: string | null): string {
  if (!value) return '';
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 11) {
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }
  return digits
    .slice(0, 14)
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

export function maskCurrencyBRL(value: string | number): string {
  if (value === '' || value === undefined || value === null) return '';
  const digits = String(value).replace(/\D/g, '');
  if (!digits) return '';
  const cents = parseInt(digits, 10);
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export function parseBRLToCents(raw: string | number): number {
  if (typeof raw === 'number') return Math.round(raw);
  const digits = raw.replace(/\D/g, '');
  return digits ? parseInt(digits, 10) : 0;
}
