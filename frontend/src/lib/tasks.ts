/*
 * Tipos e regras da gestão de tarefas (painel). Espelham o que a API devolve
 * (backend/src/tasks) e concentram o que várias telas precisam saber.
 */

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type ProjectStatus = 'PLANNING' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'CANCELED';

export interface Person {
  id: string;
  name: string;
}

export interface TaskUser extends Person {
  email: string;
}

export interface StageLite {
  id: string;
  name: string;
  color: string;
  isCompleted: boolean;
}

export interface TaskStage extends StageLite {
  order: number;
}

export interface TaskTag {
  id: string;
  name: string;
  color: string;
}

export interface Subtask {
  id: string;
  title: string;
  completedAt: string | null;
  priority: TaskPriority;
  dueDate: string | null;
  assignedTo: Person | null;
}

export interface Task {
  id: string;
  title: string;
  /** HTML gerado pelo editor de texto. */
  description: string | null;
  priority: TaskPriority;
  startDate: string | null;
  dueDate: string | null;
  completedAt: string | null;
  order: number;
  estimatedMinutes: number | null;
  projectId: string;
  stageId: string;
  assignedToId: string | null;
  createdById: string | null;
  parentTaskId: string | null;
  createdAt: string;
  updatedAt: string;
  assignedTo: Person | null;
  createdBy: Person | null;
  coAssignees: { userId: string; user: Person }[];
  project: { id: string; name: string; color: string };
  stage: StageLite;
  tags: TaskTag[];
  subtasks: Subtask[];
  _count: { comments: number; attachments: number; subtasks: number };
}

export interface TaskProject {
  id: string;
  name: string;
  description: string | null;
  color: string;
  status: ProjectStatus;
  startDate: string | null;
  endDate: string | null;
  isPinned: boolean;
  owner: Person | null;
  stages: TaskStage[];
  _count: { tasks: number };
}

export interface TrashedTask {
  id: string;
  title: string;
  deletedAt: string;
  priority: TaskPriority;
  parentTask: { id: string; title: string } | null;
  project: { id: string; name: string; color: string };
  createdBy: Person | null;
}

export interface TrashedProject {
  id: string;
  name: string;
  color: string;
  deletedAt: string;
  owner: Person | null;
  _count: { tasks: number };
}

export interface TaskComment {
  id: string;
  content: string;
  parentCommentId: string | null;
  isEdited: boolean;
  isDeleted: boolean;
  createdAt: string;
  user: Person | null;
  replies: TaskComment[];
}

export interface TaskAttachment {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  url: string;
  createdAt: string;
  uploadedBy: Person | null;
}

export interface TaskActivity {
  id: string;
  action: string;
  description: string | null;
  changes: Record<string, { old: unknown; new: unknown }> | null;
  createdAt: string;
  user: Person | null;
}

/* ── Prioridade ──────────────────────────────────────── */

export const PRIORITIES: { value: TaskPriority; label: string; color: string }[] = [
  { value: 'LOW', label: 'Baixa', color: '#737373' },
  { value: 'MEDIUM', label: 'Média', color: '#38bdf8' },
  { value: 'HIGH', label: 'Alta', color: '#f59e0b' },
  { value: 'URGENT', label: 'Urgente', color: '#ef4444' },
];

export const priorityMeta = (priority: TaskPriority) =>
  PRIORITIES.find((item) => item.value === priority) ?? PRIORITIES[1];

export const PROJECT_STATUSES: { value: ProjectStatus; label: string }[] = [
  { value: 'PLANNING', label: 'Planejamento' },
  { value: 'ACTIVE', label: 'Em andamento' },
  { value: 'ON_HOLD', label: 'Em pausa' },
  { value: 'COMPLETED', label: 'Concluído' },
  { value: 'CANCELED', label: 'Cancelado' },
];

/** Cores sugeridas para projetos, estágios e tags (a primeira é o verde da marca). */
export const SWATCHES = [
  '#B6E829',
  '#38bdf8',
  '#22c55e',
  '#f59e0b',
  '#ef4444',
  '#a855f7',
  '#ec4899',
  '#14b8a6',
  '#737373',
];

/* ── Datas ───────────────────────────────────────────────
 * Prazos são "datas de calendário", sem hora. No banco ficam à meia-noite UTC e aqui
 * são lidos pela parte AAAA-MM-DD, para o dia nunca "pular" por causa do fuso.
 */

export const toDateInput = (iso?: string | null) => (iso ? iso.slice(0, 10) : '');

export const fromDateInput = (value: string) => (value ? `${value}T00:00:00.000Z` : null);

const pad = (n: number) => String(n).padStart(2, '0');

