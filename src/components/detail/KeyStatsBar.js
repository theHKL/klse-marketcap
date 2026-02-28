'use client';

import { useRef, useState, useCallback } from 'react';
import { formatMarketCap, formatVolume, formatPrice, formatNumber } from '@/lib/formatters';

function StatCard({ label, value }) {
  return (
    <div className="flex-shrink-0 snap-start rounded-2xl bg-white p-4 shadow-card min-w-[140px] select-none">
      <p className="text-xs font-medium text-slate-400">{label}</p>
      <p className="mt-1 font-mono text-lg font-semibold">{value}</p>
    </div>
  );
}

export default function KeyStatsBar({ security }) {
  const containerRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragState = useRef({ startX: 0, scrollLeft: 0 });

  const onMouseDown = useCallback((e) => {
    const el = containerRef.current;
    if (!el) return;
    setIsDragging(true);
    dragState.current.startX = e.pageX - el.offsetLeft;
    dragState.current.scrollLeft = el.scrollLeft;
  }, []);

  const onMouseMove = useCallback((e) => {
    if (!isDragging) return;
    e.preventDefault();
    const el = containerRef.current;
    if (!el) return;
    const x = e.pageX - el.offsetLeft;
    const walk = (x - dragState.current.startX) * 1.5;
    el.scrollLeft = dragState.current.scrollLeft - walk;
  }, [isDragging]);

  const onMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const stats = [
    { label: 'Market Cap', value: formatMarketCap(security.market_cap) },
    { label: 'Volume', value: formatVolume(security.volume) },
    { label: 'P/E Ratio', value: security.pe_ratio != null ? formatNumber(security.pe_ratio, { maximumFractionDigits: 2 }) : '\u2014' },
    { label: 'EPS', value: security.eps != null ? formatPrice(security.eps) : '\u2014' },
    { label: 'Dividend Yield', value: security.dividend_yield != null ? `${(security.dividend_yield * 100).toFixed(2)}%` : '\u2014' },
    { label: '52-Week High', value: formatPrice(security.year_high) },
    { label: '52-Week Low', value: formatPrice(security.year_low) },
    { label: 'Beta', value: security.beta != null ? formatNumber(security.beta, { maximumFractionDigits: 3 }) : '\u2014' },
  ];

  return (
    <div
      ref={containerRef}
      className={`flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      role="list"
      aria-label="Key statistics"
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
    >
      {stats.map((stat) => (
        <StatCard key={stat.label} label={stat.label} value={stat.value} />
      ))}
    </div>
  );
}
