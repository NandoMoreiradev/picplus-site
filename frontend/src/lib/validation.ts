export type Errors<T> = Partial<Record<keyof T, string>>;

/*
 * Estas regras espelham as do servidor (backend/src/common/utils/phone.ts e social.ts).
 * O servidor é quem decide: aqui o objetivo é só mostrar o erro no campo certo, na hora.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const isEmail = (value: string) => EMAIL_RE.test(value.trim());

/** Pelo menos duas letras (de qualquer alfabeto): barra nomes como "12", "@@" ou "!!!". */
export const isName = (value: string) => /\p{L}[^\p{L}]*\p{L}/u.test(value.trim());

/** Telefone brasileiro, com ou sem máscara e com DDI 55 opcional. */
export function isPhone(value: string): boolean {
  let digits = value.replace(/\D/g, '');
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith('55')) digits = digits.slice(2);
  if (digits.length !== 10 && digits.length !== 11) return false;

  const ddd = digits.slice(0, 2);
  if (Number(ddd) < 11 || ddd[1] === '0') return false;

  const subscriber = digits.slice(2);
  if (digits.length === 11 && subscriber[0] !== '9') return false; // celular começa com 9
  if (digits.length === 10 && /^[01]/.test(subscriber)) return false; // fixo não começa com 0 ou 1
  if (/^(\d)\1+$/.test(subscriber)) return false; // 00000000, 99999999...
  return true;
}

export type SocialNetworkKey = 'instagram' | 'tiktok' | 'youtube' | 'twitter' | 'twitch';

const SOCIAL_LABEL: Record<SocialNetworkKey, string> = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  twitter: 'X (Twitter)',
  twitch: 'Twitch',
};

const SOCIAL_HOSTS: Record<SocialNetworkKey, string[]> = {
  instagram: ['instagram.com'],
  tiktok: ['tiktok.com'],
  youtube: ['youtube.com', 'youtu.be'],
  twitter: ['x.com', 'twitter.com'],
  twitch: ['twitch.tv'],
};

/** Mensagem de erro de um campo de rede social, ou undefined quando válido (ou vazio). */
export function socialError(network: SocialNetworkKey, raw: string): string | undefined {
  const value = raw.trim();
  if (!value) return undefined;
  const label = SOCIAL_LABEL[network];

  // Link: precisa ser http(s) e do domínio da própria rede.
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) {
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      return `Link de ${label} inválido.`;
    }
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return `Link de ${label} inválido.`;
    const host = url.hostname.toLowerCase();
    const ok = SOCIAL_HOSTS[network].some((domain) => host === domain || host.endsWith(`.${domain}`));
    return ok ? undefined : `Este link não é do ${label}. Use o link do seu perfil ou só o @usuário.`;
  }

  // @usuário
  const handle = value.replace(/^@/, '').replace(/^\/+/, '');
  return /^[\w.-]{1,60}$/.test(handle) ? undefined : `Usuário de ${label} inválido. Use letras, números, ponto, hífen ou _.`;
}

export const hasErrors = (errors: object) => Object.keys(errors).length > 0;

/** Extrai uma mensagem amigável de qualquer erro lançado em um submit. */
export function errorMessage(error: unknown, fallback = 'Algo deu errado. Tente novamente.'): string {
  return error instanceof Error && error.message ? error.message : fallback;
}
