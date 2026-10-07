const VIDEO_ID = /^[\w-]{11}$/;
const YOUTUBE_HOSTS = ['youtube.com', 'youtube-nocookie.com'];

/**
 * Extrai o ID de um vídeo do YouTube (watch?v=, youtu.be/, /shorts/, /embed/, /live/ ou o
 * próprio ID). Espelha backend/src/common/utils/youtube.ts: o servidor é quem decide,
 * aqui serve para validar e pré-visualizar no formulário do painel.
 */
export function parseYoutubeId(raw: string): string | null {
  const value = raw.trim();
  if (VIDEO_ID.test(value)) return value;

  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase().replace(/^(www|m)\./, '');

  let id: string | null = null;
  if (host === 'youtu.be') {
    id = url.pathname.split('/')[1] ?? null;
  } else if (YOUTUBE_HOSTS.includes(host)) {
    id =
      url.pathname === '/watch'
        ? url.searchParams.get('v')
        : (/^\/(?:shorts|embed|live|v)\/([\w-]{11})(?:[/?]|$)/.exec(url.pathname)?.[1] ?? null);
  }
  return id && VIDEO_ID.test(id) ? id : null;
}

/** Só aceita IDs no formato esperado antes de montar qualquer URL. */
const safe = (id: string) => (VIDEO_ID.test(id) ? id : '');

/** Player sem cookies (só carrega ao clicar), sem vídeos relacionados de outros canais. */
export const youtubeEmbedUrl = (id: string) =>
  `https://www.youtube-nocookie.com/embed/${safe(id)}?autoplay=1&rel=0&modestbranding=1&playsinline=1`;

export const youtubeThumbnail = (id: string) => `https://i.ytimg.com/vi/${safe(id)}/hqdefault.jpg`;

export const youtubeWatchUrl = (id: string) => `https://www.youtube.com/watch?v=${safe(id)}`;
