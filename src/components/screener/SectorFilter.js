'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { GICS_SECTORS, SECTOR_COLORS } from '@/lib/constants';

export default function SectorFilter({ value = [], onChange }) {
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkOverflow = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 1);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    checkOverflow();
    window.addEventListener('resize', checkOverflow);
    return () => window.removeEventListener('resize', checkOverflow);
  }, [checkOverflow, value]);

  function scroll(dir) {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * 200, behavior: 'smooth' });
  }

  function toggleSector(sector) {
    if (value.includes(sector)) {
      onChange(value.filter((s) => s !== sector));
    } else {
      onChange([...value, sector]);
    }
  }

  return (
    <div className="relative flex items-center">
      {/* Left arrow */}
      {canScrollLeft && (
        <button
          onClick={() => scroll(-1)}
          aria-label="Scroll left"
          className="absolute left-0 z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface/90 text-slate-800 shadow-sm backdrop-blur transition-colors hover:bg-white"
        >
          <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 4 L6 8 L10 12" />
          </svg>
        </button>
      )}

      {/* Scrollable pill container */}
      <div
        ref={scrollRef}
        onScroll={checkOverflow}
        className="flex gap-2 overflow-x-auto scrollbar-hide"
        style={{ paddingLeft: canScrollLeft ? 36 : 0, paddingRight: canScrollRight ? 36 : 0 }}
      >
        {value.length > 0 && (
          <button
            onClick={() => onChange([])}
            className="min-h-[44px] shrink-0 whitespace-nowrap rounded-full border border-red-500/30 px-3 py-1.5 text-xs font-semibold text-red-500 transition-colors hover:bg-red-500/10"
          >
            Clear all
          </button>
        )}
        {GICS_SECTORS.map((sector) => {
          const isActive = value.includes(sector);
          const colors = SECTOR_COLORS[sector];
          return (
            <button
              key={sector}
              onClick={() => toggleSector(sector)}
              className="min-h-[44px] shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition-all"
              style={
                isActive
                  ? { backgroundColor: colors?.accent, color: '#fff' }
                  : { backgroundColor: colors?.bg, color: colors?.accent }
              }
            >
              {isActive && <span className="mr-1">&#10003;</span>}
              {sector}
            </button>
          );
        })}
      </div>

      {/* Right arrow */}
      {canScrollRight && (
        <button
          onClick={() => scroll(1)}
          aria-label="Scroll right"
          className="absolute right-0 z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface/90 text-slate-800 shadow-sm backdrop-blur transition-colors hover:bg-white"
        >
          <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 4 L10 8 L6 12" />
          </svg>
        </button>
      )}
    </div>
  );
}
