# ASX MarketCap — Production Readiness Review

**Review date:** 16 Feb 2026 | **Agents:** 5 (Security, Performance, UI/UX, Data Integrity, Deploy) | **Files reviewed:** ~55

---

## CRITICAL — Must Fix Before Deploy (14 findings)

### C1. No Row-Level Security (RLS) on Any Supabase Table

**Agent:** Security | **File:** `supabase/migrations/001_initial_schema.sql`

RLS is not enabled on any table. The anon key (exposed client-side) grants full read/write access to every table. Anyone can insert fake securities, corrupt prices, or delete data via the PostgREST API directly.

**Fix:** New migration enabling RLS + public read-only policies on all tables:

```sql
ALTER TABLE securities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read" ON securities FOR SELECT TO anon USING (true);
-- Repeat for all 10+ tables. Service role bypasses RLS automatically.
```

### C2. `CRON_SECRET` Undefined = Auth Bypass on All Sync Endpoints

**Agent:** Security + Data | **File:** `src/lib/sync-utils.js:62`

If `CRON_SECRET` is unset, `validateCronSecret()` compares against `"Bearer undefined"`. Sending `Authorization: Bearer undefined` passes auth. All sync endpoints become publicly callable.

**Fix:** Add `if (!process.env.CRON_SECRET) return false;` at the top of `validateCronSecret()`.

### C3. Search API PostgREST Filter Injection

**Agent:** Security | **File:** `src/app/api/search/route.js:18`

User-supplied `q` is interpolated directly into `.or()` filter string. Special characters can manipulate filter logic.

**Fix:** `const safeQ = q.replace(/[^a-zA-Z0-9 ]/g, '').slice(0, 50);`

### C4. JSON-LD XSS via `dangerouslySetInnerHTML`

**Agent:** Security | **Files:** `stock/[ticker]/page.js`, `etf/[ticker]/page.js`, `fund/[ticker]/page.js`

Database strings containing `</script>` can break out of the JSON-LD block. `JSON.stringify()` does NOT escape `</`.

**Fix:** `JSON.stringify(obj).replace(/</g, '\\u003c').replace(/>/g, '\\u003e');`

### C5. Securities `type` CHECK Constraint Missing `'fund'`

**Agent:** Perf + Data | **File:** `supabase/migrations/001_initial_schema.sql:12`

`CHECK (type IN ('stock', 'etf'))` but sync inserts `type: 'fund'`. All fund inserts fail. The entire Managed Funds feature is broken.

**Fix:** `ALTER TABLE securities DROP CONSTRAINT ...; ADD CHECK (type IN ('stock', 'etf', 'fund'));`

### C6. `robots.txt` and `sitemap-0.xml` Contain `localhost:3000`

**Agent:** Deploy | **Files:** `public/robots.txt`, `public/sitemap-0.xml`

Google would index localhost URLs. Locally-generated files were committed.

**Fix:** Set `NEXT_PUBLIC_SITE_URL=https://asxmarketcap.com` on Vercel. Add `public/robots.txt` and `public/sitemap*.xml` to `.gitignore`.

### C7. Screener Pages Use `force-dynamic` — Zero Caching

**Agent:** Perf | **Files:** `page.js`, `stocks/page.js`, `etfs/page.js`, `funds/page.js`, `sectors/page.js`

Every page visit hits Supabase directly. Will saturate the Free plan connection pool under traffic.

**Fix:** Replace `dynamic = 'force-dynamic'` with `export const revalidate = 60`.

### C8. EOD Sync Fires ~5,000+ Individual UPDATE Queries

**Agent:** Perf + Data | **File:** `src/app/api/sync/eod/route.js:159-215`

`calculateChange7dManual()` (~2,700 UPDATEs) + `updateAthAtlManual()` (~2,700 UPDATEs) = ~5,400 sequential HTTP requests. Virtually guarantees timeout on the 120s `maxDuration`.

**Fix:** Batch into upsert arrays: `.upsert(rows, { onConflict: 'id' })` in chunks of 500.

