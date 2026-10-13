import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { api } from '../../lib/api';
import { PRIORITIES, fromDateInput } from '../../lib/tasks';
import type { Task, TaskPriority, TaskProject, TaskTag, TaskUser } from '../../lib/tasks';
import { errorMessage } from '../../lib/validation';
import { FormStack } from '../admin/AdminUI';
import { Button } from '../ui/Button';
import { FieldShell, FormGrid, SelectField, TextField } from '../ui/Form';
import { Modal } from '../ui/Modal';
import { useToast } from '../ui/Toast';
import { RichTextEditor } from './RichText';
import { TagSelect } from './TagSelect';
import { MultiSelect } from './TaskUI';

export interface TaskDefaults {
  projectId?: string;
  stageId?: string;
  /** AAAA-MM-DD */
  dueDate?: string;
}

/** Formulário de nova tarefa. Para editar uma existente, abre-se o detalhe. */
export function CreateTaskModal({
  projects,
  tags,
  users,
  defaults,
  canCreateTags,
  onTagCreated,
  onClose,
  onCreated,
}: {
  projects: TaskProject[];
  tags: TaskTag[];
  users: TaskUser[];
  defaults: TaskDefaults;
  canCreateTags: boolean;
  onTagCreated: (tag: TaskTag) => void;
  onClose: () => void;
  onCreated: (task: Task) => void;
}) {
  const toast = useToast();
  const [title, setTitle] = useState('');
  const [projectId, setProjectId] = useState(defaults.projectId ?? projects[0]?.id ?? '');
  const [stageId, setStageId] = useState(defaults.stageId ?? '');
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM');
  const [assignedToId, setAssignedToId] = useState('');
  const [coAssigneeIds, setCoAssigneeIds] = useState<string[]>([]);
  const [startDate, setStartDate] = useState('');
  const [dueDate, setDueDate] = useState(defaults.dueDate ?? '');
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<{ title?: string; project?: string; due?: string }>({});
  const [saving, setSaving] = useState(false);

  const project = projects.find((item) => item.id === projectId);
  const stages = useMemo(() => [...(project?.stages ?? [])].sort((a, b) => a.order - b.order), [project]);
  // O estágio escolhido só vale se for do projeto atual; senão, o primeiro da fila.
  const effectiveStage = stages.some((stage) => stage.id === stageId) ? stageId : (stages[0]?.id ?? '');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const next: typeof errors = {};
    if (!title.trim()) next.title = 'Informe o título da tarefa.';
    if (!projectId) next.project = 'Escolha o projeto.';
    if (startDate && dueDate && dueDate < startDate) next.due = 'O prazo não pode ser antes do início.';
    setErrors(next);
    if (Object.keys(next).length) return;

    setSaving(true);
    try {
      const task = await api.post<Task>('/admin/tasks', {
        title: title.trim(),
        projectId,
        stageId: effectiveStage || undefined,
        priority,
        assignedToId: assignedToId || null,
        coAssigneeIds: coAssigneeIds.filter((id) => id !== assignedToId),
        tags: tagIds,
        startDate: fromDateInput(startDate),
        dueDate: fromDateInput(dueDate),
        description: description || null,
      });
      toast.success('Tarefa criada.');
      onCreated(task);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Nova tarefa"
      width="720px"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" form="task-form" loading={saving}>
            Criar tarefa
          </Button>
        </>
      }
    >
      <FormStack id="task-form" onSubmit={submit} noValidate>
        <TextField
          label="Título"
          required
          autoFocus
          maxLength={200}
          value={title}
          error={errors.title}
          placeholder="O que precisa ser feito?"
          onChange={(event) => setTitle(event.target.value)}
        />

        <FormGrid $cols={2}>
          <SelectField
            label="Projeto"
            required
            value={projectId}
            error={errors.project}
            placeholder="Escolha…"
            options={projects.map((item) => ({ value: item.id, label: item.name }))}
            onChange={(event) => setProjectId(event.target.value)}
          />
          <SelectField
            label="Estágio"
            required
            value={effectiveStage}
            disabled={!stages.length}
            options={stages.map((stage) => ({ value: stage.id, label: stage.name }))}
            onChange={(event) => setStageId(event.target.value)}
          />
          <SelectField
            label="Prioridade"
            required
            value={priority}
            options={PRIORITIES.map((item) => ({ value: item.value, label: item.label }))}
            onChange={(event) => setPriority(event.target.value as TaskPriority)}
          />
          <SelectField
            label="Responsável"
            value={assignedToId}
            placeholder="Sem responsável"
            options={users.map((user) => ({ value: user.id, label: user.name }))}
            onChange={(event) => setAssignedToId(event.target.value)}
          />
          <TextField label="Início" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
          <TextField label="Prazo" type="date" value={dueDate} min={startDate || undefined} error={errors.due} onChange={(event) => setDueDate(event.target.value)} />
        </FormGrid>

        <FormGrid $cols={2}>
          <FieldShell id="task-co" label="Colaboradores">
            <MultiSelect
              label="Colaboradores"
              placeholder="Ninguém"
              value={coAssigneeIds}
              onChange={setCoAssigneeIds}
              options={users.filter((user) => user.id !== assignedToId).map((user) => ({ value: user.id, label: user.name, person: true }))}
              renderValue={(selected) => selected.map((item) => item.label).join(', ')}
            />
          </FieldShell>
          <FieldShell id="task-tags" label="Tags">
            <TagSelect tags={tags} value={tagIds} onChange={setTagIds} onCreated={onTagCreated} canCreate={canCreateTags} />
          </FieldShell>
        </FormGrid>

        <FieldShell id="task-description" label="Descrição">
          <RichTextEditor label="Descrição da tarefa" placeholder="Detalhes, links, o que é “pronto”…" onChange={setDescription} />
        </FieldShell>
      </FormStack>
    </Modal>
  );
}
