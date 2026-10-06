import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import styled, { keyframes } from 'styled-components';
import { X } from 'lucide-react';
import { Button } from './Button';

const fadeIn = keyframes`from { opacity: 0 } to { opacity: 1 }`;
const popIn = keyframes`from { opacity: 0; transform: translateY(16px) scale(0.98) } to { opacity: 1; transform: none }`;
const slideIn = keyframes`from { transform: translateX(100%) } to { transform: none }`;

const Backdrop = styled.div<{ $drawer?: boolean }>`
  position: fixed;
  inset: 0;
  z-index: 500;
  background: ${({ theme }) => theme.colors.overlay};
  backdrop-filter: blur(4px);
  display: flex;
  align-items: ${({ $drawer }) => ($drawer ? 'stretch' : 'center')};
  justify-content: ${({ $drawer }) => ($drawer ? 'flex-end' : 'center')};
  padding: ${({ $drawer }) => ($drawer ? '0' : '1.25rem')};
  animation: ${fadeIn} 0.2s ease-out;
`;

const Panel = styled.div<{ $drawer?: boolean; $width: string }>`
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: ${({ $width }) => $width};
  max-height: ${({ $drawer }) => ($drawer ? '100%' : 'calc(100vh - 2.5rem)')};
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ $drawer, theme }) => ($drawer ? `${theme.radii.xl} 0 0 ${theme.radii.xl}` : theme.radii.xl)};
  box-shadow: ${({ theme }) => theme.shadows.overlay};
  animation: ${({ $drawer }) => ($drawer ? slideIn : popIn)} 0.28s ease-out;

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    border-radius: ${({ $drawer, theme }) => ($drawer ? '0' : theme.radii.lg)};
  }
`;

const Head = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};

  h2 {
    font-size: 1.25rem;
    font-weight: 800;
  }
  p {
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 0.9rem;
    margin-top: 0.2rem;
  }
`;

const CloseButton = styled.button`
  flex-shrink: 0;
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: ${({ theme }) => theme.radii.md};
  color: ${({ theme }) => theme.colors.textSecondary};
  transition: all ${({ theme }) => theme.transitions.fast};

  &:hover {
    background: ${({ theme }) => theme.colors.surfaceHover};
    color: ${({ theme }) => theme.colors.text};
  }
`;

const Body = styled.div`
  padding: 1.5rem;
  overflow-y: auto;
  flex: 1;
`;

const Foot = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  flex-wrap: wrap;
  padding: 1rem 1.5rem;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
`;

const FOCUSABLE =
  'a[href], button:not(:disabled), textarea:not(:disabled), input:not(:disabled), select:not(:disabled), [tabindex]:not([tabindex="-1"])';

/** Modais atualmente abertos, do mais antigo ao mais recente. */
const modalStack: symbol[] = [];

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  /** `drawer` abre como painel lateral (formulários do admin). */
  variant?: 'dialog' | 'drawer';
  width?: string;
}

/** Diálogo acessível: portal, foco preso, ESC, bloqueio de scroll e restauração do foco. */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  variant = 'dialog',
  width,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  // Mantém o handler mais recente sem reinstalar os listeners a cada render.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });
  const isDrawer = variant === 'drawer';

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const panel = panelRef.current;
    // Foca o primeiro campo do conteúdo (não o botão de fechar), quando existir.
    const focusTarget =
      panel?.querySelector<HTMLElement>('input:not(:disabled), textarea:not(:disabled), select:not(:disabled)') ??
      panel?.querySelector<HTMLElement>(FOCUSABLE);
    focusTarget?.focus();

    // Pilha de modais: com um diálogo aberto sobre um drawer, só o do topo reage ao teclado.
    const token = Symbol('modal');
    modalStack.push(token);

    const onKeyDown = (event: KeyboardEvent) => {
      if (modalStack[modalStack.length - 1] !== token) return;
      if (event.key === 'Escape') {
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab' || !panel) return;
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      modalStack.splice(modalStack.indexOf(token), 1);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <Backdrop
      $drawer={isDrawer}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <Panel
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        $drawer={isDrawer}
        $width={width ?? (isDrawer ? '640px' : '560px')}
      >
        <Head>
          <div>
            <h2>{title}</h2>
            {description && <p>{description}</p>}
          </div>
          <CloseButton type="button" onClick={onClose} aria-label="Fechar">
            <X size={20} />
          </CloseButton>
        </Head>
        <Body>{children}</Body>
        {footer && <Foot>{footer}</Foot>}
      </Panel>
    </Backdrop>,
    document.body,
  );
}

/** Confirmação para ações destrutivas. */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Excluir',
  loading,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      width="440px"
      footer={
        <>
          <Button variant="ghost" onClick={onCancel} disabled={loading}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div style={{ color: '#a3a3a3', lineHeight: 1.6 }}>{message}</div>
    </Modal>
  );
}
