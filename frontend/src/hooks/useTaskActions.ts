import { useMemo } from 'react';
import { useToast } from '../components/ui/Toast';
import { api } from '../lib/api';
import type { StageLite, Task, TaskPriority } from '../lib/tasks';
import { errorMessage } from '../lib/validation';

export interface BulkPatch {
  stageId?: string;
  priority?: TaskPriority;
  assignedToId?: string | null;
  dueDate?: string | null;
}

interface Deps {
  setTasks: (update: Task[] | ((previous: Task[]) => Task[])) => void;
  upsertTask: (task: Task) => void;
  removeTasks: (ids: string[]) => void;
  reload: () => void;
}

/**
 * Ações sobre tarefas compartilhadas por Kanban, lista, calendário e detalhe. Cada uma
 * atualiza a tela e avisa (toast) quando falha; as que mexem em muitas tarefas recarregam
 * o quadro no fim para refletir exatamente o que o servidor decidiu.
 */
export function useTaskActions({ setTasks, upsertTask, removeTasks, reload }: Deps) {
  const toast = useToast();

  return useMemo(() => {
    /** Edita campos de uma tarefa. Devolve a tarefa atualizada, ou null se falhar. */
    const update = async (id: string, patch: Record<string, unknown>) => {
      try {
        const task = await api.patch<Task>(`/admin/tasks/${id}`, patch);
        upsertTask(task);
        return task;
      } catch (error) {
        toast.error(errorMessage(error));
        return null;
      }
    };

    const toggleDone = (task: Pick<Task, 'id' | 'completedAt'>) => update(task.id, { completed: !task.completedAt });

    /**
     * Move uma tarefa de coluna e/ou posição. A tela muda na hora; se o servidor recusar,
     * recarrega para voltar ao que está salvo.
     */
    const move = async (
      task: Task,
      stage: StageLite,
      /** Ids da coluna de destino, já na nova ordem (inclui a tarefa movida). */
      orderedIds: string[],
    ) => {
      const position = new Map(orderedIds.map((id, index) => [id, index]));
      const changedStage = task.stageId !== stage.id;
      setTasks((previous) =>
        previous.map((item) => {
          if (!position.has(item.id)) return item;
          if (item.id === task.id && changedStage) {
            return {
              ...item,
              stageId: stage.id,
              stage,
              completedAt: stage.isCompleted ? (item.completedAt ?? new Date().toISOString()) : null,
              order: position.get(item.id) ?? item.order,
            };
          }
          return { ...item, order: position.get(item.id) ?? item.order };
        }),
      );
      try {
        if (changedStage) await api.patch(`/admin/tasks/${task.id}`, { stageId: stage.id });
        await api.patch('/admin/tasks/reorder', {
          stageId: stage.id,
          items: orderedIds.map((id, order) => ({ id, order })),
        });
      } catch (error) {
        toast.error(errorMessage(error, 'Não foi possível mover a tarefa.'));
        reload();
      }
    };

    const remove = async (ids: string[]) => {
      try {
        if (ids.length === 1) await api.delete(`/admin/tasks/${ids[0]}`);
        else await api.post('/admin/tasks/bulk-delete', { ids });
        removeTasks(ids);
        toast.success(ids.length === 1 ? 'Tarefa movida para a lixeira.' : `${ids.length} tarefas movidas para a lixeira.`);
        return true;
      } catch (error) {
        toast.error(errorMessage(error));
        return false;
      }
    };

    const duplicate = async (task: Pick<Task, 'id'>) => {
      try {
        const copy = await api.post<Task>(`/admin/tasks/${task.id}/duplicate`);
        upsertTask(copy);
        toast.success('Tarefa duplicada.');
        return copy;
      } catch (error) {
        toast.error(errorMessage(error));
        return null;
      }
    };

    const bulkUpdate = async (ids: string[], patch: BulkPatch) => {
      try {
        const result = await api.patch<{ count: number; errors: { id: string; message: string }[] }>(
          '/admin/tasks/bulk-update',
          { ids, ...patch },
        );
        if (result.errors.length) {
          toast.error(`${result.count} atualizada(s); ${result.errors.length} não puderam ser alteradas: ${result.errors[0].message}`);
        } else {
          toast.success(`${result.count} ${result.count === 1 ? 'tarefa atualizada' : 'tarefas atualizadas'}.`);
        }
        reload();
        return true;
      } catch (error) {
        toast.error(errorMessage(error));
        return false;
      }
    };

    return { update, toggleDone, move, remove, duplicate, bulkUpdate };
  }, [setTasks, upsertTask, removeTasks, reload, toast]);
}

export type TaskActions = ReturnType<typeof useTaskActions>;
