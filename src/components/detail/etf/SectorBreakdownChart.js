'use client';

import { SECTOR_COLORS } from '@/lib/constants';

const CHART_COLORS = Object.values(SECTOR_COLORS).map(c => c.accent);
const SECTOR_COLOR_MAP = Object.fromEntries(
  Object.entries(SECTOR_COLORS).map(([sector, c]) => [sector, c.accent])
);
const DEFAULT_COLOR = '#475569';

export default function SectorBreakdownChart({ sectorWeights }) {
  if (!sectorWeights || sectorWeights.length === 0) return null;

  const sorted = [...sectorWeights].sort(
    (a, b) => (b.weight_percentage || 0) - (a.weight_percentage || 0)
  );

  const maxWeight = sorted[0]?.weight_percentage || 1;

  return (
    <section aria-label="Sector breakdown">
      <h2 className="text-xl font-bold">Sector Breakdown</h2>
      <div className="mt-3 rounded-2xl bg-white p-4 shadow-card">
        <div className="space-y-2.5">
          {sorted.map((s, idx) => {
            const weight = Number(s.weight_percentage) || 0;
            const barWidth = maxWeight > 0 ? (weight / maxWeight) * 100 : 0;
            const color = SECTOR_COLOR_MAP[s.sector] || CHART_COLORS[idx % CHART_COLORS.length] || DEFAULT_COLOR;

            return (
              <div key={s.sector} className="flex items-center gap-3">
                <span className="w-36 flex-shrink-0 text-sm text-slate-400 truncate">
                  {s.sector}
                </span>
                <div className="flex-1">
                  <div
                    className="h-5 rounded-full transition-all"
                    style={{ width: `${barWidth}%`, backgroundColor: color, minWidth: '4px' }}
                  />
                </div>
                <span className="w-14 flex-shrink-0 text-right font-mono text-sm font-medium">
                  {weight.toFixed(1)}%
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
