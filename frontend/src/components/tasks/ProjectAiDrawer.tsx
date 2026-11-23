import { useState } from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { Copy, ExternalLink, ListPlus, Sparkles } from 'lucide-react';
import { useFetch } from '../../hooks/useFetch';
import { StatusPill, Tabs } from '../admin/AdminUI';
import { Button } from '../ui/Button';
import { SelectField, TextArea, TextField } from '../ui/Form';
import { Modal } from '../ui/Modal';
import { useToast } from '../ui/Toast';
import { CampaignPlannerTab } from './CampaignPlannerTab';
import { LandingPageStudio } from '../landing-pages/LandingPageStudio';
import { RichTextView } from './RichText';
import { api } from '../../lib/api';
import {
  markdownPreviewToHtml,
  MODEL_TIER_OPTIONS,
  PROJECT_ASSISTANT_OPTIONS,
  runProjectAiAssistant,
} from '../../lib/clientAi';
import type {
  AiGenerationLog,
  AiModelTier,
  ProjectAssistantAction,
} from '../../lib/clientAi';
import { formatDateTime } from '../../lib/format';
import type { Task, TaskProject, TaskUser } from '../../lib/tasks';
import { errorMessage } from '../../lib/validation';

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
`;

const Banner = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.75rem;
  padding: 0.9rem 1rem;
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.colors.background};
  border: 1px solid ${({ theme }) => theme.colors.border};
  font-size: 0.88rem;

  a {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    font-weight: 700;
    color: ${({ theme }) => theme.colors.primary};
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
    justify-content: space-between;
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
  padding: 0.75rem 0.9rem;
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.colors.background};
  border: 1px solid ${({ theme }) => theme.colors.border};
  display: flex;
  flex-direction: column;
  gap: 0.25rem;

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
    font-weight: 700;
    font-size: 0.88rem;
  }
`;

type DrawerTab = 'planner' | 'landing' | 'assistant';

interface Props {
  project: TaskProject;
  users: TaskUser[];
  canManageAi: boolean;
  canCreateTask: boolean;
  onClose: () => void;
  onTaskCreated: (task: Task) => void;
  onTasksPublished: (tasks: Task[]) => void;
  onOpenTask: (taskId: string) => void;
}

