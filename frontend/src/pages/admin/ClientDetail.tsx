import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import styled from 'styled-components';
import {
  ArrowLeft,
  Copy,
  DollarSign,
  ExternalLink,
  FileText,
  Mail,
  Pencil,
  Phone,
  Plus,
  QrCode,
  RefreshCw,
  Search,
  Send,
} from 'lucide-react';
import {
  CellMain,
  DetailList,
  PageHeader,
  Panel,
  StatusPill,
  Table,
  TableWrap,
  Tabs,
} from '../../components/admin/AdminUI';
import { Button, ButtonAnchor } from '../../components/ui/Button';
import { EmptyState, ErrorState, PageLoader } from '../../components/ui/Feedback';
import type { Tone } from '../../components/ui/Feedback';
import { CurrencyField, SelectField, Switch, TextArea, TextField } from '../../components/ui/Form';
import { WhatsAppIcon } from '../../components/ui/icons';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../context/auth-context';
import { useFetch } from '../../hooks/useFetch';
import { api } from '../../lib/api';
import {
  formatCents,
  formatDateTime,
  formatDateOnly,
  maskCnpjCpf,
  maskPhone,
  parseBRLToCents,
} from '../../lib/format';
import type {
  ChargeBillingType,
  ChargeStatus,
  ClientCharge,
  ClientDetail as ClientDetailType,
  ClientStatus,
  ContractType,
} from '../../lib/types';
import { errorMessage } from '../../lib/validation';

type TabKey = 'OVERVIEW' | 'PROJECTS' | 'FINANCIAL' | 'NOTES';

const STATUS_CONFIG: Record<ClientStatus, { label: string; tone: Tone }> = {
  ACTIVE: { label: 'Ativo', tone: 'success' },
  PROSPECT: { label: 'Prospect', tone: 'warning' },
  ONBOARDING: { label: 'Onboarding', tone: 'info' },
  PAUSED: { label: 'Pausado', tone: 'neutral' },
  CHURNED: { label: 'Cancelado', tone: 'danger' },
};

const CHARGE_STATUS_CONFIG: Record<ChargeStatus, { label: string; tone: Tone }> = {
  PENDING: { label: 'Pendente', tone: 'warning' },
  RECEIVED: { label: 'Recebido', tone: 'success' },
  CONFIRMED: { label: 'Confirmado', tone: 'success' },
  OVERDUE: { label: 'Vencido', tone: 'danger' },
  REFUNDED: { label: 'Estornado', tone: 'neutral' },
  CANCELED: { label: 'Cancelado', tone: 'neutral' },
};

const CONTRACT_CONFIG: Record<ContractType, string> = {
  RETAINER_FEE: 'Fee Mensal (Recorrente)',
  FIXED_SCOPE: 'Projeto Fechado',
  ON_DEMAND: 'Por Demanda / Horas',
};

const BackLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 0.88rem;
  font-weight: 700;
  margin-bottom: 1rem;
  transition: color ${({ theme }) => theme.transitions.fast};

  &:hover {
    color: ${({ theme }) => theme.colors.primary};
  }
`;

const ContentGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 340px;
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
  gap: 1.25rem;

  h3 {
    font-size: 1rem;
    font-weight: 800;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    border-bottom: 1px solid ${({ theme }) => theme.colors.border};
    padding-bottom: 0.75rem;
    margin-bottom: 0.25rem;
  }
`;

const ContactCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  padding: 1rem;
  background: ${({ theme }) => theme.colors.background};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};

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
  .role {
    font-size: 0.8rem;
    color: ${({ theme }) => theme.colors.textMuted};
  }
  .row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.85rem;
    color: ${({ theme }) => theme.colors.textSecondary};
  }
`;

const NoteItem = styled.div`
  padding: 1rem;
  background: ${({ theme }) => theme.colors.background};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  display: flex;
  flex-direction: column;
  gap: 0.5rem;

  .note-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 0.78rem;
    color: ${({ theme }) => theme.colors.textMuted};
  }
  .note-content {
    white-space: pre-line;
    line-height: 1.6;
    font-size: 0.92rem;
  }
`;

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1rem;
`;

const SectionTitle = styled.h4`
  font-size: 0.82rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.primary};
  margin: 1.2rem 0 0.6rem;
  grid-column: 1 / -1;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  padding-bottom: 0.4rem;
`;

interface MunicipalServiceItem {
  id: string;
  description: string;
  issTax?: number;
  municipalServiceCode?: string;
}

interface MunicipalServicesResponse {
  services: MunicipalServiceItem[];
  defaultMunicipalService: {
    id: string | null;
    code: string | null;
    name: string | null;
  };
}

