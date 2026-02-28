# Implementation Plan: User Auth & Watchlist

> Phase 2 feature set for ASX MarketCap
> Created: 2026-02-17

---

## Table of Contents

1. [Overview](#1-overview)
2. [Flaws Found in Initial Draft](#2-flaws-found-in-initial-draft)
3. [Architecture Decisions](#3-architecture-decisions)
4. [Step-by-Step Implementation](#4-step-by-step-implementation)
5. [File Inventory](#5-file-inventory)
6. [Supabase Dashboard Setup (Manual)](#6-supabase-dashboard-setup-manual)
7. [Apple Sign-In Gotchas](#7-apple-sign-in-gotchas)
8. [Verification Checklist](#8-verification-checklist)

---

## 1. Overview

### What we're building

| Feature | Description |
|---------|-------------|
| **Supabase Auth** | Google + Apple OAuth only (no email/password). Cookie-based sessions via `@supabase/ssr`. |
| **Login modal** | Overlay popup from navbar — no dedicated /login page. |
| **Watchlist tab** | New client-side tab on the homepage (alongside All / Stocks / ETFs / Funds). |
| **Watchlist star** | Star icon on every screener row + "Add to Watchlist" button on detail page headers. |
| **Watchlist empty state** | CoinMarketCap-inspired grid: top 6 ASX securities by market cap with sparklines, plus a search bar to add more. |

### Tech additions

| Package | Version | Purpose |
|---------|---------|---------|
| `@supabase/ssr` | ^0.8.0 | Cookie-based auth for Next.js 15 App Router (replaces deprecated `@supabase/auth-helpers-nextjs`) |

No other new dependencies needed. All UI is hand-built with Tailwind.

---

## 2. Flaws Found in Initial Draft

The initial plan had several architectural issues that would break at implementation time. All are resolved below.

### Flaw 1: Tabs component is route-based — can't add a client-side Watchlist tab

**Problem:** The existing `Tabs` component (`src/components/ui/Tabs.js`) renders `<Link href={...}>` elements. Each tab navigates to a different route (`/`, `/stocks`, `/etfs`, `/funds`). A Watchlist tab can't be a separate route — it needs to show auth-gated, client-side content *on the homepage itself*.

**Impact:** If we naively added a `{ label: 'Watchlist', href: '/watchlist' }` to `SCREENER_TABS`, it would: (a) create a new page that duplicates the homepage layout, (b) appear on ALL pages that use `SCREENER_TABS` (/stocks, /etfs, /funds), and (c) require server-side data fetching for a feature that depends on client-side auth state.

**Fix:** Create a new `HomepageTabs` client component used *only* on the homepage. It renders the four route-based tabs as `<Link>` elements plus a fifth "Watchlist" tab as a `<button>` that triggers client-side tab switching. The existing `Tabs` component stays unchanged for /stocks, /etfs, /funds.

### Flaw 2: Homepage is a Server Component — Watchlist content needs client-side control

**Problem:** `src/app/page.js` is a server component with ISR (`revalidate = 60`). The Watchlist tab requires auth state (who is logged in?) and client-side data fetching (their watchlist items). You can't conditionally render auth-dependent content in a server component.

**Fix:** Extract the homepage body (tabs + screener table area) into a new `HomeContent` client component. The server component fetches the initial "All" tab data and passes it as props. The client component handles tab switching: for All/Stocks/ETFs/Funds tabs, it navigates normally via `<Link>`; for the Watchlist tab, it swaps the content area to show `WatchlistTab` (a client component that handles its own data fetching).

### Flaw 3: `createServerClient` name collision

**Problem:** The existing `src/lib/supabase/server.js` exports `createServerClient()` which uses the **service_role key** (bypasses RLS, no auth). The new auth-aware server client from `@supabase/ssr` should also be a "server client." Using the same name would cause confusion or breakage.

**Fix:** Rename the existing function to `createServiceClient()` (reflects that it uses the service_role key for sync jobs). Add a new `createAuthServerClient()` for reading user sessions in route handlers and server components. Update all existing callers of `createServerClient()` → `createServiceClient()`.

**Callers to update:**
- `src/app/page.js`
- `src/app/stocks/page.js`
- `src/app/etfs/page.js`
- `src/app/funds/page.js`
- `src/app/stock/[ticker]/page.js`
- `src/app/etf/[ticker]/page.js`
- `src/app/fund/[ticker]/page.js`
- `src/app/sectors/page.js`
- `src/app/api/securities/route.js`
- `src/app/api/search/route.js`
- All sync job API routes (`src/app/api/sync/*/route.js`)

### Flaw 4: Next.js 15 makes `cookies()` async — server client must be `async`

**Problem:** In Next.js 15, `cookies()` from `next/headers` returns a `Promise`. The new auth server client needs `await cookies()` before constructing the Supabase client. This means `createAuthServerClient()` must be `async`, and every caller must `await` it.

**Fix:** The `createAuthServerClient()` function is `async`. All callers use `const supabase = await createAuthServerClient()`. The existing `createServiceClient()` (service_role) does NOT use cookies and stays synchronous — no changes needed for sync jobs.

### Flaw 5: Must use `getUser()` not `getSession()` on the server

**Problem:** `supabase.auth.getSession()` reads the JWT locally without validating it against the Supabase Auth server. A malicious user could tamper with the JWT. The initial plan didn't specify which method to use.

**Fix:** All server-side auth checks (middleware, route handlers, server components) use `supabase.auth.getUser()`. Only the browser-side `AuthProvider` may use `getSession()` for quick hydration (since the browser client handles its own token management).

### Flaw 6: Securities API route uses service_role — can't read user session

**Problem:** `/api/securities/route.js` uses `createServerClient()` (service_role). To support `?watchlist=true`, we need to know *who* is asking. But the service_role client bypasses auth entirely.

**Fix:** When `watchlist=true` is in the query params, the route handler creates an auth-aware client to get the user's ID, then queries the `watchlist_items` table to get their security IDs, then filters the existing service_role query by those IDs. This keeps the existing query logic intact while adding watchlist filtering.

### Flaw 7: Apple Sign-In can't be tested on localhost

**Problem:** Apple requires HTTPS return URLs. `http://localhost:3000` won't work for Apple OAuth. The initial plan didn't mention this.

**Fix:** Document that Apple OAuth must be tested on a deployed environment (Vercel preview/production) or via an HTTPS tunnel (ngrok). Google OAuth works fine on localhost.

### Flaw 8: Apple sends user's name only on first sign-in

**Problem:** Apple provides `user.name` only during the *first* authorization. On subsequent logins, it's `null`. If you don't capture it the first time, you lose it forever.

**Fix:** The `on_auth_user_created` trigger captures the name from `raw_user_meta_data` into the `profiles` table. Supabase stores the OAuth metadata automatically on first sign-in. The trigger fires once (on INSERT), so it captures the initial name.

### Flaw 9: `@supabase/ssr` requires `getAll`/`setAll` — not individual cookie methods

**Problem:** The deprecated `@supabase/auth-helpers-nextjs` used `get(name)`/`set(name, value)`/`remove(name)`. The new `@supabase/ssr` uses `getAll()`/`setAll(cookiesToSet)`. Using the old API causes silent auth failures.

**Fix:** All cookie configurations use the `getAll`/`setAll` pattern exclusively. Code examples below use the correct API.

---

## 3. Architecture Decisions

### Auth flow (PKCE)

```
User clicks "Sign In" → LoginModal opens
  → "Continue with Google" button
  → supabase.auth.signInWithOAuth({ provider: 'google', redirectTo: '/auth/callback' })
  → Redirected to Google → user consents
  → Redirected to Supabase → Supabase redirects to /auth/callback?code=xxx
  → Route handler exchanges code for session (sets cookies)
  → Redirected to homepage → AuthProvider detects session → UI updates
```

### Session management

```
Every request → middleware.js
  → Creates Supabase client with request/response cookies
  → Calls supabase.auth.getUser() (validates token with Supabase server)
  → If token expired, refreshes it and writes new cookies to response
  → Passes response through to the page
```

### Watchlist data flow

```
Homepage Watchlist Tab (client component)
  → useAuth() → if no user, show "Sign in" prompt
  → if user, useWatchlist() hook
    → GET /api/watchlist → returns [{ security_id }]
    → GET /api/securities?watchlist=true → returns securities filtered by watchlist
  → if empty watchlist, show WatchlistEmptyState (top 6 by market cap + search)
  → if has items, show ScreenerTable with watchlist data
```

### Watchlist star interaction

```
User clicks star on ScreenerRow or DetailHeader
  → useWatchlist().toggleWatchlist(securityId)
  → If not logged in → open LoginModal
  → If logged in → optimistic UI update (fill/unfill star)
    → POST/DELETE /api/watchlist { security_id }
    → On error → revert UI
```

---

## 4. Step-by-Step Implementation

### Step 1: Install @supabase/ssr

```bash
npm install @supabase/ssr
```

---

### Step 2: Database Migration

**New file:** `supabase/migrations/007_auth_watchlist.sql`

```sql
-- =============================================
-- PROFILES TABLE
-- =============================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- =============================================
-- WATCHLIST ITEMS TABLE
-- =============================================
CREATE TABLE watchlist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  security_id UUID NOT NULL REFERENCES securities(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, security_id)
);

ALTER TABLE watchlist_items ENABLE ROW LEVEL SECURITY;

-- Users can read their own watchlist
CREATE POLICY "Users can read own watchlist"
  ON watchlist_items FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can add to their own watchlist
CREATE POLICY "Users can insert own watchlist"
  ON watchlist_items FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can remove from their own watchlist
CREATE POLICY "Users can delete own watchlist"
  ON watchlist_items FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Index for fast lookups
CREATE INDEX idx_watchlist_user ON watchlist_items(user_id);
CREATE INDEX idx_watchlist_user_security ON watchlist_items(user_id, security_id);

-- =============================================
-- AUTO-CREATE PROFILE ON SIGNUP (trigger)
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data ->> 'full_name',
      NEW.raw_user_meta_data ->> 'name',
      split_part(NEW.email, '@', 1)
    ),
    COALESCE(
      NEW.raw_user_meta_data ->> 'avatar_url',
      NEW.raw_user_meta_data ->> 'picture'
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

**Why `SECURITY DEFINER`:** The trigger needs to INSERT into `profiles` as the user, but it runs during signup before RLS policies apply to the new user. `SECURITY DEFINER` executes with the function owner's privileges (postgres/superuser), bypassing RLS.

---

### Step 3: Refactor Supabase Clients

#### `src/lib/supabase/client.js` — Browser client (REPLACE entire file)

```javascript
import { createBrowserClient } from '@supabase/ssr';

let client = null;

export function getSupabaseClient() {
  if (!client) {
    client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
  }
  return client;
}
```

`createBrowserClient` from `@supabase/ssr` automatically handles cookie-based session storage in the browser. It's a singleton — safe to cache.

#### `src/lib/supabase/server.js` — Server clients (REPLACE entire file)

```javascript
import { createClient } from '@supabase/supabase-js';
import { createServerClient as createSSRServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Service-role client — bypasses RLS.
 * Used for sync jobs and public data queries.
 * NOT auth-aware. Synchronous.
 */
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );
}

/**
 * Anon client without auth — for simple public reads on the server.
 * Synchronous.
 */
export function createAnonServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false } }
  );
}

/**
 * Auth-aware server client — reads/writes session cookies.
 * Used in Server Components and Route Handlers to get the current user.
 * MUST be awaited: `const supabase = await createAuthServerClient()`
 */
export async function createAuthServerClient() {
  const cookieStore = await cookies();

  return createSSRServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll called from a Server Component — safe to ignore.
            // Middleware handles the actual session refresh.
          }
        },
      },
    }
  );
}
```

**Rename impact:** All existing callers of `createServerClient()` must be updated to `createServiceClient()`. These are:
- `src/app/page.js` (line 1 import)
- `src/app/stocks/page.js` (line 1 import)
- `src/app/etfs/page.js` (line 1 import)
- `src/app/funds/page.js` (line 1 import)
- `src/app/stock/[ticker]/page.js`
- `src/app/etf/[ticker]/page.js`
- `src/app/fund/[ticker]/page.js`
- `src/app/sectors/page.js`
- `src/app/api/securities/route.js` (line 1 import)
- `src/app/api/search/route.js`
- All `src/app/api/sync/*/route.js` files

This is a safe mechanical rename — the function signature and behavior are identical.

#### `src/lib/supabase/middleware.js` — NEW middleware helper

```javascript
import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

export async function updateSession(request) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Validate and refresh the session token.
  // IMPORTANT: Use getUser(), NOT getSession(). getSession() doesn't
  // validate the JWT with the server and is insecure for server-side code.
  await supabase.auth.getUser();

  // All pages are public — no redirects needed.
  // Watchlist features gracefully degrade (show "Sign in" prompt).
  return supabaseResponse;
}
```

---

### Step 4: Next.js Middleware

**New file:** `src/middleware.js`

```javascript
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // Match all routes except static assets
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
```

**Performance note:** The middleware calls `getUser()` on every request, which makes a network call to Supabase. This adds ~50-100ms latency. On the Supabase Free plan this is fine for the expected traffic. If it becomes a bottleneck, we can add conditional logic to only call `getUser()` when auth cookies are present.

---

### Step 5: Auth Context Provider

**New file:** `src/components/auth/AuthProvider.js`

```javascript
'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';

const AuthContext = createContext({
  user: null,
  loading: true,
  signOut: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const supabase = getSupabaseClient();

  useEffect(() => {
    // Hydrate session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, [supabase]);

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
```

**Why `getSession()` is OK here:** In the browser client, `getSession()` reads from the locally managed session. The browser client handles its own token refresh via `onAuthStateChange`. Server-side is where `getUser()` is required.

#### Modify `src/app/layout.js`

```javascript
import '@/styles/globals.css';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import AuthProvider from '@/components/auth/AuthProvider';

export const metadata = { /* unchanged */ };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-cream text-bark antialiased">
        <AuthProvider>
          <Navbar />
          <main className="min-h-screen pt-16">{children}</main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
