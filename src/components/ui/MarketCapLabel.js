import { formatMarketCap } from '@/lib/formatters';

export default function MarketCapLabel({ value }) {
  return (
    <span className="font-mono text-sm font-medium text-slate-800">
      {formatMarketCap(value)}
    </span>
  );
}
