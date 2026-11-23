import { useState } from 'react';
import styled from 'styled-components';
import { Copy, FilePlus2, MessageSquarePlus, Sparkles } from 'lucide-react';
import { useFetch } from '../../hooks/useFetch';
import { Button } from '../ui/Button';
import { StatusPill } from '../admin/AdminUI';
import { SelectField, TextArea, TextField } from '../ui/Form';
import { useToast } from '../ui/Toast';
import { RichTextView } from './RichText';
import {
  COPY_FORMAT_OPTIONS,
  generateTaskAiCopy,
  markdownPreviewToHtml,
  MODEL_TIER_OPTIONS,
} from '../../lib/clientAi';
import type {
  AiGenerationLog,
  AiModelTier,
  CopyFormat,
} from '../../lib/clientAi';
import { formatDateTime } from '../../lib/format';
import type { Task } from '../../lib/tasks';
import { errorMessage } from '../../lib/validation';

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.15rem;
`;

const ContextBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.5rem;
  padding: 0.75rem 0.9rem;
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.colors.background};
  border: 1px solid ${({ theme }) => theme.colors.border};
  font-size: 0.85rem;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    grid-template-columns: 1fr;
  }
`;

const OutputBox = styled.div`
  padding: 1rem;
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.colors.background};
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  display: flex;
  flex-direction: column;
  gap: 0.85rem;

  .head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    flex-wrap: wrap;
    font-size: 0.8rem;
    color: ${({ theme }) => theme.colors.textMuted};
    border-bottom: 1px solid ${({ theme }) => theme.colors.border};
    padding-bottom: 0.5rem;
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    padding-top: 0.5rem;
    border-top: 1px solid ${({ theme }) => theme.colors.border};
  }
`;

const HistoryItem = styled.button`
  text-align: left;
  width: 100%;
  padding: 0.7rem 0.85rem;
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.colors.background};
  border: 1px solid ${({ theme }) => theme.colors.border};
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  transition: border-color ${({ theme }) => theme.transitions.fast};

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
  }
  .meta {
    display: flex;
    justify-content: space-between;
    font-size: 0.75rem;
    color: ${({ theme }) => theme.colors.textMuted};
  }
  .title {
    font-size: 0.85rem;
    font-weight: 700;
  }
`;

interface Props {
  task: Task;
  canManageAi: boolean;
  canEditTask: boolean;
  canCommentTask: boolean;
  onApplyDescription: (html: string, mode: 'replace' | 'append') => Promise<void>;
  onAddComment: (html: string) => Promise<void>;
}

