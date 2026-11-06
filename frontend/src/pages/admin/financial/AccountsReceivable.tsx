import { useState, useEffect } from 'react';
import {
  ArrowDownCircle,
  CheckCircle2,
  ExternalLink,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
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
import { errorMessage } from '../../../lib/validation';
import {
  financialApi,
  type FinancialAccount,
  type FinancialCategory,
  type FinancialEntry,
  type FinancialEntryStatus,
} from '../../../lib/financialApi';
import { api } from '../../../lib/api';

type Tab = FinancialEntryStatus | 'ALL';

const STATUS_CONFIG: Record<FinancialEntryStatus, { label: string; tone: 'success' | 'warning' | 'danger' | 'info' | 'neutral' }> = {
  PENDING: { label: 'Aguardando', tone: 'warning' },
  PARTIALLY_PAID: { label: 'Parcial', tone: 'info' },
  PAID: { label: 'Recebido', tone: 'success' },
  OVERDUE: { label: 'Em atraso', tone: 'danger' },
  CANCELED: { label: 'Cancelado', tone: 'neutral' },
};

export function AccountsReceivable() {
  const [tab, setTab] = useState<Tab>('ALL');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [page, setPage] = useState(1);
  const [entries, setEntries] = useState<FinancialEntry[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // Auxiliares para formulários
  const [categories, setCategories] = useState<FinancialCategory[]>([]);
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [clients, setClients] = useState<Array<{ id: string; tradeName: string; corporateName: string }>>([]);

  // Modais
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [settleEntry, setSettleEntry] = useState<FinancialEntry | null>(null);
  const [editingEntry, setEditingEntry] = useState<FinancialEntry | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Form de criação
  const [formTitle, setFormTitle] = useState('');
  const [formValue, setFormValue] = useState('0,00');
  const [formDueDate, setFormDueDate] = useState('');
  const [formCategoryId, setFormCategoryId] = useState('');
  const [formAccountId, setFormAccountId] = useState('');
  const [formClientId, setFormClientId] = useState('');
  const [formPaymentMethod, setFormPaymentMethod] = useState('PIX');
  const [formInstallments, setFormInstallments] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Form de edição
  const [editTitle, setEditTitle] = useState('');
  const [editValue, setEditValue] = useState('0,00');
  const [editDueDate, setEditDueDate] = useState('');
  const [editCompetenceDate, setEditCompetenceDate] = useState('');
  const [editCategoryId, setEditCategoryId] = useState('');
  const [editAccountId, setEditAccountId] = useState('');
  const [editClientId, setEditClientId] = useState('');
  const [editStatus, setEditStatus] = useState<FinancialEntryStatus>('PENDING');
  const [editPaymentMethod, setEditPaymentMethod] = useState('PIX');
  const [editNotes, setEditNotes] = useState('');
  const [updating, setUpdating] = useState(false);

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
        type: 'INCOME',
        status: tab === 'ALL' ? undefined : tab,
        search: debouncedSearch || undefined,
        page,
        limit: 15,
      });
      setEntries(res.items);
      setTotalPages(res.totalPages);
    } catch {
      toast.error('Erro ao carregar contas a receber');
    } finally {
      setLoading(false);
    }
  };

  const loadAux = async () => {
    try {
      const [cats, accs, clsRes] = await Promise.all([
        financialApi.listCategories(),
        financialApi.listAccounts(),
        api.get<{ items: Array<{ id: string; tradeName: string; corporateName: string }> }>('/admin/clients?limit=100'),
      ]);
      setCategories(cats.filter((c) => c.nature === 'REVENUE'));
      setAccounts(accs);
      setClients(clsRes.items || []);
      if (cats.length > 0) setFormCategoryId(cats[0].id);
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

  const handleSyncAsaas = async () => {
    try {
      setSyncing(true);
      await financialApi.syncCharges();
      toast.success('Cobranças do Asaas sincronizadas!');
      await loadData();
    } catch {
      toast.error('Erro na sincronização com Asaas');
    } finally {
      setSyncing(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const cents = parseBRLToCents(formValue);
    if (!formTitle.trim()) {
      toast.error('Informe o título do recebimento');
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
        type: 'INCOME',
        title: formTitle,
        nominalAmountCents: cents,
        dueDate: new Date(formDueDate).toISOString(),
        categoryId: formCategoryId,
        accountId: formAccountId || undefined,
        clientId: formClientId || undefined,
        paymentMethod: formPaymentMethod,
        installments: formInstallments > 1 ? formInstallments : undefined,
      });
      toast.success('Recebimento cadastrado com sucesso!');
      setIsCreateOpen(false);
      setFormTitle('');
      setFormValue('0,00');
      setFormDueDate('');
      setFormInstallments(1);
      await loadData();
    } catch {
      toast.error('Erro ao cadastrar recebimento');
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
      toast.error('Informe um valor recebido válido');
      return;
    }
    try {
      setSettling(true);
      await financialApi.settleEntry(settleEntry.id, {
        paidAmountCents: cents,
        paidAt: new Date(settleDate).toISOString(),
        accountId: settleAccountId || undefined,
      });
      toast.success('Recebimento liquidado com sucesso!');
      setSettleEntry(null);
      await loadData();
    } catch {
      toast.error('Falha ao liquidar recebimento');
    } finally {
      setSettling(false);
    }
  };

  const handleOpenEdit = (entry: FinancialEntry) => {
    setEditingEntry(entry);
    setEditTitle(entry.title);
    setEditValue((entry.nominalAmountCents / 100).toFixed(2).replace('.', ','));
    setEditDueDate(entry.dueDate.slice(0, 10));
    setEditCompetenceDate(entry.competenceDate ? entry.competenceDate.slice(0, 10) : entry.dueDate.slice(0, 10));
    setEditCategoryId(entry.categoryId);
    setEditAccountId(entry.accountId || '');
    setEditClientId(entry.clientId || '');
    setEditStatus(entry.status);
    setEditPaymentMethod(entry.paymentMethod || 'PIX');
    setEditNotes(entry.notes || '');
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEntry) return;
    const cents = parseBRLToCents(editValue);
    if (!editTitle.trim()) {
      toast.error('Informe o título do recebimento');
      return;
    }
    if (cents <= 0) {
      toast.error('O valor deve ser maior que zero');
      return;
    }
    if (!editDueDate) {
      toast.error('Informe a data de vencimento');
      return;
    }

    try {
      setUpdating(true);
      await financialApi.updateEntry(editingEntry.id, {
        title: editTitle.trim(),
        nominalAmountCents: cents,
        dueDate: new Date(editDueDate).toISOString(),
        competenceDate: editCompetenceDate ? new Date(editCompetenceDate).toISOString() : new Date(editDueDate).toISOString(),
        categoryId: editCategoryId,
        accountId: editAccountId || null,
        clientId: editClientId || null,
        status: editStatus,
        paymentMethod: editPaymentMethod,
        notes: editNotes.trim() || null,
      });
      toast.success('Recebimento atualizado com sucesso!');
      setEditingEntry(null);
      await loadData();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await financialApi.deleteEntry(deleteId);
      toast.success('Lançamento removido com sucesso!');
      setDeleteId(null);
      await loadData();
    } catch (err: unknown) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <div>
      <PageHeader
        title="Contas a Receber"
        description="Gestão de receitas de clientes, faturamento, parcelamentos e integração Asaas"
        actions={
          <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap' }}>
            <Button variant="secondary" size="sm" onClick={handleSyncAsaas} disabled={syncing}>
              <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
              {syncing ? 'Sincronizando…' : 'Sincronizar Asaas'}
            </Button>
            <Button size="sm" onClick={() => setIsCreateOpen(true)}>
              <Plus size={14} /> Novo Recebimento
            </Button>
          </div>
        }
      />

      <Toolbar>
        <Tabs
          tabs={[
            { key: 'ALL', label: 'Todos' },
            { key: 'PENDING', label: 'Aguardando' },
            { key: 'PAID', label: 'Recebidos' },
            { key: 'OVERDUE', label: 'Em atraso' },
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
            placeholder="Buscar por cliente, título ou fatura…"
            value={search}
            onChange={(val) => {
              setSearch(val);
              setPage(1);
            }}
          />
        </div>
      </Toolbar>

      {loading && entries.length === 0 ? (
        <PageLoader label="Carregando recebimentos…" />
      ) : entries.length === 0 ? (
        <EmptyState
          icon={<ArrowDownCircle size={36} aria-hidden />}
          title="Nenhum recebimento encontrado"
          description="Clique em 'Novo Recebimento' ou 'Sincronizar Asaas' para popular as contas a receber."
        />
      ) : (
        <TableWrap>
          <Table>
            <thead>
              <tr>
                <th>Título / Cliente</th>
                <th>Categoria</th>
                <th>Vencimento</th>
                <th>Valor Nominal</th>
                <th>Valor Recebido</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => {
                const cfg = STATUS_CONFIG[entry.status] || { label: entry.status, tone: 'neutral' };
                const clientName = entry.client?.tradeName || entry.client?.corporateName;

                return (
                  <tr key={entry.id}>
                    <td>
                      <CellMain>
                        <div>
                          <strong>{entry.title}</strong>
                          {clientName && (
                            <small>{clientName}</small>
                          )}
                          {entry.installmentIndex && entry.installmentTotal && (
                            <small style={{ color: '#3b82f6' }}>
                              Parcela {entry.installmentIndex}/{entry.installmentTotal}
                            </small>
                          )}
                        </div>
                      </CellMain>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.8125rem', color: '#cbd5e1' }}>
                        {entry.category?.name || '—'}
                      </span>
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
                        {entry.charge?.invoiceUrl && (
                          <a
                            href={entry.charge.invoiceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Ver Fatura / Boleto Asaas"
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
                        <IconButton
                          label="Editar recebimento"
                          onClick={() => handleOpenEdit(entry)}
                        >
                          <Pencil size={15} />
                        </IconButton>
                        {entry.status !== 'PAID' && entry.status !== 'CANCELED' && (
                          <IconButton
                            label="Dar baixa / Registrar recebimento"
                            onClick={() => handleOpenSettle(entry)}
                            style={{ color: '#10b981' }}
                          >
                            <CheckCircle2 size={16} />
                          </IconButton>
                        )}
                        {!(entry.status === 'PAID' && entry.chargeId) && (
                          <IconButton
                            label="Excluir recebimento"
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

      {/* Modal de Novo Recebimento */}
      <Modal
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Novo Lançamento a Receber"
      >
        <form onSubmit={handleCreate}>
          <TextField
            label="Título / Descrição *"
            value={formTitle}
            onChange={(e) => setFormTitle(e.target.value)}
            placeholder="Ex.: Fee Mensal - Contrato Alpha"
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
              label="Cliente Relacionado"
              value={formClientId}
              onChange={(e) => setFormClientId(e.target.value)}
              options={[
                { value: '', label: 'Nenhum / Receita Direta' },
                ...clients.map((cl) => ({ value: cl.id, label: cl.tradeName || cl.corporateName })),
              ]}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.75rem' }}>
            <SelectField
              label="Conta Bancária de Destino"
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
                { value: 'CREDIT_CARD', label: 'Cartão de Crédito' },
                { value: 'BANK_TRANSFER', label: 'Transferência Bancária' },
              ]}
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
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              Se maior que 1, criará automaticamente N lançamentos com vencimentos consecutivos (+30 dias).
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.625rem', marginTop: '1.5rem' }}>
            <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Salvando…' : 'Salvar Recebimento'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal de Baixa / Liquidação */}
      <Modal
        open={!!settleEntry}
        onClose={() => setSettleEntry(null)}
        title="Registrar Recebimento (Baixa)"
      >
        <form onSubmit={handleSettle}>
          <p style={{ fontSize: '0.875rem', color: '#cbd5e1', marginBottom: '1rem' }}>
            Confirmar recebimento para o título <strong>{settleEntry?.title}</strong>.
          </p>

          <CurrencyField
            label="Valor Efetivamente Recebido (R$) *"
            value={settleAmount}
            onChange={setSettleAmount}
            required
          />

          <div style={{ marginTop: '0.75rem' }}>
            <TextField
              label="Data do Recebimento *"
              type="date"
              value={settleDate}
              onChange={(e) => setSettleDate(e.target.value)}
              required
            />
          </div>

          <div style={{ marginTop: '0.75rem' }}>
            <SelectField
              label="Conta Bancária de Entrada *"
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
              {settling ? 'Confirmando…' : 'Confirmar Recebimento'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal de Editar Recebimento */}
      <Modal
        open={!!editingEntry}
        onClose={() => setEditingEntry(null)}
        title="Editar Lançamento a Receber"
      >
        <form onSubmit={handleUpdate}>
          <TextField
            label="Título / Descrição *"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            required
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.75rem' }}>
            <CurrencyField
              label="Valor Nominal (R$) *"
              value={editValue}
              onChange={setEditValue}
            />
            <TextField
              label="Data de Vencimento *"
              type="date"
              value={editDueDate}
              onChange={(e) => setEditDueDate(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.75rem' }}>
            <TextField
              label="Data de Competência (DRE)"
              type="date"
              value={editCompetenceDate}
              onChange={(e) => setEditCompetenceDate(e.target.value)}
            />
            <SelectField
              label="Status *"
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value as FinancialEntryStatus)}
              options={[
                { value: 'PENDING', label: 'Aguardando' },
                { value: 'PARTIALLY_PAID', label: 'Parcial' },
                { value: 'PAID', label: 'Recebido' },
                { value: 'OVERDUE', label: 'Em atraso' },
                { value: 'CANCELED', label: 'Cancelado' },
              ]}
              disabled={!!(editingEntry?.chargeId && editingEntry?.status === 'PAID')}
            />
          </div>

          <div style={{ marginTop: '0.75rem' }}>
            <SelectField
              label="Categoria Contábil *"
              value={editCategoryId}
              onChange={(e) => setEditCategoryId(e.target.value)}
              options={categories.map((c) => ({ value: c.id, label: `${c.code} - ${c.name}` }))}
            />
          </div>

          <div style={{ marginTop: '0.75rem' }}>
            <SelectField
              label="Cliente Vinculado (Opcional)"
              value={editClientId}
              onChange={(e) => setEditClientId(e.target.value)}
              options={[
                { value: '', label: 'Sem vínculo com cliente específico' },
                ...clients.map((c) => ({ value: c.id, label: c.tradeName || c.corporateName })),
              ]}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.75rem' }}>
            <SelectField
              label="Conta Bancária Destino"
              value={editAccountId}
              onChange={(e) => setEditAccountId(e.target.value)}
              options={[
                { value: '', label: 'Nenhuma / Padrão' },
                ...accounts.map((a) => ({ value: a.id, label: `${a.name} (${a.bankName || a.accountType})` })),
              ]}
            />
            <SelectField
              label="Forma de Pagamento"
              value={editPaymentMethod}
              onChange={(e) => setEditPaymentMethod(e.target.value)}
              options={[
                { value: 'PIX', label: 'PIX' },
                { value: 'BOLETO', label: 'Boleto Bancário' },
                { value: 'CREDIT_CARD', label: 'Cartão de Crédito' },
                { value: 'BANK_TRANSFER', label: 'Transferência / TED' },
                { value: 'MONEY', label: 'Dinheiro / Espécie' },
              ]}
            />
          </div>

          <div style={{ marginTop: '0.75rem' }}>
            <TextField
              label="Observações / Notas Internas"
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              placeholder="Anotações internas sobre este recebimento..."
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.625rem', marginTop: '1.5rem' }}>
            <Button type="button" variant="ghost" onClick={() => setEditingEntry(null)}>
              Cancelar
            </Button>
            <Button type="submit" loading={updating}>
              Salvar Alterações
            </Button>
          </div>
        </form>
      </Modal>

      {/* Confirmação de Exclusão */}
      <ConfirmDialog
        open={!!deleteId}
        onCancel={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Excluir Lançamento"
        message="Tem certeza que deseja excluir este lançamento financeiro a receber?"
        confirmLabel="Sim, excluir"
      />
    </div>
  );
}
export default AccountsReceivable;
