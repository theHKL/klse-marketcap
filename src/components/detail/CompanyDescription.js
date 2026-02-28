import { formatDate, formatNumber } from '@/lib/formatters';

export default function CompanyDescription({ security, id }) {
  const isFinancial = security.sector === 'Financial Services' || security.sector === 'Financials';

  return (
    <section id={id} aria-label="Company information">
      <h2 className="text-xl font-bold">About {security.name}</h2>

      {security.description && (
        <p className="mt-3 leading-relaxed text-slate-500">{security.description}</p>
      )}

      {isFinancial && (
        <p className="mt-2 rounded-xl bg-amber-50/20 px-3 py-2 text-xs text-slate-400">
          Cash flow metrics for financial institutions may differ due to banking-specific accounting.
        </p>
      )}

      <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
        {security.ipo_date && (
          <div>
            <p className="text-xs text-slate-400">IPO Date</p>
            <p className="font-mono text-sm font-medium">{formatDate(security.ipo_date)}</p>
          </div>
        )}
        {security.ceo && (
          <div>
            <p className="text-xs text-slate-400">CEO</p>
            <p className="text-sm font-medium">{security.ceo}</p>
          </div>
        )}
        {security.employees && (
          <div>
            <p className="text-xs text-slate-400">Employees</p>
            <p className="font-mono text-sm font-medium">{formatNumber(security.employees)}</p>
          </div>
        )}
        {security.website && (() => {
          try {
            const hostname = new URL(security.website).hostname.replace('www.', '');
            return (
              <div>
                <p className="text-xs text-slate-400">Website</p>
                <a
                  href={security.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-blue-500 hover:underline"
                >
                  {hostname}
                </a>
              </div>
            );
          } catch {
            return null;
          }
        })()}
      </div>
    </section>
  );
}