export function TaskAiPanel({
  task,
  canManageAi,
  canEditTask,
  canCommentTask,
  onApplyDescription,
  onAddComment,
}: Props) {
  const toast = useToast();
  const [format, setFormat] = useState<CopyFormat>('INSTAGRAM_POST');
  const [variations, setVariations] = useState('1');
  const [modelTier, setModelTier] = useState<AiModelTier>('fast');
  const [objective, setObjective] = useState('');
  const [extraInstructions, setExtraInstructions] = useState('');

  const [generating, setGenerating] = useState(false);
  const [applying, setApplying] = useState(false);
  const [result, setResult] = useState<{
    markdown: string;
    html: string;
    model: string;
  } | null>(null);
  const { data: fetchedHistory, reload: reloadHistory } = useFetch<AiGenerationLog[]>(
    `/admin/ai-studio/tasks/${task.id}/history`,
  );
  const history = fetchedHistory ?? [];

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    try {
      const res = await generateTaskAiCopy(task.id, {
        format,
        variations: Number(variations) || 1,
        objective: objective.trim() || undefined,
        extraInstructions: extraInstructions.trim() || undefined,
        modelTier,
      });
      setResult({
        markdown: res.markdown,
        html: res.html,
        model: res.model,
      });
      reloadHistory();
      toast.success('Conteúdo gerado com Gemini!');
    } catch (err) {
      toast.error(errorMessage(err, 'Erro ao gerar conteúdo com a IA.'));
    } finally {
      setGenerating(false);
    }
  };

  const copyMarkdown = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result.markdown);
    toast.success('Texto copiado para a área de transferência!');
  };

  const apply = async (mode: 'replace' | 'append' | 'comment') => {
    if (!result) return;
    setApplying(true);
    try {
      if (mode === 'comment') {
        await onAddComment(result.html);
      } else {
        await onApplyDescription(result.html, mode);
      }
    } finally {
      setApplying(false);
    }
  };

  const clientName = task.project.client?.tradeName;

  return (
    <Wrap>
      <ContextBar>
        <div>
          <strong>Contexto ativo:</strong>{' '}
          {clientName ? (
            <>Cliente <strong>{clientName}</strong> (Brand Book + Concorrentes + Tarefa)</>
          ) : (
            <>Projeto interno (sem cliente vinculado — usando título, descrição e comentários)</>
          )}
        </div>
        <StatusPill tone={clientName ? 'success' : 'neutral'}>
          {clientName ? 'Marca conectada' : 'Sem cliente'}
        </StatusPill>
      </ContextBar>

      {canManageAi && (
        <form onSubmit={handleGenerate} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <Grid>
            <SelectField
              label="Formato de entrega"
              value={format}
              onChange={(e) => setFormat(e.target.value as CopyFormat)}
              options={COPY_FORMAT_OPTIONS}
            />
            <SelectField
              label="Variações"
              value={variations}
              onChange={(e) => setVariations(e.target.value)}
              options={[
                { value: '1', label: '1 opção completa' },
                { value: '2', label: '2 variações' },
                { value: '3', label: '3 variações' },
              ]}
            />
          </Grid>

          <Grid>
            <TextField
              label="Objetivo"
              placeholder="Ex: Gerar salvamentos, levar para o WhatsApp, vender curso..."
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
            />
            <SelectField
              label="Motor Gemini"
              value={modelTier}
              onChange={(e) => setModelTier(e.target.value as AiModelTier)}
              options={MODEL_TIER_OPTIONS}
            />
          </Grid>

          <TextArea
            label="Instruções extras"
            rows={2}
            placeholder="Ex: Focar na objeção de preço, citar promoção válida até sexta..."
            value={extraInstructions}
            onChange={(e) => setExtraInstructions(e.target.value)}
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button type="submit" loading={generating}>
              <Sparkles size={15} /> Gerar com IA
            </Button>
          </div>
        </form>
      )}

      {result && (
        <OutputBox>
          <div className="head">
            <strong>Resultado gerado</strong>
            <span>Modelo: {result.model}</span>
          </div>
          <RichTextView html={result.html} />
          <div className="actions">
            <Button type="button" size="sm" variant="secondary" onClick={() => void copyMarkdown()}>
              <Copy size={14} /> Copiar
            </Button>
            {canEditTask && (
              <>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  loading={applying}
                  onClick={() => void apply('append')}
                >
                  <FilePlus2 size={14} /> Anexar na descrição
                </Button>
                <Button
                  type="button"
                  size="sm"
                  loading={applying}
                  onClick={() => void apply('replace')}
                >
                  Substituir descrição
                </Button>
              </>
            )}
            {canCommentTask && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                loading={applying}
                onClick={() => void apply('comment')}
              >
                <MessageSquarePlus size={14} /> Salvar como comentário
              </Button>
            )}
          </div>
        </OutputBox>
      )}

      {history.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <strong style={{ fontSize: '0.82rem', color: 'inherit' }}>
            Gerações anteriores desta tarefa
          </strong>
          {history.slice(0, 5).map((item) => (
            <HistoryItem
              key={item.id}
              type="button"
              onClick={() =>
                setResult({
                  markdown: item.output,
                  html: markdownPreviewToHtml(item.output),
                  model: item.model,
                })
              }
            >
              <div className="meta">
                <span>{item.user?.name ?? 'Equipe'} · {item.model}</span>
                <span>{formatDateTime(item.createdAt)}</span>
              </div>
              <span className="title">{item.title || item.kind}</span>
            </HistoryItem>
          ))}
        </div>
      )}
    </Wrap>
  );
}
