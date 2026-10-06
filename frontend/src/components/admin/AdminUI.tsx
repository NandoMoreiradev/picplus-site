import type { ButtonHTMLAttributes, ReactNode } from 'react';
import styled from 'styled-components';
import { Badge } from '../ui/Feedback';
import type { Tone } from '../ui/Feedback';

/* ── Cabeçalho de página ─────────────────────────────── */

const HeaderWrap = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 1.75rem;

  h1 {
    font-size: 1.8rem;
    font-weight: 800;
  }
  p {
    color: ${({ theme }) => theme.colors.textSecondary};
    margin-top: 0.25rem;
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
  }
`;

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <HeaderWrap>
      <div>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="actions">{actions}</div>}
    </HeaderWrap>
  );
}

export const Toolbar = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 1.25rem;

  .grow {
    flex: 1;
    min-width: 240px;
    max-width: 420px;
  }
`;

/* ── Painel (card) ───────────────────────────────────── */

export const Panel = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
`;

/* ── Tabela ──────────────────────────────────────────── */

export const TableWrap = styled(Panel)`
  overflow-x: auto;
`;

export const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  min-width: 640px;

  th {
    text-align: left;
    padding: 0.85rem 1.1rem;
    font-size: 0.75rem;
    font-weight: 800;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: ${({ theme }) => theme.colors.textMuted};
    border-bottom: 1px solid ${({ theme }) => theme.colors.border};
    white-space: nowrap;
  }
  td {
    padding: 0.9rem 1.1rem;
    border-bottom: 1px solid ${({ theme }) => theme.colors.border};
    vertical-align: middle;
    font-size: 0.95rem;
  }
  tbody tr:last-child td {
    border-bottom: none;
  }
  tbody tr.clickable {
    cursor: pointer;
    transition: background ${({ theme }) => theme.transitions.fast};
  }
  tbody tr.clickable:hover {
    background: ${({ theme }) => theme.colors.surfaceHover};
  }
  td.right,
  th.right {
    text-align: right;
  }
  td.muted {
    color: ${({ theme }) => theme.colors.textSecondary};
  }
`;

export const CellMain = styled.div`
  display: flex;
  align-items: center;
  gap: 0.85rem;
  min-width: 0;

  strong {
    display: block;
    font-weight: 700;
  }
  small {
    display: block;
    color: ${({ theme }) => theme.colors.textMuted};
    font-size: 0.82rem;
  }
`;

/* ── Botão de ícone ──────────────────────────────────── */

const IconBtn = styled.button<{ $danger?: boolean }>`
  display: inline-grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: ${({ theme }) => theme.radii.md};
  color: ${({ theme }) => theme.colors.textSecondary};
  transition: all ${({ theme }) => theme.transitions.fast};

  &:hover:not(:disabled) {
    background: ${({ $danger, theme }) => ($danger ? theme.colors.dangerSoft : theme.colors.surfaceHover)};
    color: ${({ $danger, theme }) => ($danger ? theme.colors.danger : theme.colors.text)};
  }
`;

export function IconButton({
  label,
  danger,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; danger?: boolean }) {
  return (
    <IconBtn type="button" title={label} aria-label={label} $danger={danger} {...rest}>
      {children}
    </IconBtn>
  );
}

export const RowActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.15rem;
`;

/* ── Abas com contador ───────────────────────────────── */

const TabList = styled.div`
  display: flex;
  gap: 0.25rem;
  padding: 0.3rem;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  overflow-x: auto;
`;

const TabBtn = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: ${({ theme }) => theme.radii.sm};
  font-weight: 700;
  font-size: 0.9rem;
  white-space: nowrap;
  background: ${({ $active, theme }) => ($active ? theme.colors.primary : 'transparent')};
  color: ${({ $active, theme }) => ($active ? theme.colors.textDark : theme.colors.textSecondary)};
  transition: all ${({ theme }) => theme.transitions.fast};

  &:hover:not([aria-selected='true']) {
    background: ${({ theme }) => theme.colors.surfaceHover};
    color: ${({ theme }) => theme.colors.text};
  }
  .count {
    min-width: 22px;
    padding: 0 0.4rem;
    border-radius: 999px;
    background: ${({ $active, theme }) => ($active ? 'rgba(0,0,0,0.18)' : theme.colors.surfaceHover)};
    font-size: 0.75rem;
    line-height: 22px;
    text-align: center;
  }
`;

export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: { key: T; label: string; count?: number }[];
  value: T;
  onChange: (key: T) => void;
}) {
  return (
    <TabList role="tablist">
      {tabs.map((tab) => (
        <TabBtn
          key={tab.key}
          type="button"
          role="tab"
          aria-selected={value === tab.key}
          $active={value === tab.key}
          onClick={() => onChange(tab.key)}
        >
          {tab.label}
          {tab.count !== undefined && <span className="count">{tab.count}</span>}
        </TabBtn>
      ))}
    </TabList>
  );
}

/* ── Pílula de status ────────────────────────────────── */

export function StatusPill({ tone, children }: { tone: Tone; children: ReactNode }) {
  return <Badge $tone={tone}>{children}</Badge>;
}

/* ── Linha de detalhe (rótulo + valor) ───────────────── */

export const DetailList = styled.dl`
  display: grid;
  grid-template-columns: 140px 1fr;
  gap: 0.7rem 1rem;

  dt {
    color: ${({ theme }) => theme.colors.textMuted};
    font-size: 0.85rem;
  }
  dd {
    word-break: break-word;
    white-space: pre-line;
  }

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    grid-template-columns: 1fr;
    gap: 0.1rem;
    dd {
      margin-bottom: 0.6rem;
    }
  }
`;

export const FormStack = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
`;
