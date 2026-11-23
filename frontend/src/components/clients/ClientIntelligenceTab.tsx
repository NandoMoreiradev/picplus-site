import { useMemo, useState } from 'react';
import styled from 'styled-components';
import {
  ExternalLink,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { Panel, StatusPill } from '../admin/AdminUI';
import { TagInput } from '../admin/TagInput';
import { Button } from '../ui/Button';
import { EmptyState, ErrorState, PageLoader } from '../ui/Feedback';
import { SelectField, TextArea, TextField } from '../ui/Form';
import { ConfirmDialog, Modal } from '../ui/Modal';
import { useToast } from '../ui/Toast';
import { useFetch } from '../../hooks/useFetch';
import {
  createClientCompetitor,
  deleteClientCompetitor,
  generateClientBrandDraft,
  MODEL_TIER_OPTIONS,
  saveClientBrandProfile,
  updateClientCompetitor,
} from '../../lib/clientAi';
import type {
  AiModelTier,
  BrandProfilePayload,
  ClientCompetitor,
  ClientIntelligenceData,
} from '../../lib/clientAi';
import { formatDateTime } from '../../lib/format';
import { errorMessage } from '../../lib/validation';

const Grid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr);
  gap: 1.5rem;
  margin-top: 1.5rem;

  @media (max-width: ${({ theme }) => theme.breakpoints.laptop}) {
    grid-template-columns: 1fr;
  }
`;

const Card = styled(Panel)`
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.15rem;

  h3 {
    font-size: 1rem;
    font-weight: 800;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    flex-wrap: wrap;
    border-bottom: 1px solid ${({ theme }) => theme.colors.border};
    padding-bottom: 0.75rem;
  }
`;

const AiBanner = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem;
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.colors.primarySoft};
  border: 1px solid ${({ theme }) => theme.colors.border};

  .top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    flex-wrap: wrap;
  }
  .title {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    font-weight: 800;
    font-size: 0.92rem;
    color: ${({ theme }) => theme.colors.primary};
  }
  p {
    font-size: 0.85rem;
    color: ${({ theme }) => theme.colors.textSecondary};
    line-height: 1.45;
  }
`;

const CompetitorCard = styled.div`
  padding: 0.95rem 1rem;
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.colors.background};
  border: 1px solid ${({ theme }) => theme.colors.border};
  display: flex;
  flex-direction: column;
  gap: 0.45rem;

  .head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }
  .name {
    font-weight: 800;
    font-size: 0.95rem;
  }
  .actions {
    display: inline-flex;
    gap: 0.35rem;
  }
  .handles {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    font-size: 0.8rem;
    color: ${({ theme }) => theme.colors.textSecondary};
  }
  .notes {
    font-size: 0.84rem;
    color: ${({ theme }) => theme.colors.textSecondary};
    line-height: 1.45;
  }
`;

const LogItem = styled.div`
  padding: 0.85rem 1rem;
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.colors.background};
  border: 1px solid ${({ theme }) => theme.colors.border};
  display: flex;
  flex-direction: column;
  gap: 0.35rem;

  .head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    font-size: 0.78rem;
    color: ${({ theme }) => theme.colors.textMuted};
  }
  .title {
    font-weight: 700;
    font-size: 0.88rem;
  }
  .preview {
    font-size: 0.82rem;
    color: ${({ theme }) => theme.colors.textSecondary};
    white-space: pre-wrap;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
`;

interface Props {
  clientId: string;
  canManage: boolean;
}