```

---

### Step 6: Login Modal

**New file:** `src/components/auth/LoginModal.js`

```javascript
'use client';

import { useEffect, useRef } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';

export default function LoginModal({ isOpen, onClose }) {
  const overlayRef = useRef(null);

  // Close on Escape
  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') onClose();
    }
    if (isOpen) document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  async function handleOAuth(provider) {
    const supabase = getSupabaseClient();
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  }

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-bark/50 backdrop-blur-sm"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label="Sign in"
    >
      <div className="mx-4 w-full max-w-sm rounded-2xl bg-cream p-6 shadow-card-hover">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 min-h-[44px] min-w-[44px] text-bark-lighter hover:text-bark"
          aria-label="Close"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h2 className="mb-2 text-center text-xl font-bold text-bark">Sign in to ASX MarketCap</h2>
        <p className="mb-6 text-center text-sm text-bark-lighter">
          Save your favourite securities to a personal watchlist
        </p>

        <div className="space-y-3">
          {/* Google button */}
          <button
            onClick={() => handleOAuth('google')}
            className="flex min-h-[44px] w-full items-center justify-center gap-3 rounded-xl border border-bark-lighter/20 bg-white px-4 py-3 text-sm font-semibold text-bark transition-colors hover:bg-sage/5"
          >
            {/* Google SVG icon */}
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          {/* Apple button */}
          <button
            onClick={() => handleOAuth('apple')}
            className="flex min-h-[44px] w-full items-center justify-center gap-3 rounded-xl border border-bark-lighter/20 bg-bark px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-bark/90"
          >
            {/* Apple SVG icon */}
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
            </svg>
            Continue with Apple
          </button>
        </div>

        <p className="mt-4 text-center text-xs text-bark-lighter">
          By signing in, you agree to our Terms of Service
        </p>
      </div>
    </div>
  );
}
```

---

### Step 7: Auth Callback Route Handler

**New file:** `src/app/auth/callback/route.js`

```javascript
import { NextResponse } from 'next/server';
import { createAuthServerClient } from '@/lib/supabase/server';

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const supabase = await createAuthServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const forwardedHost = request.headers.get('x-forwarded-host');
      const isLocalEnv = process.env.NODE_ENV === 'development';

      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`);
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
      } else {
        return NextResponse.redirect(`${origin}${next}`);
      }
    }
  }

  // Auth error — redirect home with error indicator
  return NextResponse.redirect(`${origin}/?auth_error=true`);
}
```

