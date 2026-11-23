import { useMemo, useState } from 'react';
import styled from 'styled-components';
import {
  ArrowLeft,
  CalendarPlus,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Plus,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { useFetch } from '../../hooks/useFetch';
import { StatusPill } from '../admin/AdminUI';
import { Button } from '../ui/Button';
import { EmptyState, ErrorState, PageLoader } from '../ui/Feedback';
import { SelectField, TextArea, TextField } from '../ui/Form';
import { ConfirmDialog } from '../ui/Modal';
import { useToast } from '../ui/Toast';
import {
  DEFAULT_PLAN_CHANNELS,
  deleteCampaignPlan,
  deleteCampaignPlanItem,
  generateCampaignPlan,
  MODEL_TIER_OPTIONS,
  PLAN_SCOPE_OPTIONS,
  publishCampaignPlan,
  updateCampaignPlanItem,
} from '../../lib/clientAi';
import type {
  AiModelTier,
  CampaignPlanDetail,
  CampaignPlanItem,
  CampaignPlanScope,
  CampaignPlanSummary,
} from '../../lib/clientAi';
import { formatDateOnly } from '../../lib/format';
import { toDateInput } from '../../lib/tasks';
import type { Task, TaskProject, TaskUser } from '../../lib/tasks';
import { errorMessage } from '../../lib/validation';

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.15rem;
`;

const PlanCard = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  padding: 0.95rem 1.05rem;
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.colors.background};
  border: 1px solid ${({ theme }) => theme.colors.border};

  .info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    min-width: 0;
  }
  .title {
    font-weight: 800;
    font-size: 0.96rem;
  }
  .meta {
    font-size: 0.8rem;
    color: ${({ theme }) => theme.colors.textMuted};
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    align-items: center;
  }
  .actions {
    display: flex;
    align-items: center;
    gap: 0.45rem;
  }
`;

const ChannelGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
`;

const ChannelChip = styled.button<{ $on: boolean }>`
  padding: 0.4rem 0.8rem;
  border-radius: ${({ theme }) => theme.radii.pill};
  font-size: 0.82rem;
  font-weight: 700;
  border: 1px solid
    ${({ $on, theme }) => ($on ? theme.colors.primary : theme.colors.borderStrong)};
  background: ${({ $on, theme }) =>
    $on ? theme.colors.primarySoft : theme.colors.background};
  color: ${({ $on, theme }) =>
    $on ? theme.colors.primary : theme.colors.textSecondary};
  transition: all ${({ theme }) => theme.transitions.fast};
`;

const SummaryBox = styled.div`
  padding: 1rem;
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.colors.background};
  border: 1px solid ${({ theme }) => theme.colors.border};
  display: flex;
  flex-direction: column;
  gap: 0.65rem;

  p {
    font-size: 0.88rem;
    line-height: 1.5;
    color: ${({ theme }) => theme.colors.textSecondary};
  }
  .pillars {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
  }
  .pillar {
    padding: 0.2rem 0.6rem;
    border-radius: ${({ theme }) => theme.radii.pill};
    background: ${({ theme }) => theme.colors.primarySoft};
    color: ${({ theme }) => theme.colors.primary};
    font-size: 0.78rem;
    font-weight: 700;
  }
`;

const PublishBar = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  gap: 0.75rem;
  align-items: end;
  padding: 0.95rem 1rem;
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.colors.primarySoft};
  border: 1px solid ${({ theme }) => theme.colors.border};

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    grid-template-columns: 1fr;
  }
`;

