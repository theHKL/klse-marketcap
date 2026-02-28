'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import ScreenerRow from '@/components/screener/ScreenerRow';
import SortHeader from '@/components/screener/SortHeader';
import SectorFilter from '@/components/screener/SectorFilter';
import EventSelector from '@/components/screener/EventSelector';
import ColumnCustomizer from '@/components/screener/ColumnCustomizer';
import Pagination from '@/components/screener/Pagination';
import Skeleton from '@/components/ui/Skeleton';
import { PAGE_SIZE } from '@/lib/constants';
import {
  DEFAULT_VISIBLE_IDS,
  DEFAULT_VISIBLE_IDS_BY_TYPE,
  buildActiveColumns,
  getColumnById,
} from '@/lib/column-registry';
import { getColumnPreferences, setColumnPreferences } from '@/lib/cookies';

export default function ScreenerTable({ initialData, initialPagination, type = 'stock', onAuthRequired, watchlistMode, filterSlot, removingIds }) {
  const typeDefaults = DEFAULT_VISIBLE_IDS_BY_TYPE[type] || DEFAULT_VISIBLE_IDS;
  const defaultSort = (type === 'fund' || type === 'etf') ? 'aum' : 'market_cap';

  const [data, setData] = useState(initialData);
  const [pagination, setPagination] = useState(initialPagination);
  const [sort, setSort] = useState(defaultSort);
  const [order, setOrder] = useState('desc');
  const [sectors, setSectors] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [eventId, setEventId] = useState(null);
  const [customDate, setCustomDate] = useState(null);
  const [eventColumn, setEventColumn] = useState(null);

  // Column drag-to-reorder state (desktop only)
  const [dragColId, setDragColId] = useState(null);
  const [dropIndicator, setDropIndicator] = useState(null);
  const [eventColIdx, setEventColIdx] = useState(null);

  // Column visibility — initialize with per-type defaults (matches SSR)
  const [visibleIds, setVisibleIds] = useState(typeDefaults);

  // Scroll state for edge shadow indicators
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Drag-to-scroll state
  const dragState = useRef({ active: false, startX: 0, scrollLeft: 0, moved: false });

  // Hydrate from cookie after mount (avoids SSR mismatch)
  // For fund tab, only apply saved prefs if they aren't the generic defaults
  useEffect(() => {
    const saved = getColumnPreferences();
    if (saved && saved.length > 0) {
      setVisibleIds(saved);
    }
  }, []);

  // Animated removal — filter data after transition completes
  useEffect(() => {
    if (!removingIds || removingIds.size === 0) return;
    const timer = setTimeout(() => {
      setData((prev) => prev.filter((s) => !removingIds.has(s.id)));
      setPagination((prev) => {
        if (!prev) return prev;
        const newTotal = Math.max(0, prev.total - removingIds.size);
        return { ...prev, total: newTotal, totalPages: Math.ceil(newTotal / PAGE_SIZE) };
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [removingIds]);

  // If the current sort column is hidden, reset to default sort
  useEffect(() => {
    if (sort === defaultSort || sort === 'change_since_event') return;
    const activeFields = visibleIds
      .map((id) => getColumnById(id))
      .filter(Boolean)
      .map((c) => c.field)
      .filter(Boolean);
    if (!activeFields.includes(sort)) {
      setSort(defaultSort);
      setOrder('desc');
      setPage(1);
      fetchData(defaultSort, 'desc', sectors, 1, eventId, customDate);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleIds]);

  // Track horizontal scroll position for edge shadows
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    function update() {
      const { scrollLeft, scrollWidth, clientWidth } = el;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
    }

    update();
    el.addEventListener('scroll', update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);

    return () => {
      el.removeEventListener('scroll', update);
      ro.disconnect();
    };
  }, []);

  // Document-level listeners for drag-to-scroll
  useEffect(() => {
    function onMouseMove(e) {
      const state = dragState.current;
      if (!state.active) return;
      const dx = e.clientX - state.startX;
      if (!state.moved && Math.abs(dx) < 4) return;
      state.moved = true;
      const el = scrollRef.current;
      if (el) {
        el.scrollLeft = state.scrollLeft - dx;
        el.style.cursor = 'grabbing';
        el.style.userSelect = 'none';
      }
    }

    function onMouseUp() {
      const state = dragState.current;
      if (!state.active) return;
      state.active = false;
      const el = scrollRef.current;
      if (el) {
        el.style.cursor = '';
        el.style.userSelect = '';
      }
      if (state.moved) {
        requestAnimationFrame(() => { dragState.current.moved = false; });
      }
    }

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  function handleMouseDown(e) {
    if (e.button !== 0) return;
    const el = scrollRef.current;
    if (!el) return;
    dragState.current = { active: true, startX: e.clientX, scrollLeft: el.scrollLeft, moved: false };
  }

  function handleClickCapture(e) {
    if (dragState.current.moved) {
      e.stopPropagation();
      e.preventDefault();
    }
  }

  function handleVisibleIdsChange(newIds) {
    setVisibleIds(newIds);
    setColumnPreferences(newIds);
  }

  // Column drag-to-reorder handlers
  function isColDraggable(col) {
    return !col.fixed && !col.frozen && !col.alwaysLast;
  }

  function handleColDragStart(e, colId) {
    dragState.current.active = false;
    setDragColId(colId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', colId);
  }

  function handleColDragOver(e, col) {
    if (!dragColId || !isColDraggable(col) || col.id === dragColId) {
      if (col.id === dragColId) setDropIndicator(null);
      return;
    }
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const rect = e.currentTarget.getBoundingClientRect();
    const side = e.clientX < rect.left + rect.width / 2 ? 'left' : 'right';
    setDropIndicator({ colId: col.id, side });
  }

  function handleColDrop(e) {
    e.preventDefault();
    if (!dragColId || !dropIndicator || dragColId === dropIndicator.colId) {
      setDragColId(null);
      setDropIndicator(null);
      return;
    }
    // Build current middle column order (includes event_change if active)
    const middleOrder = columns
      .filter((c) => !c.fixed && !c.alwaysLast)
      .map((c) => c.id);
    const newOrder = middleOrder.filter((id) => id !== dragColId);
    const targetIdx = newOrder.indexOf(dropIndicator.colId);
    if (targetIdx === -1) {
      setDragColId(null);
      setDropIndicator(null);
      return;
    }
    newOrder.splice(dropIndicator.side === 'left' ? targetIdx : targetIdx + 1, 0, dragColId);
    // Persist visibleIds (without transient event column)
    const newVisibleIds = newOrder.filter((id) => id !== 'event_change');
    setVisibleIds(newVisibleIds);
    setColumnPreferences(newVisibleIds);
    // Track event column position
    const ecIdx = newOrder.indexOf('event_change');
    setEventColIdx(ecIdx !== -1 ? ecIdx : null);
    setDragColId(null);
    setDropIndicator(null);
  }

  function handleColDragEnd() {
    setDragColId(null);
    setDropIndicator(null);
  }

  const fetchData = useCallback(async (newSort, newOrder, newSectors, newPage, newEventId, newCustomDate) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        type,
        sort: newSort,
        order: newOrder,
        page: String(newPage),
        limit: String(PAGE_SIZE),
      });
      if (newSectors.length > 0) {
        params.set('sector', newSectors.join(','));
      }
      if (newEventId) {
        params.set('event_id', newEventId);
      } else if (newCustomDate) {
        params.set('custom_date', newCustomDate);
      }
      const res = await fetch(`/api/securities?${params}`);
      const json = await res.json();
      setData(json.data);
      setPagination(json.pagination);
      setEventColumn(json.eventColumn || null);
    } catch (err) {
      // Keep showing stale data on error
    } finally {
      setLoading(false);
    }
  }, [type]);

  function handleSort(field, dir) {
    setSort(field);
    setOrder(dir);
    setPage(1);
    fetchData(field, dir, sectors, 1, eventId, customDate);
  }

  function handleSectorChange(newSectors) {
    setSectors(newSectors);
    setPage(1);
    fetchData(sort, order, newSectors, 1, eventId, customDate);
  }

  function handlePageChange(newPage) {
    setPage(newPage);
    fetchData(sort, order, sectors, newPage, eventId, customDate);
  }

  function handleEventSelect(id) {
    setEventId(id);
    setCustomDate(null);
    setPage(1);
    fetchData(sort, order, sectors, 1, id, null);
  }

  function handleCustomDateSelect(date) {
    setCustomDate(date);
    setEventId(null);
    setPage(1);
    fetchData(sort, order, sectors, 1, null, date);
  }

  function handleEventClear() {
    setEventId(null);
    setCustomDate(null);
    setEventColumn(null);
    setEventColIdx(null);
    setPage(1);
    fetchData(sort, order, sectors, 1, null, null);
  }

  // Build columns from registry
  let columns = buildActiveColumns(visibleIds);

  // Override sector label for ETFs / funds
  if (type === 'etf' || type === 'fund') {
    columns = columns.map((col) =>
      col.id === 'sector' ? { ...col, label: 'Category' } : col
    );
  }

  // Inject event column when active
  if (eventColumn) {
    const eventCol = {
      id: 'event_change',
      label: eventColumn.label,
      field: 'change_since_event',
      category: null,
      renderType: 'change_pct',
      align: 'center',
      width: 'w-24',
      sortable: true,
      fixed: false,
      alwaysLast: false,
    };
    const fixed = columns.filter((c) => c.fixed);
    const middle = columns.filter((c) => !c.fixed && !c.alwaysLast);
    const last = columns.filter((c) => c.alwaysLast);
    const insertAt = eventColIdx != null && eventColIdx <= middle.length ? eventColIdx : middle.length;
    middle.splice(insertAt, 0, eventCol);
    columns = [...fixed, ...middle, ...last];
  }

  return (
    <div className="space-y-4">
      {/* Event selector */}
      {!watchlistMode && (
        <EventSelector
          activeEventId={eventId}
          customDate={customDate}
          onEventSelect={handleEventSelect}
          onCustomDateSelect={handleCustomDateSelect}
          onClear={handleEventClear}
        />
      )}

      {/* Filters row */}
      <div className="flex items-center gap-2">
        {watchlistMode ? (
          filterSlot || <div className="flex-1" />
        ) : (
          <div className="min-w-0 flex-1">
            <SectorFilter value={sectors} onChange={handleSectorChange} />
          </div>
        )}
        <div className="shrink-0">
          <ColumnCustomizer visibleIds={visibleIds} onChange={handleVisibleIdsChange} />
        </div>
      </div>

      {/* Table */}
      <div className="relative overflow-hidden rounded-2xl bg-white shadow-card">
        {/* Left edge shadow — visible when scrolled past frozen columns */}
        <div
          className={`pointer-events-none absolute top-0 bottom-0 left-[148px] md:left-[308px] w-6 z-40 bg-gradient-to-r from-black/[0.06] to-transparent transition-opacity duration-150 ${canScrollLeft ? 'opacity-100' : 'opacity-0'}`}
        />
        {/* Right edge shadow — visible when more content to scroll */}
        <div
          className={`pointer-events-none absolute right-0 top-0 bottom-0 w-6 z-40 bg-gradient-to-l from-black/[0.06] to-transparent transition-opacity duration-150 ${canScrollRight ? 'opacity-100' : 'opacity-0'}`}
        />

        <div
          ref={scrollRef}
          className="overflow-x-auto cursor-grab active:cursor-grabbing"
          onMouseDown={handleMouseDown}
          onClickCapture={handleClickCapture}
        >
          <table className="min-w-full border-separate border-spacing-0 text-left">
            <thead>
              <tr>
                {columns.map((col) => {
                  const alignClass = col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : '';
                  const widthClass = col.width || '';
                  const stickyClass = col.frozen
                    ? col.frozenBreakpoint === 'md'
                      ? 'md:sticky md:z-20 bg-white'
                      : 'sticky z-20 bg-white'
                    : 'bg-white';

                  const canDrag = isColDraggable(col);
                  const isDragging = dragColId === col.id;
                  const isDropLeft = dropIndicator?.colId === col.id && dropIndicator?.side === 'left';
                  const isDropRight = dropIndicator?.colId === col.id && dropIndicator?.side === 'right';

                  const thStyle = {};
                  if (col.frozen) thStyle.left = col.stickyLeft;
                  if (isDropLeft) thStyle.boxShadow = 'inset 3px 0 0 0 #1565C0';
                  if (isDropRight) thStyle.boxShadow = 'inset -3px 0 0 0 #1565C0';
                  const hasStyle = Object.keys(thStyle).length > 0;

                  return (
                    <th
                      key={col.id}
                      draggable={canDrag || undefined}
                      onMouseDown={canDrag ? (e) => e.stopPropagation() : undefined}
                      onDragStart={canDrag ? (e) => handleColDragStart(e, col.id) : undefined}
                      onDragOver={canDrag ? (e) => handleColDragOver(e, col) : undefined}
                      onDrop={canDrag ? handleColDrop : undefined}
                      onDragEnd={canDrag ? handleColDragEnd : undefined}
                      className={`px-3 py-3 border-b border-slate-300/20 ${alignClass} ${widthClass} ${stickyClass}${isDragging ? ' opacity-40' : ''}${canDrag ? ' cursor-grab active:cursor-grabbing' : ''}`}
                      style={hasStyle ? thStyle : undefined}
                    >
                      {col.sortable && col.field ? (
                        <SortHeader
                          label={col.label}
                          field={col.field}
                          currentSort={sort}
                          currentOrder={order}
                          onSort={handleSort}
                          align={col.align}
                        />
                      ) : (
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                          {col.label}
                        </span>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={columns.length} className="p-4">
                    <Skeleton variant="row" count={10} />
                  </td>
                </tr>
              ) : data && data.length > 0 ? (
                data.map((security, idx) => (
                  <ScreenerRow
                    key={security.symbol}
                    security={security}
                    rank={(page - 1) * PAGE_SIZE + idx + 1}
                    type={type}
                    columns={columns}
                    onAuthRequired={onAuthRequired}
                    removing={removingIds?.has(security.id)}
                  />
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length} className="p-8 text-center text-slate-400">
                    No securities found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {pagination && (
        <Pagination
          currentPage={page}
          totalPages={pagination.totalPages}
          onPageChange={handlePageChange}
        />
      )}
    </div>
  );
}
