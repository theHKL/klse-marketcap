import { formatPrice, formatVolume, formatDate } from '@/lib/formatters';
import ChangeIndicator from '@/components/ui/ChangeIndicator';

export default function HistoricalPriceTable({ prices }) {
  if (!prices || prices.length === 0) return null;

  // Show last 30 days, most recent first
  const rows = [...prices].reverse().slice(0, 30);

  return (
    <section aria-label="Historical price data">
      <h2 className="text-xl font-bold">Historical Prices</h2>
      <div className="mt-3 overflow-x-auto rounded-2xl bg-white shadow-card">
        <table className="w-full min-w-[600px] text-sm">
          <thead>
            <tr className="border-b border-slate-300/20 text-left text-xs text-slate-400">
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3 text-right">Open</th>
              <th className="px-4 py-3 text-right">High</th>
              <th className="px-4 py-3 text-right">Low</th>
              <th className="px-4 py-3 text-right">Close</th>
              <th className="px-4 py-3 text-right">Volume</th>
              <th className="px-4 py-3 text-right">Change %</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const changePct =
                row.open && row.close
                  ? ((row.close - row.open) / row.open) * 100
                  : null;

              return (
                <tr
                  key={row.date}
                  className={`border-b border-slate-300/10 last:border-0 ${
                    i % 2 === 1 ? 'bg-surface/30' : ''
                  }`}
                >
                  <td className="px-4 py-2.5">{formatDate(row.date)}</td>
                  <td className="px-4 py-2.5 text-right font-mono">{formatPrice(row.open)}</td>
                  <td className="px-4 py-2.5 text-right font-mono">{formatPrice(row.high)}</td>
                  <td className="px-4 py-2.5 text-right font-mono">{formatPrice(row.low)}</td>
                  <td className="px-4 py-2.5 text-right font-mono font-semibold">{formatPrice(row.close)}</td>
                  <td className="px-4 py-2.5 text-right font-mono">{formatVolume(row.volume)}</td>
                  <td className="px-4 py-2.5 text-right">
                    <ChangeIndicator value={changePct} />
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
