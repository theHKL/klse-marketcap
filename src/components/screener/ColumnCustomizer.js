'use client';

import { useState, useEffect, useRef } from 'react';
import {
  COLUMN_REGISTRY,
  COLUMN_CATEGORIES,
  MAX_VISIBLE_COLUMNS,
  DEFAULT_VISIBLE_IDS,
} from '@/lib/column-registry';

export default function ColumnCustomizer({ visibleIds, onChange }) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);

  const toggleableColumns = COLUMN_REGISTRY.filter((c) => !c.fixed);
  const activeCount = visibleIds.length;
  const atLimit = activeCount >= MAX_VISIBLE_COLUMNS;

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleEscape(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open]);

  function handleToggle(id) {
    const isActive = visibleIds.includes(id);
    if (isActive) {
      onChange(visibleIds.filter((v) => v !== id));
    } else if (!atLimit) {
      onChange([...visibleIds, id]);
    }
  }

  function handleReset() {
    onChange([...DEFAULT_VISIBLE_IDS]);
  }

  // Group toggleable columns by category
  const grouped = COLUMN_CATEGORIES.map((cat) => ({
    category: cat,
    columns: toggleableColumns.filter((c) => c.category === cat),
  })).filter((g) => g.columns.length > 0);

  return (
    <div className="relative" ref={panelRef}>
      {/* Trigger button */}
      <button
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="flex min-h-[44px] items-center gap-1.5 rounded-full border border-slate-300/30 bg-white px-4 py-1.5 text-xs font-semibold text-slate-800 transition-colors hover:bg-primary-light/10"
      >
        <svg
          className="h-3.5 w-3.5"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        >
          <path d="M2 4h12M2 8h12M2 12h12" />
          <circle cx="5" cy="4" r="1.5" fill="currentColor" />
          <circle cx="11" cy="8" r="1.5" fill="currentColor" />
          <circle cx="7" cy="12" r="1.5" fill="currentColor" />
        </svg>
        Columns {activeCount}/{MAX_VISIBLE_COLUMNS}
      </button>

      {/* Modal overlay */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-800/30 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Customize Columns"
            className="mx-4 w-full max-w-md rounded-2xl border border-slate-300/20 bg-white p-6 shadow-card"
          >
            {/* Header */}
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-800">Customize Columns</h2>
              <button
                onClick={() => setOpen(false)}
                className="rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-400/10 hover:text-slate-800"
                aria-label="Close"
              >
                <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M4 4l8 8M12 4l-8 8" />
                </svg>
              </button>
            </div>

            {/* Counter + Reset */}
            <div className="mb-4 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                {activeCount} of {MAX_VISIBLE_COLUMNS} selected
              </span>
              <button
                onClick={handleReset}
                className="text-xs font-medium text-primary hover:underline"
              >
                Reset to default
              </button>
            </div>

            {/* Category groups */}
            <div className="space-y-4">
              {grouped.map((group) => (
                <div key={group.category}>
                  <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    {group.category}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {group.columns.map((col) => {
                      const isActive = visibleIds.includes(col.id);
                      const isDisabled = !isActive && atLimit;

                      return (
                        <button
                          key={col.id}
                          onClick={() => handleToggle(col.id)}
                          disabled={isDisabled}
                          aria-pressed={isActive}
                          className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                            isActive
                              ? 'bg-primary text-white'
                              : isDisabled
                                ? 'cursor-not-allowed bg-slate-400/10 text-slate-400/50'
                                : 'bg-slate-400/10 text-slate-800 hover:bg-slate-400/20'
                          }`}
                        >
                          {col.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