### C9. Prices API `range=all` Hits 1000-Row Supabase Limit

**Agent:** Perf + Data | **File:** `src/app/api/prices/[ticker]/route.js:40-47`

No `.limit()` on the query. Supabase silently truncates at 1000 rows, returning incomplete chart data.

**Fix:** Add `.limit(5000)` or use `fetchAllRows()`.

### C10. Sparkline Query Fragile — No `.limit()` Safeguard

**Agent:** Perf + Data | **File:** `src/lib/sparkline-data.js:10-15`

Currently safe at PAGE_SIZE=50 (~350 rows), but no safeguard against the 1000-row default.

**Fix:** Add `.limit(securityIds.length * 12)`.

### C11. FMP Client Has Zero Retry Logic or Timeout

**Agent:** Data | **File:** `src/lib/fmp/client.js:12-20`

No `AbortController` timeout, no retry on 429/5xx, no backoff. A single FMP hiccup causes permanent data gaps. A hung connection blocks the entire sync job.

**Fix:** Add `AbortSignal.timeout(15000)` + exponential backoff retry (2-3 attempts) for 429/5xx.

### C12. Price Changes Use Colour Alone — No Arrows (WCAG 1.4.1 Violation)

**Agent:** UX | **Files:** `DetailHeader.js:38-44`, `PeersTable.js:58-65`, `HistoricalPriceTable.js:47-53`

Three components use green/red colour only for price changes. Violates WCAG and the project's own design spec. `ChangeIndicator` component exists but isn't used.

**Fix:** Replace raw `formatChange()` + colour classes with `<ChangeIndicator value={...} />`.

### C13. EOD Sync Uses UTC Date Instead of AEST

**Agent:** Data | **File:** `src/app/api/sync/eod/route.js:47`

`new Date().toISOString().split('T')[0]` computes "today" in UTC. If the job runs late or retries, the date could be wrong for Australian market data.

**Fix:** Use `getAestNow()` from sync-utils.js.

### C14. `change_7d` Calculation Hits 1000-Row Limit

**Agent:** Data | **File:** `src/app/api/sync/eod/route.js:141-144`

`.in('id', secIds)` with ~2,700 IDs returns at most 1000 rows. Only ~1000 securities get their 7-day change calculated.

**Fix:** Use `fetchAllRows()` or paginate.

---

## HIGH — Should Fix Before Deploy (19 findings)

### H1. Server Client Uses Service Role Key for ALL Queries

**Agent:** Security | **File:** `src/lib/supabase/server.js`

Every server-side operation (including public reads) uses `SUPABASE_SERVICE_ROLE_KEY`, bypassing RLS entirely. Even after adding RLS (C1), server-side pages would bypass it.

**Fix:** Create separate `createAnonServerClient()` for public read-only operations.

### H2. No Security Headers (CSP, HSTS, X-Frame-Options, nosniff)

**Agent:** Security | **Files:** `next.config.mjs`, `vercel.json`

No security headers defined anywhere. Site can be iframed (clickjacking), no XSS mitigation layer, no HSTS.

**Fix:** Add `headers()` config in `next.config.mjs` with CSP, X-Frame-Options: DENY, HSTS, nosniff, Referrer-Policy, Permissions-Policy.

### H3. No Environment Variable Validation at Startup

**Agent:** Security | **Files:** All server-side files

Missing env vars silently cause undefined behavior. `CRON_SECRET` unset means auth bypass (see C2). `FMP_API_KEY` unset means requests with `apikey=undefined`.

**Fix:** Create `src/lib/env.js` that throws on missing required vars and import it early.

### H4. Backfill Route Uses `?secret=` Query Param (Secret in Logs)

**Agent:** Security | **File:** `src/app/api/sync/backfill/route.js:29-33`

Uses query param auth instead of Bearer header. Secrets appear in access logs, function logs, and CDN edge logs.

**Fix:** Refactor to use `validateCronSecret()` with `Authorization: Bearer` header.

### H5. `nul` File + `debug_screenshots/` in Working Directory

