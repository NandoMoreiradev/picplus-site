import { useRef, useState } from 'react';
import type { ReactNode } from 'react';
import styled from 'styled-components';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, Check, ChevronDown, Flag } from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import {
  SWATCHES,
  isDueToday,
  isOverdue,
  priorityMeta,
  toDateInput,
  ymdToDate,
} from '../../lib/tasks';
import type { Person, Task, TaskPriority } from '../../lib/tasks';
import { Popover } from './Popover';

/* ── Prioridade ──────────────────────────────────────── */

const PriorityWrap = styled.span<{ $color: string }>`
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.78rem;
  font-weight: 700;
  color: ${({ $color }) => $color};
`;

export function PriorityBadge({ priority, compact }: { priority: TaskPriority; compact?: boolean }) {
  const meta = priorityMeta(priority);
  return (
    <PriorityWrap $color={meta.color} title={`Prioridade ${meta.label.toLowerCase()}`}>
      <Flag size={13} fill="currentColor" aria-hidden />
      {!compact && meta.label}
    </PriorityWrap>
  );
}

/* ── Tag ─────────────────────────────────────────────── */

export const TagChip = styled.span<{ $color: string }>`
  display: inline-flex;
  align-items: center;
  max-width: 100%;
  padding: 0.1rem 0.55rem;
  border-radius: ${({ theme }) => theme.radii.pill};
  font-size: 0.72rem;
  font-weight: 700;
  line-height: 1.5;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: ${({ $color }) => $color};
  background: ${({ $color }) => `${$color}22`};
  border: 1px solid ${({ $color }) => `${$color}44`};
`;

export const ColorDot = styled.span<{ $color: string; $size?: number }>`
  flex-shrink: 0;
  display: inline-block;
  width: ${({ $size = 10 }) => $size}px;
  height: ${({ $size = 10 }) => $size}px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
`;

/* ── Pessoas ─────────────────────────────────────────── */

const StackWrap = styled.span`
  display: inline-flex;

  > * + * {
    margin-left: -8px;
  }
  > * {
    box-shadow: 0 0 0 2px ${({ theme }) => theme.colors.surface};
    border-radius: 50%;
  }
  .more {
    display: grid;
    place-items: center;
    min-width: 24px;
    height: 24px;
    padding: 0 4px;
    border-radius: 999px;
    background: ${({ theme }) => theme.colors.surfaceHover};
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 0.68rem;
    font-weight: 800;
  }
`;

/** Avatares sobrepostos (responsável + colaboradores). */
export function AvatarStack({ people, size = 24, max = 3 }: { people: Person[]; size?: number; max?: number }) {
  if (!people.length) return null;
  const shown = people.slice(0, max);
  const extra = people.length - shown.length;
  return (
    <StackWrap title={people.map((p) => p.name).join(', ')}>
      {shown.map((person) => (
        <Avatar key={`${person.id}:${person.avatarUrl ?? ""}`} src={person.avatarUrl} name={person.name} size={size} />
      ))}
      {extra > 0 && <span className="more">+{extra}</span>}
    </StackWrap>
  );
}

/* ── Prazo ───────────────────────────────────────────── */

const DueWrap = styled.span<{ $tone: 'overdue' | 'today' | 'normal' }>`
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.78rem;
  font-weight: 700;
  white-space: nowrap;
  color: ${({ $tone, theme }) =>
    $tone === 'overdue' ? theme.colors.danger : $tone === 'today' ? theme.colors.warning : theme.colors.textSecondary};
`;

/** "12 out" a partir de uma data de calendário (AAAA-MM-DD ou ISO). */
export const formatDay = (iso?: string | null) =>
  iso ? format(ymdToDate(toDateInput(iso)), 'dd MMM', { locale: ptBR }).replace('.', '') : '';

export const formatDayLong = (iso?: string | null) =>
  iso ? format(ymdToDate(toDateInput(iso)), "dd 'de' MMM 'de' yyyy", { locale: ptBR }).replace('.', '') : '';

export function DueLabel({ task }: { task: Pick<Task, 'dueDate' | 'completedAt'> }) {
  if (!task.dueDate) return null;
  const tone = isOverdue(task) ? 'overdue' : !task.completedAt && isDueToday(task) ? 'today' : 'normal';
  return (
    <DueWrap $tone={tone} title={tone === 'overdue' ? 'Atrasada' : tone === 'today' ? 'Vence hoje' : 'Prazo'}>
      <Calendar size={13} aria-hidden />
      {formatDay(task.dueDate)}
    </DueWrap>
  );
}

/* ── Seleção múltipla em painel ──────────────────────── */

const SelectTrigger = styled.button`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
  width: 100%;
  min-height: 42px;
  padding: 0.5rem 0.8rem;
  text-align: left;
  background: ${({ theme }) => theme.colors.background};
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  border-radius: ${({ theme }) => theme.radii.md};
  color: ${({ theme }) => theme.colors.text};
  font-size: 0.92rem;
  transition: border-color ${({ theme }) => theme.transitions.fast};

  &:hover,
  &[aria-expanded='true'] {
    border-color: ${({ theme }) => theme.colors.primary};
  }
  .placeholder {
    color: ${({ theme }) => theme.colors.textMuted};
  }
  .summary {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.35rem;
    min-width: 0;
  }
`;

