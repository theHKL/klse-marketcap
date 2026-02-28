'use client';

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';

const WatchlistContext = createContext({
  watchlists: [],
  watchlistItems: new Map(),
  defaultWatchlistId: null,
  isInAnyWatchlist: () => false,
  isInWatchlist: () => false,
  getWatchlistsForSecurity: () => [],
  toggleItem: async () => ({}),
  createWatchlist: async () => ({}),
  renameWatchlist: async () => ({}),
  deleteWatchlist: async () => ({}),
  loading: false,
});

export function useWatchlist() {
  return useContext(WatchlistContext);
}

export function WatchlistProvider({ children }) {
  const { user } = useAuth();
  const [watchlists, setWatchlists] = useState([]);
  // Map<watchlistId, Set<securityId>>
  const [watchlistItems, setWatchlistItems] = useState(new Map());
  const [loading, setLoading] = useState(false);
  // Per-watchlist tokens — only the mutated watchlist is invalidated
  const [refreshTokens, setRefreshTokens] = useState({});

  // Single fetch on mount — gets all watchlists + their items
  useEffect(() => {
    if (!user) {
      setWatchlists([]);
      setWatchlistItems(new Map());
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    fetch('/api/watchlists?include_items=true', { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json) => {
        const wls = json.watchlists || [];
        setWatchlists(wls);

        const itemsMap = new Map();
        for (const wl of wls) {
          itemsMap.set(wl.id, new Set(wl.security_ids || []));
        }
        setWatchlistItems(itemsMap);
      })
      .catch((err) => {
        if (err.name === 'AbortError') return;
        console.error('Failed to fetch watchlists:', err);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [user]);

  const defaultWatchlistId = useMemo(
    () => watchlists.find((wl) => wl.is_default)?.id || null,
    [watchlists]
  );

  const isInAnyWatchlist = useCallback(
    (securityId) => {
      for (const items of watchlistItems.values()) {
        if (items.has(securityId)) return true;
      }
      return false;
    },
    [watchlistItems]
  );

  const isInWatchlist = useCallback(
    (securityId, watchlistId) => {
      return watchlistItems.get(watchlistId)?.has(securityId) || false;
    },
    [watchlistItems]
  );

  const getWatchlistsForSecurity = useCallback(
    (securityId) => {
      const result = [];
      for (const [wlId, items] of watchlistItems.entries()) {
        if (items.has(securityId)) {
          result.push(wlId);
        }
      }
      return result;
    },
    [watchlistItems]
  );

  const toggleItem = useCallback(
    async (securityId, watchlistId) => {
      if (!user) return { needsAuth: true };

      const targetId = watchlistId || defaultWatchlistId;
      if (!targetId) return { error: true };

      // Read current state atomically inside the updater to avoid stale closures
      let isCurrently = false;
      setWatchlistItems((prev) => {
        isCurrently = prev.get(targetId)?.has(securityId) || false;
        return prev; // no change, just reading
      });

      // Now use isCurrently for optimistic update
      setWatchlistItems((prev) => {
        const next = new Map(prev);
        const items = new Set(next.get(targetId) || []);
        if (isCurrently) items.delete(securityId);
        else items.add(securityId);
        next.set(targetId, items);
        return next;
      });

      setWatchlists((prev) =>
        prev.map((wl) =>
          wl.id === targetId
            ? { ...wl, item_count: wl.item_count + (isCurrently ? -1 : 1) }
            : wl
        )
      );

      try {
        const res = await fetch(`/api/watchlist/${targetId}/items`, {
          method: isCurrently ? 'DELETE' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ security_id: securityId }),
        });

        if (!res.ok) throw new Error('Failed');
        setRefreshTokens((prev) => ({ ...prev, [targetId]: (prev[targetId] || 0) + 1 }));
        return { success: true };
      } catch {
        // Revert using functional updaters (reads current state, not stale closure)
        setWatchlistItems((prev) => {
          const next = new Map(prev);
          const items = new Set(next.get(targetId) || []);
          if (isCurrently) items.add(securityId);
          else items.delete(securityId);
          next.set(targetId, items);
          return next;
        });
        setWatchlists((prev) =>
          prev.map((wl) =>
            wl.id === targetId
              ? { ...wl, item_count: Math.max(0, wl.item_count + (isCurrently ? 1 : -1)) }
              : wl
          )
        );
        return { error: true };
      }
    },
    [user, defaultWatchlistId]
  );

  const createWatchlist = useCallback(
    async (name) => {
      if (!user) return { needsAuth: true };

      try {
        const res = await fetch('/api/watchlists', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name }),
        });

        if (!res.ok) {
          const data = await res.json();
          return { error: data.error || 'Failed to create watchlist' };
        }

        const { watchlist } = await res.json();
        setWatchlists((prev) => [...prev, watchlist]);
        setWatchlistItems((prev) => {
          const next = new Map(prev);
          next.set(watchlist.id, new Set());
          return next;
        });
        return { success: true, watchlist };
      } catch {
        return { error: 'Failed to create watchlist' };
      }
    },
    [user]
  );

  const renameWatchlist = useCallback(
    async (watchlistId, name) => {
      if (!user) return { needsAuth: true };

      try {
        const res = await fetch(`/api/watchlists/${watchlistId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name }),
        });

        if (!res.ok) {
          const data = await res.json();
          return { error: data.error || 'Failed to rename watchlist' };
        }

        setWatchlists((prev) =>
          prev.map((wl) => (wl.id === watchlistId ? { ...wl, name } : wl))
        );
        return { success: true };
      } catch {
        return { error: 'Failed to rename watchlist' };
      }
    },
    [user]
  );

  const deleteWatchlist = useCallback(
    async (watchlistId) => {
      if (!user) return { needsAuth: true };

      try {
        const res = await fetch(`/api/watchlists/${watchlistId}`, {
          method: 'DELETE',
        });

        if (!res.ok) {
          const data = await res.json();
          return { error: data.error || 'Failed to delete watchlist' };
        }

        setWatchlists((prev) => prev.filter((wl) => wl.id !== watchlistId));
        setWatchlistItems((prev) => {
          const next = new Map(prev);
          next.delete(watchlistId);
          return next;
        });
        return { success: true };
      } catch {
        return { error: 'Failed to delete watchlist' };
      }
    },
    [user]
  );

  const value = useMemo(
    () => ({
      watchlists,
      watchlistItems,
      defaultWatchlistId,
      isInAnyWatchlist,
      isInWatchlist,
      getWatchlistsForSecurity,
      toggleItem,
      createWatchlist,
      renameWatchlist,
      deleteWatchlist,
      loading,
      refreshTokens,
    }),
    [
      watchlists,
      watchlistItems,
      defaultWatchlistId,
      isInAnyWatchlist,
      isInWatchlist,
      getWatchlistsForSecurity,
      toggleItem,
      createWatchlist,
      renameWatchlist,
      deleteWatchlist,
      loading,
      refreshTokens,
    ]
  );

  return (
    <WatchlistContext.Provider value={value}>
      {children}
    </WatchlistContext.Provider>
  );
}
