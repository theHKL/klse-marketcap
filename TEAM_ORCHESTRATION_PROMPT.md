# Agent Team Orchestration: Auth + Watchlist Implementation

> Use this prompt to kick off a 3-agent team that implements the full auth + watchlist feature set.
> Reference: `IMPLEMENTATION_PLAN_AUTH_WATCHLIST.md` for full architecture details.

---

## How to Use

Paste the orchestration prompt below into Claude Code. It will:
1. Install `@supabase/ssr`
2. Create a team with 3 specialized agents
3. Create tasks with proper dependency chains
4. Agents work in pipeline: **infra → auth-ui → watchlist**

---

## Orchestration Prompt

```
Implement the full Auth + Watchlist feature from IMPLEMENTATION_PLAN_AUTH_WATCHLIST.md using a 3-agent team.

IMPORTANT RULES FOR ALL AGENTS:
- JavaScript only — NO TypeScript
- Follow existing code patterns (Tailwind classes, component structure, import style)
- Read IMPLEMENTATION_PLAN_AUTH_WATCHLIST.md for exact code to use
- Read existing files BEFORE modifying them
- Use the accessible colour palette: bark (#6B5A3E), sage-dark (#5C7A57), terracotta (#A6604C), butter for star highlights
- All interactive elements need min-h-[44px] touch targets
- Star SVG path: "M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"

BEFORE spawning any agents, run: npm install @supabase/ssr

Then create a team called "auth-watchlist" and set up these 3 agents with the tasks below.

---

### AGENT 1: "infra" (general-purpose)

Foundation infrastructure. No blockers — starts immediately.

TASK 1A: Rewrite Supabase Clients
Read IMPLEMENTATION_PLAN_AUTH_WATCHLIST.md Step 3 for the exact code.

- REPLACE src/lib/supabase/client.js:
  Use `createBrowserClient` from `@supabase/ssr`. Keep the same export name `getSupabaseClient()`. Singleton pattern with `let client = null`.

- REPLACE src/lib/supabase/server.js:
  - Rename `createServerClient` → `createServiceClient` (same implementation: createClient with SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  - Keep `createAnonServerClient` unchanged
  - ADD new `async function createAuthServerClient()` using `createServerClient` from `@supabase/ssr` with `cookies()` from `next/headers`. MUST use `getAll()`/`setAll()` pattern. `cookies()` MUST be awaited (Next.js 15).

TASK 1B: Create Middleware Files

- CREATE src/lib/supabase/middleware.js:
  Export `async function updateSession(request)`. Creates a Supabase server client using request.cookies.getAll/setAll pattern. Calls `await supabase.auth.getUser()` (NOT getSession). Returns supabaseResponse. See Step 3 in the plan for exact code.

- CREATE src/middleware.js:
  Import updateSession from @/lib/supabase/middleware. Export middleware function that calls updateSession. Matcher: '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'

TASK 1C: Create Auth Callback Route

- CREATE src/app/auth/callback/route.js:
  GET handler. Read `code` from searchParams. Call `await createAuthServerClient()` then `exchangeCodeForSession(code)`. Handle x-forwarded-host for Vercel. Redirect to `next` param or '/'. On error redirect to '/?auth_error=true'. See Step 7 in plan.

TASK 1D: Create SQL Migration

- CREATE supabase/migrations/007_auth_watchlist.sql:
  Two tables: `profiles` (id UUID PK refs auth.users, display_name, avatar_url, created_at) and `watchlist_items` (id UUID PK, user_id refs auth.users, security_id refs securities, added_at, UNIQUE(user_id, security_id)).
  Enable RLS on both. Policies: authenticated users can SELECT/UPDATE own profile, SELECT/INSERT/DELETE own watchlist items (using auth.uid()).
  Indexes: idx_watchlist_user(user_id), idx_watchlist_user_security(user_id, security_id).
  Trigger: `on_auth_user_created` AFTER INSERT on auth.users → insert into profiles with COALESCE(full_name, name, email prefix) and COALESCE(avatar_url, picture). Use SECURITY DEFINER.
  See Step 2 in plan for exact SQL.

TASK 1E: Rename All createServerClient Imports

Mechanical find-and-replace across 25 files. In each file:
- Change `import { createServerClient }` → `import { createServiceClient }`
- Change all USAGES of `createServerClient()` → `createServiceClient()`

THE FILES (every single one — do not miss any):
  src/app/page.js
  src/app/stocks/page.js
  src/app/etfs/page.js
  src/app/funds/page.js
  src/app/sectors/page.js
  src/app/stock/[ticker]/page.js
  src/app/etf/[ticker]/page.js
  src/app/fund/[ticker]/page.js
  src/app/api/securities/route.js
  src/app/api/securities/[ticker]/route.js
  src/app/api/search/route.js
  src/app/api/events/route.js
  src/app/api/last-sync/route.js
  src/app/api/prices/[ticker]/route.js
  src/app/api/news/[ticker]/route.js
  src/app/api/admin/merge-symbol/route.js
  src/app/api/sync/intraday/route.js
  src/app/api/sync/eod/route.js
  src/app/api/sync/profiles/route.js
  src/app/api/sync/financials/route.js
  src/app/api/sync/backfill/route.js
  src/app/api/sync/logos/route.js
  src/app/api/sync/event-returns/route.js
  src/lib/sparkline-data.js
  src/lib/sync-utils.js

Do NOT touch src/lib/supabase/server.js (already handled in Task 1A).
Do NOT touch IMPLEMENTATION_PLAN_AUTH_WATCHLIST.md or TECHNICAL_ARCHITECTURE.md.

---

### AGENT 2: "auth-ui" (general-purpose)

Auth UI components. BLOCKED BY Agent 1 (needs client.js rewrite + AuthProvider imports).

TASK 2A: Create AuthProvider

- CREATE src/components/auth/AuthProvider.js ('use client'):
  React context with { user, loading, signOut }. Import getSupabaseClient from @/lib/supabase/client.
  On mount: call supabase.auth.getSession() for hydration (OK in browser).
  Subscribe to onAuthStateChange for login/logout/token refresh.
  Export `useAuth()` hook and default export `AuthProvider` wrapper.
  See Step 5 in plan for exact code.

TASK 2B: Create LoginModal

- CREATE src/components/auth/LoginModal.js ('use client'):
  Props: { isOpen, onClose }. Overlay with backdrop-blur-sm, z-[60].
  Close on Escape, close on overlay click, prevent body scroll.
  Two buttons: "Continue with Google" (white bg, Google SVG) and "Continue with Apple" (bark bg, Apple SVG).
  Each calls supabase.auth.signInWithOAuth({ provider, options: { redirectTo: `${window.location.origin}/auth/callback` } }).
  Max-w-sm card, rounded-2xl, cream bg. See Step 6 in plan for exact code including SVG icons.

TASK 2C: Modify layout.js

- Read src/app/layout.js first.
- Add import for AuthProvider.
- Wrap the body content (<Navbar/>, <main/>, <Footer/>) with <AuthProvider>.
  Keep all existing metadata and classes unchanged.

TASK 2D: Modify Navbar.js

- Read src/components/layout/Navbar.js first.
- Import { useAuth } from AuthProvider, import { useState }, import LoginModal.
- Add state: const [showLoginModal, setShowLoginModal] = useState(false);
- Get { user, signOut } from useAuth().
- DESKTOP (between search bar and hamburger):
  - If !user: "Sign In" button (rounded-xl, bg-sage-dark, text-white, min-h-[44px])
  - If user: avatar circle (32x32, rounded-full, bg-sage/20) showing first letter of user.email or user.user_metadata.full_name. On click: dropdown with "Sign Out" button.
- MOBILE (at bottom of mobile menu):
  - Same sign-in button or user info + sign out.
- Render <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} /> at bottom.
- Make the dropdown simple: a div with absolute positioning, rounded-xl, shadow-card, with just "Sign Out" option.

---

### AGENT 3: "watchlist" (general-purpose)

All watchlist features. BLOCKED BY Agent 1 (needs createAuthServerClient) AND Agent 2 (needs AuthProvider/useAuth).

TASK 3A: Create Watchlist API Route

- CREATE src/app/api/watchlist/route.js:
  Three handlers: GET, POST, DELETE. All use `await createAuthServerClient()` then `supabase.auth.getUser()`.
  Return 401 if no user. GET returns { items: [{ security_id }] }. POST upserts. DELETE removes.
  See Step 9 in plan for exact code.

TASK 3B: Create useWatchlist Hook

- CREATE src/lib/hooks/useWatchlist.js ('use client'):
  Import useAuth. State: watchlistIds (Set), loading.
  On user change: fetch GET /api/watchlist, build Set of security_ids.
  Export: { watchlistIds, isInWatchlist(id), toggleWatchlist(id), loading }.
  toggleWatchlist does optimistic updates: update Set immediately, POST/DELETE, revert on error.
  If !user, return { needsAuth: true }.
  See Step 10 in plan for exact code.

TASK 3C: Create WatchlistStar Component

- CREATE src/components/ui/WatchlistStar.js ('use client'):
  Props: { securityId, size = 'sm', onAuthRequired }.
  Import useAuth, useWatchlist. sm = h-4 w-4, lg = h-6 w-6.
  Active: fill-butter text-butter. Inactive: fill-none text-bark-lighter hover:text-butter.
  onClick: if !user → onAuthRequired(). Else toggleWatchlist. Brief scale-125 animation.
  e.preventDefault() + e.stopPropagation() to prevent drag-to-scroll conflict.
  See Step 11 in plan for exact code.

TASK 3D: Modify ScreenerRow + ScreenerTable

Read both files FIRST (they have frozen column support with stickyLeft).

Option A (recommended from Section 8 of plan): Put star INSIDE the rank cell.
- In ScreenerRow.js: modify the `renderCell` function's 'rank' case to return a flex container with WatchlistStar + rank number:
  ```
  case 'rank':
    return (
      <div className="flex items-center gap-1">
        <WatchlistStar securityId={security.id} size="sm" onAuthRequired={onAuthRequired} />
        <span>{rank}</span>
      </div>
    );
  ```
- ScreenerRow needs to accept an `onAuthRequired` prop and pass it to WatchlistStar.
- ScreenerTable needs to accept an `onAuthRequired` prop and pass it to each ScreenerRow.
- The rank column width may need to increase from w-12 to w-16 in column-registry.js to fit star + number. Also increase stickyLeft offsets for symbol (48→64) and name (148→164), and FROZEN_COLUMNS_WIDTH from 308 to 324.

TASK 3E: Modify DetailHeader

Read src/components/detail/DetailHeader.js first.
DetailHeader is currently a SERVER component. Don't convert it to client.
Instead, add WatchlistStar as a separate client wrapper:
- In the PARENT pages (src/app/stock/[ticker]/page.js, src/app/etf/[ticker]/page.js, src/app/fund/[ticker]/page.js), add a WatchlistStar NEXT to the DetailHeader, or create a thin client wrapper component.
- Simplest approach: Create src/components/detail/DetailHeaderWithStar.js ('use client') that wraps DetailHeader and adds WatchlistStar. OR modify DetailHeader to accept an optional `actions` slot/prop.
- The star should appear next to the ticker badge in the header. Use size="lg".

TASK 3F: Create Homepage Tabs + Content + Tab + EmptyState + Modify page.js

This is the biggest task. Create 4 new files and modify page.js.

1. CREATE src/components/screener/HomepageTabs.js ('use client'):
   Render SCREENER_TABS as <Link> elements (same style as existing Tabs.js).
   Add a "Watchlist" <button> tab with star icon. Props: { watchlistActive, onWatchlistClick }.
   "All" tab is active when on / AND !watchlistActive.
   See Step 14 in plan for exact code.

2. CREATE src/components/watchlist/WatchlistTab.js ('use client'):
   Three states: not logged in (sign-in prompt), empty watchlist (WatchlistEmptyState), has items (ScreenerTable with watchlist data fetched from /api/securities?watchlist=true).
   Props: { onAuthRequired }.
   See Step 14 in plan for exact code.

3. CREATE src/components/watchlist/WatchlistEmptyState.js ('use client'):
   Fetches top 6 from /api/securities?type=all&sort=market_cap&order=desc&limit=6.
   2x3 grid (sm:grid-cols-2 lg:grid-cols-3) of cards. Each card: Logo, symbol, price, ChangeIndicator, Sparkline, WatchlistStar in top-right.
   Below grid: WatchlistSearch sub-component (search input + dropdown with "+ Add" buttons).
   Uses existing components: Logo, ChangeIndicator, Sparkline, WatchlistStar.
   See Step 15 in plan for exact code.

4. CREATE src/components/screener/HomeContent.js ('use client'):
   Props: { initialData, initialPagination, total }.
   State: watchlistActive, showLoginModal.
   Renders: Breadcrumbs, title/description, HomepageTabs, conditionally MarketOverviewCards + ScreenerTable OR WatchlistTab, LoginModal.
   See Step 14 in plan for exact code.

5. MODIFY src/app/page.js:
   - Keep it as a server component with ISR (revalidate = 60)
   - Import createServiceClient (already renamed by Agent 1)
   - Import HomeContent instead of individual components
   - Server fetches initial "All" data as before
   - Return <HomeContent initialData={...} initialPagination={...} total={...} />
   - Move Breadcrumbs, title, and tabs INSIDE HomeContent

TASK 3G: Modify Securities API for Watchlist Filter

Read src/app/api/securities/route.js first (already has createServiceClient from Agent 1's rename).

Add at the top of the GET handler, after parsing searchParams:
```
const watchlist = searchParams.get('watchlist') === 'true';
```

If watchlist is true:
1. Dynamic import: `const { createAuthServerClient } = await import('@/lib/supabase/server');`
2. Create auth client: `const authSupabase = await createAuthServerClient();`
3. Get user: `const { data: { user } } = await authSupabase.auth.getUser();`
4. Return 401 if !user
5. Fetch watchlist items: security_ids from watchlist_items where user_id = user.id
6. If empty, return empty response
7. Pass watchlistSecurityIds to fetchSecurities as an additional filter: `.in('id', watchlistSecurityIds)`
8. Continue with normal sort/enrich/response flow

See Step 16 in plan.

---

After all agents complete, run `npm run build` to verify 0 errors.
```

