import { useMemo, useState } from 'react';
import styled from 'styled-components';
import { Building2, Eye, Mail, Phone, Trash2 } from 'lucide-react';
import {
  CellMain,
  DetailList,
  IconButton,
  PageHeader,
  RowActions,
  StatusPill,
  Table,
  TableWrap,
  Tabs,
  Toolbar,
} from '../../components/admin/AdminUI';
import { Button, ButtonAnchor } from '../../components/ui/Button';
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/Feedback';
import type { Tone } from '../../components/ui/Feedback';
import { SelectField } from '../../components/ui/Form';
import { WhatsAppIcon } from '../../components/ui/icons';
import { ConfirmDialog, Modal } from '../../components/ui/Modal';
import { Pagination } from '../../components/ui/Pagination';
import { SearchInput } from '../../components/ui/SearchInput';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../context/auth-context';
import { useDebounce } from '../../hooks/useDebounce';
import { useFetch } from '../../hooks/useFetch';
import { usePage } from '../../hooks/usePage';
import { api } from '../../lib/api';
import { formatDateTime, formatShortDate } from '../../lib/format';
import type { ContactRequest, ContactStatus, ContactType, Paginated } from '../../lib/types';
import { errorMessage } from '../../lib/validation';

type Tab = ContactStatus | 'ALL';

const STATUS: Record<ContactStatus, { label: string; tone: Tone }> = {
  NEW: { label: 'Novo', tone: 'warning' },
  IN_PROGRESS: { label: 'Em andamento', tone: 'info' },
  DONE: { label: 'Concluído', tone: 'success' },
};

const TYPE: Record<ContactType, { label: string; tone: Tone }> = {
  GENERAL: { label: 'Contato', tone: 'neutral' },
  BUDGET: { label: 'Orçamento', tone: 'primary' },
};

const Message = styled.div`
  padding: 1rem 1.1rem;
  background: ${({ theme }) => theme.colors.background};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  white-space: pre-line;
  line-height: 1.7;
`;

const Stack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;

  h4 {
    font-size: 0.78rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: ${({ theme }) => theme.colors.textMuted};
    margin-bottom: 0.6rem;
  }
  .row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem;
  }
  .head {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.6rem;
  }