const ItemCard = styled.div`
  padding: 0.9rem 1rem;
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.colors.background};
  border: 1px solid ${({ theme }) => theme.colors.border};
  display: flex;
  flex-direction: column;
  gap: 0.6rem;

  .top {
    display: flex;
    align-items: flex-start;
    gap: 0.65rem;
  }
  .check {
    margin-top: 0.2rem;
    width: 17px;
    height: 17px;
    accent-color: ${({ theme }) => theme.colors.primary};
    cursor: pointer;
    flex-shrink: 0;
  }
  .main {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }
  .badges {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.76rem;
  }
  .tag {
    padding: 0.15rem 0.5rem;
    border-radius: ${({ theme }) => theme.radii.pill};
    background: ${({ theme }) => theme.colors.surfaceHover};
    color: ${({ theme }) => theme.colors.textSecondary};
    font-weight: 700;
  }
  .title-input {
    width: 100%;
    font-weight: 800;
    font-size: 0.94rem;
    background: transparent;
    border: 1px solid transparent;
    border-radius: ${({ theme }) => theme.radii.sm};
    padding: 0.2rem 0.35rem;
    margin-left: -0.35rem;
    color: ${({ theme }) => theme.colors.text};
  }
  .title-input:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
    background: ${({ theme }) => theme.colors.surface};
  }
  .controls {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    flex-shrink: 0;
  }
  input[type='date'] {
    height: 32px;
    padding: 0 0.5rem;
    border-radius: ${({ theme }) => theme.radii.sm};
    border: 1px solid ${({ theme }) => theme.colors.borderStrong};
    background: ${({ theme }) => theme.colors.surface};
    color: ${({ theme }) => theme.colors.text};
    font-size: 0.8rem;
  }
  .details {
    padding-top: 0.65rem;
    border-top: 1px solid ${({ theme }) => theme.colors.border};
    display: flex;
    flex-direction: column;
    gap: 0.7rem;
  }
`;

