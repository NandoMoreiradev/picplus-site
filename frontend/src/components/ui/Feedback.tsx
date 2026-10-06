import type { ReactNode } from 'react';
import styled, { css, keyframes } from 'styled-components';
import { AlertCircle, CheckCircle2, Info, Inbox, TriangleAlert } from 'lucide-react';

/* ── Spinner ─────────────────────────────────────────── */

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

export const Spinner = styled.span<{ $size?: number }>`
  display: inline-block;
  width: ${({ $size = 18 }) => $size}px;
  height: ${({ $size = 18 }) => $size}px;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
  animation: ${spin} 0.7s linear infinite;
  flex-shrink: 0;
`;

export function PageLoader({ label = 'Carregando…' }: { label?: string }) {
  return (
    <LoaderWrap role="status" aria-live="polite">
      <Spinner $size={28} />
      <span>{label}</span>
    </LoaderWrap>
  );
}

const LoaderWrap = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  min-height: 240px;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

/* ── Skeleton ────────────────────────────────────────── */

const shimmer = keyframes`
  0% { background-position: -400px 0; }
  100% { background-position: 400px 0; }
`;

export const Skeleton = styled.div<{ $h?: string; $w?: string; $radius?: string }>`
  height: ${({ $h = '1rem' }) => $h};
  width: ${({ $w = '100%' }) => $w};
  border-radius: ${({ $radius, theme }) => $radius ?? theme.radii.md};
  background: linear-gradient(
    90deg,
    ${({ theme }) => theme.colors.surface} 0%,
    ${({ theme }) => theme.colors.surfaceHover} 50%,
    ${({ theme }) => theme.colors.surface} 100%
  );
  background-size: 800px 100%;
  animation: ${shimmer} 1.4s linear infinite;
`;

/* ── Badge ───────────────────────────────────────────── */

export type Tone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info';

const toneStyles = (tone: Tone) => css`
  ${({ theme }) => {
    const c = theme.colors;
    const map = {
      neutral: [c.surfaceHover, c.textSecondary],
      primary: [c.primarySoft, c.primary],
      success: [c.successSoft, c.success],
      warning: [c.warningSoft, c.warning],
      danger: [c.dangerSoft, c.danger],
      info: [c.infoSoft, c.info],
    } as const;
    return `background: ${map[tone][0]}; color: ${map[tone][1]};`;
  }}
`;

export const Badge = styled.span<{ $tone?: Tone }>`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.2rem 0.65rem;
  border-radius: ${({ theme }) => theme.radii.pill};
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  white-space: nowrap;
  ${({ $tone = 'neutral' }) => toneStyles($tone)}
`;

/* ── Alert ───────────────────────────────────────────── */

const alertIcons = { info: Info, success: CheckCircle2, warning: TriangleAlert, danger: AlertCircle };

const AlertBox = styled.div<{ $tone: keyof typeof alertIcons }>`
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
  padding: 0.9rem 1rem;
  border-radius: ${({ theme }) => theme.radii.md};
  font-size: 0.95rem;
  line-height: 1.5;
  ${({ $tone }) => toneStyles($tone)}
  border: 1px solid currentColor;

  svg {
    flex-shrink: 0;
    margin-top: 2px;
  }
  div {
    color: ${({ theme }) => theme.colors.text};
  }
`;

export function Alert({
  tone = 'info',
  children,
}: {
  tone?: keyof typeof alertIcons;
  children: ReactNode;
}) {
  const Icon = alertIcons[tone];
  return (
    <AlertBox $tone={tone} role={tone === 'danger' ? 'alert' : 'status'}>
      <Icon size={18} aria-hidden />
      <div>{children}</div>
    </AlertBox>
  );
}

/* ── Estados vazios e de erro ────────────────────────── */

const StateBox = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 0.75rem;
  padding: 3.5rem 1.5rem;
  border: 1px dashed ${({ theme }) => theme.colors.borderStrong};
  border-radius: ${({ theme }) => theme.radii.lg};
  color: ${({ theme }) => theme.colors.textSecondary};

  svg {
    color: ${({ theme }) => theme.colors.textMuted};
  }
  h3 {
    color: ${({ theme }) => theme.colors.text};
    font-size: 1.15rem;
  }
  p {
    max-width: 420px;
  }
`;

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <StateBox>
      {icon ?? <Inbox size={36} aria-hidden />}
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action}
    </StateBox>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <StateBox role="alert">
      <AlertCircle size={36} aria-hidden />
      <h3>Não foi possível carregar</h3>
      <p>{message}</p>
      {onRetry && (
        <RetryButton type="button" onClick={onRetry}>
          Tentar novamente
        </RetryButton>
      )}
    </StateBox>
  );
}

const RetryButton = styled.button`
  margin-top: 0.5rem;
  padding: 0.6rem 1.25rem;
  border-radius: ${({ theme }) => theme.radii.md};
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  font-weight: 700;
  transition: all ${({ theme }) => theme.transitions.fast};

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.primary};
  }
`;
