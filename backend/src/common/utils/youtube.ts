const VIDEO_ID = /^[\w-]{11}$/;
const YOUTUBE_HOSTS = ['youtube.com', 'youtube-nocookie.com'];

/**
 * Extrai o ID de um vídeo do YouTube a partir de qualquer formato comum de link:
 * watch?v=, youtu.be/, /shorts/, /embed/, /live/ — ou do próprio ID de 11 caracteres.
 * Devolve null para qualquer outro domínio. Guardamos só o ID, então nada vindo do
 * usuário vira URL de iframe: o endereço do player é sempre montado pelo site.
 */
export function extractYoutubeId(raw: string): string | null {
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
    if (url.pathname === '/watch') {
      id = url.searchParams.get('v');
    } else {
      id =
        /^\/(?:shorts|embed|live|v)\/([\w-]{11})(?:[/?]|$)/.exec(
          url.pathname,
        )?.[1] ?? null;
    }
  }
  return id && VIDEO_ID.test(id) ? id : null;
}