const todayYmd = () => new Date().toISOString().slice(0, 10);
const addDaysYmd = (startYmd: string, days: number) => {
  const d = new Date(`${startYmd}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return startYmd;
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

interface Props {
  project: TaskProject;
  users: TaskUser[];
  canManageAi: boolean;
  canCreateTask: boolean;
  onTasksPublished: (tasks: Task[]) => void;
  onOpenTask: (taskId: string) => void;
}

export function CampaignPlannerTab({
  project,
  users,
  canManageAi,
  canCreateTask,
  onTasksPublished,
  onOpenTask,
}: Props) {
  const toast = useToast();
  const [mode, setMode] = useState<'list' | 'create' | 'detail'>('list');
  const [activePlanId, setActivePlanId] = useState<string | null>(null);

  const {
    data: plans,
    loading: loadingList,
    error: listError,
    reload: reloadList,
  } = useFetch<CampaignPlanSummary[]>(
    `/admin/ai-studio/planner/projects/${project.id}`,
  );

  const {
    data: activePlan,
    loading: loadingPlan,
    error: planError,
    reload: reloadPlan,
  } = useFetch<CampaignPlanDetail>(
    mode === 'detail' && activePlanId
      ? `/admin/ai-studio/planner/${activePlanId}`
      : null,
  );

  // Formulário de geração
  const [scope, setScope] = useState<CampaignPlanScope>('MONTHLY');
  const [title, setTitle] = useState('');
  const [objective, setObjective] = useState('');
  const [startDate, setStartDate] = useState(todayYmd);
  const [endDate, setEndDate] = useState(() => addDaysYmd(todayYmd(), 30));
  const [itemCount, setItemCount] = useState('12');
  const [channels, setChannels] = useState<string[]>([
    'Instagram Reels',
    'Carrossel Instagram',
    'Stories',
  ]);
  const [extraInstructions, setExtraInstructions] = useState('');
  const [modelTier, setModelTier] = useState<AiModelTier>('fast');
  const [generating, setGenerating] = useState(false);

  // Detalhe & publicação
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const [targetStageId, setTargetStageId] = useState<string>(
    () =>
      [...project.stages]
        .sort((a, b) => a.order - b.order)
        .find((s) => !s.isCompleted)?.id ??
      project.stages[0]?.id ??
      '',
  );
  const [assigneeId, setAssigneeId] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [deletingPlan, setDeletingPlan] = useState<CampaignPlanSummary | null>(
    null,
  );

  const pendingItems = useMemo(
    () => (activePlan?.items ?? []).filter((item) => !item.taskId),
    [activePlan],
  );

  const handleScopeChange = (nextScope: CampaignPlanScope) => {
    setScope(nextScope);
    const meta = PLAN_SCOPE_OPTIONS.find((o) => o.value === nextScope);
    if (meta) {
      setItemCount(String(meta.defaultCount));
      setEndDate(addDaysYmd(startDate, meta.defaultDays));
    }
  };

  const toggleChannel = (ch: string) => {
    setChannels((prev) =>
      prev.includes(ch) ? prev.filter((item) => item !== ch) : [...prev, ch],
    );
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!channels.length) {
      toast.error('Selecione pelo menos um canal.');
      return;
    }
    setGenerating(true);
    try {
      const res = await generateCampaignPlan(project.id, {
        scope,
        title: title.trim() || undefined,
        objective: objective.trim(),
        startDate,
        endDate: endDate || undefined,
        channels,
        itemCount: Number(itemCount) || 12,
        extraInstructions: extraInstructions.trim() || undefined,
        modelTier,
      });
      toast.success(
        `Plano "${res.plan.title}" gerado com ${res.plan.items.length} entregas!`,
      );
      setActivePlanId(res.plan.id);
      setSelectedIds(res.plan.items.map((i) => i.id));
      setExpandedIds([]);
      setMode('detail');
      reloadList();
    } catch (err) {
      toast.error(errorMessage(err, 'Erro ao gerar planejamento com a IA.'));
    } finally {
      setGenerating(false);
    }
  };

  const openPlan = (planId: string) => {
    setActivePlanId(planId);
    setSelectedIds([]);
    setExpandedIds([]);
    setMode('detail');
  };

  const saveItemPatch = async (
    itemId: string,
    patch: Parameters<typeof updateCampaignPlanItem>[1],
  ) => {
    try {
      await updateCampaignPlanItem(itemId, patch);
      reloadPlan();
    } catch (err) {
      toast.error(errorMessage(err, 'Não foi possível atualizar o item.'));
    }
  };

  const removeItem = async (itemId: string) => {
    try {
      await deleteCampaignPlanItem(itemId);
      setSelectedIds((prev) => prev.filter((id) => id !== itemId));
      reloadPlan();
      reloadList();
    } catch (err) {
      toast.error(errorMessage(err, 'Erro ao remover item.'));
    }
  };

  const confirmDeletePlan = async () => {
    if (!deletingPlan) return;
    try {
      await deleteCampaignPlan(deletingPlan.id);
      toast.success('Plano excluído.');
      if (activePlanId === deletingPlan.id) {
        setActivePlanId(null);
        setMode('list');
      }
      setDeletingPlan(null);
      reloadList();
    } catch (err) {
      toast.error(errorMessage(err, 'Erro ao excluir plano.'));
    }
  };

  const handlePublish = async () => {
    if (!activePlan) return;
    const idsToPublish = selectedIds.filter((id) =>
      pendingItems.some((item) => item.id === id),
    );
    const targetIds =
      idsToPublish.length > 0
        ? idsToPublish
        : pendingItems.map((item) => item.id);

    if (!targetIds.length) {
      toast.error('Todas as entregas deste plano já estão no Kanban.');
      return;
    }

    setPublishing(true);
    try {
      const res = await publishCampaignPlan(activePlan.id, {
        stageId: targetStageId || undefined,
        assignedToId: assigneeId || null,
        itemIds: targetIds,
      });
      toast.success(
        `${res.createdCount} ${res.createdCount === 1 ? 'tarefa criada' : 'tarefas criadas'} no Kanban e Calendário!`,
      );
      onTasksPublished(res.tasks);
      setSelectedIds([]);
      reloadPlan();
      reloadList();
    } catch (err) {
      toast.error(errorMessage(err, 'Erro ao criar tarefas no Kanban.'));
    } finally {
      setPublishing(false);
    }
  };

  if (mode === 'create') {
    return (
      <Wrap>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setMode('list')}
          >
            <ArrowLeft size={15} /> Voltar aos planos
          </Button>
          <strong>Novo Planejamento Estratégico com IA</strong>
        </div>

        <form
          onSubmit={handleGenerate}
          style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '0.75rem',
            }}
          >
            <SelectField
              label="Tipo de planejamento"
              value={scope}
              onChange={(e) =>
                handleScopeChange(e.target.value as CampaignPlanScope)
              }
              options={PLAN_SCOPE_OPTIONS.map((o) => ({
                value: o.value,
                label: o.label,
              }))}
            />
            <SelectField
              label="Motor Gemini"
              value={modelTier}
              onChange={(e) => setModelTier(e.target.value as AiModelTier)}
              options={MODEL_TIER_OPTIONS}
            />
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 130px',
              gap: '0.75rem',
            }}
          >
            <TextField
              label="Data inicial"
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <TextField
              label="Data final"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
            <TextField
              label="Nº de entregas"
              type="number"
              min={3}
              max={40}
              value={itemCount}
              onChange={(e) => setItemCount(e.target.value)}
            />
          </div>

          <TextField
            label="Título do plano"
            placeholder="Ex: Plano Q1 — Autoridade & Captação de Leads"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <strong style={{ fontSize: '0.88rem' }}>Canais incluídos</strong>
            <ChannelGrid>
              {DEFAULT_PLAN_CHANNELS.map((ch) => (
                <ChannelChip
                  key={ch}
                  type="button"
                  $on={channels.includes(ch)}
                  onClick={() => toggleChannel(ch)}
                >
                  {ch}
                </ChannelChip>
              ))}
            </ChannelGrid>
          </div>

          <TextArea
            label="Objetivo principal da campanha / período"
            required
            rows={2}
            placeholder="Ex: Aumentar agendamentos no WhatsApp em 30% quebrando objeções sobre preço e qualidade..."
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
          />

          <TextArea
            label="Instruções ou datas comemorativas extras"
            rows={2}
            placeholder="Ex: Considerar Dia das Mães, focar na oferta principal, evitar tom agressivo..."
            value={extraInstructions}
            onChange={(e) => setExtraInstructions(e.target.value)}
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setMode('list')}
            >
              Cancelar
            </Button>
            <Button type="submit" loading={generating}>
              <Sparkles size={15} /> Gerar Plano com Gemini
            </Button>
          </div>
        </form>
      </Wrap>
    );
  }

  if (mode === 'detail' && activePlanId) {
    if (loadingPlan) return <PageLoader label="Carregando plano…" />;
    if (planError || !activePlan) {
      return (
        <ErrorState
          message={planError?.message ?? 'Erro ao carregar plano.'}
          onRetry={reloadPlan}
        />
      );
    }

    const selectedPendingCount = selectedIds.filter((id) =>
      pendingItems.some((item) => item.id === id),
    ).length;

    return (
      <Wrap>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.6rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setMode('list')}
            >
              <ArrowLeft size={15} /> Planos
            </Button>
            <strong style={{ fontSize: '1.05rem' }}>{activePlan.title}</strong>
            <StatusPill
              tone={activePlan.status === 'PUBLISHED' ? 'success' : 'info'}
            >
              {activePlan.status === 'PUBLISHED' ? 'Publicado' : 'Rascunho'}
            </StatusPill>
          </div>
          {activePlan.startDate && activePlan.endDate && (
            <span style={{ fontSize: '0.82rem', color: 'inherit', opacity: 0.75 }}>
              {formatDateOnly(activePlan.startDate)} →{' '}
              {formatDateOnly(activePlan.endDate)}
            </span>
          )}
        </div>

        {(activePlan.strategySummary || activePlan.pillars.length > 0) && (
          <SummaryBox>
            {activePlan.strategySummary && <p>{activePlan.strategySummary}</p>}
            {activePlan.pillars.length > 0 && (
              <div className="pillars">
                {activePlan.pillars.map((p) => (
                  <span key={p} className="pillar">
                    {p}
                  </span>
                ))}
              </div>
            )}
          </SummaryBox>
        )}

        {canCreateTask && canManageAi && pendingItems.length > 0 && (
          <PublishBar>
            <SelectField
              label="Coluna destino no Kanban"
              value={targetStageId}
              onChange={(e) => setTargetStageId(e.target.value)}
              options={[...project.stages]
                .sort((a, b) => a.order - b.order)
                .map((s) => ({ value: s.id, label: s.name }))}
            />
            <SelectField
              label="Responsável padrão"
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              options={[
                { value: '', label: 'Sem responsável' },
                ...users.map((u) => ({ value: u.id, label: u.name })),
              ]}
            />
            <Button
              type="button"
              loading={publishing}
              onClick={() => void handlePublish()}
            >
              <CalendarPlus size={16} /> Criar{' '}
              {selectedPendingCount > 0
                ? selectedPendingCount
                : pendingItems.length}{' '}
              tarefas no Kanban
            </Button>
          </PublishBar>
        )}

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.82rem',
          }}
        >
          <span>
            {activePlan.items.length} entregas · {pendingItems.length} pendente(s)
          </span>
          {pendingItems.length > 0 && (
            <button
              type="button"
              style={{ fontWeight: 700, color: 'inherit' }}
              onClick={() =>
                setSelectedIds((prev) =>
                  prev.length === pendingItems.length
                    ? []
                    : pendingItems.map((i) => i.id),
                )
              }
            >
              {selectedIds.length === pendingItems.length
                ? 'Desmarcar pendentes'
                : 'Selecionar todos pendentes'}
            </button>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          {activePlan.items.map((item) => (
            <PlanItemRow
              key={item.id}
              item={item}
              checked={selectedIds.includes(item.id)}
              expanded={expandedIds.includes(item.id)}
              canManage={canManageAi}
              onToggleCheck={() =>
                setSelectedIds((prev) =>
                  prev.includes(item.id)
                    ? prev.filter((id) => id !== item.id)
                    : [...prev, item.id],
                )
              }
              onToggleExpand={() =>
                setExpandedIds((prev) =>
                  prev.includes(item.id)
                    ? prev.filter((id) => id !== item.id)
                    : [...prev, item.id],
                )
              }
              onSave={(patch) => void saveItemPatch(item.id, patch)}
              onDelete={() => void removeItem(item.id)}
              onOpenTask={onOpenTask}
            />
          ))}
        </div>
      </Wrap>
    );
  }

  return (
    <Wrap>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        <span style={{ fontSize: '0.88rem', opacity: 0.85 }}>
          Crie cronogramas mensais, trimestrais ou de campanhas de vendas e envie tudo para o Kanban e Calendário com 1 clique.
        </span>
        {canManageAi && (
          <Button type="button" size="sm" onClick={() => setMode('create')}>
            <Plus size={15} /> Novo Plano com IA
          </Button>
        )}
      </div>

      {loadingList ? (
        <PageLoader label="Carregando planos…" />
      ) : listError ? (
        <ErrorState message={listError.message} onRetry={reloadList} />
      ) : !plans || plans.length === 0 ? (
        <EmptyState
          title="Nenhum plano de campanha ainda"
          description="Gere o primeiro planejamento mensal, trimestral ou de vendas usando o Cérebro do Cliente."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          {plans.map((p) => {
            const publishedCount = p.items.filter((i) => !!i.taskId).length;
            return (
              <PlanCard key={p.id}>
                <div className="info">
                  <span className="title">{p.title}</span>
                  <div className="meta">
                    <StatusPill
                      tone={p.status === 'PUBLISHED' ? 'success' : 'info'}
                    >
                      {p.status === 'PUBLISHED' ? 'Publicado' : 'Rascunho'}
                    </StatusPill>
                    <span>
                      {p._count.items} entregas ({publishedCount} no Kanban)
                    </span>
                    {p.startDate && p.endDate && (
                      <span>
                        {formatDateOnly(p.startDate)} →{' '}
                        {formatDateOnly(p.endDate)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="actions">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => openPlan(p.id)}
                  >
                    Abrir plano
                  </Button>
                  {canManageAi && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setDeletingPlan(p)}
                      aria-label={`Excluir ${p.title}`}
                    >
                      <Trash2 size={14} />
                    </Button>
                  )}
                </div>
              </PlanCard>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!deletingPlan}
        title="Excluir plano de campanha"
        confirmLabel="Excluir"
        message={
          <>
            Deseja excluir o plano <strong>{deletingPlan?.title}</strong>? As tarefas que já foram criadas no Kanban serão mantidas.
          </>
        }
        onCancel={() => setDeletingPlan(null)}
        onConfirm={() => void confirmDeletePlan()}
      />
    </Wrap>
  );
}

function PlanItemRow({
  item,
  checked,
  expanded,
  canManage,
  onToggleCheck,
  onToggleExpand,
  onSave,
  onDelete,
  onOpenTask,
}: {
  item: CampaignPlanItem;
  checked: boolean;
  expanded: boolean;
  canManage: boolean;
  onToggleCheck: () => void;
  onToggleExpand: () => void;
  onSave: (patch: Parameters<typeof updateCampaignPlanItem>[1]) => void;
  onDelete: () => void;
  onOpenTask: (taskId: string) => void;
}) {
  const [title, setTitle] = useState(item.title);
  const [date, setDate] = useState(toDateInput(item.scheduledDate));
  const [hook, setHook] = useState(item.hook ?? '');
  const [briefing, setBriefing] = useState(item.briefing ?? '');
  const [copyDraft, setCopyDraft] = useState(item.copyDraft ?? '');
  const [cta, setCta] = useState(item.cta ?? '');

  return (
    <ItemCard>
      <div className="top">
        {!item.taskId ? (
          <input
            type="checkbox"
            className="check"
            checked={checked}
            onChange={onToggleCheck}
            aria-label={`Selecionar ${item.title}`}
          />
        ) : null}

        <div className="main">
          <div className="badges">
            <span className="tag">{item.channel}</span>
            {item.funnelStage && <span className="tag">{item.funnelStage}</span>}
            {item.pillar && <span className="tag">{item.pillar}</span>}
            {item.task && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => onOpenTask(item.task!.id)}
              >
                No Kanban ({item.task.stage.name}) <ExternalLink size={12} />
              </Button>
            )}
          </div>
          <input
            className="title-input"
            value={title}
            disabled={!canManage}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => {
              const trimmed = title.trim();
              if (trimmed && trimmed !== item.title) onSave({ title: trimmed });
            }}
          />
        </div>

        <div className="controls">
          <input
            type="date"
            value={date}
            disabled={!canManage}
            aria-label="Data programada"
            onChange={(e) => {
              setDate(e.target.value);
              onSave({ scheduledDate: e.target.value || null });
            }}
          />
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={onToggleExpand}
            aria-label="Ver detalhes"
          >
            {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </Button>
          {canManage && !item.taskId && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={onDelete}
              aria-label={`Remover ${item.title}`}
            >
              <Trash2 size={14} />
            </Button>
          )}
        </div>
      </div>

      {expanded && (
        <div className="details">
          <TextArea
            label="Gancho (Hook)"
            rows={2}
            disabled={!canManage}
            value={hook}
            onChange={(e) => setHook(e.target.value)}
          />
          <TextArea
            label="Briefing de Produção"
            rows={3}
            disabled={!canManage}
            value={briefing}
            onChange={(e) => setBriefing(e.target.value)}
          />
          <TextArea
            label="Rascunho de Copy / Roteiro"
            rows={4}
            disabled={!canManage}
            value={copyDraft}
            onChange={(e) => setCopyDraft(e.target.value)}
          />
          <TextField
            label="CTA"
            disabled={!canManage}
            value={cta}
            onChange={(e) => setCta(e.target.value)}
          />
          {canManage && (
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                type="button"
                size="sm"
                onClick={() =>
                  onSave({
                    hook: hook.trim() || null,
                    briefing: briefing.trim() || null,
                    copyDraft: copyDraft.trim() || null,
                    cta: cta.trim() || null,
                  })
                }
              >
                Salvar alterações do item
              </Button>
            </div>
          )}
        </div>
      )}
    </ItemCard>
  );
}
