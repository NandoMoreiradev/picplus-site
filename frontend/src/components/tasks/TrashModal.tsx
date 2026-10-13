import { useState } from 'react';
import styled from 'styled-components';
import { RotateCcw, Trash2 } from 'lucide-react';
import { useFetch } from '../../hooks/useFetch';
import { api } from '../../lib/api';
import { formatDateTime } from '../../lib/format';
import type { TrashedProject, TrashedTask } from '../../lib/tasks';
import { errorMessage } from '../../lib/validation';
import { IconButton, Tabs } from '../admin/AdminUI';
import { EmptyState, ErrorState, Skeleton } from '../ui/Feedback';
import { ConfirmDialog, Modal } from '../ui/Modal';
import { useToast } from '../ui/Toast';
import { ColorDot } from './TaskUI';

const List = styled.ul`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 1.25rem;
`;

const Item = styled.li`
  display: flex;
  align-items: center;
  gap: 0.8rem;
  padding: 0.75rem 0.9rem;
  background: ${({ theme }) => theme.colors.background};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};

  .info {
    flex: 1;
    min-width: 0;
  }
  strong {
    display: block;
    font-weight: 700;
    word-break: break-word;
  }
  small {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.4rem;
    color: ${({ theme }) => theme.colors.textMuted};
    font-size: 0.8rem;
  }
`;

type Target = { kind: 'task'; item: TrashedTask } | { kind: 'project'; item: TrashedProject };

/** Lixeira: tarefas e projetos excluídos. Restaurar devolve o item (e, no projeto, as tarefas que caíram com ele). */
export function TrashModal({
  canManageProjects,
  onClose,
  onChanged,
}: {
  canManageProjects: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  const toast = useToast();
  const [tab, setTab] = useState<'tasks' | 'projects'>('tasks');
  const tasks = useFetch<TrashedTask[]>('/admin/tasks/trash');
  const projects = useFetch<TrashedProject[]>(canManageProjects ? '/admin/tasks/projects/trash' : null);
  const [confirming, setConfirming] = useState<Target | null>(null);
  const [busy, setBusy] = useState(false);

  const base = (target: Target) => (target.kind === 'task' ? `/admin/tasks/${target.item.id}` : `/admin/tasks/projects/${target.item.id}`);

  const act = async (target: Target, kind: 'restore' | 'delete') => {
    setBusy(true);
    try {
      if (kind === 'restore') await api.post(`${base(target)}/restore`);
      else await api.delete(`${base(target)}/hard-delete`);
      toast.success(kind === 'restore' ? 'Restaurado.' : 'Excluído definitivamente.');
      tasks.reload();
      projects.reload();
      onChanged();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
      setConfirming(null);
    }
  };

  const taskList = tasks.data ?? [];
  const projectList = projects.data ?? [];

  return (
    <Modal open onClose={onClose} title="Lixeira" description="Itens excluídos ficam aqui até serem apagados de vez." width="680px">
      {canManageProjects ? (
        <Tabs
          tabs={[
            { key: 'tasks', label: 'Tarefas', count: taskList.length },
            { key: 'projects', label: 'Projetos', count: projectList.length },
          ]}
          value={tab}
          onChange={setTab}
        />
      ) : null}

      {tab === 'tasks' ? (
        tasks.error ? (
          <ErrorState message={tasks.error.message} onRetry={tasks.reload} />
        ) : tasks.loading && !tasks.data ? (
          <Skeleton $h="140px" style={{ marginTop: '1.25rem' }} />
        ) : taskList.length === 0 ? (
          <EmptyState title="Lixeira vazia" description="Nenhuma tarefa excluída." />
        ) : (
          <List>
            {taskList.map((task) => (
              <Item key={task.id}>
                <div className="info">
                  <strong>{task.title}</strong>
                  <small>
                    <ColorDot $color={task.project.color} $size={8} /> {task.project.name}
                    {task.parentTask && <> · item de “{task.parentTask.title}”</>} · excluída em {formatDateTime(task.deletedAt)}
                    {task.createdBy && <> · por {task.createdBy.name}</>}
                  </small>
                </div>
                <IconButton label={`Restaurar ${task.title}`} disabled={busy} onClick={() => void act({ kind: 'task', item: task }, 'restore')}>
                  <RotateCcw size={17} />
                </IconButton>
                <IconButton label={`Excluir ${task.title} definitivamente`} danger disabled={busy} onClick={() => setConfirming({ kind: 'task', item: task })}>
                  <Trash2 size={17} />
                </IconButton>
              </Item>
            ))}
          </List>
        )
      ) : projects.error ? (
        <ErrorState message={projects.error.message} onRetry={projects.reload} />
      ) : projects.loading && !projects.data ? (
        <Skeleton $h="140px" style={{ marginTop: '1.25rem' }} />
      ) : projectList.length === 0 ? (
        <EmptyState title="Lixeira vazia" description="Nenhum projeto excluído." />
      ) : (
        <List>
          {projectList.map((project) => (
            <Item key={project.id}>
              <ColorDot $color={project.color} $size={12} />
              <div className="info">
                <strong>{project.name}</strong>
                <small>
                  {project._count.tasks} {project._count.tasks === 1 ? 'tarefa' : 'tarefas'} · excluído em {formatDateTime(project.deletedAt)}
                  {project.owner && <> · de {project.owner.name}</>}
                </small>
              </div>
              <IconButton label={`Restaurar ${project.name}`} disabled={busy} onClick={() => void act({ kind: 'project', item: project }, 'restore')}>
                <RotateCcw size={17} />
              </IconButton>
              <IconButton label={`Excluir ${project.name} definitivamente`} danger disabled={busy} onClick={() => setConfirming({ kind: 'project', item: project })}>
                <Trash2 size={17} />
              </IconButton>
            </Item>
          ))}
        </List>
      )}

      <ConfirmDialog
        open={!!confirming}
        title="Excluir definitivamente"
        confirmLabel="Excluir para sempre"
        loading={busy}
        onCancel={() => setConfirming(null)}
        onConfirm={() => confirming && void act(confirming, 'delete')}
        message={
          confirming?.kind === 'project' ? (
            <>
              Apagar o projeto <strong>{confirming.item.name}</strong> de vez, com todas as tarefas, comentários e anexos? Isso não pode ser desfeito.
            </>
          ) : (
            <>
              Apagar <strong>{confirming?.item.title}</strong> de vez, com comentários e anexos? Isso não pode ser desfeito.
            </>
          )
        }
      />
    </Modal>
  );
}
