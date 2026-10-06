import { useId } from 'react';
import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';
import styled, { css } from 'styled-components';

/* ── Casca comum: label + controle + dica/erro ───────── */

const FieldWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  min-width: 0;
`;

const Label = styled.label`
  font-size: 0.9rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text};

  .required {
    color: ${({ theme }) => theme.colors.primary};
    margin-left: 0.2rem;
  }
  .optional {
    color: ${({ theme }) => theme.colors.textMuted};
    font-weight: 400;
    margin-left: 0.4rem;
    font-size: 0.8rem;
  }
`;

const Hint = styled.p`
  font-size: 0.8rem;
  color: ${({ theme }) => theme.colors.textMuted};
`;

const ErrorText = styled.p`
  font-size: 0.82rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.danger};
`;

interface BaseProps {
  label: string;
  error?: string;
  hint?: string;
}

export function FieldShell({
  id,
  label,
  error,
  hint,
  required,
  children,
}: BaseProps & { id: string; required?: boolean; children: ReactNode }) {
  return (
    <FieldWrap>
      <Label htmlFor={id}>
        {label}
        {required ? (
          <span className="required" aria-hidden>
            *
          </span>
        ) : (
          <span className="optional">(opcional)</span>
        )}
      </Label>
      {children}
      {error ? (
        <ErrorText id={`${id}-error`} role="alert">
          {error}
        </ErrorText>
      ) : (
        hint && <Hint id={`${id}-hint`}>{hint}</Hint>
      )}
    </FieldWrap>
  );
}

const controlStyles = css<{ $invalid?: boolean }>`
  width: 100%;
  padding: 0.8rem 1rem;
  background: ${({ theme }) => theme.colors.background};
  border: 1px solid ${({ $invalid, theme }) => ($invalid ? theme.colors.danger : theme.colors.borderStrong)};
  border-radius: ${({ theme }) => theme.radii.md};
  color: ${({ theme }) => theme.colors.text};
  transition:
    border-color ${({ theme }) => theme.transitions.fast},
    box-shadow ${({ theme }) => theme.transitions.fast};

  &::placeholder {
    color: ${({ theme }) => theme.colors.textMuted};
  }
  &:hover:not(:disabled) {
    border-color: ${({ $invalid, theme }) => ($invalid ? theme.colors.danger : theme.colors.textMuted)};
  }
  &:focus {
    outline: none;
    border-color: ${({ $invalid, theme }) => ($invalid ? theme.colors.danger : theme.colors.primary)};
    box-shadow: 0 0 0 3px
      ${({ $invalid, theme }) => ($invalid ? theme.colors.dangerSoft : theme.colors.primarySoft)};
  }
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const Input = styled.input<{ $invalid?: boolean }>`
  ${controlStyles}
`;
const TextAreaEl = styled.textarea<{ $invalid?: boolean }>`
  ${controlStyles}
  resize: vertical;
  min-height: 120px;
  line-height: 1.55;
`;
const SelectEl = styled.select<{ $invalid?: boolean }>`
  ${controlStyles}
  appearance: none;
  padding-right: 2.5rem;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23a3a3a3' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.9rem center;
`;

const describedBy = (id: string, error?: string, hint?: string) =>
  error ? `${id}-error` : hint ? `${id}-hint` : undefined;

/* ── Campos ──────────────────────────────────────────── */

type TextFieldProps = BaseProps & Omit<InputHTMLAttributes<HTMLInputElement>, 'id'>;

export function TextField({ label, error, hint, required, ...rest }: TextFieldProps) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} error={error} hint={hint} required={required}>
      <Input
        id={id}
        required={required}
        $invalid={!!error}
        aria-invalid={!!error || undefined}
        aria-describedby={describedBy(id, error, hint)}
        {...rest}
      />
    </FieldShell>
  );
}

type TextAreaProps = BaseProps & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id'>;

export function TextArea({ label, error, hint, required, maxLength, value, ...rest }: TextAreaProps) {
  const id = useId();
  const length = typeof value === 'string' ? value.length : 0;
  return (
    <FieldShell
      id={id}
      label={label}
      error={error}
      hint={maxLength ? `${hint ? `${hint} · ` : ''}${length}/${maxLength}` : hint}
      required={required}
    >
      <TextAreaEl
        id={id}
        required={required}
        maxLength={maxLength}
        value={value}
        $invalid={!!error}
        aria-invalid={!!error || undefined}
        aria-describedby={describedBy(id, error, hint)}
        {...rest}
      />
    </FieldShell>
  );
}

