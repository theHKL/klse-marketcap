import { formatPrice } from '@/lib/formatters';

export default function PriceRangeBar({ low, high, current, label }) {
  if (low == null || high == null || current == null) return null;

  const range = high - low;
  const position = range > 0 ? ((current - low) / range) * 100 : 50;
  const clampedPosition = Math.max(0, Math.min(100, position));

  return (
    <div className="flex flex-col gap-1" aria-label={`${label} price range`}>
      <p className="text-xs font-medium text-slate-400">{label}</p>
      <div className="flex items-center gap-3">
        <span className="font-mono text-xs text-slate-400">{formatPrice(low)}</span>
        <div className="relative flex-1 h-2 rounded-full bg-slate-400/20">
          <div
            className="absolute top-0 left-0 h-full rounded-full bg-primary-light"
            style={{ width: `${clampedPosition}%` }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 h-4 w-4 rounded-full border-2 border-white bg-slate-800 shadow-card"
            style={{ left: `${clampedPosition}%`, marginLeft: '-8px' }}
            aria-label={`Current price: ${formatPrice(current)}`}
          />
        </div>
        <span className="font-mono text-xs text-slate-400">{formatPrice(high)}</span>
      </div>
    </div>
  );
}
