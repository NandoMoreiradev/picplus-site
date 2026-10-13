import { useState } from 'react';
import styled from 'styled-components';
import { Trash2, X } from 'lucide-react';
import { PRIORITIES, fromDateInput } from '../../lib/tasks';
import type { StageLite, TaskPriority, TaskUser } from '../../lib/tasks';
import type { BulkPatch } from '../../hooks/useTaskActions';
import { ConfirmDialog } from '../ui/Modal';

const Bar = styled.div`
  position: fixed;
  left: 50%;
  bottom: 1.5rem;
  z-index: 300;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.75rem;
  width: max-content;
  max-width: calc(100vw - 2rem);
  padding: 0.7rem 1rem;
  background: ${({ theme }) => theme.colors.surfaceElevated};
  border: 1px solid ${({ theme }) => theme.colors.primaryBorder};
  border-radius: ${({ theme }) => theme.radii.lg};
  box-shadow: ${({ theme }) => theme.shadows.overlay};

  .count {
    font-weight: 800;
    font-size: 0.9rem;
    padding-right: 0.5rem;
    color: ${({ theme }) => theme.colors.primary};
  }
  select,
  input[type='date'] {
    height: 36px;
    padding: 0 0.6rem;
    background: ${({ theme }) => theme.colors.background};
    color: ${({ theme }) => theme.colors.text};
    border: 1px solid ${({ theme }) => theme.colors.borderStrong};
    border-radius: ${({ theme }) => theme.radii.sm};
    font-size: 0.85rem;
  }
  select:focus,
  input:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

const Plain = styled.button<{ $danger?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  height: 36px;
  padding: 0 0.8rem;
  border-radius: ${({ theme }) => theme.radii.sm};
  font-size: 0.85rem;
  font-weight: 700;
  color: ${({ $danger, theme }) => ($danger ? theme.colors.danger : theme.colors.textSecondary)};

  &:hover {
    background: ${({ $danger, theme }) => ($danger ? theme.colors.dangerSoft : theme.colors.surfaceHover)};
    color: ${({ $danger, theme }) => ($danger ? theme.colors.danger : theme.colors.text)};
  }
`;

/** Ações para as tarefas selecionadas. Cada campo aplica a mudança assim que é escolhido. */
export function BulkActionBar({
  count,
  stages,
  users,
  canEdit,
  canDelete,
  onApply,
  onDelete,
  onClear,
}: {
  count: number;
  /** Colunas de destino; omitido fora do Kanban (onde cada tarefa tem as suas). */
  stages?: StageLite[];
  users: TaskUser[];
  canEdit: boolean;
  canDelete: boolean;
  onApply: (patch: BulkPatch) => Promise<boolean>;
  onDelete: () => Promise<boolean>;
  onClear: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  // Selects voltam ao texto-guia depois de aplicar (a escolha não fica "marcada").
  const [nonce, setNonce] = useState(0);

  if (count === 0) return null;

  const apply = async (patch: BulkPatch) => {
    setBusy(true);
    const ok = await onApply(patch);
    setBusy(false);
    if (ok) {
      setNonce((n) => n + 1);
      onClear();
    }
  };

  return (
    <>
      <Bar role="region" aria-label="Ações em massa">
        <span className="count">
          {count} {count === 1 ? 'selecionada' : 'selecionadas'}
        </span>

        {canEdit && stages && (
          <select
            key={`stage-${nonce}`}
            aria-label="Mover para o estágio"
            defaultValue=""
            disabled={busy}
            onChange={(event) => event.target.value && void apply({ stageId: event.target.value })}
          >
            <option value="">Mover para…</option>
            {stages.map((stage) => (
              <option key={stage.id} value={stage.id}>
                {stage.name}
              </option>
            ))}
          </select>
        )}
        {canEdit && (
          <>
            <select
              key={`priority-${nonce}`}
              aria-label="Alterar prioridade"
              defaultValue=""
              disabled={busy}
              onChange={(event) => event.target.value && void apply({ priority: event.target.value as TaskPriority })}
            >
              <option value="">Prioridade…</option>
              {PRIORITIES.map((priority) => (
                <option key={priority.value} value={priority.value}>
                  {priority.label}
                </option>
              ))}
            </select>
            <select
              key={`assignee-${nonce}`}
              aria-label="Alterar responsável"
              defaultValue=""
              disabled={busy}
              onChange={(event) => {
                const value = event.target.value;
                if (value) void apply({ assignedToId: value === 'none' ? null : value });
              }}
            >
              <option value="">Responsável…</option>
              <option value="none">Sem responsável</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
            <input
              key={`date-${nonce}`}
              type="date"
              aria-label="Definir prazo"
              title="Definir prazo"
              disabled={busy}
              onChange={(event) => event.target.value && void apply({ dueDate: fromDateInput(event.target.value) })}
            />
          </>
        )}

        {canDelete && (
          <Plain type="button" $danger onClick={() => setConfirming(true)} disabled={busy}>
            <Trash2 size={15} aria-hidden /> Excluir
          </Plain>
        )}
        <Plain type="button" onClick={onClear} aria-label="Limpar seleção">
          <X size={15} aria-hidden /> Limpar
        </Plain>
      </Bar>

      <ConfirmDialog
        open={confirming}
        title="Excluir tarefas selecionadas"
        message={`${count} ${count === 1 ? 'tarefa será movida' : 'tarefas serão movidas'} para a lixeira. Dá para restaurar depois.`}
        confirmLabel="Mover para a lixeira"
        loading={busy}
        onCancel={() => setConfirming(false)}
        onConfirm={async () => {
          setBusy(true);
          const ok = await onDelete();
          setBusy(false);
          setConfirming(false);
          if (ok) onClear();
        }}
      />
    </>
  );
}