type SelectFieldProps = BaseProps &
  Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id'> & {
    options: (string | { value: string; label: string })[];
    placeholder?: string;
  };

export function SelectField({
  label,
  error,
  hint,
  required,
  options,
  placeholder,
  ...rest
}: SelectFieldProps) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} error={error} hint={hint} required={required}>
      <SelectEl
        id={id}
        required={required}
        $invalid={!!error}
        aria-invalid={!!error || undefined}
        aria-describedby={describedBy(id, error, hint)}
        {...rest}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((option) => {
          const item = typeof option === 'string' ? { value: option, label: option } : option;
          return (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          );
        })}
      </SelectEl>
    </FieldShell>
  );
}

/* ── Checkbox e Switch ───────────────────────────────── */

const CheckLabel = styled.label`
  display: flex;
  align-items: flex-start;
  gap: 0.7rem;
  font-size: 0.92rem;
  color: ${({ theme }) => theme.colors.textSecondary};
  cursor: pointer;
  line-height: 1.5;

  input {
    appearance: none;
    flex-shrink: 0;
    width: 20px;
    height: 20px;
    margin-top: 2px;
    border: 1px solid ${({ theme }) => theme.colors.borderStrong};
    border-radius: 6px;
    background: ${({ theme }) => theme.colors.background};
    display: grid;
    place-content: center;
    cursor: pointer;
    transition: all ${({ theme }) => theme.transitions.fast};
  }
  input:hover {
    border-color: ${({ theme }) => theme.colors.primary};
  }
  input:checked {
    background: ${({ theme }) => theme.colors.primary};
    border-color: ${({ theme }) => theme.colors.primary};
  }
  input:checked::after {
    content: '';
    width: 5px;
    height: 10px;
    border: solid ${({ theme }) => theme.colors.textDark};
    border-width: 0 2px 2px 0;
    transform: rotate(45deg) translate(-1px, -1px);
  }
`;

export function CheckboxField({
  children,
  error,
  ...rest
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & { children: ReactNode; error?: string }) {
  return (
    <div>
      <CheckLabel>
        <input type="checkbox" aria-invalid={!!error || undefined} {...rest} />
        <span>{children}</span>
      </CheckLabel>
      {error && <ErrorText role="alert">{error}</ErrorText>}
    </div>
  );
}

const SwitchRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.85rem 1rem;
  background: ${({ theme }) => theme.colors.background};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};

  strong {
    display: block;
    font-size: 0.95rem;
  }
  small {
    color: ${({ theme }) => theme.colors.textMuted};
    font-size: 0.8rem;
  }
`;

const Track = styled.button<{ $on: boolean }>`
  position: relative;
  flex-shrink: 0;
  width: 44px;
  height: 26px;
  border-radius: 999px;
  background: ${({ $on, theme }) => ($on ? theme.colors.primary : theme.colors.borderStrong)};
  transition: background ${({ theme }) => theme.transitions.fast};

  &::after {
    content: '';
    position: absolute;
    top: 3px;
    left: ${({ $on }) => ($on ? '21px' : '3px')};
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: ${({ $on, theme }) => ($on ? theme.colors.textDark : '#fff')};
    transition: left ${({ theme }) => theme.transitions.fast};
  }
`;

export function Switch({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <SwitchRow>
      <div>
        <strong id={id}>{label}</strong>
        {description && <small>{description}</small>}
      </div>
      <Track
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={id}
        $on={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
      />
    </SwitchRow>
  );
}

/* ── Layout de formulário ────────────────────────────── */

export const FormGrid = styled.div<{ $cols?: number }>`
  display: grid;
  grid-template-columns: repeat(${({ $cols = 2 }) => $cols}, minmax(0, 1fr));
  gap: 1.25rem;

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    grid-template-columns: 1fr;
  }
`;

export const FormSection = styled.fieldset`
  border: none;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;

  legend {
    font-size: 1.1rem;
    font-weight: 800;
    margin-bottom: 0.25rem;
    padding: 0;
  }
  .legend-hint {
    color: ${({ theme }) => theme.colors.textMuted};
    font-size: 0.9rem;
    margin-top: -0.75rem;
  }
`;

/** Honeypot: invisível para pessoas, preenchido por bots. */
export const Honeypot = styled.input.attrs({
  type: 'text',
  name: 'website',
  tabIndex: -1,
  autoComplete: 'off',
  'aria-hidden': true,
})`
  position: absolute;
  left: -9999px;
  width: 1px;
  height: 1px;
  opacity: 0;
`;
