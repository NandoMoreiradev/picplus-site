import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import styled from 'styled-components';
import {
  ArrowLeft,
  Copy,
  DollarSign,
  ExternalLink,
  Mail,
  Phone,
  Plus,
  QrCode,
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
import { SelectField, TextArea, TextField } from '../../components/ui/Form';
import { WhatsAppIcon } from '../../components/ui/icons';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../context/auth-context';
import { useFetch } from '../../hooks/useFetch';
import { api } from '../../lib/api';
import {
  formatCents,
  formatDateTime,
  formatShortDate,
  maskCnpjCpf,
  maskPhone,
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

  // Modais
  const [chargeModalOpen, setChargeModalOpen] = useState(false);
  const [chargeDescription, setChargeDescription] = useState('');
  const [chargeValueInput, setChargeValueInput] = useState('');
  const [chargeDueDate, setChargeDueDate] = useState('');
  const [chargeBillingType, setChargeBillingType] = useState<ChargeBillingType>('PIX');
  const [creatingCharge, setCreatingCharge] = useState(false);

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

  if (loading) return <PageLoader />;
  if (error || !client) return <ErrorState message="Cliente não encontrado." />;

  const statusCfg = STATUS_CONFIG[client.status] || {
    label: client.status,
    tone: 'neutral',
  };

  // Gerar Nova Cobrança no Asaas
  const handleCreateCharge = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanValue = Math.round((parseFloat(chargeValueInput.replace(',', '.')) || 0) * 100);
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
      });

      toast.success('Cobrança gerada com sucesso via Asaas v3!');
      setChargeModalOpen(false);
      setChargeDescription('');
      setChargeValueInput('');
      setChargeDueDate('');
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
              <h3>Parâmetros de Contrato</h3>
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
                    <th>Asaas</th>
                    <th>Comprovante / Pagamento</th>
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
                          <strong>{charge.description}</strong>
                        </td>
                        <td>
                          <span style={{ fontWeight: 800 }}>{formatCents(charge.valueCents)}</span>
                        </td>
                        <td>{formatShortDate(charge.dueDate)}</td>
                        <td>
                          <span style={{ fontSize: '0.85rem' }}>{charge.billingType}</span>
                        </td>
                        <td>
                          <StatusPill tone={chargeStatus.tone}>{chargeStatus.label}</StatusPill>
                        </td>
                        <td>
                          <small style={{ fontFamily: 'monospace', color: '#888' }}>
                            {charge.asaasPaymentId || '—'}
                          </small>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
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
        width="540px"
      >
        <form onSubmit={handleCreateCharge}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <TextField
              label="Descrição do Serviço ou Job"
              required
              placeholder="Ex: Fee Mensal - Novembro/2026"
              value={chargeDescription}
              onChange={(e) => setChargeDescription(e.target.value)}
            />
            <TextField
              label="Valor da Cobrança (R$)"
              required
              placeholder="Ex: 3500,00"
              value={chargeValueInput}
              onChange={(e) => setChargeValueInput(e.target.value)}
            />
            <TextField
              label="Data de Vencimento"
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
    </>
  );
}
