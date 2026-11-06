import { useState, useEffect } from 'react';
import styled from 'styled-components';
import {
  ArrowUpCircle,
  CheckCircle2,
  ExternalLink,
  Plus,
  Trash2,
  Users,
} from 'lucide-react';
import {
  CellMain,
  IconButton,
  PageHeader,
  RowActions,
  StatusPill,
  Table,
  TableWrap,
  Tabs,
  Toolbar,
} from '../../../components/admin/AdminUI';
import { Button } from '../../../components/ui/Button';
import { EmptyState, PageLoader } from '../../../components/ui/Feedback';
import { CurrencyField, SelectField, TextField } from '../../../components/ui/Form';
import { ConfirmDialog, Modal } from '../../../components/ui/Modal';
import { Pagination } from '../../../components/ui/Pagination';
import { SearchInput } from '../../../components/ui/SearchInput';
import { useToast } from '../../../components/ui/Toast';
import { useDebounce } from '../../../hooks/useDebounce';
import { formatCents, formatDate, parseBRLToCents } from '../../../lib/format';
import {
  financialApi,
  type FinancialAccount,
  type FinancialCategory,
  type FinancialCostCenter,
  type FinancialEntry,
  type FinancialEntryStatus,
  type FinancialSupplier,
} from '../../../lib/financialApi';
import { api } from '../../../lib/api';

type Tab = FinancialEntryStatus | 'ALL';

const STATUS_CONFIG: Record<FinancialEntryStatus, { label: string; tone: 'success' | 'warning' | 'danger' | 'info' | 'neutral' }> = {
  PENDING: { label: 'A pagar', tone: 'warning' },
  PARTIALLY_PAID: { label: 'Parcial', tone: 'info' },
  PAID: { label: 'Pago', tone: 'success' },
  OVERDUE: { label: 'Vencido', tone: 'danger' },
  CANCELED: { label: 'Cancelado', tone: 'neutral' },
};

const FavorecidoBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;

  img {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    object-fit: cover;
  }
