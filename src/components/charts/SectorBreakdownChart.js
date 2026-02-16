'use client'

const BAR_COLORS = [
  'bg-sky',
  'bg-teal',
  'bg-lavender',
  'bg-mint',
  'bg-frost',
  'bg-coral-light',
  'bg-sky-light',
]

export default function SectorBreakdownChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-silver text-sm">No sector data available</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {data.map((item, i) => (
        <div key={item.sector} className="flex items-center gap-2">
          <span className="text-sm text-navy w-40 truncate" title={item.sector}>
            {item.sector}
          </span>
          <div className="flex-1 h-5 bg-mist rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${BAR_COLORS[i % BAR_COLORS.length]}`}
              style={{ width: `${Math.max(0, Math.min(100, item.weight))}%` }}
            />
          </div>
          <span className="text-xs font-mono text-slate w-12 text-right">
            {item.weight.toFixed(1)}%
          </span>
        </div>
      ))}
    </div>
  )
}
