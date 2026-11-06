import { useState, useEffect } from 'react';
import styled from 'styled-components';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Wallet,
} from 'lucide-react';
import { PageHeader, Panel } from '../../../components/admin/AdminUI';
import { PageLoader, ErrorState } from '../../../components/ui/Feedback';
import { formatCents } from '../../../lib/format';
import { financialApi, type CashFlowReport } from '../../../lib/financialApi';

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.25rem;
  margin-bottom: 1.75rem;
`;

const FlowCard = styled(Panel)<{ $type: 'inflow' | 'outflow' | 'net' }>`
  padding: 1.5rem;
  border-top: 3px solid
    ${({ $type }) =>
      $type === 'inflow' ? '#10b981' : $type === 'outflow' ? '#ef4444' : '#3b82f6'};
`;

const FlowTitle = styled.h3`
  font-size: 0.875rem;
  color: var(--text-muted, #94a3b8);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
`;

const FlowRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);

  &:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }
`;

export function CashFlow() {
  const now = new Date();
  const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const defaultEnd = new Date(now.getFullYear(), now.getMonth() + 2, 0).toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);
  const [report, setReport] = useState<CashFlowReport | null>(null);
  const [loading, setLoading] = useState(true);

  const loadFlow = async () => {
    try {
      setLoading(true);
      const data = await financialApi.getCashFlow(startDate, endDate);
      setReport(data);
    } catch {
      // Error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFlow();
  }, [startDate, endDate]);

  if (loading && !report) return <PageLoader label="Calculando Fluxo de Caixa…" />;
  if (!report) return <ErrorState message="Não foi possível carregar o fluxo de caixa." />;

  const { realized, projected, totalForecastCents } = report;

  return (
    <div>
      <PageHeader
        title="Fluxo de Caixa"
        description="Movimentações financeiras sob o regime de caixa (entradas e saídas efetivas vs. projeções)"
        actions={
          <div style={{ display: 'flex', gap: '0.625rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>De:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{
                  background: 'var(--bg-input, #0f172a)',
                  color: '#f8fafc',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  padding: '0.375rem 0.625rem',
                  borderRadius: '0.375rem',
                  fontSize: '0.8125rem',
                }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Até:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{
                  background: 'var(--bg-input, #0f172a)',
                  color: '#f8fafc',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  padding: '0.375rem 0.625rem',
                  borderRadius: '0.375rem',
                  fontSize: '0.8125rem',
                }}
              />
            </div>
          </div>
        }
      />

      <Grid>
        {/* Entradas */}
        <FlowCard $type="inflow">
          <FlowTitle>
            <ArrowDownCircle size={18} style={{ color: '#10b981' }} />
            Entradas de Caixa
          </FlowTitle>

          <FlowRow>
            <span style={{ fontSize: '0.8125rem', color: '#cbd5e1' }}>Realizado (Liquidado)</span>
            <strong style={{ fontSize: '1rem', color: '#10b981' }}>
              {formatCents(realized.inflowCents)}
            </strong>
          </FlowRow>
          <FlowRow>
            <span style={{ fontSize: '0.8125rem', color: '#cbd5e1' }}>Previsto (Em aberto)</span>
            <strong style={{ fontSize: '1rem', color: '#34d399' }}>
              {formatCents(projected.inflowCents)}
            </strong>
          </FlowRow>
          <FlowRow style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px dashed rgba(255, 255, 255, 0.1)' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>Total Estimado de Entradas</span>
            <strong style={{ fontSize: '1.125rem', color: '#10b981' }}>
              {formatCents(realized.inflowCents + projected.inflowCents)}
            </strong>
          </FlowRow>
        </FlowCard>

        {/* Saídas */}
        <FlowCard $type="outflow">
          <FlowTitle>
            <ArrowUpCircle size={18} style={{ color: '#ef4444' }} />
            Saídas de Caixa
          </FlowTitle>

          <FlowRow>
            <span style={{ fontSize: '0.8125rem', color: '#cbd5e1' }}>Realizado (Pago)</span>
            <strong style={{ fontSize: '1rem', color: '#ef4444' }}>
              {formatCents(realized.outflowCents)}
            </strong>
          </FlowRow>
          <FlowRow>
            <span style={{ fontSize: '0.8125rem', color: '#cbd5e1' }}>Previsto (A pagar)</span>
            <strong style={{ fontSize: '1rem', color: '#f87171' }}>
              {formatCents(projected.outflowCents)}
            </strong>
          </FlowRow>
          <FlowRow style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px dashed rgba(255, 255, 255, 0.1)' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>Total Estimado de Saídas</span>
            <strong style={{ fontSize: '1.125rem', color: '#ef4444' }}>
              {formatCents(realized.outflowCents + projected.outflowCents)}
            </strong>
          </FlowRow>
        </FlowCard>

        {/* Saldo Líquido */}
        <FlowCard $type="net">
          <FlowTitle>
            <Wallet size={18} style={{ color: '#3b82f6' }} />
            Saldo Operacional Líquido
          </FlowTitle>

          <FlowRow>
            <span style={{ fontSize: '0.8125rem', color: '#cbd5e1' }}>Líquido Realizado</span>
            <strong style={{ fontSize: '1rem', color: realized.netCents >= 0 ? '#10b981' : '#ef4444' }}>
              {formatCents(realized.netCents)}
            </strong>
          </FlowRow>
          <FlowRow>
            <span style={{ fontSize: '0.8125rem', color: '#cbd5e1' }}>Líquido Previsto</span>
            <strong style={{ fontSize: '1rem', color: projected.netCents >= 0 ? '#10b981' : '#ef4444' }}>
              {formatCents(projected.netCents)}
            </strong>
          </FlowRow>
          <FlowRow style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px dashed rgba(255, 255, 255, 0.1)' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>Resultado Projetado Final</span>
            <strong style={{ fontSize: '1.125rem', color: totalForecastCents >= 0 ? '#10b981' : '#ef4444' }}>
              {formatCents(totalForecastCents)}
            </strong>
          </FlowRow>
        </FlowCard>
      </Grid>
    </div>
  );
}
export default CashFlow;
