import { formatMarketCap, formatPrice, formatDate, formatNumber } from '@/lib/formatters';

function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-300/10 px-4 py-2.5 last:border-0">
      <span className="text-sm text-slate-400">{label}</span>
      <span className="font-mono text-sm font-medium">{value}</span>
    </div>
  );
}

export default function EtfInfoCard({ etfDetails }) {
  if (!etfDetails) return null;

  return (
    <section aria-label="ETF information">
      <h2 className="text-xl font-bold">ETF Details</h2>
      <div className="mt-3 overflow-hidden rounded-2xl bg-white shadow-card">
        <InfoRow label="AUM" value={formatMarketCap(etfDetails.aum)} />
        <InfoRow
          label="Expense Ratio"
          value={etfDetails.expense_ratio != null ? `${etfDetails.expense_ratio}%` : '\u2014'}
        />
        <InfoRow label="NAV" value={formatPrice(etfDetails.nav)} />
        <InfoRow label="Issuer" value={etfDetails.issuer || '\u2014'} />
        <InfoRow label="Inception Date" value={formatDate(etfDetails.inception_date)} />
        <InfoRow label="Asset Class" value={etfDetails.asset_class || '\u2014'} />
        {etfDetails.category && typeof etfDetails.category === 'string' && !etfDetails.category.startsWith('[') && (
          <InfoRow label="Category" value={etfDetails.category} />
        )}
        {etfDetails.holdings_count != null && (
          <InfoRow label="Holdings" value={formatNumber(etfDetails.holdings_count)} />
        )}
      </div>
    </section>
  );
}
