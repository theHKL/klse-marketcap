'use client';

import Sparkline from '@/components/ui/Sparkline';
import { useMarketOverview } from '@/lib/hooks/useMarketOverview';

function IndexCard({ label, price, changePercent, sparkline }) {
  const isPositive = changePercent >= 0;

  return (
    <div className="rounded-xl border border-slate-300/20 bg-white px-3 pb-2 pt-2.5">
      <div className="text-[11px] font-medium text-slate-400">{label}</div>
      <div className="mt-0.5 flex items-baseline gap-2">
        <span className="text-base font-bold text-slate-800">
          {price.toLocaleString('en-MY', {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1,
          })}
        </span>
        <span
          className={`font-mono text-[11px] font-semibold ${
            isPositive ? 'text-emerald-600' : 'text-red-500'
          }`}
        >
          {isPositive ? '▲' : '▼'} {Math.abs(changePercent).toFixed(2)}%
        </span>
      </div>
      <div className="mt-1">
        <Sparkline data={sparkline} width={200} height={28} className="h-7 w-full" />
      </div>
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="rounded-xl border border-slate-300/20 bg-white px-3 pb-2 pt-2.5">
      <div className="h-3 w-16 animate-pulse rounded bg-slate-400/20" />
      <div className="mt-2 h-5 w-20 animate-pulse rounded bg-slate-400/20" />
      <div className="mt-2 h-7 w-full animate-pulse rounded bg-slate-400/10" />
    </div>
  );
}

export default function MarketOverviewCards() {
  const { data, failed } = useMarketOverview();

  if (failed) return null;

  return (
    <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
      {!data ? (
        <>
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </>
      ) : (
        data.indices.map((idx) => (
          <IndexCard
            key={idx.symbol}
            label={idx.label}
            price={idx.price}
            changePercent={idx.changePercent}
            sparkline={idx.sparkline}
          />
        ))
      )}
    </div>
  );
}
