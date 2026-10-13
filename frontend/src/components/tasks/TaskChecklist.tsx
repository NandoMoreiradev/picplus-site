import { useState } from 'react';
import type { FormEvent } from 'react';
import styled from 'styled-components';
import { Check, Plus, Trash2 } from 'lucide-react';
import { api } from '../../lib/api';
import { checklistProgress } from '../../lib/tasks';
import type { Subtask, Task } from '../../lib/tasks';
import { errorMessage } from '../../lib/validation';
import { IconButton } from '../admin/AdminUI';
import { useToast } from '../ui/Toast';

const Progress = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.9rem;
  font-size: 0.82rem;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.textSecondary};

  .track {
    flex: 1;
    height: 6px;
    border-radius: 6px;
    background: ${({ theme }) => theme.colors.border};
    overflow: hidden;
  }
  .fill {
    height: 100%;
    border-radius: 6px;
    background: ${({ theme }) => theme.colors.primary};
    transition: width ${({ theme }) => theme.transitions.default};
  }
`;

const List = styled.ul`
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
`;

const Row = styled.li<{ $done: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.7rem;
  padding: 0.35rem 0.4rem;
  border-radius: ${({ theme }) => theme.radii.sm};

  &:hover {
    background: ${({ theme }) => theme.colors.surfaceHover};
  }
  &:hover .remove,
  &:focus-within .remove {
    opacity: 1;
  }
  .remove {
    opacity: 0;
  }
  .title {
    flex: 1;
    min-width: 0;
    padding: 0.2rem 0.3rem;
    font-size: 0.95rem;
    word-break: break-word;
    color: ${({ $done, theme }) => ($done ? theme.colors.textMuted : theme.colors.text)};
    text-decoration: ${({ $done }) => ($done ? 'line-through' : 'none')};
    border: 1px solid transparent;
    border-radius: ${({ theme }) => theme.radii.sm};
    background: transparent;
  }
  input.title:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
    background: ${({ theme }) => theme.colors.background};
  }
`;

const Tick = styled.button<{ $on: boolean }>`
  flex-shrink: 0;
  display: grid;
  place-items: center;
  width: 20px;
  height: 20px;
  border-radius: 6px;
  border: 2px solid ${({ $on, theme }) => ($on ? theme.colors.primary : theme.colors.borderStrong)};
  background: ${({ $on, theme }) => ($on ? theme.colors.primary : 'transparent')};
  color: ${({ theme }) => theme.colors.textDark};

  &:hover:not(:disabled) {
    border-color: ${({ theme }) => theme.colors.primary};
  }
  &:disabled {
    cursor: default;
  }
`;

const Add = styled.form`
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-top: 0.6rem;
  padding: 0 0.4rem;
  color: ${({ theme }) => theme.colors.textSecondary};

  input {
    flex: 1;
    height: 40px;
    padding: 0 0.7rem;
    background: transparent;
    color: ${({ theme }) => theme.colors.text};
    border: 1px dashed ${({ theme }) => theme.colors.borderStrong};
    border-radius: ${({ theme }) => theme.radii.md};
  }
  input:focus {
    outline: none;
    border-style: solid;
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

/**
 * Checklist da tarefa: cada item é uma subtarefa. As chamadas vão direto à API e, no fim,
 * a tarefa-pai é recarregada (`onChanged`) — itens nunca entram na lista de tarefas da tela.
 */
export function TaskChecklist({ task, canEdit, onChanged }: { task: Task; canEdit: boolean; onChanged: () => void }) {
  const toast = useToast();
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const progress = checklistProgress(task);

  const run = async (job: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await job();
      onChanged();
      return true;
    } catch (error) {
      toast.error(errorMessage(error));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const add = async (event: FormEvent) => {
    event.preventDefault();
    const clean = title.trim();
    if (!clean) return;
    // Limpa já (dá para digitar o próximo item enquanto este salva); devolve o texto se falhar.
    setTitle('');
    if (!(await run(() => api.post('/admin/tasks', { title: clean, parentTaskId: task.id })))) setTitle(clean);
  };

  const toggle = (item: Subtask) => run(() => api.patch(`/admin/tasks/${item.id}`, { completed: !item.completedAt }));
  const rename = (item: Subtask, next: string) => run(() => api.patch(`/admin/tasks/${item.id}`, { title: next }));
  const remove = (item: Subtask) => run(() => api.delete(`/admin/tasks/${item.id}`));

  return (
    <div>
      {progress.total > 0 && (
        <Progress>
          {progress.percent}%
          <div className="track">
            <div className="fill" style={{ width: `${progress.percent}%` }} />
          </div>
          {progress.done}/{progress.total}
        </Progress>
      )}

      <List>
        {task.subtasks.map((item) => {
          const done = !!item.completedAt;
          return (
            <Row key={item.id} $done={done}>
              <Tick type="button" $on={done} disabled={!canEdit || busy} aria-label={done ? `Reabrir “${item.title}”` : `Concluir “${item.title}”`} onClick={() => void toggle(item)}>
                {done && <Check size={12} strokeWidth={4} aria-hidden />}
              </Tick>
              {canEdit ? (
                <input
                  className="title"
                  defaultValue={item.title}
                  maxLength={200}
                  aria-label="Texto do item"
                  onBlur={(event) => {
                    const next = event.target.value.trim();
                    if (!next) event.target.value = item.title;
                    else if (next !== item.title) void rename(item, next);
                  }}
                  onKeyDown={(event) => event.key === 'Enter' && event.currentTarget.blur()}
                />
              ) : (
                <span className="title">{item.title}</span>
              )}
              {canEdit && (
                <span className="remove">
                  <IconButton label={`Excluir “${item.title}”`} danger disabled={busy} onClick={() => void remove(item)}>
                    <Trash2 size={15} />
                  </IconButton>
                </span>
              )}
            </Row>
          );
        })}
      </List>

      {task.subtasks.length === 0 && !canEdit && <p style={{ color: '#737373' }}>Nenhum item no checklist.</p>}

      {canEdit && (
        <Add onSubmit={add}>
          <Plus size={18} aria-hidden />
          <input aria-label="Novo item do checklist" placeholder="Adicionar item e apertar Enter…" maxLength={200} value={title} onChange={(event) => setTitle(event.target.value)} />
        </Add>
      )}
    </div>
  );
}
