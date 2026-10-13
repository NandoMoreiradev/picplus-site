import { useMemo, useState } from 'react';
import styled from 'styled-components';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { Announcements, DragEndEvent, DragOverEvent, DragStartEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CheckCircle2, ChevronsLeft, Circle, Plus } from 'lucide-react';
import type { TaskActions } from '../../hooks/useTaskActions';
import type { CardOptions, Task, TaskProject } from '../../lib/tasks';
import { KanbanCard } from './KanbanCard';

const Board = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 0.9rem;
  height: 100%;
  padding: 1.25rem 1.5rem 0.5rem;
  overflow-x: auto;

  &::-webkit-scrollbar {
    height: 8px;
  }
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.colors.borderStrong};
    border-radius: 4px;
  }
`;

const Column = styled.section<{ $collapsed: boolean; $over: boolean }>`
  flex: 0 0 ${({ $collapsed }) => ($collapsed ? '56px' : '304px')};
  display: flex;
  flex-direction: column;
  max-height: 100%;
  min-height: 0;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ $over, theme }) => ($over ? theme.colors.primaryBorder : theme.colors.border)};
  border-radius: ${({ theme }) => theme.radii.lg};
  transition:
    flex-basis ${({ theme }) => theme.transitions.default},
    border-color ${({ theme }) => theme.transitions.fast};
  ${({ $collapsed }) => $collapsed && 'cursor: pointer;'}
`;

const Head = styled.header<{ $color: string; $collapsed: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: ${({ $collapsed }) => ($collapsed ? '0.9rem 0' : '0.8rem 0.9rem')};
  border-top: 3px solid ${({ $color }) => $color};
  border-radius: ${({ theme }) => `${theme.radii.lg} ${theme.radii.lg} 0 0`};
  flex-shrink: 0;
  ${({ $collapsed }) =>
    $collapsed &&
    `
    flex-direction: column;
    flex: 1;
    justify-content: flex-start;
    gap: 0.9rem;
  `}

  h3 {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-width: 0;
    font-size: 0.9rem;
    font-weight: 800;
  }
  h3 span.name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .vertical {
    writing-mode: vertical-rl;
    transform: rotate(180deg);
    font-size: 0.85rem;
    font-weight: 800;
    white-space: nowrap;
  }
  .side {
    display: flex;
    align-items: center;
    gap: 0.15rem;
    flex-shrink: 0;
  }
`;

const Count = styled.span`
  min-width: 24px;
  padding: 0 0.45rem;
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.surfaceHover};
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 0.74rem;
  font-weight: 800;
  line-height: 22px;
  text-align: center;
`;

const HeadButton = styled.button`
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: ${({ theme }) => theme.radii.sm};
  color: ${({ theme }) => theme.colors.textSecondary};

  &:hover {
    background: ${({ theme }) => theme.colors.surfaceHover};
    color: ${({ theme }) => theme.colors.primary};
  }
`;

const Drop = styled.div`
  flex: 1;
  min-height: 90px;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  padding: 0.25rem 0.65rem 0.75rem;
  overflow-y: auto;

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.colors.borderStrong};
    border-radius: 3px;
  }
`;

const EmptyDrop = styled.button`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  padding: 1.5rem 1rem;
  border: 2px dashed ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 0.82rem;
  font-weight: 600;

  &:hover:not(:disabled) {
    border-color: ${({ theme }) => theme.colors.primaryBorder};
    color: ${({ theme }) => theme.colors.primary};
    background: ${({ theme }) => theme.colors.primarySoft};
  }
  &:disabled {
    cursor: default;
  }
`;

/** Textos lidos por leitores de tela durante o arraste (o padrão do dnd-kit é em inglês). */
const SCREEN_READER = {
  instructions: {
    draggable:
      'Para pegar um cartão, aperte Espaço. Use as setas para mover entre colunas e posições, Espaço para soltar e Esc para cancelar.',
  },
};

const byPosition = (a: Task, b: Task) => a.order - b.order || a.createdAt.localeCompare(b.createdAt);

function DropZone({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef } = useDroppable({ id: `column-${id}` });
  return <Drop ref={setNodeRef}>{children}</Drop>;
}

interface Props {
  project: TaskProject;
  /** Tarefas do projeto (já filtradas). */
  tasks: Task[];
  options: CardOptions;
  collapsed: string[];
  selected: string[];
  actions: TaskActions;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  onToggleCollapse: (stageId: string) => void;
  onToggleSelect: (id: string) => void;
  onOpen: (task: Task) => void;
  onAdd: (stageId: string) => void;
  onDelete: (task: Task) => void;
}

