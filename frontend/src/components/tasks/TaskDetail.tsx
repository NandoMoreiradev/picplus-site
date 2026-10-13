import { useCallback, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { Check, Copy, Pencil, Trash2 } from 'lucide-react';
import type { TaskActions } from '../../hooks/useTaskActions';
import { formatDateTime } from '../../lib/format';
import { PRIORITIES, checklistProgress, fromDateInput, toDateInput } from '../../lib/tasks';
import type { Task, TaskPriority, TaskProject, TaskTag, TaskUser } from '../../lib/tasks';
import { Tabs } from '../admin/AdminUI';
import { Button } from '../ui/Button';
import { ConfirmDialog, Modal } from '../ui/Modal';
import { ActionMenu } from './Popover';
import { RichTextEditor, RichTextView, isEmptyHtml } from './RichText';
import { TagSelect } from './TagSelect';
import { TaskActivity } from './TaskActivity';
import { TaskAttachments } from './TaskAttachments';
import { TaskChecklist } from './TaskChecklist';
import { TaskComments } from './TaskComments';
import { MultiSelect } from './TaskUI';

const Layout = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 280px;
  gap: 1.75rem;

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    grid-template-columns: 1fr;
  }
`;

const Main = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  min-width: 0;
`;

const Top = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;

  .title {
    flex: 1;
    min-width: 0;
    padding: 0.35rem 0.5rem;
    margin: -0.35rem -0.5rem;
    font-family: ${({ theme }) => theme.fonts.heading};
    font-size: 1.45rem;
    font-weight: 800;
    line-height: 1.3;
    color: ${({ theme }) => theme.colors.text};
    background: transparent;
    border: 1px solid transparent;
    border-radius: ${({ theme }) => theme.radii.sm};
    resize: none;
  }
  textarea.title:hover:not(:disabled) {
    border-color: ${({ theme }) => theme.colors.border};
  }
  textarea.title:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
    background: ${({ theme }) => theme.colors.background};
  }
`;

const DoneButton = styled.button<{ $on: boolean }>`
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.45rem 0.8rem;
  border-radius: ${({ theme }) => theme.radii.pill};
  font-size: 0.8rem;
  font-weight: 800;
  border: 1px solid ${({ $on, theme }) => ($on ? theme.colors.success : theme.colors.borderStrong)};
  color: ${({ $on, theme }) => ($on ? theme.colors.success : theme.colors.textSecondary)};
  background: ${({ $on, theme }) => ($on ? theme.colors.successSoft : 'transparent')};
  white-space: nowrap;

  &:hover:not(:disabled) {
    border-color: ${({ theme }) => theme.colors.success};
    color: ${({ theme }) => theme.colors.success};
  }
  &:disabled {
    cursor: default;
  }
`;

const Section = styled.section`
  h3 {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.6rem;
    font-size: 0.78rem;
    font-weight: 800;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    color: ${({ theme }) => theme.colors.textMuted};
  }
  .edit {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    font-size: 0.78rem;
    font-weight: 700;
    letter-spacing: 0;
    text-transform: none;
    color: ${({ theme }) => theme.colors.textSecondary};
  }
  .edit:hover {
    color: ${({ theme }) => theme.colors.primary};
  }
  .empty {
    color: ${({ theme }) => theme.colors.textMuted};
    font-size: 0.92rem;
  }
  .row {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
    margin-top: 0.6rem;
  }
`;

const Side = styled.aside`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.1rem;
  height: fit-content;
  background: ${({ theme }) => theme.colors.background};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};

  .field {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }
  .field > label,
  .field > .label {
    font-size: 0.74rem;
    font-weight: 800;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: ${({ theme }) => theme.colors.textMuted};
  }
  select,
  input[type='date'] {
    width: 100%;
    height: 42px;
    padding: 0 0.8rem;
    background: ${({ theme }) => theme.colors.surface};
    color: ${({ theme }) => theme.colors.text};
    border: 1px solid ${({ theme }) => theme.colors.borderStrong};
    border-radius: ${({ theme }) => theme.radii.md};
    font-size: 0.92rem;
  }
  select:focus,
  input:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
  }
  select:disabled,
  input:disabled {
    opacity: 0.6;
  }
  .meta {
    padding-top: 0.9rem;
    border-top: 1px solid ${({ theme }) => theme.colors.border};
    font-size: 0.78rem;
    line-height: 1.6;
    color: ${({ theme }) => theme.colors.textMuted};
  }
