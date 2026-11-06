import { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Printer } from 'lucide-react';
import { PageHeader, Panel, TableWrap } from '../../../components/admin/AdminUI';
import { Button } from '../../../components/ui/Button';
import { PageLoader, ErrorState } from '../../../components/ui/Feedback';
import { formatCents } from '../../../lib/format';
import { financialApi, type DreReport } from '../../../lib/financialApi';

const DreTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8125rem;

  th,
  td {
    padding: 0.625rem 0.75rem;
    text-align: right;
    white-space: nowrap;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);

    &:first-child {
      text-align: left;
      position: sticky;
      left: 0;
      background: var(--bg-card, #1e293b);
      z-index: 2;
      min-width: 220px;
      font-weight: 500;
    }
  }

  th {
    background: rgba(255, 255, 255, 0.02);
    color: var(--text-muted, #94a3b8);
    font-weight: 600;
  }

  tr.subtotal {
    background: rgba(59, 130, 246, 0.05);
    td {
      font-weight: 700;
      color: #93c5fd;
      border-top: 1px solid rgba(59, 130, 246, 0.2);
      border-bottom: 1px solid rgba(59, 130, 246, 0.2);
      &:first-child {
        background: #1e293b;
      }
    }
  }

  tr.total {
    background: rgba(16, 185, 129, 0.08);
    td {
      font-size: 0.875rem;
      font-weight: 800;
      border-top: 2px solid rgba(16, 185, 129, 0.3);
      border-bottom: 2px solid rgba(16, 185, 129, 0.3);
      &:first-child {
        background: #1e293b;
      }
    }
  }
`;

const MONTH_NAMES = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
];

export function DreStatement() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState<number>(currentYear);
  const [report, setReport] = useState<DreReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    financialApi
      .getDre(year)
      .then((data) => {
        if (!active) return;
        setReport(data);
      })
      .catch(() => {
        // Error
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [year]);

  if (loading && !report) return <PageLoader label="Calculando DRE Gerencial…" />;
  if (!report) return <ErrorState message="Não foi possível processar o DRE." />;

  const { months, totals } = report;
  const isNetProfitPositive = totals.netProfitCents >= 0;

  return (
    <div>
      <PageHeader
        title="DRE Gerencial"
        description="Demonstrativo do Resultado do Exercício por regime de competência (visão contábil e de rentabilidade)"
        actions={
          <div style={{ display: 'flex', gap: '0.625rem', alignItems: 'center' }}>
            <select
              style={{
                background: 'var(--bg-input, #0f172a)',
                color: 'var(--text-primary, #f8fafc)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                padding: '0.375rem 0.75rem',
                borderRadius: '0.375rem',
                fontSize: '0.8125rem',
              }}
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value, 10))}
            >
              {[currentYear + 1, currentYear, currentYear - 1, currentYear - 2].map((y) => (
                <option key={y} value={y}>
                  Exercício {y}
                </option>
              ))}
            </select>
            <Button variant="secondary" size="sm" onClick={() => window.print()}>
              <Printer size={14} /> Imprimir / PDF
            </Button>
          </div>
        }
      />

      <Panel style={{ overflow: 'hidden', padding: 0 }}>
        <TableWrap style={{ maxHeight: 'calc(100vh - 220px)', overflow: 'auto' }}>
          <DreTable>
            <thead>
              <tr>
                <th>Estrutura da Demonstração</th>
                {MONTH_NAMES.map((name) => (
                  <th key={name}>{name}</th>
                ))}
                <th style={{ color: '#38bdf8', fontWeight: 700 }}>Total {year}</th>
              </tr>
            </thead>
            <tbody>
              {/* (+) Receita Bruta */}
              <tr>
                <td>(+) Receita Operacional Bruta</td>
                {months.map((m) => (
                  <td key={m.month}>{formatCents(m.grossRevenueCents)}</td>
                ))}
                <td style={{ fontWeight: 700 }}>{formatCents(totals.grossRevenueCents)}</td>
              </tr>

              {/* (-) Deduções */}
              <tr>
                <td style={{ color: '#f59e0b' }}>(-) Deduções & Impostos sobre Venda</td>
                {months.map((m) => (
                  <td key={m.month} style={{ color: '#f59e0b' }}>
                    {m.deductionsCents > 0 ? `-${formatCents(m.deductionsCents)}` : 'R$ 0,00'}
                  </td>
                ))}
                <td style={{ color: '#f59e0b', fontWeight: 700 }}>
                  {totals.deductionsCents > 0 ? `-${formatCents(totals.deductionsCents)}` : 'R$ 0,00'}
                </td>
              </tr>

              {/* (=) Receita Líquida */}
              <tr className="subtotal">
                <td>(=) Receita Operacional Líquida</td>
                {months.map((m) => (
                  <td key={m.month}>{formatCents(m.netRevenueCents)}</td>
                ))}
                <td>{formatCents(totals.netRevenueCents)}</td>
              </tr>

              {/* (-) Custos Diretos */}
              <tr>
                <td style={{ color: '#f87171' }}>(-) Custos dos Serviços Prestados (CSP)</td>
                {months.map((m) => (
                  <td key={m.month} style={{ color: '#f87171' }}>
                    {m.directCostsCents > 0 ? `-${formatCents(m.directCostsCents)}` : 'R$ 0,00'}
                  </td>
                ))}
                <td style={{ color: '#f87171', fontWeight: 700 }}>
                  {totals.directCostsCents > 0 ? `-${formatCents(totals.directCostsCents)}` : 'R$ 0,00'}
                </td>
              </tr>

              {/* (=) Margem Bruta */}
              <tr className="subtotal">
                <td>(=) Lucro Bruto / Margem Bruta</td>
                {months.map((m) => (
                  <td key={m.month}>{formatCents(m.grossProfitCents)}</td>
                ))}
                <td>{formatCents(totals.grossProfitCents)}</td>
              </tr>

              {/* (-) Despesas Operacionais */}
              <tr>
                <td style={{ color: '#c084fc' }}>(-) Despesas Fixas & Operacionais</td>
                {months.map((m) => (
                  <td key={m.month} style={{ color: '#c084fc' }}>
                    {m.operatingExpensesCents > 0 ? `-${formatCents(m.operatingExpensesCents)}` : 'R$ 0,00'}
                  </td>
                ))}
                <td style={{ color: '#c084fc', fontWeight: 700 }}>
                  {totals.operatingExpensesCents > 0 ? `-${formatCents(totals.operatingExpensesCents)}` : 'R$ 0,00'}
                </td>
              </tr>

              {/* (=) EBITDA */}
              <tr className="subtotal">
                <td>(=) EBITDA (Resultado Operacional)</td>
                {months.map((m) => (
                  <td key={m.month}>{formatCents(m.ebitdaCents)}</td>
                ))}
                <td>{formatCents(totals.ebitdaCents)}</td>
              </tr>

              {/* (+/-) Resultado Financeiro */}
              <tr>
                <td>(+/-) Resultado Financeiro Líquido</td>
                {months.map((m) => (
                  <td key={m.month}>
                    {m.financialResultCents >= 0
                      ? formatCents(m.financialResultCents)
                      : `-${formatCents(Math.abs(m.financialResultCents))}`}
                  </td>
                ))}
                <td style={{ fontWeight: 700 }}>
                  {totals.financialResultCents >= 0
                    ? formatCents(totals.financialResultCents)
                    : `-${formatCents(Math.abs(totals.financialResultCents))}`}
                </td>
              </tr>

              {/* (=) Lucro Líquido Final */}
              <tr className="total">
                <td style={{ color: isNetProfitPositive ? '#10b981' : '#ef4444' }}>
                  (=) Lucro Líquido do Exercício
                </td>
                {months.map((m) => (
                  <td
                    key={m.month}
                    style={{ color: m.netProfitCents >= 0 ? '#10b981' : '#ef4444' }}
                  >
                    {formatCents(m.netProfitCents)}
                  </td>
                ))}
                <td style={{ color: isNetProfitPositive ? '#10b981' : '#ef4444' }}>
                  {formatCents(totals.netProfitCents)}
                </td>
              </tr>

              {/* Margem Líquida % */}
              <tr>
                <td>Margem Líquida (%)</td>
                {months.map((m) => (
                  <td key={m.month} style={{ color: m.marginPercent >= 0 ? '#38bdf8' : '#ef4444' }}>
                    {m.marginPercent}%
                  </td>
                ))}
                <td style={{ fontWeight: 700, color: '#38bdf8' }}>
                  {totals.netRevenueCents > 0
                    ? `${((totals.netProfitCents / totals.netRevenueCents) * 100).toFixed(1)}%`
                    : '0%'}
                </td>
              </tr>
            </tbody>
          </DreTable>
        </TableWrap>
      </Panel>
    </div>
  );
}
export default DreStatement;
