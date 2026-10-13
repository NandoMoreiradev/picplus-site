import { useState } from 'react';
import type { FormEvent } from 'react';
import { api } from '../../lib/api';
import { PROJECT_STATUSES, fromDateInput, toDateInput } from '../../lib/tasks';
import type { ProjectStatus, TaskProject } from '../../lib/tasks';
import { errorMessage } from '../../lib/validation';
import { FormStack } from '../admin/AdminUI';
import { Button } from '../ui/Button';
import { FieldShell, FormGrid, SelectField, TextArea, TextField } from '../ui/Form';
import { Modal } from '../ui/Modal';
import { useToast } from '../ui/Toast';
import { ColorPicker } from './TaskUI';

/** Criar ou editar um projeto. Projeto novo já nasce com os estágios padrão. */
export function ProjectModal({
  project,
  onClose,
  onSaved,
}: {
  /** Projeto a editar; `null` cria um novo. */
  project: TaskProject | null;
  onClose: () => void;
  onSaved: (project: TaskProject) => void;
}) {
  const toast = useToast();
  const [name, setName] = useState(project?.name ?? '');
  const [description, setDescription] = useState(project?.description ?? '');
  const [color, setColor] = useState(project?.color ?? '#B6E829');
  const [status, setStatus] = useState<ProjectStatus>(project?.status ?? 'ACTIVE');
  const [startDate, setStartDate] = useState(toDateInput(project?.startDate));
  const [endDate, setEndDate] = useState(toDateInput(project?.endDate));
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; end?: string }>({});

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const next: typeof errors = {};
    if (name.trim().length < 2) next.name = 'O nome deve ter ao menos 2 caracteres.';
    if (startDate && endDate && endDate < startDate) next.end = 'O fim não pode ser antes do início.';
    setErrors(next);
    if (next.name || next.end) return;
    setSaving(true);
    const body = {
      name: name.trim(),
      description: description.trim() || null,
      color,
      status,
      startDate: fromDateInput(startDate),
      endDate: fromDateInput(endDate),
    };
    try {
      const saved = project
        ? await api.patch<TaskProject>(`/admin/tasks/projects/${project.id}`, body)
        : await api.post<TaskProject>('/admin/tasks/projects', body);
      toast.success(project ? 'Projeto atualizado.' : 'Projeto criado.');
      onSaved(saved);
    } catch (cause) {
      toast.error(errorMessage(cause));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={project ? 'Editar projeto' : 'Novo projeto'}
      description={project ? undefined : 'Começa com as colunas "A fazer", "Em andamento" e "Concluído". Dá para mudá-las depois.'}
      width="560px"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" form="project-form" loading={saving}>
            {project ? 'Salvar' : 'Criar projeto'}
          </Button>
        </>
      }
    >
      <FormStack id="project-form" onSubmit={submit} noValidate>
        <TextField
          label="Nome"
          required
          value={name}
          maxLength={80}
          autoFocus
          error={errors.name}
          onChange={(event) => setName(event.target.value)}
        />
        <TextArea label="Descrição" value={description} maxLength={2000} onChange={(event) => setDescription(event.target.value)} />
        <FieldShell id="project-color" label="Cor" required>
          <ColorPicker label="Cor do projeto" value={color} onChange={setColor} />
        </FieldShell>
        <SelectField
          label="Situação"
          required
          value={status}
          options={PROJECT_STATUSES}
          onChange={(event) => setStatus(event.target.value as ProjectStatus)}
        />
        <FormGrid $cols={2}>
          <TextField label="Início" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
          <TextField
            label="Fim"
            type="date"
            value={endDate}
            min={startDate || undefined}
            error={errors.end}
            onChange={(event) => setEndDate(event.target.value)}
          />
        </FormGrid>
      </FormStack>
    </Modal>
  );
}
