import { useId, useState } from 'react';
import type { KeyboardEvent } from 'react';
import styled from 'styled-components';
import { X } from 'lucide-react';

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.45rem;

  label {
    font-size: 0.9rem;
    font-weight: 700;
  }
  .optional {
    margin-left: 0.4rem;
    color: ${({ theme }) => theme.colors.textMuted};
    font-weight: 400;
    font-size: 0.8rem;
  }
  .hint {
    color: ${({ theme }) => theme.colors.textMuted};
    font-size: 0.8rem;
  }
`;

const Field = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  padding: 0.55rem;
  background: ${({ theme }) => theme.colors.background};
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  border-radius: ${({ theme }) => theme.radii.md};

  &:focus-within {
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.primarySoft};
  }
  input {
    flex: 1;
    min-width: 160px;
    padding: 0.3rem 0.4rem;
    background: transparent;
    border: none;
    outline: none;
  }
`;

const Tag = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.25rem 0.4rem 0.25rem 0.7rem;
  border-radius: ${({ theme }) => theme.radii.pill};
  background: ${({ theme }) => theme.colors.primarySoft};
  color: ${({ theme }) => theme.colors.primary};
  font-size: 0.85rem;
  font-weight: 700;

  button {
    display: grid;
    place-items: center;
    width: 20px;
    height: 20px;
    border-radius: 50%;
  }
  button:hover {
    background: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.textDark};
  }
`;

/** Lista de textos curtos: Enter ou vírgula adiciona, Backspace remove o último. */
export function TagInput({
  label,
  value,
  onChange,
  placeholder = 'Digite e pressione Enter',
  hint,
  max = 12,
}: {
  label: string;
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  hint?: string;
  max?: number;
}) {
  const id = useId();
  const [draft, setDraft] = useState('');

  const add = () => {
    const text = draft.trim();
    if (text && !value.includes(text) && value.length < max) onChange([...value, text]);
    setDraft('');
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      add();
    } else if (event.key === 'Backspace' && !draft && value.length) {
      onChange(value.slice(0, -1));
    }
  };

  return (
    <Wrap>
      <label htmlFor={id}>
        {label}
        <span className="optional">(opcional)</span>
      </label>
      <Field>
        {value.map((tag) => (
          <Tag key={tag}>
            {tag}
            <button type="button" aria-label={`Remover ${tag}`} onClick={() => onChange(value.filter((t) => t !== tag))}>
              <X size={12} />
            </button>
          </Tag>
        ))}
        <input
          id={id}
          value={draft}
          placeholder={value.length ? '' : placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={add}
          disabled={value.length >= max}
        />
      </Field>
      {hint && <p className="hint">{hint}</p>}
    </Wrap>
  );
}
