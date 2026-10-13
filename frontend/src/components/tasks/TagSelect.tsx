import { useState } from 'react';
import styled from 'styled-components';
import { Plus } from 'lucide-react';
import { api } from '../../lib/api';
import { SWATCHES } from '../../lib/tasks';
import type { TaskTag } from '../../lib/tasks';
import { errorMessage } from '../../lib/validation';
import { useToast } from '../ui/Toast';
import { MultiSelect, TagChip } from './TaskUI';

const Create = styled.form`
  display: flex;
  gap: 0.4rem;
  margin-top: 0.3rem;
  padding: 0.5rem 0.3rem 0.2rem;
  border-top: 1px solid ${({ theme }) => theme.colors.border};

  input {
    flex: 1;
    min-width: 0;
    height: 34px;
    padding: 0 0.6rem;
    background: ${({ theme }) => theme.colors.background};
    color: ${({ theme }) => theme.colors.text};
    border: 1px solid ${({ theme }) => theme.colors.borderStrong};
    border-radius: ${({ theme }) => theme.radii.sm};
    font-size: 0.85rem;
  }
  input:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
  }
  button {
    display: grid;
    place-items: center;
    width: 34px;
    height: 34px;
    border-radius: ${({ theme }) => theme.radii.sm};
    background: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.textDark};
  }
  button:disabled {
    opacity: 0.4;
  }
`;

/** Escolha de tags com criação rápida de uma tag nova (para quem pode editar tarefas). */
export function TagSelect({
  tags,
  value,
  onChange,
  onCreated,
  canCreate,
  disabled,
}: {
  tags: TaskTag[];
  value: string[];
  onChange: (ids: string[]) => void;
  /** Avisa a tela para incluir a tag nova na lista. */
  onCreated: (tag: TaskTag) => void;
  canCreate: boolean;
  disabled?: boolean;
}) {
  const toast = useToast();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  const create = async () => {
    const clean = name.trim();
    if (!clean) return;
    setBusy(true);
    try {
      // Cor da paleta, em rodízio, para as tags novas não ficarem todas cinzas.
      const color = SWATCHES[(tags.length + 1) % (SWATCHES.length - 1)];
      const tag = await api.post<TaskTag>('/admin/tasks/tags', { name: clean, color });
      onCreated(tag);
      onChange([...value, tag.id]);
      setName('');
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <MultiSelect
      label="Tags"
      placeholder="Sem tags"
      emptyText="Nenhuma tag criada."
      disabled={disabled}
      value={value}
      onChange={onChange}
      options={tags.map((tag) => ({ value: tag.id, label: tag.name, color: tag.color }))}
      renderValue={(selected) =>
        selected.map((tag) => (
          <TagChip key={tag.value} $color={tag.color ?? '#737373'}>
            {tag.label}
          </TagChip>
        ))
      }
      footer={
        canCreate && (
          <Create
            onSubmit={(event) => {
              event.preventDefault();
              // O painel é um portal: sem isto o envio "sobe" para o formulário da tarefa.
              event.stopPropagation();
              void create();
            }}
          >
            <input aria-label="Nome da nova tag" placeholder="Nova tag…" maxLength={30} value={name} onChange={(event) => setName(event.target.value)} />
            <button type="submit" disabled={!name.trim() || busy} aria-label="Criar tag">
              <Plus size={16} aria-hidden />
            </button>
          </Create>
        )
      }
    />
  );
}
