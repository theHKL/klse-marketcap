'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import SearchBar from '@/components/screener/SearchBar';
import { useAuth } from '@/components/auth/AuthProvider';
import LoginModal from '@/components/auth/LoginModal';

const navLinks = [
  { href: '/', label: 'Securities' },
  { href: '/stocks', label: 'Stocks' },
  { href: '/etfs', label: 'ETFs' },
  { href: '/reits', label: 'REITs' },
  { href: '/sectors', label: 'Sectors' },
  { href: '/about', label: 'About' },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const { user, signOut } = useAuth();
  const router = useRouter();
  const dropdownRef = useRef(null);

  function handleWatchlistClick() {
    if (user) {
      router.push('/watchlist');
    } else {
      setShowLoginModal(true);
    }
  }

  // Close user dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowUserDropdown(false);
      }
    }
    if (showUserDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showUserDropdown]);

  // Close dropdown when mobile menu opens
  useEffect(() => {
    if (mobileOpen) setShowUserDropdown(false);
  }, [mobileOpen]);

  const displayName = user?.user_metadata?.full_name || user?.email || 'U';
  const avatarLetter = displayName.charAt(0).toUpperCase();

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-slate-300/20 bg-surface/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.png" alt="" width={32} height={32} className="rounded-lg" />
            <span className="text-xl font-extrabold text-slate-800" style={{ fontFamily: 'Nunito' }}>
              <span className="text-primary">KLSE</span> MarketCap
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 md:flex" role="navigation">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="min-h-[44px] rounded-xl px-4 py-2 text-sm font-semibold text-slate-800 transition-colors hover:bg-primary-light/10"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Desktop search + auth */}
          <div className="hidden items-center gap-3 md:flex">
            <div className="w-64">
              <SearchBar />
            </div>

            {/* Watchlist star */}
            <button
              onClick={handleWatchlistClick}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-slate-800 transition-colors hover:bg-primary-light/10"
              aria-label="Watchlist"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </button>

            {/* Desktop auth */}
            {!user ? (
              <button
                onClick={() => setShowLoginModal(true)}
                className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary/90 min-h-[44px]"
              >
                Sign In
              </button>
            ) : (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setShowUserDropdown(!showUserDropdown)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-light/20 text-sm font-semibold text-slate-800 transition-colors hover:bg-primary-light/30 min-h-[44px] min-w-[44px]"
                  aria-label="User menu"
                >
                  {avatarLetter}
                </button>
                {showUserDropdown && (
                  <div className="absolute right-0 top-full mt-2 min-w-[160px] rounded-xl bg-surface p-2 shadow-card-hover z-50">
                    <button
                      onClick={() => {
                        signOut();
                        setShowUserDropdown(false);
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-slate-800 hover:bg-primary-light/10 rounded-lg min-h-[44px]"
                    >
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Mobile: watchlist star + hamburger */}
          <div className="flex items-center gap-1 md:hidden">
            <button
              onClick={handleWatchlistClick}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-slate-800 transition-colors hover:bg-primary-light/10"
              aria-label="Watchlist"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </button>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl"
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            >
              <svg
                className="h-6 w-6 text-slate-800"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                {mobileOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="border-t border-slate-300/20 bg-surface px-4 pb-4 md:hidden">
            <div className="mb-3 pt-3">
              <SearchBar />
            </div>
            <nav className="flex flex-col gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="min-h-[44px] rounded-xl px-4 py-2 text-sm font-semibold text-slate-800 transition-colors hover:bg-primary-light/10"
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Mobile auth */}
            <div className="mt-3 border-t border-slate-300/20 pt-3">
              {!user ? (
                <button
                  onClick={() => {
                    setShowLoginModal(true);
                    setMobileOpen(false);
                  }}
                  className="w-full rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary/90 min-h-[44px]"
                >
                  Sign In
                </button>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-light/20 text-sm font-semibold text-slate-800">
                      {avatarLetter}
                    </div>
                    <span className="text-sm font-semibold text-slate-800 truncate max-w-[160px]">
                      {displayName}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      signOut();
                      setMobileOpen(false);
                    }}
                    className="rounded-lg px-3 py-2 text-sm text-slate-800 hover:bg-primary-light/10 min-h-[44px]"
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
    </>
  );
}