export function ProjectAiDrawer({
  project,
  users,
  canManageAi,
  canCreateTask,
  onClose,
  onTaskCreated,
  onTasksPublished,
  onOpenTask,
}: Props) {
  const toast = useToast();
  const [tab, setTab] = useState<DrawerTab>('planner');
  const [action, setAction] = useState<ProjectAssistantAction>('CONTENT_IDEAS');
  const [channel, setChannel] = useState('');
  const [modelTier, setModelTier] = useState<AiModelTier>('fast');
  const [prompt, setPrompt] = useState('');
  const [running, setRunning] = useState(false);
  const [creatingTask, setCreatingTask] = useState(false);

  const [result, setResult] = useState<{
    markdown: string;
    html: string;
    model: string;
    title: string;
  } | null>(null);
  const { data: fetchedHistory, reload: reloadHistory } = useFetch<AiGenerationLog[]>(
    `/admin/ai-studio/projects/${project.id}/history`,
  );
  const history = fetchedHistory ?? [];

  const handleRun = async (e: React.FormEvent) => {
    e.preventDefault();
    setRunning(true);
    try {
      const res = await runProjectAiAssistant(project.id, {
        action,
        channel: channel.trim() || undefined,
        prompt: prompt.trim() || undefined,
        modelTier,
      });
      setResult({
        markdown: res.markdown,
        html: res.html,
        model: res.model,
        title: res.log.title || `${project.name} — IA`,
      });
      reloadHistory();
      toast.success('Material gerado com sucesso!');
    } catch (err) {
      toast.error(errorMessage(err, 'Erro ao executar assistente de IA.'));
    } finally {
      setRunning(false);
    }
  };

  const handleCreateTask = async () => {
    if (!result) return;
    const firstStage = [...project.stages].sort((a, b) => a.order - b.order)[0];
    if (!firstStage) {
      toast.error('O projeto não possui estágios para criar a tarefa.');
      return;
    }
    setCreatingTask(true);
    try {
      const created = await api.post<Task>('/admin/tasks', {
        title: result.title.slice(0, 180),
        description: result.html,
        projectId: project.id,
        stageId: firstStage.id,
      });
      onTaskCreated(created);
      toast.success('Tarefa criada no quadro com o conteúdo da IA!');
    } catch (err) {
      toast.error(errorMessage(err, 'Não foi possível criar a tarefa.'));
    } finally {
      setCreatingTask(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      variant="drawer"
      width="940px"
      title={`Estúdio IA — ${project.name}`}
      description="Planeje campanhas mensais/trimestrais, gere copys e envie entregas direto para o Kanban e Calendário."
    >
      <Wrap>
        <Banner>
          <div>
            {project.client ? (
              <>
                <StatusPill tone="success">Cliente conectado</StatusPill>{' '}
                <strong style={{ marginLeft: '0.4rem' }}>
                  {project.client.tradeName}
                </strong>
              </>
            ) : (
              <>
                <StatusPill tone="warning">Sem cliente vinculado</StatusPill>{' '}
                <span style={{ marginLeft: '0.4rem' }}>
                  Vincule um cliente nas propriedades do projeto para usar o Brand Book.
                </span>
              </>
            )}
          </div>
          {project.client && (
            <Link to={`/admin/clientes/${project.client.id}`} onClick={onClose}>
              Abrir Inteligência do Cliente <ExternalLink size={14} />
            </Link>
          )}
        </Banner>

        <Tabs<DrawerTab>
          value={tab}
          onChange={setTab}
          tabs={[
            { key: 'planner', label: 'Planejador de Campanhas' },
            { key: 'landing', label: 'Landing Pages' },
            { key: 'assistant', label: 'Assistente Rápido' },
          ]}
        />

        {tab === 'planner' && (
          <CampaignPlannerTab
            project={project}
            users={users}
            canManageAi={canManageAi}
            canCreateTask={canCreateTask}
            onTasksPublished={onTasksPublished}
            onOpenTask={onOpenTask}
          />
        )}

        {tab === 'landing' && (
          <LandingPageStudio
            fixedProjectId={project.id}
            fixedClientId={project.clientId ?? null}
            canManage={canManageAi}
          />
        )}

        {tab === 'assistant' && (
          <>
            {canManageAi && (
          <form onSubmit={handleRun} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <SelectField
                label="O que deseja gerar?"
                value={action}
                onChange={(e) => setAction(e.target.value as ProjectAssistantAction)}
                options={PROJECT_ASSISTANT_OPTIONS}
              />
              <SelectField
                label="Motor Gemini"
                value={modelTier}
                onChange={(e) => setModelTier(e.target.value as AiModelTier)}
                options={MODEL_TIER_OPTIONS}
              />
            </div>

            <TextField
              label="Canal ou campanha foco"
              placeholder="Ex: Instagram Reels, Black Friday, Blog SEO..."
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
            />

            <TextArea
              label="Direcionamento / Pedido específico"
              rows={3}
              placeholder="Ex: Quero 8 ideias de reels para quebrar objeções de preço e gerar leads no WhatsApp..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button type="submit" loading={running}>
                <Sparkles size={15} /> Executar Assistente
              </Button>
            </div>
          </form>
        )}

        {result && (
          <OutputBox>
            <div className="head">
              <strong>{result.title}</strong>
              <span>Modelo: {result.model}</span>
            </div>
            <RichTextView html={result.html} />
            <div className="actions">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => {
                  void navigator.clipboard.writeText(result.markdown);
                  toast.success('Texto copiado!');
                }}
              >
                <Copy size={14} /> Copiar texto
              </Button>
              {canCreateTask && (
                <Button
                  type="button"
                  size="sm"
                  loading={creatingTask}
                  onClick={() => void handleCreateTask()}
                >
                  <ListPlus size={14} /> Criar tarefa com este conteúdo
                </Button>
              )}
            </div>
          </OutputBox>
        )}

        {history.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <strong style={{ fontSize: '0.85rem' }}>Histórico do Projeto</strong>
            {history.slice(0, 6).map((item) => (
              <HistoryItem
                key={item.id}
                type="button"
                onClick={() =>
                  setResult({
                    markdown: item.output,
                    html: markdownPreviewToHtml(item.output),
                    model: item.model,
                    title: item.title || 'Geração IA',
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
          </>
        )}
      </Wrap>
    </Modal>
  );
}
