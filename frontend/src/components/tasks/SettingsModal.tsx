import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { ArrowDown, ArrowUp, CheckCircle2, Plus, Trash2 } from 'lucide-react';
import { useFetch } from '../../hooks/useFetch';
import { api } from '../../lib/api';
import type { TaskProject, TaskTag } from '../../lib/tasks';
import { errorMessage } from '../../lib/validation';
import { IconButton, Tabs } from '../admin/AdminUI';
import { Button } from '../ui/Button';
import { ErrorState, Skeleton } from '../ui/Feedback';
import { Modal } from '../ui/Modal';
import { useToast } from '../ui/Toast';

const Rows = styled.ul`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 1.25rem;
`;

const Row = styled.li`
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.5rem 0.6rem;
  background: ${({ theme }) => theme.colors.background};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};

  input[type='color'] {
    flex-shrink: 0;
    width: 30px;
    height: 30px;
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: none;
    cursor: pointer;
  }
  input[type='color']::-webkit-color-swatch-wrapper {
    padding: 0;
  }
  input[type='color']::-webkit-color-swatch {
    border: 2px solid ${({ theme }) => theme.colors.borderStrong};
    border-radius: 50%;
  }
  input[type='text'] {
    flex: 1;
    min-width: 0;
    height: 36px;
    padding: 0 0.7rem;
    background: transparent;
    color: ${({ theme }) => theme.colors.text};
    border: 1px solid transparent;
    border-radius: ${({ theme }) => theme.radii.sm};
    font-weight: 600;
  }
  input[type='text']:hover {
    border-color: ${({ theme }) => theme.colors.border};
  }
  input[type='text']:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
  }
  label.done {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    flex-shrink: 0;
    padding: 0.3rem 0.6rem;
    border-radius: 999px;
    font-size: 0.78rem;
    font-weight: 700;
    cursor: pointer;
    color: ${({ theme }) => theme.colors.textSecondary};
    background: ${({ theme }) => theme.colors.surfaceHover};
  }
  label.done:has(input:checked) {
    color: ${({ theme }) => theme.colors.success};
    background: ${({ theme }) => theme.colors.successSoft};
  }
  label.done input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
  }
  .count {
    flex-shrink: 0;
    font-size: 0.78rem;
    color: ${({ theme }) => theme.colors.textMuted};
  }
`;

const AddRow = styled(Row)`
  border-style: dashed;
  margin-top: 0.4rem;
`;

const Select = styled.select`
  width: 100%;
  height: 42px;
  padding: 0 0.9rem;
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text};
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  border-radius: ${({ theme }) => theme.radii.md};
  margin-top: 1rem;
`;

const Intro = styled.p`
  margin-top: 1rem;
  font-size: 0.88rem;
  color: ${({ theme }) => theme.colors.textSecondary};
  line-height: 1.55;
`;

/**
 * Seletor de cor que só avisa quando a escolha termina. O evento "change" nativo dispara ao
 * fechar o seletor (o onChange do React dispara a cada movimento e geraria dezenas de chamadas).
 */
