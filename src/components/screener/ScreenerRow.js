import { memo } from 'react';
import Link from 'next/link';
import Logo from '@/components/ui/Logo';
import Badge from '@/components/ui/Badge';
import ChangeIndicator from '@/components/ui/ChangeIndicator';
import MarketCapLabel from '@/components/ui/MarketCapLabel';
import Sparkline from '@/components/ui/Sparkline';
import WatchlistStar from '@/components/ui/WatchlistStar';
import { formatPrice, formatVolume, formatRatio, formatYieldPct, formatRawPct } from '@/lib/formatters';

const TYPE_PREFIX = { stock: '/stock', etf: '/etf', fund: '/fund' };

function renderCell(col, security, rank, type, onAuthRequired) {
  const rowType = security.type || type;

  switch (col.renderType) {
    case 'rank':
      return (
        <div className="flex items-center gap-1">
          <WatchlistStar securityId={security.id} size="sm" onAuthRequired={onAuthRequired} />
          <span>{rank}</span>
        </div>
      );

    case 'symbol': {
      const prefix = TYPE_PREFIX[rowType] || '/stock';
      const href = `${prefix}/${security.symbol.toLowerCase()}`;
      return (
        <Link href={href} className="flex items-center gap-2">
          <Logo src={security.logo_url} alt={security.symbol} size="sm" />
          <span className="font-mono text-sm font-bold text-slate-800 hover:text-primary">
            {security.symbol}
          </span>
        </Link>
      );
    }

    case 'name': {
      const namePrefix = TYPE_PREFIX[rowType] || '/stock';
      const nameHref = `${namePrefix}/${security.symbol.toLowerCase()}`;
      return (
        <Link href={nameHref} className="line-clamp-1 text-slate-800 hover:text-primary transition-colors">
          {security[col.field]}
        </Link>
      );
    }

    case 'text':
      return <span className="line-clamp-1">{security[col.field]}</span>;

    case 'badge':
      return (
        <Badge
          label={security.sector || security.category}
          variant={rowType === 'etf' || rowType === 'fund' ? 'category' : 'sector'}
        />
      );

    case 'market_cap':
      return <MarketCapLabel value={security[col.field]} />;

    case 'price':
      return formatPrice(security[col.field]);

    case 'change_pct':
      return <ChangeIndicator value={security[col.field]} />;

    case 'volume':
      return formatVolume(security[col.field]);

    case 'ratio':
      return formatRatio(security[col.field]);

    case 'yield_pct':
      return formatYieldPct(security[col.field]);

    case 'raw_pct':
      return formatRawPct(security[col.field]);

    case 'sparkline':
      return <Sparkline data={security.sparkline_7d} />;

    default:
      return security[col.field] ?? '\u2014';
  }
}

const ScreenerRow = memo(function ScreenerRow({ security, rank, type = 'stock', columns, onAuthRequired, removing }) {
  return (
    <tr className={`group transition-all duration-300 ease-out ${
      removing
        ? 'opacity-0 -translate-x-4 pointer-events-none'
        : 'opacity-100 translate-x-0 hover:bg-primary-light/5 even:bg-white/50'
    }`}>
      {columns.map((col) => {
        const alignClass =
          col.align === 'right'
            ? 'text-right'
            : col.align === 'center'
              ? 'text-center'
              : '';

        const widthClass = col.width || '';

        const extraClass =
          col.renderType === 'rank'
            ? 'font-mono text-xs text-slate-400'
            : col.renderType === 'price'
              ? 'font-mono text-sm text-slate-800'
              : col.renderType === 'text'
                ? 'text-sm text-slate-800'
                : col.renderType === 'ratio' || col.renderType === 'yield_pct' || col.renderType === 'raw_pct' || col.renderType === 'volume'
                  ? 'font-mono text-sm text-slate-800'
                  : '';

        const padding = col.renderType === 'symbol' ? 'px-2 py-3' : 'px-3 py-3';
        const stickyClass = col.frozen
          ? col.frozenBreakpoint === 'md'
            ? 'md:sticky md:z-10 md:bg-white'
            : 'sticky z-10 bg-white'
          : '';

        return (
          <td
            key={col.id}
            className={`${widthClass} ${padding} border-b border-slate-300/10 ${alignClass} ${extraClass} ${stickyClass}`}
            style={col.frozen ? { left: col.stickyLeft } : undefined}
          >
            {renderCell(col, security, rank, type, onAuthRequired)}
          </td>
        );
      })}
    </tr>
  );
});

export default ScreenerRow;
