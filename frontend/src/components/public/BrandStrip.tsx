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

/**
 * Cartão de tamanho fixo. O fundo é escolhido por marca (claro ou escuro) para que
 * logos brancos continuem legíveis. O logo ocupa uma caixa flex centralizada, então
 * qualquer proporção fica no meio do cartão.
 */
const Tile = styled.li<{ $dark: boolean }>`
  flex-shrink: 0;
  width: 224px;
  height: 116px;
  padding: 0.7rem 1rem;
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ $dark }) => ($dark ? '#0f0f0f' : '#f5f5f5')};
  border: 1px solid ${({ $dark, theme }) => ($dark ? theme.colors.borderStrong : 'transparent')};
  transition:
    transform ${({ theme }) => theme.transitions.fast},
    border-color ${({ theme }) => theme.transitions.fast};

  &:hover {
    transform: translateY(-2px);
    border-color: ${({ theme }) => theme.colors.primaryBorder};
  }

  .logo {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
  }
  /* width/height 100% + contain: o logo preenche a área útil (amplia os pequenos), sem distorcer. */
  .logo img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    object-position: center;
  }

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    width: 168px;
    height: 88px;
    padding: 0.6rem 0.85rem;
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
          const isClone = animate && index >= brands.length;
          const image = (
            <span className="logo">
              <img src={assetUrl(brand.logo)} alt={brand.name} loading="lazy" />
            </span>
          );
          return (
            // Segunda metade é decorativa (loop infinito): oculta de leitores de tela.
            <Tile
              key={`${brand.id}-${index}`}
              $dark={brand.background === 'dark'}
              aria-hidden={isClone ? true : undefined}
            >
              {brand.website ? (
                <a
                  className="logo"
                  href={brand.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  tabIndex={isClone ? -1 : 0}
                  aria-label={brand.name}
                >
                  <img src={assetUrl(brand.logo)} alt="" loading="lazy" />
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
