'use client';

import { useState, useEffect } from 'react';
import Logo from '@/components/ui/Logo';
import ChangeIndicator from '@/components/ui/ChangeIndicator';
import Sparkline from '@/components/ui/Sparkline';
import WatchlistStar from '@/components/ui/WatchlistStar';
import { formatPrice } from '@/lib/formatters';
import { useWatchlist } from '@/lib/hooks/useWatchlist';

export default function WatchlistEmptyState({ watchlistName, watchlistId, onAuthRequired }) {
  const [topSecurities, setTopSecurities] = useState([]);

  useEffect(() => {
    fetch('/api/securities?type=all&sort=market_cap&order=desc&limit=6')
      .then((res) => res.json())
      .then((json) => setTopSecurities(json.data || []))
      .catch(() => {});
  }, []);

  return (
    <div className="rounded-2xl bg-white p-8 shadow-card">
      {/* Header */}
      <div className="mb-8 text-center">
        <svg className="mx-auto mb-3 h-10 w-10 text-amber-400" viewBox="0 0 24 24" fill="currentColor">
          <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
        </svg>
        <h2 className="text-xl font-bold text-slate-800">
          {watchlistName
            ? `Add Securities to "${watchlistName}"`
            : 'Add Securities to Your Watchlist'}
        </h2>
      </div>

      {/* Top 6 grid */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {topSecurities.map((sec) => (
          <div
            key={sec.symbol}
            className="relative rounded-xl border border-slate-300/10 bg-surface p-4 transition-shadow hover:shadow-card"
          >
            {/* Star in top-right */}
            <div className="absolute right-3 top-3">
              <WatchlistStar
                securityId={sec.id}
                size="sm"
                onAuthRequired={onAuthRequired}
                targetWatchlistId={watchlistId}
              />
            </div>

            {/* Logo + name */}
            <div className="mb-2 flex items-center gap-2">
              <Logo src={sec.logo_url} alt={sec.symbol} size="sm" />
              <div>
                <span className="font-mono text-sm font-bold text-slate-800">{sec.symbol}</span>
              </div>
            </div>

            {/* Price + change */}
            <div className="mb-2 flex items-baseline gap-2">
              <span className="font-mono text-sm font-semibold text-slate-800">
                {formatPrice(sec.price)}
              </span>
              <ChangeIndicator value={sec.change_1d_pct} />
            </div>

            {/* Sparkline */}
            <Sparkline data={sec.sparkline_7d} width={180} height={40} />
          </div>
        ))}
      </div>

      {/* Search section */}
      <WatchlistSearch watchlistId={watchlistId} onAuthRequired={onAuthRequired} />
    </div>
  );
}

function WatchlistSearch({ watchlistId }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const { toggleItem, defaultWatchlistId } = useWatchlist();

  const targetId = watchlistId || defaultWatchlistId;

  useEffect(() => {
    if (query.length < 1) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&limit=6`, {
          signal: controller.signal,
        });
        const data = await res.json();
        setResults(data);
        setIsOpen(data.length > 0);
      } catch (err) {
        if (err.name !== 'AbortError') setResults([]);
      }
    }, 200);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  async function handleAdd(security) {
    await toggleItem(security.id, targetId);
    setQuery('');
    setIsOpen(false);
  }

  return (
    <div className="relative mx-auto max-w-md">
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for More Securities"
          className="min-h-[44px] w-full rounded-xl border border-slate-300/20 bg-surface py-2 pl-9 pr-3 text-sm text-slate-800 placeholder:text-slate-400/50 focus:border-slate-800 focus:outline-none"
        />
      </div>

      {isOpen && (
        <ul className="absolute left-0 right-0 top-full z-50 mt-1 max-h-72 overflow-auto rounded-xl border border-slate-300/20 bg-surface shadow-card-hover">
          {results.map((item) => (
            <li
              key={item.symbol}
              className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-primary-light/5"
              onClick={() => handleAdd(item)}
            >
              <Logo src={item.logo_url} alt={item.symbol} size="sm" />
              <span className="font-mono text-sm font-semibold text-slate-800">{item.symbol}</span>
              <span className="min-w-0 flex-1 truncate text-xs text-slate-400">{item.name}</span>
              <span className="text-xs text-primary">+ Add</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