export function ClientIntelligenceTab({ clientId, canManage }: Props) {
  const toast = useToast();
  const { data, loading, error, reload } = useFetch<ClientIntelligenceData>(
    `/admin/ai-studio/clients/${clientId}`,
  );

  const serverForm = useMemo<Required<BrandProfilePayload>>(
    () => ({
      positioning: data?.brandProfile?.positioning ?? '',
      targetAudience: data?.brandProfile?.targetAudience ?? '',
      painsAndDesires: data?.brandProfile?.painsAndDesires ?? '',
      toneOfVoice: data?.brandProfile?.toneOfVoice ?? '',
      valueProposition: data?.brandProfile?.valueProposition ?? '',
      productsAndOffers: data?.brandProfile?.productsAndOffers ?? '',
      ctaGuidelines: data?.brandProfile?.ctaGuidelines ?? '',
      keywords: data?.brandProfile?.keywords ?? [],
      forbiddenWords: data?.brandProfile?.forbiddenWords ?? [],
      extraContext: data?.brandProfile?.extraContext ?? '',
    }),
    [data],
  );

  const [formDraft, setFormDraft] = useState<Required<BrandProfilePayload> | null>(null);
  const form = formDraft ?? serverForm;
  const setForm = (
    updater: (prev: Required<BrandProfilePayload>) => Required<BrandProfilePayload>,
  ) => setFormDraft((prev) => updater(prev ?? serverForm));

  const [savingProfile, setSavingProfile] = useState(false);

  const [draftNotes, setDraftNotes] = useState('');
  const [modelTier, setModelTier] = useState<AiModelTier>('fast');
  const [generatingDraft, setGeneratingDraft] = useState(false);

  // Concorrente modal
  const [compModalOpen, setCompModalOpen] = useState(false);
  const [editingComp, setEditingComp] = useState<ClientCompetitor | null>(null);
  const [compName, setCompName] = useState('');
  const [compWebsite, setCompWebsite] = useState('');
  const [compInstagram, setCompInstagram] = useState('');
  const [compTiktok, setCompTiktok] = useState('');
  const [compYoutube, setCompYoutube] = useState('');
  const [compStrengths, setCompStrengths] = useState('');
  const [compWeaknesses, setCompWeaknesses] = useState('');
  const [compNotes, setCompNotes] = useState('');
  const [savingComp, setSavingComp] = useState(false);
  const [deletingComp, setDeletingComp] = useState<ClientCompetitor | null>(null);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await saveClientBrandProfile(clientId, form);
      setFormDraft(null);
      toast.success('Perfil estratégico salvo!');
      reload();
    } catch (err) {
      toast.error(errorMessage(err, 'Erro ao salvar perfil estratégico.'));
    } finally {
      setSavingProfile(false);
    }
  };

  const handleGenerateDraft = async () => {
    setGeneratingDraft(true);
    try {
      const res = await generateClientBrandDraft(clientId, {
        extraNotes: draftNotes.trim() || undefined,
        modelTier,
      });
      setFormDraft(res.draft);
      toast.success('Rascunho gerado! Revise os campos e clique em Salvar.');
    } catch (err) {
      toast.error(errorMessage(err, 'Erro ao gerar rascunho com a IA.'));
    } finally {
      setGeneratingDraft(false);
    }
  };

  const openNewComp = () => {
    setEditingComp(null);
    setCompName('');
    setCompWebsite('');
    setCompInstagram('');
    setCompTiktok('');
    setCompYoutube('');
    setCompStrengths('');
    setCompWeaknesses('');
    setCompNotes('');
    setCompModalOpen(true);
  };

  const openEditComp = (comp: ClientCompetitor) => {
    setEditingComp(comp);
    setCompName(comp.name);
    setCompWebsite(comp.websiteUrl ?? '');
    setCompInstagram(comp.instagramHandle ?? '');
    setCompTiktok(comp.tiktokHandle ?? '');
    setCompYoutube(comp.youtubeHandle ?? '');
    setCompStrengths(comp.strengths ?? '');
    setCompWeaknesses(comp.weaknesses ?? '');
    setCompNotes(comp.notes ?? '');
    setCompModalOpen(true);
  };

  const handleSaveCompetitor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!compName.trim()) return;
    setSavingComp(true);
    try {
      const payload = {
        name: compName.trim(),
        websiteUrl: compWebsite.trim() || undefined,
        instagramHandle: compInstagram.trim() || undefined,
        tiktokHandle: compTiktok.trim() || undefined,
        youtubeHandle: compYoutube.trim() || undefined,
        strengths: compStrengths.trim() || undefined,
        weaknesses: compWeaknesses.trim() || undefined,
        notes: compNotes.trim() || undefined,
      };
      if (editingComp) {
        await updateClientCompetitor(clientId, editingComp.id, payload);
        toast.success('Concorrente atualizado!');
      } else {
        await createClientCompetitor(clientId, payload);
        toast.success('Concorrente adicionado!');
      }
      setCompModalOpen(false);
      reload();
    } catch (err) {
      toast.error(errorMessage(err, 'Erro ao salvar concorrente.'));
    } finally {
      setSavingComp(false);
    }
  };

  const handleDeleteCompetitor = async () => {
    if (!deletingComp) return;
    try {
      await deleteClientCompetitor(clientId, deletingComp.id);
      toast.success('Concorrente removido.');
      setDeletingComp(null);
      reload();
    } catch (err) {
      toast.error(errorMessage(err, 'Erro ao remover concorrente.'));
    }
  };

  if (loading) return <PageLoader label="Carregando inteligência do cliente…" />;
  if (error || !data) {
    return (
      <ErrorState
        message={error?.message ?? 'Falha ao carregar inteligência.'}
        onRetry={reload}
      />
    );
  }

  return (
    <>
      <Grid>
        <Card as="form" onSubmit={handleSaveProfile}>
          <h3>
            <span>Cérebro da Marca (Brand Book)</span>
            {data.brandProfile ? (
              <StatusPill tone="success">Configurado</StatusPill>
            ) : (
              <StatusPill tone="warning">Pendente</StatusPill>
            )}
          </h3>

          {canManage && (
            <AiBanner>
              <div className="top">
                <span className="title">
                  <Sparkles size={16} /> Preenchimento assistido com Gemini
                </span>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => void handleGenerateDraft()}
                  loading={generatingDraft}
                >
                  <Sparkles size={15} /> Gerar rascunho com IA
                </Button>
              </div>
              <p>
                A IA lê nome, segmento, site e notas internas do cliente para montar uma primeira versão do Brand Book para você revisar.
              </p>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 220px',
                  gap: '0.75rem',
                }}
              >
                <TextField
                  label="Contexto extra para o rascunho"
                  placeholder="Ex: Clínica odontológica premium, foco em lentes de contato dental..."
                  value={draftNotes}
                  onChange={(e) => setDraftNotes(e.target.value)}
                />
                <SelectField
                  label="Motor"
                  value={modelTier}
                  onChange={(e) => setModelTier(e.target.value as AiModelTier)}
                  options={MODEL_TIER_OPTIONS}
                />
              </div>
            </AiBanner>
          )}

          <TextArea
            label="Posicionamento de marca"
            rows={2}
            disabled={!canManage}
            placeholder="Como o cliente quer ser percebido no mercado..."
            value={form.positioning}
            onChange={(e) => setForm((f) => ({ ...f, positioning: e.target.value }))}
          />

          <TextArea
            label="Público-alvo / Personas"
            rows={3}
            disabled={!canManage}
            placeholder="Perfil demográfico, nível de maturidade, poder aquisitivo, hábitos..."
            value={form.targetAudience}
            onChange={(e) => setForm((f) => ({ ...f, targetAudience: e.target.value }))}
          />

          <TextArea
            label="Dores, objeções e desejos do público"
            rows={3}
            disabled={!canManage}
            placeholder="O que tira o sono do cliente final e o que ele busca alcançar..."
            value={form.painsAndDesires}
            onChange={(e) => setForm((f) => ({ ...f, painsAndDesires: e.target.value }))}
          />

          <TextArea
            label="Tom de voz e estilo de comunicação"
            rows={2}
            disabled={!canManage}
            placeholder="Ex: Direto, acolhedor, técnico sem ser frio, usa humor leve..."
            value={form.toneOfVoice}
            onChange={(e) => setForm((f) => ({ ...f, toneOfVoice: e.target.value }))}
          />

          <TextArea
            label="Proposta de valor e diferenciais"
            rows={2}
            disabled={!canManage}
            placeholder="Por que escolher este cliente e não os concorrentes..."
            value={form.valueProposition}
            onChange={(e) => setForm((f) => ({ ...f, valueProposition: e.target.value }))}
          />

          <TextArea
            label="Produtos, serviços e ofertas principais"
            rows={2}
            disabled={!canManage}
            placeholder="Produtos de entrada, carro-chefe, ticket médio, garantias..."
            value={form.productsAndOffers}
            onChange={(e) => setForm((f) => ({ ...f, productsAndOffers: e.target.value }))}
          />

          <TextField
            label="Diretrizes de CTA"
            disabled={!canManage}
            placeholder="Ex: Sempre direcionar para agendamento via WhatsApp ou link da bio"
            value={form.ctaGuidelines}
            onChange={(e) => setForm((f) => ({ ...f, ctaGuidelines: e.target.value }))}
          />

          <TagInput
            label="Palavras-chave e temas centrais"
            value={form.keywords}
            max={40}
            onChange={(keywords) => canManage && setForm((f) => ({ ...f, keywords }))}
            hint="Pressione Enter para adicionar"
          />

          <TagInput
            label="Termos proibidos / Evitar"
            value={form.forbiddenWords}
            max={40}
            onChange={(forbiddenWords) =>
              canManage && setForm((f) => ({ ...f, forbiddenWords }))
            }
            hint="Palavras, promessas ou clichês que a IA nunca deve usar"
          />

          <TextArea
            label="Contexto adicional"
            rows={2}
            disabled={!canManage}
            placeholder="Sazonalidades, restrições legais, observações importantes..."
            value={form.extraContext}
            onChange={(e) => setForm((f) => ({ ...f, extraContext: e.target.value }))}
          />

          {canManage && (
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button type="submit" loading={savingProfile}>
                Salvar Perfil Estratégico
              </Button>
            </div>
          )}
        </Card>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <Card>
            <h3>
              <span>Concorrentes & Referências ({data.competitors.length})</span>
              {canManage && (
                <Button type="button" size="sm" variant="secondary" onClick={openNewComp}>
                  <Plus size={15} /> Adicionar
                </Button>
              )}
            </h3>

            {data.competitors.length === 0 ? (
              <EmptyState
                title="Nenhum concorrente cadastrado"
                description="Mapeie os principais concorrentes para a IA comparar posicionamento, hooks e ofertas."
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {data.competitors.map((comp) => (
                  <CompetitorCard key={comp.id}>
                    <div className="head">
                      <span className="name">{comp.name}</span>
                      {canManage && (
                        <div className="actions">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => openEditComp(comp)}
                            aria-label={`Editar ${comp.name}`}
                          >
                            <Pencil size={14} />
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => setDeletingComp(comp)}
                            aria-label={`Excluir ${comp.name}`}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      )}
                    </div>
                    <div className="handles">
                      {comp.instagramHandle && <span>IG: {comp.instagramHandle}</span>}
                      {comp.tiktokHandle && <span>TikTok: {comp.tiktokHandle}</span>}
                      {comp.youtubeHandle && <span>YouTube: {comp.youtubeHandle}</span>}
                      {comp.websiteUrl && (
                        <a href={comp.websiteUrl} target="_blank" rel="noopener noreferrer">
                          Site <ExternalLink size={11} />
                        </a>
                      )}
                    </div>
                    {comp.strengths && (
                      <div className="notes">
                        <strong>Pontos fortes:</strong> {comp.strengths}
                      </div>
                    )}
                    {comp.weaknesses && (
                      <div className="notes">
                        <strong>Brechas:</strong> {comp.weaknesses}
                      </div>
                    )}
                    {comp.notes && <div className="notes">{comp.notes}</div>}
                  </CompetitorCard>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <h3>
              <span>Histórico recente de IA ({data.logs.length})</span>
            </h3>
            {data.logs.length === 0 ? (
              <EmptyState
                title="Nenhuma geração registrada"
                description="As gerações de rascunhos, copys e briefings aparecerão aqui."
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {data.logs.slice(0, 8).map((log) => (
                  <LogItem key={log.id}>
                    <div className="head">
                      <span>
                        {log.kind} · {log.model}
                      </span>
                      <span>{formatDateTime(log.createdAt)}</span>
                    </div>
                    <div className="title">{log.title || 'Geração IA'}</div>
                    <div className="preview">{log.output}</div>
                  </LogItem>
                ))}
              </div>
            )}
          </Card>
        </div>
      </Grid>

      <Modal
        open={compModalOpen}
        onClose={() => setCompModalOpen(false)}
        title={editingComp ? 'Editar Concorrente' : 'Novo Concorrente'}
        width="560px"
      >
        <form
          onSubmit={handleSaveCompetitor}
          style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
        >
          <TextField
            label="Nome da marca / concorrente"
            required
            value={compName}
            onChange={(e) => setCompName(e.target.value)}
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <TextField
              label="Instagram (@)"
              placeholder="@concorrente"
              value={compInstagram}
              onChange={(e) => setCompInstagram(e.target.value)}
            />
            <TextField
              label="TikTok (@)"
              placeholder="@concorrente"
              value={compTiktok}
              onChange={(e) => setCompTiktok(e.target.value)}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <TextField
              label="YouTube"
              placeholder="@canal"
              value={compYoutube}
              onChange={(e) => setCompYoutube(e.target.value)}
            />
            <TextField
              label="Website"
              placeholder="https://..."
              value={compWebsite}
              onChange={(e) => setCompWebsite(e.target.value)}
            />
          </div>
          <TextArea
            label="O que funciona bem lá (pontos fortes)"
            rows={2}
            value={compStrengths}
            onChange={(e) => setCompStrengths(e.target.value)}
          />
          <TextArea
            label="Brechas / oportunidades"
            rows={2}
            value={compWeaknesses}
            onChange={(e) => setCompWeaknesses(e.target.value)}
          />
          <TextArea
            label="Observações gerais"
            rows={2}
            value={compNotes}
            onChange={(e) => setCompNotes(e.target.value)}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setCompModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" loading={savingComp}>
              Salvar Concorrente
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deletingComp}
        title="Remover concorrente"
        confirmLabel="Remover"
        message={
          <>
            Deseja remover <strong>{deletingComp?.name}</strong> da lista de concorrentes?
          </>
        }
        onCancel={() => setDeletingComp(null)}
        onConfirm={() => void handleDeleteCompetitor()}
      />
    </>
  );
}
