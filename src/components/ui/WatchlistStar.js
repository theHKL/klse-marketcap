'use client';

import { memo, useState, useRef, useEffect, lazy, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/components/auth/AuthProvider';
import { useWatchlist } from '@/lib/hooks/useWatchlist';

const LoginModal = lazy(() => import('@/components/auth/LoginModal'));

const WatchlistStar = memo(function WatchlistStar({ securityId, size = 'sm', onAuthRequired, targetWatchlistId }) {
  const { user } = useAuth();
  const {
    watchlists,
    isInAnyWatchlist,
    isInWatchlist,
    toggleItem,
    createWatchlist,
    defaultWatchlistId,
  } = useWatchlist();
  const [animating, setAnimating] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0 });
  const popoverRef = useRef(null);
  const buttonRef = useRef(null);
  const inputRef = useRef(null);

  const active = isInAnyWatchlist(securityId);
  const sizeClass = size === 'lg' ? 'h-6 w-6' : 'h-4 w-4';
  const hasMultiple = watchlists.length > 1;

  // Position the popover using getBoundingClientRect
  useEffect(() => {
    if (!popoverOpen || !buttonRef.current) return;

    function updatePosition() {
      const rect = buttonRef.current.getBoundingClientRect();
      const popoverWidth = 224; // w-56 = 14rem = 224px

      // Position below the button, right-aligned
      let left = rect.right - popoverWidth;
      const top = rect.bottom + 4;

      // Keep popover within viewport
      if (left < 8) left = 8;
      if (left + popoverWidth > window.innerWidth - 8) {
        left = window.innerWidth - popoverWidth - 8;
      }

      setPopoverPos({ top, left });
    }

    updatePosition();

    // Reposition on scroll/resize (any scrollable ancestor)
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [popoverOpen]);

  // Close popover on click outside or Escape
  useEffect(() => {
    if (!popoverOpen) return;

    function handleClickOutside(e) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target)
      ) {
        setPopoverOpen(false);
        setCreating(false);
        setNewName('');
      }
    }

    function handleEscape(e) {
      if (e.key === 'Escape') {
        setPopoverOpen(false);
        setCreating(false);
        setNewName('');
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [popoverOpen]);

  // Focus input when creating
  useEffect(() => {
    if (creating && inputRef.current) {
      inputRef.current.focus();
    }
  }, [creating]);

  // Clean up portal on unmount
  useEffect(() => {
    return () => {
      setPopoverOpen(false);
    };
  }, []);

  async function handleClick(e) {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      if (onAuthRequired) {
        onAuthRequired();
      } else {
        setShowLoginModal(true);
      }
      return;
    }

    // If only 1 watchlist (or a specific target is given), quick toggle
    if (!hasMultiple || targetWatchlistId) {
      setAnimating(true);
      await toggleItem(securityId, targetWatchlistId || defaultWatchlistId);
      setTimeout(() => setAnimating(false), 200);
      return;
    }

    // Multiple watchlists — open popover
    setPopoverOpen((prev) => !prev);
  }

  async function handleToggleInList(e, watchlistId) {
    e.preventDefault();
    e.stopPropagation();
    await toggleItem(securityId, watchlistId);
  }

  async function handleCreateAndAdd(e) {
    e.preventDefault();
    e.stopPropagation();
    const trimmed = newName.trim();
    if (!trimmed) return;

    const result = await createWatchlist(trimmed);
    if (result.success && result.watchlist) {
      await toggleItem(securityId, result.watchlist.id);
      setCreating(false);
      setNewName('');
    }
  }

  const popoverContent = popoverOpen
    ? createPortal(
        <div
          ref={popoverRef}
          style={{ position: 'fixed', top: popoverPos.top, left: popoverPos.left, zIndex: 9999 }}
          className="w-56 rounded-xl border border-slate-300/20 bg-surface shadow-card-hover"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="max-h-64 overflow-y-auto p-2">
            {watchlists.map((wl) => {
              const checked = isInWatchlist(securityId, wl.id);
              return (
                <label
                  key={wl.id}
                  className="flex min-h-[44px] cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-800 transition-colors hover:bg-primary-light/10"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => handleToggleInList(e, wl.id)}
                    className="h-4 w-4 rounded border-slate-300/30 text-primary focus:ring-primary"
                  />
                  <span className="min-w-0 flex-1 truncate">{wl.name}</span>
                  {wl.is_default && (
                    <span className="text-[10px] font-medium uppercase text-slate-400">Default</span>
                  )}
                </label>
              );
            })}
          </div>

          <div className="border-t border-slate-300/10 p-2">
            {creating ? (
              <form onSubmit={handleCreateAndAdd} className="flex gap-1">
                <input
                  ref={inputRef}
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="List name"
                  maxLength={50}
                  className="min-h-[36px] min-w-0 flex-1 rounded-lg border border-slate-300/20 bg-white px-2 text-sm text-slate-800 placeholder:text-slate-400/50 focus:border-slate-800 focus:outline-none"
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
                onClick={(e) => {
                  e.stopPropagation();
                  setCreating(true);
                }}
                className="flex min-h-[44px] w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary-light/10"
              >
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" />
                </svg>
                Create new watchlist
              </button>
            )}
          </div>
        </div>,
        document.body
      )
    : null;

  return (
    <>
      <button
        ref={buttonRef}
        onClick={handleClick}
        className={`inline-flex items-center justify-center transition-transform ${
          animating ? 'scale-125' : ''
        }`}
        aria-label={active ? 'Remove from watchlist' : 'Add to watchlist'}
      >
        <svg
          className={`${sizeClass} ${
            active ? 'fill-amber-500 text-amber-500' : 'fill-none text-slate-400 hover:text-amber-500'
          } transition-colors`}
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
          />
        </svg>
      </button>

      {popoverContent}

      {showLoginModal &&
        createPortal(
          <Suspense fallback={null}>
            <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
          </Suspense>,
          document.body
        )}
    </>
  );
});

export default WatchlistStar;
