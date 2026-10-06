import { useId, useRef, useState } from 'react';
import styled from 'styled-components';
import { ImagePlus, X } from 'lucide-react';
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

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
  gap: 0.6rem;
`;

const Thumb = styled.div`
  position: relative;
  aspect-ratio: 1;
  border-radius: ${({ theme }) => theme.radii.md};
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.colors.border};

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  button {
    position: absolute;
    top: 4px;
    right: 4px;
    display: grid;
    place-items: center;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.78);
    color: #fff;
  }
  button:hover {
    background: ${({ theme }) => theme.colors.danger};
  }
`;

const AddTile = styled.label`
  position: relative;
  aspect-ratio: 1;
  display: grid;
  place-items: center;
  gap: 0.2rem;
  border: 2px dashed ${({ theme }) => theme.colors.borderStrong};
  border-radius: ${({ theme }) => theme.radii.md};
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 0.78rem;
  text-align: center;
  cursor: pointer;
  transition: border-color ${({ theme }) => theme.transitions.fast};

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.primary};
  }
  input {
    position: absolute;
    inset: 0;
    opacity: 0;
    cursor: pointer;
  }
`;

/** Galeria de imagens com envio múltiplo imediato. */
export function GalleryField({
  label,
  value,
  onChange,
  max = 12,
  hint,
}: {
  label: string;
  value: string[];
  onChange: (urls: string[]) => void;
  max?: number;
  hint?: string;
}) {
  const id = useId();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const sessionUploads = useRef(new Set<string>());

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    const added: string[] = [];
    try {
      for (const file of Array.from(files).slice(0, max - value.length)) {
        const url = await api.upload(file, 'image');
        sessionUploads.current.add(url);
        added.push(url);
      }
    } catch (error) {
      toast.error(errorMessage(error, 'Não foi possível enviar uma das imagens.'));
    } finally {
      if (added.length) onChange([...value, ...added]);
      setBusy(false);
    }
  };

  const remove = (url: string) => {
    if (sessionUploads.current.has(url)) {
      sessionUploads.current.delete(url);
      api.delete(withQuery('/admin/uploads', { url })).catch(() => undefined);
    }
    onChange(value.filter((item) => item !== url));
  };

  return (
    <Wrap>
      <span className="title">
        {label}
        <span className="optional">(opcional)</span>
      </span>
      <Grid>
        {value.map((url) => (
          <Thumb key={url}>
            <img src={assetUrl(url)} alt="" />
            <button type="button" aria-label="Remover imagem" onClick={() => remove(url)}>
              <X size={13} />
            </button>
          </Thumb>
        ))}
        {value.length < max && (
          <AddTile htmlFor={id}>
            <input
              id={id}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp"
              disabled={busy}
              onChange={(event) => {
                void upload(event.target.files);
                event.target.value = '';
              }}
            />
            {busy ? <Spinner $size={22} /> : <ImagePlus size={22} aria-hidden />}
            {busy ? 'Enviando…' : 'Adicionar'}
          </AddTile>
        )}
      </Grid>
      {hint && <p className="hint">{hint}</p>}
    </Wrap>
  );
}
