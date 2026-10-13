import styled from 'styled-components';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Check, Copy, ExternalLink, MessageSquare, Paperclip, Trash2 } from 'lucide-react';
import { checklistProgress, priorityMeta, taskPeople } from '../../lib/tasks';
import type { CardOptions, Task } from '../../lib/tasks';
import { ActionMenu } from './Popover';
import { AvatarStack, DueLabel, TagChip } from './TaskUI';

const Card = styled.article<{ $priority: string; $showPriority: boolean; $selected: boolean; $dragging: boolean; $done: boolean; $grab: boolean }>`
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  padding: 0.8rem 0.85rem 0.75rem 1rem;
  background: ${({ theme }) => theme.colors.surfaceElevated};
  border: 1px solid ${({ $selected, theme }) => ($selected ? theme.colors.primary : theme.colors.border)};
  border-radius: ${({ theme }) => theme.radii.md};
  box-shadow: ${({ $dragging, theme }) => ($dragging ? theme.shadows.cardHover : 'none')};
  opacity: ${({ $dragging }) => ($dragging ? 0.55 : 1)};
  cursor: ${({ $grab }) => ($grab ? 'grab' : 'pointer')};
  transition:
    border-color ${({ theme }) => theme.transitions.fast},
    background ${({ theme }) => theme.transitions.fast};

  /* faixa de prioridade na lateral */
  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 10px;
    bottom: 10px;
    width: 3px;
    border-radius: 0 3px 3px 0;
    background: ${({ $priority, $showPriority }) => ($showPriority ? $priority : 'transparent')};
  }

  &:hover {
    border-color: ${({ $selected, theme }) => ($selected ? theme.colors.primary : theme.colors.borderStrong)};
    background: ${({ theme }) => theme.colors.surfaceHover};
  }
  &:hover .tools,
  &:focus-within .tools,
  &[data-selected='true'] .tools {
    opacity: 1;
  }
  &:active {
    cursor: ${({ $grab }) => ($grab ? 'grabbing' : 'pointer')};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }

  .tools {
    position: absolute;
    top: 6px;
    right: 6px;
    display: flex;
    align-items: center;
    gap: 0.1rem;
    padding: 0.1rem;
    border-radius: ${({ theme }) => theme.radii.sm};
    background: ${({ theme }) => theme.colors.surfaceElevated};
    opacity: 0;
    transition: opacity ${({ theme }) => theme.transitions.fast};

    /* Sem mouse não há "passar por cima": no toque os controles ficam sempre à vista. */
    @media (hover: none) {
      opacity: 1;
    }
  }

  .title-row {
    display: flex;
    align-items: flex-start;
    gap: 0.55rem;
    padding-right: 0.2rem;

    /* no toque os controles ficam sempre à vista: abre espaço para não cobrir o título */
    @media (hover: none) {
      padding-right: 3.6rem;
    }
  }
  .title {
    flex: 1;
    min-width: 0;
    font-size: 0.92rem;
    font-weight: 700;
    line-height: 1.4;
    word-break: break-word;
    color: ${({ $done, theme }) => ($done ? theme.colors.textMuted : theme.colors.text)};
    text-decoration: ${({ $done }) => ($done ? 'line-through' : 'none')};
  }
  .tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
  }
  .meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }
  .indicators {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.65rem;
    min-width: 0;
  }
  .count {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.76rem;
    font-weight: 700;
    color: ${({ theme }) => theme.colors.textSecondary};
  }
  .progress {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.72rem;
    font-weight: 700;
    color: ${({ theme }) => theme.colors.textSecondary};
  }
  .progress .track {
    flex: 1;
    height: 4px;
    border-radius: 4px;
    background: ${({ theme }) => theme.colors.border};
    overflow: hidden;
  }
  .progress .fill {
    height: 100%;
    border-radius: 4px;
    background: ${({ theme }) => theme.colors.primary};
  }
`;

const DoneToggle = styled.button<{ $on: boolean }>`
  flex-shrink: 0;
  display: grid;
  place-items: center;
  width: 20px;
  height: 20px;
  margin-top: 1px;
  border-radius: 50%;
  border: 2px solid ${({ $on, theme }) => ($on ? theme.colors.primary : theme.colors.borderStrong)};
  background: ${({ $on, theme }) => ($on ? theme.colors.primary : 'transparent')};
  color: ${({ theme }) => theme.colors.textDark};
  transition: all ${({ theme }) => theme.transitions.fast};

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

const Select = styled.label<{ $on: boolean }>`
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  cursor: pointer;

  input {
    appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 4px;
    border: 1px solid ${({ $on, theme }) => ($on ? theme.colors.primary : theme.colors.borderStrong)};
    background: ${({ $on, theme }) => ($on ? theme.colors.primary : theme.colors.background)};
    display: grid;
    place-content: center;
    cursor: pointer;
  }
  input:checked::after {
    content: '';
    width: 4px;
    height: 8px;
    border: solid ${({ theme }) => theme.colors.textDark};
    border-width: 0 2px 2px 0;
    transform: rotate(45deg) translate(-1px, -1px);
  }
