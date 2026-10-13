import { useMemo, useState } from 'react';
import styled from 'styled-components';
import { ArrowDown, ArrowUp, Check, Copy, ExternalLink, Trash2 } from 'lucide-react';
import type { TaskActions } from '../../hooks/useTaskActions';
import { PRIORITIES, checklistProgress, taskPeople, toDateInput } from '../../lib/tasks';
import type { Task } from '../../lib/tasks';
import { Table, TableWrap } from '../admin/AdminUI';
import { ActionMenu } from './Popover';
import { AvatarStack, ColorDot, DueLabel, PriorityBadge, TagChip } from './TaskUI';

const Wrap = styled(TableWrap)`
  margin: 1.25rem 1.5rem 5rem;

  table {
    min-width: 760px;
  }
  th,
  td {
    padding-left: 0.75rem;
    padding-right: 0.75rem;
  }
  th.sortable {
    cursor: pointer;
    user-select: none;
  }
  th.sortable:hover {
    color: ${({ theme }) => theme.colors.text};
  }
  th .arrow {
    display: inline-block;
    vertical-align: -2px;
    margin-left: 0.25rem;
  }
  td.narrow {
    width: 44px;
    padding-right: 0;
  }
  .title {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    min-width: 240px;
  }
  .title strong {
    font-weight: 700;
    word-break: break-word;
  }
  .title.done strong {
    color: ${({ theme }) => theme.colors.textMuted};
    text-decoration: line-through;
  }
  .sub {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.76rem;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-weight: 600;
  }
  .project {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    max-width: 180px;
    font-size: 0.85rem;
    font-weight: 600;
    white-space: nowrap;
  }
  .project span.name {
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .stage {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    padding: 0.15rem 0.6rem;
    border-radius: 999px;
    background: ${({ theme }) => theme.colors.surfaceHover};
    font-size: 0.78rem;
    font-weight: 700;
    white-space: nowrap;
  }
  .muted {
    color: ${({ theme }) => theme.colors.textMuted};
  }
`;

const Tick = styled.button<{ $on: boolean }>`
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
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

const Box = styled.input`
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 5px;
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  background: ${({ theme }) => theme.colors.background};
  display: grid;
  place-content: center;
  cursor: pointer;

  &:checked {
    background: ${({ theme }) => theme.colors.primary};
    border-color: ${({ theme }) => theme.colors.primary};
  }
  &:checked::after {
    content: '';
    width: 4px;
    height: 9px;
    border: solid ${({ theme }) => theme.colors.textDark};
    border-width: 0 2px 2px 0;
    transform: rotate(45deg) translate(-1px, -1px);
  }