---

### Step 8: Navbar Auth UI

**Modify:** `src/components/layout/Navbar.js`

Add to the existing component:
- Import `useAuth` and `LoginModal`
- When logged out: "Sign In" button between search bar and mobile hamburger
- When logged in: user avatar circle with dropdown (just "Sign Out" for now)
- Track `showLoginModal` state — pass to `<LoginModal>`

The sign-in button styling matches existing nav link styles (rounded-xl, min-h-[44px], sage-dark active).

---

### Step 9: Watchlist API

**New file:** `src/app/api/watchlist/route.js`

```javascript
import { createAuthServerClient } from '@/lib/supabase/server';

// GET /api/watchlist — returns the user's watchlist security IDs
export async function GET() {
  const supabase = await createAuthServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('watchlist_items')
    .select('security_id')
    .eq('user_id', user.id)
    .order('added_at', { ascending: false });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ items: data || [] });
}

// POST /api/watchlist — add a security to the watchlist
export async function POST(request) {
  const supabase = await createAuthServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { security_id } = await request.json();

  if (!security_id) {
    return Response.json({ error: 'security_id required' }, { status: 400 });
  }

  const { error } = await supabase
    .from('watchlist_items')
    .upsert(
      { user_id: user.id, security_id },
      { onConflict: 'user_id,security_id' }
    );

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ success: true });
}

// DELETE /api/watchlist — remove a security from the watchlist
export async function DELETE(request) {
  const supabase = await createAuthServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { security_id } = await request.json();

  if (!security_id) {
    return Response.json({ error: 'security_id required' }, { status: 400 });
  }

  const { error } = await supabase
    .from('watchlist_items')
    .delete()
    .eq('user_id', user.id)
    .eq('security_id', security_id);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ success: true });
}
```