const OptionRow = styled.button<{ $on: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.6rem;
  width: 100%;
  padding: 0.5rem 0.6rem;
  border-radius: ${({ theme }) => theme.radii.sm};
  font-size: 0.9rem;
  text-align: left;
  color: ${({ theme }) => theme.colors.text};

  &:hover {
    background: ${({ theme }) => theme.colors.surfaceHover};
  }
  .box {
    flex-shrink: 0;
    display: grid;
    place-items: center;
    width: 18px;
    height: 18px;
    border-radius: 5px;
    border: 1px solid ${({ $on, theme }) => ($on ? theme.colors.primary : theme.colors.borderStrong)};
    background: ${({ $on, theme }) => ($on ? theme.colors.primary : 'transparent')};
    color: ${({ theme }) => theme.colors.textDark};
  }
`;

const EmptyOptions = styled.p`
  padding: 0.6rem;
  font-size: 0.85rem;
  color: ${({ theme }) => theme.colors.textMuted};
`;

export interface MultiOption {
  value: string;
  label: string;
  /** Cor (tags) ou nome para o avatar (pessoas). */
  color?: string;
  person?: boolean;
  /** Foto da pessoa (quando person). */
  avatarUrl?: string | null;
}

/**
 * Escolha de vários itens (pessoas, tags) num painel. `renderValue` desenha o resumo
 * no botão; sem ele, mostra "N selecionados".
 */
export function MultiSelect({
  options,
  value,
  onChange,
  placeholder,
  emptyText = 'Nada para escolher.',
  footer,
  renderValue,
  disabled,
  label,
}: {
  options: MultiOption[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder: string;
  emptyText?: string;
  footer?: ReactNode;
  renderValue?: (selected: MultiOption[]) => ReactNode;
  disabled?: boolean;
  label: string;
}) {
  const anchor = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  // O painel tem a largura do botão que o abriu (medida ao abrir, não durante a renderização).
  const [panelWidth, setPanelWidth] = useState<number>();
  const selected = options.filter((option) => value.includes(option.value));
  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);

  return (
    <>
      <SelectTrigger
        ref={anchor}
        type="button"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => {
          setPanelWidth(anchor.current?.offsetWidth);
          setOpen((v) => !v);
        }}
      >
        <span className="summary">
          {selected.length === 0 ? (
            <span className="placeholder">{placeholder}</span>
          ) : renderValue ? (
            renderValue(selected)
          ) : (
            `${selected.length} selecionado${selected.length > 1 ? 's' : ''}`
          )}
        </span>
        <ChevronDown size={16} aria-hidden />
      </SelectTrigger>
      <Popover anchor={anchor} open={open} onClose={() => setOpen(false)} width={panelWidth}>
        {options.length === 0 ? (
          <EmptyOptions>{emptyText}</EmptyOptions>
        ) : (
          options.map((option) => {
            const on = value.includes(option.value);
            return (
              <OptionRow key={option.value} type="button" role="option" aria-selected={on} $on={on} onClick={() => toggle(option.value)}>
                <span className="box">{on && <Check size={12} strokeWidth={3} aria-hidden />}</span>
                {option.person ? (
                  <span aria-hidden>
                    <Avatar key={option.avatarUrl ?? 'none'} src={option.avatarUrl} name={option.label} size={22} />
                  </span>
                ) : (
                  option.color && <ColorDot $color={option.color} />
                )}
                {option.label}
              </OptionRow>
            );
          })
        )}
        {footer}
      </Popover>
    </>
  );
}

/* ── Cor ─────────────────────────────────────────────── */

const SwatchRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;

  button {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    border: 2px solid transparent;
    transition: transform ${({ theme }) => theme.transitions.fast};
  }
  button:hover {
    transform: scale(1.12);
  }
  button[aria-pressed='true'] {
    border-color: ${({ theme }) => theme.colors.text};
  }
  input[type='color'] {
    width: 28px;
    height: 28px;
    padding: 0;
    border: 1px solid ${({ theme }) => theme.colors.borderStrong};
    border-radius: 50%;
    background: none;
    cursor: pointer;
  }
  input[type='color']::-webkit-color-swatch-wrapper {
    padding: 0;
  }
  input[type='color']::-webkit-color-swatch {
    border: none;
    border-radius: 50%;
  }
`;

/** Paleta rápida + seletor livre de cor. */
export function ColorPicker({ value, onChange, label }: { value: string; onChange: (color: string) => void; label: string }) {
  return (
    <SwatchRow role="group" aria-label={label}>
      {SWATCHES.map((color) => (
        <button
          key={color}
          type="button"
          style={{ background: color }}
          aria-label={`Cor ${color}`}
          aria-pressed={value.toLowerCase() === color.toLowerCase()}
          onClick={() => onChange(color)}
        />
      ))}
      <input type="color" value={value} onChange={(event) => onChange(event.target.value)} aria-label="Outra cor" />
    </SwatchRow>
  );
}
