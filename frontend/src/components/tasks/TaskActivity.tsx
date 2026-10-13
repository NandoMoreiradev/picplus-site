import styled from 'styled-components';
import { useFetch } from '../../hooks/useFetch';
import { formatDateTime } from '../../lib/format';
import { priorityMeta } from '../../lib/tasks';
import type { TaskActivity as Activity, TaskPriority } from '../../lib/tasks';
import { Avatar } from '../ui/Avatar';
import { EmptyState, ErrorState, Skeleton } from '../ui/Feedback';
import { formatDayLong } from './TaskUI';

const List = styled.ul`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 0.5rem;
`;

const Item = styled.li`
  display: flex;
  gap: 0.75rem;

  .body {
    flex: 1;
    min-width: 0;
    font-size: 0.9rem;
    line-height: 1.5;
  }
  .who {
    font-weight: 800;
  }
  .when {
    margin-left: 0.4rem;
    font-size: 0.78rem;
    color: ${({ theme }) => theme.colors.textMuted};
  }
  ul {
    margin-top: 0.3rem;
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 0.84rem;
  }
  del {
    color: ${({ theme }) => theme.colors.textMuted};
  }
`;

const FIELD_LABEL: Record<string, string> = {
  title: 'Título',
  description: 'Descrição',
  priority: 'Prioridade',
  startDate: 'Início',
  dueDate: 'Prazo',
  assignedTo: 'Responsável',
  coAssignees: 'Colaboradores',
  tags: 'Tags',
  project: 'Projeto',
  stage: 'Estágio',
};

const list = (value: unknown) => (Array.isArray(value) ? (value as string[]).join(', ') || 'ninguém' : String(value ?? '—'));

/** Valor de um campo no histórico, já em português. */
function show(field: string, value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (field === 'priority') return priorityMeta(value as TaskPriority).label;
  if (field === 'startDate' || field === 'dueDate') return formatDayLong(String(value));
  if (field === 'coAssignees' || field === 'tags') return list(value);
  return String(value);
}

export function TaskActivity({ taskId }: { taskId: string }) {
  const activity = useFetch<Activity[]>(`/admin/tasks/${taskId}/activities`);
  const items = activity.data ?? [];

  if (activity.error) return <ErrorState message={activity.error.message} onRetry={activity.reload} />;
  if (activity.loading && !activity.data) return <Skeleton $h="120px" />;
  if (items.length === 0) return <EmptyState title="Sem histórico" />;

  return (
    <List>
      {items.map((item) => (
        <Item key={item.id}>
          <Avatar name={item.user?.name ?? 'Sistema'} size={30} />
          <div className="body">
            <span className="who">{item.user?.name ?? 'Usuário removido'}</span> — {item.description ?? 'tarefa atualizada'}
            <span className="when">{formatDateTime(item.createdAt)}</span>
            {item.changes && Object.keys(item.changes).length > 0 && (
              <ul>
                {Object.entries(item.changes).map(([field, change]) => (
                  <li key={field}>
                    <strong>{FIELD_LABEL[field] ?? field}:</strong> <del>{show(field, change.old)}</del> → {show(field, change.new)}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Item>
      ))}
    </List>
  );
}
