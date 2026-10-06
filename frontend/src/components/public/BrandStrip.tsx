import styled, { keyframes } from 'styled-components';
import { assetUrl } from '../../lib/api';
import type { Brand } from '../../lib/types';

const scroll = keyframes`
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
`;

const Viewport = styled.div`
  overflow: hidden;
  mask-image: linear-gradient(90deg, transparent, #000 10%, #000 90%, transparent);
`;

const Track = styled.ul<{ $animate: boolean }>`
  display: flex;
  align-items: center;
  gap: 1.25rem;
  width: max-content;
  animation: ${scroll} 38s linear infinite;
  animation-play-state: running;
  ${({ $animate }) => !$animate && 'animation: none; width: auto; flex-wrap: wrap; justify-content: center;'}

  &:hover {
    animation-play-state: paused;
  }
`;

const Tile = styled.li`
  flex-shrink: 0;
  display: grid;
  place-items: center;
  width: 168px;
  height: 84px;
  padding: 1rem 1.25rem;
  border-radius: ${({ theme }) => theme.radii.md};
  background: rgba(255, 255, 255, 0.94);
  opacity: 0.8;
  transition: opacity ${({ theme }) => theme.transitions.fast};

  &:hover {
    opacity: 1;
  }
  img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
  }
  a {
    display: grid;
    place-items: center;
    width: 100%;
    height: 100%;
  }
`;

/** Faixa de logos. Com 6+ marcas vira um carrossel infinito; com menos, uma grade centralizada. */
export function BrandStrip({ brands }: { brands: Brand[] }) {
  if (!brands.length) return null;
  const animate = brands.length >= 6;
  const items = animate ? [...brands, ...brands] : brands;

  return (
    <Viewport>
      <Track $animate={animate} aria-label="Marcas parceiras">
        {items.map((brand, index) => {
          const image = <img src={assetUrl(brand.logo)} alt={brand.name} loading="lazy" />;
          return (
            // Segunda metade é decorativa (loop infinito): oculta de leitores de tela.
            <Tile key={`${brand.id}-${index}`} aria-hidden={animate && index >= brands.length ? true : undefined}>
              {brand.website ? (
                <a href={brand.website} target="_blank" rel="noopener noreferrer" tabIndex={index >= brands.length ? -1 : 0}>
                  {image}
                </a>
              ) : (
                image
              )}
            </Tile>
          );
        })}
      </Track>
    </Viewport>
  );
}
