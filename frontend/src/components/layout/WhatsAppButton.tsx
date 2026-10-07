import styled, { keyframes } from 'styled-components';
import { site } from '../../config/site';
import { WhatsAppIcon } from '../ui/icons';

const appear = keyframes`
  from { opacity: 0; transform: translateY(16px) scale(0.9); }
  to { opacity: 1; transform: none; }
`;

/* Anel que se expande e some; o resto do ciclo fica parado, para não cansar. */
const pulse = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(182, 232, 41, 0.6); }
  45%, 100% { box-shadow: 0 0 0 20px rgba(182, 232, 41, 0); }
`;

/* "Telefone tocando": o ícone balança rapidamente de tempos em tempos. */
const ring = keyframes`
  0%, 86%, 100% { transform: rotate(0) scale(1); }
  88% { transform: rotate(-14deg) scale(1.12); }
  90% { transform: rotate(12deg) scale(1.12); }
  92% { transform: rotate(-9deg) scale(1.08); }
  94% { transform: rotate(6deg) scale(1.04); }
  96% { transform: rotate(-3deg) scale(1); }
`;

/**
 * Botão flutuante de WhatsApp. Fica abaixo do cabeçalho e dos modais (z-index),
 * respeita a área segura de celulares com "notch" e, em telas largas, mostra um
 * rótulo ao passar o mouse ou receber foco.
 */
const Floating = styled.a`
  position: fixed;
  right: 1.25rem;
  bottom: calc(1.25rem + env(safe-area-inset-bottom, 0px));
  z-index: 90;
  display: inline-flex;
  align-items: center;
  height: 60px;
  padding: 0 17px;
  border-radius: 999px;
  /* verde-limão da marca; glifo escuro para manter o contraste */
  background: ${({ theme }) => theme.colors.primary};
  color: ${({ theme }) => theme.colors.textDark};
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
  /* aparece com um pequeno atraso, sem disputar a atenção com o carregamento da página */
  animation: ${appear} 0.5s ease-out 1.2s both;
  transition:
    transform ${({ theme }) => theme.transitions.fast},
    background ${({ theme }) => theme.transitions.fast};

  /* anel pulsante contínuo (a cada ~3 s) */
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    pointer-events: none;
    animation: ${pulse} 3.2s ease-out 2.4s infinite;
  }

  &:hover,
  &:focus-visible {
    color: ${({ theme }) => theme.colors.textDark};
    background: ${({ theme }) => theme.colors.primaryHover};
    transform: translateY(-3px);
  }
  /* com o mouse (ou o foco) em cima, as animações de chamar atenção param */
  &:hover::before,
  &:focus-visible::before,
  &:hover svg,
  &:focus-visible svg {
    animation: none;
  }
  &:focus-visible {
    outline: 3px solid #fff;
    outline-offset: 3px;
  }

  svg {
    flex-shrink: 0;
    width: 26px;
    height: 26px;
    transform-origin: 50% 60%;
    animation: ${ring} 7s ease-in-out 3.6s infinite;
  }

  .label {
    max-width: 0;
    overflow: hidden;
    white-space: nowrap;
    font-weight: 800;
    font-size: 0.95rem;
    opacity: 0;
    transition:
      max-width 0.3s ease,
      margin 0.3s ease,
      opacity 0.2s ease;
  }

  @media (hover: hover) and (min-width: ${({ theme }) => theme.breakpoints.tablet}) {
    &:hover .label,
    &:focus-visible .label {
      max-width: 180px;
      margin-left: 0.6rem;
      opacity: 1;
    }
  }

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    right: 1rem;
    height: 56px;
    padding: 0 15px;
  }
`;

export function WhatsAppButton() {
  if (!site.whatsapp) return null;
  return (
    <Floating
      href={site.whatsapp}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Falar com a PicPlus no WhatsApp (abre em nova aba)"
    >
      <WhatsAppIcon />
      <span className="label">Fale conosco</span>
    </Floating>
  );
}
