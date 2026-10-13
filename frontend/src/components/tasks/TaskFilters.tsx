import styled from 'styled-components';
import { EMPTY_FILTERS, PRIORITIES, countFilters } from '../../lib/tasks';
import type { TaskFilterState, TaskPriority, TaskTag, TaskUser } from '../../lib/tasks';
import { Chip, Chips } from '../ui/Chips';
import { TagChip } from './TaskUI';

const Panel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
  width: min(360px, calc(100vw - 3rem));
  padding: 0.7rem 0.6rem 0.5rem;

  fieldset {
    border: 0;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  legend {
    padding: 0;
    margin-bottom: 0.1rem;
    font-size: 0.75rem;
    font-weight: 800;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: ${({ theme }) => theme.colors.textMuted};
  }
  select {
    width: 100%;
    height: 40px;
    padding: 0 0.7rem;
    background: ${({ theme }) => theme.colors.background};
    color: ${({ theme }) => theme.colors.text};
    border: 1px solid ${({ theme }) => theme.colors.borderStrong};
    border-radius: ${({ theme }) => theme.radii.md};
  }
  select:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
  }
  .foot {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 0.6rem;
    border-top: 1px solid ${({ theme }) => theme.colors.border};
  }
  .clear {
    font-size: 0.85rem;
    font-weight: 700;
    color: ${({ theme }) => theme.colors.primary};
  }
  .clear:disabled {
    color: ${({ theme }) => theme.colors.textMuted};
    cursor: default;
  }
  .none {
    font-size: 0.85rem;
    color: ${({ theme }) => theme.colors.textMuted};
  }
`;

const SmallChip = styled(Chip)`
  padding: 0.3rem 0.8rem;
  font-size: 0.82rem;
`;

const TagToggle = styled.button<{ $on: boolean }>`
  border-radius: 999px;
  opacity: ${({ $on }) => ($on ? 1 : 0.55)};
  outline: ${({ $on, theme }) => ($on ? `2px solid ${theme.colors.primary}` : 'none')};
  outline-offset: 2px;

  &:hover {
    opacity: 1;
  }
`;

export function TaskFilters({
  value,
  onChange,
  users,
  tags,
}: {
  value: TaskFilterState;
  onChange: (value: TaskFilterState) => void;
  users: TaskUser[];
  tags: TaskTag[];
}) {
  const togglePriority = (priority: TaskPriority) =>
    onChange({
      ...value,
      priority: value.priority.includes(priority) ? value.priority.filter((p) => p !== priority) : [...value.priority, priority],
    });
  const toggleTag = (id: string) =>
    onChange({ ...value, tags: value.tags.includes(id) ? value.tags.filter((t) => t !== id) : [...value.tags, id] });

  return (
    <Panel>
      <fieldset>
        <legend>Prioridade</legend>
        <Chips>
          {PRIORITIES.map((priority) => (
            <SmallChip key={priority.value} type="button" $active={value.priority.includes(priority.value)} onClick={() => togglePriority(priority.value)}>
              {priority.label}
            </SmallChip>
          ))}
        </Chips>
      </fieldset>

      <fieldset>
        <legend>Responsável</legend>
        <select aria-label="Filtrar por responsável" value={value.assignee} onChange={(event) => onChange({ ...value, assignee: event.target.value })}>
          <option value="">Todos</option>
          <option value="me">Eu</option>
          <option value="none">Sem responsável</option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name}
            </option>
          ))}
        </select>
      </fieldset>

      <fieldset>
        <legend>Tags</legend>
        {tags.length === 0 ? (
          <span className="none">Nenhuma tag criada.</span>
        ) : (
          <Chips>
            {tags.map((tag) => (
              <TagToggle key={tag.id} type="button" $on={value.tags.includes(tag.id)} aria-pressed={value.tags.includes(tag.id)} onClick={() => toggleTag(tag.id)}>
                <TagChip $color={tag.color}>{tag.name}</TagChip>
              </TagToggle>
            ))}
          </Chips>
        )}
      </fieldset>

      <fieldset>
        <legend>Prazo</legend>
        <Chips>
          <SmallChip type="button" $active={value.overdue} onClick={() => onChange({ ...value, overdue: !value.overdue })}>
            Somente atrasadas
          </SmallChip>
        </Chips>
      </fieldset>

      <div className="foot">
        <span className="none">{countFilters(value) || 'Nenhum'} filtro(s) ativo(s)</span>
        <button type="button" className="clear" disabled={countFilters(value) === 0} onClick={() => onChange(EMPTY_FILTERS)}>
          Limpar filtros
        </button>
      </div>
    </Panel>
  );
}