---

### Step 10: Watchlist Hook

**New file:** `src/lib/hooks/useWatchlist.js`

```javascript
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';

export function useWatchlist() {
  const { user } = useAuth();
  const [watchlistIds, setWatchlistIds] = useState(new Set());
  const [loading, setLoading] = useState(false);

  // Fetch watchlist when user changes
  useEffect(() => {
    if (!user) {
      setWatchlistIds(new Set());
      return;
    }

    setLoading(true);
    fetch('/api/watchlist')
      .then((res) => res.json())
      .then((json) => {
        const ids = (json.items || []).map((item) => item.security_id);
        setWatchlistIds(new Set(ids));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  const isInWatchlist = useCallback(
    (securityId) => watchlistIds.has(securityId),
    [watchlistIds]
  );

  const toggleWatchlist = useCallback(
    async (securityId) => {
      if (!user) return { needsAuth: true };

      const isCurrently = watchlistIds.has(securityId);

      // Optimistic update
      setWatchlistIds((prev) => {
        const next = new Set(prev);
        if (isCurrently) next.delete(securityId);
        else next.add(securityId);
        return next;
      });

      try {
        const res = await fetch('/api/watchlist', {
          method: isCurrently ? 'DELETE' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ security_id: securityId }),
        });

        if (!res.ok) throw new Error('Failed');
        return { success: true };
      } catch {
        // Revert on error
        setWatchlistIds((prev) => {
          const next = new Set(prev);
          if (isCurrently) next.add(securityId);
          else next.delete(securityId);
          return next;
        });
        return { error: true };
      }
    },
    [user, watchlistIds]
  );

  return { watchlistIds, isInWatchlist, toggleWatchlist, loading };
}
```

---

### Step 11: WatchlistStar Component

**New file:** `src/components/ui/WatchlistStar.js`

```javascript
'use client';

import { useState } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useWatchlist } from '@/lib/hooks/useWatchlist';

export default function WatchlistStar({ securityId, size = 'sm', onAuthRequired }) {
  const { user } = useAuth();
  const { isInWatchlist, toggleWatchlist } = useWatchlist();
  const [animating, setAnimating] = useState(false);

  const active = isInWatchlist(securityId);
  const sizeClass = size === 'lg' ? 'h-6 w-6' : 'h-4 w-4';

  async function handleClick(e) {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      onAuthRequired?.();
      return;
    }

    setAnimating(true);
    await toggleWatchlist(securityId);
    setTimeout(() => setAnimating(false), 200);
  }

  return (
    <button
      onClick={handleClick}
      className={`inline-flex items-center justify-center transition-transform ${
        animating ? 'scale-125' : ''
      }`}
      aria-label={active ? 'Remove from watchlist' : 'Add to watchlist'}
    >
      <svg
        className={`${sizeClass} ${
          active ? 'fill-butter text-butter' : 'fill-none text-bark-lighter hover:text-butter'
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
  );
}
```

**Accessibility note:** The star uses `fill-butter` (yellow) when active with `text-butter` stroke, and `fill-none` with `text-bark-lighter` when inactive. The `aria-label` changes to communicate state.

---

### Step 12: Integrate Stars into Screener Rows

**Modify:** `src/components/screener/ScreenerRow.js`

Add a `WatchlistStar` cell as the **first cell** in the row, before the rank column. This cell is outside the column registry system — it's always present, narrow (w-8), and doesn't affect existing column logic.

```jsx
<tr className="...">
  {/* Watchlist star — always first, outside column system */}
  <td className="w-8 px-1 py-3 text-center">
    <WatchlistStar securityId={security.id} onAuthRequired={onAuthRequired} />
  </td>
  {columns.map((col) => (
    <td key={col.id} className="...">
      {renderCell(col, security, rank, type)}
    </td>
  ))}
