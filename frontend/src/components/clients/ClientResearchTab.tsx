import { useState } from 'react';
import Markdown from 'react-markdown';
import styled from 'styled-components';
import {
  Copy,
  ExternalLink,
  Flame,
  KeyRound,
  Plus,
  Puzzle,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';
import { useFetch } from '../../hooks/useFetch';
import { Panel, StatusPill, Tabs } from '../admin/AdminUI';
import { Button } from '../ui/Button';
import { EmptyState, ErrorState, PageLoader } from '../ui/Feedback';
import { SelectField, Switch, TextArea, TextField } from '../ui/Form';
import { ConfirmDialog, Modal } from '../ui/Modal';
import { useToast } from '../ui/Toast';
import { assetUrl } from '../../lib/api';
import {
  createExtensionToken,
  deleteReference,
  deleteResearchReport,
  ingestReferenceForm,
  MODEL_TIER_OPTIONS,
  reanalyzeReference,
  REFERENCE_PLATFORM_OPTIONS,
  RESEARCH_KIND_OPTIONS,
  revokeExtensionToken,
  runClientResearch,
  toggleReferenceViral,
} from '../../lib/clientAi';
import type {
  AiModelTier,
  ClientResearchData,
  CompetitorReference,
  ExtensionApiToken,
  ReferencePlatform,
  ResearchReport,
  ResearchReportKind,
} from '../../lib/clientAi';
import { formatDateTime } from '../../lib/format';
import { errorMessage } from '../../lib/validation';

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  margin-top: 1.25rem;
`;

const Card = styled(Panel)`
  padding: 1.35rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;

  h3 {
    font-size: 1rem;
    font-weight: 800;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    flex-wrap: wrap;
    border-bottom: 1px solid ${({ theme }) => theme.colors.border};
    padding-bottom: 0.7rem;
  }
`;

const RefGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 1rem;
`;

const RefCard = styled(Panel)`
  padding: 1.1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;

  .head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 0.5rem;
  }
  .meta {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    align-items: center;
    font-size: 0.78rem;
  }
  .title {
    font-weight: 800;
    font-size: 0.95rem;
  }
  .caption {
    font-size: 0.84rem;
    color: ${({ theme }) => theme.colors.textSecondary};
    white-space: pre-wrap;
    display: -webkit-box;
    -webkit-line-clamp: 4;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .media-strip {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .media-strip img {
    max-height: 210px;
    width: 100%;
    object-fit: cover;
    border-radius: ${({ theme }) => theme.radii.md};
    border: 1px solid ${({ theme }) => theme.colors.border};
  }
  .media-strip video {
    max-height: 240px;
    width: 100%;
    border-radius: ${({ theme }) => theme.radii.md};
    background: #000;
  }
  .media-strip audio {
    width: 100%;
    height: 36px;
  }
  .hooks {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
  }
  .hook {
    padding: 0.2rem 0.55rem;
    border-radius: ${({ theme }) => theme.radii.pill};
    background: ${({ theme }) => theme.colors.primarySoft};
    color: ${({ theme }) => theme.colors.primary};
    font-size: 0.76rem;
    font-weight: 700;
  }
  .analysis {
    padding: 0.75rem;
    border-radius: ${({ theme }) => theme.radii.md};
    background: ${({ theme }) => theme.colors.background};
    border: 1px solid ${({ theme }) => theme.colors.border};
    font-size: 0.82rem;
    line-height: 1.5;
    white-space: pre-wrap;
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    margin-top: auto;
    padding-top: 0.5rem;
    border-top: 1px solid ${({ theme }) => theme.colors.border};
  }
`;

const MarkdownBox = styled.div`
  font-size: 0.9rem;
  line-height: 1.6;
  color: ${({ theme }) => theme.colors.textSecondary};

  h1, h2, h3 {
    color: ${({ theme }) => theme.colors.text};
    font-weight: 800;
    margin: 0.9rem 0 0.45rem;
  }
  h2 { font-size: 1.05rem; }
  h3 { font-size: 0.95rem; }
  ul, ol {
    padding-left: 1.25rem;
    margin: 0.4rem 0;
  }
  li { margin: 0.25rem 0; }
  strong { color: ${({ theme }) => theme.colors.text}; }
`;

const TokenBanner = styled.div`
  padding: 0.95rem 1rem;
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.colors.primarySoft};
  border: 1px solid ${({ theme }) => theme.colors.border};
  display: flex;
  flex-direction: column;
  gap: 0.5rem;

  code {
    padding: 0.45rem 0.65rem;
    border-radius: ${({ theme }) => theme.radii.sm};
    background: ${({ theme }) => theme.colors.background};
    font-size: 0.85rem;
    word-break: break-all;
  }
`;

interface Props {
  clientId: string;
  projectId?: string;
  canManage: boolean;
}

export function ClientResearchTab({ clientId, projectId, canManage }: Props) {
  const toast = useToast();
  const [subTab, setSubTab] = useState<'swipe' | 'trends' | 'extension'>('swipe');

  const { data, loading, error, reload } = useFetch<ClientResearchData>(
    `/admin/ai-studio/research/clients/${clientId}`,
  );
  const { data: tokens, reload: reloadTokens } = useFetch<ExtensionApiToken[]>(
    subTab === 'extension' ? '/admin/ai-studio/research/extension-tokens' : null,
  );

  // Investigação & Trends
  const [kind, setKind] = useState<ResearchReportKind>('VIRAL_TRENDS');
  const [topic, setTopic] = useState('');
  const [targetUrl, setTargetUrl] = useState('');
  const [useWebSearch, setUseWebSearch] = useState(true);
  const [modelTier, setModelTier] = useState<AiModelTier>('pro');
  const [runningResearch, setRunningResearch] = useState(false);
  const [expandedReportId, setExpandedReportId] = useState<string | null>(null);

  // Upload / Captura manual
  const [ingestOpen, setIngestOpen] = useState(false);
  const [refPlatform, setRefPlatform] = useState<ReferencePlatform>('INSTAGRAM');
  const [refHandle, setRefHandle] = useState('');
  const [refUrl, setRefUrl] = useState('');
  const [refTitle, setRefTitle] = useState('');
  const [refCaption, setRefCaption] = useState('');
  const [refViral, setRefViral] = useState(true);
  const [refFiles, setRefFiles] = useState<FileList | null>(null);
  const [uploadingRef, setUploadingRef] = useState(false);
  const [reanalyzingId, setReanalyzingId] = useState<string | null>(null);

  // Tokens da Extensão
  const [tokenName, setTokenName] = useState('Chrome Equipe');
  const [creatingToken, setCreatingToken] = useState(false);
  const [revealedToken, setRevealedToken] = useState<string | null>(null);

  // Confirmações
  const [deletingRef, setDeletingRef] = useState<CompetitorReference | null>(null);
  const [deletingReport, setDeletingReport] = useState<ResearchReport | null>(null);

  const handleRunResearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;
    setRunningResearch(true);
    try {
      const created = await runClientResearch(clientId, {
        kind,
        topic: topic.trim(),
        targetUrl: targetUrl.trim() || undefined,
        projectId,
        useWebSearch,
        modelTier,
      });
      toast.success('Pesquisa concluída!');
      setExpandedReportId(created.id);
      setTopic('');
      reload();
    } catch (err) {
      toast.error(errorMessage(err, 'Erro ao executar pesquisa.'));
    } finally {
      setRunningResearch(false);
    }
  };

  const handleIngestManual = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadingRef(true);
    try {
      const form = new FormData();
      form.append('platform', refPlatform);
      if (refHandle.trim()) form.append('authorHandle', refHandle.trim());
      if (refUrl.trim()) form.append('sourceUrl', refUrl.trim());
      if (refTitle.trim()) form.append('title', refTitle.trim());
      if (refCaption.trim()) form.append('caption', refCaption.trim());
      form.append('isViral', String(refViral));
      form.append('analyzeNow', 'true');
      form.append('modelTier', modelTier);
      if (refFiles) {
        for (const file of Array.from(refFiles)) {
          form.append('media', file);
        }
      }
      await ingestReferenceForm(clientId, form);
      toast.success('Publicação salva e analisada pela IA!');
      setIngestOpen(false);
      setRefHandle('');
      setRefUrl('');
      setRefTitle('');
      setRefCaption('');
      setRefFiles(null);
      reload();
    } catch (err) {
      toast.error(errorMessage(err, 'Erro ao enviar referência.'));
    } finally {
      setUploadingRef(false);
    }
  };

  const handleToggleViral = async (ref: CompetitorReference) => {
    try {
      await toggleReferenceViral(ref.id, !ref.isViral);
      reload();
    } catch (err) {
      toast.error(errorMessage(err, 'Erro ao atualizar destaque viral.'));
    }
  };

  const handleReanalyze = async (ref: CompetitorReference) => {
    setReanalyzingId(ref.id);
    try {
      await reanalyzeReference(ref.id, 'pro');
      toast.success('Referência reanalisada com Gemini Pro!');
      reload();
    } catch (err) {
      toast.error(errorMessage(err, 'Erro ao reanalisar.'));
    } finally {
      setReanalyzingId(null);
    }
  };

  const handleCreateToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenName.trim()) return;
    setCreatingToken(true);
    try {
      const res = await createExtensionToken(tokenName.trim());
      setRevealedToken(res.rawToken);
      setTokenName('Chrome Equipe');
      reloadTokens();
      toast.success('Token criado! Copie e cole na extensão do Chrome.');
    } catch (err) {
      toast.error(errorMessage(err, 'Erro ao gerar token.'));
    } finally {
      setCreatingToken(false);
    }
  };

  if (loading) return <PageLoader label="Carregando pesquisa e referências…" />;
  if (error || !data) {
    return (
      <ErrorState
        message={error?.message ?? 'Erro ao carregar dados de pesquisa.'}
        onRetry={reload}
      />
    );
  }

  return (
    <Wrap>
      <Tabs
        value={subTab}
        onChange={setSubTab}
        tabs={[
          { key: 'swipe', label: `Swipe File & Virais (${data.references.length})` },
          { key: 'trends', label: `Pesquisa & Trends (${data.reports.length})` },
          { key: 'extension', label: 'Extensão Chrome (Captura)' },
        ]}
      />

      {subTab === 'swipe' && (
        <>
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
              Posts, Reels, vídeos, áudios e copys de concorrentes capturados pela extensão ou enviados manualmente. Os hooks virais alimentam automaticamente todas as gerações de copy do cliente.
            </span>
            {canManage && (
              <Button type="button" size="sm" onClick={() => setIngestOpen(true)}>
                <Upload size={15} /> Enviar Publicação / Mídia
              </Button>
            )}
          </div>

          {data.references.length === 0 ? (
            <EmptyState
              title="Nenhuma referência capturada ainda"
              description="Instale a extensão PicPlus AI Capture no Chrome ou clique em Enviar Publicação para analisar posts, vídeos e áudios de concorrentes."
            />
          ) : (
            <RefGrid>
              {data.references.map((ref) => (
                <RefCard key={ref.id}>
                  <div className="head">
                    <div className="meta">
                      <StatusPill tone="info">{ref.platform}</StatusPill>
                      {ref.isViral && <StatusPill tone="success">Viral</StatusPill>}
                      {ref.authorHandle && <strong>{ref.authorHandle}</strong>}
                    </div>
                    {ref.sourceUrl && (
                      <a href={ref.sourceUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink size={14} />
                      </a>
                    )}
                  </div>

                  <div className="title">{ref.title || 'Publicação capturada'}</div>

                  {ref.mediaUrls.length > 0 && (
                    <div className="media-strip">
                      {ref.mediaUrls.map((url, idx) => {
                        const mime = ref.mediaTypes[idx] || '';
                        const fullUrl = assetUrl(url);
                        if (mime.startsWith('video/')) {
                          return <video key={url} src={fullUrl} controls preload="metadata" />;
                        }
                        if (mime.startsWith('audio/')) {
                          return <audio key={url} src={fullUrl} controls preload="metadata" />;
                        }
                        return <img key={url} src={fullUrl} alt={ref.title || 'Mídia capturada'} loading="lazy" />;
                      })}
                    </div>
                  )}

                  {ref.caption && <div className="caption">{ref.caption}</div>}

                  {ref.extractedHooks.length > 0 && (
                    <div className="hooks">
                      {ref.extractedHooks.map((hook) => (
                        <span key={hook} className="hook">
                          {hook}
                        </span>
                      ))}
                    </div>
                  )}

                  {ref.aiAnalysis && (
                    <div className="analysis">
                      <strong>Análise IA:</strong>
                      {'\n'}
                      {ref.aiAnalysis}
                      {ref.adaptedAngles ? `\n\nComo adaptar:\n${ref.adaptedAngles}` : ''}
                    </div>
                  )}

                  <div className="actions">
                    {canManage && (
                      <>
                        <Button
                          type="button"
                          size="sm"
                          variant={ref.isViral ? 'primary' : 'secondary'}
                          onClick={() => void handleToggleViral(ref)}
                        >
                          <Flame size={13} /> {ref.isViral ? 'Viral' : 'Marcar Viral'}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          loading={reanalyzingId === ref.id}
                          onClick={() => void handleReanalyze(ref)}
                        >
                          <RefreshCw size={13} /> Reanalisar
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeletingRef(ref)}
                        >
                          <Trash2 size={13} />
                        </Button>
                      </>
                    )}
                  </div>
                </RefCard>
              ))}
            </RefGrid>
          )}
        </>
      )}

      {subTab === 'trends' && (
        <>
          {canManage && (
            <Card as="form" onSubmit={handleRunResearch}>
              <h3>
                <span>
                  <Search size={16} style={{ verticalAlign: 'middle' }} /> Nova Investigação (Concorrentes, Trends & Sites)
                </span>
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <SelectField
                  label="Tipo de investigação"
                  value={kind}
                  onChange={(e) => setKind(e.target.value as ResearchReportKind)}
                  options={RESEARCH_KIND_OPTIONS}
                />
                <SelectField
                  label="Motor Gemini"
                  value={modelTier}
                  onChange={(e) => setModelTier(e.target.value as AiModelTier)}
                  options={MODEL_TIER_OPTIONS}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <TextField
                  label="Tema / Pergunta / Nicho"
                  required
                  placeholder="Ex: Trends de estética natural no Instagram em 2026 e objeções de preço"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                />
                <TextField
                  label="URL de site/LP concorrente para auditar"
                  placeholder="https://concorrente.com.br/oferta"
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                <Switch
                  label="Consultar Web em tempo real (Google Search Grounding)"
                  checked={useWebSearch}
                  onChange={setUseWebSearch}
                />
                <Button type="submit" loading={runningResearch}>
                  <Sparkles size={15} /> Executar Investigação
                </Button>
              </div>
            </Card>
          )}

          {data.reports.length === 0 ? (
            <EmptyState
              title="Nenhuma pesquisa executada ainda"
              description="Use o formulário acima para investigar tendências, sites concorrentes e mineração de copys."
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {data.reports.map((report) => {
                const isOpen = expandedReportId === report.id || data.reports[0]?.id === report.id;
                return (
                  <Card key={report.id}>
                    <h3>
                      <span>{report.topic}</span>
                      <span style={{ display: 'inline-flex', gap: '0.45rem', alignItems: 'center' }}>
                        <StatusPill tone="info">{report.kind}</StatusPill>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            setExpandedReportId((prev) =>
                              prev === report.id ? null : report.id,
                            )
                          }
                        >
                          {isOpen ? 'Recolher' : 'Ler relatório'}
                        </Button>
                        {canManage && (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => setDeletingReport(report)}
                          >
                            <Trash2 size={14} />
                          </Button>
                        )}
                      </span>
                    </h3>
                    <span style={{ fontSize: '0.78rem', opacity: 0.7 }}>
                      {report.model} · {formatDateTime(report.createdAt)}
                    </span>
                    {isOpen && (
                      <>
                        <MarkdownBox>
                          <Markdown>{report.rawMarkdown}</Markdown>
                        </MarkdownBox>
                        {report.sources && report.sources.length > 0 && (
                          <div style={{ fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <strong>Fontes consultadas:</strong>
                            {report.sources.map((s) => (
                              <a key={s.url} href={s.url} target="_blank" rel="noopener noreferrer">
                                {s.title || s.url} <ExternalLink size={11} />
                              </a>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {subTab === 'extension' && (
        <Card>
          <h3>
            <span>
              <Puzzle size={16} style={{ verticalAlign: 'middle' }} /> Extensão Chrome — PicPlus AI Capture
            </span>
          </h3>

          <p style={{ fontSize: '0.88rem', lineHeight: 1.55 }}>
            Com a extensão instalada no Chrome da equipe, basta navegar normalmente no Instagram, TikTok, YouTube ou no site do concorrente (usando sua própria conta logada) e clicar no ícone da PicPlus para enviar texto, imagens, vídeos e áudios direto para análise multimodal do Gemini.
          </p>

          {canManage && (
            <form
              onSubmit={handleCreateToken}
              style={{ display: 'flex', gap: '0.65rem', alignItems: 'flex-end', flexWrap: 'wrap' }}
            >
              <div style={{ flex: 1, minWidth: '220px' }}>
                <TextField
                  label="Nome do dispositivo / navegador"
                  required
                  value={tokenName}
                  onChange={(e) => setTokenName(e.target.value)}
                />
              </div>
              <Button type="submit" loading={creatingToken}>
                <KeyRound size={15} /> Gerar Token da Extensão
              </Button>
            </form>
          )}

          {revealedToken && (
            <TokenBanner>
              <strong>Copie este token agora (ele não será exibido novamente):</strong>
              <code>{revealedToken}</code>
              <div>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    void navigator.clipboard.writeText(revealedToken);
                    toast.success('Token copiado!');
                  }}
                >
                  <Copy size={14} /> Copiar Token
                </Button>
              </div>
            </TokenBanner>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <strong style={{ fontSize: '0.86rem' }}>
              Meus tokens ativos ({tokens?.length ?? 0})
            </strong>
            {(tokens ?? []).map((tok) => (
              <div
                key={tok.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.7rem 0.9rem',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <div>
                  <strong>{tok.name}</strong>{' '}
                  <span style={{ fontSize: '0.8rem', opacity: 0.75 }}>
                    ({tok.prefix}…) · Criado em {formatDateTime(tok.createdAt)}
                    {tok.lastUsedAt ? ` · Último uso: ${formatDateTime(tok.lastUsedAt)}` : ''}
                  </span>
                </div>
                {canManage && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      await revokeExtensionToken(tok.id);
                      reloadTokens();
                      toast.success('Token revogado.');
                    }}
                  >
                    Revogar
                  </Button>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      <Modal
        open={ingestOpen}
        onClose={() => setIngestOpen(false)}
        title="Enviar Publicação / Mídia para Análise"
        width="580px"
      >
        <form
          onSubmit={handleIngestManual}
          style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <SelectField
              label="Plataforma"
              value={refPlatform}
              onChange={(e) => setRefPlatform(e.target.value as ReferencePlatform)}
              options={REFERENCE_PLATFORM_OPTIONS}
            />
            <TextField
              label="@Perfil / Autor"
              placeholder="@concorrente"
              value={refHandle}
              onChange={(e) => setRefHandle(e.target.value)}
            />
          </div>
          <TextField
            label="Título curto"
            placeholder="Ex: Reel viral sobre mito de preço"
            value={refTitle}
            onChange={(e) => setRefTitle(e.target.value)}
          />
          <TextField
            label="URL da publicação"
            placeholder="https://instagram.com/reel/..."
            value={refUrl}
            onChange={(e) => setRefUrl(e.target.value)}
          />
          <TextArea
            label="Legenda / Copy / Transcrição"
            rows={4}
            value={refCaption}
            onChange={(e) => setRefCaption(e.target.value)}
          />
          <div>
            <label style={{ fontSize: '0.88rem', fontWeight: 700, display: 'block', marginBottom: '0.35rem' }}>
              Fotos, Vídeos ou Áudios (opcional)
            </label>
            <input
              type="file"
              multiple
              accept="image/*,video/*,audio/*"
              onChange={(e) => setRefFiles(e.target.files)}
            />
          </div>
          <Switch
            label="Marcar como Post Viral / Alta Performance"
            checked={refViral}
            onChange={setRefViral}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <Button type="button" variant="ghost" onClick={() => setIngestOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={uploadingRef}>
              <Plus size={15} /> Salvar e Analisar
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deletingRef}
        title="Excluir referência"
        confirmLabel="Excluir"
        message="Remover esta publicação e as mídias anexadas?"
        onCancel={() => setDeletingRef(null)}
        onConfirm={async () => {
          if (!deletingRef) return;
          await deleteReference(deletingRef.id);
          setDeletingRef(null);
          reload();
        }}
      />

      <ConfirmDialog
        open={!!deletingReport}
        title="Excluir relatório"
        confirmLabel="Excluir"
        message="Remover este relatório de pesquisa?"
        onCancel={() => setDeletingReport(null)}
        onConfirm={async () => {
          if (!deletingReport) return;
          await deleteResearchReport(deletingReport.id);
          setDeletingReport(null);
          reload();
        }}
      />
    </Wrap>
  );
}
