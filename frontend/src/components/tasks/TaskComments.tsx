import { useState } from 'react';
import styled from 'styled-components';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CornerDownRight, Pencil, Trash2 } from 'lucide-react';
import { useFetch } from '../../hooks/useFetch';
import { api } from '../../lib/api';
import type { TaskComment } from '../../lib/tasks';
import { errorMessage } from '../../lib/validation';
import { useAuth } from '../../context/auth-context';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { EmptyState, ErrorState, Skeleton } from '../ui/Feedback';
import { ConfirmDialog } from '../ui/Modal';
import { useToast } from '../ui/Toast';
import { RichTextEditor, RichTextView, isEmptyHtml } from './RichText';

const Thread = styled.ul`
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
  margin-top: 1.25rem;
`;

const Replies = styled.ul`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 1rem;
  padding-left: 1rem;
  border-left: 2px solid ${({ theme }) => theme.colors.border};
`;

const Item = styled.li`
  display: flex;
  gap: 0.75rem;

  .body {
    flex: 1;
    min-width: 0;
  }
  .head {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0.5rem;
    margin-bottom: 0.25rem;
  }
  .head strong {
    font-weight: 800;
    font-size: 0.92rem;
  }
  .head span {
    font-size: 0.78rem;
    color: ${({ theme }) => theme.colors.textMuted};
  }
  .removed {
    font-style: italic;
    color: ${({ theme }) => theme.colors.textMuted};
    font-size: 0.9rem;
  }
  .actions {
    display: flex;
    gap: 0.9rem;
    margin-top: 0.35rem;
  }
  .actions button {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    font-size: 0.78rem;
    font-weight: 700;
    color: ${({ theme }) => theme.colors.textSecondary};
  }
  .actions button:hover {
    color: ${({ theme }) => theme.colors.primary};
  }
  .actions button.danger:hover {
    color: ${({ theme }) => theme.colors.danger};
  }
`;

const Composer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  margin-top: 1rem;

  .row {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
  }