</tr>
```

**Modify:** `src/components/screener/ScreenerTable.js`

Add a matching empty `<th className="w-8">` as the first header cell. Pass an `onAuthRequired` callback down to `ScreenerRow` that opens the login modal.

---

### Step 13: Integrate Star into Detail Page Headers

**Modify:** `src/components/detail/DetailHeader.js`

Add `WatchlistStar` next to the ticker badge. Use `size="lg"` for the larger detail page context.

```jsx
<div className="flex flex-wrap items-center gap-2">
  <h1 className="text-2xl font-bold sm:text-3xl">{security.name}</h1>
  <span className="inline-flex items-center rounded-full bg-bark-lighter/20 px-3 py-0.5 text-sm font-semibold">
    {security.symbol}
  </span>
  <WatchlistStar securityId={security.id} size="lg" onAuthRequired={onAuthRequired} />
</div>
```

Since `DetailHeader` is currently a server component, it needs to become a client component (add `'use client'`) or the `WatchlistStar` needs to be passed as a child/slot. The cleanest approach: keep `DetailHeader` as a server component and add a separate `WatchlistStarWrapper` client component next to it in the detail page.

---

### Step 14: Homepage Tabs + Watchlist Tab

This is the most architecturally significant change. The homepage needs a **hybrid tab system**: four route-based tabs + one client-side tab.

**New file:** `src/components/screener/HomepageTabs.js`

```javascript
'use client';

import Link from 'next/link';
import { SCREENER_TABS } from '@/lib/constants';

