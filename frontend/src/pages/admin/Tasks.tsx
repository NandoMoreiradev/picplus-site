import { lazy, Suspense, useCallback, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import { CalendarDays, Eye, Filter, KanbanSquare, List, PanelLeft, Plus, Settings, Trash2 } from 'lucide-react';
import { BulkActionBar } from '../../components/tasks/BulkActionBar';
import { CreateTaskModal } from '../../components/tasks/CreateTaskModal';
import type { TaskDefaults } from '../../components/tasks/CreateTaskModal';
import { KanbanBoard } from '../../components/tasks/KanbanBoard';
import { Popover } from '../../components/tasks/Popover';
import { ProjectModal } from '../../components/tasks/ProjectModal';
import { SettingsModal } from '../../components/tasks/SettingsModal';
import { TaskDetail } from '../../components/tasks/TaskDetail';
import { TaskFilters } from '../../components/tasks/TaskFilters';
import { TaskList } from '../../components/tasks/TaskList';
import { TaskSidebar } from '../../components/tasks/TaskSidebar';
import { TrashModal } from '../../components/tasks/TrashModal';
import { Button } from '../../components/ui/Button';
import { EmptyState, ErrorState, PageLoader } from '../../components/ui/Feedback';
import { ConfirmDialog } from '../../components/ui/Modal';
import { SearchInput } from '../../components/ui/SearchInput';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../context/auth-context';
import { usePersistentState } from '../../hooks/usePersistentState';
import { useTaskActions } from '../../hooks/useTaskActions';
import { useTaskData } from '../../hooks/useTaskData';
import { api, ApiError } from '../../lib/api';
import {
  ALL_CONTEXT,
  DEFAULT_CARD_OPTIONS,
  EMPTY_FILTERS,
  SMART_VIEWS,
  countFilters,
  countSmartViews,
  matchesFilters,
  matchesSmartView,
} from '../../lib/tasks';
import type { CardOptions, Task, TaskContext, TaskFilterState, TaskProject } from '../../lib/tasks';
import { errorMessage } from '../../lib/validation';

// O calendário (FullCalendar) é pesado: só baixa quando alguém abre essa visão.
const CalendarView = lazy(() => import('../../components/tasks/CalendarView').then((m) => ({ default: m.CalendarView })));

type ViewMode = 'kanban' | 'list' | 'calendar';

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;
const isView = (value: unknown): value is ViewMode => value === 'kanban' || value === 'list' || value === 'calendar';
const isStringArray = (value: unknown): value is string[] => Array.isArray(value) && value.every((v) => typeof v === 'string');
const isContext = (value: unknown): value is TaskContext =>
  isObject(value) && (value.type === 'all' || ((value.type === 'smart' || value.type === 'project') && typeof value.id === 'string'));
const isCardOptions = (value: unknown): value is CardOptions =>
  isObject(value) && (Object.keys(DEFAULT_CARD_OPTIONS) as (keyof CardOptions)[]).every((key) => typeof value[key] === 'boolean');

/* ── Layout ──────────────────────────────────────────── */

const Page = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background: ${({ theme }) => theme.colors.background};
`;

const Bar = styled.header`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem 1rem;
  padding: 0.85rem 1.5rem;
  background: ${({ theme }) => theme.colors.surface};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  flex-shrink: 0;

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    padding: 0.75rem 1rem;
  }

  .heading {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    min-width: 0;
    margin-right: auto;
  }
  h1 {
    font-size: 1.2rem;
    font-weight: 800;
    line-height: 1.2;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .sub {
    display: block;
    font-size: 0.78rem;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.textMuted};
  }
  .tools {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  .search {
    width: 240px;
  }
`;

const Square = styled.button<{ $on?: boolean }>`
  position: relative;
  display: inline-grid;
  place-items: center;
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border-radius: ${({ theme }) => theme.radii.md};
  border: 1px solid ${({ $on, theme }) => ($on ? theme.colors.primary : theme.colors.borderStrong)};
  color: ${({ $on, theme }) => ($on ? theme.colors.primary : theme.colors.textSecondary)};
  background: ${({ $on, theme }) => ($on ? theme.colors.primarySoft : 'transparent')};
  transition: all ${({ theme }) => theme.transitions.fast};

  &:hover:not(:disabled) {
    border-color: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.primary};
  }
  .dot {
    position: absolute;
    top: -6px;
    right: -6px;
    min-width: 18px;
    height: 18px;
    padding: 0 4px;
    border-radius: 999px;
    background: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.textDark};
    font-size: 0.68rem;
    font-weight: 800;
    line-height: 18px;
    text-align: center;
  }
