'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useWatchlist } from '@/lib/hooks/useWatchlist';
import ScreenerTable from '@/components/screener/ScreenerTable';
import WatchlistEmptyState from '@/components/watchlist/WatchlistEmptyState';
import Skeleton from '@/components/ui/Skeleton';
import { PAGE_SIZE } from '@/lib/constants';

export default function WatchlistTab({ onAuthRequired }) {
  const { user, loading: authLoading } = useAuth();
  const {
    watchlists,
    watchlistItems,
    defaultWatchlistId,
    renameWatchlist,
    deleteWatchlist,
    createWatchlist,
    loading: watchlistLoading,
    refreshTokens,
  } = useWatchlist();

  const [selectedId, setSelectedId] = useState(null);
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [renaming, setRenaming] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [creatingNew, setCreatingNew] = useState(false);
  const [newName, setNewName] = useState('');
  const menuRef = useRef(null);
  const renameInputRef = useRef(null);
  const createInputRef = useRef(null);

  // Data cache: { [watchlistId]: { refreshToken, data } }
  const [dataCache, setDataCache] = useState({});
  const [loadingId, setLoadingId] = useState(null);
  const fetchControllerRef = useRef(null);

  // Removal animation state
  const [removingIds, setRemovingIds] = useState(new Set());
  const prevItemsRef = useRef({ id: null, key: '', items: new Set() });
  const isRemovingRef = useRef(false);

  // Auto-select default watchlist when loaded
  useEffect(() => {
    if (!selectedId && defaultWatchlistId) {
      setSelectedId(defaultWatchlistId);
    }
  }, [selectedId, defaultWatchlistId]);

  // Reset selectedId if the watchlist was deleted (e.g. from another tab)
  useEffect(() => {
    if (selectedId && watchlists.length > 0 && !watchlists.find((wl) => wl.id === selectedId)) {
      setSelectedId(defaultWatchlistId || watchlists[0]?.id || null);
    }
  }, [watchlists, selectedId, defaultWatchlistId]);

  // Derive items info for the selected watchlist
  const selectedItems = selectedId ? watchlistItems.get(selectedId) : null;
  const itemsKey = selectedItems ? [...selectedItems].sort().join(',') : '';
  const selectedToken = (selectedId && refreshTokens[selectedId]) || 0;

  // Detect item removals and trigger animation (must be declared BEFORE fetch effect)
  useEffect(() => {
    const prev = prevItemsRef.current;
    const currentItems = selectedItems ? new Set(selectedItems) : new Set();
    prevItemsRef.current = { id: selectedId, key: itemsKey, items: currentItems };

    // Only detect within the same watchlist, skip initial render or no-change
    if (!selectedId || prev.id !== selectedId || !prev.key || prev.key === itemsKey) return;

    const removed = [...prev.items].filter((id) => !currentItems.has(id));
    if (removed.length === 0) return;

    // Signal removal in progress
    isRemovingRef.current = true;
    setRemovingIds(new Set(removed));

    // Update cache: filter data + predict next refreshToken to suppress re-fetch
    setDataCache((prev) => {
      const entry = prev[selectedId];
      if (!entry) return prev;
      return {
        ...prev,
        [selectedId]: {
          refreshToken: selectedToken + 1,
          data: entry.data.filter((s) => !removed.includes(s.id)),
        },
      };
    });

    // Clear animation state after ScreenerTable has filtered its data (300ms)
    const timer = setTimeout(() => {
      setRemovingIds(new Set());
      isRemovingRef.current = false;
    }, 400);

    return () => {
      clearTimeout(timer);
      setRemovingIds(new Set());
      isRemovingRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, itemsKey]);

  const fetchWatchlistData = useCallback(async (wlId, signal) => {
    const res = await fetch(`/api/securities?watchlist=${wlId}&limit=${PAGE_SIZE}`, { signal });
    const json = await res.json();
    return json.data || [];
  }, []);

  // Fetch securities when selected watchlist or refreshToken changes
  useEffect(() => {
    if (!user || !selectedId || !selectedItems || selectedItems.size === 0) {
      if (selectedId && dataCache[selectedId]) {
        setDataCache((prev) => {
          const next = { ...prev };
          delete next[selectedId];
          return next;
        });
      }
      return;
    }

    // Skip fetch while a removal animation is in progress
    if (isRemovingRef.current) return;

    // Check cache — hit if refreshToken matches
    const cached = dataCache[selectedId];
    if (cached && cached.refreshToken === selectedToken) {
      return;
    }

    // Abort any in-flight request
    if (fetchControllerRef.current) {
      fetchControllerRef.current.abort();
    }
    const controller = new AbortController();
    fetchControllerRef.current = controller;

    setLoadingId(selectedId);

    fetchWatchlistData(selectedId, controller.signal)
      .then((data) => {
        if (fetchControllerRef.current !== controller) return; // stale
        setDataCache((prev) => ({
          ...prev,
          [selectedId]: { refreshToken: selectedToken, data },
        }));
      })
      .catch((err) => {
        if (err.name === 'AbortError') return;
      })
      .finally(() => {
        if (fetchControllerRef.current === controller) {
          setLoadingId(null);
          fetchControllerRef.current = null;
        }
      });

    return () => {
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, selectedId, selectedToken, fetchWatchlistData]);

  // Invalidate cache entry when a watchlist is deleted
  function handleDelete(id) {
    deleteWatchlist(id).then((result) => {
      if (result.success) {
        setMenuOpenId(null);
        setDataCache((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
        if (selectedId === id) {
          setSelectedId(defaultWatchlistId);
        }
      }
    });
  }

  // Close menu on click outside
  useEffect(() => {
    if (!menuOpenId) return;
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpenId(null);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpenId]);

  // Focus inputs
  useEffect(() => {
    if (renaming && renameInputRef.current) renameInputRef.current.focus();
  }, [renaming]);
  useEffect(() => {
    if (creatingNew && createInputRef.current) createInputRef.current.focus();
  }, [creatingNew]);

  // Loading state
  if (authLoading || watchlistLoading) {
    return <Skeleton variant="row" count={6} />;
  }

  // Not logged in
  if (!user) {
    return (
      <div className="rounded-2xl bg-white p-12 text-center shadow-card">
        <svg className="mx-auto mb-4 h-12 w-12 text-amber-400" viewBox="0 0 24 24" fill="currentColor">
          <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
        </svg>
        <h2 className="mb-2 text-xl font-bold text-slate-800">Track your favourite securities</h2>
        <p className="mb-6 text-sm text-slate-400">
          Sign in to create personal watchlists of KLSE stocks and ETFs
        </p>
        <button
          onClick={onAuthRequired}
          className="rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
        >
          Sign In
        </button>
      </div>
    );
  }

  const selectedWatchlist = watchlists.find((wl) => wl.id === selectedId);
  const itemCount = selectedItems?.size || 0;
  const cached = dataCache[selectedId];
  const securities = cached && (cached.refreshToken === selectedToken || removingIds.size > 0)
    ? cached.data
    : [];
  const isLoading = loadingId === selectedId;

  async function handleRename(e) {
    e.preventDefault();
    const trimmed = renameValue.trim();
    if (!trimmed || !renaming) return;
    await renameWatchlist(renaming, trimmed);
    setRenaming(null);
    setRenameValue('');
  }

  async function handleCreate(e) {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) return;
    const result = await createWatchlist(trimmed);
    if (result.success && result.watchlist) {
      setSelectedId(result.watchlist.id);
      setCreatingNew(false);
      setNewName('');
    }
  }

  const watchlistPills = (
    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
      {watchlists.map((wl) => {
        const isSelected = wl.id === selectedId;
        return (
          <div key={wl.id} className="relative">
            {renaming === wl.id ? (
              <form onSubmit={handleRename} className="flex gap-1">
                <input
                  ref={renameInputRef}
                  type="text"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  maxLength={50}
                  className="min-h-[36px] w-40 rounded-lg border border-slate-300/20 bg-white px-3 text-sm text-slate-800 focus:border-slate-800 focus:outline-none"
                  onBlur={() => {
                    setRenaming(null);
                    setRenameValue('');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setRenaming(null);
                      setRenameValue('');
                    }
                  }}
                />
              </form>
            ) : (
              <button
                onClick={() => setSelectedId(wl.id)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setMenuOpenId(wl.id);
                }}
                className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                  isSelected
                    ? 'bg-slate-800 text-white'
                    : 'bg-white text-slate-800 hover:bg-slate-800/10'
                }`}
              >
                {wl.name}
                <span className={`text-xs ${isSelected ? 'text-white/70' : 'text-slate-400'}`}>
                  {wl.item_count}
                </span>
                {/* Three-dot menu trigger */}
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpenId(menuOpenId === wl.id ? null : wl.id);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.stopPropagation();
                      setMenuOpenId(menuOpenId === wl.id ? null : wl.id);
                    }
                  }}
                  className={`ml-1 rounded p-0.5 transition-colors ${
                    isSelected ? 'hover:bg-white/20' : 'hover:bg-slate-800/10'
                  }`}
                  aria-label={`${wl.name} options`}
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </span>
              </button>
            )}

            {/* Context menu */}
            {menuOpenId === wl.id && (
              <div
                ref={menuRef}
                className="absolute left-0 top-full z-50 mt-1 w-40 rounded-xl border border-slate-300/20 bg-surface shadow-card-hover"
              >
                <button
                  onClick={() => {
                    setRenaming(wl.id);
                    setRenameValue(wl.name);
                    setMenuOpenId(null);
                  }}
                  className="flex min-h-[44px] w-full items-center px-3 py-2 text-sm text-slate-800 transition-colors hover:bg-primary-light/10"
                >
                  Rename
                </button>
                {!wl.is_default && (
                  <button
                    onClick={() => handleDelete(wl.id)}
                    className="flex min-h-[44px] w-full items-center px-3 py-2 text-sm text-red-500 transition-colors hover:bg-red-500/10"
                  >
                    Delete
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Create new watchlist */}
      {creatingNew ? (
        <form onSubmit={handleCreate} className="flex gap-1">
          <input
            ref={createInputRef}
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="List name"
            maxLength={50}
            className="min-h-[36px] w-40 rounded-lg border border-slate-300/20 bg-white px-3 text-sm text-slate-800 placeholder:text-slate-400/50 focus:border-slate-800 focus:outline-none"
            onBlur={() => {
              if (!newName.trim()) {
                setCreatingNew(false);
                setNewName('');
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setCreatingNew(false);
                setNewName('');
              }
            }}
          />
          <button
            type="submit"
            disabled={!newName.trim()}
            className="rounded-lg bg-primary px-3 text-xs font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-40"
          >
            Add
          </button>
        </form>
      ) : (
        <button
          onClick={() => setCreatingNew(true)}
          className="inline-flex min-h-[44px] items-center gap-1 rounded-full border-2 border-dashed border-slate-300/30 px-4 py-2 text-sm font-semibold text-slate-400 transition-colors hover:border-slate-300/60 hover:text-slate-800"
        >
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" />
          </svg>
          New List
        </button>
      )}
    </div>
  );

  // Empty watchlist (but not while items are animating out)
  if (itemCount === 0 && removingIds.size === 0) {
    return (
      <div>
        <div className="mb-4 flex items-center gap-2">
          {watchlistPills}
        </div>
        <WatchlistEmptyState
          watchlistName={selectedWatchlist?.name}
          watchlistId={selectedId}
          onAuthRequired={onAuthRequired}
        />
      </div>
    );
  }

  // Loading: actively fetching, or optimistic items exist but no data fetched yet
  if (securities.length === 0 && itemCount > 0) {
    return (
      <div>
        <div className="mb-4 flex items-center gap-2">
          {watchlistPills}
        </div>
        <Skeleton variant="row" count={6} />
      </div>
    );
  }

  return (
    <ScreenerTable
      key={selectedId}
      initialData={securities}
      initialPagination={{
        page: 1,
        limit: PAGE_SIZE,
        total: itemCount,
        totalPages: Math.ceil(itemCount / PAGE_SIZE),
      }}
      type="all"
      watchlistMode
      filterSlot={watchlistPills}
      removingIds={removingIds}
    />
  );
}
