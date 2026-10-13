import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode, RefObject } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';
import { MoreHorizontal } from 'lucide-react';

const Layer = styled.div`
  position: fixed;
  z-index: 700; /* acima dos modais (500) */
  min-width: 200px;
  max-height: min(380px, 70vh);
  overflow-y: auto;
  padding: 0.35rem;
  background: ${({ theme }) => theme.colors.surfaceElevated};
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  border-radius: ${({ theme }) => theme.radii.md};
  box-shadow: ${({ theme }) => theme.shadows.overlay};
`;

/**
 * Painel flutuante ancorado a um elemento. Vai para o <body> (portal) com posição fixa,
 * então não é cortado por colunas do Kanban nem por modais com rolagem. Fecha com ESC,
 * clique fora ou rolagem da página.
 */
export function Popover({
  anchor,
  open,
  onClose,
  align = 'start',
  width,
  children,
}: {
  anchor: RefObject<HTMLElement | null>;
  open: boolean;
  onClose: () => void;
  align?: 'start' | 'end';
  width?: number;
  children: ReactNode;
}) {
  const layer = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<{ top: number; left: number; minWidth?: number }>();

  useLayoutEffect(() => {
    if (!open || !anchor.current) return;
    const rect = anchor.current.getBoundingClientRect();
    const height = layer.current?.offsetHeight ?? 0;
    const panelWidth = Math.max(layer.current?.offsetWidth ?? 0, width ?? 0, 200);
    const below = rect.bottom + 6;
    const top = below + height > window.innerHeight - 8 && rect.top - 6 - height > 8 ? rect.top - 6 - height : below;
    const left = align === 'end' ? rect.right - panelWidth : rect.left;
    setStyle({
      top,
      left: Math.min(Math.max(8, left), window.innerWidth - panelWidth - 8),
      minWidth: width,
    });
  }, [open, anchor, align, width, children]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      const target = event.target as Node;
      if (layer.current?.contains(target) || anchor.current?.contains(target)) return;
      onClose();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.stopPropagation(); // fecha só o painel, não o modal por baixo
      onClose();
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey, true);
    const onScroll = (event: Event) => {
      if (!layer.current?.contains(event.target as Node)) onClose();
    };
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onClose);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey, true);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onClose);
    };
  }, [open, anchor, onClose]);

  if (!open) return null;
  return createPortal(
    <Layer ref={layer} style={{ ...style, visibility: style ? 'visible' : 'hidden' }} role="menu">
      {children}
    </Layer>,
    document.body,
  );
}

/* ── Menu de ações ───────────────────────────────────── */

export const MenuItem = styled.button<{ $danger?: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.6rem;
  width: 100%;
  padding: 0.55rem 0.7rem;
  border-radius: ${({ theme }) => theme.radii.sm};
  font-size: 0.88rem;
  font-weight: 600;
  text-align: left;
  color: ${({ $danger, theme }) => ($danger ? theme.colors.danger : theme.colors.text)};

  &:hover:not(:disabled) {
    background: ${({ $danger, theme }) => ($danger ? theme.colors.dangerSoft : theme.colors.surfaceHover)};
  }
  svg {
    flex-shrink: 0;
    color: ${({ $danger, theme }) => ($danger ? theme.colors.danger : theme.colors.textSecondary)};
  }
`;

export const MenuDivider = styled.hr`
  border: 0;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  margin: 0.3rem 0;
`;

const Trigger = styled.button<{ $open: boolean }>`
  display: inline-grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border-radius: ${({ theme }) => theme.radii.sm};
  color: ${({ theme }) => theme.colors.textSecondary};
  background: ${({ $open, theme }) => ($open ? theme.colors.surfaceHover : 'transparent')};

  &:hover {
    background: ${({ theme }) => theme.colors.surfaceHover};
    color: ${({ theme }) => theme.colors.text};
  }
`;

export interface ActionItem {
  label: string;
  icon?: ReactNode;
  danger?: boolean;
  onSelect: () => void;
  /** Linha separadora antes do item. */
  divider?: boolean;
}

/** Botão "⋯" que abre uma lista de ações. */
export function ActionMenu({ items, label = 'Mais ações' }: { items: ActionItem[]; label?: string }) {
  const anchor = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  return (
    <>
      <Trigger
        ref={anchor}
        type="button"
        $open={open}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        // O Kanban arrasta pelo cartão: o menu não pode iniciar um arraste nem abrir a tarefa.
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((value) => !value);
        }}
      >
        <MoreHorizontal size={18} aria-hidden />
      </Trigger>
      <Popover anchor={anchor} open={open} onClose={() => setOpen(false)} align="end">
        {items.map((item) => (
          <div key={item.label}>
            {item.divider && <MenuDivider />}
            <MenuItem
              type="button"
              role="menuitem"
              $danger={item.danger}
              onClick={(event) => {
                event.stopPropagation();
                setOpen(false);
                item.onSelect();
              }}
            >
              {item.icon}
              {item.label}
            </MenuItem>
          </div>
        ))}
      </Popover>
    </>
  );
}
