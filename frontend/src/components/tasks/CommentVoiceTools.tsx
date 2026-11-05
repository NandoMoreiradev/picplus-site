import { useEffect, useMemo, useState } from 'react';
import styled, { keyframes } from 'styled-components';
import type { Editor } from '@tiptap/react';
import { Mic, Sparkles, Square, Trash2, Wand2 } from 'lucide-react';
import { useAudioRecorder } from '../../hooks/useAudioRecorder';
import type { RecordedClip } from '../../hooks/useAudioRecorder';
import { api } from '../../lib/api';
import { canRecordAudio, formatClock, toWav16k } from '../../lib/audio';
import { errorMessage } from '../../lib/validation';
import { Button } from '../ui/Button';
import { useToast } from '../ui/Toast';
import { plainTextToHtml } from './RichText';

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.35; }
`;

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.6rem;

  .tools {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
  }
  .rec {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 800;
    font-size: 0.9rem;
    color: ${({ theme }) => theme.colors.danger};
  }
  .dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: currentColor;
    animation: ${pulse} 1s ease-in-out infinite;
  }
  .hint {
    font-size: 0.8rem;
    color: ${({ theme }) => theme.colors.textMuted};
  }
  .error {
    font-size: 0.82rem;
    color: ${({ theme }) => theme.colors.danger};
  }
`;

const Clip = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  padding: 0.75rem;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.colors.surface};

  audio {
    width: 100%;
    height: 38px;
  }
  .row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
  }
  label {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.82rem;
    color: ${({ theme }) => theme.colors.textSecondary};
    cursor: pointer;
  }
  .spacer {
    flex: 1;
  }
`;

/**
 * Ferramentas de voz e IA do compositor de comentários:
 * grava o áudio, transcreve com o Gemini (o texto entra no editor para revisão),
 * melhora o texto e permite anexar o arquivo do áudio ao comentário.
 */
export function CommentVoiceTools({
  editor,
  hasText,
  clip,
  onClip,
  keepAudio,
  onKeepAudio,
  disabled,
}: {
  editor: Editor | null;
  hasText: boolean;
  clip: RecordedClip | null;
  onClip: (clip: RecordedClip | null) => void;
  /** Anexar o arquivo do áudio ao comentário ao enviar. */
  keepAudio: boolean;
  onKeepAudio: (keep: boolean) => void;
  disabled?: boolean;
}) {
  const toast = useToast();
  const recorder = useAudioRecorder(onClip);
  const [transcribing, setTranscribing] = useState(false);
  const [improving, setImproving] = useState(false);
  const [transcribed, setTranscribed] = useState(false);

  const previewUrl = useMemo(() => (clip ? URL.createObjectURL(clip.blob) : null), [clip]);
  useEffect(() => () => (previewUrl ? URL.revokeObjectURL(previewUrl) : undefined), [previewUrl]);

  const busy = transcribing || improving;

  const transcribe = async () => {
    if (!clip || !editor || busy) return;
    setTranscribing(true);
    try {
      const wav = await toWav16k(clip.blob);
      const form = new FormData();
      form.append('file', wav, 'voz.wav');
      const { text } = await api.postForm<{ text: string }>('/admin/tasks/ai/transcribe', form);
      if (!text) {
        toast.error('Não identificamos fala no áudio.');
        return;
      }
      const chain = editor.chain().focus('end');
      // Se já existe texto, a transcrição entra como um novo parágrafo.
      chain.insertContent(plainTextToHtml(text)).run();
      setTranscribed(true);
      toast.success('Transcrição inserida. Revise o texto antes de enviar.');
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setTranscribing(false);
    }
  };

  const improve = async () => {
    if (!editor || busy) return;
    const text = editor.getText({ blockSeparator: '\n\n' }).trim();
    if (!text) return;
    setImproving(true);
    try {
      const result = await api.post<{ text: string }>('/admin/tasks/ai/improve', { text });
      editor.chain().focus().setContent(plainTextToHtml(result.text), true).run();
      setTranscribed(false);
      toast.success('Texto melhorado. Ctrl + Z desfaz.');
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setImproving(false);
    }
  };

  const discard = () => {
    onClip(null);
    setTranscribed(false);
  };

  const canRecord = canRecordAudio();

  return (
    <Wrap>
      <div className="tools">
        {recorder.recording ? (
          <>
            <span className="rec" role="status">
              <span className="dot" aria-hidden /> Gravando {formatClock(recorder.seconds)}
            </span>
            <Button size="sm" variant="secondary" onClick={recorder.stop}>
              <Square size={14} aria-hidden /> Parar
            </Button>
          </>
        ) : (
          <>
            {canRecord && !clip && (
              <Button size="sm" variant="secondary" onClick={() => void recorder.start()} disabled={disabled}>
                <Mic size={15} aria-hidden /> Gravar áudio
              </Button>
            )}
            {hasText && (
              <Button
                size="sm"
                variant={transcribed ? 'primary' : 'secondary'}
                onClick={() => void improve()}
                loading={improving}
                disabled={disabled || transcribing}
                title="Revisa e organiza o texto com IA (Gemini)"
              >
                {!improving && <Wand2 size={15} aria-hidden />} Melhorar texto
              </Button>
            )}
          </>
        )}
      </div>
      {recorder.error && <p className="error">{recorder.error}</p>}

      {clip && previewUrl && !recorder.recording && (
        <Clip>
          <audio controls src={previewUrl} />
          <div className="row">
            <Button size="sm" onClick={() => void transcribe()} loading={transcribing} disabled={disabled || improving}>
              {!transcribing && <Sparkles size={15} aria-hidden />} Transcrever
            </Button>
            <label>
              <input type="checkbox" checked={keepAudio} onChange={(event) => onKeepAudio(event.target.checked)} />
              Anexar o áudio ao comentário ({formatClock(clip.duration)})
            </label>
            <span className="spacer" />
            <Button size="sm" variant="ghost" onClick={discard} disabled={busy}>
              <Trash2 size={14} aria-hidden /> Descartar
            </Button>
          </div>
        </Clip>
      )}
    </Wrap>
  );
}
