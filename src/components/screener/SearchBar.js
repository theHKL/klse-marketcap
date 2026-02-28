'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Logo from '@/components/ui/Logo';
import { formatMarketCap } from '@/lib/formatters';

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const debounceRef = useRef(null);
  const router = useRouter();

  const fetchResults = useCallback(async (q) => {
    if (q.length < 1) {
      setResults([]);
      setIsOpen(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=8`);
      const data = await res.json();
      setResults(data);
      setIsOpen(data.length > 0);
      setActiveIndex(-1);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  function handleInputChange(e) {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchResults(val), 200);
  }

  function navigateTo(item) {
    const prefixMap = { etf: '/etf', fund: '/fund', stock: '/stock' };
    const prefix = prefixMap[item.type] || '/stock';
    router.push(`${prefix}/${item.symbol.toLowerCase()}`);
    setIsOpen(false);
    setQuery('');
  }

  function handleKeyDown(e) {
    if (!isOpen) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      navigateTo(results[activeIndex]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  }

  useEffect(() => {
    function handleClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          placeholder="Search KLSE..."
          className="min-h-[44px] w-full rounded-xl border border-slate-300/20 bg-surface py-2 pl-9 pr-3 text-sm text-slate-800 placeholder:text-slate-400/50 focus:border-slate-800 focus:outline-none"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls="search-listbox"
          aria-autocomplete="list"
        />
      </div>

      {isOpen && (
        <ul
          id="search-listbox"
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-96 overflow-auto rounded-xl border border-slate-300/20 bg-surface shadow-card-hover"
        >
          {results.map((item, idx) => (
            <li
              key={item.symbol}
              role="option"
              aria-selected={idx === activeIndex}
              className={`flex cursor-pointer items-center gap-3 px-3 py-2 ${
                idx === activeIndex ? 'bg-primary-light/10' : 'hover:bg-primary-light/5'
              }`}
              onClick={() => navigateTo(item)}
              onMouseEnter={() => setActiveIndex(idx)}
            >
              <Logo src={item.logo_url} alt={item.symbol} size="sm" />
              <span className="shrink-0 font-mono text-sm font-semibold text-slate-800">{item.symbol}</span>
              <span className="min-w-0 flex-1 truncate text-xs text-slate-400">{item.name}</span>
              <span className="shrink-0 font-mono text-xs text-slate-400">
                {formatMarketCap(item.market_cap)}
              </span>
            </li>
          ))}
          {query.length > 0 && results.length === 0 && !loading && (
            <li className="px-3 py-4 text-center text-sm text-slate-400">
              No results for &ldquo;{query}&rdquo;
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