`;

type SortKey = 'title' | 'project' | 'stage' | 'dueDate' | 'priority';

const priorityRank = (task: Task) => PRIORITIES.findIndex((p) => p.value === task.priority);

const compare: Record<SortKey, (a: Task, b: Task) => number> = {
  title: (a, b) => a.title.localeCompare(b.title, 'pt-BR'),
  project: (a, b) => a.project.name.localeCompare(b.project.name, 'pt-BR'),
  stage: (a, b) => a.stage.name.localeCompare(b.stage.name, 'pt-BR'),
  // Sem prazo vai para o fim, em qualquer sentido.
  dueDate: (a, b) => toDateInput(a.dueDate).localeCompare(toDateInput(b.dueDate)),
  priority: (a, b) => priorityRank(a) - priorityRank(b),
};

interface Props {
  tasks: Task[];
  selected: string[];
  actions: TaskActions;
  canEdit: boolean;
  canCreate: boolean;
  canDelete: boolean;
  onToggleSelect: (id: string) => void;
  onToggleAll: (ids: string[], on: boolean) => void;
  onOpen: (task: Task) => void;
  onDelete: (task: Task) => void;
  /** Mostra a coluna do projeto (some quando a lista já é de um projeto só). */
  showProject: boolean;
}

export function TaskList({ tasks, selected, actions, canEdit, canCreate, canDelete, onToggleSelect, onToggleAll, onOpen, onDelete, showProject }: Props) {
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'dueDate', dir: 'asc' });

  const rows = useMemo(() => {
    const sorted = [...tasks].sort((a, b) => {
      if (sort.key === 'dueDate') {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
      }
      const result = compare[sort.key](a, b);
      return sort.dir === 'asc' ? result : -result;
    });
    // Concluídas descem: o que ainda precisa de ação fica no topo.
    return [...sorted.filter((t) => !t.completedAt), ...sorted.filter((t) => t.completedAt)];
  }, [tasks, sort]);

  const selectable = canEdit || canDelete;
  const allSelected = rows.length > 0 && rows.every((task) => selected.includes(task.id));

  const header = (key: SortKey, label: string) => (
    <th
      className="sortable"
      aria-sort={sort.key === key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
      onClick={() => setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }))}
    >
      {label}
      {sort.key === key && (sort.dir === 'asc' ? <ArrowUp className="arrow" size={13} aria-hidden /> : <ArrowDown className="arrow" size={13} aria-hidden />)}
    </th>
  );

  return (
    <Wrap>
      <Table>
        <thead>
          <tr>
            {selectable && (
              <th className="narrow">
                <Box
                  type="checkbox"
                  aria-label="Selecionar todas"
                  checked={allSelected}
                  onChange={(event) => onToggleAll(rows.map((task) => task.id), event.target.checked)}
                />
              </th>
            )}
            <th className="narrow" aria-label="Concluída" />
            {header('title', 'Tarefa')}
            {showProject && header('project', 'Projeto')}
            {header('stage', 'Estágio')}
            <th>Pessoas</th>
            {header('dueDate', 'Prazo')}
            {header('priority', 'Prioridade')}
            <th className="right" aria-label="Ações" />
          </tr>
        </thead>
        <tbody>
          {rows.map((task) => {
            const progress = checklistProgress(task);
            const done = !!task.completedAt;
            return (
              <tr key={task.id} className="clickable" onClick={() => onOpen(task)}>
                {selectable && (
                  <td className="narrow" onClick={(event) => event.stopPropagation()}>
                    <Box
                      type="checkbox"
                      aria-label={`Selecionar ${task.title}`}
                      checked={selected.includes(task.id)}
                      onChange={() => onToggleSelect(task.id)}
                    />
                  </td>
                )}
                <td className="narrow" onClick={(event) => event.stopPropagation()}>
                  <Tick
                    type="button"
                    $on={done}
                    disabled={!canEdit}
                    aria-label={done ? 'Reabrir tarefa' : 'Concluir tarefa'}
                    onClick={() => void actions.toggleDone(task)}
                  >
                    {done && <Check size={13} strokeWidth={4} aria-hidden />}
                  </Tick>
                </td>
                <td>
                  <div className={`title${done ? ' done' : ''}`}>
                    <strong>{task.title}</strong>
                    {(task.tags.length > 0 || progress.total > 0) && (
                      <div className="sub">
                        {task.tags.map((tag) => (
                          <TagChip key={tag.id} $color={tag.color}>
                            {tag.name}
                          </TagChip>
                        ))}
                        {progress.total > 0 && (
                          <span>
                            ☑ {progress.done}/{progress.total}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </td>
                {showProject && (
                  <td>
                    <span className="project">
                      <ColorDot $color={task.project.color} />
                      <span className="name">{task.project.name}</span>
                    </span>
                  </td>
                )}
                <td>
                  <span className="stage">
                    <ColorDot $color={task.stage.color} $size={8} />
                    {task.stage.name}
                  </span>
                </td>
                <td>
                  <AvatarStack people={taskPeople(task)} size={26} />
                </td>
                <td>{task.dueDate ? <DueLabel task={task} /> : <span className="muted">—</span>}</td>
                <td>
                  <PriorityBadge priority={task.priority} />
                </td>
                <td className="right" onClick={(event) => event.stopPropagation()}>
                  <ActionMenu
                    label={`Ações da tarefa ${task.title}`}
                    items={[
                      { label: 'Abrir', icon: <ExternalLink size={15} />, onSelect: () => onOpen(task) },
                      ...(canCreate ? [{ label: 'Duplicar', icon: <Copy size={15} />, onSelect: () => void actions.duplicate(task) }] : []),
                      ...(canDelete
                        ? [{ label: 'Mover para a lixeira', icon: <Trash2 size={15} />, danger: true, divider: true, onSelect: () => onDelete(task) }]
                        : []),
                    ]}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </Table>
    </Wrap>
  );
}
