import { useState } from 'react';
import styled from 'styled-components';
import { assetUrl } from '../../lib/api';
import { initials } from '../../lib/format';

const Wrap = styled.div<{ $size: number; $square?: boolean }>`
  flex-shrink: 0;
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  border-radius: ${({ $square, theme }) => ($square ? theme.radii.md : '50%')};
  overflow: hidden;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, ${({ theme }) => theme.colors.surfaceHover}, ${({ theme }) => theme.colors.surface});
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  color: ${({ theme }) => theme.colors.primary};
  font-weight: 800;
  font-size: ${({ $size }) => Math.round($size * 0.36)}px;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

/** Imagem de perfil com fallback para as iniciais quando ausente ou quebrada. */
export function Avatar({
  src,
  name,
  size = 48,
  square,
}: {
  src?: string | null;
  name: string;
  size?: number;
  square?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const url = assetUrl(src);
  return (
    <Wrap $size={size} $square={square} aria-hidden={!url || failed ? undefined : true}>
      {url && !failed ? (
        <img src={url} alt={name} loading="lazy" onError={() => setFailed(true)} />
      ) : (
        <span aria-label={name}>{initials(name)}</span>
      )}
    </Wrap>
  );
}
