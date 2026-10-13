import { useRef, useState } from 'react';
import styled from 'styled-components';
import { FileText, Film, Paperclip, Trash2, UploadCloud } from 'lucide-react';
import { useFetch } from '../../hooks/useFetch';
import { api, assetUrl } from '../../lib/api';
import { formatBytes, formatDateTime } from '../../lib/format';
import type { TaskAttachment } from '../../lib/tasks';
import { errorMessage } from '../../lib/validation';
import { IconButton } from '../admin/AdminUI';
import { EmptyState, ErrorState, Skeleton, Spinner } from '../ui/Feedback';
import { ConfirmDialog } from '../ui/Modal';
import { useToast } from '../ui/Toast';

const Drop = styled.div<{ $over: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
  padding: 1.4rem 1rem;
  text-align: center;
  border: 2px dashed ${({ $over, theme }) => ($over ? theme.colors.primary : theme.colors.borderStrong)};
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ $over, theme }) => ($over ? theme.colors.primarySoft : 'transparent')};
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 0.9rem;
  transition: all ${({ theme }) => theme.transitions.fast};

  button.pick {
    color: ${({ theme }) => theme.colors.primary};
    font-weight: 800;
  }
  small {
    color: ${({ theme }) => theme.colors.textMuted};
  }
`;

const List = styled.ul`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 1rem;
`;

const Item = styled.li`
  display: flex;
  align-items: center;
  gap: 0.8rem;
  padding: 0.6rem 0.8rem;
  background: ${({ theme }) => theme.colors.background};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};

  .thumb {
    flex-shrink: 0;
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    overflow: hidden;
    border-radius: ${({ theme }) => theme.radii.sm};
    background: ${({ theme }) => theme.colors.surfaceHover};
    color: ${({ theme }) => theme.colors.textSecondary};
  }
  .thumb img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .info {
    flex: 1;
    min-width: 0;
  }
  a {
    display: block;
    font-weight: 700;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  a:hover {
    color: ${({ theme }) => theme.colors.primary};
  }
  small {
    color: ${({ theme }) => theme.colors.textMuted};
    font-size: 0.78rem;
  }
`;

const iconFor = (type: string) => (type.startsWith('video/') ? Film : type === 'application/pdf' ? FileText : Paperclip);

export function TaskAttachments({
  taskId,
  canAttach,
  onChanged,
}: {
  taskId: string;
  canAttach: boolean;
  /** Avisa a tela para atualizar o contador de anexos da tarefa. */
  onChanged: () => void;
}) {
  const toast = useToast();
  const files = useFetch<TaskAttachment[]>(`/admin/tasks/${taskId}/attachments`);
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [uploading, setUploading] = useState(0);
  const [deleting, setDeleting] = useState<TaskAttachment | null>(null);
  const [removing, setRemoving] = useState(false);

  const upload = async (list: FileList | File[]) => {
    const picked = Array.from(list);
    if (!picked.length) return;
    setUploading((n) => n + picked.length);
    let sent = 0;
    for (const file of picked) {
      try {
        const form = new FormData();
        form.append('file', file);
        await api.postForm(`/admin/tasks/${taskId}/attachments`, form);
        sent += 1;
      } catch (error) {
        toast.error(`${file.name}: ${errorMessage(error)}`);
      } finally {
        setUploading((n) => n - 1);
      }
    }
    if (sent) {
      toast.success(sent === 1 ? 'Arquivo anexado.' : `${sent} arquivos anexados.`);
      files.reload();
      onChanged();
    }
  };

  const remove = async () => {
    if (!deleting) return;
    setRemoving(true);
    try {
      await api.delete(`/admin/tasks/attachments/${deleting.id}`);
      setDeleting(null);
      files.reload();
      onChanged();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setRemoving(false);
    }
  };

  const list = files.data ?? [];

  return (
    <div>
      {canAttach && (
        <Drop
          $over={over}
          onDragOver={(event) => {
            event.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(event) => {
            event.preventDefault();
            setOver(false);
            void upload(event.dataTransfer.files);
          }}
        >
          {uploading > 0 ? (
            <>
              <Spinner aria-hidden /> Enviando {uploading} {uploading === 1 ? 'arquivo' : 'arquivos'}…
            </>
          ) : (
            <>
              <UploadCloud size={26} aria-hidden />
              <span>
                Arraste arquivos aqui ou{' '}
                <button type="button" className="pick" onClick={() => input.current?.click()}>
                  escolha no computador
                </button>
              </span>
              <small>Imagens (até 5 MB), PDFs (até 10 MB) e vídeos (até 50 MB)</small>
            </>
          )}
          <input
            ref={input}
            type="file"
            multiple
            hidden
            accept="image/jpeg,image/png,image/webp,application/pdf,video/mp4,video/webm,video/quicktime"
            onChange={(event) => {
              if (event.target.files) void upload(event.target.files);
              event.target.value = '';
            }}
          />
        </Drop>
      )}

      {files.error ? (
        <ErrorState message={files.error.message} onRetry={files.reload} />
      ) : files.loading && !files.data ? (
        <Skeleton $h="90px" style={{ marginTop: '1rem' }} />
      ) : list.length === 0 ? (
        <EmptyState title="Nenhum anexo" description="Anexe briefings, artes, contratos ou vídeos de referência." />
      ) : (
        <List>
          {list.map((file) => {
            const Icon = iconFor(file.fileType);
            return (
              <Item key={file.id}>
                <span className="thumb">
                  {file.fileType.startsWith('image/') ? <img src={assetUrl(file.url)} alt="" loading="lazy" /> : <Icon size={20} aria-hidden />}
                </span>
                <div className="info">
                  <a href={assetUrl(file.url)} target="_blank" rel="noopener noreferrer" title={file.fileName}>
                    {file.fileName}
                  </a>
                  <small>
                    {formatBytes(file.fileSize)} · {file.uploadedBy ? `${file.uploadedBy.name}, ` : ''}
                    {formatDateTime(file.createdAt)}
                  </small>
                </div>
                {canAttach && (
                  <IconButton label={`Remover ${file.fileName}`} danger onClick={() => setDeleting(file)}>
                    <Trash2 size={17} />
                  </IconButton>
                )}
              </Item>
            );
          })}
        </List>
      )}

      <ConfirmDialog
        open={!!deleting}
        title="Remover anexo"
        confirmLabel="Remover"
        message={
          <>
            Remover <strong>{deleting?.fileName}</strong>? O arquivo é apagado do armazenamento.
          </>
        }
        loading={removing}
        onCancel={() => setDeleting(null)}
        onConfirm={() => void remove()}
      />
    </div>
  );
}