`;

const FilterButton = styled(Square)`
  width: auto;
  padding: 0 0.9rem;
  gap: 0.5rem;
  grid-auto-flow: column;
  font-size: 0.88rem;
  font-weight: 700;
`;

const Segmented = styled.div`
  display: inline-flex;
  padding: 3px;
  gap: 2px;
  background: ${({ theme }) => theme.colors.background};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};

  button {
    display: grid;
    place-items: center;
    width: 36px;
    height: 32px;
    border-radius: ${({ theme }) => theme.radii.sm};
    color: ${({ theme }) => theme.colors.textSecondary};
  }
  button[aria-pressed='true'] {
    background: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.textDark};
  }
  button:hover:not(:disabled):not([aria-pressed='true']) {
    background: ${({ theme }) => theme.colors.surfaceHover};
    color: ${({ theme }) => theme.colors.text};
  }
  button:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }
`;

const Body = styled.div`
  position: relative;
  flex: 1;
  display: flex;
  min-height: 0;
`;

const Scrim = styled.div`
  display: none;

  @media (max-width: ${({ theme }) => theme.breakpoints.laptop}) {
    display: block;
    position: absolute;
    inset: 0;
    z-index: 30;
    background: ${({ theme }) => theme.colors.overlay};
  }
`;

const Content = styled.main<{ $scroll: boolean }>`
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow: ${({ $scroll }) => ($scroll ? 'auto' : 'hidden')};
`;

const Centered = styled.div`
  display: grid;
  place-items: center;
  height: 100%;
  padding: 2rem;
`;

const OptionsList = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 220px;

  .title {
    padding: 0.4rem 0.7rem;
    font-size: 0.72rem;
    font-weight: 800;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    color: ${({ theme }) => theme.colors.textMuted};
  }
  label {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.5rem 0.7rem;
    border-radius: ${({ theme }) => theme.radii.sm};
    font-size: 0.9rem;
    cursor: pointer;
  }
  label:hover {
    background: ${({ theme }) => theme.colors.surfaceHover};
  }
  input {
    accent-color: ${({ theme }) => theme.colors.primary};
    width: 16px;
    height: 16px;
  }
`;

const CARD_OPTION_LABELS: [keyof CardOptions, string][] = [
  ['assignee', 'Responsáveis'],
  ['tags', 'Tags'],
  ['priority', 'Faixa de prioridade'],
  ['date', 'Prazo'],
];

/* ── Página ──────────────────────────────────────────── */