---

## Dependency Graph

```
AGENT 1 (infra)
  ├── Task 1A: Rewrite supabase clients
  ├── Task 1B: Create middleware files
  ├── Task 1C: Create auth callback route
  ├── Task 1D: Create SQL migration
  └── Task 1E: Rename 25 imports
         │
         ▼
AGENT 2 (auth-ui) — blocked by Agent 1
  ├── Task 2A: AuthProvider
  ├── Task 2B: LoginModal
  ├── Task 2C: Modify layout.js
  └── Task 2D: Modify Navbar.js
         │
         ▼
AGENT 3 (watchlist) — blocked by Agent 1 + Agent 2
  ├── Task 3A: Watchlist API route
  ├── Task 3B: useWatchlist hook
  ├── Task 3C: WatchlistStar component
  ├── Task 3D: Modify ScreenerRow/Table
  ├── Task 3E: Modify DetailHeader
  ├── Task 3F: Homepage tabs/content/tab/empty-state + page.js
  └── Task 3G: Modify securities API
         │
         ▼
LEADER: npm run build (verify 0 errors)
```

## File Ownership (No Conflicts)

| Agent | Creates | Modifies |
|-------|---------|----------|
| infra | middleware.js (x2), auth/callback/route.js, 007_auth_watchlist.sql | client.js, server.js, 25 import files |
| auth-ui | AuthProvider.js, LoginModal.js | layout.js, Navbar.js |
| watchlist | watchlist/route.js, useWatchlist.js, WatchlistStar.js, HomepageTabs.js, HomeContent.js, WatchlistTab.js, WatchlistEmptyState.js | ScreenerRow.js, ScreenerTable.js, DetailHeader.js (or wrapper), page.js, securities/route.js, column-registry.js |

**No two agents modify the same file** — page.js is only touched by Agent 3 (Agent 1 renames the import; Agent 3 restructures the whole file, doing the rename as part of that). Exception: if Agent 1 renames page.js before Agent 3 restructures it, that's fine — Agent 3 reads the already-renamed file. To be safe, Agent 1 should SKIP src/app/page.js in the rename pass and let Agent 3 handle it entirely.
