import Image from 'next/image';
import Link from 'next/link';
import { formatMarketCap, formatPrice } from '@/lib/formatters';
import { fixLogoUrl } from '@/lib/supabase/storage';
import ChangeIndicator from '@/components/ui/ChangeIndicator';

export default function PeersTable({ peers }) {
  if (!peers || peers.length === 0) return null;

  return (
    <section aria-label="Similar companies">
      <h2 className="text-xl font-bold">Similar Companies</h2>
      <div className="mt-3 overflow-x-auto rounded-2xl bg-white shadow-card">
        <table className="w-full min-w-[500px] text-sm">
          <thead>
            <tr className="border-b border-slate-300/20 text-left text-xs text-slate-400">
              <th className="px-4 py-3">Company</th>
              <th className="px-4 py-3 text-right">Market Cap</th>
              <th className="px-4 py-3 text-right">Price</th>
              <th className="px-4 py-3 text-right">1D Change</th>
            </tr>
          </thead>
          <tbody>
            {peers.map((peer, i) => {
              return (
                <tr
                  key={peer.symbol}
                  className={`border-b border-slate-300/10 last:border-0 ${
                    i % 2 === 1 ? 'bg-surface/30' : ''
                  }`}
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/stock/${peer.symbol.toLowerCase()}`}
                      className="flex items-center gap-2 hover:underline"
                    >
                      {peer.logo_url ? (
                        <Image
                          src={fixLogoUrl(peer.logo_url)}
                          alt={peer.name}
                          width={24}
                          height={24}
                          className="rounded-lg"
                        />
                      ) : (
                        <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-400/20 text-[10px] font-bold">
                          {peer.symbol?.slice(0, 2)}
                        </div>
                      )}
                      <span className="font-semibold">{peer.symbol}</span>
                      <span className="hidden text-slate-400 sm:inline">{peer.name}</span>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    {formatMarketCap(peer.market_cap)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">{formatPrice(peer.price)}</td>
                  <td className="px-4 py-3 text-right">
                    <ChangeIndicator value={peer.change_1d_pct} />
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
