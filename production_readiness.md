ASX MarketCap — Production Readiness Report                                                                                                                                               
  Review date: 16 Feb 2026 | Agents: 5 (Security, Performance, UI/UX, Data Integrity, Deploy)
  | Files reviewed: ~55

  ---
  CRITICAL — Must Fix Before Deploy (14 findings)

  C1. No Row-Level Security (RLS) on Any Supabase Table

  Agent: Security | File: supabase/migrations/001_initial_schema.sql

  RLS is not enabled on any table. The anon key (exposed client-side) grants full read/write  
  access to every table. Anyone can insert fake securities, corrupt prices, or delete data via
   the PostgREST API directly.

  Fix: New migration enabling RLS + public read-only policies on all tables:
  ALTER TABLE securities ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "Public read" ON securities FOR SELECT TO anon USING (true);
  -- Repeat for all 10+ tables. Service role bypasses RLS automatically.

  C2. CRON_SECRET Undefined = Auth Bypass on All Sync Endpoints

  Agent: Security + Data | File: src/lib/sync-utils.js:62

  If CRON_SECRET is unset, validateCronSecret() compares against "Bearer undefined". Sending  
  Authorization: Bearer undefined passes auth. All sync endpoints become publicly callable.   

  Fix: Add if (!process.env.CRON_SECRET) return false; at the top of validateCronSecret().    

  C3. Search API PostgREST Filter Injection

  Agent: Security | File: src/app/api/search/route.js:18

  User-supplied q is interpolated directly into .or() filter string. Special characters can   
  manipulate filter logic.

  Fix: const safeQ = q.replace(/[^a-zA-Z0-9 ]/g, '').slice(0, 50);

  C4. JSON-LD XSS via dangerouslySetInnerHTML

  Agent: Security | Files: stock/[ticker]/page.js, etf/[ticker]/page.js, fund/[ticker]/page.js

  Database strings containing </script> can break out of the JSON-LD block. JSON.stringify()  
  does NOT escape </.

  Fix: JSON.stringify(obj).replace(/</g, '\\u003c').replace(/>/g, '\\u003e');

  C5. Securities type CHECK Constraint Missing 'fund'

  Agent: Perf + Data | File: supabase/migrations/001_initial_schema.sql:12

  CHECK (type IN ('stock', 'etf')) but sync inserts type: 'fund'. All fund inserts fail. The  
  entire Managed Funds feature is broken.

  Fix: ALTER TABLE securities DROP CONSTRAINT ...; ADD CHECK (type IN ('stock', 'etf',        
  'fund'));

  C6. robots.txt and sitemap-0.xml Contain localhost:3000

  Agent: Deploy | Files: public/robots.txt, public/sitemap-0.xml

  Google would index localhost URLs. Locally-generated files were committed.

  Fix: Set NEXT_PUBLIC_SITE_URL=https://asxmarketcap.com on Vercel. Add public/robots.txt and 
  public/sitemap*.xml to .gitignore.

  C7. Screener Pages Use force-dynamic — Zero Caching

  Agent: Perf | Files: page.js, stocks/page.js, etfs/page.js, funds/page.js, sectors/page.js  

  Every page visit hits Supabase directly. Will saturate the Free plan connection pool under  
  traffic.

  Fix: Replace dynamic = 'force-dynamic' with export const revalidate = 60.

  C8. EOD Sync Fires ~5,000+ Individual UPDATE Queries

  Agent: Perf + Data | File: src/app/api/sync/eod/route.js:159-215

  calculateChange7dManual() (~2,700 UPDATEs) + updateAthAtlManual() (~2,700 UPDATEs) = ~5,400 
  sequential HTTP requests. Virtually guarantees timeout on the 120s maxDuration.

  Fix: Batch into upsert arrays: .upsert(rows, { onConflict: 'id' }) in chunks of 500.        

  C9. Prices API range=all Hits 1000-Row Supabase Limit

  Agent: Perf + Data | File: src/app/api/prices/[ticker]/route.js:40-47

  No .limit() on the query. Supabase silently truncates at 1000 rows, returning incomplete    
  chart data.

  Fix: Add .limit(5000) or use fetchAllRows().

  C10. Sparkline Query Fragile — No .limit() Safeguard

  Agent: Perf + Data | File: src/lib/sparkline-data.js:10-15

  Currently safe at PAGE_SIZE=50 (~350 rows), but no safeguard against the 1000-row default.  

  Fix: Add .limit(securityIds.length * 12).

  C11. FMP Client Has Zero Retry Logic or Timeout

  Agent: Data | File: src/lib/fmp/client.js:12-20

  No AbortController timeout, no retry on 429/5xx, no backoff. A single FMP hiccup causes     
  permanent data gaps. A hung connection blocks the entire sync job.

  Fix: Add AbortSignal.timeout(15000) + exponential backoff retry (2-3 attempts) for 429/5xx. 

  C12. Price Changes Use Colour Alone — No Arrows (WCAG 1.4.1 Violation)

  Agent: UX | Files: DetailHeader.js:38-44, PeersTable.js:58-65, HistoricalPriceTable.js:47-53

  Three components use green/red colour only for price changes. Violates WCAG and the
  project's own design spec. ChangeIndicator component exists but isn't used.

  Fix: Replace raw formatChange() + colour classes with <ChangeIndicator value={...} />.      

  C13. EOD Sync Uses UTC Date Instead of AEST

  Agent: Data | File: src/app/api/sync/eod/route.js:47

  new Date().toISOString().split('T')[0] computes "today" in UTC. If the job runs late or     
  retries, the date could be wrong for Australian market data.

  Fix: Use getAestNow() from sync-utils.js.

  C14. change_7d Calculation Hits 1000-Row Limit

  Agent: Data | File: src/app/api/sync/eod/route.js:141-144

  .in('id', secIds) with ~2,700 IDs returns at most 1000 rows. Only ~1000 securities get their
   7-day change calculated.

  Fix: Use fetchAllRows() or paginate.

  ---
  HIGH — Should Fix Before Deploy (19 findings)

  #: H1
  Finding: Server client uses service role key for ALL queries (even public reads)
  Agent: Security
  File: supabase/server.js
  Fix: Create separate anon server client for reads
  ────────────────────────────────────────
  #: H2
  Finding: No security headers (CSP, HSTS, X-Frame-Options, nosniff)
  Agent: Security
  File: next.config.mjs
  Fix: Add headers() config
  ────────────────────────────────────────
  #: H3
  Finding: No env variable validation at startup
  Agent: Security
  File: All server files
  Fix: Create src/lib/env.js that throws on missing vars
  ────────────────────────────────────────
  #: H4
  Finding: Backfill route uses ?secret= query param (secret in logs)
  Agent: Security
  File: sync/backfill/route.js:29
  Fix: Switch to validateCronSecret() with Bearer header
  ────────────────────────────────────────
  #: H5
  Finding: nul file + debug_screenshots/ in working directory
  Agent: Deploy
  File: Project root
  Fix: Delete both, add to .gitignore
  ────────────────────────────────────────
  #: H6
  Finding: .gitignore missing entries (nul, debug_screenshots/, public/robots.txt,
    public/sitemap*.xml, .env)
  Agent: Deploy
  File: .gitignore
  Fix: Add missing entries
  ────────────────────────────────────────
  #: H7
  Finding: 32 files modified, ~991 insertions uncommitted
  Agent: Deploy
  File: Working tree
  Fix: Review and commit before deploying
  ────────────────────────────────────────
  #: H8
  Finding: lightweight-charts not lazy-loaded (~45KB in main bundle)
  Agent: Perf
  File: PriceChart.js:4
  Fix: Use next/dynamic with { ssr: false }
  ────────────────────────────────────────
  #: H9
  Finding: No loading.js files anywhere — blank screen during SSR
  Agent: Perf + UX
  File: All routes
  Fix: Add loading.js with Skeleton components
  ────────────────────────────────────────
  #: H10
  Finding: Sectors page: 11 sequential DB queries
  Agent: Perf
  File: sectors/page.js:19-41
  Fix: Single query + JS grouping, or Promise.all()
  ────────────────────────────────────────
  #: H11
  Finding: Detail pages fetch security twice (metadata + page)
  Agent: Perf
  File: stock/etf/fund/[ticker]/page.js
  Fix: Wrap getSecurityByTicker with cache() from React
  ────────────────────────────────────────
  #: H12
  Finding: Cron schedules off by 1 hour during AEDT (misses 10:00-10:55 market open)
  Agent: Perf
  File: vercel.json
  Fix: Widen intraday to */5 23-6 * * 0-5
  ────────────────────────────────────────
  #: H13
  Finding: Missing reactStrictMode: true and poweredByHeader: false
  Agent: Perf
  File: next.config.mjs
  Fix: Add both settings
  ────────────────────────────────────────
  #: H14
  Finding: formatMarketCap(0) and formatVolume(0) return em-dash instead of "$0"/"0"
  Agent: Data
  File: formatters.js:6,41
  Fix: Change !value to value == null
  ────────────────────────────────────────
  #: H15
  Finding: formatChange(NaN) renders "NaN%" in UI
  Agent: Data
  File: formatters.js:30
  Fix: Add if (!Number.isFinite(value)) return '—'
  ────────────────────────────────────────
  #: H16
  Finding: getAestNow() double-parses locale string — unreliable across runtimes
  Agent: Data
  File: sync-utils.js:80-86
  Fix: Use Intl.DateTimeFormat parts extraction
  ────────────────────────────────────────
  #: H17
  Finding: Tabs component uses incorrect ARIA pattern (role="tab" on links)
  Agent: UX
  File: Tabs.js
  Fix: Use aria-current="page" instead
  ────────────────────────────────────────
  #: H18
  Finding: DataFreshness: butter (#F2D98B) on cream (#FFF8EF) = ~1.6:1 contrast
  Agent: UX
  File: DataFreshness.js:27
  Fix: Use darker amber (#9A7B1F)
  ────────────────────────────────────────
  #: H19
  Finding: No .env.example documenting 8 required env vars
  Agent: Deploy
  File: Project root
  Fix: Create .env.example with comments

  ---
  MEDIUM — Fix Soon After Deploy (21 findings)

  #: M1
  Finding: Error responses leak internal Supabase details to clients
  Agent: Security
  File: All API routes
  ────────────────────────────────────────
  #: M2
  Finding: No rate limiting on public API routes
  Agent: Security
  File: /api/search, /api/securities, /api/prices/*
  ────────────────────────────────────────
  #: M3
  Finding: News API acts as open proxy to Google News RSS (no server cache)
  Agent: Security
  File: /api/news/[ticker]/route.js
  ────────────────────────────────────────
  #: M4
  Finding: CompanyDescription renders unvalidated external URL as link
  Agent: Security
  File: CompanyDescription.js:45
  ────────────────────────────────────────
  #: M5
  Finding: Securities filter allows arbitrary sector values
  Agent: Security
  File: /api/securities/route.js:36
  ────────────────────────────────────────
  #: M6
  Finding: fmpFetch has no timeout (hangs stall sync jobs)
  Agent: Perf
  File: fmp/client.js:17
  ────────────────────────────────────────
  #: M7
  Finding: Sitemap only discovers ~500 of ~2,700 URLs
  Agent: Perf
  File: next-sitemap.config.js
  ────────────────────────────────────────
  #: M8
  Finding: Peers sync delete+insert not atomic (brief data gap window)
  Agent: Perf
  File: sync/financials/route.js:252
  ────────────────────────────────────────
  #: M9
  Finding: Prices endpoint has no Cache-Control headers
  Agent: Perf
  File: /api/prices/[ticker]/route.js
  ────────────────────────────────────────
  #: M10
  Finding: Financial transforms don't validate date field (null → insert failure)
  Agent: Data
  File: transforms.js:72-121
  ────────────────────────────────────────
  #: M11
  Finding: transformProfile doesn't validate employees parse (parseInt("N/A") = NaN)
  Agent: Data
  File: transforms.js:43
  ────────────────────────────────────────
  #: M12
  Finding: Screener rank misleading when sorted by non-market-cap column
  Agent: Data
  File: ScreenerTable.js:129
  ────────────────────────────────────────
  #: M13
  Finding: Profit margin calc can produce Infinity when revenue = 0
  Agent: Data
  File: FinancialDataTable.js:39
  ────────────────────────────────────────
  #: M14
  Finding: isPreferenceShare regex false positives (e.g., A2M)
  Agent: Data
  File: transforms.js:28
  ────────────────────────────────────────
  #: M15
  Finding: Historical price table shows intraday change, not close-to-close
  Agent: Data
  File: HistoricalPriceTable.js:28
  ────────────────────────────────────────
  #: M16
  Finding: Screener table too aggressively truncated on mobile (no company name)
  Agent: UX
  File: ScreenerTable.js:62
  ────────────────────────────────────────
  #: M17
  Finding: PriceChart: no empty state for zero data
  Agent: UX
  File: PriceChart.js:185
  ────────────────────────────────────────
  #: M18
  Finding: Footer: Privacy/Terms are dead <span> not links
  Agent: UX
  File: Footer.js:28-33
  ────────────────────────────────────────
  #: M19
  Finding: Missing skip-to-content link for keyboard users
  Agent: UX
  File: layout.js
  ────────────────────────────────────────
  #: M20
  Finding: Mobile nav: no focus trap, no body scroll lock
  Agent: UX
  File: Navbar.js:70
  ────────────────────────────────────────
  #: M21
  Finding: Chart time range buttons too small for touch (24px, needs 44px)
  Agent: UX
  File: PriceChart.js:239

  ---
  LOW — Nice to Have (17 findings)

  #: L1
  Finding: .gitignore missing bare .env
  Agent: Security
  ────────────────────────────────────────
  #: L2
  Finding: Crons don't specify region (should be syd1)
  Agent: Security
  ────────────────────────────────────────
  #: L3
  Finding: No CORS config (secure by default, but noted)
  Agent: Security
  ────────────────────────────────────────
  #: L4
  Finding: sync_log table grows unbounded (no cleanup)
  Agent: Perf
  ────────────────────────────────────────
  #: L5
  Finding: generateStaticParams only pre-renders top 200 (rest ISR'd)
  Agent: Perf
  ────────────────────────────────────────
  #: L6
  Finding: No route-specific error.js boundaries
  Agent: Perf
  ────────────────────────────────────────
  #: L7
  Finding: Render-blocking Google Fonts @import (use next/font)
  Agent: UX
  ────────────────────────────────────────
  #: L8
  Finding: Sparkline has no sr-only trend text
  Agent: UX
  ────────────────────────────────────────
  #: L9
  Finding: CEO mapped to schema:founder in structured data
  Agent: UX
  ────────────────────────────────────────
  #: L10
  Finding: Generic 404 wrong for ETF/fund not-found
  Agent: UX
  ────────────────────────────────────────
  #: L11
  Finding: KeyStatsBar scroll has no visual affordance on mobile
  Agent: UX
  ────────────────────────────────────────
  #: L12
  Finding: CRLF line ending warnings (add .gitattributes)
  Agent: Deploy
  ────────────────────────────────────────
  #: L13
  Finding: fmpFetch could leak API key if callers log URL object
  Agent: Data
  ────────────────────────────────────────
  #: L14
  Finding: formatDate renders "Invalid Date" on bad input
  Agent: Data
  ────────────────────────────────────────
  #: L15
  Finding: Duplicate parsePercentString in two files
  Agent: Data
  ────────────────────────────────────────
  #: L16
  Finding: No bank financial disclaimer on FinancialDataTable
  Agent: Data
  ────────────────────────────────────────
  #: L17
  Finding: Math.max(...highs) in backfill could stack-overflow for very long arrays
  Agent: Data

  ---
  Summary

  ┌──────────┬───────┐
  │ Severity │ Count │
  ├──────────┼───────┤
  │ CRITICAL │ 14    │
  ├──────────┼───────┤
  │ HIGH     │ 19    │
  ├──────────┼───────┤
  │ MEDIUM   │ 21    │
  ├──────────┼───────┤
  │ LOW      │ 17    │
  ├──────────┼───────┤
  │ Total    │ 71    │
  └──────────┴───────┘

  Top 10 Fix Priority (recommended order)

  Priority: 1
  Finding: C1 — Enable RLS on all tables
  Impact: Database wide open to writes
  ────────────────────────────────────────
  Priority: 2
  Finding: C2 — Guard CRON_SECRET undefined
  Impact: All sync endpoints publicly callable
  ────────────────────────────────────────
  Priority: 3
  Finding: C5 — Add 'fund' to type CHECK
  Impact: Entire Managed Funds feature broken
  ────────────────────────────────────────
  Priority: 4
  Finding: C6 — Fix sitemap/robots.txt localhost
  Impact: SEO completely broken
  ────────────────────────────────────────
  Priority: 5
  Finding: C7 — Replace force-dynamic with ISR
  Impact: Supabase Free will collapse under load
  ────────────────────────────────────────
  Priority: 6
  Finding: C8 — Batch EOD sync updates
  Impact: Sync will timeout every run
  ────────────────────────────────────────
  Priority: 7
  Finding: C4 — Escape JSON-LD output
  Impact: XSS vector (quick 1-line fix)
  ────────────────────────────────────────
  Priority: 8
  Finding: C3 — Sanitize search input
  Impact: Filter injection
  ────────────────────────────────────────
  Priority: 9
  Finding: H2 — Add security headers
  Impact: Standard production hardening
  ────────────────────────────────────────
  Priority: 10
  Finding: C12 — Use ChangeIndicator everywhere
  Impact: WCAG compliance

  Want me to start fixing these? I'd suggest tackling them in the priority order above. 