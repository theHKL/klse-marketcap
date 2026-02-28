import { formatMarketCap, formatNumber } from '@/lib/formatters';

function Row({ label, value, className = '' }) {
  return (
    <tr className="border-b border-slate-300/10 last:border-0">
      <td className="px-4 py-2.5 text-sm text-slate-400">{label}</td>
      <td className={`px-4 py-2.5 text-right font-mono text-sm font-medium ${className}`}>
        {value}
      </td>
    </tr>
  );
}

function fmtBig(value) {
  if (value == null) return '\u2014';
  if (Math.abs(value) >= 1e9) return `RM${(value / 1e9).toFixed(2)}B`;
  if (Math.abs(value) >= 1e6) return `RM${(value / 1e6).toFixed(1)}M`;
  return `RM${value.toLocaleString()}`;
}

function fmtPct(value) {
  if (value == null) return '\u2014';
  return `${(value * 100).toFixed(2)}%`;
}

export default function FinancialDataTable({ latestIncome, latestBalance, latestCashFlow, latestMetrics }) {
  return (
    <section aria-label="Key financial data">
      <h2 className="text-xl font-bold">Key Financial Data</h2>
      <div className="mt-3 overflow-hidden rounded-2xl bg-white shadow-card">
        <table className="w-full text-sm">
          <tbody>
            <Row label="Revenue (Quarterly)" value={fmtBig(latestIncome?.revenue)} />
            <Row label="Net Income (Quarterly)" value={fmtBig(latestIncome?.net_income)} />
            <Row label="Total Assets" value={fmtBig(latestBalance?.total_assets)} />
            <Row label="Total Debt" value={fmtBig(latestBalance?.total_debt)} />
            <Row label="Free Cash Flow" value={fmtBig(latestCashFlow?.free_cash_flow)} />
            <Row label="Return on Equity" value={fmtPct(latestMetrics?.roe)} />
            <Row label="Profit Margin" value={latestIncome?.revenue && latestIncome?.net_income != null
              ? fmtPct(latestIncome.net_income / latestIncome.revenue)
              : '\u2014'}
            />
            <Row label="Operating Margin" value={latestIncome?.revenue && latestIncome?.operating_income != null
              ? fmtPct(latestIncome.operating_income / latestIncome.revenue)
              : '\u2014'}
            />
          </tbody>
        </table>
      </div>
    </section>
  );
}