export function KanbanBoard({
  project,
  tasks,
  options,
  collapsed,
  selected,
  actions,
  canCreate,
  canEdit,
  canDelete,
  onToggleCollapse,
  onToggleSelect,
  onOpen,
  onAdd,
  onDelete,
}: Props) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    // No toque, segurar um instante inicia o arraste; arrastar de imediato rola a página.
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const stages = useMemo(() => [...project.stages].sort((a, b) => a.order - b.order), [project.stages]);

  const columns = useMemo(() => {
    const map = new Map<string, Task[]>(stages.map((stage) => [stage.id, []]));
    for (const task of [...tasks].sort(byPosition)) map.get(task.stageId)?.push(task);
    return map;
  }, [tasks, stages]);

  const stageOf = (overId: string): string | undefined => {
    if (overId.startsWith('column-')) return overId.slice('column-'.length);
    for (const [stageId, list] of columns) if (list.some((task) => task.id === overId)) return stageId;
    return undefined;
  };

  const activeTask = activeId ? tasks.find((task) => task.id === activeId) : undefined;

  const announcements: Announcements = {
    onDragStart: ({ active }) => `Cartão ${tasks.find((t) => t.id === active.id)?.title ?? ''} pego.`,
    onDragOver: ({ over }) => {
      const stage = over ? stages.find((s) => s.id === stageOf(String(over.id))) : undefined;
      return stage ? `Sobre a coluna ${stage.name}.` : undefined;
    },
    onDragEnd: ({ over }) => {
      const stage = over ? stages.find((s) => s.id === stageOf(String(over.id))) : undefined;
      return stage ? `Cartão solto na coluna ${stage.name}.` : 'Cartão solto fora de uma coluna.';
    },
    onDragCancel: () => 'Movimento cancelado.',
  };

  const handleDragStart = (event: DragStartEvent) => setActiveId(String(event.active.id));

  const handleDragOver = (event: DragOverEvent) =>
    setOverStage(event.over ? (stageOf(String(event.over.id)) ?? null) : null);

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    setOverStage(null);
    const { active, over } = event;
    if (!over) return;

    const task = tasks.find((item) => item.id === active.id);
    const targetStageId = stageOf(String(over.id));
    const targetStage = stages.find((stage) => stage.id === targetStageId);
    if (!task || !targetStage) return;

    const targetList = columns.get(targetStage.id) ?? [];
    const overIndex = targetList.findIndex((item) => item.id === over.id);

    let ordered: Task[];
    if (task.stageId === targetStage.id) {
      const from = targetList.findIndex((item) => item.id === task.id);
      const to = overIndex === -1 ? targetList.length - 1 : overIndex;
      if (from === to) return;
      ordered = arrayMove(targetList, from, to);
    } else {
      ordered = [...targetList];
      ordered.splice(overIndex === -1 ? ordered.length : overIndex, 0, task);
    }
    void actions.move(task, targetStage, ordered.map((item) => item.id));
  };

  if (stages.length === 0) {
    return (
      <Board>
        <p style={{ margin: 'auto', color: '#a3a3a3' }}>Este projeto não tem estágios. Crie ao menos um nas configurações.</p>
      </Board>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      accessibility={{ announcements, screenReaderInstructions: SCREEN_READER.instructions }}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={() => {
        setActiveId(null);
        setOverStage(null);
      }}
    >
      <Board>
        {stages.map((stage) => {
          const list = columns.get(stage.id) ?? [];
          const isCollapsed = collapsed.includes(stage.id);
          return (
            <Column
              key={stage.id}
              aria-label={`Estágio ${stage.name}`}
              $collapsed={isCollapsed}
              $over={overStage === stage.id && !!activeId}
              onClick={() => isCollapsed && onToggleCollapse(stage.id)}
            >
              <Head $color={stage.color} $collapsed={isCollapsed}>
                {isCollapsed ? (
                  <>
                    <Count>{list.length}</Count>
                    <span className="vertical">{stage.name}</span>
                  </>
                ) : (
                  <>
                    <h3>
                      {stage.isCompleted ? (
                        <CheckCircle2 size={17} color={stage.color} aria-hidden />
                      ) : (
                        <Circle size={17} color={stage.color} aria-hidden />
                      )}
                      <span className="name">{stage.name}</span>
                      <Count>{list.length}</Count>
                    </h3>
                    <div className="side">
                      {canCreate && (
                        <HeadButton type="button" title="Adicionar tarefa" aria-label={`Adicionar tarefa em ${stage.name}`} onClick={() => onAdd(stage.id)}>
                          <Plus size={17} aria-hidden />
                        </HeadButton>
                      )}
                      <HeadButton type="button" title="Recolher coluna" aria-label={`Recolher ${stage.name}`} onClick={() => onToggleCollapse(stage.id)}>
                        <ChevronsLeft size={17} aria-hidden />
                      </HeadButton>
                    </div>
                  </>
                )}
              </Head>

              {!isCollapsed && (
                <DropZone id={stage.id}>
                  <SortableContext items={list.map((task) => task.id)} strategy={verticalListSortingStrategy}>
                    {list.map((task) => (
                      <KanbanCard
                        key={task.id}
                        task={task}
                        options={options}
                        draggable={canEdit}
                        selected={selected.includes(task.id)}
                        onOpen={onOpen}
                        onToggleSelect={canEdit || canDelete ? onToggleSelect : undefined}
                        onToggleDone={canEdit ? (item) => void actions.toggleDone(item) : undefined}
                        onDuplicate={canCreate ? (item) => void actions.duplicate(item) : undefined}
                        onDelete={canDelete ? onDelete : undefined}
                      />
                    ))}
                  </SortableContext>
                  {list.length === 0 && (
                    <EmptyDrop type="button" disabled={!canCreate} onClick={() => onAdd(stage.id)}>
                      {canCreate && <Plus size={20} aria-hidden />}
                      {canCreate ? 'Adicionar tarefa' : 'Nenhuma tarefa'}
                    </EmptyDrop>
                  )}
                </DropZone>
              )}
            </Column>
          );
        })}
      </Board>

      <DragOverlay dropAnimation={null}>
        {activeTask ? <KanbanCard task={activeTask} options={options} overlay onOpen={onOpen} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