`;

export function AccountsPayable() {
  const [tab, setTab] = useState<Tab>('ALL');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [page, setPage] = useState(1);
  const [entries, setEntries] = useState<FinancialEntry[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Auxiliares
  const [categories, setCategories] = useState<FinancialCategory[]>([]);
  const [costCenters, setCostCenters] = useState<FinancialCostCenter[]>([]);
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [suppliers, setSuppliers] = useState<FinancialSupplier[]>([]);
  const [influencers, setInfluencers] = useState<Array<{ id: string; name: string }>>([]);

  // Modais
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [settleEntry, setSettleEntry] = useState<FinancialEntry | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Form de criação
  const [payeeType, setPayeeType] = useState<'INFLUENCER' | 'SUPPLIER' | 'GENERAL'>('SUPPLIER');
  const [formInfluencerId, setFormInfluencerId] = useState('');
  const [formSupplierId, setFormSupplierId] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formValue, setFormValue] = useState('0,00');
  const [formDueDate, setFormDueDate] = useState('');
  const [formCategoryId, setFormCategoryId] = useState('');
  const [formCostCenterId, setFormCostCenterId] = useState('');
  const [formAccountId, setFormAccountId] = useState('');
  const [formPaymentMethod, setFormPaymentMethod] = useState('PIX');
  const [formAttachmentUrl, setFormAttachmentUrl] = useState('');
  const [formInstallments, setFormInstallments] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Form de liquidação
  const [settleAmount, setSettleAmount] = useState('0,00');
  const [settleDate, setSettleDate] = useState('');
  const [settleAccountId, setSettleAccountId] = useState('');
  const [settling, setSettling] = useState(false);

  const toast = useToast();

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await financialApi.listEntries({
        type: 'EXPENSE',
        status: tab === 'ALL' ? undefined : tab,
        search: debouncedSearch || undefined,
        page,
        limit: 15,
      });
      setEntries(res.items);
      setTotalPages(res.totalPages);
    } catch {
      toast.error('Erro ao carregar contas a pagar');
    } finally {
      setLoading(false);
    }
  };

  const loadAux = async () => {
    try {
      const [cats, centers, accs, supps, infsRes] = await Promise.all([
        financialApi.listCategories(),
        financialApi.listCostCenters(),
        financialApi.listAccounts(),
        financialApi.listSuppliers(),
        api.get<Array<{ id: string; name: string }>>('admin/influencers?limit=100').catch(() => []),
      ]);
      setCategories(cats.filter((c) => c.nature !== 'REVENUE'));
      setCostCenters(centers);
      setAccounts(accs);
      setSuppliers(supps);
      setInfluencers(infsRes || []);

      if (cats.length > 0) setFormCategoryId(cats[0].id);
      if (centers.length > 0) setFormCostCenterId(centers[0].id);
      if (accs.length > 0) {
        const def = accs.find((a) => a.isDefault) || accs[0];
        setFormAccountId(def.id);
        setSettleAccountId(def.id);
      }
    } catch {
      // Ignora erro auxiliar não-crítico
    }
  };

  useEffect(() => {
    loadAux();
  }, []);

  useEffect(() => {
    loadData();
  }, [tab, debouncedSearch, page]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const cents = parseBRLToCents(formValue);
    if (!formTitle.trim()) {
      toast.error('Informe o título do pagamento');
      return;
    }
    if (cents <= 0) {
      toast.error('O valor deve ser maior que zero');
      return;
    }
    if (!formDueDate) {
      toast.error('Informe a data de vencimento');
      return;
    }

    try {
      setSubmitting(true);
      await financialApi.createEntry({
        type: 'EXPENSE',
        title: formTitle,
        nominalAmountCents: cents,
        dueDate: new Date(formDueDate).toISOString(),
        categoryId: formCategoryId,
        costCenterId: formCostCenterId || undefined,
        accountId: formAccountId || undefined,
        influencerId: payeeType === 'INFLUENCER' ? formInfluencerId || undefined : undefined,
        supplierId: payeeType === 'SUPPLIER' ? formSupplierId || undefined : undefined,
        paymentMethod: formPaymentMethod,
        attachmentUrl: formAttachmentUrl.trim() || undefined,
        installments: formInstallments > 1 ? formInstallments : undefined,
      });
      toast.success('Despesa cadastrada com sucesso!');
      setIsCreateOpen(false);
      setFormTitle('');
      setFormValue('0,00');
      setFormDueDate('');
      setFormAttachmentUrl('');
      setFormInstallments(1);
      await loadData();
    } catch {
      toast.error('Erro ao cadastrar despesa');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenSettle = (entry: FinancialEntry) => {
    setSettleEntry(entry);
    const remainingCents = entry.nominalAmountCents - entry.paidAmountCents;
    setSettleAmount((remainingCents / 100).toFixed(2).replace('.', ','));
    setSettleDate(new Date().toISOString().split('T')[0]);
    if (entry.accountId) setSettleAccountId(entry.accountId);
  };

  const handleSettle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settleEntry) return;
    const cents = parseBRLToCents(settleAmount);
    if (cents <= 0) {
      toast.error('Informe um valor pago válido');
      return;
    }
    try {
      setSettling(true);
      await financialApi.settleEntry(settleEntry.id, {
        paidAmountCents: cents,
        paidAt: new Date(settleDate).toISOString(),
        accountId: settleAccountId || undefined,
      });
      toast.success('Pagamento liquidado com sucesso!');
      setSettleEntry(null);
      await loadData();
    } catch {
      toast.error('Falha ao registrar pagamento');
    } finally {
      setSettling(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await financialApi.deleteEntry(deleteId);
      toast.success('Despesa removida com sucesso!');
      setDeleteId(null);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao remover despesa');
    }
  };

  return (
    <div>
      <PageHeader
        title="Contas a Pagar"
        description="Gestão de despesas operacionais, repasses a influenciadores, notas e fornecedores"
        actions={
          <Button size="sm" onClick={() => setIsCreateOpen(true)}>
            <Plus size={14} /> Nova Despesa
          </Button>
        }
      />

      <Toolbar>
        <Tabs
          tabs={[
            { key: 'ALL', label: 'Todos' },
            { key: 'PENDING', label: 'A pagar' },
            { key: 'PAID', label: 'Pagos' },
            { key: 'OVERDUE', label: 'Vencidos' },
            { key: 'CANCELED', label: 'Cancelados' },
          ]}
          value={tab}
          onChange={(newTab) => {
            setTab(newTab);
            setPage(1);
          }}
        />
        <div className="grow">
          <SearchInput
            placeholder="Buscar despesa por título, fornecedor ou influenciador…"
            value={search}
            onChange={(val) => {
              setSearch(val);
              setPage(1);
            }}
          />
        </div>
      </Toolbar>

      {loading && entries.length === 0 ? (
        <PageLoader label="Carregando despesas…" />
      ) : entries.length === 0 ? (
        <EmptyState
          icon={<ArrowUpCircle size={36} aria-hidden />}
          title="Nenhuma despesa encontrada"
          description="Clique em 'Nova Despesa' para lançar compromissos a pagar ou repasses."
        />
      ) : (
        <TableWrap>
          <Table>
            <thead>
              <tr>
                <th>Favorecido / Título</th>
                <th>Categoria / Centro</th>
                <th>Vencimento</th>
                <th>Valor Nominal</th>
                <th>Valor Pago</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => {
                const cfg = STATUS_CONFIG[entry.status] || { label: entry.status, tone: 'neutral' };
                const isInfluencer = !!entry.influencer;
                const isSupplier = !!entry.supplier;

                return (
                  <tr key={entry.id}>
                    <td>
                      <CellMain>
                        <div>
                          <strong>{entry.title}</strong>
                          {isInfluencer && (
                            <FavorecidoBadge>
                              {entry.influencer?.profileImage ? (
                                <img src={entry.influencer.profileImage} alt="" />
                              ) : (
                                <Users size={14} style={{ color: '#ec4899' }} />
                              )}
                              <small style={{ color: '#ec4899' }}>
                                Influenciador: {entry.influencer?.name}
                              </small>
                            </FavorecidoBadge>
                          )}
                          {isSupplier && (
                            <small>Fornecedor: {entry.supplier?.name}</small>
                          )}
                          {entry.installmentIndex && entry.installmentTotal && (
                            <small style={{ color: '#f59e0b' }}>
                              Parcela {entry.installmentIndex}/{entry.installmentTotal}
                            </small>
                          )}
                        </div>
                      </CellMain>
                    </td>
                    <td>
                      <div>
                        <span style={{ fontSize: '0.8125rem', color: '#cbd5e1', display: 'block' }}>
                          {entry.category?.name || '—'}
                        </span>
                        {entry.costCenter && (
                          <span style={{ fontSize: '0.6875rem', color: '#94a3b8' }}>
                            {entry.costCenter.name}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.8125rem' }}>
                        {formatDate(entry.dueDate)}
                      </span>
                    </td>
                    <td>
                      <strong style={{ fontSize: '0.875rem' }}>
                        {formatCents(entry.nominalAmountCents)}
                      </strong>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.875rem', color: entry.paidAmountCents > 0 ? '#10b981' : '#94a3b8' }}>
                        {entry.paidAmountCents > 0 ? formatCents(entry.paidAmountCents) : 'R$ 0,00'}
                      </span>
                    </td>
                    <td>
                      <StatusPill tone={cfg.tone}>{cfg.label}</StatusPill>
                    </td>
                    <td>
                      <RowActions>
                        {entry.attachmentUrl && (
                          <a
                            href={entry.attachmentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Ver Comprovante / NF"
                            style={{
                              display: 'inline-grid',
                              placeItems: 'center',
                              width: '36px',
                              height: '36px',
                              color: '#94a3b8',
                            }}
                          >
                            <ExternalLink size={15} />
                          </a>
                        )}
                        {entry.status !== 'PAID' && entry.status !== 'CANCELED' && (
                          <IconButton
                            label="Registrar Pagamento"
                            onClick={() => handleOpenSettle(entry)}
                            style={{ color: '#10b981' }}
                          >
                            <CheckCircle2 size={16} />
                          </IconButton>
                        )}
                        {entry.status !== 'PAID' && (
                          <IconButton
                            label="Excluir despesa"
                            danger
                            onClick={() => setDeleteId(entry.id)}
                          >
                            <Trash2 size={15} />
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
      )}

      {totalPages > 1 && (
        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      )}

      {/* Modal de Nova Despesa */}
      <Modal
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Nova Despesa / Conta a Pagar"
      >
        <form onSubmit={handleCreate}>
          <div style={{ marginBottom: '0.75rem' }}>
            <SelectField
              label="Tipo de Favorecido"
              value={payeeType}
              onChange={(e) => setPayeeType(e.target.value as any)}
              options={[
                { value: 'SUPPLIER', label: 'Fornecedor / Prestador de Serviço' },
                { value: 'INFLUENCER', label: 'Influenciador da Base (Repasse de Campanha)' },
                { value: 'GENERAL', label: 'Despesa Geral / Corporativa' },
              ]}
            />
          </div>

          {payeeType === 'INFLUENCER' && (
            <div style={{ marginBottom: '0.75rem' }}>
              <SelectField
                label="Selecione o Influenciador *"
                value={formInfluencerId}
                onChange={(e) => setFormInfluencerId(e.target.value)}
                options={[
                  { value: '', label: 'Selecione…' },
                  ...influencers.map((inf) => ({ value: inf.id, label: inf.name })),
                ]}
                required
              />
            </div>
          )}

          {payeeType === 'SUPPLIER' && (
            <div style={{ marginBottom: '0.75rem' }}>
              <SelectField
                label="Selecione o Fornecedor"
                value={formSupplierId}
                onChange={(e) => setFormSupplierId(e.target.value)}
                options={[
                  { value: '', label: 'Nenhum / Novo avulso' },
                  ...suppliers.map((s) => ({ value: s.id, label: s.name })),
                ]}
              />
            </div>
          )}

          <TextField
            label="Título / Descrição *"
            value={formTitle}
            onChange={(e) => setFormTitle(e.target.value)}
            placeholder="Ex.: Repasse Campanha Marca X ou Assinatura Adobe Creative Cloud"
            required
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.75rem' }}>
            <CurrencyField
              label="Valor Nominal (R$) *"
              value={formValue}
              onChange={setFormValue}
              required
            />
            <TextField
              label="Data de Vencimento *"
              type="date"
              value={formDueDate}
              onChange={(e) => setFormDueDate(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.75rem' }}>
            <SelectField
              label="Categoria (Plano de Contas) *"
              value={formCategoryId}
              onChange={(e) => setFormCategoryId(e.target.value)}
              options={categories.map((c) => ({ value: c.id, label: `${c.code} - ${c.name}` }))}
              required
            />
            <SelectField
              label="Centro de Custo"
              value={formCostCenterId}
              onChange={(e) => setFormCostCenterId(e.target.value)}
              options={costCenters.map((cc) => ({ value: cc.id, label: cc.name }))}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.75rem' }}>
            <SelectField
              label="Conta Bancária de Saída"
              value={formAccountId}
              onChange={(e) => setFormAccountId(e.target.value)}
              options={accounts.map((a) => ({ value: a.id, label: a.name }))}
            />
            <SelectField
              label="Forma de Pagamento"
              value={formPaymentMethod}
              onChange={(e) => setFormPaymentMethod(e.target.value)}
              options={[
                { value: 'PIX', label: 'PIX' },
                { value: 'BOLETO', label: 'Boleto Bancário' },
                { value: 'BANK_TRANSFER', label: 'Transferência Bancária (TED/DOC)' },
                { value: 'CREDIT_CARD', label: 'Cartão Corporativo' },
              ]}
            />
          </div>

          <div style={{ marginTop: '0.75rem' }}>
            <TextField
              label="Link do Comprovante ou Nota Fiscal (URL)"
              value={formAttachmentUrl}
              onChange={(e) => setFormAttachmentUrl(e.target.value)}
              placeholder="https://storage… ou comprovante em PDF"
            />
          </div>

          <div style={{ marginTop: '0.75rem' }}>
            <TextField
              label="Repetir em Parcelas Mensais"
              type="number"
              min="1"
              max="24"
              value={formInstallments.toString()}
              onChange={(e) => setFormInstallments(parseInt(e.target.value, 10) || 1)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.625rem', marginTop: '1.5rem' }}>
            <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Salvando…' : 'Salvar Despesa'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal de Baixa / Pagamento */}
      <Modal
        open={!!settleEntry}
        onClose={() => setSettleEntry(null)}
        title="Registrar Pagamento de Despesa"
      >
        <form onSubmit={handleSettle}>
          <p style={{ fontSize: '0.875rem', color: '#cbd5e1', marginBottom: '1rem' }}>
            Confirmar pagamento para <strong>{settleEntry?.title}</strong>.
          </p>

          <CurrencyField
            label="Valor Efetivamente Pago (R$) *"
            value={settleAmount}
            onChange={setSettleAmount}
            required
          />

          <div style={{ marginTop: '0.75rem' }}>
            <TextField
              label="Data do Pagamento *"
              type="date"
              value={settleDate}
              onChange={(e) => setSettleDate(e.target.value)}
              required
            />
          </div>

          <div style={{ marginTop: '0.75rem' }}>
            <SelectField
              label="Conta Bancária de Saída *"
              value={settleAccountId}
              onChange={(e) => setSettleAccountId(e.target.value)}
              options={accounts.map((a) => ({ value: a.id, label: a.name }))}
              required
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.625rem', marginTop: '1.5rem' }}>
            <Button type="button" variant="ghost" onClick={() => setSettleEntry(null)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={settling}>
              {settling ? 'Confirmando…' : 'Confirmar Pagamento'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Confirmação de Exclusão */}
      <ConfirmDialog
        open={!!deleteId}
        onCancel={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Excluir Despesa"
        message="Tem certeza que deseja excluir esta despesa a pagar?"
        confirmLabel="Sim, excluir"
      />
    </div>
  );
}
export default AccountsPayable;
