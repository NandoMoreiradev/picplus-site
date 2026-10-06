import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import styled from 'styled-components';
import { Check, Download, ExternalLink, Eye, MapPin, Pencil, Trash2, X } from 'lucide-react';
import {
  CellMain,
  DetailList,
  FormStack,
  IconButton,
  PageHeader,
  RowActions,
  StatusPill,
  Table,
  TableWrap,
  Tabs,
  Toolbar,
} from '../../components/admin/AdminUI';
import { UploadField } from '../../components/admin/UploadField';
import { Avatar } from '../../components/ui/Avatar';
import { Button, ButtonAnchor } from '../../components/ui/Button';
import { Alert, EmptyState, ErrorState, Skeleton } from '../../components/ui/Feedback';
import type { Tone } from '../../components/ui/Feedback';
import { CheckboxField, FormGrid, SelectField, Switch, TextArea, TextField } from '../../components/ui/Form';
import { SOCIAL_META } from '../../components/ui/icons';
import { ConfirmDialog, Modal } from '../../components/ui/Modal';
import { Pagination } from '../../components/ui/Pagination';
import { SearchInput } from '../../components/ui/SearchInput';
import { useToast } from '../../components/ui/Toast';
import { CoverImage } from '../../components/public/cards';
import { NICHES } from '../../config/site';
import { useAuth } from '../../context/auth-context';
import { useDebounce } from '../../hooks/useDebounce';
import { useFetch } from '../../hooks/useFetch';
import { usePage } from '../../hooks/usePage';
import { api, assetUrl } from '../../lib/api';
import { formatDateTime, formatShortDate, maskPhone } from '../../lib/format';
import type { AdminInfluencer, InfluencerList, InfluencerStatus, SocialNetwork } from '../../lib/types';
import { errorMessage } from '../../lib/validation';

type Tab = InfluencerStatus | 'ALL';

const STATUS: Record<InfluencerStatus, { label: string; tone: Tone }> = {
  PENDING: { label: 'Pendente', tone: 'warning' },
  APPROVED: { label: 'Aprovado', tone: 'success' },
  REJECTED: { label: 'Recusado', tone: 'danger' },
};

const SOCIAL_KEYS: SocialNetwork[] = ['instagram', 'tiktok', 'youtube', 'twitter', 'twitch'];

const DrawerHero = styled.div`
  margin: -1.5rem -1.5rem 0;

  .avatar {
    margin: -40px 0 0 1.5rem;
    width: fit-content;
    border-radius: 50%;
    border: 5px solid ${({ theme }) => theme.colors.surface};
    position: relative;
  }
`;

const DrawerBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding-top: 1rem;

  h3 {
    font-size: 1.5rem;
    font-weight: 800;
  }
  .meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.6rem;
    margin-top: 0.5rem;
  }
  h4 {
    font-size: 0.78rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: ${({ theme }) => theme.colors.textMuted};
    margin-bottom: 0.6rem;
  }
  .about {
    color: ${({ theme }) => theme.colors.textSecondary};
    white-space: pre-line;
  }
  .socials {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  .socials a {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    padding: 0.4rem 0.85rem;
    border: 1px solid ${({ theme }) => theme.colors.borderStrong};
    border-radius: ${({ theme }) => theme.radii.pill};
    font-size: 0.88rem;
    font-weight: 700;
  }
  .reason {
    padding: 0.9rem 1rem;
    background: ${({ theme }) => theme.colors.dangerSoft};
    border-left: 3px solid ${({ theme }) => theme.colors.danger};
    border-radius: ${({ theme }) => theme.radii.sm};
    white-space: pre-line;
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem;
  }
`;

const ChannelBox = styled.fieldset`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};

  legend {
    padding: 0 0.4rem;
    font-size: 0.9rem;
    font-weight: 700;
  }
