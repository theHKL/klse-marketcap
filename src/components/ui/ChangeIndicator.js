import { formatChange } from '@/lib/formatters';

export default function ChangeIndicator({ value, showArrow = true }) {
  if (value == null) return <span className="text-slate-400">—</span>;

  const isPositive = value > 0;
  const isNegative = value < 0;
  const isNeutral = value === 0;

  const colorClass = isPositive
    ? 'text-emerald-600'
    : isNegative
      ? 'text-red-500'
      : 'text-slate-400';

  const arrow = isPositive ? '▲' : isNegative ? '▼' : '–';

  return (
    <span className={`font-mono text-sm font-medium ${colorClass}`}>
      {showArrow && <span className="mr-0.5">{arrow}</span>}
      {formatChange(value)}
    </span>
  );
}