`;

type Tab = 'checklist' | 'comments' | 'files' | 'history';

interface Props {
  /** Tarefa aberta (vem do estado da tela, então sempre reflete as edições). */
  task: Task;
  projects: TaskProject[];
  tags: TaskTag[];
  users: TaskUser[];
  actions: TaskActions;
  canEdit: boolean;
  canComment: boolean;
  canDelete: boolean;
  canCreate: boolean;
  canCreateTags: boolean;
  onTagCreated: (tag: TaskTag) => void;
  /** Recarrega esta tarefa (contadores, checklist) e a repõe na tela. */
  onRefresh: (id: string) => void;
  onClose: () => void;
  onRemoved: (id: string) => void;
}

/** Painel lateral com todos os dados de uma tarefa. Cada campo salva ao ser alterado. */
export function TaskDetail({
  task,
  projects,
  tags,
  users,
  actions,
  canEdit,
  canComment,
  canDelete,
  canCreate,
  canCreateTags,
  onTagCreated,
  onRefresh,
  onClose,
  onRemoved,
}: Props) {
  const [tab, setTab] = useState<Tab>('checklist');
  const [editingText, setEditingText] = useState(false);
  const [draft, setDraft] = useState('');
  const [title, setTitle] = useState(task.title);
  const [confirming, setConfirming] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [savingText, setSavingText] = useState(false);

  // Se o título mudar por fora (ex.: outra aba/outra pessoa), acompanha.
  const [seenTitle, setSeenTitle] = useState(task.title);
  if (task.title !== seenTitle) {
    setSeenTitle(task.title);
    setTitle(task.title);
  }
  // Ao abrir, busca a versão mais recente (a lista pode estar desatualizada).
  const id = task.id;
  useEffect(() => {
    onRefresh(id);
  }, [id, onRefresh]);

  const project = projects.find((item) => item.id === task.projectId);
  const stages = useMemo(() => [...(project?.stages ?? [])].sort((a, b) => a.order - b.order), [project]);
  const progress = checklistProgress(task);
  const done = !!task.completedAt;
  const refresh = useCallback(() => onRefresh(id), [id, onRefresh]);

  const save = (patch: Record<string, unknown>) => actions.update(task.id, patch);

  const commitTitle = () => {
    const next = title.trim();
    if (!next) return setTitle(task.title);
    if (next !== task.title) void save({ title: next });
  };

  const saveText = async () => {
    setSavingText(true);
    const saved = await save({ description: isEmptyHtml(draft) ? null : draft });
    setSavingText(false);
    if (saved) setEditingText(false);
  };

  const remove = async () => {
    setRemoving(true);
    const ok = await actions.remove([task.id]);
    setRemoving(false);
    if (ok) {
      setConfirming(false);
      onRemoved(task.id);
    }
  };

  const assignee = task.assignedToId ?? '';

  return (
    <Modal
      open
      onClose={onClose}
      variant="drawer"
      width="1020px"
      title="Detalhes da tarefa"
      description={`${task.project.name} · ${task.stage.name}`}
    >
      <Layout>
        <Main>
          <Top>
            <textarea
              className="title"
              rows={1}
              value={title}
              maxLength={200}
              disabled={!canEdit}
              aria-label="Título da tarefa"
              onChange={(event) => setTitle(event.target.value)}
              onBlur={commitTitle}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  event.currentTarget.blur();
                }
              }}
              ref={(el) => {
                if (el) {
                  el.style.height = 'auto';
                  el.style.height = `${el.scrollHeight}px`;
                }
              }}
            />
            <DoneButton type="button" $on={done} disabled={!canEdit} onClick={() => void actions.toggleDone(task)}>
              <Check size={15} aria-hidden /> {done ? 'Concluída' : 'Concluir'}
            </DoneButton>
            {(canCreate || canDelete) && (
              <ActionMenu
                label="Ações da tarefa"
                items={[
                  ...(canCreate
                    ? [
                        {
                          label: 'Duplicar',
                          icon: <Copy size={15} />,
                          onSelect: () => void actions.duplicate(task),
                        },
                      ]
                    : []),
                  ...(canDelete
                    ? [{ label: 'Mover para a lixeira', icon: <Trash2 size={15} />, danger: true, divider: true, onSelect: () => setConfirming(true) }]
                    : []),
                ]}
              />
            )}
          </Top>

          <Section>
            <h3>
              Descrição
              {canEdit && !editingText && (
                <button
                  type="button"
                  className="edit"
                  onClick={() => {
                    setDraft(task.description ?? '');
                    setEditingText(true);
                  }}
                >
                  <Pencil size={13} aria-hidden /> Editar
                </button>
              )}
            </h3>
            {editingText ? (
              <>
                <RichTextEditor label="Descrição da tarefa" initialValue={task.description ?? ''} onChange={setDraft} autoFocus placeholder="Detalhes, links, o que é “pronto”…" />
                <div className="row">
                  <Button variant="ghost" size="sm" onClick={() => setEditingText(false)} disabled={savingText}>
                    Cancelar
                  </Button>
                  <Button size="sm" onClick={() => void saveText()} loading={savingText}>
                    Salvar
                  </Button>
                </div>
              </>
            ) : isEmptyHtml(task.description) ? (
              <p className="empty">Sem descrição.</p>
            ) : (
              <RichTextView html={task.description ?? ''} />
            )}
          </Section>

          <Section>
            <Tabs
              tabs={[
                { key: 'checklist', label: 'Checklist', count: progress.total },
                { key: 'comments', label: 'Comentários', count: task._count.comments },
                { key: 'files', label: 'Anexos', count: task._count.attachments },
                { key: 'history', label: 'Histórico' },
              ]}
              value={tab}
              onChange={setTab}
            />
            <div style={{ marginTop: '1.1rem' }}>
              {tab === 'checklist' && <TaskChecklist task={task} canEdit={canEdit} onChanged={refresh} />}
              {tab === 'comments' && <TaskComments taskId={task.id} canComment={canComment} canModerate={canDelete} onChanged={refresh} />}
              {tab === 'files' && <TaskAttachments taskId={task.id} canAttach={canComment} onChanged={refresh} />}
              {tab === 'history' && <TaskActivity taskId={task.id} />}
            </div>
          </Section>
        </Main>

        <Side aria-label="Propriedades da tarefa">
          <div className="field">
            <label htmlFor="d-project">Projeto</label>
            <select
              id="d-project"
              value={task.projectId}
              disabled={!canEdit}
              onChange={(event) => void save({ projectId: event.target.value })}
            >
              {projects.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="d-stage">Estágio</label>
            <select id="d-stage" value={task.stageId} disabled={!canEdit} onChange={(event) => void save({ stageId: event.target.value })}>
              {stages.map((stage) => (
                <option key={stage.id} value={stage.id}>
                  {stage.name}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="d-priority">Prioridade</label>
            <select id="d-priority" value={task.priority} disabled={!canEdit} onChange={(event) => void save({ priority: event.target.value as TaskPriority })}>
              {PRIORITIES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="d-assignee">Responsável</label>
            <select id="d-assignee" value={assignee} disabled={!canEdit} onChange={(event) => void save({ assignedToId: event.target.value || null })}>
              <option value="">Sem responsável</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
              {/* Pessoa que já foi removida/desativada continua aparecendo até ser trocada. */}
              {task.assignedTo && !users.some((user) => user.id === task.assignedTo?.id) && (
                <option value={task.assignedTo.id}>{task.assignedTo.name}</option>
              )}
            </select>
          </div>

          <div className="field">
            <span className="label">Colaboradores</span>
            <MultiSelect
              label="Colaboradores"
              placeholder="Ninguém"
              disabled={!canEdit}
              value={task.coAssignees.map((c) => c.userId)}
              onChange={(ids) => void save({ coAssigneeIds: ids })}
              options={users.filter((user) => user.id !== task.assignedToId).map((user) => ({ value: user.id, label: user.name, person: true }))}
              renderValue={(selected) => selected.map((item) => item.label).join(', ')}
            />
          </div>

          <div className="field">
            <label htmlFor="d-start">Início</label>
            <input
              id="d-start"
              type="date"
              disabled={!canEdit}
              value={toDateInput(task.startDate)}
              max={toDateInput(task.dueDate) || undefined}
              onChange={(event) => void save({ startDate: fromDateInput(event.target.value) })}
            />
          </div>

          <div className="field">
            <label htmlFor="d-due">Prazo</label>
            <input
              id="d-due"
              type="date"
              disabled={!canEdit}
              value={toDateInput(task.dueDate)}
              min={toDateInput(task.startDate) || undefined}
              onChange={(event) => void save({ dueDate: fromDateInput(event.target.value) })}
            />
          </div>

          <div className="field">
            <span className="label">Tags</span>
            <TagSelect
              tags={tags}
              value={task.tags.map((tag) => tag.id)}
              disabled={!canEdit}
              canCreate={canCreateTags}
              onCreated={onTagCreated}
              onChange={(ids) => void save({ tags: ids })}
            />
          </div>

          <div className="meta">
            Criada {task.createdBy ? `por ${task.createdBy.name} ` : ''}em {formatDateTime(task.createdAt)}
            <br />
            Atualizada em {formatDateTime(task.updatedAt)}
            {task.completedAt && (
              <>
                <br />
                Concluída em {formatDateTime(task.completedAt)}
              </>
            )}
          </div>
        </Side>
      </Layout>

      <ConfirmDialog
        open={confirming}
        title="Mover para a lixeira"
        confirmLabel="Mover para a lixeira"
        message={
          <>
            <strong>{task.title}</strong> vai para a lixeira, com o checklist. Dá para restaurar depois.
          </>
        }
        loading={removing}
        onCancel={() => setConfirming(false)}
        onConfirm={() => void remove()}
      />
    </Modal>
  );
}

