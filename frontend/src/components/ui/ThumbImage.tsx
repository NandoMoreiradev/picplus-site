import { useState } from 'react';
import type { ImgHTMLAttributes } from 'react';
import { assetUrl } from '../../lib/api';

const UPLOADED_IMAGE = /(\/[0-9a-f-]{36})\.(jpe?g|png|webp)$/i;

/** Endereço da miniatura de uma imagem enviada pelo painel; undefined para qualquer outra. */
export function thumbPath(path?: string | null): string | undefined {
  return path && UPLOADED_IMAGE.test(path) ? path.replace(UPLOADED_IMAGE, '$1-thumb.webp') : undefined;
}

/**
 * Imagem de grade/card: carrega a miniatura leve e, se ela não existir (imagens enviadas
 * antes da otimização), cai na original. Para o destaque da página e o zoom, use <img>.
 */
export function ThumbImage({ src, ...rest }: { src?: string | null } & Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'>) {
  const thumb = thumbPath(src);
  const [failed, setFailed] = useState(false);
  const url = assetUrl(thumb && !failed ? thumb : src);
  if (!url) return null;
  return <img {...rest} src={url} loading="lazy" decoding="async" onError={thumb && !failed ? () => setFailed(true) : undefined} />;
}
