import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { ArrowRight, FileText, Inbox, Newspaper, Plus, Sparkles, Star, Trophy, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { CellMain, PageHeader, Panel, StatusPill } from '../../components/admin/AdminUI';
import { Button, ButtonLink } from '../../components/ui/Button';
import { EmptyState, ErrorState, Skeleton } from '../../components/ui/Feedback';
import { Avatar } from '../../components/ui/Avatar';
import { useAuth } from '../../context/auth-context';
import { useFetch } from '../../hooks/useFetch';
import { formatShortDate } from '../../lib/format';
import type { AdminStats, InfluencerList } from '../../lib/types';

const StatGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
`;

const StatCard = styled(Link)<{ $highlight?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1.35rem;
  background: ${({ $highlight, theme }) => ($highlight ? theme.colors.primarySoft : theme.colors.surface)};
  border: 1px solid ${({ $highlight, theme }) => ($highlight ? theme.colors.primaryBorder : theme.colors.border)};
  border-radius: ${({ theme }) => theme.radii.lg};
  color: inherit;
  transition: all ${({ theme }) => theme.transitions.fast};

  &:hover {
    color: inherit;
    transform: translateY(-3px);
    border-color: ${({ theme }) => theme.colors.primary};
  }
  .top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-weight: 700;
    font-size: 0.9rem;
  }
  .top svg {
    color: ${({ theme }) => theme.colors.primary};
  }
  strong {
    font-size: 2.4rem;
    line-height: 1;
    font-weight: 900;
  }
  small {
    color: ${({ theme }) => theme.colors.textMuted};
  }
`;

const Columns = styled.div`
  display: grid;
  grid-template-columns: 1.6fr 1fr;
  gap: 1.25rem;
  margin-top: 2rem;

  @media (max-width: ${({ theme }) => theme.breakpoints.laptop}) {
    grid-template-columns: 1fr;
  }
`;

const PanelHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.1rem 1.25rem;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};

  h2 {
    font-size: 1.1rem;
    font-weight: 800;
  }
  a {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    color: ${({ theme }) => theme.colors.primary};
    font-weight: 700;
    font-size: 0.9rem;
  }
`;

const PendingRow = styled(Link)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.9rem 1.25rem;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  color: inherit;

  &:last-child {
    border-bottom: none;
  }
  &:hover {
    color: inherit;
    background: ${({ theme }) => theme.colors.surfaceHover};
  }
`;

const Actions = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  padding: 1.25rem;
`;

export function Dashboard() {
  const { user } = useAuth();
  const stats = useFetch<AdminStats>('/admin/stats');
  const pending = useFetch<InfluencerList>('/admin/influencers', { status: 'PENDING', limit: 5 });

  const s = stats.data;
  const cards: { to: string; label: string; value?: number; hint: string; icon: LucideIcon; highlight?: boolean }[] = [
    {
      to: '/admin/influenciadores',
      label: 'Aguardando aprovação',
      value: s?.pendingInfluencers,
      hint: 'cadastros de influenciadores',
      icon: Users,
      highlight: (s?.pendingInfluencers ?? 0) > 0,
    },
    {
      to: '/admin/contatos',
      label: 'Pedidos de orçamento',
      value: s?.newBudgets,
      hint: 'novos, sem resposta',
      icon: FileText,
      highlight: (s?.newBudgets ?? 0) > 0,
    },
    { to: '/admin/contatos', label: 'Mensagens de contato', value: s?.newContacts, hint: 'novas, sem resposta', icon: Inbox },
    { to: '/admin/blog', label: 'Rascunhos de artigos', value: s?.draftArticles, hint: 'aguardando publicação', icon: Newspaper },
  ];
  const secondary = [
    { label: 'Na vitrine', value: s?.onShowcase, icon: Star },
    { label: 'Artigos publicados', value: s?.publishedArticles, icon: Newspaper },
    { label: 'Cases', value: s?.cases, icon: Trophy },
    { label: 'Serviços', value: s?.services, icon: Sparkles },
  ];

  return (
    <>
      <PageHeader
        title={`Olá, ${user?.name.split(' ')[0] ?? 'bem-vindo'}!`}
        description="Resumo do que precisa da sua atenção hoje."
      />

      {stats.error ? (
        <ErrorState message={stats.error.message} onRetry={stats.reload} />
      ) : (
        <>
          <StatGrid>
            {cards.map(({ to, label, value, hint, icon: Icon, highlight }) => (
              <StatCard key={label} to={to} $highlight={highlight}>
                <span className="top">
                  {label} <Icon size={20} aria-hidden />
                </span>
                {value === undefined ? <Skeleton $h="2.4rem" $w="70px" /> : <strong>{value}</strong>}
                <small>{hint}</small>
              </StatCard>
            ))}
          </StatGrid>
          <StatGrid style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
            {secondary.map(({ label, value, icon: Icon }) => (
              <Panel key={label} style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
                <Icon size={20} color="#B6E829" aria-hidden />
                <div>
                  <strong style={{ fontSize: '1.4rem', fontWeight: 800 }}>{value ?? '–'}</strong>
                  <div style={{ color: '#a3a3a3', fontSize: '0.82rem' }}>{label}</div>
                </div>
              </Panel>
            ))}
          </StatGrid>
        </>
      )}

      <Columns>
        <Panel>
          <PanelHead>
            <h2>Cadastros pendentes</h2>
            <Link to="/admin/influenciadores">
              Ver todos <ArrowRight size={16} aria-hidden />
            </Link>
          </PanelHead>
          {pending.loading && !pending.data ? (
            <div style={{ padding: '1.25rem', display: 'grid', gap: '0.75rem' }}>
              <Skeleton $h="48px" />
              <Skeleton $h="48px" />
              <Skeleton $h="48px" />
            </div>
          ) : (pending.data?.items.length ?? 0) > 0 ? (
            pending.data?.items.map((item) => (
              <PendingRow key={item.id} to={`/admin/influenciadores?abrir=${item.id}`}>
                <CellMain>
                  <Avatar src={item.profileImage} name={item.name} size={42} />
                  <div>
                    <strong>{item.name}</strong>
                    <small>
                      {item.niche ?? 'Sem nicho'} · {formatShortDate(item.createdAt)}
                    </small>
                  </div>
                </CellMain>
                <StatusPill tone="warning">Pendente</StatusPill>
              </PendingRow>
            ))
          ) : (
            <div style={{ padding: '1.25rem' }}>
              <EmptyState title="Tudo em dia" description="Não há cadastros aguardando análise." />
            </div>
          )}
        </Panel>

        <Panel>
          <PanelHead>
            <h2>Ações rápidas</h2>
          </PanelHead>
          <Actions>
            <ButtonLink to="/admin/blog/novo" $variant="secondary" $block>
              <Plus size={18} aria-hidden /> Novo artigo
            </ButtonLink>
            <ButtonLink to="/admin/cases?novo=1" $variant="secondary" $block>
              <Plus size={18} aria-hidden /> Novo case de sucesso
            </ButtonLink>
            <ButtonLink to="/admin/servicos?novo=1" $variant="secondary" $block>
              <Plus size={18} aria-hidden /> Novo serviço
            </ButtonLink>
            <Button variant="ghost" block onClick={() => window.open('/', '_blank', 'noopener')}>
              Ver o site público
            </Button>
          </Actions>
        </Panel>
      </Columns>
    </>
  );
}