`;

const ago = (iso: string) => formatDistanceToNow(new Date(iso), { addSuffix: true, locale: ptBR });

function Editor({
  label,
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  label: string;
  initial?: string;
  submitLabel: string;
  onSubmit: (html: string) => Promise<boolean>;
  onCancel?: () => void;
}) {
  const [html, setHtml] = useState(initial ?? '');
  const [saving, setSaving] = useState(false);
  // Trocar a key limpa o editor (ele é "não controlado") depois de enviar.
  const [version, setVersion] = useState(0);

  const send = async () => {
    if (isEmptyHtml(html) || saving) return;
    setSaving(true);
    const ok = await onSubmit(html);
    setSaving(false);
    if (ok && initial === undefined) {
      setHtml('');
      setVersion((v) => v + 1);
    }
  };

  return (
    <Composer>
      <RichTextEditor key={version} label={label} compact autoFocus={initial !== undefined} initialValue={initial} onChange={setHtml} onSubmit={() => void send()} placeholder="Escreva um comentário… (Ctrl + Enter envia)" />
      <div className="row">
        {onCancel && (
          <Button variant="ghost" size="sm" onClick={onCancel} disabled={saving}>
            Cancelar
          </Button>
        )}
        <Button size="sm" onClick={() => void send()} loading={saving} disabled={isEmptyHtml(html)}>
          {submitLabel}
        </Button>
      </div>
    </Composer>
  );
}

export function TaskComments({
  taskId,
  canComment,
  canModerate,
  onChanged,
}: {
  taskId: string;
  canComment: boolean;
  /** Pode excluir comentários de outras pessoas (permissão de excluir tarefas). */
  canModerate: boolean;
  /** Avisa a tela para atualizar o contador de comentários da tarefa. */
  onChanged: () => void;
}) {
  const { user } = useAuth();
  const toast = useToast();
  const comments = useFetch<TaskComment[]>(`/admin/tasks/${taskId}/comments`);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<TaskComment | null>(null);
  const [removing, setRemoving] = useState(false);

  const done = () => {
    comments.reload();
    onChanged();
  };

  const create = async (content: string, parentCommentId?: string) => {
    try {
      await api.post(`/admin/tasks/${taskId}/comments`, { content, parentCommentId });
      setReplyTo(null);
      done();
      return true;
    } catch (error) {
      toast.error(errorMessage(error));
      return false;
    }
  };

  const edit = async (id: string, content: string) => {
    try {
      await api.patch(`/admin/tasks/comments/${id}`, { content });
      setEditing(null);
      done();
      return true;
    } catch (error) {
      toast.error(errorMessage(error));
      return false;
    }
  };

  const remove = async () => {
    if (!deleting) return;
    setRemoving(true);
    try {
      await api.delete(`/admin/tasks/comments/${deleting.id}`);
      setDeleting(null);
      done();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setRemoving(false);
    }
  };

  const render = (comment: TaskComment, depth: number) => {
    const mine = comment.user?.id === user?.id;
    const removed = comment.isDeleted;
    return (
      <Item key={comment.id}>
        <Avatar key={comment.user?.avatarUrl ?? 'none'} src={comment.user?.avatarUrl} name={comment.user?.name ?? 'Usuário removido'} size={34} />
        <div className="body">
          <div className="head">
            <strong>{comment.user?.name ?? 'Usuário removido'}</strong>
            <span>
              {ago(comment.createdAt)}
              {comment.isEdited && !removed ? ' · editado' : ''}
            </span>
          </div>

          {removed ? (
            <p className="removed">Comentário removido.</p>
          ) : editing === comment.id ? (
            <Editor label="Editar comentário" initial={comment.content} submitLabel="Salvar" onSubmit={(html) => edit(comment.id, html)} onCancel={() => setEditing(null)} />
          ) : (
            <RichTextView html={comment.content} />
          )}

          {!removed && editing !== comment.id && (
            <div className="actions">
              {canComment && depth < 4 && (
                <button type="button" onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)}>
                  <CornerDownRight size={13} aria-hidden /> Responder
                </button>
              )}
              {canComment && mine && (
                <button type="button" onClick={() => setEditing(comment.id)}>
                  <Pencil size={13} aria-hidden /> Editar
                </button>
              )}
              {(mine || canModerate) && (
                <button type="button" className="danger" onClick={() => setDeleting(comment)}>
                  <Trash2 size={13} aria-hidden /> Excluir
                </button>
              )}
            </div>
          )}

          {replyTo === comment.id && (
            <Editor label="Responder ao comentário" initial="" submitLabel="Responder" onSubmit={(html) => create(html, comment.id)} onCancel={() => setReplyTo(null)} />
          )}

          {comment.replies.length > 0 && <Replies>{comment.replies.map((reply) => render(reply, depth + 1))}</Replies>}
        </div>
      </Item>
    );
  };

  return (
    <div>
      {canComment && <Editor label="Novo comentário" submitLabel="Comentar" onSubmit={(html) => create(html)} />}

      {comments.error ? (
        <ErrorState message={comments.error.message} onRetry={comments.reload} />
      ) : comments.loading && !comments.data ? (
        <Skeleton $h="120px" style={{ marginTop: '1.25rem' }} />
      ) : (comments.data ?? []).length === 0 ? (
        <EmptyState title="Nenhum comentário" description="Use os comentários para alinhar detalhes e registrar decisões." />
      ) : (
        <Thread>{(comments.data ?? []).map((comment) => render(comment, 0))}</Thread>
      )}

      <ConfirmDialog
        open={!!deleting}
        title="Excluir comentário"
        message="O comentário some da conversa. As respostas a ele continuam visíveis."
        loading={removing}
        onCancel={() => setDeleting(null)}
        onConfirm={() => void remove()}
      />
    </div>
  );
}