**Agent:** Deploy | **File:** Project root

Windows artifact and debug files risk being committed via `git add .`.

**Fix:** Delete both, add to `.gitignore`.

### H6. `.gitignore` Missing Critical Entries

**Agent:** Deploy | **File:** `.gitignore`

Missing: `nul`, `debug_screenshots/`, `public/robots.txt`, `public/sitemap*.xml`, bare `.env`.

**Fix:** Add all missing entries.

### H7. Large Uncommitted Diff (32 files, ~991 insertions)

**Agent:** Deploy | **File:** Working tree

Risk of deploying stale code or losing work.

**Fix:** Review and commit before deploying.

### H8. `lightweight-charts` Not Lazy-Loaded (~45KB in Main Bundle)

**Agent:** Perf | **File:** `src/components/detail/PriceChart.js:4`

Directly imported, ships in every detail page bundle even if chart is below the fold.

**Fix:** Use `next/dynamic` with `{ ssr: false }` in page files.

### H9. No `loading.js` Files Anywhere — Blank Screen During SSR

**Agent:** Perf + UX | **Files:** All route segments

Users see blank white screen during data fetching. Detail pages make 7+ parallel DB queries.

**Fix:** Add `loading.js` with Skeleton components to root, stock, etf, fund routes.

### H10. Sectors Page: 11 Sequential DB Queries

**Agent:** Perf | **File:** `src/app/sectors/page.js:19-41`

Serial `for...of` loop over 11 GICS sectors. With `force-dynamic`, every page load executes 11 sequential queries.

**Fix:** Single query + JS grouping, or `Promise.all()`.

### H11. Detail Pages Fetch Security Twice (metadata + page)

**Agent:** Perf | **Files:** `stock/[ticker]/page.js`, `etf/[ticker]/page.js`, `fund/[ticker]/page.js`

`generateMetadata()` and page component both call `getSecurityByTicker()`. Supabase client queries aren't deduplicated.

**Fix:** Wrap with `import { cache } from 'react';`

### H12. Cron Schedules Off by 1 Hour During AEDT

**Agent:** Perf | **File:** `vercel.json`

Intraday sync starts at 11:00 AM during AEDT (misses 10:00-10:55 market open). EOD runs 90 min after close instead of 30.

**Fix:** Widen intraday range to `*/5 23-6 * * 0-5` to cover both AEST and AEDT.

### H13. Missing `reactStrictMode` and `poweredByHeader: false`

**Agent:** Perf | **File:** `next.config.mjs`

No strict mode to catch bugs. `X-Powered-By: Next.js` header leaks framework info.

**Fix:** Add both settings to next.config.mjs.

### H14. `formatMarketCap(0)` and `formatVolume(0)` Return Em-Dash

**Agent:** Data | **File:** `src/lib/formatters.js:6,41`

`if (!value)` is falsy for 0. A market cap or volume of 0 shows as missing data.

**Fix:** Change to `if (value == null)`.

### H15. `formatChange(NaN)` Renders "NaN%" in UI

**Agent:** Data | **File:** `src/lib/formatters.js:30`

NaN passes the null check. `NaN.toFixed(2)` returns `"NaN"`.

**Fix:** Add `if (!Number.isFinite(value)) return '\u2014';`

### H16. `getAestNow()` Double-Parses Locale String — Unreliable

**Agent:** Data | **File:** `src/lib/sync-utils.js:80-86`

`toLocaleString('en-AU')` produces `"16/02/2026, 4:30:00 pm"` which many JS engines cannot parse back. May return Invalid Date on non-V8 runtimes.

**Fix:** Use `Intl.DateTimeFormat` with parts extraction or manual UTC offset.

### H17. Tabs Component Uses Incorrect ARIA Pattern

**Agent:** UX | **File:** `src/components/ui/Tabs.js`

Uses `role="tablist"` + `role="tab"` on `<Link>` elements (page navigation, not in-page panels). WCAG violation.

**Fix:** Remove tab roles, use `aria-current="page"` on active link.

### H18. DataFreshness: Butter on Cream Fails Contrast (~1.6:1)

