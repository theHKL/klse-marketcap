import Link from 'next/link';
import { formatMarketCap } from '@/lib/formatters';

export default function HoldingsTable({ holdings }) {
  if (!holdings || holdings.length === 0) return null;

  // Show top 20, sorted by weight descending
  const top = [...holdings]
    .sort((a, b) => (b.weight_percentage || 0) - (a.weight_percentage || 0))
    .slice(0, 20);

  const maxWeight = top[0]?.weight_percentage || 1;

  return (
    <section aria-label="Top ETF holdings">
      <h2 className="text-xl font-bold">Top Holdings</h2>
      <div className="mt-3 overflow-x-auto rounded-2xl bg-white shadow-card">
        <table className="w-full min-w-[500px] text-sm">
          <thead>
            <tr className="border-b border-slate-300/20 text-left text-xs text-slate-400">
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">Symbol</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3 text-right">Weight</th>
              <th className="px-4 py-3 text-right">Market Value</th>
            </tr>
          </thead>
          <tbody>
            {top.map((h, i) => {
              const barWidth =
                maxWeight > 0 ? ((h.weight_percentage || 0) / maxWeight) * 100 : 0;
              // Strip .KL suffix if present to create link
              const cleanSymbol = h.holding_symbol?.replace('.KL', '').toLowerCase();

              return (
                <tr
                  key={h.holding_symbol || i}
                  className={`border-b border-slate-300/10 last:border-0 ${
                    i % 2 === 1 ? 'bg-surface/30' : ''
                  }`}
                >
                  <td className="px-4 py-2.5 text-slate-400">{i + 1}</td>
                  <td className="px-4 py-2.5">
                    {cleanSymbol ? (
                      <Link
                        href={`/stock/${cleanSymbol}`}
                        className="font-semibold text-blue-500 hover:underline"
                      >
                        {h.holding_symbol?.replace('.KL', '') || '\u2014'}
                      </Link>
                    ) : (
                      <span className="font-semibold">{h.holding_symbol || '\u2014'}</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-slate-400">{h.holding_name || '\u2014'}</td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="hidden w-20 sm:block">
                        <div
                          className="h-2 rounded-full bg-primary-light"
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                      <span className="font-mono text-sm font-medium">
                        {h.weight_percentage != null ? `${Number(h.weight_percentage).toFixed(2)}%` : '\u2014'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono">
                    {formatMarketCap(h.market_value)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
