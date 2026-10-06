import type { InputHTMLAttributes } from 'react';
import styled from 'styled-components';
import { Search, X } from 'lucide-react';

const Wrap = styled.div`
  position: relative;
  width: 100%;

  svg.lead {
    position: absolute;
    left: 1rem;
    top: 50%;
    transform: translateY(-50%);
    color: ${({ theme }) => theme.colors.textMuted};
    pointer-events: none;
  }
  input {
    width: 100%;
    padding: 0.8rem 2.75rem 0.8rem 2.9rem;
    background: ${({ theme }) => theme.colors.surface};
    border: 1px solid ${({ theme }) => theme.colors.borderStrong};
    border-radius: ${({ theme }) => theme.radii.pill};
    transition: all ${({ theme }) => theme.transitions.fast};
  }
  input::placeholder {
    color: ${({ theme }) => theme.colors.textMuted};
  }
  input:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.primarySoft};
  }
  button {
    position: absolute;
    right: 0.6rem;
    top: 50%;
    transform: translateY(-50%);
    display: grid;
    place-items: center;
    width: 30px;
    height: 30px;
    border-radius: 50%;
    color: ${({ theme }) => theme.colors.textMuted};
  }
  button:hover {
    background: ${({ theme }) => theme.colors.surfaceHover};
    color: ${({ theme }) => theme.colors.text};
  }
`;

export function SearchInput({
  value,
  onChange,
  label = 'Buscar',
  ...rest
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> & {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}) {
  return (
    <Wrap>
      <Search className="lead" size={18} aria-hidden />
      <input
        type="search"
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        {...rest}
      />
      {value && (
        <button type="button" onClick={() => onChange('')} aria-label="Limpar busca">
          <X size={16} />
        </button>
      )}
    </Wrap>
  );
}