const whatsappLink = (phone: string, name: string) => {
  let digits = phone.replace(/\D/g, '');
  if (digits.length <= 11) digits = `55${digits}`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(`Olá, ${name}! Aqui é da equipe PicPlus.`)}`;
};

export function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const { can } = useAuth();
  const canFinancial = can('clients.financial');
  const canEdit = can('clients.edit');

  const { data: client, loading, error, reload } = useFetch<ClientDetailType>(
    id ? `/admin/clients/${id}` : null,
  );

  const [activeTab, setActiveTab] = useState<TabKey>('OVERVIEW');

  // Modais de Cobrança
  const [chargeModalOpen, setChargeModalOpen] = useState(false);
  const [chargeDescription, setChargeDescription] = useState('');
  const [chargeValueInput, setChargeValueInput] = useState('');
  const [chargeDueDate, setChargeDueDate] = useState('');
  const [chargeBillingType, setChargeBillingType] = useState<ChargeBillingType>('PIX');
  const [chargeKind, setChargeKind] = useState<'SINGLE' | 'RECURRENT' | 'INSTALLMENT'>('SINGLE');
  const [chargeCycle, setChargeCycle] = useState<'MONTHLY' | 'BIMONTHLY' | 'QUARTERLY' | 'SEMIANNUALLY' | 'YEARLY'>('MONTHLY');
  const [chargeInstallments, setChargeInstallments] = useState(2);
  const [chargeEmitInvoice, setChargeEmitInvoice] = useState(false);
  const [chargeInvoiceDesc, setChargeInvoiceDesc] = useState('');
  const [creatingCharge, setCreatingCharge] = useState(false);

  // Modal de Emissão manual de NFS-e para cobrança existente
  const [invoiceModalCharge, setInvoiceModalCharge] = useState<ClientCharge | null>(null);
  const [invoiceCustomDesc, setInvoiceCustomDesc] = useState('');
  const [emittingInvoice, setEmittingInvoice] = useState(false);
  const [syncingInvoiceId, setSyncingInvoiceId] = useState<string | null>(null);

  // Serviço municipal para NFS-e (carregado sob demanda do Asaas)
  const [municipalServices, setMunicipalServices] = useState<MunicipalServiceItem[]>([]);
  const [municipalServicesLoaded, setMunicipalServicesLoaded] = useState(false);
  const [loadingMunicipalServices, setLoadingMunicipalServices] = useState(false);
  const [defaultMunicipalService, setDefaultMunicipalService] = useState<{
    id: string | null;
    code: string | null;
    name: string | null;
  }>({ id: null, code: null, name: null });
  const [selectedMunicipalServiceId, setSelectedMunicipalServiceId] = useState('');
  const [manualMunicipalCode, setManualMunicipalCode] = useState('');
  const [manualMunicipalName, setManualMunicipalName] = useState('');

  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactRole, setContactRole] = useState('');
  const [contactIsFinancial, setContactIsFinancial] = useState(false);
  const [savingContact, setSavingContact] = useState(false);

  const [newNoteContent, setNewNoteContent] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  const [pixModalData, setPixModalData] = useState<{ payload: string; qrCodeUrl: string } | null>(null);

  // Edição do Cliente e Parâmetros de Contrato
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    corporateName: '',
    tradeName: '',
    cnpjCpf: '',
    segment: '',
    website: '',
    status: 'ACTIVE' as ClientStatus,
    contractType: 'RETAINER_FEE' as ContractType,
    monthlyFeeCents: 0,
    dueDay: 10,
    postalCode: '',
    address: '',
    addressNumber: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
  });
  const [editMonthlyFeeInput, setEditMonthlyFeeInput] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [searchingCep, setSearchingCep] = useState(false);

  const handleOpenEdit = () => {
    if (!client) return;
    setEditForm({
      corporateName: client.corporateName || '',
      tradeName: client.tradeName || '',
      cnpjCpf: maskCnpjCpf(client.cnpjCpf || ''),
      segment: client.segment || '',
      website: client.website || '',
      status: client.status || 'ACTIVE',
      contractType: client.contractType || 'RETAINER_FEE',
      monthlyFeeCents: client.monthlyFeeCents || 0,
      dueDay: client.dueDay || 10,
      postalCode: client.postalCode || '',
      address: client.address || '',
      addressNumber: client.addressNumber || '',
      complement: client.complement || '',
      neighborhood: client.neighborhood || '',
      city: client.city || '',
      state: client.state || '',
    });
    setEditMonthlyFeeInput(client.monthlyFeeCents ? formatCents(client.monthlyFeeCents) : '');
    setEditModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client) return;
    if (!editForm.tradeName.trim() || !editForm.cnpjCpf.trim()) {
      toast.error('Preencha ao menos o Nome Fantasia e o CNPJ/CPF.');
      return;
    }

    try {
      setSavingEdit(true);
      const cleanFee = parseBRLToCents(editMonthlyFeeInput);

      await api.put(`/admin/clients/${client.id}`, {
        ...editForm,
        monthlyFeeCents: cleanFee,
      });

      toast.success('Cliente e contrato atualizados com sucesso!');
      setEditModalOpen(false);
      reload();
    } catch (err) {
      toast.error(errorMessage(err, 'Erro ao atualizar dados do cliente.'));
    } finally {
      setSavingEdit(false);
    }
  };

  const handleLookupCep = async () => {
    const clean = editForm.postalCode.replace(/\D/g, '');
    if (clean.length !== 8) {
      toast.error('Informe um CEP válido com 8 dígitos.');
      return;
    }
    try {
      setSearchingCep(true);
      const res = await api.get<{
        address: string;
        neighborhood: string;
        city: string;
        state: string;
      }>(`/admin/clients/lookup/cep/${clean}`);
      setEditForm((prev) => ({
        ...prev,
        address: res.address || prev.address,
        neighborhood: res.neighborhood || prev.neighborhood,
        city: res.city || prev.city,
        state: res.state || prev.state,
      }));
      toast.success('Endereço preenchido via CEP!');
    } catch (err) {
      toast.error(errorMessage(err, 'Não foi possível buscar o endereço deste CEP.'));
    } finally {
      setSearchingCep(false);
    }
  };

  if (loading) return <PageLoader />;
  if (error || !client) return <ErrorState message="Cliente não encontrado." />;

  const statusCfg = STATUS_CONFIG[client.status] || {
    label: client.status,
    tone: 'neutral',
  };

  const loadMunicipalServices = async () => {
    if (municipalServicesLoaded || loadingMunicipalServices) return;
    try {
      setLoadingMunicipalServices(true);
      const data = await api.get<MunicipalServicesResponse>(
        '/admin/clients/asaas/municipal-services'
      );
      setMunicipalServices(data.services ?? []);
      setDefaultMunicipalService(
        data.defaultMunicipalService ?? { id: null, code: null, name: null }
      );
      if (data.defaultMunicipalService?.id) {
        setSelectedMunicipalServiceId(data.defaultMunicipalService.id);
      } else if (data.services?.length === 1 && !data.defaultMunicipalService?.code) {
        setSelectedMunicipalServiceId(data.services[0].id);
      } else if (data.defaultMunicipalService?.code) {
        setSelectedMunicipalServiceId('__manual__');
        setManualMunicipalCode(data.defaultMunicipalService.code);
        setManualMunicipalName(data.defaultMunicipalService.name || '');
      }
      setMunicipalServicesLoaded(true);
    } catch {
      setMunicipalServicesLoaded(true);
    } finally {
      setLoadingMunicipalServices(false);
    }
  };

  const buildMunicipalServicePayload = () => {
    if (selectedMunicipalServiceId && selectedMunicipalServiceId !== '__manual__') {
      const found = municipalServices.find((s) => s.id === selectedMunicipalServiceId);
      return {
        municipalServiceId: selectedMunicipalServiceId,
        municipalServiceName: found?.description || undefined,
      };
    }
    if (selectedMunicipalServiceId === '__manual__' || municipalServices.length === 0) {
      return {
        municipalServiceCode: manualMunicipalCode.trim() || undefined,
        municipalServiceName: manualMunicipalName.trim() || undefined,
      };
    }
    return {};
  };

  const openInvoiceModal = (charge: ClientCharge) => {
    setInvoiceModalCharge(charge);
    setInvoiceCustomDesc(charge.description);
    void loadMunicipalServices();
  };

  const renderMunicipalServiceFields = () => {
    const showManual =
      selectedMunicipalServiceId === '__manual__' ||
      (municipalServicesLoaded && municipalServices.length === 0);
    const hasServerDefault = Boolean(
      defaultMunicipalService.id || defaultMunicipalService.code
    );

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {loadingMunicipalServices ? (
          <div style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
            Carregando serviços municipais do Asaas…
          </div>
        ) : (
          <>
            {municipalServices.length > 0 && (
              <SelectField
                label="Serviço Municipal (Prefeitura / Asaas)"
                value={selectedMunicipalServiceId}
                onChange={(e) => setSelectedMunicipalServiceId(e.target.value)}
                placeholder={
                  hasServerDefault
                    ? 'Usar padrão configurado no servidor'
                    : 'Selecione o serviço municipal…'
                }
                options={[
                  ...municipalServices.map((s) => ({
                    value: s.id,
                    label: s.description,
                  })),
                  { value: '__manual__', label: 'Informar código manualmente…' },
                ]}
              />
            )}

            {showManual && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.75rem' }}>
                <TextField
                  label="Código do Serviço"
                  placeholder="Ex: 1.01 ou 17.06"
                  value={manualMunicipalCode}
                  onChange={(e) => setManualMunicipalCode(e.target.value)}
                />
                <TextField
                  label="Nome do Serviço Municipal"
                  placeholder="Ex: Análise e desenvolvimento de sistemas"
                  value={manualMunicipalName}
                  onChange={(e) => setManualMunicipalName(e.target.value)}
                />
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  // Gerar Nova Cobrança no Asaas (Única, Recorrente ou Parcelada + NFS-e)
  const handleCreateCharge = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanValue = parseBRLToCents(chargeValueInput);
    if (cleanValue <= 0 || !chargeDueDate || !chargeDescription.trim()) {
      toast.error('Preencha a descrição, valor e data de vencimento.');
      return;
    }

    try {
      setCreatingCharge(true);
      const res = await api.post<ClientCharge>(`/admin/clients/${client.id}/charges`, {
        description: chargeDescription,
        valueCents: cleanValue,
        dueDate: chargeDueDate,
        billingType: chargeBillingType,
        chargeKind,
        cycle: chargeKind === 'RECURRENT' ? chargeCycle : undefined,
        installmentCount: chargeKind === 'INSTALLMENT' ? Number(chargeInstallments) : undefined,
        emitInvoice: chargeEmitInvoice,
        invoiceServiceDescription:
          chargeEmitInvoice && chargeInvoiceDesc.trim() ? chargeInvoiceDesc.trim() : undefined,
        ...(chargeEmitInvoice ? buildMunicipalServicePayload() : {}),
      });

      toast.success(
        chargeEmitInvoice
          ? 'Cobrança gerada e emissão da NFS-e iniciada no Asaas!'
          : 'Cobrança gerada com sucesso via Asaas v3!'
      );
      setChargeModalOpen(false);
      setChargeDescription('');
      setChargeValueInput('');
      setChargeDueDate('');
      setChargeKind('SINGLE');
      setChargeEmitInvoice(false);
      setChargeInvoiceDesc('');
      reload();

      if (res.billingType === 'PIX' && (res.pixPayload || res.pixQrCodeUrl)) {
        setPixModalData({
          payload: res.pixPayload || '',
          qrCodeUrl: res.pixQrCodeUrl || '',
        });
      }
    } catch (err) {
      toast.error(errorMessage(err, 'Falha ao gerar cobrança no Asaas.'));
    } finally {
      setCreatingCharge(false);
    }
  };

  const handleEmitInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceModalCharge) return;

    try {
      setEmittingInvoice(true);
      await api.post(`/admin/clients/${client.id}/charges/${invoiceModalCharge.id}/invoice`, {
        serviceDescription: invoiceCustomDesc.trim() || undefined,
        ...buildMunicipalServicePayload(),
      });
      toast.success('Solicitação de emissão de NFS-e transmitida com sucesso!');
      setInvoiceModalCharge(null);
      setInvoiceCustomDesc('');
      reload();
    } catch (err) {
      toast.error(
        errorMessage(err, 'Falha ao emitir NFS-e. Verifique as configurações fiscais no Asaas.')
      );
    } finally {
      setEmittingInvoice(false);
    }
  };

  const handleSyncInvoice = async (chargeId: string) => {
    try {
      setSyncingInvoiceId(chargeId);
      await api.get(`/admin/clients/${client.id}/charges/${chargeId}/invoice`);
      toast.success('Status da NFS-e atualizado!');
      reload();
    } catch (err) {
      toast.error(errorMessage(err, 'Não foi possível atualizar o status da NFS-e.'));
    } finally {
      setSyncingInvoiceId(null);
    }
  };

  // Adicionar Contato
  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName.trim() || !contactEmail.trim()) {
      toast.error('Informe nome e e-mail do contato.');
      return;
    }

    try {
      setSavingContact(true);
      await api.post(`/admin/clients/${client.id}/contacts`, {
        name: contactName,
        email: contactEmail,
        phone: contactPhone,
        role: contactRole,
        isFinancial: contactIsFinancial,
      });

      toast.success('Contato adicionado!');
      setContactModalOpen(false);
      setContactName('');
      setContactEmail('');
      setContactPhone('');
      setContactRole('');
      setContactIsFinancial(false);
      reload();
    } catch (err) {
      toast.error(errorMessage(err, 'Erro ao adicionar contato.'));
    } finally {
      setSavingContact(false);
    }
  };

  // Adicionar Nota / Ata
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteContent.trim()) return;

    try {
      setSavingNote(true);
      await api.post(`/admin/clients/${client.id}/notes`, {
        content: newNoteContent,
      });

      toast.success('Nota registrada no histórico.');
      setNewNoteContent('');
      reload();
    } catch (err) {
      toast.error(errorMessage(err, 'Erro ao registrar nota.'));
    } finally {
      setSavingNote(false);
    }
  };

  return (
    <>
      <BackLink to="/admin/clientes">
        <ArrowLeft size={16} /> Voltar para lista de clientes
      </BackLink>

      <PageHeader
        title={client.tradeName}
        description={`${client.corporateName} · CNPJ/CPF: ${maskCnpjCpf(client.cnpjCpf)}${client.segment ? ` · ${client.segment}` : ''}`}
        actions={
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <StatusPill tone={statusCfg.tone}>{statusCfg.label}</StatusPill>
            {canEdit && (
              <Button variant="secondary" onClick={handleOpenEdit}>
                <Pencil size={15} /> Editar Cliente
              </Button>
            )}
            {canFinancial && (
              <Button onClick={() => setChargeModalOpen(true)}>
                <DollarSign size={16} /> Nova Cobrança (Asaas)
              </Button>
            )}
          </div>
        }
      />

      {/* Navegação por Abas */}
      <Tabs<TabKey>
        value={activeTab}
        onChange={setActiveTab}
        tabs={[
          { key: 'OVERVIEW', label: 'Visão Geral & Contatos' },
          { key: 'PROJECTS', label: `Projetos & Tarefas (${client.projects?.length ?? 0})` },
          { key: 'FINANCIAL', label: `Financeiro & Asaas (${client.charges?.length ?? 0})` },
          { key: 'NOTES', label: `Notas & Atas (${client.notes?.length ?? 0})` },
        ]}
      />

      {/* ABA 1: VISÃO GERAL */}
      {activeTab === 'OVERVIEW' && (
        <ContentGrid>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <Card>
              <h3>Dados Empresariais</h3>
              <DetailList>
                <dt>Razão Social</dt>
                <dd>{client.corporateName}</dd>
                <dt>Nome Fantasia</dt>
                <dd>{client.tradeName}</dd>
                <dt>Documento (CNPJ/CPF)</dt>
                <dd>{maskCnpjCpf(client.cnpjCpf)}</dd>
                <dt>Segmento</dt>
                <dd>{client.segment || 'Não informado'}</dd>
                <dt>Website</dt>
                <dd>
                  {client.website ? (
                    <a href={client.website} target="_blank" rel="noopener noreferrer">
                      {client.website} <ExternalLink size={12} />
                    </a>
                  ) : (
                    'Não informado'
                  )}
                </dd>
                <dt>Endereço Fiscal</dt>
                <dd>
                  {client.address
                    ? `${client.address}, ${client.addressNumber || 'S/N'} ${client.complement ? `(${client.complement})` : ''} - ${client.neighborhood || ''}, ${client.city || ''}/${client.state || ''} - CEP ${client.postalCode || ''}`
                    : 'Não cadastrado'}
                </dd>
              </DetailList>
            </Card>

            <Card>
              <h3>
                Pessoas de Contato
                {canEdit && (
                  <Button size="sm" variant="secondary" onClick={() => setContactModalOpen(true)}>
                    <Plus size={14} /> Adicionar Contato
                  </Button>
                )}
              </h3>
              {client.contacts?.length === 0 ? (
                <EmptyState
                  title="Nenhum contato cadastrado"
                  description="Cadastre contatos da equipe do cliente para envio de notificações e cobranças."
                />
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.75rem' }}>
                  {client.contacts?.map((contact) => (
                    <ContactCard key={contact.id}>
                      <div className="head">
                        <div>
                          <div className="name">{contact.name}</div>
                          {contact.role && <div className="role">{contact.role}</div>}
                        </div>
                        <div style={{ display: 'flex', gap: '0.3rem' }}>
                          {contact.isFinancial && (
                            <span
                              style={{
                                fontSize: '0.68rem',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                background: 'rgba(56, 189, 248, 0.15)',
                                color: '#38bdf8',
                                fontWeight: 700,
                              }}
                            >
                              Financeiro
                            </span>
                          )}
                          {contact.isPrimary && (
                            <span
                              style={{
                                fontSize: '0.68rem',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                background: 'rgba(182, 232, 41, 0.15)',
                                color: '#B6E829',
                                fontWeight: 700,
                              }}
                            >
                              Principal
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="row">
                        <Mail size={14} /> <a href={`mailto:${contact.email}`}>{contact.email}</a>
                      </div>

                      {contact.phone && (
                        <div className="row">
                          <Phone size={14} /> {maskPhone(contact.phone)}
                        </div>
                      )}

                      {contact.phone && (
                        <div style={{ marginTop: '0.4rem' }}>
                          <ButtonAnchor
                            href={whatsappLink(contact.phone, contact.name)}
                            target="_blank"
                            rel="noopener noreferrer"
                            $size="sm"
                            $variant="secondary"
                            style={{ width: '100%', justifyContent: 'center', gap: '0.4rem' }}
                          >
                            <WhatsAppIcon size={14} /> Conversar no WhatsApp
                          </ButtonAnchor>
                        </div>
                      )}
                    </ContactCard>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Lateral */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <Card>
              <h3>
                Parâmetros de Contrato
                {canEdit && (
                  <Button size="sm" variant="secondary" onClick={handleOpenEdit}>
                    <Pencil size={13} /> Editar Contrato
                  </Button>
                )}
              </h3>
              <DetailList>
                <dt>Modelo</dt>
                <dd>{CONTRACT_CONFIG[client.contractType]}</dd>
                <dt>Fee Mensal</dt>
                <dd>
                  <strong style={{ color: '#B6E829', fontSize: '1.1rem' }}>
                    {formatCents(client.monthlyFeeCents)}
                  </strong>
                </dd>
                <dt>Vencimento</dt>
                <dd>{`Todo dia ${client.dueDay || 10}`}</dd>
                <dt>Status no Asaas</dt>
                <dd>
                  {client.asaasCustomerId ? (
                    <span style={{ color: '#38bdf8', fontWeight: 700 }}>
                      Conectado ({client.asaasCustomerId})
                    </span>
                  ) : (
                    'Não sincronizado'
                  )}
                </dd>
                <dt>Account Manager</dt>
                <dd>{client.accountManager?.name || 'Não atribuído'}</dd>
              </DetailList>
            </Card>
          </div>
        </ContentGrid>
      )}

      {/* ABA 2: PROJETOS E ENTREGAS */}
      {activeTab === 'PROJECTS' && (
        <Card style={{ marginTop: '1.5rem' }}>
          <h3>
            Demandas e Projetos Ativos
            <ButtonAnchor href="/admin/tarefas" $variant="secondary" $size="sm">
              <Plus size={14} /> Abrir Gestão de Tarefas
            </ButtonAnchor>
          </h3>
          {client.projects?.length === 0 ? (
            <EmptyState
              title="Nenhum projeto vinculado"
              description="Você pode criar projetos na Gestão de Tarefas e associá-los a este cliente."
            />
          ) : (
            <TableWrap>
              <Table>
                <thead>
                  <tr>
                    <th>Projeto</th>
                    <th>Tarefas em Aberto</th>
                    <th>Status</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {client.projects.map((proj) => (
                    <tr key={proj.id}>
                      <td>
                        <CellMain>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span
                              style={{
                                width: 10,
                                height: 10,
                                borderRadius: '50%',
                                background: proj.color,
                              }}
                            />
                            <strong>{proj.name}</strong>
                          </div>
                        </CellMain>
                      </td>
                      <td>{proj._count?.tasks ?? 0} tarefas no Kanban</td>
                      <td>
                        <StatusPill tone="info">{proj.status}</StatusPill>
                      </td>
                      <td>
                        <Link to="/admin/tarefas">
                          <Button size="sm" variant="secondary">
                            Ver no Kanban
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </TableWrap>
          )}
        </Card>
      )}

      {/* ABA 3: FINANCEIRO & ASAAS */}
      {activeTab === 'FINANCIAL' && (
        <Card style={{ marginTop: '1.5rem' }}>
          <h3>
            Faturas e Cobranças (Asaas v3)
            {canFinancial && (
              <Button size="sm" onClick={() => setChargeModalOpen(true)}>
                <Plus size={14} /> Nova Cobrança
              </Button>
            )}
          </h3>

          {client.charges?.length === 0 ? (
            <EmptyState
              title="Nenhuma fatura emitida"
              description="Gere uma nova cobrança avulsa ou mensalidade via PIX, Boleto ou Cartão."
            />
          ) : (
            <TableWrap>
              <Table>
                <thead>
                  <tr>
                    <th>Descrição</th>
                    <th>Valor</th>
                    <th>Vencimento</th>
                    <th>Forma</th>
                    <th>Status</th>
                    <th>Nota Fiscal (NFS-e)</th>
                    <th>Fatura & Pagamento</th>
                  </tr>
                </thead>
                <tbody>
                  {client.charges.map((charge) => {
                    const chargeStatus = CHARGE_STATUS_CONFIG[charge.status] || {
                      label: charge.status,
                      tone: 'neutral',
                    };
                    return (
                      <tr key={charge.id}>
                        <td>
                          <div>
                            <strong>{charge.description}</strong>
                            {charge.asaasSubscriptionId && (
                              <span
                                style={{
                                  display: 'inline-block',
                                  marginLeft: '0.5rem',
                                  fontSize: '0.72rem',
                                  padding: '0.15rem 0.45rem',
                                  borderRadius: '4px',
                                  background: 'rgba(59, 130, 246, 0.15)',
                                  color: '#60a5fa',
                                  fontWeight: 700,
                                }}
                              >
                                Recorrente
                              </span>
                            )}
                            {charge.installmentCount && (
                              <span
                                style={{
                                  display: 'inline-block',
                                  marginLeft: '0.5rem',
                                  fontSize: '0.72rem',
                                  padding: '0.15rem 0.45rem',
                                  borderRadius: '4px',
                                  background: 'rgba(168, 85, 247, 0.15)',
                                  color: '#c084fc',
                                  fontWeight: 700,
                                }}
                              >
                                Parcela {charge.installmentNumber || 1}/{charge.installmentCount}
                              </span>
                            )}
                          </div>
                          {charge.asaasPaymentId && (
                            <small style={{ fontFamily: 'monospace', color: '#737373', display: 'block', marginTop: '0.2rem' }}>
                              ID: {charge.asaasPaymentId}
                            </small>
                          )}
                        </td>
                        <td>
                          <span style={{ fontWeight: 800 }}>{formatCents(charge.valueCents)}</span>
                        </td>
                        <td>{formatDateOnly(charge.dueDate)}</td>
                        <td>
                          <span style={{ fontSize: '0.85rem' }}>{charge.billingType}</span>
                        </td>
                        <td>
                          <StatusPill tone={chargeStatus.tone}>{chargeStatus.label}</StatusPill>
                        </td>
                        <td>
                          {charge.nfeStatus === 'AUTHORIZED' ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                              <StatusPill tone="success">
                                NFS-e {charge.nfeNumber ? `#${charge.nfeNumber}` : 'Autorizada'}
                              </StatusPill>
                              <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                                {charge.nfePdfUrl && (
                                  <ButtonAnchor
                                    href={charge.nfePdfUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    $size="sm"
                                    $variant="secondary"
                                    title="Visualizar PDF da NFS-e"
                                  >
                                    <FileText size={11} /> PDF
                                  </ButtonAnchor>
                                )}
                                {charge.nfeXmlUrl && (
                                  <ButtonAnchor
                                    href={charge.nfeXmlUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    $size="sm"
                                    $variant="secondary"
                                    title="Baixar XML da NFS-e"
                                  >
                                    XML
                                  </ButtonAnchor>
                                )}
                              </div>
                            </div>
                          ) : charge.nfeStatus === 'SCHEDULED' || charge.nfeStatus === 'SYNCHRONIZED' ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                              <StatusPill tone="info">Processando</StatusPill>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => handleSyncInvoice(charge.id)}
                                disabled={syncingInvoiceId === charge.id}
                                title="Atualizar status da NFS-e junto ao Asaas"
                              >
                                <RefreshCw size={11} />
                              </Button>
                            </div>
                          ) : charge.nfeStatus === 'ERROR' ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                              <StatusPill tone="danger">Erro Emissão</StatusPill>
                              {canFinancial && (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => openInvoiceModal(charge)}
                                  title="Tentar emitir NFS-e novamente"
                                >
                                  <FileText size={11} /> Reemitir
                                </Button>
                              )}
                            </div>
                          ) : (
                            canFinancial && charge.asaasPaymentId && (
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => openInvoiceModal(charge)}
                                title="Emitir NFS-e antes do pagamento"
                              >
                                <FileText size={11} /> Emitir NFS-e
                              </Button>
                            )
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
                            {charge.invoiceUrl && (
                              <ButtonAnchor
                                href={charge.invoiceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                $size="sm"
                                $variant="secondary"
                              >
                                Fatura <ExternalLink size={12} />
                              </ButtonAnchor>
                            )}
                            {charge.pixPayload && (
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() =>
                                  setPixModalData({
                                    payload: charge.pixPayload || '',
                                    qrCodeUrl: charge.pixQrCodeUrl || '',
                                  })
                                }
                              >
                                <QrCode size={13} /> PIX
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </TableWrap>
          )}
        </Card>
      )}

      {/* ABA 4: NOTAS E HISTÓRICO */}
      {activeTab === 'NOTES' && (
        <Card style={{ marginTop: '1.5rem' }}>
          <h3>Anotações Internas & Alinhamentos</h3>

          <form onSubmit={handleAddNote} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <TextArea
              label="Nova anotação ou ata de reunião"
              placeholder="Ex: Alinhado em reunião com o cliente que a campanha de Natal começa em 01/12..."
              value={newNoteContent}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewNoteContent(e.target.value)}
              rows={3}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button type="submit" disabled={savingNote || !newNoteContent.trim()}>
                <Send size={15} /> {savingNote ? 'Salvando…' : 'Salvar Nota'}
              </Button>
            </div>
          </form>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
            {client.notes?.length === 0 ? (
              <EmptyState
                title="Nenhuma anotação ainda"
                description="Use este espaço para registrar reuniões, solicitações e pontos de atenção com o cliente."
              />
            ) : (
              client.notes.map((note) => (
                <NoteItem key={note.id}>
                  <div className="note-head">
                    <span>{note.author?.name || 'Equipe PicPlus'}</span>
                    <span>{formatDateTime(note.createdAt)}</span>
                  </div>
                  <div className="note-content">{note.content}</div>
                </NoteItem>
              ))
            )}
          </div>
        </Card>
      )}

      {/* MODAL: NOVA COBRANÇA ASAAS */}
      <Modal
        open={chargeModalOpen}
        onClose={() => setChargeModalOpen(false)}
        title="Gerar Cobrança no Asaas v3"
        width="560px"
      >
        <form onSubmit={handleCreateCharge}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <SelectField
              label="Modalidade da Cobrança"
              value={chargeKind}
              onChange={(e) =>
                setChargeKind(e.target.value as 'SINGLE' | 'RECURRENT' | 'INSTALLMENT')
              }
              options={[
                { value: 'SINGLE', label: 'Cobrança Única / Avulsa' },
                { value: 'RECURRENT', label: 'Assinatura Recorrente (Mensalidade Contínua)' },
                { value: 'INSTALLMENT', label: 'Parcelada (Carnê / N Parcelas)' },
              ]}
            />

            {chargeKind === 'RECURRENT' && (
              <SelectField
                label="Periodicidade da Assinatura"
                value={chargeCycle}
                onChange={(e) =>
                  setChargeCycle(
                    e.target.value as
                      | 'MONTHLY'
                      | 'BIMONTHLY'
                      | 'QUARTERLY'
                      | 'SEMIANNUALLY'
                      | 'YEARLY'
                  )
                }
                options={[
                  { value: 'MONTHLY', label: 'Mensal (Todo mês no dia do vencimento)' },
                  { value: 'BIMONTHLY', label: 'Bimestral (A cada 2 meses)' },
                  { value: 'QUARTERLY', label: 'Trimestral (A cada 3 meses)' },
                  { value: 'SEMIANNUALLY', label: 'Semestral (A cada 6 meses)' },
                  { value: 'YEARLY', label: 'Anual' },
                ]}
              />
            )}

            {chargeKind === 'INSTALLMENT' && (
              <SelectField
                label="Quantidade de Parcelas"
                value={String(chargeInstallments)}
                onChange={(e) => setChargeInstallments(Number(e.target.value))}
                options={[
                  { value: '2', label: '2x parcelas' },
                  { value: '3', label: '3x parcelas' },
                  { value: '4', label: '4x parcelas' },
                  { value: '5', label: '5x parcelas' },
                  { value: '6', label: '6x parcelas' },
                  { value: '7', label: '7x parcelas' },
                  { value: '8', label: '8x parcelas' },
                  { value: '9', label: '9x parcelas' },
                  { value: '10', label: '10x parcelas' },
                  { value: '11', label: '11x parcelas' },
                  { value: '12', label: '12x parcelas' },
                ]}
                hint={
                  chargeValueInput
                    ? `Valor total de ${chargeValueInput} dividido em ${chargeInstallments}x de R$ ${(parseBRLToCents(chargeValueInput) / (chargeInstallments * 100)).toFixed(2).replace('.', ',')}`
                    : undefined
                }
              />
            )}

            <TextField
              label="Descrição do Serviço ou Job"
              required
              placeholder="Ex: Fee Mensal - Novembro/2026"
              value={chargeDescription}
              onChange={(e) => setChargeDescription(e.target.value)}
            />
            <CurrencyField
              label={chargeKind === 'INSTALLMENT' ? 'Valor Total do Parcelamento' : 'Valor da Cobrança'}
              required
              placeholder="R$ 0,00"
              value={chargeValueInput}
              onChange={setChargeValueInput}
            />
            <TextField
              label={
                chargeKind === 'RECURRENT'
                  ? 'Primeiro Vencimento da Assinatura'
                  : chargeKind === 'INSTALLMENT'
                    ? 'Vencimento da 1ª Parcela'
                    : 'Data de Vencimento'
              }
              type="date"
              required
              value={chargeDueDate}
              onChange={(e) => setChargeDueDate(e.target.value)}
            />
            <SelectField
              label="Forma de Pagamento"
              value={chargeBillingType}
              onChange={(e) => setChargeBillingType(e.target.value as ChargeBillingType)}
              options={[
                { value: 'PIX', label: 'PIX (QR Code e Copia e Cola)' },
                { value: 'BOLETO', label: 'Boleto Bancário' },
                { value: 'CREDIT_CARD', label: 'Cartão de Crédito' },
                { value: 'UNDEFINED', label: 'Deixar cliente escolher na fatura' },
              ]}
            />

            <div
              style={{
                marginTop: '0.5rem',
                padding: '0.85rem',
                border: '1px solid #333',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.02)',
              }}
            >
              <Switch
                checked={chargeEmitInvoice}
                onChange={(checked) => {
                  setChargeEmitInvoice(checked);
                  if (checked) void loadMunicipalServices();
                }}
                label="Emitir Nota Fiscal (NFS-e) antes do pagamento"
                description="Transmite a NFS-e à prefeitura de forma imediata para o cliente conferir antes de quitar a fatura."
              />

              {chargeEmitInvoice && (
                <div style={{ marginTop: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <TextField
                    label="Discriminação dos Serviços na NFS-e"
                    placeholder="Ex: Prestação de serviços de marketing digital e gestão de tráfego..."
                    value={chargeInvoiceDesc}
                    onChange={(e) => setChargeInvoiceDesc(e.target.value)}
                    hint="Opcional. Se não preenchido, usará a descrição informada acima."
                  />
                  {renderMunicipalServiceFields()}
                </div>
              )}
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.75rem',
              marginTop: '1.5rem',
              borderTop: '1px solid #262626',
              paddingTop: '1rem',
            }}
          >
            <Button
              type="button"
              variant="secondary"
              onClick={() => setChargeModalOpen(false)}
              disabled={creatingCharge}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={creatingCharge}>
              {creatingCharge ? 'Emitindo via Asaas…' : 'Emitir Cobrança'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: EMITIR NFS-E ANTECIPADA / MANUAL */}
      <Modal
        open={Boolean(invoiceModalCharge)}
        onClose={() => setInvoiceModalCharge(null)}
        title="Emitir Nota Fiscal de Serviço (NFS-e)"
        width="520px"
      >
        {invoiceModalCharge && (
          <form onSubmit={handleEmitInvoice}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div
                style={{
                  padding: '0.85rem',
                  borderRadius: '6px',
                  background: 'rgba(59, 130, 246, 0.08)',
                  border: '1px solid rgba(59, 130, 246, 0.25)',
                  fontSize: '0.88rem',
                  lineHeight: 1.5,
                  color: '#cbd5e1',
                }}
              >
                Cobrança selecionada:{' '}
                <strong>{invoiceModalCharge.description}</strong> —{' '}
                <span style={{ fontWeight: 800, color: '#fff' }}>
                  {formatCents(invoiceModalCharge.valueCents)}
                </span>
                <p style={{ marginTop: '0.4rem', fontSize: '0.82rem', color: '#94a3b8' }}>
                  A NFS-e será transmitida de imediato à Prefeitura via Asaas, ficando autorizada
                  antes da quitação da fatura para o cliente aprovar o pagamento.
                </p>
              </div>

              <TextField
                label="Discriminação do Serviço na Nota Fiscal"
                required
                value={invoiceCustomDesc}
                onChange={(e) => setInvoiceCustomDesc(e.target.value)}
                placeholder="Ex: Prestação de serviços de publicidade, design e gestão de anúncios..."
              />

              {renderMunicipalServiceFields()}
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '0.75rem',
                marginTop: '1.5rem',
                borderTop: '1px solid #262626',
                paddingTop: '1rem',
              }}
            >
              <Button
                type="button"
                variant="secondary"
                onClick={() => setInvoiceModalCharge(null)}
                disabled={emittingInvoice}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={emittingInvoice || !invoiceCustomDesc.trim()}>
                {emittingInvoice ? 'Transmitindo à Prefeitura…' : 'Emitir NFS-e Imediata'}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* MODAL: NOVO CONTATO */}
      <Modal
        open={contactModalOpen}
        onClose={() => setContactModalOpen(false)}
        title="Adicionar Pessoa de Contato"
        width="480px"
      >
        <form onSubmit={handleSaveContact}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <TextField
              label="Nome Completo"
              required
              placeholder="Ex: Carlos Eduardo"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
            />
            <TextField
              label="E-mail"
              type="email"
              required
              placeholder="carlos@empresa.com.br"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
            />
            <TextField
              label="Telefone / WhatsApp"
              placeholder="(11) 98888-7777"
              value={contactPhone}
              onChange={(e) => setContactPhone(maskPhone(e.target.value))}
            />
            <TextField
              label="Cargo / Função"
              placeholder="Ex: Diretor Comercial"
              value={contactRole}
              onChange={(e) => setContactRole(e.target.value)}
            />
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={contactIsFinancial}
                onChange={(e) => setContactIsFinancial(e.target.checked)}
              />
              <span style={{ fontSize: '0.9rem' }}>Este contato recebe faturas e notificações financeiras</span>
            </label>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.75rem',
              marginTop: '1.5rem',
              borderTop: '1px solid #262626',
              paddingTop: '1rem',
            }}
          >
            <Button
              type="button"
              variant="secondary"
              onClick={() => setContactModalOpen(false)}
              disabled={savingContact}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={savingContact}>
              {savingContact ? 'Salvando…' : 'Adicionar Contato'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: PIX COPIA E COLA & QR CODE */}
      <Modal
        open={Boolean(pixModalData)}
        onClose={() => setPixModalData(null)}
        title="PIX da Cobrança Asaas"
        width="440px"
      >
        {pixModalData && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', textAlign: 'center' }}>
            {pixModalData.qrCodeUrl && (
              <img
                src={pixModalData.qrCodeUrl}
                alt="QR Code PIX"
                style={{ width: 180, height: 180, borderRadius: '8px', background: '#fff', padding: 8 }}
              />
            )}
            <p style={{ fontSize: '0.85rem', color: '#888' }}>
              Aponte a câmera do aplicativo do banco para escanear ou copie o código abaixo:
            </p>
            <div
              style={{
                width: '100%',
                padding: '0.75rem',
                background: '#111',
                borderRadius: '6px',
                border: '1px solid #333',
                fontSize: '0.75rem',
                fontFamily: 'monospace',
                wordBreak: 'break-all',
                maxHeight: '80px',
                overflowY: 'auto',
              }}
            >
              {pixModalData.payload}
            </div>
            <Button
              style={{ width: '100%', justifyContent: 'center', gap: '0.5rem' }}
              onClick={() => {
                navigator.clipboard.writeText(pixModalData.payload);
                toast.success('Código PIX copiado para a área de transferência!');
              }}
            >
              <Copy size={16} /> Copiar Código PIX
            </Button>
          </div>
        )}
      </Modal>

      {/* Modal de Edição do Cliente e Contrato */}
      <Modal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title={`Editar Cliente: ${client.tradeName}`}
        width="760px"
      >
        <form onSubmit={handleSaveEdit}>
          <FormGrid>
            <SectionTitle>Parâmetros do Contrato & Asaas</SectionTitle>
            <CurrencyField
              label="Fee Mensal / Valor do Contrato"
              value={editMonthlyFeeInput}
              onChange={setEditMonthlyFeeInput}
              placeholder="R$ 0,00"
            />
            <SelectField
              label="Modelo de Contrato"
              value={editForm.contractType}
              onChange={(e) => setEditForm({ ...editForm, contractType: e.target.value as ContractType })}
              options={[
                { value: 'RETAINER_FEE', label: 'Fee Mensal (Assessoria / Recorrente)' },
                { value: 'FIXED_SCOPE', label: 'Projeto Fechado (Job Pontual)' },
                { value: 'ON_DEMAND', label: 'Por Demanda / Horas' },
              ]}
            />
            <TextField
              label="Dia do Vencimento"
              type="number"
              min={1}
              max={31}
              value={String(editForm.dueDay)}
              onChange={(e) => setEditForm({ ...editForm, dueDay: Number(e.target.value) || 10 })}
            />

            <SectionTitle>Dados da Empresa</SectionTitle>
            <TextField
              label="Nome Fantasia"
              required
              value={editForm.tradeName}
              onChange={(e) => setEditForm({ ...editForm, tradeName: e.target.value })}
            />
            <TextField
              label="Razão Social"
              required
              value={editForm.corporateName}
              onChange={(e) => setEditForm({ ...editForm, corporateName: e.target.value })}
            />
            <TextField
              label="CNPJ ou CPF"
              required
              value={editForm.cnpjCpf}
              onChange={(e) => setEditForm({ ...editForm, cnpjCpf: maskCnpjCpf(e.target.value) })}
            />
            <TextField
              label="Segmento / Nicho"
              value={editForm.segment}
              onChange={(e) => setEditForm({ ...editForm, segment: e.target.value })}
              placeholder="Ex: E-commerce de Moda"
            />
            <TextField
              label="Website / Loja"
              value={editForm.website}
              onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
              placeholder="https://..."
            />
            <SelectField
              label="Status do Cliente"
              value={editForm.status}
              onChange={(e) => setEditForm({ ...editForm, status: e.target.value as ClientStatus })}
              options={[
                { value: 'ACTIVE', label: 'Ativo' },
                { value: 'PROSPECT', label: 'Prospect (Em negociação)' },
                { value: 'ONBOARDING', label: 'Onboarding' },
                { value: 'PAUSED', label: 'Pausado' },
                { value: 'CHURNED', label: 'Cancelado' },
              ]}
            />

            <SectionTitle>Endereço Fiscal</SectionTitle>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <TextField
                  label="CEP"
                  value={editForm.postalCode}
                  onChange={(e) => setEditForm({ ...editForm, postalCode: e.target.value })}
                  placeholder="00000-000"
                />
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                style={{ height: '42px', marginBottom: '2px', whiteSpace: 'nowrap' }}
                disabled={searchingCep || editForm.postalCode.replace(/\D/g, '').length !== 8}
                onClick={handleLookupCep}
                title="Buscar endereço por CEP"
              >
                <Search size={14} /> {searchingCep ? 'Buscando…' : 'Buscar CEP'}
              </Button>
            </div>
            <TextField
              label="Logradouro"
              value={editForm.address}
              onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
              placeholder="Av. Paulista"
            />
            <TextField
              label="Número"
              value={editForm.addressNumber}
              onChange={(e) => setEditForm({ ...editForm, addressNumber: e.target.value })}
              placeholder="1000"
            />
            <TextField
              label="Bairro"
              value={editForm.neighborhood}
              onChange={(e) => setEditForm({ ...editForm, neighborhood: e.target.value })}
              placeholder="Bela Vista"
            />
            <TextField
              label="Cidade"
              value={editForm.city}
              onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
              placeholder="São Paulo"
            />
            <TextField
              label="UF (Estado)"
              maxLength={2}
              value={editForm.state}
              onChange={(e) => setEditForm({ ...editForm, state: e.target.value.toUpperCase() })}
              placeholder="SP"
            />
          </FormGrid>

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.75rem',
              marginTop: '1.5rem',
              borderTop: '1px solid #262626',
              paddingTop: '1rem',
            }}
          >
            <Button
              type="button"
              variant="secondary"
              onClick={() => setEditModalOpen(false)}
              disabled={savingEdit}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={savingEdit}>
              {savingEdit ? 'Salvando alterações…' : 'Salvar Alterações'}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