`;

interface Props {
  task: Task;
  options: CardOptions;
  selected?: boolean;
  /** Cartão fantasma que acompanha o ponteiro durante o arraste. */
  overlay?: boolean;
  /** Pode ser arrastado (precisa de permissão para editar). */
  draggable?: boolean;
  onOpen: (task: Task) => void;
  onToggleSelect?: (id: string) => void;
  onToggleDone?: (task: Task) => void;
  onDuplicate?: (task: Task) => void;
  onDelete?: (task: Task) => void;
}

export function KanbanCard({ task, options, selected, overlay, draggable = true, onOpen, onToggleSelect, onToggleDone, onDuplicate, onDelete }: Props) {
  const sortable = useSortable({ id: task.id, data: { task }, disabled: overlay || !draggable });
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = sortable;
  const progress = checklistProgress(task);
  const people = taskPeople(task);
  const done = !!task.completedAt;

  return (
    <Card
      ref={overlay ? undefined : setNodeRef}
      style={overlay ? undefined : { transform: CSS.Translate.toString(transform), transition }}
      $priority={priorityMeta(task.priority).color}
      $showPriority={options.priority}
      $selected={!!selected}
      $dragging={isDragging || !!overlay}
      $done={done}
      $grab={draggable}
      data-selected={selected || undefined}
      {...(draggable && !overlay ? { ...attributes, ...listeners } : {})}
      // dnd-kit marca o elemento como "button"; como há botões dentro do cartão, vira um grupo.
      role="group"
      tabIndex={0}
      aria-label={`Tarefa: ${task.title}`}
      onClick={() => onOpen(task)}
      onKeyDown={(event) => {
        // Enter abre; o teclado do dnd-kit usa Espaço, então não conflita.
        if (event.key === 'Enter' && event.target === event.currentTarget) onOpen(task);
      }}
    >
      {!overlay && (
        <div className="tools" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => event.stopPropagation()}>
          {onToggleSelect && (
            <Select $on={!!selected} title="Selecionar">
              <input type="checkbox" checked={!!selected} onChange={() => onToggleSelect(task.id)} aria-label={`Selecionar ${task.title}`} />
            </Select>
          )}
          <ActionMenu
            label={`Ações da tarefa ${task.title}`}
            items={[
              { label: 'Abrir', icon: <ExternalLink size={15} />, onSelect: () => onOpen(task) },
              ...(onDuplicate ? [{ label: 'Duplicar', icon: <Copy size={15} />, onSelect: () => onDuplicate(task) }] : []),
              ...(onDelete
                ? [{ label: 'Mover para a lixeira', icon: <Trash2 size={15} />, danger: true, divider: true, onSelect: () => onDelete(task) }]
                : []),
            ]}
          />
        </div>
      )}

      <div className="title-row">
        {onToggleDone && (
          <DoneToggle
            type="button"
            $on={done}
            aria-label={done ? 'Reabrir tarefa' : 'Concluir tarefa'}
            title={done ? 'Reabrir' : 'Concluir'}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onToggleDone(task);
            }}
          >
            {done && <Check size={12} strokeWidth={4} aria-hidden />}
          </DoneToggle>
        )}
        <h4 className="title">{task.title}</h4>
      </div>

      {options.tags && task.tags.length > 0 && (
        <div className="tags">
          {task.tags.map((tag) => (
            <TagChip key={tag.id} $color={tag.color}>
              {tag.name}
            </TagChip>
          ))}
        </div>
      )}

      {progress.total > 0 && (
        <div className="progress" title={`${progress.done} de ${progress.total} itens concluídos`}>
          <div className="track">
            <div className="fill" style={{ width: `${progress.percent}%` }} />
          </div>
          {progress.done}/{progress.total}
        </div>
      )}

      <div className="meta">
        <div className="indicators">
          {options.date && <DueLabel task={task} />}
          {task._count.comments > 0 && (
            <span className="count" title={`${task._count.comments} comentário(s)`}>
              <MessageSquare size={13} aria-hidden /> {task._count.comments}
            </span>
          )}
          {task._count.attachments > 0 && (
            <span className="count" title={`${task._count.attachments} anexo(s)`}>
              <Paperclip size={13} aria-hidden /> {task._count.attachments}
            </span>
          )}
        </div>
        {options.assignee && <AvatarStack people={people} size={24} />}
      </div>
    </Card>
  );
}