export default function Tasks() {
  const { user, can } = useAuth();
  const toast = useToast();
  const data = useTaskData();
  const { tasks, projects, tags, users, loading, error, reload, setTasks, upsertTask, removeTasks, addTag } = data;
  const actions = useTaskActions({ setTasks, upsertTask, removeTasks, reload });

  const canCreate = can('tasks.create');
  const canEdit = can('tasks.edit');
  const canComment = can('tasks.comment');
  const canDelete = can('tasks.delete');
  const canManage = can('tasks.manage');

  // Preferências de tela (lembradas por pessoa, neste navegador).
  const storeKey = (name: string) => `picplus_tasks_${user?.id ?? 'anon'}_${name}`;
  const [viewMode, setViewMode] = usePersistentState<ViewMode>(storeKey('view'), 'kanban', isView);
  const [storedContext, setContext] = usePersistentState<TaskContext | null>(
    storeKey('context'),
    null,
    (value): value is TaskContext | null => value === null || isContext(value),
  );
  const [cardOptions, setCardOptions] = usePersistentState<CardOptions>(storeKey('card'), DEFAULT_CARD_OPTIONS, isCardOptions);
  const [collapsed, setCollapsed] = usePersistentState<string[]>(storeKey('collapsed'), [], isStringArray);

  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 1024);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<TaskFilterState>(EMPTY_FILTERS);
  const [selected, setSelected] = useState<string[]>([]);

  const [creating, setCreating] = useState<TaskDefaults | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [projectModal, setProjectModal] = useState<TaskProject | 'new' | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [trashOpen, setTrashOpen] = useState(false);
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);
  const [deletingProject, setDeletingProject] = useState<TaskProject | null>(null);
  const [busy, setBusy] = useState(false);

  const filtersAnchor = useRef<HTMLButtonElement>(null);
  const optionsAnchor = useRef<HTMLButtonElement>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);

  /* Contexto atual: o salvo (se ainda existir) ou, no primeiro uso, o primeiro projeto. */
  const context: TaskContext = useMemo(() => {
    if (storedContext?.type === 'project' && !projects.some((p) => p.id === storedContext.id)) return ALL_CONTEXT;
    if (storedContext) return storedContext;
    return projects[0] ? { type: 'project', id: projects[0].id } : ALL_CONTEXT;
  }, [storedContext, projects]);

  const project = context.type === 'project' ? projects.find((p) => p.id === context.id) : undefined;
  // O Kanban agrupa por estágio, que é de cada projeto: fora de um projeto, cai para a lista.
  const view: ViewMode = viewMode === 'kanban' && !project ? 'list' : viewMode;

  const scoped = useMemo(() => {
    switch (context.type) {
      case 'project':
        return tasks.filter((task) => task.projectId === context.id);
      case 'smart':
        return tasks.filter((task) => matchesSmartView(context.id, task, user?.id));
      default:
        return tasks;
    }
  }, [tasks, context, user?.id]);

  const visible = useMemo(
    () => scoped.filter((task) => matchesFilters(task, filters, search, user?.id)),
    [scoped, filters, search, user?.id],
  );
  const selectedIds = useMemo(() => selected.filter((id) => visible.some((task) => task.id === id)), [selected, visible]);

  const smartCounts = useMemo(() => countSmartViews(tasks, user?.id), [tasks, user?.id]);
  const projectCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const task of tasks) counts[task.projectId] = (counts[task.projectId] ?? 0) + 1;
    return counts;
  }, [tasks]);

  const filterCount = countFilters(filters);
  const openTask = openId ? tasks.find((task) => task.id === openId) : undefined;

  const title =
    context.type === 'project'
      ? (project?.name ?? 'Projeto')
      : context.type === 'smart'
        ? (SMART_VIEWS.find((v) => v.id === context.id)?.name ?? 'Tarefas')
        : 'Todas as tarefas';

  /* ── Ações da tela ───────────────────────────────────── */

  const select = (next: TaskContext) => {
    setContext(next);
    setSelected([]);
    if (window.innerWidth < 1024) setSidebarOpen(false);
  };

  const newTask = (defaults: TaskDefaults = {}) => {
    if (projects.length === 0) {
      if (canManage) setProjectModal('new');
      else toast.error('Ainda não há projetos. Peça a quem gerencia as tarefas para criar um.');
      return;
    }
    setCreating({ projectId: project?.id, ...defaults });
  };

  /** Recarrega uma tarefa (contadores, checklist) e a repõe na tela; se sumiu, tira dela. */
  const refreshTask = useCallback(
    (id: string) => {
      api
        .get<Task>(`/admin/tasks/${id}`)
        .then(upsertTask)
        .catch((error: unknown) => {
          if (error instanceof ApiError && error.status === 404) removeTasks([id]);
        });
    },
    [upsertTask, removeTasks],
  );

  const toggleSelect = (id: string) => setSelected((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]));
  const toggleAll = (ids: string[], on: boolean) => setSelected((list) => (on ? [...new Set([...list, ...ids])] : list.filter((id) => !ids.includes(id))));

  const projectAction = async (job: () => Promise<unknown>, success: string) => {
    setBusy(true);
    try {
      const result = await job();
      toast.success(success);
      reload();
      return result;
    } catch (error) {
      toast.error(errorMessage(error));
      return undefined;
    } finally {
      setBusy(false);
    }
  };

  const togglePin = (item: TaskProject) =>
    void projectAction(() => api.patch(`/admin/tasks/projects/${item.id}/pin`), item.isPinned ? 'Projeto desafixado.' : 'Projeto fixado no topo.');

  const duplicateProject = async (item: TaskProject) => {
    const copy = (await projectAction(() => api.post<TaskProject>(`/admin/tasks/projects/${item.id}/duplicate`), 'Projeto duplicado.')) as TaskProject | undefined;
    if (copy) select({ type: 'project', id: copy.id });
  };

  const deleteProject = async () => {
    if (!deletingProject) return;
    const target = deletingProject;
    const ok = await projectAction(() => api.delete(`/admin/tasks/projects/${target.id}`), 'Projeto movido para a lixeira.');
    setDeletingProject(null);
    if (ok && context.type === 'project' && context.id === target.id) setContext(ALL_CONTEXT);
  };

  const confirmDeleteTask = async () => {
    if (!deletingTask) return;
    setBusy(true);
    await actions.remove([deletingTask.id]);
    setBusy(false);
    setDeletingTask(null);
  };

  /* ── Renderização ────────────────────────────────────── */

  const emptyMessage =
    context.type === 'smart'
      ? (SMART_VIEWS.find((v) => v.id === context.id)?.empty ?? 'Nada por aqui.')
      : 'Crie a primeira tarefa para começar.';

  const body = () => {
    if (error && !loading && tasks.length === 0 && projects.length === 0) {
      return (
        <Centered>
          <ErrorState message={error.message} onRetry={reload} />
        </Centered>
      );
    }
    if (loading && tasks.length === 0 && projects.length === 0) return <PageLoader label="Carregando tarefas…" />;

    if (projects.length === 0) {
      return (
        <Centered>
          <EmptyState
            title="Comece criando um projeto"
            description="Cada projeto tem o seu quadro Kanban, com colunas que você personaliza. As tarefas ficam dentro dele."
            action={canManage ? <Button onClick={() => setProjectModal('new')}>Criar projeto</Button> : undefined}
          />
        </Centered>
      );
    }

    if (scoped.length === 0) {
      const isSmart = context.type === 'smart';
      // Num projeto vazio, o quadro com as colunas já convida a criar; fora dele, mensagem.
      if (view !== 'kanban') {
        return (
          <Centered>
            <EmptyState
              title={isSmart ? title : 'Nenhuma tarefa por aqui'}
              description={emptyMessage}
              action={!isSmart && canCreate ? <Button onClick={() => newTask()}>Nova tarefa</Button> : undefined}
            />
          </Centered>
        );
      }
    } else if (visible.length === 0) {
      return (
        <Centered>
          <EmptyState
            title="Nenhuma tarefa encontrada"
            description="Nada corresponde à busca e aos filtros atuais."
            action={
              <Button
                variant="secondary"
                onClick={() => {
                  setFilters(EMPTY_FILTERS);
                  setSearch('');
                }}
              >
                Limpar busca e filtros
              </Button>
            }
          />
        </Centered>
      );
    }

    if (view === 'kanban' && project) {
      return (
        <KanbanBoard
          project={project}
          tasks={visible}
          options={cardOptions}
          collapsed={collapsed}
          selected={selectedIds}
          actions={actions}
          canCreate={canCreate}
          canEdit={canEdit}
          canDelete={canDelete}
          onToggleCollapse={(stageId) => setCollapsed((list) => (list.includes(stageId) ? list.filter((id) => id !== stageId) : [...list, stageId]))}
          onToggleSelect={toggleSelect}
          onOpen={(task) => setOpenId(task.id)}
          onAdd={(stageId) => newTask({ projectId: project.id, stageId })}
          onDelete={setDeletingTask}
        />
      );
    }
    if (view === 'calendar') {
      return (
        <Suspense fallback={<PageLoader label="Carregando calendário…" />}>
          <CalendarView
            tasks={visible}
            actions={actions}
            canCreate={canCreate}
            canEdit={canEdit}
            onOpen={(task) => setOpenId(task.id)}
            onCreateOn={(ymd) => newTask({ dueDate: ymd })}
          />
        </Suspense>
      );
    }
    return (
      <TaskList
        tasks={visible}
        selected={selectedIds}
        actions={actions}
        canEdit={canEdit}
        canCreate={canCreate}
        canDelete={canDelete}
        onToggleSelect={toggleSelect}
        onToggleAll={toggleAll}
        onOpen={(task) => setOpenId(task.id)}
        onDelete={setDeletingTask}
        showProject={context.type !== 'project'}
      />
    );
  };

  const rootSelf = view === 'kanban' || view === 'calendar';
  const hasProjects = projects.length > 0;

  return (
    <Page>
      <Bar>
        <div className="heading">
          <Square type="button" $on={sidebarOpen} onClick={() => setSidebarOpen((v) => !v)} aria-label={sidebarOpen ? 'Esconder a barra lateral' : 'Mostrar a barra lateral'} aria-expanded={sidebarOpen}>
            <PanelLeft size={19} aria-hidden />
          </Square>
          <div style={{ minWidth: 0 }}>
            <h1>{title}</h1>
            <span className="sub">
              {visible.length} {visible.length === 1 ? 'tarefa' : 'tarefas'}
              {visible.length !== scoped.length && ` de ${scoped.length}`}
            </span>
          </div>
        </div>

        {hasProjects && (
          <div className="tools">
            <div className="search">
              <SearchInput value={search} onChange={setSearch} placeholder="Buscar tarefas…" label="Buscar tarefas" />
            </div>

            <FilterButton ref={filtersAnchor} type="button" $on={filtersOpen || filterCount > 0} aria-haspopup="dialog" aria-expanded={filtersOpen} onClick={() => setFiltersOpen((v) => !v)}>
              <Filter size={17} aria-hidden /> Filtros
              {filterCount > 0 && <span className="dot">{filterCount}</span>}
            </FilterButton>
            <Popover anchor={filtersAnchor} open={filtersOpen} onClose={() => setFiltersOpen(false)} align="end" width={360}>
              <TaskFilters value={filters} onChange={setFilters} users={users} tags={tags} />
            </Popover>

            <Segmented role="group" aria-label="Modo de visualização">
              <button
                type="button"
                aria-pressed={view === 'kanban'}
                disabled={!project}
                title={project ? 'Kanban' : 'O Kanban agrupa por estágio, que é de cada projeto. Abra um projeto para usá-lo.'}
                aria-label="Kanban"
                onClick={() => setViewMode('kanban')}
              >
                <KanbanSquare size={17} aria-hidden />
              </button>
              <button type="button" aria-pressed={view === 'list'} title="Lista" aria-label="Lista" onClick={() => setViewMode('list')}>
                <List size={17} aria-hidden />
              </button>
              <button type="button" aria-pressed={view === 'calendar'} title="Calendário" aria-label="Calendário" onClick={() => setViewMode('calendar')}>
                <CalendarDays size={17} aria-hidden />
              </button>
            </Segmented>

            {view === 'kanban' && (
              <>
                <Square ref={optionsAnchor} type="button" $on={optionsOpen} title="O que mostrar nos cartões" aria-label="Opções dos cartões" aria-expanded={optionsOpen} onClick={() => setOptionsOpen((v) => !v)}>
                  <Eye size={18} aria-hidden />
                </Square>
                <Popover anchor={optionsAnchor} open={optionsOpen} onClose={() => setOptionsOpen(false)} align="end">
                  <OptionsList>
                    <span className="title">Mostrar nos cartões</span>
                    {CARD_OPTION_LABELS.map(([key, label]) => (
                      <label key={key}>
                        <input type="checkbox" checked={cardOptions[key]} onChange={() => setCardOptions((o) => ({ ...o, [key]: !o[key] }))} />
                        {label}
                      </label>
                    ))}
                  </OptionsList>
                </Popover>
              </>
            )}
          </div>
        )}

        <div className="tools">
          {canDelete && (
            <Square type="button" title="Lixeira" aria-label="Lixeira" onClick={() => setTrashOpen(true)}>
              <Trash2 size={18} aria-hidden />
            </Square>
          )}
          {canManage && hasProjects && (
            <Square type="button" title="Configurações (estágios e tags)" aria-label="Configurações" onClick={() => setSettingsOpen(true)}>
              <Settings size={18} aria-hidden />
            </Square>
          )}
          {canCreate && (
            <Button size="sm" onClick={() => newTask()}>
              <Plus size={17} aria-hidden /> Nova tarefa
            </Button>
          )}
        </div>
      </Bar>

      <Body>
        {sidebarOpen && <Scrim onClick={() => setSidebarOpen(false)} />}
        <TaskSidebar
          open={sidebarOpen}
          context={context}
          projects={projects}
          totalTasks={tasks.length}
          counts={projectCounts}
          smartCounts={smartCounts}
          canManage={canManage}
          canEdit={canEdit}
          canDelete={canDelete}
          onSelect={select}
          onNewProject={() => setProjectModal('new')}
          onEditProject={setProjectModal}
          onTogglePin={togglePin}
          onDuplicateProject={(item) => void duplicateProject(item)}
          onDeleteProject={setDeletingProject}
        />
        <Content $scroll={!rootSelf}>
          {body()}
        </Content>
      </Body>

      <BulkActionBar
        count={selectedIds.length}
        stages={view === 'kanban' ? project?.stages : undefined}
        users={users}
        canEdit={canEdit}
        canDelete={canDelete}
        onApply={(patch) => actions.bulkUpdate(selectedIds, patch)}
        onDelete={() => actions.remove(selectedIds)}
        onClear={() => setSelected([])}
      />

      {creating && (
        <CreateTaskModal
          projects={projects}
          tags={tags}
          users={users}
          defaults={creating}
          canCreateTags={canEdit || canManage}
          onTagCreated={addTag}
          onClose={() => setCreating(null)}
          onCreated={(task) => {
            upsertTask(task);
            setCreating(null);
          }}
        />
      )}

      {openTask && (
        <TaskDetail
          task={openTask}
          projects={projects}
          tags={tags}
          users={users}
          actions={actions}
          canEdit={canEdit}
          canComment={canComment}
          canDelete={canDelete}
          canCreate={canCreate}
          canCreateTags={canEdit || canManage}
          onTagCreated={addTag}
          onRefresh={refreshTask}
          onClose={() => setOpenId(null)}
          onRemoved={() => setOpenId(null)}
        />
      )}

      {projectModal && (
        <ProjectModal
          project={projectModal === 'new' ? null : projectModal}
          onClose={() => setProjectModal(null)}
          onSaved={(saved) => {
            const isNew = projectModal === 'new';
            setProjectModal(null);
            reload();
            if (isNew) select({ type: 'project', id: saved.id });
          }}
        />
      )}

      {settingsOpen && <SettingsModal projects={projects} tags={tags} initialProjectId={project?.id} onClose={() => setSettingsOpen(false)} onChanged={reload} />}

      {trashOpen && <TrashModal canManageProjects={canManage} onClose={() => setTrashOpen(false)} onChanged={reload} />}

      <ConfirmDialog
        open={!!deletingTask}
        title="Mover para a lixeira"
        confirmLabel="Mover para a lixeira"
        loading={busy}
        message={
          <>
            <strong>{deletingTask?.title}</strong> vai para a lixeira, com o checklist. Dá para restaurar depois.
          </>
        }
        onCancel={() => setDeletingTask(null)}
        onConfirm={() => void confirmDeleteTask()}
      />

      <ConfirmDialog
        open={!!deletingProject}
        title="Excluir projeto"
        confirmLabel="Mover para a lixeira"
        loading={busy}
        message={
          <>
            O projeto <strong>{deletingProject?.name}</strong> e as suas {projectCounts[deletingProject?.id ?? ''] ?? 0} tarefas vão para a lixeira. Restaurar o projeto devolve tudo.
          </>
        }
        onCancel={() => setDeletingProject(null)}
        onConfirm={() => void deleteProject()}
      />
    </Page>
  );
}