`;

/* ── Aprovar ─────────────────────────────────────────── */

function ApproveDialog({
  influencer,
  onClose,
  onDone,
}: {
  influencer: AdminInfluencer;
  onClose: () => void;
  onDone: (updated: AdminInfluencer) => void;
}) {
  const toast = useToast();
  const [showOnShowcase, setShowOnShowcase] = useState(true);
  const [notify, setNotify] = useState(true);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      const result = await api.post<{ influencer: AdminInfluencer; emailSent: boolean }>(
        `/admin/influencers/${influencer.id}/approve`,
        { showOnShowcase, notify },
      );
      toast.success(`${influencer.name} foi aprovado(a).`);
      if (notify && !result.emailSent) {
        toast.error('O e-mail de aprovação não pôde ser enviado. Verifique a configuração do Resend.');
      }
      onDone(result.influencer);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Aprovar cadastro"
      description={influencer.name}
      width="480px"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancelar
          </Button>
          <Button onClick={submit} loading={busy}>
            <Check size={18} aria-hidden /> Aprovar
          </Button>
        </>
      }
    >
      <FormStack as="div">
        <Switch
          checked={showOnShowcase}
          onChange={setShowOnShowcase}
          label="Exibir na vitrine pública"
          description="O perfil aparecerá na página Nossos Parceiros."
        />
        <CheckboxField checked={notify} onChange={(e) => setNotify(e.target.checked)}>
          Enviar e-mail de aprovação para <strong>{influencer.email}</strong>
        </CheckboxField>
      </FormStack>
    </Modal>
  );
}

/* ── Recusar ─────────────────────────────────────────── */

function RejectDialog({
  influencer,
  onClose,
  onDone,
}: {
  influencer: AdminInfluencer;
  onClose: () => void;
  onDone: (updated: AdminInfluencer) => void;
}) {
  const toast = useToast();
  const [reason, setReason] = useState('');
  const [email, setEmail] = useState(true);
  const [whatsapp, setWhatsapp] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      const channels = [...(email ? ['email'] : []), ...(whatsapp ? ['whatsapp'] : [])];
      const result = await api.post<{ influencer: AdminInfluencer; emailSent: boolean; whatsappUrl: string | null }>(
        `/admin/influencers/${influencer.id}/reject`,
        { reason: reason.trim() || undefined, channels },
      );
      toast.success(`Cadastro de ${influencer.name} recusado.`);
      if (email && !result.emailSent) {
        toast.error('O e-mail não pôde ser enviado. Verifique a configuração do Resend.');
      }
      if (whatsapp) {
        if (result.whatsappUrl) window.open(result.whatsappUrl, '_blank', 'noopener,noreferrer');
        else toast.error('WhatsApp inválido ou ausente: não foi possível abrir a conversa.');
      }
      onDone(result.influencer);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Recusar cadastro"
      description={influencer.name}
      width="520px"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={submit} loading={busy}>
            <X size={18} aria-hidden /> Recusar
          </Button>
        </>
      }
    >
      <FormStack as="div">
        <TextArea
          label="Motivo da recusa"
          maxLength={1000}
          rows={4}
          placeholder="Explique brevemente o motivo. Ele será incluído na mensagem enviada."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          hint="Opcional — se vazio, a mensagem seguirá sem motivo."
        />
        <ChannelBox>
          <legend>Avisar o influenciador</legend>
          <CheckboxField checked={email} onChange={(e) => setEmail(e.target.checked)}>
            Por e-mail ({influencer.email})
          </CheckboxField>
          <CheckboxField
            checked={whatsapp}
            onChange={(e) => setWhatsapp(e.target.checked)}
            disabled={!influencer.whatsapp}
          >
            Por WhatsApp {influencer.whatsapp ? `· ${influencer.whatsapp}` : '(sem número cadastrado)'}
          </CheckboxField>
        </ChannelBox>
        {whatsapp && (
          <Alert tone="info">
            Ao confirmar, abriremos o WhatsApp com a mensagem pronta. Você só precisa clicar em enviar.
          </Alert>
        )}
      </FormStack>
    </Modal>
  );
}

/* ── Edição do perfil ────────────────────────────────── */

function EditForm({
  influencer,
  onCancel,
  onSaved,
}: {
  influencer: AdminInfluencer;
  onCancel: () => void;
  onSaved: (updated: AdminInfluencer) => void;
}) {
  const toast = useToast();
  const [form, setForm] = useState(() => ({
    name: influencer.name,
    whatsapp: influencer.whatsapp ?? '',
    niche: influencer.niche ?? '',
    location: influencer.location ?? '',
    description: influencer.description ?? '',
    profileImage: influencer.profileImage,
    coverImage: influencer.coverImage,
    presentationPdf: influencer.presentationPdf,
    socials: Object.fromEntries(SOCIAL_KEYS.map((key) => [key, influencer.socialNetworks?.[key] ?? ''])) as Record<
      SocialNetwork,
      string
    >,
  }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const body: Record<string, unknown> = {
        name: form.name.trim(),
        location: form.location.trim(),
        description: form.description.trim(),
        profileImage: form.profileImage,
        coverImage: form.coverImage,
        presentationPdf: form.presentationPdf,
        socialNetworks: Object.fromEntries(Object.entries(form.socials).filter(([, v]) => v.trim())),
      };
      if (form.whatsapp.trim()) body.whatsapp = form.whatsapp.trim();
      if (form.niche.trim()) body.niche = form.niche.trim();

      const updated = await api.patch<AdminInfluencer>(`/admin/influencers/${influencer.id}`, body);
      toast.success('Perfil atualizado.');
      onSaved(updated);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const nicheOptions = NICHES.includes(form.niche) || !form.niche ? NICHES : [form.niche, ...NICHES];

  return (
    <FormStack onSubmit={submit}>
      {error && <Alert tone="danger">{error}</Alert>}
      <FormGrid>
        <TextField label="Nome" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <TextField
          label="WhatsApp"
          value={form.whatsapp}
          onChange={(e) => setForm({ ...form, whatsapp: maskPhone(e.target.value) })}
        />
        <SelectField
          label="Nicho"
          placeholder="Selecione…"
          options={nicheOptions}
          value={form.niche}
          onChange={(e) => setForm({ ...form, niche: e.target.value })}
        />
        <TextField label="Cidade / UF" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
      </FormGrid>
      <TextArea
        label="Descrição"
        rows={5}
        maxLength={1200}
        value={form.description}
        onChange={(e) => setForm({ ...form, description: e.target.value })}
      />
      <FormGrid>
        {SOCIAL_KEYS.map((key) => (
          <TextField
            key={key}
            label={SOCIAL_META[key].label}
            value={form.socials[key]}
            onChange={(e) => setForm({ ...form, socials: { ...form.socials, [key]: e.target.value } })}
            placeholder="@usuario ou link"
          />
        ))}
      </FormGrid>
      <FormGrid>
        <UploadField label="Foto de perfil" shape="square" value={form.profileImage} onChange={(url) => setForm({ ...form, profileImage: url })} />
        <UploadField label="Imagem de capa" value={form.coverImage} onChange={(url) => setForm({ ...form, coverImage: url })} />
      </FormGrid>
      <UploadField
        label="Apresentação (PDF)"
        kind="pdf"
        value={form.presentationPdf}
        onChange={(url) => setForm({ ...form, presentationPdf: url })}
      />
      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
        <Button variant="ghost" onClick={onCancel} disabled={busy}>
          Cancelar
        </Button>
        <Button type="submit" loading={busy}>
          Salvar alterações
        </Button>
      </div>
    </FormStack>
  );
}

/* ── Drawer de detalhes ──────────────────────────────── */

function InfluencerDrawer({
  influencer,
  onClose,
  onChanged,
  onDeleted,
}: {
  influencer: AdminInfluencer;
  onClose: () => void;
  onChanged: (updated: AdminInfluencer) => void;
  onDeleted: () => void;
}) {
  const toast = useToast();
  const { can } = useAuth();
  const [mode, setMode] = useState<'view' | 'edit'>('view');
  const [dialog, setDialog] = useState<'approve' | 'reject' | 'delete' | null>(null);
  const [busy, setBusy] = useState(false);

  const status = STATUS[influencer.status];
  const socials = Object.entries(influencer.socialNetworks ?? {}) as [SocialNetwork, string][];
  const whatsappLink = influencer.whatsapp
    ? `https://wa.me/${influencer.whatsapp.replace(/\D/g, '').replace(/^(\d{10,11})$/, '55$1')}`
    : null;

  const toggleShowcase = async (show: boolean) => {
    setBusy(true);
    try {
      const updated = await api.patch<AdminInfluencer>(`/admin/influencers/${influencer.id}/showcase`, { show });
      onChanged(updated);
      toast.success(show ? 'Perfil exibido na vitrine.' : 'Perfil removido da vitrine.');
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await api.delete(`/admin/influencers/${influencer.id}`);
      toast.success('Cadastro excluído.');
      onDeleted();
    } catch (error) {
      toast.error(errorMessage(error));
      setBusy(false);
    }
  };

  return (
    <>
      <Modal
        open
        variant="drawer"
        onClose={onClose}
        title={mode === 'edit' ? 'Editar perfil' : 'Detalhes do cadastro'}
        description={mode === 'edit' ? influencer.name : undefined}
      >
        {mode === 'edit' ? (
          <EditForm
            influencer={influencer}
            onCancel={() => setMode('view')}
            onSaved={(updated) => {
              onChanged(updated);
              setMode('view');
            }}
          />
        ) : (
          <>
            <DrawerHero>
              <CoverImage src={influencer.coverImage ?? influencer.profileImage} alt="" ratio="16 / 6" />
              <div className="avatar">
                <Avatar src={influencer.profileImage} name={influencer.name} size={80} />
              </div>
            </DrawerHero>

            <DrawerBody>
              <div>
                <h3>{influencer.name}</h3>
                <div className="meta">
                  <StatusPill tone={status.tone}>{status.label}</StatusPill>
                  {influencer.status === 'APPROVED' && (
                    <StatusPill tone={influencer.showOnShowcase ? 'primary' : 'neutral'}>
                      {influencer.showOnShowcase ? 'Na vitrine' : 'Fora da vitrine'}
                    </StatusPill>
                  )}
                </div>
              </div>

              <div className="actions">
                {can('influencers.review') && influencer.status !== 'APPROVED' && (
                  <Button onClick={() => setDialog('approve')}>
                    <Check size={18} aria-hidden /> Aprovar
                  </Button>
                )}
                {can('influencers.review') && influencer.status !== 'REJECTED' && (
                  <Button variant="danger" onClick={() => setDialog('reject')}>
                    <X size={18} aria-hidden /> Recusar
                  </Button>
                )}
                {can('influencers.edit') && <Button variant="secondary" onClick={() => setMode('edit')}>
                  <Pencil size={16} aria-hidden /> Editar
                </Button>}
                {can('influencers.delete') && <Button variant="ghost" onClick={() => setDialog('delete')}>
                  <Trash2 size={16} aria-hidden /> Excluir
                </Button>}
              </div>

              {influencer.status === 'APPROVED' && (
                <Switch
                  checked={influencer.showOnShowcase}
                  onChange={toggleShowcase}
                  disabled={busy || !can('influencers.edit')}
                  label="Exibir na vitrine pública"
                  description="Controla se o perfil aparece em Nossos Parceiros."
                />
              )}

              {influencer.status === 'REJECTED' && (
                <div>
                  <h4>Motivo da recusa</h4>
                  <div className="reason">{influencer.rejectionReason ?? 'Nenhum motivo informado.'}</div>
                </div>
              )}

              <div>
                <h4>Informações</h4>
                <DetailList>
                  <dt>E-mail</dt>
                  <dd>
                    <a href={`mailto:${influencer.email}`}>{influencer.email}</a>
                  </dd>
                  <dt>WhatsApp</dt>
                  <dd>
                    {influencer.whatsapp ? (
                      <a href={whatsappLink ?? undefined} target="_blank" rel="noopener noreferrer">
                        {influencer.whatsapp} <ExternalLink size={12} aria-hidden />
                      </a>
                    ) : (
                      '—'
                    )}
                  </dd>
                  <dt>Nicho</dt>
                  <dd>{influencer.niche ?? '—'}</dd>
                  <dt>Localização</dt>
                  <dd>
                    {influencer.location ? (
                      <>
                        <MapPin size={13} aria-hidden /> {influencer.location}
                      </>
                    ) : (
                      '—'
                    )}
                  </dd>
                  <dt>Cadastro em</dt>
                  <dd>{formatDateTime(influencer.createdAt)}</dd>
                  {influencer.reviewedAt && (
                    <>
                      <dt>Analisado em</dt>
                      <dd>{formatDateTime(influencer.reviewedAt)}</dd>
                    </>
                  )}
                </DetailList>
              </div>

              {influencer.description && (
                <div>
                  <h4>Sobre</h4>
                  <p className="about">{influencer.description}</p>
                </div>
              )}

              {socials.length > 0 && (
                <div>
                  <h4>Redes sociais</h4>
                  <div className="socials">
                    {socials.map(([network, url]) => {
                      const { Icon, label } = SOCIAL_META[network];
                      return (
                        <a key={network} href={url} target="_blank" rel="noopener noreferrer">
                          <Icon size={16} /> {label}
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}

              {influencer.presentationPdf && (
                <div>
                  <h4>Apresentação</h4>
                  <ButtonAnchor
                    href={assetUrl(influencer.presentationPdf)}
                    target="_blank"
                    rel="noopener noreferrer"
                    $variant="secondary"
                    $size="sm"
                  >
                    <Download size={16} aria-hidden /> Abrir PDF
                  </ButtonAnchor>
                </div>
              )}
            </DrawerBody>
          </>
        )}
      </Modal>

      {dialog === 'approve' && (
        <ApproveDialog
          influencer={influencer}
          onClose={() => setDialog(null)}
          onDone={(updated) => {
            setDialog(null);
            onChanged(updated);
          }}
        />
      )}
      {dialog === 'reject' && (
        <RejectDialog
          influencer={influencer}
          onClose={() => setDialog(null)}
          onDone={(updated) => {
            setDialog(null);
            onChanged(updated);
          }}
        />
      )}
      <ConfirmDialog
        open={dialog === 'delete'}
        title="Excluir cadastro"
        message={
          <>
            Tem certeza que deseja excluir <strong>{influencer.name}</strong>? Imagens e PDF enviados também serão
            apagados. Esta ação não pode ser desfeita.
          </>
        }
        loading={busy}
        onConfirm={remove}
        onCancel={() => setDialog(null)}
      />
    </>
  );
}

/* ── Página ──────────────────────────────────────────── */

export function Influencers() {
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState<Tab>('PENDING');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<AdminInfluencer | null>(null);
  const debounced = useDebounce(search);
  const [page, setPage] = usePage(`${tab}|${debounced}`);

  const query = useMemo(
    () => ({ status: tab === 'ALL' ? undefined : tab, search: debounced.trim() || undefined, page, limit: 12 }),
    [tab, debounced, page],
  );
  const { data, loading, error, reload } = useFetch<InfluencerList>('/admin/influencers', query);

  // Atalho vindo do dashboard: /admin/influenciadores?abrir=<id>
  const openId = params.get('abrir');
  useEffect(() => {
    if (!openId) return;
    api
      .get<AdminInfluencer>(`/admin/influencers/${openId}`)
      .then((item) => setSelected(item))
      .catch(() => undefined)
      .finally(() => setParams({}, { replace: true }));
  }, [openId, setParams]);

  const counts = data?.counts;
  const total = counts ? counts.PENDING + counts.APPROVED + counts.REJECTED : undefined;
  const items = data?.items ?? [];

  const handleChanged = (updated: AdminInfluencer) => {
    setSelected(updated);
    reload();
  };

  return (
    <>
      <PageHeader
        title="Influenciadores"
        description="Analise os cadastros recebidos e gerencie quem aparece na vitrine."
      />

      <Toolbar>
        <Tabs<Tab>
          value={tab}
          onChange={setTab}
          tabs={[
            { key: 'PENDING', label: 'Pendentes', count: counts?.PENDING },
            { key: 'APPROVED', label: 'Aprovados', count: counts?.APPROVED },
            { key: 'REJECTED', label: 'Recusados', count: counts?.REJECTED },
            { key: 'ALL', label: 'Todos', count: total },
          ]}
        />
        <div className="grow">
          <SearchInput value={search} onChange={setSearch} label="Buscar" placeholder="Buscar por nome, e-mail ou nicho…" />
        </div>
      </Toolbar>

      {error ? (
        <ErrorState message={error.message} onRetry={reload} />
      ) : loading && !data ? (
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} $h="64px" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title="Nenhum cadastro encontrado"
          description={
            tab === 'PENDING' && !debounced ? 'Não há cadastros aguardando análise.' : 'Ajuste os filtros para ver outros resultados.'
          }
        />
      ) : (
        <>
          <TableWrap style={{ opacity: loading ? 0.6 : 1 }}>
            <Table>
              <thead>
                <tr>
                  <th>Influenciador</th>
                  <th>Nicho</th>
                  <th>Status</th>
                  <th>Vitrine</th>
                  <th>Cadastro</th>
                  <th className="right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="clickable" onClick={() => setSelected(item)}>
                    <td>
                      <CellMain>
                        <Avatar src={item.profileImage} name={item.name} size={42} />
                        <div>
                          <strong>{item.name}</strong>
                          <small>{item.email}</small>
                        </div>
                      </CellMain>
                    </td>
                    <td className="muted">{item.niche ?? '—'}</td>
                    <td>
                      <StatusPill tone={STATUS[item.status].tone}>{STATUS[item.status].label}</StatusPill>
                    </td>
                    <td>
                      {item.status === 'APPROVED' ? (
                        <StatusPill tone={item.showOnShowcase ? 'primary' : 'neutral'}>
                          {item.showOnShowcase ? 'Visível' : 'Oculto'}
                        </StatusPill>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td className="muted">{formatShortDate(item.createdAt)}</td>
                    <td className="right">
                      <RowActions>
                        <IconButton
                          label={`Ver ${item.name}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelected(item);
                          }}
                        >
                          <Eye size={18} />
                        </IconButton>
                      </RowActions>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </TableWrap>
          <Pagination page={page} totalPages={data?.meta.totalPages ?? 1} onChange={setPage} />
        </>
      )}

      {selected && (
        <InfluencerDrawer
          influencer={selected}
          onClose={() => setSelected(null)}
          onChanged={handleChanged}
          onDeleted={() => {
            setSelected(null);
            reload();
          }}
        />
      )}
    </>
  );
}
