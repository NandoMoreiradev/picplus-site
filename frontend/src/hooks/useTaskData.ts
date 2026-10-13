import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '../lib/api';
import type { Task, TaskProject, TaskTag, TaskUser } from '../lib/tasks';

interface TaskData {
  tasks: Task[];
  projects: TaskProject[];
  tags: TaskTag[];
  users: TaskUser[];
}

const EMPTY: TaskData = { tasks: [], projects: [], tags: [], users: [] };

/**
 * Tudo que a tela de tarefas precisa, carregado de uma vez. A filtragem e a busca são feitas
 * no navegador (a lista inteira já está aqui), então trocar de projeto ou filtrar é instantâneo.
 *
 * `setTasks` permite atualização otimista (arrastar um cartão, marcar como concluída) sem
 * recarregar tudo; `reload` busca de novo em segundo plano, sem esvaziar a tela.
 */
export function useTaskData() {
  const [data, setData] = useState<TaskData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      api.get<Task[]>('/admin/tasks', undefined, controller.signal),
      api.get<TaskProject[]>('/admin/tasks/projects', undefined, controller.signal),
      api.get<TaskTag[]>('/admin/tasks/tags', undefined, controller.signal),
      api.get<TaskUser[]>('/admin/tasks/users', undefined, controller.signal),
    ])
      .then(([tasks, projects, tags, users]) => {
        setData({ tasks, projects, tags, users });
        setError(null);
      })
      .catch((cause: unknown) => {
        if ((cause as Error).name === 'AbortError') return;
        setError(cause instanceof ApiError ? cause : new ApiError('Erro inesperado.', 0));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [version]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);

  const setTasks = useCallback(
    (update: Task[] | ((previous: Task[]) => Task[])) =>
      setData((previous) => ({
        ...previous,
        tasks: typeof update === 'function' ? update(previous.tasks) : update,
      })),
    [],
  );

  /** Troca (ou inclui) uma tarefa vinda da API, mantendo a posição na lista. */
  const upsertTask = useCallback(
    (task: Task) =>
      setTasks((previous) =>
        previous.some((t) => t.id === task.id)
          ? previous.map((t) => (t.id === task.id ? task : t))
          : [...previous, task],
      ),
    [setTasks],
  );

  const removeTasks = useCallback(
    (ids: string[]) => setTasks((previous) => previous.filter((t) => !ids.includes(t.id))),
    [setTasks],
  );

  /** Inclui uma tag recém-criada sem recarregar tudo. */
  const addTag = useCallback(
    (tag: TaskTag) =>
      setData((previous) => ({
        ...previous,
        tags: [...previous.tags, tag].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
      })),
    [],
  );

  return { ...data, loading, error, reload, setTasks, upsertTask, removeTasks, addTag };
}
