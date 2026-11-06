import { useState, useEffect, useCallback } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import {
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
import { PageLoader } from '../../../components/ui/Feedback';
import { CurrencyField, SelectField, TextField } from '../../../components/ui/Form';
import { ConfirmDialog, Modal } from '../../../components/ui/Modal';
import { useToast } from '../../../components/ui/Toast';
import { formatCents, parseBRLToCents } from '../../../lib/format';
import { errorMessage } from '../../../lib/validation';
import {
  financialApi,
  type FinancialAccount,
  type FinancialCategory,
  type FinancialCategoryNature,
  type FinancialCostCenter,
  type FinancialSupplier,
} from '../../../lib/financialApi';

type Tab = 'CATEGORIES' | 'COST_CENTERS' | 'ACCOUNTS' | 'SUPPLIERS';

const NATURE_CONFIG: Record<FinancialCategoryNature, { label: string; tone: 'success' | 'warning' | 'danger' | 'info' | 'neutral' }> = {
  REVENUE: { label: 'Receita', tone: 'success' },
  DEDUCTION: { label: 'Dedução', tone: 'warning' },
  DIRECT_COST: { label: 'Custo Direto', tone: 'danger' },
  OPERATING_EXPENSE: { label: 'Despesa Fixa', tone: 'neutral' },
  FINANCIAL_RESULT: { label: 'Resultado Financeiro', tone: 'info' },
};

export function FinancialSettings() {
  const [tab, setTab] = useState<Tab>('CATEGORIES');
  const [loading, setLoading] = useState(true);

  const [categories, setCategories] = useState<FinancialCategory[]>([]);
  const [costCenters, setCostCenters] = useState<FinancialCostCenter[]>([]);
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [suppliers, setSuppliers] = useState<FinancialSupplier[]>([]);

  // Modais de Criação
  const [openCatModal, setOpenCatModal] = useState(false);
  const [openCcModal, setOpenCcModal] = useState(false);
  const [openAccModal, setOpenAccModal] = useState(false);
  const [openSuppModal, setOpenSuppModal] = useState(false);

  // Forms
  const [catName, setCatName] = useState('');
  const [catCode, setCatCode] = useState('');
  const [catNature, setCatNature] = useState<FinancialCategoryNature>('REVENUE');

  const [ccName, setCcName] = useState('');
  const [ccCode, setCcCode] = useState('');
  const [ccDesc, setCcDesc] = useState('');

  const [accName, setAccName] = useState('');
  const [accBank, setAccBank] = useState('');
  const [accBalance, setAccBalance] = useState('0,00');

  const [suppName, setSuppName] = useState('');
  const [suppDoc, setSuppDoc] = useState('');
  const [suppEmail, setSuppEmail] = useState('');
  const [suppPhone, setSuppPhone] = useState('');
  const [suppPix, setSuppPix] = useState('');

  // Modais de Edição
  const [editingCat, setEditingCat] = useState<FinancialCategory | null>(null);
  const [editCatName, setEditCatName] = useState('');
  const [editCatCode, setEditCatCode] = useState('');
  const [editCatNature, setEditCatNature] = useState<FinancialCategoryNature>('REVENUE');

  const [editingCc, setEditingCc] = useState<FinancialCostCenter | null>(null);
  const [editCcName, setEditCcName] = useState('');
  const [editCcCode, setEditCcCode] = useState('');
  const [editCcDesc, setEditCcDesc] = useState('');

  const [editingAcc, setEditingAcc] = useState<FinancialAccount | null>(null);
  const [editAccName, setEditAccName] = useState('');
  const [editAccBank, setEditAccBank] = useState('');
  const [editAccBalance, setEditAccBalance] = useState('0,00');

  const [editingSupp, setEditingSupp] = useState<FinancialSupplier | null>(null);
  const [editSuppName, setEditSuppName] = useState('');
  const [editSuppDoc, setEditSuppDoc] = useState('');
  const [editSuppEmail, setEditSuppEmail] = useState('');
  const [editSuppPhone, setEditSuppPhone] = useState('');
  const [editSuppPix, setEditSuppPix] = useState('');

  // Modal de Exclusão
  const [deletingTarget, setDeletingTarget] = useState<{
    type: 'category' | 'costCenter' | 'account' | 'supplier';
    id: string;
    name: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const toast = useToast();
  const [version, setVersion] = useState(0);
  const loadAll = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    let active = true;
    Promise.all([
      financialApi.listCategories(),
      financialApi.listCostCenters(),
      financialApi.listAccounts(),
      financialApi.listSuppliers(),
    ])
      .then(([cats, ccs, accs, supps]) => {
        if (!active) return;
        setCategories(cats);
        setCostCenters(ccs);
        setAccounts(accs);
        setSuppliers(supps);
      })
      .catch(() => {
        if (!active) return;
        toast.error('Erro ao carregar configurações financeiras');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [toast, version]);

  const handleCreateCat = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await financialApi.createCategory({ name: catName, code: catCode, nature: catNature });
      toast.success('Categoria criada!');
      setOpenCatModal(false);
      setCatName('');
      setCatCode('');
      await loadAll();
    } catch {
      toast.error('Erro ao criar categoria');
    }
  };

  const handleCreateCc = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await financialApi.createCostCenter({ name: ccName, code: ccCode.toUpperCase(), description: ccDesc });
      toast.success('Centro de custo criado!');
      setOpenCcModal(false);
      setCcName('');
      setCcCode('');
      setCcDesc('');
      await loadAll();
    } catch {
      toast.error('Erro ao criar centro de custo');
    }
  };

  const handleCreateAcc = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await financialApi.createAccount({
        name: accName,
        bankName: accBank,
        accountType: 'CHECKING',
        initialBalanceCents: parseBRLToCents(accBalance),
      });
      toast.success('Conta bancária cadastrada!');
      setOpenAccModal(false);
      setAccName('');
      setAccBank('');
      setAccBalance('0,00');
      await loadAll();
    } catch {
      toast.error('Erro ao cadastrar conta');
    }
  };

  const handleCreateSupp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await financialApi.createSupplier({
        name: suppName,
        document: suppDoc,
        email: suppEmail,
        phone: suppPhone,
        pixKey: suppPix,
      });
      toast.success('Fornecedor cadastrado!');
      setOpenSuppModal(false);
      setSuppName('');
      setSuppDoc('');
      setSuppEmail('');
      setSuppPhone('');
      setSuppPix('');
      await loadAll();
    } catch (err) {
      toast.error(errorMessage(err) || 'Erro ao cadastrar fornecedor');
    }
  };

  // Abrir modais de edição
  const handleOpenEditCat = (c: FinancialCategory) => {
    setEditingCat(c);
    setEditCatName(c.name);
    setEditCatCode(c.code);
    setEditCatNature(c.nature);
  };

  const handleOpenEditCc = (cc: FinancialCostCenter) => {
    setEditingCc(cc);
    setEditCcName(cc.name);
    setEditCcCode(cc.code);
    setEditCcDesc(cc.description || '');
  };

  const handleOpenEditAcc = (acc: FinancialAccount) => {
    setEditingAcc(acc);
    setEditAccName(acc.name);
    setEditAccBank(acc.bankName || '');
    setEditAccBalance((acc.currentBalanceCents / 100).toFixed(2).replace('.', ','));
  };

  const handleOpenEditSupp = (s: FinancialSupplier) => {
    setEditingSupp(s);
    setEditSuppName(s.name);
    setEditSuppDoc(s.document || '');
    setEditSuppEmail(s.email || '');
    setEditSuppPhone(s.phone || '');
    setEditSuppPix(s.pixKey || '');
  };

  // Submissão de edições
  const handleUpdateCat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCat) return;
    try {
      setIsSaving(true);
      await financialApi.updateCategory(editingCat.id, {
        name: editCatName,
        code: editCatCode,
        nature: editCatNature,
      });
      toast.success('Categoria contábil atualizada!');
      setEditingCat(null);
      await loadAll();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateCc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCc) return;
    try {
      setIsSaving(true);
      await financialApi.updateCostCenter(editingCc.id, {
        name: editCcName,
        code: editCcCode.toUpperCase(),
        description: editCcDesc,
      });
      toast.success('Centro de custo atualizado!');
      setEditingCc(null);
      await loadAll();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateAcc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAcc) return;
    try {
      setIsSaving(true);
      await financialApi.updateAccount(editingAcc.id, {
        name: editAccName,
        bankName: editAccBank,
        currentBalanceCents: parseBRLToCents(editAccBalance),
      });
      toast.success('Conta bancária atualizada!');
      setEditingAcc(null);
      await loadAll();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateSupp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSupp) return;
    try {
      setIsSaving(true);
      await financialApi.updateSupplier(editingSupp.id, {
        name: editSuppName,
        document: editSuppDoc,
        email: editSuppEmail,
        phone: editSuppPhone,
        pixKey: editSuppPix,
      });
      toast.success('Fornecedor atualizado!');
      setEditingSupp(null);
      await loadAll();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  // Exclusão
  const handleConfirmDelete = async () => {
    if (!deletingTarget) return;
    try {
      setIsDeleting(true);
      if (deletingTarget.type === 'category') {
        await financialApi.deleteCategory(deletingTarget.id);
        toast.success(`Categoria "${deletingTarget.name}" excluída!`);
      } else if (deletingTarget.type === 'costCenter') {
        await financialApi.deleteCostCenter(deletingTarget.id);
        toast.success(`Centro de custo "${deletingTarget.name}" excluído!`);
      } else if (deletingTarget.type === 'account') {
        await financialApi.deleteAccount(deletingTarget.id);
        toast.success(`Conta bancária "${deletingTarget.name}" excluída!`);
      } else if (deletingTarget.type === 'supplier') {
        await financialApi.deleteSupplier(deletingTarget.id);
        toast.success(`Fornecedor "${deletingTarget.name}" excluído!`);
      }
      setDeletingTarget(null);
      await loadAll();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading && categories.length === 0) {
    return <PageLoader label="Carregando configurações financeiras…" />;
  }

  return (
    <div>
      <PageHeader
        title="Configurações Financeiras"
        description="Gerenciamento do Plano de Contas, Centros de Custo, Contas Bancárias e Fornecedores"
        actions={
          <div>
            {tab === 'CATEGORIES' && (
              <Button size="sm" onClick={() => setOpenCatModal(true)}>
                <Plus size={14} /> Nova Categoria
              </Button>
            )}
            {tab === 'COST_CENTERS' && (
              <Button size="sm" onClick={() => setOpenCcModal(true)}>
                <Plus size={14} /> Novo Centro de Custo
              </Button>
            )}
            {tab === 'ACCOUNTS' && (
              <Button size="sm" onClick={() => setOpenAccModal(true)}>
                <Plus size={14} /> Nova Conta Bancária
              </Button>
            )}
            {tab === 'SUPPLIERS' && (
              <Button size="sm" onClick={() => setOpenSuppModal(true)}>
                <Plus size={14} /> Novo Fornecedor
              </Button>
            )}
          </div>
        }
      />

      <Toolbar>
        <Tabs
          tabs={[
            { key: 'CATEGORIES', label: 'Plano de Contas' },
            { key: 'COST_CENTERS', label: 'Centros de Custo' },
            { key: 'ACCOUNTS', label: 'Contas Bancárias' },
            { key: 'SUPPLIERS', label: 'Fornecedores' },
          ]}
          value={tab}
          onChange={(newTab) => setTab(newTab)}
        />
      </Toolbar>

      {/* 1. Categorias / Plano de Contas */}
      {tab === 'CATEGORIES' && (
        <TableWrap>
          <Table>
            <thead>
              <tr>
                <th>Código</th>
                <th>Nome da Categoria</th>
                <th>Natureza (DRE)</th>
                <th style={{ textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => {
                const nat = NATURE_CONFIG[c.nature] || { label: c.nature, tone: 'neutral' };
                return (
                  <tr key={c.id}>
                    <td>
                      <strong style={{ color: '#38bdf8' }}>{c.code}</strong>
                    </td>
                    <td>{c.name}</td>
                    <td>
                      <StatusPill tone={nat.tone}>{nat.label}</StatusPill>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <RowActions>
                        <IconButton
                          label="Editar categoria"
                          onClick={() => handleOpenEditCat(c)}
                        >
                          <Pencil size={15} />
                        </IconButton>
                        <IconButton
                          label="Excluir categoria"
                          danger
                          onClick={() =>
                            setDeletingTarget({
                              type: 'category',
                              id: c.id,
                              name: c.name,
                            })
                          }
                        >
                          <Trash2 size={15} />
                        </IconButton>
                      </RowActions>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </TableWrap>
      )}

      {/* 2. Centros de Custo */}
      {tab === 'COST_CENTERS' && (
        <TableWrap>
          <Table>
            <thead>
              <tr>
                <th>Código</th>
                <th>Nome</th>
                <th>Descrição</th>
                <th style={{ textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {costCenters.map((cc) => (
                <tr key={cc.id}>
                  <td>
                    <strong style={{ color: '#a78bfa' }}>{cc.code}</strong>
                  </td>
                  <td>{cc.name}</td>
                  <td style={{ color: '#94a3b8' }}>{cc.description || '—'}</td>
                  <td style={{ textAlign: 'right' }}>
                    <RowActions>
                      <IconButton
                        label="Editar centro de custo"
                        onClick={() => handleOpenEditCc(cc)}
                      >
                        <Pencil size={15} />
                      </IconButton>
                      <IconButton
                        label="Excluir centro de custo"
                        danger
                        onClick={() =>
                          setDeletingTarget({
                            type: 'costCenter',
                            id: cc.id,
                            name: cc.name,
                          })
                        }
                      >
                        <Trash2 size={15} />
                      </IconButton>
                    </RowActions>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </TableWrap>
      )}

      {/* 3. Contas Bancárias */}
      {tab === 'ACCOUNTS' && (
        <TableWrap>
          <Table>
            <thead>
              <tr>
                <th>Nome da Conta</th>
                <th>Instituição</th>
                <th>Tipo</th>
                <th>Saldo Atual</th>
                <th style={{ textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((acc) => (
                <tr key={acc.id}>
                  <td>
                    <strong>{acc.name}</strong>{' '}
                    {acc.isDefault && <span style={{ fontSize: '0.6875rem', color: '#3b82f6' }}>(Padrão)</span>}
                  </td>
                  <td style={{ color: '#94a3b8' }}>{acc.bankName || '—'}</td>
                  <td>{acc.accountType}</td>
                  <td>
                    <strong style={{ color: '#10b981' }}>{formatCents(acc.currentBalanceCents)}</strong>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <RowActions>
                      <IconButton
                        label="Editar conta bancária"
                        onClick={() => handleOpenEditAcc(acc)}
                      >
                        <Pencil size={15} />
                      </IconButton>
                      {!acc.isDefault && (
                        <IconButton
                          label="Excluir conta bancária"
                          danger
                          onClick={() =>
                            setDeletingTarget({
                              type: 'account',
                              id: acc.id,
                              name: acc.name,
                            })
                          }
                        >
                          <Trash2 size={15} />
                        </IconButton>
                      )}
                    </RowActions>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </TableWrap>
      )}

      {/* 4. Fornecedores */}
      {tab === 'SUPPLIERS' && (
        <TableWrap>
          <Table>
            <thead>
              <tr>
                <th>Nome / Razão</th>
                <th>Documento</th>
                <th>Contato</th>
                <th>Chave PIX</th>
                <th style={{ textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: '#94a3b8' }}>
                    Nenhum fornecedor cadastrado.
                  </td>
                </tr>
              ) : (
                suppliers.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <strong>{s.name}</strong>
                    </td>
                    <td style={{ color: '#cbd5e1' }}>{s.document || '—'}</td>
                    <td style={{ color: '#94a3b8' }}>{s.email || s.phone || '—'}</td>
                    <td style={{ color: '#38bdf8' }}>{s.pixKey || '—'}</td>
                    <td style={{ textAlign: 'right' }}>
                      <RowActions>
                        <IconButton
                          label="Editar fornecedor"
                          onClick={() => handleOpenEditSupp(s)}
                        >
                          <Pencil size={15} />
                        </IconButton>
                        <IconButton
                          label="Excluir fornecedor"
                          danger
                          onClick={() =>
                            setDeletingTarget({
                              type: 'supplier',
                              id: s.id,
                              name: s.name,
                            })
                          }
                        >
                          <Trash2 size={15} />
                        </IconButton>
                      </RowActions>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </TableWrap>
      )}

      {/* Modal Categoria */}
      <Modal open={openCatModal} onClose={() => setOpenCatModal(false)} title="Nova Categoria Contábil">
        <form onSubmit={handleCreateCat}>
          <TextField
            label="Código (ex: 1.5, 3.4, 4.6) *"
            value={catCode}
            onChange={(e) => setCatCode(e.target.value)}
            required
          />
          <div style={{ marginTop: '0.75rem' }}>
            <TextField
              label="Nome da Categoria *"
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              required
            />
          </div>
          <div style={{ marginTop: '0.75rem' }}>
            <SelectField
              label="Natureza no DRE *"
              value={catNature}
              onChange={(e) => setCatNature(e.target.value as FinancialCategoryNature)}
              options={[
                { value: 'REVENUE', label: '1. Receita Operacional' },
                { value: 'DEDUCTION', label: '2. Dedução da Receita' },
                { value: 'DIRECT_COST', label: '3. Custo Direto (CSP / Repasses)' },
                { value: 'OPERATING_EXPENSE', label: '4. Despesa Operacional / Fixa' },
                { value: 'FINANCIAL_RESULT', label: '5. Resultado Financeiro' },
              ]}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.625rem', marginTop: '1.5rem' }}>
            <Button type="button" variant="ghost" onClick={() => setOpenCatModal(false)}>
              Cancelar
            </Button>
            <Button type="submit">Salvar</Button>
          </div>
        </form>
      </Modal>

      {/* Modal Centro de Custo */}
      <Modal open={openCcModal} onClose={() => setOpenCcModal(false)} title="Novo Centro de Custo">
        <form onSubmit={handleCreateCc}>
          <TextField
            label="Código (ex: PODCAST, DESIGN) *"
            value={ccCode}
            onChange={(e) => setCcCode(e.target.value)}
            required
          />
          <div style={{ marginTop: '0.75rem' }}>
            <TextField
              label="Nome do Centro de Custo *"
              value={ccName}
              onChange={(e) => setCcName(e.target.value)}
              required
            />
          </div>
          <div style={{ marginTop: '0.75rem' }}>
            <TextField
              label="Descrição"
              value={ccDesc}
              onChange={(e) => setCcDesc(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.625rem', marginTop: '1.5rem' }}>
            <Button type="button" variant="ghost" onClick={() => setOpenCcModal(false)}>
              Cancelar
            </Button>
            <Button type="submit">Salvar</Button>
          </div>
        </form>
      </Modal>

      {/* Modal Conta Bancária */}
      <Modal open={openAccModal} onClose={() => setOpenAccModal(false)} title="Nova Conta Bancária">
        <form onSubmit={handleCreateAcc}>
          <TextField
            label="Nome da Conta (ex: Banco Santander) *"
            value={accName}
            onChange={(e) => setAccName(e.target.value)}
            required
          />
          <div style={{ marginTop: '0.75rem' }}>
            <TextField
              label="Instituição / Banco"
              value={accBank}
              onChange={(e) => setAccBank(e.target.value)}
              placeholder="ex: Santander, Itaú, Nubank"
            />
          </div>
          <div style={{ marginTop: '0.75rem' }}>
            <CurrencyField
              label="Saldo Inicial (R$)"
              value={accBalance}
              onChange={setAccBalance}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.625rem', marginTop: '1.5rem' }}>
            <Button type="button" variant="ghost" onClick={() => setOpenAccModal(false)}>
              Cancelar
            </Button>
            <Button type="submit">Salvar</Button>
          </div>
        </form>
      </Modal>

      {/* Modal Fornecedor */}
      <Modal open={openSuppModal} onClose={() => setOpenSuppModal(false)} title="Novo Fornecedor">
        <form onSubmit={handleCreateSupp}>
          <TextField
            label="Nome / Razão Social *"
            value={suppName}
            onChange={(e) => setSuppName(e.target.value)}
            required
          />
          <div style={{ marginTop: '0.75rem' }}>
            <TextField
              label="CNPJ ou CPF"
              value={suppDoc}
              onChange={(e) => setSuppDoc(e.target.value)}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.75rem' }}>
            <TextField
              label="E-mail"
              type="email"
              value={suppEmail}
              onChange={(e) => setSuppEmail(e.target.value)}
            />
            <TextField
              label="Telefone / WhatsApp"
              value={suppPhone}
              onChange={(e) => setSuppPhone(e.target.value)}
            />
          </div>
          <div style={{ marginTop: '0.75rem' }}>
            <TextField
              label="Chave PIX"
              value={suppPix}
              onChange={(e) => setSuppPix(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.625rem', marginTop: '1.5rem' }}>
            <Button type="button" variant="ghost" onClick={() => setOpenSuppModal(false)}>
              Cancelar
            </Button>
            <Button type="submit">Salvar Fornecedor</Button>
          </div>
        </form>
      </Modal>

      {/* Modal Editar Categoria */}
      <Modal open={!!editingCat} onClose={() => setEditingCat(null)} title="Editar Categoria Contábil">
        <form onSubmit={handleUpdateCat}>
          <TextField
            label="Código (ex: 1.5, 3.4, 4.6) *"
            value={editCatCode}
            onChange={(e) => setEditCatCode(e.target.value)}
            required
          />
          <div style={{ marginTop: '0.75rem' }}>
            <TextField
              label="Nome da Categoria *"
              value={editCatName}
              onChange={(e) => setEditCatName(e.target.value)}
              required
            />
          </div>
          <div style={{ marginTop: '0.75rem' }}>
            <SelectField
              label="Natureza no DRE *"
              value={editCatNature}
              onChange={(e) => setEditCatNature(e.target.value as FinancialCategoryNature)}
              options={[
                { value: 'REVENUE', label: '1. Receita Operacional' },
                { value: 'DEDUCTION', label: '2. Dedução da Receita' },
                { value: 'DIRECT_COST', label: '3. Custo Direto (CSP / Repasses)' },
                { value: 'OPERATING_EXPENSE', label: '4. Despesa Operacional / Fixa' },
                { value: 'FINANCIAL_RESULT', label: '5. Resultado Financeiro' },
              ]}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.625rem', marginTop: '1.5rem' }}>
            <Button type="button" variant="ghost" onClick={() => setEditingCat(null)}>
              Cancelar
            </Button>
            <Button type="submit" loading={isSaving}>Salvar Alterações</Button>
          </div>
        </form>
      </Modal>

      {/* Modal Editar Centro de Custo */}
      <Modal open={!!editingCc} onClose={() => setEditingCc(null)} title="Editar Centro de Custo">
        <form onSubmit={handleUpdateCc}>
          <TextField
            label="Código (ex: PODCAST, DESIGN) *"
            value={editCcCode}
            onChange={(e) => setEditCcCode(e.target.value)}
            required
          />
          <div style={{ marginTop: '0.75rem' }}>
            <TextField
              label="Nome do Centro de Custo *"
              value={editCcName}
              onChange={(e) => setEditCcName(e.target.value)}
              required
            />
          </div>
          <div style={{ marginTop: '0.75rem' }}>
            <TextField
              label="Descrição"
              value={editCcDesc}
              onChange={(e) => setEditCcDesc(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.625rem', marginTop: '1.5rem' }}>
            <Button type="button" variant="ghost" onClick={() => setEditingCc(null)}>
              Cancelar
            </Button>
            <Button type="submit" loading={isSaving}>Salvar Alterações</Button>
          </div>
        </form>
      </Modal>

      {/* Modal Editar Conta Bancária */}
      <Modal open={!!editingAcc} onClose={() => setEditingAcc(null)} title="Editar Conta Bancária">
        <form onSubmit={handleUpdateAcc}>
          <TextField
            label="Nome da Conta *"
            value={editAccName}
            onChange={(e) => setEditAccName(e.target.value)}
            required
          />
          <div style={{ marginTop: '0.75rem' }}>
            <TextField
              label="Instituição / Banco"
              value={editAccBank}
              onChange={(e) => setEditAccBank(e.target.value)}
            />
          </div>
          <div style={{ marginTop: '0.75rem' }}>
            <CurrencyField
              label="Saldo Atual (R$)"
              value={editAccBalance}
              onChange={setEditAccBalance}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.625rem', marginTop: '1.5rem' }}>
            <Button type="button" variant="ghost" onClick={() => setEditingAcc(null)}>
              Cancelar
            </Button>
            <Button type="submit" loading={isSaving}>Salvar Alterações</Button>
          </div>
        </form>
      </Modal>

      {/* Modal Editar Fornecedor */}
      <Modal open={!!editingSupp} onClose={() => setEditingSupp(null)} title="Editar Fornecedor">
        <form onSubmit={handleUpdateSupp}>
          <TextField
            label="Nome / Razão Social *"
            value={editSuppName}
            onChange={(e) => setEditSuppName(e.target.value)}
            required
          />
          <div style={{ marginTop: '0.75rem' }}>
            <TextField
              label="CNPJ ou CPF"
              value={editSuppDoc}
              onChange={(e) => setEditSuppDoc(e.target.value)}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.75rem' }}>
            <TextField
              label="E-mail"
              type="email"
              value={editSuppEmail}
              onChange={(e) => setEditSuppEmail(e.target.value)}
            />
            <TextField
              label="Telefone / WhatsApp"
              value={editSuppPhone}
              onChange={(e) => setEditSuppPhone(e.target.value)}
            />
          </div>
          <div style={{ marginTop: '0.75rem' }}>
            <TextField
              label="Chave PIX"
              value={editSuppPix}
              onChange={(e) => setEditSuppPix(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.625rem', marginTop: '1.5rem' }}>
            <Button type="button" variant="ghost" onClick={() => setEditingSupp(null)}>
              Cancelar
            </Button>
            <Button type="submit" loading={isSaving}>Salvar Alterações</Button>
          </div>
        </form>
      </Modal>

      {/* Modal Confirmação de Exclusão */}
      <ConfirmDialog
        open={!!deletingTarget}
        title="Confirmar Exclusão"
        message={`Tem certeza de que deseja excluir ${
          deletingTarget?.type === 'category'
            ? `a categoria "${deletingTarget?.name}"`
            : deletingTarget?.type === 'costCenter'
            ? `o centro de custo "${deletingTarget?.name}"`
            : deletingTarget?.type === 'account'
            ? `a conta bancária "${deletingTarget?.name}"`
            : `o fornecedor "${deletingTarget?.name}"`
        }? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        loading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingTarget(null)}
      />
    </div>
  );
}
export default FinancialSettings;
