'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import DatePicker from '@/components/ui/DatePicker';
import { useEvents } from '@/lib/hooks/useEvents';

const TABS = [
  { key: 'global', label: 'Global Events' },
  { key: 'au', label: 'AU Events' },
  { key: 'custom', label: 'Custom Events' },
];

const STORAGE_KEY = 'asx-custom-events';

function loadCustomEvents() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCustomEvents(events) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  } catch {
    // storage full — silently ignore
  }
}

function EventList({ events, activeEventId, onSelect }) {
  if (events.length === 0) {
    return (
      <p className="px-4 py-6 text-center text-xs text-slate-400">
        No events in this category yet.
      </p>
    );
  }

  return (
    <ul role="listbox" className="max-h-[280px] overflow-y-auto">
      {events.map((event) => {
        const isActive = activeEventId === event.id;
        return (
          <li
            key={event.id}
            role="option"
            aria-selected={isActive}
            onClick={() => onSelect(event)}
            className={`cursor-pointer px-4 py-3 text-xs font-medium transition-colors ${
              isActive
                ? 'bg-primary-light/15 text-primary'
                : 'text-slate-800 hover:bg-primary-light/5'
            }`}
          >
            <span className="block font-semibold">{event.name}</span>
            {event.description && (
              <span className="mt-0.5 block text-[11px] text-slate-400">
                {event.description}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function CustomEventList({ events, activeCustomId, onSelect, onDelete }) {
  if (events.length === 0) return null;

  return (
    <ul role="listbox" className="max-h-[160px] overflow-y-auto border-b border-slate-300/15">
      {events.map((event) => {
        const isActive = activeCustomId === event.id;
        return (
          <li
            key={event.id}
            role="option"
            aria-selected={isActive}
            className={`flex items-center justify-between px-4 py-2.5 text-xs font-medium transition-colors ${
              isActive
                ? 'bg-primary-light/15 text-primary'
                : 'text-slate-800 hover:bg-primary-light/5'
            }`}
          >
            <button
              type="button"
              onClick={() => onSelect(event)}
              className="flex-1 text-left"
            >
              <span className="font-semibold">{event.name}</span>
              <span className="ml-1.5 text-[11px] text-slate-400">{event.date}</span>
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(event.id);
              }}
              aria-label={`Delete ${event.name}`}
              className="ml-2 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-red-500 transition-colors hover:bg-red-500/10"
            >
              <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M3 3l6 6M9 3l-6 6" />
              </svg>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function AddCustomEventForm({ onAdd }) {
  const [name, setName] = useState('');
  const [date, setDate] = useState('');

  const canAdd = name.trim().length > 0 && date.length === 10;

  function handleSubmit(e) {
    e.preventDefault();
    if (!canAdd) return;
    onAdd({ name: name.trim(), date });
    setName('');
    setDate('');
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 p-4">
      <div>
        <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Event name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. My Portfolio Start"
          maxLength={60}
          className="w-full rounded-lg border border-slate-300/30 bg-white px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400/50 focus:outline-none focus:ring-2 focus:ring-primary-light/40"
        />
      </div>
      <div>
        <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Date
        </label>
        <DatePicker value={date} onChange={setDate} />
      </div>
      <button
        type="submit"
        disabled={!canAdd}
        className="w-full rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-primary/80 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Add Event
      </button>
    </form>
  );
}

export default function EventSelector({
  activeEventId,
  customDate,
  onEventSelect,
  onCustomDateSelect,
  onClear,
}) {
  const { events } = useEvents();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('global');
  const [customEvents, setCustomEvents] = useState([]);
  const [activeCustomId, setActiveCustomId] = useState(null);
  const [activeCustomName, setActiveCustomName] = useState(null);
  const ref = useRef(null);

  // Load custom events from localStorage
  useEffect(() => {
    setCustomEvents(loadCustomEvents());
  }, []);

  // Click-outside to close
  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Clear custom selection when parent clears
  useEffect(() => {
    if (!customDate && !activeEventId) {
      setActiveCustomId(null);
      setActiveCustomName(null);
    }
  }, [customDate, activeEventId]);

  const globalEvents = events.filter((e) => e.category !== 'au');
  const auEvents = events.filter((e) => e.category === 'au');

  const handleServerEventSelect = useCallback(
    (event) => {
      const isSame = activeEventId === event.id;
      onEventSelect(isSame ? null : event.id);
      setActiveCustomId(null);
      setActiveCustomName(null);
      setOpen(false);
    },
    [activeEventId, onEventSelect]
  );

  const handleCustomEventSelect = useCallback(
    (event) => {
      const isSame = activeCustomId === event.id;
      if (isSame) {
        onClear();
        setActiveCustomId(null);
        setActiveCustomName(null);
      } else {
        onCustomDateSelect(event.date);
        setActiveCustomId(event.id);
        setActiveCustomName(event.name);
      }
      setOpen(false);
    },
    [activeCustomId, onCustomDateSelect, onClear]
  );

  const handleAddCustomEvent = useCallback(
    ({ name, date }) => {
      const newEvent = { id: crypto.randomUUID(), name, date };
      const updated = [...customEvents, newEvent];
      setCustomEvents(updated);
      saveCustomEvents(updated);
      // Auto-select the new event
      onCustomDateSelect(date);
      setActiveCustomId(newEvent.id);
      setActiveCustomName(newEvent.name);
      setOpen(false);
    },
    [customEvents, onCustomDateSelect]
  );

  const handleDeleteCustomEvent = useCallback(
    (id) => {
      const updated = customEvents.filter((e) => e.id !== id);
      setCustomEvents(updated);
      saveCustomEvents(updated);
      // If the deleted event was active, clear selection
      if (activeCustomId === id) {
        onClear();
        setActiveCustomId(null);
        setActiveCustomName(null);
      }
    },
    [customEvents, activeCustomId, onClear]
  );

  // Determine display label
  const selectedServerEvent = events.find((e) => e.id === activeEventId);
  let triggerLabel = 'Select event...';
  if (selectedServerEvent) {
    triggerLabel = selectedServerEvent.name;
  } else if (activeCustomName && customDate) {
    triggerLabel = activeCustomName;
  } else if (customDate) {
    triggerLabel = `Custom: ${customDate}`;
  }

  const hasSelection = activeEventId || customDate;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
        % Change in Price since
      </span>

      {/* Trigger + Popover */}
      <div ref={ref} className="relative">
        <button
          onClick={() => setOpen((prev) => !prev)}
          aria-haspopup="listbox"
          aria-expanded={open}
          className={`flex min-h-[44px] items-center gap-1.5 rounded-full border px-4 py-1.5 text-xs font-semibold transition-colors ${
            hasSelection
              ? 'border-primary/30 bg-primary text-white'
              : 'border-slate-300/30 bg-white text-slate-800 hover:bg-primary-light/10'
          }`}
        >
          {triggerLabel}
          <svg
            className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`}
            viewBox="0 0 12 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 4.5 L6 7.5 L9 4.5" />
          </svg>
        </button>

        {open && (
          <div className="absolute left-0 z-50 mt-2 w-[360px] animate-slide-up overflow-hidden rounded-2xl border border-slate-300/20 bg-white shadow-card">
            {/* Tab Bar */}
            <div role="tablist" className="flex border-b border-slate-300/15 bg-surface/50 p-1.5">
              {TABS.map((tab) => {
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex-1 rounded-full px-2 py-1.5 text-[11px] font-semibold transition-colors ${
                      isActive
                        ? 'bg-primary text-white'
                        : 'text-slate-800 hover:bg-primary-light/10'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Tab Content */}
            <div>
              {activeTab === 'global' && (
                <EventList
                  events={globalEvents}
                  activeEventId={activeEventId}
                  onSelect={handleServerEventSelect}
                />
              )}
              {activeTab === 'au' && (
                <EventList
                  events={auEvents}
                  activeEventId={activeEventId}
                  onSelect={handleServerEventSelect}
                />
              )}
              {activeTab === 'custom' && (
                <div>
                  <CustomEventList
                    events={customEvents}
                    activeCustomId={activeCustomId}
                    onSelect={handleCustomEventSelect}
                    onDelete={handleDeleteCustomEvent}
                  />
                  <AddCustomEventForm onAdd={handleAddCustomEvent} />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Clear button */}
      {hasSelection && (
        <button
          onClick={() => {
            onClear();
            setActiveCustomId(null);
            setActiveCustomName(null);
          }}
          className="min-h-[44px] rounded-full border border-red-500/30 px-3 py-1.5 text-xs font-semibold text-red-500 transition-colors hover:bg-red-500/10"
        >
          Clear
        </button>
      )}
    </div>
  );
}
