import { useState } from 'react';
import styled from 'styled-components';
import {
  ArrowLeft,
  CheckCircle2,
  Code2,
  Download,
  ExternalLink,
  Eye,
  Globe,
  Monitor,
  Plus,
  RefreshCw,
  Smartphone,
  Sparkles,
  Tablet,
  Trash2,
  Users,
} from 'lucide-react';
import { useFetch } from '../../hooks/useFetch';
import { Panel, StatusPill, Table, TableWrap, Tabs } from '../admin/AdminUI';
import { Button } from '../ui/Button';
import { EmptyState, ErrorState, PageLoader } from '../ui/Feedback';
import { SelectField, TextArea, TextField } from '../ui/Form';
import { ConfirmDialog } from '../ui/Modal';
import { useToast } from '../ui/Toast';
import {
  deleteLandingPage,
  downloadLandingPageZip,
  generateLandingPage,
  iterateLandingPage,
  landingPagePublicUrl,
  LP_VISUAL_STYLE_OPTIONS,
  MODEL_TIER_OPTIONS,
  updateLandingPage,
  verifyLandingPageDomain,
} from '../../lib/clientAi';
import type {
  AiModelTier,
  LandingPageDetail,
  LandingPageStatus,
  LandingPageSummary,
  LpVisualStyle,
} from '../../lib/clientAi';
import { formatDateTime } from '../../lib/format';
import type { ClientSummary } from '../../lib/types';
import { errorMessage } from '../../lib/validation';

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(310px, 1fr));
  gap: 1rem;
`;

const LpCard = styled(Panel)`
  padding: 1.15rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;

  .head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 0.5rem;
  }
  .title {
    font-weight: 800;
    font-size: 1rem;
    line-height: 1.3;
  }
  .meta {
    font-size: 0.8rem;
    color: ${({ theme }) => theme.colors.textMuted};
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.45rem;
    margin-top: auto;
    padding-top: 0.5rem;
    border-top: 1px solid ${({ theme }) => theme.colors.border};
  }
`;

const StudioHeader = styled(Panel)`
  padding: 1rem 1.25rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.85rem;

  .left {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    flex-wrap: wrap;
  }
  .right {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
`;

const PreviewShell = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
`;

const ViewportBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.75rem;

  .devices {
    display: inline-flex;
    gap: 0.35rem;
  }
`;

const FrameStage = styled.div`
  background: ${({ theme }) => theme.colors.background};
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: 0.75rem;
  display: flex;
  justify-content: center;
  overflow: auto;

  iframe {
    border: 1px solid ${({ theme }) => theme.colors.border};
    border-radius: ${({ theme }) => theme.radii.md};
    background: #ffffff;
    height: 620px;
    transition: width 0.2s ease;
  }
`;

const IterateForm = styled.form`
  display: flex;
  gap: 0.65rem;
  align-items: flex-end;
  flex-wrap: wrap;

  > div:first-child {
    flex: 1;
    min-width: 260px;
  }
`;

const DnsBox = styled.div`
  padding: 1rem;
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.colors.background};
  border: 1px solid ${({ theme }) => theme.colors.border};
  font-size: 0.85rem;
  line-height: 1.55;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;

  code {
    background: ${({ theme }) => theme.colors.surfaceHover};
    padding: 0.15rem 0.4rem;
    border-radius: ${({ theme }) => theme.radii.sm};
    font-size: 0.82rem;
  }
