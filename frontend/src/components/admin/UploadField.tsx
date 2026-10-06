import { useId, useRef, useState } from 'react';
import styled from 'styled-components';
import { FileText, ImagePlus, Trash2, UploadCloud } from 'lucide-react';
import { api, assetUrl, withQuery } from '../../lib/api';
import { errorMessage } from '../../lib/validation';
import { Spinner } from '../ui/Feedback';
import { useToast } from '../ui/Toast';

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.45rem;

  .title {
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

const Box = styled.div<{ $shape: 'square' | 'wide' | 'logo' | 'file' }>`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  width: ${({ $shape }) => ($shape === 'square' ? '160px' : '100%')};
  min-height: ${({ $shape }) => ($shape === 'file' ? '64px' : $shape === 'wide' ? '150px' : '160px')};
  border: 2px dashed ${({ theme }) => theme.colors.borderStrong};
  border-radius: ${({ theme }) => theme.radii.lg};
  background: ${({ $shape, theme }) => ($shape === 'logo' ? '#f5f5f5' : theme.colors.background)};
  color: ${({ theme }) => theme.colors.textSecondary};
  overflow: hidden;
  transition: border-color ${({ theme }) => theme.transitions.fast};

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
  }
  input[type='file'] {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    opacity: 0;
    cursor: pointer;
  }
  img {
    width: 100%;
    height: 100%;
    max-height: 220px;
    object-fit: ${({ $shape }) => ($shape === 'logo' ? 'contain' : 'cover')};
    padding: ${({ $shape }) => ($shape === 'logo' ? '1rem' : '0')};
  }
  .prompt {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.3rem;
    font-size: 0.85rem;
    text-align: center;
    padding: 0.75rem;
  }
  .file {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0 1rem;
    font-size: 0.9rem;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .busy {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    background: rgba(0, 0, 0, 0.6);
    color: #fff;
    z-index: 3;
  }
  .remove {
    position: absolute;
    top: 0.45rem;
    right: 0.45rem;
    z-index: 4;
    display: grid;
    place-items: center;
    width: 30px;
    height: 30px;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.78);
    color: #fff;
  }
  .remove:hover {
    background: ${({ theme }) => theme.colors.danger};
  }
`;

interface UploadFieldProps {
  label: string;
  value: string | null | undefined;
  onChange: (url: string | null) => void;
  kind?: 'image' | 'pdf';
  shape?: 'square' | 'wide' | 'logo';
  required?: boolean;
  hint?: string;
}

/**
 * Upload imediato para o painel: envia o arquivo ao selecioná-lo e guarda só a URL.
 * Arquivos enviados nesta sessão e depois descartados são apagados do servidor.
 */
export function UploadField({
  label,
  value,
  onChange,
  kind = 'image',
  shape = 'wide',
  required,
  hint,
}: UploadFieldProps) {
  const id = useId();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const sessionUploads = useRef(new Set<string>());

  const discard = (url?: string | null) => {
    if (url && sessionUploads.current.has(url)) {
      sessionUploads.current.delete(url);
      api.delete(withQuery('/admin/uploads', { url })).catch(() => undefined);
    }
  };

  const handleFile = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    try {
      const url = await api.upload(file, kind);
      sessionUploads.current.add(url);
      discard(value);
      onChange(url);
    } catch (error) {
      toast.error(errorMessage(error, 'Não foi possível enviar o arquivo.'));
    } finally {
      setBusy(false);
    }
  };

  const url = assetUrl(value);
  const Icon = kind === 'pdf' ? UploadCloud : ImagePlus;

  return (
    <Wrap>
      <label className="title" htmlFor={id}>
        {label}
        {!required && <span className="optional">(opcional)</span>}
      </label>
      <Box $shape={kind === 'pdf' ? 'file' : shape}>
        <input
          id={id}
          type="file"
          accept={kind === 'image' ? 'image/jpeg,image/png,image/webp' : 'application/pdf'}
          disabled={busy}
          onChange={(event) => {
            void handleFile(event.target.files?.[0]);
            event.target.value = '';
          }}
        />
        {value && kind === 'image' && url ? (
          <img src={url} alt="" />
        ) : value && kind === 'pdf' ? (
          <span className="file">
            <FileText size={20} /> {value.split('/').pop()}
          </span>
        ) : (
          <span className="prompt">
            <Icon size={24} aria-hidden />
            Clique para enviar {kind === 'image' ? 'uma imagem' : 'um PDF'}
          </span>
        )}
        {value && !busy && (
          <button
            type="button"
            className="remove"
            aria-label={`Remover ${label}`}
            onClick={() => {
              discard(value);
              onChange(null);
            }}
          >
            <Trash2 size={14} />
          </button>
        )}
        {busy && (
          <div className="busy" role="status">
            <Spinner $size={26} />
          </div>
        )}
      </Box>
      {hint && <p className="hint">{hint}</p>}
    </Wrap>
  );
}
