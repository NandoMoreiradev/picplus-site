import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import styled, { css } from 'styled-components';
import { Spinner } from './Feedback';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'dark' | 'outlineDark';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface StyleProps {
  $variant?: ButtonVariant;
  $size?: ButtonSize;
  $block?: boolean;
}

const sizes = {
  sm: css`
    padding: 0.5rem 1rem;
    font-size: 0.875rem;
  `,
  md: css`
    padding: 0.75rem 1.5rem;
    font-size: 1rem;
  `,
  lg: css`
    padding: 1rem 2rem;
    font-size: 1.125rem;
  `,
};

/** Estilos compartilhados por <Button>, <ButtonLink> e <ButtonAnchor>. */
export const buttonStyles = css<StyleProps>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  font-weight: 700;
  line-height: 1.2;
  border-radius: ${({ theme }) => theme.radii.md};
  border: 1px solid transparent;
  white-space: nowrap;
  width: ${({ $block }) => ($block ? '100%' : 'auto')};
  transition:
    background-color ${({ theme }) => theme.transitions.fast},
    border-color ${({ theme }) => theme.transitions.fast},
    color ${({ theme }) => theme.transitions.fast},
    transform ${({ theme }) => theme.transitions.fast},
    box-shadow ${({ theme }) => theme.transitions.fast};
  ${({ $size = 'md' }) => sizes[$size]}

  ${({ $variant = 'primary', theme }) => {
    switch ($variant) {
      case 'secondary':
        return css`
          background: transparent;
          color: ${theme.colors.text};
          border-color: ${theme.colors.borderStrong};
          &:hover:not(:disabled) {
            border-color: ${theme.colors.primary};
            color: ${theme.colors.primary};
          }
        `;
      case 'ghost':
        return css`
          background: transparent;
          color: ${theme.colors.textSecondary};
          &:hover:not(:disabled) {
            background: ${theme.colors.surfaceHover};
            color: ${theme.colors.text};
          }
        `;
      // Variantes para fundos verdes (faixa de CTA)
      case 'dark':
        return css`
          background: ${theme.colors.textDark};
          color: ${theme.colors.text};
          &:hover:not(:disabled) {
            background: #000;
            color: ${theme.colors.primary};
            transform: translateY(-2px);
          }
        `;
      case 'outlineDark':
        return css`
          background: transparent;
          color: ${theme.colors.textDark};
          border-color: ${theme.colors.textDark};
          &:hover:not(:disabled) {
            background: ${theme.colors.textDark};
            color: ${theme.colors.primary};
          }
        `;
      case 'danger':
        return css`
          background: ${theme.colors.dangerSoft};
          color: ${theme.colors.danger};
          border-color: rgba(239, 68, 68, 0.35);
          &:hover:not(:disabled) {
            background: ${theme.colors.danger};
            color: #fff;
          }
        `;
      default:
        return css`
          background: ${theme.colors.primary};
          color: ${theme.colors.textDark};
          &:hover:not(:disabled) {
            background: ${theme.colors.primaryHover};
            color: ${theme.colors.textDark};
            transform: translateY(-2px);
            box-shadow: ${theme.shadows.glow};
          }
        `;
    }
  }}

  &:disabled {
    opacity: 0.55;
  }
`;

const StyledButton = styled.button<StyleProps>`
  ${buttonStyles}
`;

export const ButtonLink = styled(Link)<StyleProps>`
  ${buttonStyles}
`;

export const ButtonAnchor = styled.a<StyleProps>`
  ${buttonStyles}
`;

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  loading?: boolean;
  children?: ReactNode;
}

export function Button({
  variant,
  size,
  block,
  loading,
  disabled,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <StyledButton
      $variant={variant}
      $size={size}
      $block={block}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && <Spinner aria-hidden />}
      {children}
    </StyledButton>
  );
}
