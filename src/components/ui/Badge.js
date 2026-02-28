import { SECTOR_COLORS } from '@/lib/constants';

const variantStyles = {
  sector: 'bg-primary-light/20 text-slate-800',
  category: 'bg-violet-100/30 text-slate-800',
  etf: 'bg-blue-100/30 text-slate-800',
};

export default function Badge({ label, variant = 'sector' }) {
  if (!label) return null;

  // Use per-sector colours when available
  const sectorColor = variant === 'sector' ? SECTOR_COLORS[label] : null;

  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${
        sectorColor ? '' : variantStyles[variant] || variantStyles.sector
      }`}
      style={sectorColor ? { backgroundColor: sectorColor.bg, color: sectorColor.accent } : undefined}
    >
      {label}
    </span>
  );
}
