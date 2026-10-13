import styled from 'styled-components';
import { AlertTriangle, CalendarDays, CalendarRange, Copy, Layers, ListChecks, Pencil, Pin, PinOff, Plus, Trash2, UserCheck } from 'lucide-react';
import { SMART_VIEWS, sameContext } from '../../lib/tasks';
import type { SmartViewId, TaskContext, TaskProject } from '../../lib/tasks';
import { ActionMenu } from './Popover';
import { ColorDot } from './TaskUI';

const Aside = styled.aside<{ $open: boolean }>`
  flex-shrink: 0;
  width: 264px;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding: 1rem 0.75rem 1.5rem;
  overflow-y: auto;
  background: ${({ theme }) => theme.colors.surface};
  border-right: 1px solid ${({ theme }) => theme.colors.border};

  @media (max-width: ${({ theme }) => theme.breakpoints.laptop}) {
    position: absolute;
    inset: 0 auto 0 0;
    z-index: 40;
    transform: translateX(${({ $open }) => ($open ? '0' : '-100%')});
    visibility: ${({ $open }) => ($open ? 'visible' : 'hidden')};
    transition:
      transform ${({ theme }) => theme.transitions.default},
      visibility ${({ theme }) => theme.transitions.default};
    box-shadow: ${({ $open, theme }) => ($open ? theme.shadows.overlay : 'none')};
  }
  @media (min-width: ${({ theme }) => theme.breakpoints.laptop}) {
    display: ${({ $open }) => ($open ? 'flex' : 'none')};
  }
`;

const Group = styled.nav`
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
`;

const GroupTitle = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 0.6rem 0.4rem;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.textMuted};

  button {
    display: grid;
    place-items: center;
    width: 24px;
    height: 24px;
    border-radius: ${({ theme }) => theme.radii.sm};
    color: ${({ theme }) => theme.colors.textSecondary};
  }
  button:hover {
    background: ${({ theme }) => theme.colors.surfaceHover};
    color: ${({ theme }) => theme.colors.primary};
  }
`;

const Row = styled.div<{ $active: boolean }>`
  display: flex;
  align-items: center;
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ $active, theme }) => ($active ? theme.colors.primarySoft : 'transparent')};

  &:hover {
    background: ${({ $active, theme }) => ($active ? theme.colors.primarySoft : theme.colors.surfaceHover)};
  }
  &:hover .menu,
  &:focus-within .menu {
    opacity: 1;
  }
  .menu {
    opacity: 0;
    padding-right: 0.2rem;
    transition: opacity ${({ theme }) => theme.transitions.fast};
  }
