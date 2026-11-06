import { useState } from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import {
  Activity,
  ArrowDownCircle,
  ArrowUpCircle,
  Building,
  CheckCircle2,
  FileSpreadsheet,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { PageHeader, Panel } from '../../../components/admin/AdminUI';
import { Button } from '../../../components/ui/Button';
import { ErrorState, PageLoader } from '../../../components/ui/Feedback';
import { useToast } from '../../../components/ui/Toast';
import { useFetch } from '../../../hooks/useFetch';
import { formatCents } from '../../../lib/format';
import { financialApi, type FinancialStats } from '../../../lib/financialApi';

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1.25rem;
  margin-bottom: 1.75rem;
`;

const StatCard = styled(Panel)<{ $highlight?: 'success' | 'danger' | 'info' | 'warning' }>`
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  border-top: 3px solid
    ${({ $highlight }) =>
      $highlight === 'success'
        ? '#10b981'
        : $highlight === 'danger'
        ? '#ef4444'
        : $highlight === 'info'
        ? '#3b82f6'
        : $highlight === 'warning'
        ? '#f59e0b'
        : 'rgba(255, 255, 255, 0.1)'};
`;

const StatLabel = styled.span`
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--text-muted, #94a3b8);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
`;

const StatValue = styled.span`
  font-size: 1.625rem;
  font-weight: 700;
  color: var(--text-primary, #f8fafc);
  letter-spacing: -0.02em;
`;

const StatSub = styled.span`
  font-size: 0.75rem;
  color: var(--text-muted, #94a3b8);
  margin-top: 0.375rem;
`;

const HealthSection = styled(Panel)`
  padding: 1.5rem;
  margin-bottom: 1.75rem;
`;

const HealthScoreWrap = styled.div`
  display: flex;
  align-items: center;
  gap: 1.5rem;
  flex-wrap: wrap;
`;

const ScoreCircle = styled.div<{ $score: number }>`
  width: 90px;
  height: 90px;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 4px solid
    ${({ $score }) =>
      $score >= 70 ? '#10b981' : $score >= 45 ? '#f59e0b' : '#ef4444'};
  background: ${({ $score }) =>
    $score >= 70 ? 'rgba(16, 185, 129, 0.1)' : $score >= 45 ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)'};

  strong {
    font-size: 1.75rem;
    font-weight: 800;
    color: var(--text-primary, #f8fafc);
    line-height: 1;
  }
  span {
    font-size: 0.6875rem;
    color: var(--text-muted, #94a3b8);
    text-transform: uppercase;
    font-weight: 600;
    margin-top: 2px;
  }
`;

const AccountItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.875rem 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);

  &:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }
`;

export function FinancialOverview() {
  const { data: stats, loading, error, reload } = useFetch<FinancialStats>('/admin/finance/stats');
  const [syncing, setSyncing] = useState(false);
  const toast = useToast();

  const handleSyncAsaas = async () => {
    try {
      setSyncing(true);
      await financialApi.syncCharges();
      toast.success('Cobranças do Asaas sincronizadas com sucesso!');
      reload();
    } catch {
      toast.error('Falha ao sincronizar com Asaas');
    } finally {
      setSyncing(false);
    }
  };

  if (loading && !stats) return <PageLoader label="Carregando inteligência financeira…" />;
  if (error || !stats) return <ErrorState message="Não foi possível obter os dados financeiros." onRetry={reload} />;

  const isProfitable = stats.projectedResultMonthCents >= 0;

  return (
    <div>
      <PageHeader
        title="Saúde & Indicadores Financeiros"
        description="Visão consolidada de caixa, competência, fôlego financeiro e liquidez da PicPlus"
        actions={
          <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap' }}>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleSyncAsaas}
              disabled={syncing}
            >
              <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
              {syncing ? 'Sincronizando…' : 'Sincronizar Asaas'}
            </Button>
            <Link to="/admin/financeiro/receber">
              <Button variant="secondary" size="sm">
                <ArrowDownCircle size={14} style={{ color: '#10b981' }} />
                A Receber
              </Button>
            </Link>
            <Link to="/admin/financeiro/pagar">
              <Button variant="secondary" size="sm">
                <ArrowUpCircle size={14} style={{ color: '#ef4444' }} />
                A Pagar
              </Button>
            </Link>
          </div>
        }
      />

      {/* Seção de Saúde Financeira */}
      <HealthSection>
        <div style={{ marginBottom: '1.25rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity size={18} style={{ color: '#3b82f6' }} />
            Diagnóstico de Saúde & Fôlego Operacional
          </h2>
          <p style={{ fontSize: '0.8125rem', color: '#94a3b8', marginTop: '0.25rem' }}>
            Avaliação algorítmica contínua considerando liquidez, margem projetada e taxa de inadimplência.
          </p>
        </div>

        <HealthScoreWrap>
          <ScoreCircle $score={stats.healthScore}>
            <strong>{stats.healthScore}</strong>
            <span>{stats.healthScore >= 70 ? 'Ótima' : stats.healthScore >= 45 ? 'Estável' : 'Atenção'}</span>
          </ScoreCircle>

          <div style={{ flex: 1, minWidth: '220px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Fôlego de Caixa (Runway)</span>
                <p style={{ fontSize: '1.25rem', fontWeight: 700, color: stats.runwayMonths >= 3 ? '#10b981' : '#f59e0b' }}>
                  {stats.runwayMonths} meses
                </p>
                <span style={{ fontSize: '0.6875rem', color: '#64748b' }}>
                  Sobrevida com o saldo atual sem novas receitas
                </span>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Burn Rate Médio</span>
                <p style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f8fafc' }}>
                  {formatCents(stats.burnRateCents)}
                </p>
                <span style={{ fontSize: '0.6875rem', color: '#64748b' }}>
                  Despesa operacional média mensal
                </span>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Taxa de Inadimplência</span>
                <p style={{ fontSize: '1.25rem', fontWeight: 700, color: stats.defaultRate <= 5 ? '#10b981' : '#ef4444' }}>
                  {stats.defaultRate}%
                </p>
                <span style={{ fontSize: '0.6875rem', color: '#64748b' }}>
                  {formatCents(stats.overdueReceivableCents)} em atraso
                </span>
              </div>
            </div>
          </div>
        </HealthScoreWrap>
      </HealthSection>

      {/* Grid de KPIs do Mês */}
      <Grid>
        <StatCard $highlight="info">
          <StatLabel>
            <Wallet size={16} /> Saldo Geral em Caixa
          </StatLabel>
          <StatValue>{formatCents(stats.totalCashCents)}</StatValue>
          <StatSub>{stats.accounts.length} conta(s) bancária(s) ativas</StatSub>
        </StatCard>

        <StatCard $highlight="success">
          <StatLabel>
            <ArrowDownCircle size={16} /> A Receber no Mês
          </StatLabel>
          <StatValue>{formatCents(stats.totalReceivableMonthCents)}</StatValue>
          <StatSub>
            <CheckCircle2 size={12} style={{ display: 'inline', marginRight: 4, color: '#10b981' }} />
            {formatCents(stats.totalReceivedMonthCents)} já liquidado
          </StatSub>
        </StatCard>

        <StatCard $highlight="danger">
          <StatLabel>
            <ArrowUpCircle size={16} /> A Pagar no Mês
          </StatLabel>
          <StatValue>{formatCents(stats.totalPayableMonthCents)}</StatValue>
          <StatSub>
            {formatCents(stats.totalPaidMonthCents)} já quitado
          </StatSub>
        </StatCard>

        <StatCard $highlight={isProfitable ? 'success' : 'danger'}>
          <StatLabel>
            {isProfitable ? <TrendingUp size={16} /> : <TrendingDown size={16} />} Resultado Previsto (Mês)
          </StatLabel>
          <StatValue style={{ color: isProfitable ? '#10b981' : '#ef4444' }}>
            {formatCents(stats.projectedResultMonthCents)}
          </StatValue>
          <StatSub>
            Realizado até agora: {formatCents(stats.realizedResultMonthCents)}
          </StatSub>
        </StatCard>
      </Grid>

      {/* Saldos por Conta Bancária & Acesso aos Relatórios */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
        <Panel style={{ padding: '1.25rem' }}>
          <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Building size={16} /> Contas Bancárias & Carteiras
          </h3>
          {stats.accounts.length === 0 ? (
            <p style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>Nenhuma conta cadastrada.</p>
          ) : (
            stats.accounts.map((acc) => (
              <AccountItem key={acc.id}>
                <div>
                  <strong style={{ fontSize: '0.875rem', color: '#f8fafc', display: 'block' }}>
                    {acc.name} {acc.isDefault && <span style={{ fontSize: '0.6875rem', color: '#3b82f6' }}>(Padrão)</span>}
                  </strong>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{acc.bankName || 'Carteira Digital'}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#f8fafc' }}>
                    {formatCents(acc.currentBalanceCents)}
                  </span>
                </div>
              </AccountItem>
            ))
          )}
        </Panel>

        <Panel style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileSpreadsheet size={16} /> Relatórios & Inteligência Contábil
            </h3>
            <p style={{ fontSize: '0.8125rem', color: '#94a3b8', marginBottom: '1.25rem' }}>
              Acesse as demonstrações financeiras oficiais da PicPlus por competência ou visão diária de caixa.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <Link to="/admin/financeiro/dre" style={{ flex: 1, minWidth: '140px' }}>
              <Button variant="secondary" style={{ width: '100%', justifyContent: 'center' }}>
                <FileSpreadsheet size={14} />
                DRE Gerencial
              </Button>
            </Link>
            <Link to="/admin/financeiro/fluxo-caixa" style={{ flex: 1, minWidth: '140px' }}>
              <Button variant="secondary" style={{ width: '100%', justifyContent: 'center' }}>
                <TrendingUp size={14} />
                Fluxo de Caixa
              </Button>
            </Link>
          </div>
        </Panel>
      </div>
    </div>
  );
}
export default FinancialOverview;
