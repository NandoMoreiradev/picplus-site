import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import {
  AlertCircle,
  Building2,
  Calendar,
  DollarSign,
  Eye,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from 'lucide-react';
import {
  CellMain,
  IconButton,
  PageHeader,
  Panel,
  RowActions,
  StatusPill,
  Table,
  TableWrap,
  Tabs,
  Toolbar,
} from '../../components/admin/AdminUI';
import { Button } from '../../components/ui/Button';
import { EmptyState, ErrorState, PageLoader } from '../../components/ui/Feedback';
import type { Tone } from '../../components/ui/Feedback';
import { CurrencyField, SelectField, TextField } from '../../components/ui/Form';
import { ConfirmDialog, Modal } from '../../components/ui/Modal';
import { Pagination } from '../../components/ui/Pagination';
import { SearchInput } from '../../components/ui/SearchInput';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../context/auth-context';
import { useDebounce } from '../../hooks/useDebounce';
import { useFetch } from '../../hooks/useFetch';
import { usePage } from '../../hooks/usePage';
import { api } from '../../lib/api';
import { formatCents, maskCnpjCpf, maskPhone, parseBRLToCents } from '../../lib/format';
import type {
  ClientStats,
  ClientStatus,
  ClientSummary,
  ContractType,
  Paginated,
} from '../../lib/types';
import { errorMessage } from '../../lib/validation';

type Tab = ClientStatus | 'ALL';

const STATUS_CONFIG: Record<ClientStatus, { label: string; tone: Tone }> = {
  ACTIVE: { label: 'Ativo', tone: 'success' },
  PROSPECT: { label: 'Prospect', tone: 'warning' },
  ONBOARDING: { label: 'Onboarding', tone: 'info' },
  PAUSED: { label: 'Pausado', tone: 'neutral' },
  CHURNED: { label: 'Cancelado', tone: 'danger' },
};

const CONTRACT_CONFIG: Record<ContractType, string> = {
  RETAINER_FEE: 'Fee Mensal',
  FIXED_SCOPE: 'Projeto Fechado',
  ON_DEMAND: 'Sob Demanda',
};

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
  margin-bottom: 1.75rem;
`;

const StatCard = styled(Panel)<{ $highlight?: boolean; $danger?: boolean }>`
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  border-left: 4px solid
    ${({ theme, $highlight, $danger }) =>
      $danger
        ? theme.colors.danger
        : $highlight
          ? theme.colors.primary
          : theme.colors.border};

  .label {
    font-size: 0.78rem;
    font-weight: 800;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: ${({ theme }) => theme.colors.textMuted};
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }
  .value {
    font-size: 1.6rem;
    font-weight: 800;
    color: ${({ theme }) => theme.colors.text};
  }
  .sub {
    font-size: 0.8rem;
    color: ${({ theme }) => theme.colors.textSecondary};
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

interface ClientFormState {
  corporateName: string;
  tradeName: string;
  cnpjCpf: string;
  segment: string;
  website: string;
  status: ClientStatus;
  contractType: ContractType;
  monthlyFeeCents: number;
  dueDay: number;
  postalCode: string;
  address: string;
  addressNumber: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  primaryContactName: string;
  primaryContactEmail: string;
  primaryContactPhone: string;
  primaryContactRole: string;
}

const INITIAL_FORM: ClientFormState = {
  corporateName: '',
  tradeName: '',
  cnpjCpf: '',
  segment: '',
  website: '',
  status: 'ACTIVE',
  contractType: 'RETAINER_FEE',
  monthlyFeeCents: 0,
  dueDay: 10,
  postalCode: '',
  address: '',
  addressNumber: '',
  complement: '',
  neighborhood: '',
  city: '',
  state: '',
  primaryContactName: '',
  primaryContactEmail: '',
  primaryContactPhone: '',
  primaryContactRole: 'Responsável',
};

export function Clients() {
  const { can } = useAuth();
  const toast = useToast();
  const canEdit = can('clients.edit');
  const canDelete = can('clients.delete');

  const [tab, setTab] = useState<Tab>('ALL');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [page, setPage] = usePage('clients');

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<ClientFormState>(INITIAL_FORM);
  const [monthlyFeeInput, setMonthlyFeeInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [searchingCnpj, setSearchingCnpj] = useState(false);
  const [searchingCep, setSearchingCep] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<ClientSummary | null>(null);

  const handleLookupCnpj = async () => {
    const clean = form.cnpjCpf.replace(/\D/g, '');
    if (clean.length !== 14) {
      toast.error('Informe um CNPJ válido com 14 dígitos para consultar.');
      return;
    }
    try {
      setSearchingCnpj(true);
      const data = await api.get<{
        corporateName: string;
        tradeName: string;
        segment: string | null;
        postalCode: string | null;
        address: string | null;
        addressNumber: string | null;
        complement: string | null;
        neighborhood: string | null;
        city: string | null;
        state: string | null;
        phone: string | null;
        email: string | null;
      }>(`/admin/clients/lookup/cnpj/${clean}`);

      setForm((prev) => ({
        ...prev,
        corporateName: data.corporateName || prev.corporateName,
        tradeName: data.tradeName || prev.tradeName,
        segment: data.segment || prev.segment,
        postalCode: data.postalCode || prev.postalCode,
        address: data.address || prev.address,
        addressNumber: data.addressNumber || prev.addressNumber,
        complement: data.complement || prev.complement,
        neighborhood: data.neighborhood || prev.neighborhood,
        city: data.city || prev.city,
        state: data.state || prev.state,
        primaryContactPhone: data.phone ? maskPhone(data.phone) : prev.primaryContactPhone,
        primaryContactEmail: data.email || prev.primaryContactEmail,
      }));

      toast.success('Dados da empresa e endereço preenchidos via Receita Federal!');
    } catch (err) {
      toast.error(errorMessage(err, 'Não foi possível buscar dados deste CNPJ.'));
    } finally {
      setSearchingCnpj(false);
    }
  };

  const handleLookupCep = async () => {
    const clean = form.postalCode.replace(/\D/g, '');
    if (clean.length !== 8) {
      toast.error('Informe um CEP com 8 dígitos.');
      return;
    }
    try {
      setSearchingCep(true);
      const data = await api.get<{
        address: string;
        neighborhood: string;
        city: string;
        state: string;
      }>(`/admin/clients/lookup/cep/${clean}`);

      setForm((prev) => ({
        ...prev,
        address: data.address || prev.address,
        neighborhood: data.neighborhood || prev.neighborhood,
        city: data.city || prev.city,
        state: data.state || prev.state,
      }));

      toast.success('Endereço preenchido com sucesso!');
    } catch (err) {
      toast.error(errorMessage(err, 'CEP não encontrado.'));
    } finally {
      setSearchingCep(false);
    }
  };

  // Filtros de listagem
  const query = useMemo(
    () => ({
      page,
      limit: 15,
      status: tab === 'ALL' ? undefined : tab,
      search: debouncedSearch.trim() || undefined,
    }),
    [page, tab, debouncedSearch],
  );

  const { data, loading, error, reload } = useFetch<Paginated<ClientSummary>>(
    '/admin/clients',
    query,
  );
  const { data: stats } = useFetch<ClientStats>('/admin/clients/stats');

  const items = data?.items ?? [];
  const meta = data?.meta;

  const handleOpenCreate = () => {
    setForm(INITIAL_FORM);
    setMonthlyFeeInput('');
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.tradeName.trim() || !form.cnpjCpf.trim()) {
      toast.error('Preencha ao menos o Nome Fantasia e o CNPJ/CPF.');
      return;
    }

    try {
      setSaving(true);
      const cleanFee = parseBRLToCents(monthlyFeeInput);

      await api.post('/admin/clients', {
        ...form,
        monthlyFeeCents: cleanFee,
      });

      toast.success('Cliente cadastrado e sincronizado com o Asaas!');
      setModalOpen(false);
      reload();
    } catch (err) {
      toast.error(errorMessage(err, 'Erro ao cadastrar cliente.'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!clientToDelete) return;
    try {
      await api.delete(`/admin/clients/${clientToDelete.id}`);
      toast.success('Cliente movido para o histórico.');
      setClientToDelete(null);
      reload();
    } catch (err) {
      toast.error(errorMessage(err, 'Erro ao excluir cliente.'));
    }
  };

  const handleImportAsaas = async () => {
    try {
      setImporting(true);
      const result = await api.post<{
        customersRead: number;
        paymentsRead: number;
        clientsCreated: number;
        clientsLinked: number;
        chargesCreated: number;
        clientsSkipped: number;
        chargesSkipped: number;
      }>('/admin/clients/asaas/import', {});
      toast.success(
        `Importação concluída: ${result.clientsCreated} clientes e ${result.chargesCreated} cobranças adicionados.`,
      );
      reload();
    } catch (err) {
      toast.error(errorMessage(err, 'Não foi possível importar os dados do Asaas.'));
    } finally {
      setImporting(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Gestão de Clientes"
        description="Gestão 360° dos clientes da agência: contratos, demandas operacionais e cobranças via Asaas."
        actions={
          canEdit && (
            <>
              <Button variant="secondary" onClick={handleImportAsaas} disabled={importing}>
                <RefreshCw size={18} /> {importing ? 'Importando…' : 'Importar do Asaas'}
              </Button>
              <Button onClick={handleOpenCreate}>
                <Plus size={18} /> Novo Cliente
              </Button>
            </>
          )
        }
      />

      {/* Indicadores do CRM */}
      <StatsGrid>
        <StatCard $highlight>
          <div className="label">
            <DollarSign size={15} /> MRR da Agência
          </div>
          <div className="value">{formatCents(stats?.totalMrrCents ?? 0)}</div>
          <div className="sub">Receita recorrente mensal ativa</div>
        </StatCard>

        <StatCard>
          <div className="label">
            <Building2 size={15} /> Clientes Ativos
          </div>
          <div className="value">{stats?.activeClients ?? 0}</div>
          <div className="sub">{stats?.prospectClients ?? 0} prospects em negociação</div>
        </StatCard>

        <StatCard>
          <div className="label">
            <Calendar size={15} /> Faturas em Aberto
          </div>
          <div className="value">{formatCents(stats?.pendingTotalCents ?? 0)}</div>
          <div className="sub">Aguardando pagamento no Asaas</div>
        </StatCard>

        <StatCard $danger={(stats?.overdueTotalCents ?? 0) > 0}>
          <div className="label">
            <AlertCircle size={15} /> Inadimplência
          </div>
          <div className="value">{formatCents(stats?.overdueTotalCents ?? 0)}</div>
          <div className="sub">Faturas vencidas no Asaas</div>
        </StatCard>
      </StatsGrid>

      {/* Filtros e Abas */}
      <Tabs<Tab>
        value={tab}
        onChange={(t) => {
          setTab(t);
          setPage(1);
        }}
        tabs={[
          { key: 'ALL', label: 'Todos' },
          { key: 'ACTIVE', label: 'Ativos' },
          { key: 'PROSPECT', label: 'Prospects' },
          { key: 'ONBOARDING', label: 'Onboarding' },
          { key: 'PAUSED', label: 'Pausados' },
          { key: 'CHURNED', label: 'Cancelados' },
        ]}
      />

      <Toolbar>
        <div className="grow">
          <SearchInput
            placeholder="Buscar por nome, razão social, CNPJ ou nicho…"
            value={search}
            onChange={(val) => {
              setSearch(val);
              setPage(1);
            }}
          />
        </div>
      </Toolbar>

      {/* Tabela de Clientes */}
      {loading && !data && <PageLoader />}
      {error && <ErrorState message="Não foi possível carregar os clientes." />}

      {!loading && items.length === 0 && (
        <EmptyState
          title="Nenhum cliente encontrado"
          description={
            search || tab !== 'ALL'
              ? 'Tente ajustar os filtros ou termo de busca.'
              : 'Cadastre o primeiro cliente da agência para começar o acompanhamento.'
          }
          action={
            canEdit && !search && tab === 'ALL' ? (
              <Button onClick={handleOpenCreate}>
                <Plus size={16} /> Cadastrar Primeiro Cliente
              </Button>
            ) : undefined
          }
        />
      )}

      {items.length > 0 && (
        <>
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>CNPJ / CPF</th>
                  <th>Contrato</th>
                  <th>Fee Mensal</th>
                  <th>Operacional</th>
                  <th>Status</th>
                  <th>Asaas</th>
                  <th style={{ width: 100 }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {items.map((c) => {
                  const statusInfo = STATUS_CONFIG[c.status] || {
                    label: c.status,
                    tone: 'neutral',
                  };
                  return (
                    <tr key={c.id}>
                      <td>
                        <CellMain>
                          <div>
                            <Link to={`/admin/clientes/${c.id}`} style={{ fontWeight: 800 }}>
                              {c.tradeName}
                            </Link>
                            <small>{c.corporateName}</small>
                          </div>
                        </CellMain>
                      </td>
                      <td>
                        <span style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                          {maskCnpjCpf(c.cnpjCpf)}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.85rem' }}>
                          {CONTRACT_CONFIG[c.contractType] || c.contractType}
                        </span>
                      </td>
                      <td>
                        <strong style={{ color: c.monthlyFeeCents ? '#B6E829' : undefined }}>
                          {c.monthlyFeeCents ? formatCents(c.monthlyFeeCents) : '—'}
                        </strong>
                      </td>
                      <td>
                        <small style={{ color: '#888' }}>
                          {c._count?.projects ?? 0} projetos · {c._count?.contacts ?? 0} contatos
                        </small>
                      </td>
                      <td>
                        <StatusPill tone={statusInfo.tone}>{statusInfo.label}</StatusPill>
                      </td>
                      <td>
                        {c.asaasCustomerId ? (
                          <span
                            title={`ID Asaas: ${c.asaasCustomerId}`}
                            style={{
                              fontSize: '0.72rem',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: 'rgba(56, 189, 248, 0.15)',
                              color: '#38bdf8',
                              fontWeight: 700,
                            }}
                          >
                            Conectado
                          </span>
                        ) : (
                          <span
                            style={{
                              fontSize: '0.72rem',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: 'rgba(255, 255, 255, 0.05)',
                              color: '#666',
                            }}
                          >
                            Pendente
                          </span>
                        )}
                      </td>
                      <td>
                        <RowActions>
                          <Link to={`/admin/clientes/${c.id}`} title="Ver Ficha Completa">
                            <Eye size={17} />
                          </Link>
                          {canDelete && (
                            <IconButton
                              label="Remover cliente"
                              danger
                              onClick={() => setClientToDelete(c)}
                            >
                              <Trash2 size={17} />
                            </IconButton>
                          )}
                        </RowActions>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </TableWrap>

          {meta && meta.totalPages > 1 && (
            <Pagination
              page={meta.page}
              totalPages={meta.totalPages}
              onChange={setPage}
            />
          )}
        </>
      )}

      {/* Modal de Criação de Cliente */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Novo Cliente da Agência"
        width="760px"
      >
        <form onSubmit={handleSave}>
          <FormGrid>
            <SectionTitle>Dados da Empresa</SectionTitle>
            <TextField
              label="Nome Fantasia"
              required
              value={form.tradeName}
              onChange={(e) => setForm({ ...form, tradeName: e.target.value })}
              placeholder="Ex: Nike Brasil"
            />
            <TextField
              label="Razão Social"
              required
              value={form.corporateName}
              onChange={(e) => setForm({ ...form, corporateName: e.target.value })}
              placeholder="Ex: Fisia Comércio de Artigos Esportivos Ltda"
            />
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <TextField
                  label="CNPJ ou CPF"
                  required
                  value={form.cnpjCpf}
                  onChange={(e) => setForm({ ...form, cnpjCpf: maskCnpjCpf(e.target.value) })}
                  placeholder="00.000.000/0001-00"
                />
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                style={{ height: '42px', marginBottom: '2px', whiteSpace: 'nowrap' }}
                disabled={searchingCnpj || form.cnpjCpf.replace(/\D/g, '').length !== 14}
                onClick={handleLookupCnpj}
                title="Consultar dados da empresa na Receita Federal"
              >
                <Search size={14} /> {searchingCnpj ? 'Buscando…' : 'Buscar CNPJ'}
              </Button>
            </div>
            <TextField
              label="Segmento / Nicho"
              value={form.segment}
              onChange={(e) => setForm({ ...form, segment: e.target.value })}
              placeholder="Ex: Moda e Calçados"
            />
            <TextField
              label="Website / Loja"
              value={form.website}
              onChange={(e) => setForm({ ...form, website: e.target.value })}
              placeholder="https://..."
            />
            <SelectField
              label="Status Inicial"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as ClientStatus })}
              options={[
                { value: 'ACTIVE', label: 'Ativo' },
                { value: 'PROSPECT', label: 'Prospect (Em negociação)' },
                { value: 'ONBOARDING', label: 'Onboarding' },
              ]}
            />

            <SectionTitle>Parâmetros do Contrato & Asaas</SectionTitle>
            <SelectField
              label="Modelo de Contrato"
              value={form.contractType}
              onChange={(e) => setForm({ ...form, contractType: e.target.value as ContractType })}
              options={[
                { value: 'RETAINER_FEE', label: 'Fee Mensal (Assessoria / Recorrente)' },
                { value: 'FIXED_SCOPE', label: 'Projeto Fechado (Job Pontual)' },
                { value: 'ON_DEMAND', label: 'Por Demanda / Horas' },
              ]}
            />
            <CurrencyField
              label="Valor Mensal / Job"
              value={monthlyFeeInput}
              onChange={setMonthlyFeeInput}
              placeholder="R$ 0,00"
            />
            <TextField
              label="Dia do Vencimento"
              type="number"
              min={1}
              max={31}
              value={String(form.dueDay)}
              onChange={(e) => setForm({ ...form, dueDay: Number(e.target.value) || 10 })}
            />

            <SectionTitle>Contato Principal (Notificações e Cobrança)</SectionTitle>
            <TextField
              label="Nome do Contato"
              value={form.primaryContactName}
              onChange={(e) => setForm({ ...form, primaryContactName: e.target.value })}
              placeholder="Ex: Mariana Silva"
            />
            <TextField
              label="E-mail (Receberá Faturas Asaas)"
              type="email"
              value={form.primaryContactEmail}
              onChange={(e) => setForm({ ...form, primaryContactEmail: e.target.value })}
              placeholder="financeiro@empresa.com.br"
            />
            <TextField
              label="Telefone / WhatsApp"
              value={form.primaryContactPhone}
              onChange={(e) => setForm({ ...form, primaryContactPhone: maskPhone(e.target.value) })}
              placeholder="(11) 99999-9999"
            />
            <TextField
              label="Cargo do Contato"
              value={form.primaryContactRole}
              onChange={(e) => setForm({ ...form, primaryContactRole: e.target.value })}
              placeholder="Ex: Gerente de Marketing"
            />

            <SectionTitle>Endereço Fiscal (Obrigatório para Emissão no Asaas)</SectionTitle>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <TextField
                  label="CEP"
                  value={form.postalCode}
                  onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
                  placeholder="00000-000"
                />
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                style={{ height: '42px', marginBottom: '2px', whiteSpace: 'nowrap' }}
                disabled={searchingCep || form.postalCode.replace(/\D/g, '').length !== 8}
                onClick={handleLookupCep}
                title="Buscar endereço por CEP"
              >
                <Search size={14} /> {searchingCep ? 'Buscando…' : 'Buscar CEP'}
              </Button>
            </div>
            <TextField
              label="Logradouro"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="Av. Paulista"
            />
            <TextField
              label="Número"
              value={form.addressNumber}
              onChange={(e) => setForm({ ...form, addressNumber: e.target.value })}
              placeholder="1000"
            />
            <TextField
              label="Bairro"
              value={form.neighborhood}
              onChange={(e) => setForm({ ...form, neighborhood: e.target.value })}
              placeholder="Bela Vista"
            />
            <TextField
              label="Cidade"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              placeholder="São Paulo"
            />
            <TextField
              label="UF (Estado)"
              maxLength={2}
              value={form.state}
              onChange={(e) => setForm({ ...form, state: e.target.value.toUpperCase() })}
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
              onClick={() => setModalOpen(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Cadastrando e sincronizando…' : 'Salvar Cliente'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Confirmação de Exclusão */}
      <ConfirmDialog
        open={Boolean(clientToDelete)}
        title="Remover cliente"
        message={`Tem certeza que deseja remover o cliente "${clientToDelete?.tradeName}"? Ele será arquivado e não aparecerá nas listagens ativas.`}
        confirmLabel="Remover"
        onConfirm={handleDelete}
        onCancel={() => setClientToDelete(null)}
      />
    </>
  );
}