`;

const SegmentButton = styled.button<{ $active: boolean }>`
  padding: 0.5rem 1rem;
  border-radius: ${({ theme }) => theme.radii.pill};
  border: 1px solid ${({ $active, theme }) => ($active ? theme.colors.primary : theme.colors.borderStrong)};
  background: ${({ $active, theme }) => ($active ? theme.colors.primarySoft : 'transparent')};
  color: ${({ $active, theme }) => ($active ? theme.colors.primary : theme.colors.textSecondary)};
  font-weight: 700;
  font-size: 0.9rem;
  transition: all ${({ theme }) => theme.transitions.fast};

  &:hover:not(:disabled) {
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

const whatsappLink = (phone: string, name: string) => {
  let digits = phone.replace(/\D/g, '');
  if (digits.length <= 11) digits = `55${digits}`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(`Olá, ${name}! Aqui é da equipe PicPlus, sobre o seu contato pelo nosso site.`)}`;
};

function ContactDrawer({
  contact,
  onClose,
  onChanged,
  onDeleted,
}: {
  contact: ContactRequest;
  onClose: () => void;
  onChanged: (updated: ContactRequest) => void;
  onDeleted: () => void;
}) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const { can } = useAuth();
  const [confirming, setConfirming] = useState(false);

  const setStatus = async (status: ContactStatus) => {
    if (status === contact.status) return;
    setBusy(true);
    try {
      const updated = await api.patch<ContactRequest>(`/admin/contacts/${contact.id}/status`, { status });
      onChanged(updated);
      toast.success(`Marcado como "${STATUS[status].label.toLowerCase()}".`);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await api.delete(`/admin/contacts/${contact.id}`);
      toast.success('Contato excluído.');
      onDeleted();
    } catch (error) {
      toast.error(errorMessage(error));
      setBusy(false);
    }
  };

  const subject = encodeURIComponent(`Re: seu contato com a PicPlus`);

  return (
    <>
      <Modal open variant="drawer" width="560px" title={contact.name} description={formatDateTime(contact.createdAt)} onClose={onClose}>
        <Stack>
          <div className="head">
            <StatusPill tone={TYPE[contact.type].tone}>{TYPE[contact.type].label}</StatusPill>
            <StatusPill tone={STATUS[contact.status].tone}>{STATUS[contact.status].label}</StatusPill>
          </div>

          <div className="row">
            <ButtonAnchor href={`mailto:${contact.email}?subject=${subject}`} $size="sm">
              <Mail size={16} aria-hidden /> Responder por e-mail
            </ButtonAnchor>
            {contact.phone && (
              <ButtonAnchor
                href={whatsappLink(contact.phone, contact.name)}
                target="_blank"
                rel="noopener noreferrer"
                $variant="secondary"
                $size="sm"
              >
                <WhatsAppIcon size={16} aria-hidden /> WhatsApp
              </ButtonAnchor>
            )}
          </div>

          <div>
            <h4>Mensagem</h4>
            <Message>{contact.message}</Message>
          </div>

          <div>
            <h4>Dados</h4>
            <DetailList>
              <dt>E-mail</dt>
              <dd>
                <a href={`mailto:${contact.email}`}>{contact.email}</a>
              </dd>
              <dt>Telefone</dt>
              <dd>
                {contact.phone ? (
                  <>
                    <Phone size={13} aria-hidden /> {contact.phone}
                  </>
                ) : (
                  '—'
                )}
              </dd>
              <dt>Empresa</dt>
              <dd>
                {contact.company ? (
                  <>
                    <Building2 size={13} aria-hidden /> {contact.company}
                  </>
                ) : (
                  '—'
                )}
              </dd>
              {contact.type === 'BUDGET' && (
                <>
                  <dt>Serviço</dt>
                  <dd>{contact.serviceInterest ?? '—'}</dd>
                  <dt>Investimento</dt>
                  <dd>{contact.budgetRange ?? '—'}</dd>
                </>
              )}
            </DetailList>
          </div>

          <div>
            <h4>Andamento</h4>
            <div className="row" role="group" aria-label="Alterar status">
              {(Object.keys(STATUS) as ContactStatus[]).map((status) => (
                <SegmentButton
                  key={status}
                  type="button"
                  $active={contact.status === status}
                  aria-pressed={contact.status === status}
                  disabled={busy || !can('contacts.edit')}
                  onClick={() => setStatus(status)}
                >
                  {STATUS[status].label}
                </SegmentButton>
              ))}
            </div>
          </div>

          {can('contacts.delete') && (<div>
            <Button variant="ghost" onClick={() => setConfirming(true)}>
              <Trash2 size={16} aria-hidden /> Excluir contato
            </Button>
          </div>)}
        </Stack>
      </Modal>

      <ConfirmDialog
        open={confirming}
        title="Excluir contato"
        message={
          <>
            Excluir o contato de <strong>{contact.name}</strong>? Esta ação não pode ser desfeita.
          </>
        }
        loading={busy}
        onConfirm={remove}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
}

export function Contacts() {
  const [tab, setTab] = useState<Tab>('NEW');
  const [type, setType] = useState<ContactType | ''>('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<ContactRequest | null>(null);
  const debounced = useDebounce(search);
  const [page, setPage] = usePage(`${tab}|${type}|${debounced}`);

  const query = useMemo(
    () => ({
      status: tab === 'ALL' ? undefined : tab,
      type: type || undefined,
      search: debounced.trim() || undefined,
      page,
      limit: 15,
    }),
    [tab, type, debounced, page],
  );
  const { data, loading, error, reload } = useFetch<Paginated<ContactRequest>>('/admin/contacts', query);
  const items = data?.items ?? [];

  return (
    <>
      <PageHeader title="Contatos e orçamentos" description="Mensagens e pedidos de orçamento enviados pelo site." />

      <Toolbar>
        <Tabs<Tab>
          value={tab}
          onChange={setTab}
          tabs={[
            { key: 'NEW', label: 'Novos' },
            { key: 'IN_PROGRESS', label: 'Em andamento' },
            { key: 'DONE', label: 'Concluídos' },
            { key: 'ALL', label: 'Todos' },
          ]}
        />
        <div style={{ minWidth: 190 }}>
          <SelectField
            label="Tipo"
            required
            options={[
              { value: '', label: 'Todos os tipos' },
              { value: 'BUDGET', label: 'Orçamentos' },
              { value: 'GENERAL', label: 'Contatos' },
            ]}
            value={type}
            onChange={(e) => setType(e.target.value as ContactType | '')}
          />
        </div>
        <div className="grow">
          <SearchInput value={search} onChange={setSearch} label="Buscar" placeholder="Buscar por nome, e-mail ou mensagem…" />
        </div>
      </Toolbar>

      {error ? (
        <ErrorState message={error.message} onRetry={reload} />
      ) : loading && !data ? (
        <Skeleton $h="260px" />
      ) : items.length === 0 ? (
        <EmptyState
          title="Nada por aqui"
          description={tab === 'NEW' && !debounced ? 'Não há mensagens novas. Bom trabalho!' : 'Nenhum resultado para os filtros atuais.'}
        />
      ) : (
        <>
          <TableWrap style={{ opacity: loading ? 0.6 : 1 }}>
            <Table>
              <thead>
                <tr>
                  <th>Contato</th>
                  <th>Tipo</th>
                  <th>Mensagem</th>
                  <th>Status</th>
                  <th>Recebido</th>
                  <th className="right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="clickable" onClick={() => setSelected(item)}>
                    <td>
                      <CellMain>
                        <div>
                          <strong>{item.name}</strong>
                          <small>{item.company ? `${item.company} · ${item.email}` : item.email}</small>
                        </div>
                      </CellMain>
                    </td>
                    <td>
                      <StatusPill tone={TYPE[item.type].tone}>{TYPE[item.type].label}</StatusPill>
                    </td>
                    <td className="muted" style={{ maxWidth: 280 }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.message}</div>
                    </td>
                    <td>
                      <StatusPill tone={STATUS[item.status].tone}>{STATUS[item.status].label}</StatusPill>
                    </td>
                    <td className="muted">{formatShortDate(item.createdAt)}</td>
                    <td className="right">
                      <RowActions>
                        <IconButton
                          label={`Abrir contato de ${item.name}`}
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
        <ContactDrawer
          contact={selected}
          onClose={() => setSelected(null)}
          onChanged={(updated) => {
            setSelected(updated);
            reload();
          }}
          onDeleted={() => {
            setSelected(null);
            reload();
          }}
        />
      )}
    </>
  );
}
