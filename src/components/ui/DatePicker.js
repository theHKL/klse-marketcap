'use client';

import { useState, useMemo } from 'react';

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function toDateStr(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function parseDate(str) {
  if (!str) return null;
  const [y, m, d] = str.split('-').map(Number);
  return { year: y, month: m - 1, day: d };
}

export default function DatePicker({ value, onChange, maxDate }) {
  const max = maxDate || new Date().toISOString().split('T')[0];
  const parsed = parseDate(value);
  const today = new Date();
  const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate());

  const [viewYear, setViewYear] = useState(parsed?.year || today.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsed?.month ?? today.getMonth());

  const { days, blanks } = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    return {
      blanks: firstDay,
      days: Array.from({ length: daysInMonth }, (_, i) => i + 1),
    };
  }, [viewYear, viewMonth]);

  const maxParsed = parseDate(max);
  const canGoNext =
    viewYear < maxParsed.year ||
    (viewYear === maxParsed.year && viewMonth < maxParsed.month);
  const canGoPrev = true; // no lower bound

  function prevMonth() {
    if (!canGoPrev) return;
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (!canGoNext) return;
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  return (
    <div className="w-full select-none">
      {/* Month/Year header */}
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={prevMonth}
          disabled={!canGoPrev}
          aria-label="Previous month"
          className="flex h-7 w-7 items-center justify-center rounded-full text-slate-800 transition-colors hover:bg-primary-light/10 disabled:opacity-30"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7.5 2.5 L4.5 6 L7.5 9.5" />
          </svg>
        </button>
        <span className="text-xs font-bold text-slate-800">
          {MONTHS[viewMonth]} {viewYear}
        </span>
        <button
          type="button"
          onClick={nextMonth}
          disabled={!canGoNext}
          aria-label="Next month"
          className="flex h-7 w-7 items-center justify-center rounded-full text-slate-800 transition-colors hover:bg-primary-light/10 disabled:opacity-30"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4.5 2.5 L7.5 6 L4.5 9.5" />
          </svg>
        </button>
      </div>

      {/* Day-of-week labels */}
      <div className="mb-1 grid grid-cols-7 text-center">
        {DAYS.map((d) => (
          <span key={d} className="py-1 text-[10px] font-bold uppercase text-slate-400">
            {d}
          </span>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 text-center">
        {Array.from({ length: blanks }).map((_, i) => (
          <span key={`b-${i}`} />
        ))}
        {days.map((day) => {
          const dateStr = toDateStr(viewYear, viewMonth, day);
          const isSelected = value === dateStr;
          const isToday = todayStr === dateStr;
          const isDisabled = dateStr > max;

          return (
            <button
              key={day}
              type="button"
              disabled={isDisabled}
              aria-label={`${MONTHS[viewMonth]} ${day}, ${viewYear}`}
              onClick={() => onChange(dateStr)}
              className={`mx-auto flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium transition-colors ${
                isSelected
                  ? 'bg-primary text-white'
                  : isToday
                    ? 'ring-2 ring-primary-light/40 text-slate-800'
                    : isDisabled
                      ? 'text-slate-400/40 cursor-not-allowed'
                      : 'text-slate-800 hover:bg-primary-light/10'
              }`}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}
