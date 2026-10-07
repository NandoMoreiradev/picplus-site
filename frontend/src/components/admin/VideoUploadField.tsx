import { useId, useRef, useState } from 'react';
import styled from 'styled-components';
import { Film, RefreshCw, Trash2 } from 'lucide-react';
import { api, assetUrl, uploadVideo, withQuery } from '../../lib/api';
import { formatBytes } from '../../lib/format';
import { probeVideo } from '../../lib/video';
import type { VideoProbe } from '../../lib/video';
import { errorMessage } from '../../lib/validation';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Feedback';
import { useToast } from '../ui/Toast';

const MAX_BYTES = 50 * 1024 * 1024;
const ACCEPT = '.mp4,.webm,.mov,video/mp4,video/webm,video/quicktime';
const ALLOWED = /\.(mp4|webm|mov)$/i;

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.6rem;

  .title {
    font-size: 0.9rem;
    font-weight: 700;
  }
  .required {
    margin-left: 0.2rem;
    color: ${({ theme }) => theme.colors.primary};
  }
  .hint {
    color: ${({ theme }) => theme.colors.textMuted};
    font-size: 0.8rem;
  }
`;

const Drop = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  min-height: 140px;
  padding: 1rem;
  text-align: center;
  border: 2px dashed ${({ theme }) => theme.colors.borderStrong};
  border-radius: ${({ theme }) => theme.radii.lg};
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 0.9rem;
  transition: border-color ${({ theme }) => theme.transitions.fast};

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
  }
  strong {
    color: ${({ theme }) => theme.colors.text};
  }
  small {
    color: ${({ theme }) => theme.colors.textMuted};
  }
  input[type='file'] {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    opacity: 0;
    cursor: pointer;
  }
`;

const Progress = styled.div`
  width: min(320px, 90%);

  .bar {
    height: 8px;
    border-radius: 999px;
    background: ${({ theme }) => theme.colors.surfaceHover};
    overflow: hidden;
  }
  .fill {
    height: 100%;
    background: ${({ theme }) => theme.colors.primary};
    transition: width 0.2s ease;
  }
  p {
    margin-top: 0.5rem;
    font-weight: 700;
    color: ${({ theme }) => theme.colors.text};
  }
`;

const Preview = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0.75rem;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.colors.background};

  video {
    width: 100%;
    max-height: 280px;
    border-radius: ${({ theme }) => theme.radii.sm};
    background: #000;
  }
  .actions {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
`;

interface VideoUploadFieldProps {
  label: string;
  value: string | null;
  onChange: (url: string | null) => void;
  /** Chamado ao escolher o arquivo, com orientação e capa extraídas do próprio vídeo. */
  onProbe?: (probe: VideoProbe) => void;
  required?: boolean;
  hint?: string;
}

/**
 * Envio de vídeo para o painel: valida tipo e tamanho, mostra o progresso, pré-visualiza
 * e avisa se o navegador não conseguiu ler o arquivo. Arquivos enviados nesta sessão e
 * depois descartados são apagados do servidor.
 */
export function VideoUploadField({ label, value, onChange, onProbe, required, hint }: VideoUploadFieldProps) {
  const id = useId();
  const toast = useToast();
  const [progress, setProgress] = useState<number | null>(null);
  const [unreadable, setUnreadable] = useState(false);
  const sessionUploads = useRef(new Set<string>());

  const discard = (url?: string | null) => {
    if (url && sessionUploads.current.has(url)) {
      sessionUploads.current.delete(url);
      api.delete(withQuery('/admin/uploads', { url })).catch(() => undefined);
    }
  };

  const handleFile = async (file?: File) => {
    if (!file) return;
    if (!ALLOWED.test(file.name)) {
      toast.error('Formato não suportado. Envie um vídeo MP4, WebM ou MOV.');
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error(`O vídeo tem ${formatBytes(file.size)}. O limite é de 50 MB: comprima antes de enviar.`);
      return;
    }

    setProgress(0);
    setUnreadable(false);
    // Lê o vídeo localmente enquanto envia: orientação, capa e teste de compatibilidade.
    const probing = probeVideo(file).then((probe) => {
      setUnreadable(!probe.readable);
      onProbe?.(probe);
    });

    try {
      const url = await uploadVideo(file, setProgress);
      sessionUploads.current.add(url);
      discard(value);
      onChange(url);
    } catch (error) {
      toast.error(errorMessage(error, 'Não foi possível enviar o vídeo.'));
    } finally {
      await probing;
      setProgress(null);
    }
  };

  const uploading = progress !== null;
  const src = assetUrl(value);

  return (
    <Wrap>
      <label className="title" htmlFor={id}>
        {label}
        {required && (
          <span className="required" aria-hidden>
            *
          </span>
        )}
      </label>

      {uploading ? (
        <Drop role="status" aria-live="polite">
          <Progress>
            <div className="bar">
              <div className="fill" style={{ width: `${progress}%` }} />
            </div>
            <p>Enviando… {progress}%</p>
          </Progress>
          <small>Não feche esta janela até concluir.</small>
        </Drop>
      ) : value && src ? (
        <Preview>
          <video src={src} controls preload="metadata" playsInline />
          <div className="actions">
            <Button variant="secondary" size="sm" onClick={() => document.getElementById(id)?.click()}>
              <RefreshCw size={15} aria-hidden /> Trocar vídeo
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                discard(value);
                onChange(null);
                setUnreadable(false);
              }}
            >
              <Trash2 size={15} aria-hidden /> Remover
            </Button>
          </div>
        </Preview>
      ) : (
        <Drop as="label" htmlFor={id} style={{ cursor: 'pointer' }}>
          <Film size={28} aria-hidden />
          <span>
            <strong>Clique para enviar</strong> o vídeo
          </span>
          <small>MP4 (H.264), WebM ou MOV · até 50 MB</small>
        </Drop>
      )}

      {/* O input fica sempre montado (inclusive no estado "com vídeo") para "Trocar vídeo" funcionar. */}
      <input
        id={id}
        type="file"
        accept={ACCEPT}
        disabled={uploading}
        style={value || uploading ? { display: 'none' } : { position: 'absolute', opacity: 0, width: 1, height: 1 }}
        onChange={(event) => {
          void handleFile(event.target.files?.[0]);
          event.target.value = '';
        }}
      />

      {unreadable && (
        <Alert tone="warning">
          Este navegador não conseguiu ler o vídeo. Ele pode não tocar em todos os dispositivos. Exporte novamente em{' '}
          <strong>MP4 com codec H.264</strong> (evite HEVC/H.265) antes de publicar.
        </Alert>
      )}
      {hint && <p className="hint">{hint}</p>}
    </Wrap>
  );
}