function ColorInput({ value, label, onCommit }: { value: string; label: string; onCommit: (color: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const commit = useRef(onCommit);
  useEffect(() => {
    commit.current = onCommit;
  });
  useEffect(() => {
    const input = ref.current;
    if (!input) return;
    const handle = () => commit.current(input.value);
    input.addEventListener('change', handle);
    return () => input.removeEventListener('change', handle);
  }, []);
  return <input ref={ref} type="color" defaultValue={value} aria-label={label} />;
}

interface StageRow {
  id: string;
  name: string;
  color: string;
  order: number;
  isCompleted: boolean;
  _count: { tasks: number };
}

function StagesTab({ projects, initialProjectId, onChanged }: { projects: TaskProject[]; initialProjectId?: string; onChanged: () => void }) {
  const toast = useToast();
  const [projectId, setProjectId] = useState(initialProjectId ?? projects[0]?.id ?? '');
  const stages = useFetch<StageRow[]>(projectId ? '/admin/tasks/stages' : null, { projectId });
  const [newName, setNewName] = useState('');
  const [busy, setBusy] = useState(false);
  const list = stages.data ?? [];

  const run = async (job: () => Promise<unknown>, success?: string) => {
    setBusy(true);
    try {
      await job();
      if (success) toast.success(success);
      stages.reload();
      onChanged();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const patch = (stage: StageRow, body: Partial<Pick<StageRow, 'name' | 'color' | 'isCompleted'>>) =>
    run(() => api.patch(`/admin/tasks/stages/${stage.id}`, body));

  const move = (index: number, delta: -1 | 1) => {
    const next = [...list];
    const [item] = next.splice(index, 1);
    next.splice(index + delta, 0, item);
    return run(() => api.patch('/admin/tasks/stages/reorder', { items: next.map((s, order) => ({ id: s.id, order })) }));
  };

  if (!projects.length) return <Intro>Crie um projeto para configurar os estágios dele.</Intro>;

  return (
    <>
      <Intro>
        Os estágios são as colunas do Kanban de cada projeto. Tarefas que chegam a um <strong>estágio final</strong> (ex.: “Concluído”) contam como concluídas.
      </Intro>
      <Select aria-label="Projeto" value={projectId} onChange={(event) => setProjectId(event.target.value)}>
        {projects.map((project) => (
          <option key={project.id} value={project.id}>
            {project.name}
          </option>
        ))}
      </Select>

      {stages.error ? (
        <ErrorState message={stages.error.message} onRetry={stages.reload} />
      ) : stages.loading && !stages.data ? (
        <Skeleton $h="160px" style={{ marginTop: '1.25rem' }} />
      ) : (
        <Rows>
          {list.map((stage, index) => (
            <StageEditor
              key={`${stage.id}-${stage.name}-${stage.color}`}
              stage={stage}
              busy={busy}
              first={index === 0}
              last={index === list.length - 1}
              onPatch={(body) => patch(stage, body)}
              onMove={(delta) => move(index, delta)}
              onDelete={() => run(() => api.delete(`/admin/tasks/stages/${stage.id}`), 'Estágio excluído.')}
            />
          ))}
          <AddRow
            as="form"
            onSubmit={(event) => {
              event.preventDefault();
              if (!newName.trim()) return;
              void run(() => api.post('/admin/tasks/stages', { projectId, name: newName.trim() }), 'Estágio criado.').then(() => setNewName(''));
            }}
          >
            <Plus size={18} aria-hidden style={{ marginLeft: '0.3rem', flexShrink: 0 }} />
            <input type="text" aria-label="Nome do novo estágio" placeholder="Novo estágio…" maxLength={40} value={newName} onChange={(event) => setNewName(event.target.value)} />
            <Button type="submit" size="sm" disabled={!newName.trim()} loading={busy}>
              Adicionar
            </Button>
          </AddRow>
        </Rows>
      )}
    </>
  );
}

function StageEditor({
  stage,
  busy,
  first,
  last,
  onPatch,
  onMove,
  onDelete,
}: {
  stage: StageRow;
  busy: boolean;
  first: boolean;
  last: boolean;
  onPatch: (body: Partial<Pick<StageRow, 'name' | 'color' | 'isCompleted'>>) => void;
  onMove: (delta: -1 | 1) => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(stage.name);
  const commitName = () => {
    const next = name.trim();
    if (!next) return setName(stage.name);
    if (next !== stage.name) onPatch({ name: next });
  };
  return (
    <Row>
      <ColorInput label={`Cor de ${stage.name}`} value={stage.color} onCommit={(color) => color !== stage.color && onPatch({ color })} />
      <input
        type="text"
        aria-label={`Nome do estágio ${stage.name}`}
        value={name}
        maxLength={40}
        onChange={(event) => setName(event.target.value)}
        onBlur={commitName}
        onKeyDown={(event) => event.key === 'Enter' && event.currentTarget.blur()}
      />
      <label className="done" title="Tarefas que chegam a este estágio contam como concluídas">
        <input type="checkbox" checked={stage.isCompleted} disabled={busy} onChange={(event) => onPatch({ isCompleted: event.target.checked })} />
        <CheckCircle2 size={14} aria-hidden /> Estágio final
      </label>
      <span className="count" title="Tarefas neste estágio (inclusive na lixeira)">
        {stage._count.tasks}
      </span>
      <IconButton label="Subir" disabled={first || busy} onClick={() => onMove(-1)}>
        <ArrowUp size={16} />
      </IconButton>
      <IconButton label="Descer" disabled={last || busy} onClick={() => onMove(1)}>
        <ArrowDown size={16} />
      </IconButton>
      <IconButton
        label={stage._count.tasks ? 'Mova as tarefas deste estágio antes de excluir' : `Excluir ${stage.name}`}
        danger
        disabled={busy || stage._count.tasks > 0}
        onClick={onDelete}
      >
        <Trash2 size={16} />
      </IconButton>
    </Row>
  );
}

function TagEditor({ tag, busy, onPatch, onDelete }: { tag: TaskTag; busy: boolean; onPatch: (body: { name?: string; color?: string }) => void; onDelete: () => void }) {
  const [name, setName] = useState(tag.name);
  return (
    <Row>
      <ColorInput label={`Cor da tag ${tag.name}`} value={tag.color} onCommit={(color) => color !== tag.color && onPatch({ color })} />
      <input
        type="text"
        aria-label={`Nome da tag ${tag.name}`}
        value={name}
        maxLength={30}
        onChange={(event) => setName(event.target.value)}
        onBlur={() => {
          const next = name.trim();
          if (!next) return setName(tag.name);
          if (next !== tag.name) onPatch({ name: next });
        }}
        onKeyDown={(event) => event.key === 'Enter' && event.currentTarget.blur()}
      />
      <IconButton label={`Excluir a tag ${tag.name}`} danger disabled={busy} onClick={onDelete}>
        <Trash2 size={16} />
      </IconButton>
    </Row>
  );
}

function TagsTab({ tags, onChanged }: { tags: TaskTag[]; onChanged: () => void }) {
  const toast = useToast();
  const [name, setName] = useState('');
  const [color, setColor] = useState('#38bdf8');
  const [busy, setBusy] = useState(false);

  const run = async (job: () => Promise<unknown>, success?: string) => {
    setBusy(true);
    try {
      await job();
      if (success) toast.success(success);
      onChanged();
      return true;
    } catch (error) {
      toast.error(errorMessage(error));
      return false;
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Intro>Tags ajudam a filtrar tarefas. Excluir uma tag a remove de todas as tarefas.</Intro>
      <Rows>
        {tags.map((tag) => (
          <TagEditor
            key={`${tag.id}-${tag.name}-${tag.color}`}
            tag={tag}
            busy={busy}
            onPatch={(body) => void run(() => api.patch(`/admin/tasks/tags/${tag.id}`, body))}
            onDelete={() => void run(() => api.delete(`/admin/tasks/tags/${tag.id}`), 'Tag excluída.')}
          />
        ))}
        {tags.length === 0 && <Intro style={{ marginTop: 0 }}>Nenhuma tag criada ainda.</Intro>}
        <AddRow
          as="form"
          onSubmit={(event) => {
            event.preventDefault();
            if (!name.trim()) return;
            void run(() => api.post('/admin/tasks/tags', { name: name.trim(), color }), 'Tag criada.').then((ok) => ok && setName(''));
          }}
        >
          <input type="color" aria-label="Cor da nova tag" value={color} onChange={(event) => setColor(event.target.value)} />
          <input type="text" aria-label="Nome da nova tag" placeholder="Nova tag…" maxLength={30} value={name} onChange={(event) => setName(event.target.value)} />
          <Button type="submit" size="sm" disabled={!name.trim()} loading={busy}>
            Adicionar
          </Button>
        </AddRow>
      </Rows>
    </>
  );
}

/** Configurações da gestão de tarefas: colunas (estágios) de cada projeto e tags. */
export function SettingsModal({
  projects,
  tags,
  initialProjectId,
  onClose,
  onChanged,
}: {
  projects: TaskProject[];
  tags: TaskTag[];
  initialProjectId?: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [tab, setTab] = useState<'stages' | 'tags'>('stages');
  return (
    <Modal open onClose={onClose} title="Configurações de tarefas" width="680px">
      <Tabs
        tabs={[
          { key: 'stages', label: 'Estágios' },
          { key: 'tags', label: 'Tags', count: tags.length },
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === 'stages' ? (
        <StagesTab projects={projects} initialProjectId={initialProjectId} onChanged={onChanged} />
      ) : (
        <TagsTab tags={tags} onChanged={onChanged} />
      )}
    </Modal>
  );
}