`;

const Item = styled.button<{ $active: boolean; $tone?: 'danger' }>`
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.55rem 0.7rem;
  text-align: left;
  font-size: 0.9rem;
  font-weight: ${({ $active }) => ($active ? 800 : 600)};
  color: ${({ $active, $tone, theme }) =>
    $active ? theme.colors.primary : $tone === 'danger' ? theme.colors.danger : theme.colors.textSecondary};

  svg {
    flex-shrink: 0;
  }
  .label {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

const Badge = styled.span<{ $alert?: boolean }>`
  flex-shrink: 0;
  min-width: 24px;
  padding: 0 0.4rem;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 800;
  line-height: 20px;
  text-align: center;
  background: ${({ $alert, theme }) => ($alert ? theme.colors.dangerSoft : theme.colors.surfaceHover)};
  color: ${({ $alert, theme }) => ($alert ? theme.colors.danger : theme.colors.textSecondary)};
`;

const Hint = styled.p`
  padding: 0.4rem 0.7rem;
  font-size: 0.85rem;
  color: ${({ theme }) => theme.colors.textMuted};
  line-height: 1.5;
`;

const SMART_ICONS: Record<SmartViewId, typeof CalendarDays> = {
  today: CalendarDays,
  next7: CalendarRange,
  mine: UserCheck,
  overdue: AlertTriangle,
};

interface Props {
  open: boolean;
  context: TaskContext;
  projects: TaskProject[];
  totalTasks: number;
  /** Tarefas por projeto (contadas na tela, sempre em dia com as edições). */
  counts: Record<string, number>;
  smartCounts: Record<SmartViewId, number>;
  canManage: boolean;
  canEdit: boolean;
  canDelete: boolean;
  onSelect: (context: TaskContext) => void;
  onNewProject: () => void;
  onEditProject: (project: TaskProject) => void;
  onTogglePin: (project: TaskProject) => void;
  onDuplicateProject: (project: TaskProject) => void;
  onDeleteProject: (project: TaskProject) => void;
}

export function TaskSidebar({
  open,
  context,
  projects,
  totalTasks,
  counts,
  smartCounts,
  canManage,
  canEdit,
  canDelete,
  onSelect,
  onNewProject,
  onEditProject,
  onTogglePin,
  onDuplicateProject,
  onDeleteProject,
}: Props) {
  const is = (candidate: TaskContext) => sameContext(context, candidate);

  return (
    <Aside $open={open} aria-label="Navegação de tarefas">
      <Group aria-label="Visões">
        <Row $active={is({ type: 'all' })}>
          <Item type="button" $active={is({ type: 'all' })} onClick={() => onSelect({ type: 'all' })}>
            <Layers size={18} aria-hidden />
            <span className="label">Todas as tarefas</span>
            <Badge>{totalTasks}</Badge>
          </Item>
        </Row>
        {SMART_VIEWS.map((view) => {
          const Icon = SMART_ICONS[view.id];
          const active = is({ type: 'smart', id: view.id });
          const count = smartCounts[view.id];
          return (
            <Row key={view.id} $active={active}>
              <Item
                type="button"
                $active={active}
                $tone={view.id === 'overdue' && count > 0 ? 'danger' : undefined}
                onClick={() => onSelect({ type: 'smart', id: view.id })}
              >
                <Icon size={18} aria-hidden />
                <span className="label">{view.name}</span>
                <Badge $alert={view.id === 'overdue' && count > 0}>{count}</Badge>
              </Item>
            </Row>
          );
        })}
      </Group>

      <Group aria-label="Projetos">
        <GroupTitle>
          Projetos
          {canManage && (
            <button type="button" onClick={onNewProject} title="Novo projeto" aria-label="Novo projeto">
              <Plus size={16} aria-hidden />
            </button>
          )}
        </GroupTitle>

        {projects.length === 0 && (
          <Hint>
            {canManage ? (
              <>
                Nenhum projeto ainda.{' '}
                <button type="button" style={{ color: 'inherit', textDecoration: 'underline' }} onClick={onNewProject}>
                  Criar o primeiro
                </button>
              </>
            ) : (
              'Nenhum projeto criado.'
            )}
          </Hint>
        )}

        {projects.map((project) => {
          const active = is({ type: 'project', id: project.id });
          return (
            <Row key={project.id} $active={active}>
              <Item type="button" $active={active} onClick={() => onSelect({ type: 'project', id: project.id })}>
                <ColorDot $color={project.color} />
                <span className="label">{project.name}</span>
                {project.isPinned && <Pin size={13} aria-label="Fixado" />}
                <Badge>{counts[project.id] ?? 0}</Badge>
              </Item>
              {(canEdit || canManage || canDelete) && (
                <span className="menu">
                  <ActionMenu
                    label={`Ações do projeto ${project.name}`}
                    items={[
                      ...(canEdit
                        ? [
                            {
                              label: project.isPinned ? 'Desafixar' : 'Fixar no topo',
                              icon: project.isPinned ? <PinOff size={15} /> : <Pin size={15} />,
                              onSelect: () => onTogglePin(project),
                            },
                          ]
                        : []),
                      ...(canManage
                        ? [
                            { label: 'Editar projeto', icon: <Pencil size={15} />, onSelect: () => onEditProject(project) },
                            { label: 'Duplicar (sem as tarefas)', icon: <Copy size={15} />, onSelect: () => onDuplicateProject(project) },
                          ]
                        : []),
                      ...(canManage && canDelete
                        ? [{ label: 'Excluir projeto', icon: <Trash2 size={15} />, danger: true, divider: true, onSelect: () => onDeleteProject(project) }]
                        : []),
                    ]}
                  />
                </span>
              )}
            </Row>
          );
        })}
      </Group>

      <Hint aria-hidden style={{ marginTop: 'auto' }}>
        <ListChecks size={14} style={{ verticalAlign: '-2px' }} /> O Kanban aparece ao abrir um projeto.
      </Hint>
    </Aside>
  );
}
