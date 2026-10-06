import { BadRequestException } from '@nestjs/common';

export const SOCIAL_NETWORKS = [
  'instagram',
  'tiktok',
  'youtube',
  'twitter',
  'twitch',
] as const;
export type SocialNetwork = (typeof SOCIAL_NETWORKS)[number];
export type SocialLinks = Partial<Record<SocialNetwork, string>>;

const BASE_URL: Record<SocialNetwork, string> = {
  instagram: 'https://instagram.com/',
  tiktok: 'https://tiktok.com/@',
  youtube: 'https://youtube.com/@',
  twitter: 'https://x.com/',
  twitch: 'https://twitch.tv/',
};

const LABEL: Record<SocialNetwork, string> = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  twitter: 'X (Twitter)',
  twitch: 'Twitch',
};

/**
 * Aceita "@usuario", "usuario" ou uma URL completa e devolve sempre uma URL https válida.
 * Rejeita qualquer outro esquema (javascript:, data:...) para evitar links maliciosos na vitrine.
 */
export function normalizeSocial(network: SocialNetwork, raw: string): string {
  const value = raw.trim();

  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) {
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      throw new BadRequestException(`Link de ${LABEL[network]} inválido.`);
    }
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      throw new BadRequestException(`Link de ${LABEL[network]} inválido.`);
    }
    return url.toString();
  }

  const handle = value.replace(/^@/, '').replace(/^\/+/, '');
  if (!/^[\w.-]{1,60}$/.test(handle)) {
    throw new BadRequestException(`Usuário de ${LABEL[network]} inválido.`);
  }
  return BASE_URL[network] + handle;
}

/** Normaliza um objeto de redes sociais, descartando valores vazios e chaves desconhecidas. */
export function normalizeSocialLinks(
  input: Record<string, unknown> | undefined | null,
): SocialLinks {
  const result: SocialLinks = {};
  if (!input) return result;
  for (const network of SOCIAL_NETWORKS) {
    const raw = input[network];
    if (typeof raw === 'string' && raw.trim()) {
      result[network] = normalizeSocial(network, raw);
    }
  }
  return result;
}
