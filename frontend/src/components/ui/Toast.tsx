import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import styled, { keyframes } from 'styled-components';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';

type ToastTone = 'success' | 'error';
interface ToastItem {
  id: number;
  tone: ToastTone;
  message: string;
}

interface ToastApi {
  success: (message: string) => void;
  error: (message: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const slideUp = keyframes`from { opacity: 0; transform: translateY(16px) } to { opacity: 1; transform: none }`;

const Region = styled.div`
  position: fixed;
  right: 1.25rem;
  bottom: 1.25rem;
  z-index: 900;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  max-width: min(420px, calc(100vw - 2.5rem));
`;

const ToastBox = styled.div<{ $tone: ToastTone }>`
  display: flex;
  align-items: flex-start;
  gap: 0.7rem;
  padding: 0.85rem 1rem;
  background: ${({ theme }) => theme.colors.surfaceElevated};
  border: 1px solid ${({ $tone, theme }) => ($tone === 'success' ? theme.colors.success : theme.colors.danger)};
  border-radius: ${({ theme }) => theme.radii.md};
  box-shadow: ${({ theme }) => theme.shadows.overlay};
  animation: ${slideUp} 0.25s ease-out;
  font-size: 0.95rem;

  svg:first-child {
    flex-shrink: 0;
    margin-top: 2px;
    color: ${({ $tone, theme }) => ($tone === 'success' ? theme.colors.success : theme.colors.danger)};
  }
  span {
    flex: 1;
  }
  button {
    color: ${({ theme }) => theme.colors.textMuted};
    &:hover {
      color: ${({ theme }) => theme.colors.text};
    }
  }
`;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => setItems((list) => list.filter((t) => t.id !== id)), []);

  const push = useCallback(
    (tone: ToastTone, message: string) => {
      const id = nextId.current++;
      setItems((list) => [...list.slice(-3), { id, tone, message }]);
      setTimeout(() => dismiss(id), tone === 'error' ? 7000 : 4500);
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({ success: (m) => push('success', m), error: (m) => push('error', m) }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <Region aria-live="polite">
        {items.map((item) => (
          <ToastBox key={item.id} $tone={item.tone} role={item.tone === 'error' ? 'alert' : 'status'}>
            {item.tone === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span>{item.message}</span>
            <button type="button" onClick={() => dismiss(item.id)} aria-label="Dispensar">
              <X size={16} />
            </button>
          </ToastBox>
        ))}
      </Region>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast deve ser usado dentro de <ToastProvider>');
  return ctx;
}
