import Image from 'next/image';
import { formatMarketCap, formatPrice } from '@/lib/formatters';
import { fixLogoUrl } from '@/lib/supabase/storage';
import ChangeIndicator from '@/components/ui/ChangeIndicator';

export default function DetailHeader({ security, rank, actions }) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
      <div className="flex-shrink-0">
        {security.logo_url ? (
          <Image
            src={fixLogoUrl(security.logo_url)}
            alt={`${security.name} logo`}
            width={64}
            height={64}
            className="rounded-2xl"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-400/30 text-xl font-bold">
            {security.symbol?.slice(0, 2)}
          </div>
        )}
      </div>

      <div className="flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold sm:text-3xl">{security.name}</h1>
          <span className="inline-flex items-center rounded-full bg-slate-400/20 px-3 py-0.5 text-sm font-semibold">
            {security.symbol}
          </span>
          {actions}
        </div>

        <div className="mt-2 flex flex-wrap items-baseline gap-3">
          <span className="font-mono text-3xl font-bold sm:text-4xl">
            {formatPrice(security.price)}
          </span>
          <ChangeIndicator value={security.change_1d_pct} />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm text-slate-400">
            {formatMarketCap(security.market_cap)}
          </span>
          {rank && (
            <span className="rounded-full bg-amber-50/40 px-2.5 py-0.5 text-xs font-semibold text-slate-800">
              Rank #{rank} on KLSE
            </span>
          )}
          {security.sector && (
            <span className="rounded-full bg-primary-light/20 px-2.5 py-0.5 text-xs font-medium">
              {security.sector}
            </span>
          )}
          {security.industry && (
            <span className="rounded-full bg-blue-100/30 px-2.5 py-0.5 text-xs font-medium">
              {security.industry}
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