**Agent:** UX | **File:** `src/components/ui/DataFreshness.js:27`

`text-butter` (#F2D98B) on `bg-cream` (#FFF8EF) = ~1.6:1. WCAG AA requires 4.5:1.

**Fix:** Use darker amber (#9A7B1F) or `text-bark-light` with a warning icon.

### H19. No `.env.example` Documenting Required Environment Variables

**Agent:** Deploy | **File:** Project root

8 env vars required but not documented in a discoverable way. Prevents deploy failures.

**Fix:** Create `.env.example` listing all required vars with comments:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
FMP_API_KEY=
CRON_SECRET=
BACKFILL_SECRET=
LOGO_DEV_TOKEN=           # optional
NEXT_PUBLIC_SITE_URL=     # e.g. https://asxmarketcap.com
```

---

## MEDIUM — Fix Soon After Deploy (21 findings)

### M1. Error Responses Leak Internal Supabase Details

**Agent:** Security | **Files:** All API routes

Error responses include `error.message` which may contain table names, constraint names, or stack traces.

**Fix:** Return generic error messages to clients. Log details server-side only.

### M2. No Rate Limiting on Public API Routes

**Agent:** Security | **Files:** `/api/search`, `/api/securities`, `/api/prices/*`, `/api/news/*`

All public-facing routes have zero rate limiting. Can exhaust Vercel function limits or be used for data scraping.

**Fix:** Add rate limiting via Vercel Edge Middleware or in-memory limiter.

### M3. News API Acts as Open Proxy to Google News RSS

**Agent:** Security | **File:** `src/app/api/news/[ticker]/route.js`

Server-side proxy to Google News with no caching. Could get Vercel IPs blocked.

**Fix:** Add server-side caching with TTL. Consider rate limit per IP.

### M4. CompanyDescription Renders Unvalidated External URL as Link

**Agent:** Security | **File:** `src/components/detail/CompanyDescription.js:45`

`security.website` rendered as `<a href>`. `data:` URIs would pass the `new URL()` check.

**Fix:** Validate URL starts with `https://` or `http://` before rendering.

### M5. Securities Filter Allows Arbitrary Sector Values

**Agent:** Security | **File:** `src/app/api/securities/route.js:36`

No validation against allowed sectors. API can be probed with arbitrary strings.

**Fix:** Validate against `GICS_SECTORS` from constants.js.

### M6. `fmpFetch` Has No Timeout

**Agent:** Perf | **File:** `src/lib/fmp/client.js:17`

Network hangs stall sync jobs indefinitely until Vercel kills the function.

**Fix:** Add `AbortController` with 15-second timeout.

### M7. Sitemap Only Discovers ~500 of ~2,700 URLs

**Agent:** Perf | **File:** `next-sitemap.config.js`

`generateStaticParams()` limited to 200 stocks + 200 ETFs + 100 funds. Remaining ~2,200 securities absent from sitemap.

**Fix:** Add `additionalPaths` in sitemap config to query Supabase for all active securities.

### M8. Peers Sync Delete+Insert Not Atomic

**Agent:** Perf | **File:** `src/app/api/sync/financials/route.js:252`

Brief window between delete and insert where users see no peers. Same for ETF holdings and sector weights.

**Fix:** Wrap in transaction or switch to upsert-based approach.

### M9. Prices Endpoint Has No Cache-Control Headers

**Agent:** Perf | **File:** `src/app/api/prices/[ticker]/route.js`

Every chart range change triggers fresh Supabase query. Rapid clicking fires 6+ queries.

**Fix:** Add `Cache-Control: s-maxage=300, stale-while-revalidate=60`.

### M10. Financial Transforms Don't Validate `date` Field

**Agent:** Data | **File:** `src/lib/fmp/transforms.js:72-121`

Null `date` would insert null into a NOT NULL column, causing upsert failure.

**Fix:** Add `if (!data.date) return null;` at top of each transform.

### M11. `transformProfile` Doesn't Validate `employees` Parse

**Agent:** Data | **File:** `src/lib/fmp/transforms.js:43`

`parseInt("N/A")` returns NaN, which gets stored in the database.

**Fix:** Add `isNaN` check: `const n = parseInt(...); return isNaN(n) ? null : n`.

### M12. Screener Rank Misleading When Sorted by Non-Market-Cap

**Agent:** Data | **File:** `src/components/screener/ScreenerTable.js:129`

Rank shows sequential position regardless of sort column. Rank #1 sorted by price is not rank #1 by market cap.

**Fix:** Hide rank column or show "—" when not sorting by market_cap.

### M13. Profit Margin Calc Can Produce `Infinity`

**Agent:** Data | **File:** `src/components/detail/FinancialDataTable.js:39`

Division by zero when `revenue = 0` produces `Infinity%` in UI.

**Fix:** Add explicit `revenue !== 0` check.

### M14. `isPreferenceShare` Regex False Positives

**Agent:** Data | **File:** `src/lib/fmp/transforms.js:28`

`/\d[A-Z]+$/` incorrectly matches legitimate tickers like A2M (a2 Milk Company).

**Fix:** Use more specific regex for ASX preference share suffixes.

### M15. Historical Price Table Shows Intraday Change, Not Close-to-Close

**Agent:** Data | **File:** `src/components/detail/HistoricalPriceTable.js:28`

Change % calculated as `(close - open) / open * 100`. Most finance sites show close-to-close.

**Fix:** Use `change_percent` from daily_prices, or document intentional intraday display.

### M16. Screener Table Too Aggressively Truncated on Mobile

**Agent:** UX | **File:** `src/components/screener/ScreenerTable.js:62`

Name column hidden below `md`. Users see "BHP" but not "BHP Group Ltd" on mobile.

**Fix:** Show truncated name as subtitle under symbol in the Symbol cell.

### M17. PriceChart: No Empty State for Zero Data

**Agent:** UX | **File:** `src/components/detail/PriceChart.js:185`

Empty data shows blank box with no message.

**Fix:** Render "No data available" when data is empty.

### M18. Footer: Privacy/Terms Are Dead Spans

**Agent:** UX | **File:** `src/components/layout/Footer.js:28-33`

"Privacy" and "Terms" are `<span>` elements, not links. Look like non-functional dead text.

**Fix:** Create real pages or remove placeholders.

### M19. Missing Skip-to-Content Link

**Agent:** UX | **File:** `src/app/layout.js`

Keyboard users must tab through all navbar links before reaching content.

**Fix:** Add `<a href="#main-content" className="sr-only focus:not-sr-only">Skip to content</a>`.

### M20. Mobile Nav: No Focus Trap, No Body Scroll Lock

**Agent:** UX | **File:** `src/components/layout/Navbar.js:70`

Mobile menu opens but focus can tab behind overlay. Body still scrolls.

**Fix:** Add `inert` to `<main>` when open, add `overflow-hidden` to body.

### M21. Chart Time Range Buttons Too Small for Touch

**Agent:** UX | **File:** `src/components/detail/PriceChart.js:239`

Buttons are ~24px tall. WCAG touch target minimum is 44px.

**Fix:** Add `min-h-[44px]` to time range and metric tab buttons.

---

## LOW — Nice to Have (17 findings)

### L1. `.gitignore` Missing Bare `.env`

**Agent:** Security | **File:** `.gitignore`

Only `.env*.local` is covered. A bare `.env` file would not be ignored.

### L2. Crons Don't Specify Region

**Agent:** Security | **File:** `vercel.json`

Should run in `syd1` to minimize latency to Supabase.

### L3. No CORS Config on API Routes

**Agent:** Security | **Files:** All `/api/` routes

Secure by default (cross-origin blocked). No action needed unless cross-origin access required.

### L4. `sync_log` Table Grows Unbounded

**Agent:** Perf | **File:** Schema

No cleanup of old entries. Thousands of rows per month.

**Fix:** Add periodic cleanup (delete logs older than 30 days).

### L5. `generateStaticParams` Only Pre-Renders Top 200

**Agent:** Perf | **Files:** `stock/[ticker]/page.js`, `etf/[ticker]/page.js`

Remaining ~2,500 pages ISR'd on first request. Acceptable for now.

### L6. No Route-Specific `error.js` Boundaries

**Agent:** Perf | **Files:** `stock/[ticker]/`, `etf/[ticker]/`, `fund/[ticker]/`

Only root `error.js` exists. Generic error message for all routes.

### L7. Render-Blocking Google Fonts `@import`

**Agent:** UX | **File:** `src/styles/globals.css:5`

Fonts loaded via `@import` in CSS (render-blocking). Should use `next/font/google`.

### L8. Sparkline Has No sr-only Trend Text

**Agent:** UX | **File:** `src/components/ui/Sparkline.js`

`aria-hidden="true"` (correct), but no accessible alternative for trend direction.

### L9. CEO Mapped to `schema:founder` in Structured Data

**Agent:** UX | **File:** `src/lib/structured-data.js:21`

CEO is not the same as founder. Should use `employee` with `jobTitle: "CEO"`.

### L10. Generic 404 Wrong for ETF/Fund Not-Found

**Agent:** UX | **File:** `not-found.js`

Message says "stock" but could be an ETF or fund.

**Fix:** Make message generic ("security") or add route-specific pages.

### L11. KeyStatsBar Scroll Has No Visual Affordance on Mobile

**Agent:** UX | **File:** `src/components/detail/KeyStatsBar.js:25`

`scrollbar-none` hides scrollbar. No visual cue that more cards exist off-screen.

### L12. CRLF Line Ending Warnings

**Agent:** Deploy | **File:** Git config

All modified files show `LF will be replaced by CRLF`.

**Fix:** Add `.gitattributes` with `* text=auto eol=lf`.

### L13. `fmpFetch` Could Leak API Key If Callers Log URL

**Agent:** Data | **File:** `src/lib/fmp/client.js`

Current error only logs `pathname` (safe), but callers could log the full URL.

### L14. `formatDate` Renders "Invalid Date" on Bad Input

**Agent:** Data | **File:** `src/lib/formatters.js:48`

No try-catch or validation. Bad strings produce "Invalid Date" in UI.

### L15. Duplicate `parsePercentString` in Two Files

**Agent:** Data | **Files:** `transforms.js`, `sync/financials/route.js`

Same function defined in two places.

**Fix:** Export from transforms.js and import in financials route.

### L16. No Bank Financial Disclaimer on FinancialDataTable

**Agent:** Data | **File:** `src/components/detail/FinancialDataTable.js`

PRD requires disclaimer tooltip for bank financial data. Only present in CompanyDescription, not on the financials table itself.

### L17. `Math.max(...highs)` Could Stack-Overflow for Very Long Arrays

**Agent:** Data | **File:** `src/app/api/sync/backfill/route.js:153`

Spreads all elements as function arguments. Safe for ~5K entries but fragile.

**Fix:** Use `highs.reduce((max, h) => Math.max(max, h), -Infinity)`.

---

## Top 10 Fix Priority

| Priority | Finding | Impact |
|----------|---------|--------|
| 1 | **C1** — Enable RLS on all tables | Database wide open to writes |
| 2 | **C2** — Guard CRON_SECRET undefined | All sync endpoints publicly callable |
| 3 | **C5** — Add `'fund'` to type CHECK | Entire Managed Funds feature broken |
| 4 | **C6** — Fix sitemap/robots.txt localhost | SEO completely broken |
| 5 | **C7** — Replace `force-dynamic` with ISR | Supabase Free will collapse under load |
| 6 | **C8** — Batch EOD sync updates | Sync will timeout every run |
| 7 | **C4** — Escape JSON-LD output | XSS vector (quick 1-line fix) |
| 8 | **C3** — Sanitize search input | Filter injection |
| 9 | **H2** — Add security headers | Standard production hardening |
| 10 | **C12** — Use ChangeIndicator everywhere | WCAG compliance |
