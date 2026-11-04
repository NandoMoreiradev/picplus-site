import { BadRequestException } from '@nestjs/common';

export const SOCIAL_NETWORKS = [
  'instagram',
  'tiktok',
  'youtube',
  'twitter',
  'twitch',
] as const;
export type SocialNetwork = (typeof SOCIAL_NETWORKS)[number];
export interface SocialNetworkDetail {
  url: string;
  followers?: number;
  [key: string]: unknown;
}
export type SocialLinks = Partial<Record<SocialNetwork, SocialNetworkDetail>>;

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

/** Domínios aceitos em cada rede (subdomínios como www. e m. também valem). */
const ALLOWED_HOSTS: Record<SocialNetwork, string[]> = {
  instagram: ['instagram.com'],
  tiktok: ['tiktok.com'],
  youtube: ['youtube.com', 'youtu.be'],
  twitter: ['x.com', 'twitter.com'],
  twitch: ['twitch.tv'],
};

const hostMatches = (hostname: string, allowed: string[]) => {
  const host = hostname.toLowerCase();
  return allowed.some(
    (domain) => host === domain || host.endsWith(`.${domain}`),
  );
};

/**
 * Aceita "@usuario", "usuario" ou o link do perfil e devolve sempre uma URL https
 * da própria rede. Esses links aparecem na vitrine pública, então rejeitamos
 * qualquer outro domínio (phishing) e qualquer outro esquema (javascript:, data:...).
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
    if (!hostMatches(url.hostname, ALLOWED_HOSTS[network])) {
      throw new BadRequestException(
        `O link informado não é do ${LABEL[network]}. Use o endereço do seu perfil ou apenas o @usuário.`,
      );
    }
    url.protocol = 'https:';
    return url.toString();
  }

  const handle = value.replace(/^@/, '').replace(/^\/+/, '');
  if (!/^[\w.-]{1,60}$/.test(handle)) {
    throw new BadRequestException(`Usuário de ${LABEL[network]} inválido.`);
  }
  return BASE_URL[network] + handle;
}

/** Normaliza um objeto de redes sociais, aceitando URLs ou usuários e contagem de seguidores. */
export function normalizeSocialLinks(
  input: Record<string, unknown> | undefined | null,
): SocialLinks {
  const result: SocialLinks = {};
  if (!input) return result;

  for (const network of SOCIAL_NETWORKS) {
    const raw = input[network];
    let rawUrl: string | undefined;
    let followers: number | undefined;

    if (typeof raw === 'string' && raw.trim()) {
      rawUrl = raw;
      const followersKey = `${network}Followers`;
      const rawFollowers = input[followersKey];
      if (
        rawFollowers !== undefined &&
        rawFollowers !== null &&
        rawFollowers !== ''
      ) {
        const cleaned = String(rawFollowers).replace(/\D/g, '');
        if (cleaned) followers = parseInt(cleaned, 10);
      }
    } else if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      const obj = raw as Record<string, unknown>;
      if (typeof obj.url === 'string' && obj.url.trim()) {
        rawUrl = obj.url;
        if (
          obj.followers !== undefined &&
          obj.followers !== null &&
          obj.followers !== ''
        ) {
          const cleaned = String(obj.followers).replace(/\D/g, '');
          if (cleaned) followers = parseInt(cleaned, 10);
        }
      }
    }

    if (rawUrl) {
      result[network] = {
        url: normalizeSocial(network, rawUrl),
        followers:
          typeof followers === 'number' && !isNaN(followers) && followers >= 0
            ? followers
            : undefined,
      };
    }
  }
  return result;
}

export function calculateTotalFollowers(
  socialNetworks?: SocialLinks | null,
): number {
  if (!socialNetworks) return 0;
  let total = 0;
  for (const detail of Object.values(socialNetworks)) {
    if (
      detail &&
      typeof detail === 'object' &&
      typeof detail.followers === 'number'
    ) {
      total += detail.followers;
    }
  }
  return total;
}