export default function HomepageTabs({ watchlistActive, onWatchlistClick }) {
  return (
    <nav className="flex gap-2" aria-label="Security type filter">
      {SCREENER_TABS.map((tab) => {
        const isActive = tab.href === '/' && !watchlistActive;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={isActive ? 'page' : undefined}
            className={`inline-flex min-h-[44px] items-center rounded-full px-5 py-2 text-sm font-semibold transition-colors ${
              isActive
                ? 'bg-sage-dark text-white'
                : 'bg-warm-white text-bark hover:bg-sage/20'
            }`}
          >
            {tab.label}
          </Link>
        );
      })}

      {/* Watchlist tab — client-side toggle */}
      <button
        onClick={onWatchlistClick}
        aria-current={watchlistActive ? 'page' : undefined}
        className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-5 py-2 text-sm font-semibold transition-colors ${
          watchlistActive
            ? 'bg-sage-dark text-white'
            : 'bg-warm-white text-bark hover:bg-sage/20'
        }`}
      >
        {/* Star icon */}
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth={1}>
          <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
        </svg>
        Watchlist
      </button>
    </nav>
  );
}
```

**New file:** `src/components/watchlist/WatchlistTab.js`

This client component manages the three watchlist states:
1. **Not logged in** → "Sign in to use your watchlist" with sign-in button
2. **Logged in, empty watchlist** → `WatchlistEmptyState` (top 6 cards + search)
3. **Logged in, has items** → `ScreenerTable` filtered to watchlist items

```javascript
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useWatchlist } from '@/lib/hooks/useWatchlist';
import ScreenerTable from '@/components/screener/ScreenerTable';
import WatchlistEmptyState from '@/components/watchlist/WatchlistEmptyState';
import Skeleton from '@/components/ui/Skeleton';
import { PAGE_SIZE } from '@/lib/constants';

export default function WatchlistTab({ onAuthRequired }) {
  const { user, loading: authLoading } = useAuth();
  const { watchlistIds, loading: watchlistLoading } = useWatchlist();
  const [securities, setSecurities] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user || watchlistIds.size === 0) return;

    setLoading(true);
    fetch(`/api/securities?watchlist=true&limit=${PAGE_SIZE}`)
      .then((res) => res.json())
      .then((json) => setSecurities(json.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user, watchlistIds]);

  // Loading state
  if (authLoading || watchlistLoading) {
    return <Skeleton variant="row" count={6} />;
  }

  // Not logged in
  if (!user) {
    return (
      <div className="rounded-2xl bg-warm-white p-12 text-center shadow-card">
        <svg className="mx-auto mb-4 h-12 w-12 text-butter" viewBox="0 0 24 24" fill="currentColor">
          <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
        </svg>
        <h2 className="mb-2 text-xl font-bold text-bark">Track your favourite securities</h2>
        <p className="mb-6 text-sm text-bark-lighter">
          Sign in to create a personal watchlist of ASX stocks and ETFs
        </p>
        <button
          onClick={onAuthRequired}
          className="rounded-xl bg-sage-dark px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-sage-dark/90"
        >
          Sign In
        </button>
      </div>
    );
  }

  // Logged in but empty watchlist
  if (watchlistIds.size === 0) {
    return <WatchlistEmptyState onAuthRequired={onAuthRequired} />;
  }

  // Logged in with watchlist items
  if (loading) {
    return <Skeleton variant="row" count={6} />;
  }

  return (
    <ScreenerTable
      initialData={securities}
      initialPagination={{
        page: 1,
        limit: PAGE_SIZE,
        total: watchlistIds.size,
        totalPages: Math.ceil(watchlistIds.size / PAGE_SIZE),
      }}
      type="all"
      watchlistMode
    />
  );
}
```

**Modify:** `src/app/page.js`

The homepage server component fetches initial "All" data as before, then passes it to a new `HomeContent` client component that manages the tab state.

```javascript
// src/app/page.js (simplified structure)
import { createServiceClient } from '@/lib/supabase/server'; // renamed
import HomeContent from '@/components/screener/HomeContent';
// ... same data fetching as before ...

export default async function HomePage() {
  const supabase = createServiceClient();
  // ... fetch initial data ...
  return <HomeContent initialData={enrichedData} initialPagination={...} total={total} />;
}
```

**New file:** `src/components/screener/HomeContent.js`

```javascript
'use client';

import { useState } from 'react';
import HomepageTabs from '@/components/screener/HomepageTabs';
import ScreenerTable from '@/components/screener/ScreenerTable';
import WatchlistTab from '@/components/watchlist/WatchlistTab';
import MarketOverviewCards from '@/components/layout/MarketOverviewCards';
import LoginModal from '@/components/auth/LoginModal';

export default function HomeContent({ initialData, initialPagination, total }) {
  const [watchlistActive, setWatchlistActive] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  return (
    <>
      <div className="mb-6">
        <HomepageTabs
          watchlistActive={watchlistActive}
          onWatchlistClick={() => setWatchlistActive(true)}
        />
      </div>

      {watchlistActive ? (
        <WatchlistTab onAuthRequired={() => setShowLoginModal(true)} />
      ) : (
        <>
          <MarketOverviewCards />
          <ScreenerTable
            initialData={initialData}
            initialPagination={initialPagination}
            type="all"
          />
        </>
      )}

      <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
    </>
  );
}
```

---

### Step 15: Watchlist Empty State (CoinMarketCap-inspired)

**New file:** `src/components/watchlist/WatchlistEmptyState.js`

Fetches top 6 securities by market cap and displays them in a 2x3 grid of cards. Each card has:
- WatchlistStar (top-right corner)
- Logo + name
- Price + 1D change (using ChangeIndicator)
- 7-day sparkline

Below the grid: a search bar (reusing the existing search pattern from `SearchBar.js`) where clicking a result adds it to the watchlist instead of navigating.

```javascript
'use client';

import { useState, useEffect } from 'react';
import Logo from '@/components/ui/Logo';
import ChangeIndicator from '@/components/ui/ChangeIndicator';
import Sparkline from '@/components/ui/Sparkline';
import WatchlistStar from '@/components/ui/WatchlistStar';
import { formatPrice } from '@/lib/formatters';
import { useWatchlist } from '@/lib/hooks/useWatchlist';

export default function WatchlistEmptyState({ onAuthRequired }) {
  const [topSecurities, setTopSecurities] = useState([]);
  const { toggleWatchlist } = useWatchlist();

  useEffect(() => {
    fetch('/api/securities?type=all&sort=market_cap&order=desc&limit=6')
      .then((res) => res.json())
      .then((json) => setTopSecurities(json.data || []))
      .catch(() => {});
  }, []);

  return (
    <div className="rounded-2xl bg-warm-white p-8 shadow-card">
      {/* Header */}
      <div className="mb-8 text-center">
        <svg className="mx-auto mb-3 h-10 w-10 text-butter" viewBox="0 0 24 24" fill="currentColor">
          <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
        </svg>
        <h2 className="text-xl font-bold text-bark">Add Securities to Your Watchlist</h2>
      </div>

      {/* Top 6 grid */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {topSecurities.map((sec) => (
          <div
            key={sec.symbol}
            className="relative rounded-xl border border-bark-lighter/10 bg-cream p-4 transition-shadow hover:shadow-card"
          >
            {/* Star in top-right */}
            <div className="absolute right-3 top-3">
              <WatchlistStar
                securityId={sec.id}
                size="sm"
                onAuthRequired={onAuthRequired}
              />
            </div>

            {/* Logo + name */}
            <div className="mb-2 flex items-center gap-2">
              <Logo src={sec.logo_url} alt={sec.symbol} size="sm" />
              <div>
                <span className="font-mono text-sm font-bold text-bark">{sec.symbol}</span>
              </div>
            </div>

            {/* Price + change */}
            <div className="mb-2 flex items-baseline gap-2">
              <span className="font-mono text-sm font-semibold text-bark">
                {formatPrice(sec.price)}
              </span>
              <ChangeIndicator value={sec.change_1d_pct} />
            </div>

            {/* Sparkline */}
            <Sparkline data={sec.sparkline_7d} width={180} height={40} />
          </div>
        ))}
      </div>

      {/* Search section */}
      <WatchlistSearch onAuthRequired={onAuthRequired} />
    </div>
  );
}

/**
 * Search bar that adds securities to watchlist instead of navigating.
 * Reuses the same /api/search endpoint as the navbar SearchBar.
 */
function WatchlistSearch({ onAuthRequired }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const { toggleWatchlist } = useWatchlist();

  useEffect(() => {
    if (query.length < 1) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&limit=6`);
        const data = await res.json();
        setResults(data);
        setIsOpen(data.length > 0);
      } catch {
        setResults([]);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  async function handleAdd(security) {
    await toggleWatchlist(security.id);
    setQuery('');
    setIsOpen(false);
  }

  return (
    <div className="relative mx-auto max-w-md">
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-bark-lighter"
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for More Securities"
          className="min-h-[44px] w-full rounded-xl border border-bark-lighter/20 bg-cream py-2 pl-9 pr-3 text-sm text-bark placeholder:text-bark-lighter/50 focus:border-bark focus:outline-none"
        />
      </div>

      {isOpen && (
        <ul className="absolute left-0 right-0 top-full z-50 mt-1 max-h-72 overflow-auto rounded-xl border border-bark-lighter/20 bg-cream shadow-card-hover">
          {results.map((item) => (
            <li
              key={item.symbol}
              className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-sage/5"
              onClick={() => handleAdd(item)}
            >
              <Logo src={item.logo_url} alt={item.symbol} size="sm" />
              <span className="font-mono text-sm font-semibold text-bark">{item.symbol}</span>
              <span className="min-w-0 flex-1 truncate text-xs text-bark-lighter">{item.name}</span>
              <span className="text-xs text-sage-dark">+ Add</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

---

### Step 16: Modify Securities API for Watchlist Filtering

**Modify:** `src/app/api/securities/route.js`

Add support for `?watchlist=true` query parameter:

```javascript
// Near the top of the GET handler, after parsing params:
const watchlist = searchParams.get('watchlist') === 'true';

if (watchlist) {
  // Get user session from auth-aware client
  const { createAuthServerClient } = await import('@/lib/supabase/server');
  const authSupabase = await createAuthServerClient();
  const { data: { user } } = await authSupabase.auth.getUser();

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get watchlist security IDs
  const { data: watchlistItems } = await authSupabase
    .from('watchlist_items')
    .select('security_id')
    .eq('user_id', user.id);

  const watchlistSecurityIds = (watchlistItems || []).map((w) => w.security_id);

  if (watchlistSecurityIds.length === 0) {
    return Response.json({
      data: [],
      pagination: { page: 1, limit, total: 0, totalPages: 0 },
    });
  }

  // Add .in('id', watchlistSecurityIds) filter to the query
  // ... rest of fetchSecurities logic, but with this additional filter
}
```

---

## 5. File Inventory

### New Files (12)

| File | Type | Description |
|------|------|-------------|
| `supabase/migrations/007_auth_watchlist.sql` | SQL | profiles + watchlist_items tables, RLS, trigger |
| `src/lib/supabase/middleware.js` | JS | Session refresh helper for middleware |
| `src/middleware.js` | JS | Next.js middleware entry point |
| `src/components/auth/AuthProvider.js` | JSX | Auth context provider (client) |
| `src/components/auth/LoginModal.js` | JSX | Google/Apple sign-in modal (client) |
| `src/app/auth/callback/route.js` | JS | OAuth PKCE callback handler |
| `src/app/api/watchlist/route.js` | JS | Watchlist CRUD API |
| `src/lib/hooks/useWatchlist.js` | JS | Watchlist state hook (client) |
| `src/components/ui/WatchlistStar.js` | JSX | Star toggle button (client) |
| `src/components/screener/HomepageTabs.js` | JSX | Hybrid tabs: route links + watchlist button |
| `src/components/screener/HomeContent.js` | JSX | Homepage body with tab switching (client) |
| `src/components/watchlist/WatchlistEmptyState.js` | JSX | Top 6 cards + search (client) |
| `src/components/watchlist/WatchlistTab.js` | JSX | Watchlist tab container (client) |

### Modified Files (12+)

| File | Change |
|------|--------|
| `package.json` | Add `@supabase/ssr` dependency |
| `src/lib/supabase/client.js` | Replace with `createBrowserClient` from `@supabase/ssr` |
| `src/lib/supabase/server.js` | Rename `createServerClient` → `createServiceClient`, add `createAuthServerClient` |
| `src/app/layout.js` | Wrap children with `<AuthProvider>` |
| `src/components/layout/Navbar.js` | Add sign-in/user-menu UI |
| `src/components/screener/ScreenerRow.js` | Add WatchlistStar cell |
| `src/components/screener/ScreenerTable.js` | Add star column header, pass onAuthRequired |
| `src/components/detail/DetailHeader.js` | Add WatchlistStar next to ticker |
| `src/app/page.js` | Use `HomeContent`, rename import |
| `src/app/api/securities/route.js` | Add `?watchlist=true` filter support, rename import |
| `src/app/stocks/page.js` | Rename import `createServerClient` → `createServiceClient` |
| `src/app/etfs/page.js` | Rename import |
| `src/app/funds/page.js` | Rename import |
| `src/app/stock/[ticker]/page.js` | Rename import |
| `src/app/etf/[ticker]/page.js` | Rename import |
| `src/app/fund/[ticker]/page.js` | Rename import |
| `src/app/sectors/page.js` | Rename import |
| `src/app/api/search/route.js` | Rename import |
| All `src/app/api/sync/*/route.js` | Rename import |

**Total: ~13 new files, ~15+ modified files**

---

## 6. Supabase Dashboard Setup (Manual)

These steps must be performed in the Supabase dashboard before auth will work:

### 6.1 Enable Google OAuth

1. Go to **Authentication → Providers → Google**
2. Toggle **Enable**
3. Create OAuth credentials in [Google Cloud Console](https://console.cloud.google.com/apis/credentials):
   - Application type: **Web application**
   - Authorized redirect URI: `https://<project-id>.supabase.co/auth/v1/callback`
4. Copy **Client ID** and **Client Secret** into Supabase
5. For local dev, add `http://localhost:3000` to Authorized JavaScript origins in Google Console

### 6.2 Enable Apple Sign-In

1. Go to **Authentication → Providers → Apple**
2. Toggle **Enable**
3. In [Apple Developer Console](https://developer.apple.com/account):
   - Create an **App ID** with "Sign in with Apple" capability
   - Create a **Services ID** (e.g., `com.asxmarketcap.web`) — this is your Client ID
   - Create a **Signing Key** (.p8 file) — download it immediately (one-time download)
   - Note your **Team ID** and **Key ID**
4. Configure the Services ID:
   - Add domain: `<project-id>.supabase.co`
   - Add return URL: `https://<project-id>.supabase.co/auth/v1/callback`
5. Generate the client secret JWT (use Supabase's built-in tool in Chrome/Firefox, NOT Safari)
6. Enter **Client ID** (Services ID) and **Secret Key** (generated JWT) in Supabase

### 6.3 Set Redirect URLs

In **Authentication → URL Configuration**:
- **Site URL**: `https://asxmarketcap.com`
- **Redirect URLs**: Add both:
  - `https://asxmarketcap.com/auth/callback`
  - `http://localhost:3000/auth/callback`

### 6.4 Apply the Migration

Run the SQL from `007_auth_watchlist.sql` in the Supabase **SQL Editor**.

---

## 7. Apple Sign-In Gotchas

| Issue | Impact | Mitigation |
|-------|--------|------------|
| **Name only on first sign-in** | Apple sends `user.name` only once. Subsequent logins have `null` name. | The `on_auth_user_created` trigger captures the name from `raw_user_meta_data` on first signup. |
| **"Hide My Email" relay** | Users can choose a relay email like `xxx@privaterelay.appleid.com`. Emails to this address bounce unless configured. | Register sending domain in Apple Developer → Services → Sign in with Apple for Email Communication. |
| **Secret expires every 6 months** | The JWT secret generated from the .p8 key has a max 6-month expiry. Auth breaks silently when it expires. | Set a calendar reminder to regenerate before expiry. |
| **HTTPS required** | Apple rejects `http://localhost` as a return URL. | Test Apple OAuth on Vercel preview deployments or via ngrok. Test Google locally. |
| **Safari + secret generator** | Supabase's built-in secret generation tool doesn't work in Safari. | Use Chrome or Firefox for the Supabase dashboard. |
| **Services ID ≠ App ID** | Common mistake: using the App ID instead of the Services ID as the Client ID. | Use the Services ID (e.g., `com.asxmarketcap.web`), not the App ID. |

---

## 8. Additional Notes: Frozen Column Compatibility

The column registry and ScreenerTable have been updated since the initial exploration. Key changes that affect this plan:

### Frozen/Sticky Columns

The `rank`, `symbol`, and `name` columns now have `frozen: true` and `stickyLeft` pixel offsets (0, 48, 148 respectively). The `FROZEN_COLUMNS_WIDTH` constant is 308px. When adding the WatchlistStar as the leftmost column, we have two options:

**Option A (Recommended): Star inside existing rank column**
Place the star before the rank number in the same cell, avoiding any shift to `stickyLeft` values. The rank column already exists at position 0, so the star just becomes part of it. This avoids touching `FROZEN_COLUMNS_WIDTH` and all frozen offsets.

**Option B: Separate frozen star column**
Add a new frozen column at `stickyLeft: 0`, shift rank to 32px, symbol to 80px, name to 180px, and update `FROZEN_COLUMNS_WIDTH` to 340px. This is cleaner semantically but requires updating 4+ offset values and the constant.

**Recommendation:** Go with Option A. The star and rank can share a cell:
```jsx
<td className="... sticky z-10 bg-warm-white" style={{ left: 0 }}>
  <div className="flex items-center gap-1">
    <WatchlistStar securityId={security.id} size="sm" />
    <span className="font-mono text-xs text-bark-lighter">{rank}</span>
  </div>
</td>
```

This requires modifying `renderCell` for `renderType: 'rank'` to include the star, rather than adding a separate column.

### SWR Available

The project now has `swr` as a dependency. The `useWatchlist` hook in Step 10 could use `useSWR` instead of raw `fetch` + `useEffect` for automatic revalidation and caching. However, since watchlist changes are driven by explicit user actions (star clicks) with optimistic updates, raw state management is fine. SWR could be used for the initial fetch if desired.

### Drag-to-Scroll

ScreenerTable now supports drag-to-scroll with edge shadows. The WatchlistStar's `onClick` handler calls `e.stopPropagation()` and `e.preventDefault()` to prevent the star click from being interpreted as a drag gesture. The existing `handleClickCapture` in ScreenerTable suppresses clicks after drags, which is compatible — star clicks that aren't drags will pass through normally.

---

## 9. Verification Checklist

### Build
- [ ] `npm run build` passes with 0 errors
- [ ] All existing routes still compile (no regressions from rename)
- [ ] No hydration mismatches on homepage

### Auth Flow
- [ ] Click "Sign In" in navbar → modal opens
- [ ] "Continue with Google" → redirects to Google → returns to homepage signed in
- [ ] User avatar/initial appears in navbar
- [ ] "Sign Out" from dropdown → user is logged out, star states clear
- [ ] Refresh page while signed in → session persists (middleware refresh works)

### Watchlist Stars
- [ ] Homepage screener: star icon visible on each row
- [ ] Click star while logged out → login modal opens
- [ ] Click star while logged in → star fills (optimistic), API call succeeds
- [ ] Click filled star → star unfills, item removed from watchlist
- [ ] Stock detail page: star visible next to ticker badge
- [ ] ETF detail page: star visible next to ticker badge

### Watchlist Tab
- [ ] Homepage: "Watchlist" tab appears with star icon
- [ ] Click Watchlist tab while logged out → "Sign in" prompt shown
- [ ] Click Watchlist tab with empty watchlist → top 6 grid with sparklines shown
- [ ] Click star on a top-6 card → added to watchlist, tab refreshes to show table
- [ ] Search in empty state → results appear → clicking "+ Add" adds to watchlist
- [ ] Watchlist with items → ScreenerTable shown with watchlisted securities only
- [ ] Switching back to "All" tab → normal screener data shown

### RLS & Security
- [ ] Users can only see their own watchlist items (test via Supabase SQL editor)
- [ ] Unauthenticated requests to `/api/watchlist` return 401
- [ ] `?watchlist=true` on `/api/securities` returns 401 without auth
- [ ] Profiles table only readable/updatable by the owning user

### Edge Cases
- [ ] Rapid star toggling doesn't desync (optimistic updates revert correctly on error)
- [ ] Page refresh preserves watchlist tab state (or resets to "All" — acceptable)
- [ ] Mobile: sign-in modal is usable, stars have 44px touch targets
- [ ] Multiple browser tabs: signing in on one tab updates the other (onAuthStateChange)