export const todayYmd = (now = new Date()) =>
  `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

export const addDaysYmd = (ymd: string, days: number) => {
  const [y, m, d] = ymd.split('-').map(Number);
  const date = new Date(y, m - 1, d + days);
  return todayYmd(date);
};

/** Data local (meio-dia, sem surpresas de horário de verão) a partir de AAAA-MM-DD. */
export const ymdToDate = (ymd: string) => {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
};

export const isDone = (task: Pick<Task, 'completedAt'>) => !!task.completedAt;

export const isOverdue = (task: Pick<Task, 'dueDate' | 'completedAt'>, today = todayYmd()) =>
  !!task.dueDate && !task.completedAt && toDateInput(task.dueDate) < today;

export const isDueToday = (task: Pick<Task, 'dueDate'>, today = todayYmd()) =>
  !!task.dueDate && toDateInput(task.dueDate) === today;

/* ── Visões inteligentes ─────────────────────────────────
 * Recortes que atravessam projetos. "Hoje" e "Próximos 7 dias" incluem o que já venceu:
 * uma tarefa atrasada continua sendo trabalho de hoje.
 */

export type SmartViewId = 'today' | 'next7' | 'mine' | 'overdue';

export const SMART_VIEWS: { id: SmartViewId; name: string; empty: string }[] = [
  { id: 'today', name: 'Hoje', empty: 'Nada com prazo para hoje. Dia livre.' },
  { id: 'next7', name: 'Próximos 7 dias', empty: 'Nenhuma tarefa com prazo na próxima semana.' },
  { id: 'mine', name: 'Atribuídas a mim', empty: 'Nenhuma tarefa atribuída a você no momento.' },
  { id: 'overdue', name: 'Atrasadas', empty: 'Nenhuma tarefa fora do prazo. Tudo em dia.' },
];

export const isMine = (task: Task, userId?: string) =>
  !!userId && (task.assignedToId === userId || task.coAssignees.some((c) => c.userId === userId));

export function matchesSmartView(view: SmartViewId, task: Task, userId?: string, today = todayYmd()) {
  if (isDone(task)) return false;
  switch (view) {
    case 'mine':
      return isMine(task, userId);
    case 'overdue':
      return isOverdue(task, today);
    case 'today':
      return !!task.dueDate && toDateInput(task.dueDate) <= today;
    case 'next7':
      return !!task.dueDate && toDateInput(task.dueDate) <= addDaysYmd(today, 7);
  }
}

export function countSmartViews(tasks: Task[], userId?: string): Record<SmartViewId, number> {
  const today = todayYmd();
  const counts: Record<SmartViewId, number> = { today: 0, next7: 0, mine: 0, overdue: 0 };
  for (const task of tasks) {
    for (const view of SMART_VIEWS) {
      if (matchesSmartView(view.id, task, userId, today)) counts[view.id] += 1;
    }
  }
  return counts;
}

/* ── Filtros ─────────────────────────────────────────── */

export interface TaskFilterState {
  priority: TaskPriority[];
  /** "me" = eu; um id de usuário; "none" = sem responsável. */
  assignee: string;
  tags: string[];
  overdue: boolean;
}

export const EMPTY_FILTERS: TaskFilterState = { priority: [], assignee: '', tags: [], overdue: false };

export const countFilters = (filters: TaskFilterState) =>
  filters.priority.length + (filters.assignee ? 1 : 0) + filters.tags.length + (filters.overdue ? 1 : 0);

const stripHtml = (html: string) =>
  html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ');

const normalize = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function matchesFilters(task: Task, filters: TaskFilterState, search: string, userId?: string) {
  if (filters.priority.length && !filters.priority.includes(task.priority)) return false;
  if (filters.overdue && !isOverdue(task)) return false;
  if (filters.tags.length && !task.tags.some((tag) => filters.tags.includes(tag.id))) return false;
  if (filters.assignee === 'none' && (task.assignedToId || task.coAssignees.length)) return false;
  if (filters.assignee === 'me' && !isMine(task, userId)) return false;
  if (filters.assignee && filters.assignee !== 'me' && filters.assignee !== 'none') {
    const id = filters.assignee;
    if (task.assignedToId !== id && !task.coAssignees.some((c) => c.userId === id)) return false;
  }
  const query = normalize(search.trim());
  if (query) {
    const haystack = normalize(
      [task.title, task.description ? stripHtml(task.description) : '', task.tags.map((t) => t.name).join(' '), task.assignedTo?.name ?? ''].join(' '),
    );
    if (!haystack.includes(query)) return false;
  }
  return true;
}

/* ── Contexto (o que a barra lateral seleciona) ──────── */

export type TaskContext =
  | { type: 'all' }
  | { type: 'smart'; id: SmartViewId }
  | { type: 'project'; id: string };

export const ALL_CONTEXT: TaskContext = { type: 'all' };

export const sameContext = (a: TaskContext, b: TaskContext) =>
  a.type === b.type && ('id' in a ? 'id' in b && a.id === b.id : true);

/** Progresso do checklist: concluídos / total. */
export const checklistProgress = (task: Pick<Task, 'subtasks'>) => {
  const total = task.subtasks.length;
  const done = task.subtasks.filter((s) => s.completedAt).length;
  return { done, total, percent: total ? Math.round((done / total) * 100) : 0 };
};

/* ── Opções de exibição dos cartões ──────────────────── */

export interface CardOptions {
  assignee: boolean;
  tags: boolean;
  priority: boolean;
  date: boolean;
}

export const DEFAULT_CARD_OPTIONS: CardOptions = {
  assignee: true,
  tags: true,
  priority: true,
  date: true,
};

/** Pessoas de uma tarefa: o responsável primeiro, depois os colaboradores. */
export const taskPeople = (task: Pick<Task, 'assignedTo' | 'coAssignees'>): Person[] => [
  ...(task.assignedTo ? [task.assignedTo] : []),
  ...task.coAssignees.map((c) => c.user).filter((user) => user.id !== task.assignedTo?.id),
];

/** Cor de texto legível (preto ou branco) sobre um fundo #RRGGBB. */
export function readableOn(hex: string): string {
  const value = hex.replace('#', '');
  if (value.length !== 6) return '#ffffff';
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(value.slice(i, i + 2), 16));
  // luminância percebida (ITU-R BT.601)
  return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? '#0a0a0a' : '#ffffff';
}
