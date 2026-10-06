import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { DragEvent } from 'react';
import styled from 'styled-components';
import { FileText, ImagePlus, Trash2, UploadCloud } from 'lucide-react';
import { formatBytes } from '../../lib/format';

const Zone = styled.div<{ $drag: boolean; $invalid: boolean; $shape: 'square' | 'wide' | 'file' }>`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 0.75rem;
  min-height: ${({ $shape }) => ($shape === 'wide' ? '150px' : $shape === 'square' ? '150px' : '88px')};
  padding: 1rem;
  border: 2px dashed
    ${({ $drag, $invalid, theme }) =>
      $invalid ? theme.colors.danger : $drag ? theme.colors.primary : theme.colors.borderStrong};
  border-radius: ${({ theme }) => theme.radii.lg};
  background: ${({ $drag, theme }) => ($drag ? theme.colors.primarySoft : theme.colors.background)};
  color: ${({ theme }) => theme.colors.textSecondary};
  cursor: pointer;
  overflow: hidden;
  transition: all ${({ theme }) => theme.transitions.fast};

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
  }
  &:focus-within {
    box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.primarySoft};
  }

  .prompt {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.9rem;
  }
  .prompt strong {
    color: ${({ theme }) => theme.colors.text};
  }
  .prompt small {
    color: ${({ theme }) => theme.colors.textMuted};
  }
  input {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    opacity: 0;
    cursor: pointer;
  }
`;

const Preview = styled.img<{ $shape: 'square' | 'wide' }>`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const FileChip = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  text-align: left;
  font-size: 0.9rem;
  max-width: 100%;

  svg {
    color: ${({ theme }) => theme.colors.primary};
    flex-shrink: 0;
  }
  strong {
    display: block;
    color: ${({ theme }) => theme.colors.text};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

const RemoveButton = styled.button`
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.35rem 0.7rem;
  border-radius: ${({ theme }) => theme.radii.pill};
  background: rgba(0, 0, 0, 0.75);
  color: #fff;
  font-size: 0.8rem;
  font-weight: 700;

  &:hover {
    background: ${({ theme }) => theme.colors.danger};
  }
`;

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.45rem;

  label.title {
    font-size: 0.9rem;
    font-weight: 700;
  }
  .optional {
    color: ${({ theme }) => theme.colors.textMuted};
    font-weight: 400;
    font-size: 0.8rem;
    margin-left: 0.4rem;
  }
  .required {
    color: ${({ theme }) => theme.colors.primary};
    margin-left: 0.2rem;
  }
  .error {
    color: ${({ theme }) => theme.colors.danger};
    font-size: 0.82rem;
    font-weight: 600;
  }
  .hint {
    color: ${({ theme }) => theme.colors.textMuted};
    font-size: 0.8rem;
  }
`;

interface FilePickerProps {
  label: string;
  kind: 'image' | 'pdf';
  value: File | null;
  onChange: (file: File | null) => void;
  required?: boolean;
  error?: string;
  hint?: string;
  maxMB?: number;
  shape?: 'square' | 'wide';
}

const ACCEPT = { image: 'image/jpeg,image/png,image/webp', pdf: 'application/pdf' };

/** Seleção de arquivo com arrastar-e-soltar, pré-visualização e validação de tipo/tamanho no cliente. */
export function FilePicker({
  label,
  kind,
  value,
  onChange,
  required,
  error,
  hint,
  maxMB = kind === 'image' ? 5 : 10,
  shape = 'wide',
}: FilePickerProps) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [localError, setLocalError] = useState('');
  const previewUrl = useMemo(
    () => (value && kind === 'image' ? URL.createObjectURL(value) : null),
    [value, kind],
  );

  // Libera a URL temporária quando o arquivo muda ou o componente sai da tela.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const accept = (file: File | undefined) => {
    if (!file) return;
    const allowed = ACCEPT[kind].split(',');
    if (!allowed.includes(file.type)) {
      setLocalError(kind === 'image' ? 'Use uma imagem JPG, PNG ou WebP.' : 'Use um arquivo PDF.');
      return;
    }
    if (file.size > maxMB * 1024 * 1024) {
      setLocalError(`O arquivo tem ${formatBytes(file.size)}. O limite é ${maxMB} MB.`);
      return;
    }
    setLocalError('');
    onChange(file);
  };

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setDrag(false);
    accept(event.dataTransfer.files?.[0]);
  };

  const shownError = localError || error;
  const Icon = kind === 'image' ? ImagePlus : UploadCloud;

  return (
    <Wrap>
      <label className="title" htmlFor={id}>
        {label}
        {required ? (
          <span className="required" aria-hidden>
            *
          </span>
        ) : (
          <span className="optional">(opcional)</span>
        )}
      </label>
      <Zone
        $drag={drag}
        $invalid={!!shownError}
        $shape={kind === 'pdf' ? 'file' : shape}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
      >
        <input
          ref={inputRef}
          id={id}
          type="file"
          accept={ACCEPT[kind]}
          aria-invalid={!!shownError || undefined}
          onChange={(e) => {
            accept(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
        {previewUrl ? (
          <Preview src={previewUrl} alt="Pré-visualização" $shape={shape} />
        ) : value ? (
          <FileChip>
            <FileText size={28} />
            <div>
              <strong>{value.name}</strong>
              <small>{formatBytes(value.size)}</small>
            </div>
          </FileChip>
        ) : (
          <div className="prompt">
            <Icon size={26} aria-hidden />
            <span>
              <strong>Clique para enviar</strong> ou arraste o arquivo
            </span>
            <small>
              {kind === 'image' ? 'JPG, PNG ou WebP' : 'PDF'} · até {maxMB} MB
            </small>
          </div>
        )}
        {value && (
          <RemoveButton
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange(null);
            }}
            aria-label={`Remover ${label}`}
          >
            <Trash2 size={14} /> Remover
          </RemoveButton>
        )}
      </Zone>
      {shownError ? (
        <p className="error" role="alert">
          {shownError}
        </p>
      ) : (
        hint && <p className="hint">{hint}</p>
      )}
    </Wrap>
  );
}
