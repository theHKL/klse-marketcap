'use client'

export default function PriceRangeBar({
  label,
  low,
  high,
  current,
  formatFn = (v) => v.toFixed(2),
}) {
  // Calculate marker position
  let pct
  if (low === high) {
    pct = 50
  } else {
    pct = ((current - low) / (high - low)) * 100
    // Clamp between 0 and 100
    pct = Math.max(0, Math.min(100, pct))
  }

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <span className="text-xs text-silver uppercase">{label}</span>
      )}
      <div className="flex items-center gap-2">
        <span className="text-xs font-mono text-slate">{formatFn(low)}</span>
        <div className="relative h-2 flex-1 bg-mist rounded-full">
          {/* Gradient fill */}
          <div className="absolute inset-0 h-full bg-gradient-to-r from-coral-light to-teal rounded-full" />
          {/* Current price marker */}
          <div
            className="absolute w-3 h-3 bg-sky rounded-full border-2 border-white shadow-sm -translate-y-[2px]"
            style={{ left: `${pct}%`, transform: `translateX(-50%) translateY(-2px)` }}
          />
        </div>
        <span className="text-xs font-mono text-slate">{formatFn(high)}</span>
      </div>
    </div>
  )
}