`;

const STATUS_LABEL: Record<LandingPageStatus, { label: string; tone: 'success' | 'warning' | 'neutral' }> = {
  PUBLISHED: { label: 'Publicada', tone: 'success' },
  DRAFT: { label: 'Rascunho', tone: 'warning' },
  ARCHIVED: { label: 'Arquivada', tone: 'neutral' },
};

interface Props {
  fixedClientId?: string | null;
  fixedProjectId?: string | null;
  canManage: boolean;
}

export function LandingPageStudio({
  fixedClientId,
  fixedProjectId,
  canManage,
}: Props) {
  const toast = useToast();
  const [mode, setMode] = useState<'list' | 'create' | 'studio'>('list');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [studioTab, setStudioTab] = useState<'preview' | 'code' | 'domain' | 'leads'>('preview');
  const [viewport, setViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');

  const {
    data: pages,
    loading: loadingList,
    error: listError,
    reload: reloadList,
  } = useFetch<LandingPageSummary[]>('/admin/ai-studio/landing-pages', {
    clientId: fixedClientId ?? undefined,
    projectId: fixedProjectId ?? undefined,
  });

  const { data: clientsRes } = useFetch<{ items: ClientSummary[] }>(
    !fixedClientId && mode === 'create' ? '/admin/clients?limit=100' : null,
  );

  const {
    data: activeLp,
    loading: loadingDetail,
    error: detailError,
    reload: reloadDetail,
  } = useFetch<LandingPageDetail>(
    mode === 'studio' && activeId
      ? `/admin/ai-studio/landing-pages/${activeId}`
      : null,
  );

  // Form criação
  const [selectedClientId, setSelectedClientId] = useState(fixedClientId ?? '');
  const [title, setTitle] = useState('');
  const [objective, setObjective] = useState('');
  const [offer, setOffer] = useState('');
  const [ctaText, setCtaText] = useState('Quero falar com um especialista');
  const [visualStyle, setVisualStyle] = useState<LpVisualStyle>('MODERN_DARK');
  const [extraInstructions, setExtraInstructions] = useState('');
  const [modelTier, setModelTier] = useState<AiModelTier>('pro');
  const [generating, setGenerating] = useState(false);

  // Edição dentro do Studio
  const [iteratePrompt, setIteratePrompt] = useState('');
  const [iterating, setIterating] = useState(false);
  const [htmlDraft, setHtmlDraft] = useState<string | null>(null);
  const [slugDraft, setSlugDraft] = useState<string | null>(null);
  const [metaTitleDraft, setMetaTitleDraft] = useState<string | null>(null);
  const [metaDescDraft, setMetaDescDraft] = useState<string | null>(null);
  const [domainDraft, setDomainDraft] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [verifyingDns, setVerifyingDns] = useState(false);
  const [dnsInfo, setDnsInfo] = useState<{
    expectedTarget: string;
    resolvedRecords: string[];
    errorMessage: string | null;
  } | null>(null);
  const [deleting, setDeleting] = useState<LandingPageSummary | null>(null);

  const openStudio = (id: string) => {
    setActiveId(id);
    setStudioTab('preview');
    setHtmlDraft(null);
    setSlugDraft(null);
    setMetaTitleDraft(null);
    setMetaDescDraft(null);
    setDomainDraft(null);
    setDnsInfo(null);
    setMode('studio');
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    try {
      const res = await generateLandingPage({
        clientId: fixedClientId ?? (selectedClientId || null),
        projectId: fixedProjectId ?? null,
        title: title.trim() || undefined,
        objective: objective.trim(),
        offer: offer.trim() || undefined,
        ctaText: ctaText.trim() || undefined,
        visualStyle,
        extraInstructions: extraInstructions.trim() || undefined,
        modelTier,
      });
      toast.success('Landing Page gerada com Gemini!');
      reloadList();
      openStudio(res.landingPage.id);
    } catch (err) {
      toast.error(errorMessage(err, 'Erro ao gerar Landing Page.'));
    } finally {
      setGenerating(false);
    }
  };

  const handleIterate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeLp || !iteratePrompt.trim()) return;
    setIterating(true);
    try {
      await iterateLandingPage(activeLp.id, {
        instruction: iteratePrompt.trim(),
        modelTier,
      });
      setIteratePrompt('');
      setHtmlDraft(null);
      reloadDetail();
      toast.success('Página atualizada pela IA!');
    } catch (err) {
      toast.error(errorMessage(err, 'Erro ao editar Landing Page com IA.'));
    } finally {
      setIterating(false);
    }
  };

  const savePatch = async (
    patch: Parameters<typeof updateLandingPage>[1],
    successMsg = 'Alterações salvas!',
  ) => {
    if (!activeLp) return;
    setSaving(true);
    try {
      await updateLandingPage(activeLp.id, patch);
      setHtmlDraft(null);
      setSlugDraft(null);
      setMetaTitleDraft(null);
      setMetaDescDraft(null);
      setDomainDraft(null);
      reloadDetail();
      reloadList();
      toast.success(successMsg);
    } catch (err) {
      toast.error(errorMessage(err, 'Não foi possível salvar.'));
    } finally {
      setSaving(false);
    }
  };

  const handleVerifyDns = async () => {
    if (!activeLp) return;
    setVerifyingDns(true);
    try {
      const res = await verifyLandingPageDomain(activeLp.id);
      setDnsInfo({
        expectedTarget: res.expectedTarget,
        resolvedRecords: res.resolvedRecords,
        errorMessage: res.errorMessage,
      });
      reloadDetail();
      if (res.verified) {
        toast.success(`Domínio ${res.customDomain} verificado!`);
      } else {
        toast.error(res.errorMessage || 'DNS ainda não apontado.');
      }
    } catch (err) {
      toast.error(errorMessage(err, 'Falha ao verificar DNS.'));
    } finally {
      setVerifyingDns(false);
    }
  };

  const handleDownloadHtml = (lp: LandingPageDetail) => {
    const blob = new Blob([htmlDraft ?? lp.htmlContent], {
      type: 'text/html;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${lp.slug}.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await deleteLandingPage(deleting.id);
      toast.success('Landing Page removida.');
      if (activeId === deleting.id) {
        setActiveId(null);
        setMode('list');
      }
      setDeleting(null);
      reloadList();
    } catch (err) {
      toast.error(errorMessage(err, 'Erro ao excluir Landing Page.'));
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
            <ArrowLeft size={15} /> Voltar
          </Button>
          <strong>Criar Landing Page com Gemini</strong>
        </div>

        <Panel style={{ padding: '1.35rem' }}>
          <form
            onSubmit={handleGenerate}
            style={{ display: 'flex', flexDirection: 'column', gap: '0.95rem' }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: fixedClientId ? '1fr 1fr' : '1fr 1fr 1fr',
                gap: '0.75rem',
              }}
            >
              {!fixedClientId && (
                <SelectField
                  label="Cliente (Brand Book)"
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  options={[
                    { value: '', label: 'Sem cliente específico' },
                    ...(clientsRes?.items ?? []).map((c) => ({
                      value: c.id,
                      label: c.tradeName,
                    })),
                  ]}
                />
              )}
              <SelectField
                label="Estilo visual"
                value={visualStyle}
                onChange={(e) => setVisualStyle(e.target.value as LpVisualStyle)}
                options={LP_VISUAL_STYLE_OPTIONS}
              />
              <SelectField
                label="Motor Gemini"
                value={modelTier}
                onChange={(e) => setModelTier(e.target.value as AiModelTier)}
                options={MODEL_TIER_OPTIONS}
              />
            </div>

            <TextField
              label="Título interno / Página"
              placeholder="Ex: Campanha Lentes de Contato — Captura WhatsApp"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

            <TextArea
              label="Objetivo principal da Landing Page"
              required
              rows={2}
              placeholder="Ex: Captar leads qualificados para avaliação estética gratuita com foco em naturalidade..."
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
            />

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '0.75rem',
              }}
            >
              <TextField
                label="Oferta / Diferencial"
                placeholder="Ex: Planejamento digital 3D + condições especiais"
                value={offer}
                onChange={(e) => setOffer(e.target.value)}
              />
              <TextField
                label="Texto do botão CTA"
                value={ctaText}
                onChange={(e) => setCtaText(e.target.value)}
              />
            </div>

            <TextArea
              label="Instruções extras (seções, cores, referências)"
              rows={2}
              placeholder="Ex: Incluir FAQ com 4 perguntas, destacar atendimento humanizado e paleta verde oliva..."
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
                <Sparkles size={15} /> Gerar Landing Page
              </Button>
            </div>
          </form>
        </Panel>
      </Wrap>
    );
  }

  if (mode === 'studio' && activeId) {
    if (loadingDetail) return <PageLoader label="Carregando Landing Page…" />;
    if (detailError || !activeLp) {
      return (
        <ErrorState
          message={detailError?.message ?? 'Erro ao carregar Landing Page.'}
          onRetry={reloadDetail}
        />
      );
    }

    const currentHtml = htmlDraft ?? activeLp.htmlContent;
    const publicUrl = landingPagePublicUrl(activeLp.slug);
    const frameWidth =
      viewport === 'mobile' ? '375px' : viewport === 'tablet' ? '768px' : '100%';

    return (
      <Wrap>
        <StudioHeader>
          <div className="left">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setMode('list')}
            >
              <ArrowLeft size={15} /> Lista
            </Button>
            <strong style={{ fontSize: '1.05rem' }}>{activeLp.title}</strong>
            <StatusPill tone={STATUS_LABEL[activeLp.status].tone}>
              {STATUS_LABEL[activeLp.status].label}
            </StatusPill>
            {activeLp.customDomain && (
              <StatusPill tone={activeLp.domainVerified ? 'success' : 'warning'}>
                <Globe size={12} /> {activeLp.customDomain}
              </StatusPill>
            )}
          </div>

          <div className="right">
            {activeLp.status === 'PUBLISHED' && (
              <a
                href={publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: '0.84rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
              >
                Abrir publicada <ExternalLink size={14} />
              </a>
            )}
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => void downloadLandingPageZip(activeLp.id, activeLp.slug)}
            >
              <Download size={14} /> Baixar ZIP
            </Button>
            {canManage && (
              <Button
                type="button"
                size="sm"
                loading={saving}
                onClick={() =>
                  void savePatch(
                    {
                      status:
                        activeLp.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED',
                    },
                    activeLp.status === 'PUBLISHED'
                      ? 'Landing Page movida para rascunho.'
                      : 'Landing Page publicada!',
                  )
                }
              >
                {activeLp.status === 'PUBLISHED' ? 'Despublicar' : 'Publicar'}
              </Button>
            )}
          </div>
        </StudioHeader>

        <Tabs
          value={studioTab}
          onChange={setStudioTab}
          tabs={[
            { key: 'preview', label: 'Preview & Ajustes IA' },
            { key: 'code', label: 'Código HTML' },
            { key: 'domain', label: 'Hospedagem, Domínio & Exportar' },
            { key: 'leads', label: `Leads (${activeLp._count.leads})` },
          ]}
        />

        {studioTab === 'preview' && (
          <PreviewShell>
            {canManage && (
              <Panel style={{ padding: '1rem' }}>
                <IterateForm onSubmit={handleIterate}>
                  <TextField
                    label="Editar página conversando com a IA"
                    placeholder="Ex: Deixe o hero com botão maior, adicione 3 depoimentos e mude a paleta para azul marinho..."
                    value={iteratePrompt}
                    onChange={(e) => setIteratePrompt(e.target.value)}
                  />
                  <Button type="submit" loading={iterating}>
                    <Sparkles size={15} /> Aplicar com IA
                  </Button>
                </IterateForm>
              </Panel>
            )}

            <ViewportBar>
              <div className="devices">
                <Button
                  type="button"
                  size="sm"
                  variant={viewport === 'desktop' ? 'primary' : 'secondary'}
                  onClick={() => setViewport('desktop')}
                >
                  <Monitor size={14} /> Desktop
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={viewport === 'tablet' ? 'primary' : 'secondary'}
                  onClick={() => setViewport('tablet')}
                >
                  <Tablet size={14} /> Tablet
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={viewport === 'mobile' ? 'primary' : 'secondary'}
                  onClick={() => setViewport('mobile')}
                >
                  <Smartphone size={14} /> Mobile
                </Button>
              </div>
              <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>
                {activeLp.viewsCount} visualizações · {activeLp._count.leads} leads
              </span>
            </ViewportBar>

            <FrameStage>
              <iframe
                title={`Preview ${activeLp.title}`}
                srcDoc={currentHtml}
                sandbox="allow-scripts allow-forms"
                style={{ width: frameWidth }}
              />
            </FrameStage>
          </PreviewShell>
        )}

        {studioTab === 'code' && (
          <Panel style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <TextArea
              label="HTML5 Completo"
              rows={22}
              disabled={!canManage}
              value={currentHtml}
              onChange={(e) => setHtmlDraft(e.target.value)}
              style={{ fontFamily: 'monospace', fontSize: '0.82rem' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
              <Button
                type="button"
                variant="secondary"
                onClick={() => handleDownloadHtml(activeLp)}
              >
                <Code2 size={15} /> Baixar {activeLp.slug}.html
              </Button>
              {canManage && (
                <Button
                  type="button"
                  loading={saving}
                  onClick={() => void savePatch({ htmlContent: currentHtml })}
                >
                  Salvar HTML
                </Button>
              )}
            </div>
          </Panel>
        )}

        {studioTab === 'domain' && (
          <Panel style={{ padding: '1.35rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
              <TextField
                label="Slug na PicPlus (/lp/:slug)"
                disabled={!canManage}
                value={slugDraft ?? activeLp.slug}
                onChange={(e) => setSlugDraft(e.target.value)}
              />
              <TextField
                label="Domínio personalizado do cliente"
                disabled={!canManage}
                placeholder="Ex: lp.suamarca.com.br"
                value={domainDraft ?? activeLp.customDomain ?? ''}
                onChange={(e) => setDomainDraft(e.target.value)}
              />
            </div>

            <TextField
              label="Meta Title (SEO / WhatsApp)"
              disabled={!canManage}
              value={metaTitleDraft ?? activeLp.metaTitle ?? ''}
              onChange={(e) => setMetaTitleDraft(e.target.value)}
            />

            <TextArea
              label="Meta Description (SEO)"
              rows={2}
              disabled={!canManage}
              value={metaDescDraft ?? activeLp.metaDescription ?? ''}
              onChange={(e) => setMetaDescDraft(e.target.value)}
            />

            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.6rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {canManage && activeLp.customDomain && (
                  <Button
                    type="button"
                    variant="secondary"
                    loading={verifyingDns}
                    onClick={() => void handleVerifyDns()}
                  >
                    <RefreshCw size={15} /> Verificar DNS
                  </Button>
                )}
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => void downloadLandingPageZip(activeLp.id, activeLp.slug)}
                >
                  <Download size={15} /> Exportar ZIP (GitHub / Vercel / cPanel)
                </Button>
              </div>
              {canManage && (
                <Button
                  type="button"
                  loading={saving}
                  onClick={() =>
                    void savePatch({
                      slug: slugDraft ?? activeLp.slug,
                      customDomain:
                        domainDraft !== null
                          ? domainDraft.trim() || null
                          : activeLp.customDomain,
                      metaTitle: metaTitleDraft ?? activeLp.metaTitle,
                      metaDescription: metaDescDraft ?? activeLp.metaDescription,
                    })
                  }
                >
                  Salvar configurações
                </Button>
              )}
            </div>

            <DnsBox>
              <strong>Como conectar o domínio próprio do cliente:</strong>
              <span>
                1. No provedor de DNS do cliente (Cloudflare, Registro.br, GoDaddy), crie um registro{' '}
                <code>CNAME</code> apontando{' '}
                <code>{activeLp.customDomain || 'lp.cliente.com.br'}</code> para{' '}
                <code>{dnsInfo?.expectedTarget || new URL(landingPagePublicUrl(activeLp.slug)).hostname}</code>.
              </span>
              <span>
                2. Adicione o domínio nas configurações de Custom Domain do serviço backend no Railway (para emissão automática do certificado SSL) e clique em <strong>Verificar DNS</strong>.
              </span>
              {activeLp.domainVerified && (
                <span style={{ color: '#22c55e', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                  <CheckCircle2 size={15} /> Domínio verificado e pronto para tráfego!
                </span>
              )}
              {(dnsInfo?.errorMessage || activeLp.domainVerificationError) && !activeLp.domainVerified && (
                <span style={{ color: '#f59e0b' }}>
                  Status DNS: {dnsInfo?.errorMessage || activeLp.domainVerificationError}
                </span>
              )}
            </DnsBox>
          </Panel>
        )}

        {studioTab === 'leads' && (
          <Panel style={{ padding: '1.25rem' }}>
            {activeLp.leads.length === 0 ? (
              <EmptyState
                title="Nenhum lead capturado ainda"
                description="Quando visitantes preencherem o formulário da página (hospedada aqui ou no pacote ZIP exportado), os contatos aparecerão aqui."
              />
            ) : (
              <TableWrap>
                <Table>
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>E-mail</th>
                      <th>Telefone / WhatsApp</th>
                      <th>Mensagem</th>
                      <th>UTM</th>
                      <th>Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeLp.leads.map((lead) => (
                      <tr key={lead.id}>
                        <td><strong>{lead.name || '—'}</strong></td>
                        <td>{lead.email || '—'}</td>
                        <td>{lead.phone || '—'}</td>
                        <td>{lead.message || '—'}</td>
                        <td>
                          {[lead.utmSource, lead.utmMedium, lead.utmCampaign]
                            .filter(Boolean)
                            .join(' / ') || '—'}
                        </td>
                        <td>{formatDateTime(lead.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </TableWrap>
            )}
          </Panel>
        )}
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
        <span style={{ fontSize: '0.9rem', opacity: 0.85 }}>
          Crie Landing Pages com Gemini, publique na PicPlus com domínio próprio ou exporte o ZIP para hospedar onde quiser.
        </span>
        {canManage && (
          <Button type="button" size="sm" onClick={() => setMode('create')}>
            <Plus size={15} /> Nova Landing Page com IA
          </Button>
        )}
      </div>

      {loadingList ? (
        <PageLoader label="Carregando Landing Pages…" />
      ) : listError ? (
        <ErrorState message={listError.message} onRetry={reloadList} />
      ) : !pages || pages.length === 0 ? (
        <EmptyState
          title="Nenhuma Landing Page criada"
          description="Use a IA do Gemini para gerar uma página completa de captura ou vendas em segundos."
        />
      ) : (
        <Grid>
          {pages.map((lp) => (
            <LpCard key={lp.id}>
              <div className="head">
                <span className="title">{lp.title}</span>
                <StatusPill tone={STATUS_LABEL[lp.status].tone}>
                  {STATUS_LABEL[lp.status].label}
                </StatusPill>
              </div>
              <div className="meta">
                <span>Slug: /lp/{lp.slug}</span>
                {lp.client && <span>Cliente: {lp.client.tradeName}</span>}
                {lp.customDomain && (
                  <span>
                    Domínio: {lp.customDomain}{' '}
                    {lp.domainVerified ? '(Verificado)' : '(Pendente)'}
                  </span>
                )}
                <span>
                  <Eye size={12} style={{ verticalAlign: 'middle' }} /> {lp.viewsCount} views ·{' '}
                  <Users size={12} style={{ verticalAlign: 'middle' }} /> {lp._count.leads} leads
                </span>
              </div>
              <div className="actions">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => openStudio(lp.id)}
                >
                  Abrir Studio
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => void downloadLandingPageZip(lp.id, lp.slug)}
                  aria-label={`Exportar ZIP de ${lp.title}`}
                >
                  <Download size={14} />
                </Button>
                {canManage && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setDeleting(lp)}
                    aria-label={`Excluir ${lp.title}`}
                  >
                    <Trash2 size={14} />
                  </Button>
                )}
              </div>
            </LpCard>
          ))}
        </Grid>
      )}

      <ConfirmDialog
        open={!!deleting}
        title="Excluir Landing Page"
        confirmLabel="Excluir"
        message={
          <>
            Deseja excluir <strong>{deleting?.title}</strong> e todos os leads capturados nela?
          </>
        }
        onCancel={() => setDeleting(null)}
        onConfirm={() => void handleDelete()}
      />
    </Wrap>
  );
}
