# ASX MarketCap - Technical Architecture

**Version:** 1.0
**Date:** 2026-02-12
**Author:** Technical Architect
**Status:** Draft - For Review

---

## Table of Contents

1. [Project Structure](#1-project-structure)
2. [Rendering Strategy](#2-rendering-strategy)
3. [Database Schema (Refined)](#3-database-schema-refined)
4. [Data Sync System](#4-data-sync-system)
5. [API Routes](#5-api-routes)
6. [Component Architecture](#6-component-architecture)
7. [npm Dependencies](#7-npm-dependencies)
8. [Environment Variables](#8-environment-variables)
9. [Key Implementation Notes](#9-key-implementation-notes)

---

## 1. Project Structure

Next.js 14 App Router with JavaScript only. Flat, feature-oriented layout inside `src/`.

```
asx-marketcap/
├── public/
│   ├── fonts/                      # Self-hosted Nunito + JetBrains Mono woff2 files
│   ├── images/
│   │   └── placeholder-logo.svg    # Fallback company logo
│   ├── robots.txt
│   └── sitemap.xml                 # Auto-generated at build (see next.sitemap.js)
├── src/
│   ├── app/
│   │   ├── layout.js               # Root layout: fonts, metadata, nav, footer
│   │   ├── page.js                 # Homepage — stock screener (SSR)
│   │   ├── etfs/
│   │   │   └── page.js             # ETF screener (SSR)
│   │   ├── stock/
│   │   │   └── [ticker]/
│   │   │       └── page.js         # Individual stock detail (ISR)
│   │   ├── etf/
│   │   │   └── [ticker]/
│   │   │       └── page.js         # Individual ETF detail (ISR)
│   │   ├── sectors/
│   │   │   └── page.js             # Sector overview (SSR)
│   │   ├── about/
│   │   │   └── page.js             # Static about page
│   │   ├── api/
│   │   │   ├── sync/
│   │   │   │   ├── intraday/
│   │   │   │   │   └── route.js    # Cron: intraday price sync
│   │   │   │   ├── eod/
│   │   │   │   │   └── route.js    # Cron: end-of-day sync
│   │   │   │   ├── profiles/
│   │   │   │   │   └── route.js    # Cron: daily profile sync
│   │   │   │   └── financials/
│   │   │   │       └── route.js    # Cron: weekly financials sync
│   │   │   ├── securities/
│   │   │   │   └── route.js        # GET: paginated screener data
│   │   │   ├── securities/
│   │   │   │   └── [ticker]/
│   │   │   │       └── route.js    # GET: single security detail
│   │   │   ├── prices/
│   │   │   │   └── [ticker]/
│   │   │   │       └── route.js    # GET: historical prices for charts
│   │   │   └── search/
│   │   │       └── route.js        # GET: typeahead search
│   │   ├── not-found.js            # Custom 404
│   │   └── error.js                # Global error boundary
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Navbar.js
│   │   │   ├── Footer.js
│   │   │   └── Breadcrumbs.js
│   │   ├── screener/
│   │   │   ├── ScreenerTable.js    # Main data table (client component)
│   │   │   ├── ScreenerRow.js
│   │   │   ├── SectorFilter.js
│   │   │   ├── SearchBar.js
│   │   │   ├── SortHeader.js
│   │   │   └── Pagination.js
│   │   ├── detail/
│   │   │   ├── DetailHeader.js
│   │   │   ├── KeyStatsBar.js
│   │   │   ├── PriceChart.js       # Client component (Lightweight Charts)
│   │   │   ├── FinancialCharts.js  # Client component (Lightweight Charts)
│   │   │   ├── CompanyDescription.js
│   │   │   ├── PeersTable.js
│   │   │   ├── PriceRangeBar.js
│   │   │   ├── FinancialDataTable.js
│   │   │   ├── HistoricalPriceTable.js
│   │   │   └── etf/
│   │   │       ├── EtfInfoCard.js
│   │   │       ├── HoldingsTable.js
│   │   │       └── SectorBreakdownChart.js
│   │   └── ui/
│   │       ├── Badge.js
│   │       ├── Card.js
│   │       ├── ChangeIndicator.js  # Green/red percentage display
│   │       ├── MarketCapLabel.js   # Formats $1.2B, $450M etc
│   │       ├── Logo.js             # Image with fallback
│   │       ├── Spinner.js
│   │       ├── Tabs.js
│   │       └── DataFreshness.js    # "Last updated X min ago"
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.js           # Browser Supabase client (anon key)
│   │   │   └── server.js           # Server Supabase client (service role key)
│   │   ├── fmp/
│   │   │   ├── client.js           # FMP API wrapper (server-only)
│   │   │   ├── endpoints.js        # Endpoint URL builders
│   │   │   └── transforms.js       # Transform FMP responses → DB shape
│   │   ├── formatters.js           # Number/currency/date formatting utils
│   │   └── constants.js            # GICS sectors, sync intervals, page sizes
│   └── styles/
│       └── globals.css             # Tailwind directives + CSS custom properties
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql  # Full database schema
├── next.config.js
├── next.sitemap.js                 # next-sitemap config for auto-generated sitemap
├── tailwind.config.js
├── postcss.config.js
├── jsconfig.json                   # Path aliases (@/ → src/)
├── vercel.json                     # Cron job definitions
├── .env.local                      # Local secrets (gitignored)
├── .env.example                    # Template for env vars
├── package.json
└── README.md
```

### Key Structural Decisions

1. **`src/` directory** — Separates application code from config files at the root. Standard Next.js convention.
2. **`src/lib/fmp/`** — All FMP API interaction is isolated here. The FMP client is server-only and never imported in client components. This prevents API key leakage.
3. **`src/lib/supabase/`** — Two clients: `client.js` uses the anon key for browser-side reads (Phase 2 auth), `server.js` uses the service role key for sync jobs and server components.
4. **`supabase/migrations/`** — SQL migrations versioned in git. Applied via Supabase CLI or dashboard.
5. **No `src/pages/`** — We use App Router exclusively. No Pages Router.

---

## 2. Rendering Strategy

### Route-by-Route Rendering Plan

| Route | Strategy | Revalidation | Rationale |
|-------|----------|-------------|-----------|
| `/` (stock screener) | **SSR** (`dynamic = 'force-dynamic'`) | None (fresh every request) | Screener must show current prices. SSR ensures the HTML sent to Googlebot has real data. |
| `/etfs` | **SSR** (`dynamic = 'force-dynamic'`) | None | Same as homepage. |
| `/stock/[ticker]` | **ISR** (`revalidate = 300`) | 5 minutes | ~2,500 static pages. ISR rebuilds on-demand every 5 min. Excellent for SEO; Google sees full HTML. |
| `/etf/[ticker]` | **ISR** (`revalidate = 300`) | 5 minutes | Same as stock detail. |
| `/sectors` | **SSR** | None | Aggregated sector data, always fresh. |
| `/about` | **Static** (default) | None (build time) | No dynamic data. |

### generateStaticParams

For `/stock/[ticker]` and `/etf/[ticker]`, we implement `generateStaticParams` to pre-render the top 200 securities at build time. The remaining ~2,300 pages are generated on first request and cached (ISR).

```js
// src/app/stock/[ticker]/page.js
export async function generateStaticParams() {
  const supabase = createServerClient();
  const { data } = await supabase
    .from('securities')
    .select('symbol')
    .eq('type', 'stock')
    .order('market_cap', { ascending: false })
    .limit(200);

  return data.map((s) => ({ ticker: s.symbol.toLowerCase() }));
}
```

### Client vs Server Components

- **Server Components (default):** All page.js files, layout.js, most detail sub-components (DetailHeader, CompanyDescription, PeersTable, FinancialDataTable, etc.). These fetch data from Supabase on the server and render static HTML.
- **Client Components (`'use client'`):** Interactive elements only — ScreenerTable (sorting, filtering, pagination state), PriceChart (Lightweight Charts requires DOM), FinancialCharts, SearchBar (typeahead), SectorFilter (dropdown state), Tabs.

This minimizes JavaScript sent to the browser. The majority of each page is server-rendered HTML.

### SEO Implementation

Each ticker page exports a `generateMetadata` function:

```js
// src/app/stock/[ticker]/page.js
export async function generateMetadata({ params }) {
  const { ticker } = await params;
  const security = await getSecurityByTicker(ticker);
  const formattedCap = formatMarketCap(security.market_cap);

  return {
    title: `${security.symbol} Market Cap, Price & Financials - ASX MarketCap`,
    description: `${security.name} (${security.symbol}) has a market cap of ${formattedCap} AUD. View live price, charts, financials, and peer comparison on ASX MarketCap.`,
    openGraph: {
      title: `${security.symbol} - ${security.name}`,
      description: `Market cap: ${formattedCap}. Current price: $${security.price}`,
      images: [security.logo_url],
    },
  };
}
```

JSON-LD structured data is embedded directly in the page component as a `<script type="application/ld+json">` tag.

### Sitemap

Use the `next-sitemap` package configured via `next.sitemap.js`:
- Generates `/sitemap.xml` listing all `/stock/[ticker]` and `/etf/[ticker]` pages.
- Runs post-build to capture all generated static params.
- Sets `changefreq: 'daily'` and `priority: 0.8` for ticker pages.

---

## 3. Database Schema (Refined)

The PRD schema is a solid starting point. Below are specific refinements based on the actual FMP API field names discovered during testing (FMPTesting.md), query patterns, and performance considerations.

### 3.1 Refinements to `securities` Table

```sql
CREATE TABLE securities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol TEXT NOT NULL UNIQUE,            -- "CBA" (display, used in URLs)
  fmp_symbol TEXT NOT NULL UNIQUE,        -- "CBA.AX" (used for FMP API calls)
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('stock', 'etf')),
  is_actively_trading BOOLEAN DEFAULT true,

  -- Profile data (daily sync)
  sector TEXT,
  industry TEXT,
  description TEXT,
  logo_url TEXT,
  website TEXT,
  ceo TEXT,
  employees INTEGER,
  ipo_date DATE,                          -- Renamed from 'founded' — FMP provides ipoDate not founding date
  currency TEXT DEFAULT 'AUD',

  -- Quote data (intraday sync every 5 min)
  price NUMERIC(12,4),                    -- Use NUMERIC not DECIMAL for PostgreSQL precision
  change_1d NUMERIC(10,4),               -- Absolute change ($)
  change_1d_pct NUMERIC(8,4),            -- Percentage change — FMP provides changePercentage directly
  change_7d_pct NUMERIC(8,4),            -- Calculated from daily_prices (close today vs close 7 days ago)
  volume BIGINT,
  day_high NUMERIC(12,4),
  day_low NUMERIC(12,4),
  day_open NUMERIC(12,4),                -- Added: FMP batch-quote provides open
  previous_close NUMERIC(12,4),          -- Added: FMP provides previousClose
  market_cap BIGINT,

  -- Range data
  year_high NUMERIC(12,4),               -- 52-week high from batch-quote
  year_low NUMERIC(12,4),                -- 52-week low from batch-quote
  price_avg_50 NUMERIC(12,4),            -- Added: 50-day moving average from batch-quote
  price_avg_200 NUMERIC(12,4),           -- Added: 200-day moving average from batch-quote

  -- ATH/ATL (calculated from daily_prices during EOD sync)
  all_time_high NUMERIC(12,4),
  all_time_high_date DATE,
  all_time_low NUMERIC(12,4),
  all_time_low_date DATE,

  -- Key metrics snapshot (from profile + key-metrics sync)
  beta NUMERIC(8,4),
  pe_ratio NUMERIC(10,4),
  eps NUMERIC(10,4),
  dividend_yield NUMERIC(8,6),
  last_annual_dividend NUMERIC(10,4),    -- Added: from company-screener

  -- Timestamps
  last_price_sync TIMESTAMPTZ,           -- Renamed: tracks when price was last updated
  last_profile_sync TIMESTAMPTZ,         -- Added: tracks profile data freshness
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Key changes from PRD schema:**
- `NUMERIC(p,s)` instead of `DECIMAL` — same type in PostgreSQL but explicit precision prevents rounding bugs on financial data.
- Added `change_1d_pct` — FMP provides this directly in `batch-quote` as `changePercentage`. No need to calculate.
- Added `day_open`, `previous_close`, `price_avg_50`, `price_avg_200` — all come free from `batch-quote`. Useful for detail pages.
- Renamed `founded` to `ipo_date` — FMP provides `ipoDate`, not company founding date.
- Split `last_synced_at` into `last_price_sync` and `last_profile_sync` for clearer staleness tracking.
- Added `is_actively_trading` — FMP flag to exclude delisted securities from screener.

### 3.2 Refinements to `daily_prices` Table

```sql
CREATE TABLE daily_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  security_id UUID NOT NULL REFERENCES securities(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  open NUMERIC(12,4),
  high NUMERIC(12,4),
  low NUMERIC(12,4),
  close NUMERIC(12,4),
  volume BIGINT,
  change NUMERIC(10,4),                  -- Added: absolute change from FMP
  change_percent NUMERIC(8,4),
  vwap NUMERIC(12,4),                    -- Added: volume-weighted average price from FMP

  UNIQUE(security_id, date)
);
```

**Changes:** Added `change` (absolute) and `vwap` — both come from FMP's `historical-price-eod/full` response at no extra cost.

### 3.3 Refinements to `financial_statements` Table

Split into three normalized tables matching FMP's actual endpoint structure. The PRD's single-table approach would create sparse rows (balance sheet rows have NULL revenue, income statement rows have NULL total_assets). Separate tables are cleaner.

```sql
CREATE TABLE income_statements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  security_id UUID NOT NULL REFERENCES securities(id) ON DELETE CASCADE,
  period TEXT NOT NULL CHECK (period IN ('FY', 'Q1', 'Q2', 'Q3', 'Q4')),
  date DATE NOT NULL,
  fiscal_year TEXT,
  reported_currency TEXT DEFAULT 'AUD',
  revenue BIGINT,
  gross_profit BIGINT,
  operating_income BIGINT,
  operating_expenses BIGINT,
  net_income BIGINT,
  eps NUMERIC(10,4),
  eps_diluted NUMERIC(10,4),
  ebitda BIGINT,

  UNIQUE(security_id, date, period)
);

CREATE TABLE balance_sheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  security_id UUID NOT NULL REFERENCES securities(id) ON DELETE CASCADE,
  period TEXT NOT NULL CHECK (period IN ('FY', 'Q1', 'Q2', 'Q3', 'Q4')),
  date DATE NOT NULL,
  fiscal_year TEXT,
  reported_currency TEXT DEFAULT 'AUD',
  total_assets BIGINT,
  total_liabilities BIGINT,
  total_stockholders_equity BIGINT,
  total_debt BIGINT,
  net_debt BIGINT,
  cash_and_cash_equivalents BIGINT,

  UNIQUE(security_id, date, period)
);

CREATE TABLE cash_flow_statements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  security_id UUID NOT NULL REFERENCES securities(id) ON DELETE CASCADE,
  period TEXT NOT NULL CHECK (period IN ('FY', 'Q1', 'Q2', 'Q3', 'Q4')),
  date DATE NOT NULL,
  fiscal_year TEXT,
  reported_currency TEXT DEFAULT 'AUD',
  operating_cash_flow BIGINT,
  capital_expenditure BIGINT,
  free_cash_flow BIGINT,
  dividends_paid BIGINT,

  UNIQUE(security_id, date, period)
);
```

**Rationale:** Maps 1:1 to FMP's three separate endpoints. Transform code is simpler (no field mapping across different statement types). Queries on the detail page are cleaner — you query one table per chart.

### 3.4 `key_metrics` Table (Unchanged)

The PRD schema is correct. Matches FMP's `/api/v3/key-metrics` output.

```sql
CREATE TABLE key_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  security_id UUID NOT NULL REFERENCES securities(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  pe_ratio NUMERIC(10,4),
  ps_ratio NUMERIC(10,4),
  pb_ratio NUMERIC(10,4),
  eps NUMERIC(10,4),
  dividend_yield NUMERIC(8,6),
  roe NUMERIC(8,4),
  roa NUMERIC(8,4),
  debt_to_equity NUMERIC(10,4),
  current_ratio NUMERIC(10,4),
  market_cap BIGINT,
  enterprise_value BIGINT,             -- Added: from key-metrics response
  revenue_per_share NUMERIC(10,4),
  net_income_per_share NUMERIC(10,4),
  book_value_per_share NUMERIC(10,4),  -- Added: from key-metrics response

  UNIQUE(security_id, date)
);
```

### 3.5 `stock_peers` Table (Unchanged)

```sql
CREATE TABLE stock_peers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  security_id UUID NOT NULL REFERENCES securities(id) ON DELETE CASCADE,
  peer_fmp_symbol TEXT NOT NULL,         -- Store FMP symbol; resolve to security_id at read time
  UNIQUE(security_id, peer_fmp_symbol)
);
```

**Change:** Store `peer_fmp_symbol` (TEXT) instead of `peer_security_id` (FK). The FMP peers endpoint returns symbols like `AN3PJ.AX` that may not exist in our `securities` table (preference shares, etc.). Storing the raw symbol avoids FK constraint failures and lets us filter at read time to only show peers we have data for.

### 3.6 ETF Tables (Minor Tweaks)

```sql
CREATE TABLE etf_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  security_id UUID NOT NULL UNIQUE REFERENCES securities(id) ON DELETE CASCADE,
  expense_ratio NUMERIC(6,4),
  aum BIGINT,
  nav NUMERIC(12,4),                    -- Added: net asset value from etf-info
  nav_currency TEXT DEFAULT 'AUD',      -- Added
  issuer TEXT,                          -- Maps to FMP "etfCompany"
  inception_date DATE,
  asset_class TEXT,                     -- Added: from etf-info (e.g., "Equity", "Fixed Income")
  holdings_count INTEGER,               -- Added: from etf-info
  category TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE etf_holdings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  etf_security_id UUID NOT NULL REFERENCES securities(id) ON DELETE CASCADE,
  holding_symbol TEXT,                   -- Maps to FMP "asset" field
  holding_name TEXT,
  weight_percentage NUMERIC(8,4),
  shares BIGINT,                        -- Maps to FMP "sharesNumber"
  market_value BIGINT,                  -- Added: from etf-holder response
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE etf_sector_weights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  security_id UUID NOT NULL REFERENCES securities(id) ON DELETE CASCADE,
  sector TEXT NOT NULL,
  weight_percentage NUMERIC(6,4),       -- Stored as decimal (33.00), NOT string "33%"
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(security_id, sector)
);
```

### 3.7 Sync Metadata Table (New)

Track sync job runs for debugging and the "last updated" UI indicator.

```sql
CREATE TABLE sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name TEXT NOT NULL,               -- e.g., "intraday", "eod", "profiles", "financials"
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'failed')),
  records_processed INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_sync_log_job ON sync_log(job_name, started_at DESC);
```

### 3.8 Indexes

```sql
-- Screener queries (primary query pattern: filter by type, sort by market_cap)
CREATE INDEX idx_securities_type_mcap ON securities(type, market_cap DESC NULLS LAST);
CREATE INDEX idx_securities_type_sector ON securities(type, sector);
CREATE INDEX idx_securities_symbol_lower ON securities(LOWER(symbol));      -- For URL lookups
CREATE INDEX idx_securities_fmp_symbol ON securities(fmp_symbol);           -- For sync upserts
CREATE INDEX idx_securities_active ON securities(is_actively_trading) WHERE is_actively_trading = true;

-- Full-text search on symbol + name for typeahead
CREATE INDEX idx_securities_search ON securities USING gin(
  to_tsvector('english', symbol || ' ' || name)
);

-- Daily prices (chart queries: get prices for a symbol in date range)
CREATE INDEX idx_daily_prices_sid_date ON daily_prices(security_id, date DESC);

-- Financial statements (detail page: get all statements for a security)
CREATE INDEX idx_income_sid_date ON income_statements(security_id, date DESC);
CREATE INDEX idx_balance_sid_date ON balance_sheets(security_id, date DESC);
CREATE INDEX idx_cashflow_sid_date ON cash_flow_statements(security_id, date DESC);
CREATE INDEX idx_metrics_sid_date ON key_metrics(security_id, date DESC);

-- Peers
CREATE INDEX idx_peers_sid ON stock_peers(security_id);

-- ETF details
CREATE INDEX idx_etf_holdings_eid ON etf_holdings(etf_security_id);
CREATE INDEX idx_etf_sectors_sid ON etf_sector_weights(security_id);
```

---

## 4. Data Sync System

### 4.1 Architecture

All sync jobs are Next.js API routes (`/api/sync/*`) triggered by **Vercel Cron Jobs**. Each sync route:
1. Validates a `CRON_SECRET` header to prevent unauthorized invocation.
2. Creates a `sync_log` entry with status `running`.
3. Calls FMP API endpoints.
4. Transforms and upserts data into Supabase.
5. Updates the sync_log entry to `completed` or `failed`.

```
vercel.json (cron config)
        │
        ▼
/api/sync/intraday/route.js  ──► FMP batch-exchange-quote + batch-quote
/api/sync/eod/route.js       ──► FMP historical-price-eod/full
/api/sync/profiles/route.js  ──► FMP company-screener + profile
/api/sync/financials/route.js ──► FMP income-statement, balance-sheet, cash-flow, key-metrics, peers, ETF data
```

### 4.2 Vercel Cron Configuration

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/sync/intraday",
      "schedule": "*/5 0-6 * * 1-5"
    },
    {
      "path": "/api/sync/eod",
      "schedule": "30 6 * * 1-5"
    },
    {
      "path": "/api/sync/profiles",
      "schedule": "0 19 * * *"
    },
    {
      "path": "/api/sync/financials",
      "schedule": "0 16 * * 0"
    }
  ]
}
```

**Schedule notes (all times UTC — AEST is UTC+10/+11):**
- **Intraday:** `*/5 0-6 * * 1-5` = Every 5 min, midnight-6am UTC = 10am-4pm AEST, Mon-Fri.
- **EOD:** `30 6 * * 1-5` = 6:30am UTC = 4:30pm AEST, Mon-Fri.
- **Profiles:** `0 19 * * *` = 7pm UTC = 5am AEST next day, daily.
- **Financials:** `0 16 * * 0` = 4pm UTC Sunday = 2am AEST Monday.

> **Vercel Cron Limits:** Free tier allows 2 cron jobs (max daily invocations). Pro tier ($20/month) allows unlimited crons. This project requires Pro tier or a workaround (single cron that dispatches sub-jobs).

**Free-tier workaround:** Use a single cron endpoint `/api/sync/dispatcher` that runs every 5 minutes and internally decides which sync to run based on the current AEST time:

```js
// /api/sync/dispatcher/route.js — single cron entry point
export async function GET(request) {
  const aest = new Date().toLocaleString('en-AU', { timeZone: 'Australia/Sydney' });
  const hour = new Date(aest).getHours();
  const minute = new Date(aest).getMinutes();
  const day = new Date(aest).getDay(); // 0=Sun

  if (day === 0 && hour === 2 && minute < 5) {
    return runFinancialsSync();
  }
  if (hour === 5 && minute < 5) {
    return runProfilesSync();
  }
  if (hour === 16 && minute >= 30 && minute < 35 && day >= 1 && day <= 5) {
    return runEodSync();
  }
  if (hour >= 10 && hour < 16 && day >= 1 && day <= 5) {
    return runIntradaySync();
  }

  return Response.json({ status: 'no sync needed' });
}
```

### 4.3 Intraday Price Sync (every 5 min, market hours)

**Step 1: Batch exchange quote** — Single call, all ASX tickers.
```
GET /stable/batch-exchange-quote?exchange=ASX
```
Returns `{ symbol, price, change, volume }` for ~2,552 tickers.

**Step 2: Batch quote** — Richer data, batched in groups of 50 symbols.
```
GET /stable/batch-quote?symbols=CBA.AX,BHP.AX,...  (50 per call)
```
Returns `{ symbol, price, changePercentage, change, volume, dayLow, dayHigh, yearHigh, yearLow, marketCap, open, previousClose }`.

~52 calls for all ~2,600 tickers. At 3,000 calls/min limit, this completes in under 2 seconds.

**Step 3: Upsert into `securities`**
```sql
INSERT INTO securities (fmp_symbol, price, change_1d, change_1d_pct, volume, day_high, day_low, day_open, previous_close, market_cap, year_high, year_low, price_avg_50, price_avg_200, last_price_sync, updated_at)
VALUES ($1, $2, ...)
ON CONFLICT (fmp_symbol)
DO UPDATE SET price = EXCLUDED.price, change_1d = EXCLUDED.change_1d, ...
```

Use Supabase's `upsert` method with `onConflict: 'fmp_symbol'`. Process in batches of 500 rows per upsert call.

### 4.4 End-of-Day Sync (4:30 PM AEST, Mon-Fri)

**Step 1:** For each security, fetch today's data point from `historical-price-eod/full`. Since we already have the day's data from intraday sync, we only need to insert into `daily_prices`:

```sql
INSERT INTO daily_prices (security_id, date, open, high, low, close, volume, change, change_percent, vwap)
VALUES (...)
ON CONFLICT (security_id, date) DO UPDATE SET ...
```

**Step 2: Calculate `change_7d_pct`** for all securities:
```sql
UPDATE securities s
SET change_7d_pct = (
  (s.price - dp.close) / dp.close * 100
)
FROM daily_prices dp
WHERE dp.security_id = s.id
  AND dp.date = (CURRENT_DATE - INTERVAL '7 days');
```

**Step 3: Calculate ATH/ATL** for any security whose price today exceeds current ATH or falls below current ATL:
```sql
UPDATE securities
SET all_time_high = price, all_time_high_date = CURRENT_DATE
WHERE price > all_time_high OR all_time_high IS NULL;

UPDATE securities
SET all_time_low = price, all_time_low_date = CURRENT_DATE
WHERE price < all_time_low OR all_time_low IS NULL;
```

### 4.5 Daily Profile Sync (5:00 AM AEST)

**Step 1: Discover securities** via company-screener:
```
GET /stable/company-screener?exchange=ASX&isEtf=false&isFund=false&limit=10000
GET /stable/company-screener?exchange=ASX&isEtf=true&limit=10000
```

Insert any new securities into `securities` table. Mark any that disappeared as `is_actively_trading = false`.

**Step 2: Fetch profiles** for all securities:
```
GET /stable/profile?symbol=CBA.AX
```

~2,700 calls. At 3,000 calls/min, this takes ~1 minute. Stagger with 10ms delay between calls to be safe.

Update `securities` with: `name`, `sector`, `industry`, `description`, `logo_url`, `website`, `ceo`, `employees`, `ipo_date`, `beta`, `last_annual_dividend`, `is_actively_trading`.

### 4.6 Weekly Financials Sync (Sunday 2:00 AM AEST)

Runs for all actively trading securities. Each requires multiple FMP calls:

| Data | Endpoint | Calls |
|------|----------|-------|
| Income statements | `/api/v3/income-statement/{symbol}?period=annual` | ~2,500 |
| Balance sheets | `/api/v3/balance-sheet-statement/{symbol}?period=annual` | ~2,500 |
| Cash flow | `/api/v3/cash-flow-statement/{symbol}?period=annual` | ~2,500 |
| Key metrics | `/api/v3/key-metrics/{symbol}?period=annual` | ~2,500 |
| Stock peers | `/api/v4/stock_peers?symbol={symbol}` | ~2,500 |
| ETF holdings | `/api/v3/etf-holder/{symbol}` | ~184 |
| ETF sector weights | `/api/v3/etf-sector-weightings/{symbol}` | ~184 |
| ETF info | `/api/v4/etf-info?symbol={symbol}` | ~184 |

**Total:** ~13,000 calls. At 3,000/min, this takes ~4.5 minutes of API time.

**Implementation:** Process in parallel batches of 50 concurrent requests with a rate limiter. Use `Promise.allSettled` to handle individual failures gracefully. Failed securities are logged and retried on the next run.

> **Vercel function timeout:** Free tier = 10s, Pro = 60s, Enterprise = 900s. The weekly financials sync cannot run as a single function invocation on Free/Pro. Options:
> 1. **Pro tier with background functions** (up to 5 min execution) — simplest.
> 2. **Fan-out pattern:** The dispatcher triggers individual sub-functions for batches of 100 securities each, running concurrently.
> 3. **Supabase Edge Functions** for the long-running syncs (no timeout issues).

**Recommendation:** Use Vercel Pro with background functions for sync jobs. The `/api/sync/financials` route sets `export const maxDuration = 300;` (5 min). This is sufficient for the weekly sync.

### 4.7 Initial Data Backfill

A one-time script (not a cron job) to populate the database from scratch:

1. Run profile sync to discover and create all securities.
2. Run financials sync to populate statements and metrics.
3. For each security, fetch full price history:
   ```
   GET /stable/historical-price-eod/full?symbol=CBA.AX
   ```
   Returns ~1,200 daily records per security.
4. Calculate ATH/ATL from the full history.
5. Calculate `change_7d_pct` from the most recent 7 days.

**Estimated time:** ~2,700 profile calls + ~2,700 history calls + ~13,000 financials calls = ~18,400 calls. At 3,000/min = ~6.5 minutes of API time. With processing overhead, expect ~15-20 minutes total.

This can run as a local Node script or a Supabase Edge Function triggered manually.

### 4.8 FMP Client (`src/lib/fmp/client.js`)

```js
// Server-only FMP API wrapper
const FMP_BASE = 'https://financialmodelingprep.com';
const API_KEY = process.env.FMP_API_KEY;

const RATE_LIMIT_DELAY_MS = 25; // ~40 requests/sec, well under 3000/min

async function fmpFetch(path, params = {}) {
  params.apikey = API_KEY;
  const url = new URL(path, FMP_BASE);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`FMP ${res.status}: ${url.pathname}`);
  return res.json();
}

// Batched parallel fetch with rate limiting
async function fmpBatchFetch(items, fetchFn, concurrency = 50) {
  const results = [];
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    const batchResults = await Promise.allSettled(
      batch.map((item) => fetchFn(item))
    );
    results.push(...batchResults);
    if (i + concurrency < items.length) {
      await new Promise((r) => setTimeout(r, RATE_LIMIT_DELAY_MS * concurrency));
    }
  }
  return results;
}
```

### 4.9 FMP Transform Layer (`src/lib/fmp/transforms.js`)

Each FMP response is transformed into the database column shape. Key transformations:
- Strip `.AX` suffix from `symbol` to get display symbol (`CBA.AX` -> `CBA`).
- Parse `weightPercentage` string `"33%"` -> numeric `33.00` (ETF sector weights).
- Filter stock peers to exclude preference shares (symbols containing letters after numbers, like `AN3PJ.AX`).
- Map FMP field names to snake_case DB columns (e.g., `changePercentage` -> `change_1d_pct`, `etfCompany` -> `issuer`).

---

## 5. API Routes

Client-side API routes for dynamic interactions (sorting, filtering, pagination, search). These proxy to Supabase — the client never talks to Supabase directly in Phase 1 (no anon key needed on the client).

### 5.1 `GET /api/securities`

Screener data for the homepage table.

**Query params:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `type` | `stock` or `etf` | `stock` | Filter by security type |
| `sector` | string | (none) | Filter by sector |
| `sort` | string | `market_cap` | Sort column |
| `order` | `asc` or `desc` | `desc` | Sort direction |
| `page` | integer | `1` | Page number |
| `limit` | integer | `50` | Results per page |

**Response:**
```json
{
  "data": [
    {
      "symbol": "CBA",
      "name": "Commonwealth Bank of Australia",
      "sector": "Financial Services",
      "industry": "Banks - Diversified",
      "market_cap": 298825065176,
      "price": 178.74,
      "change_1d_pct": 12.60,
      "change_7d_pct": 3.25,
      "volume": 4169009,
      "logo_url": "https://images.financialmodelingprep.com/symbol/CBA.AX.png"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 2463,
    "totalPages": 50
  },
  "lastSync": "2026-02-12T06:05:00Z"
}
```

**Implementation:**
```js
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'stock';
  const sector = searchParams.get('sector');
  const sort = searchParams.get('sort') || 'market_cap';
  const order = searchParams.get('order') || 'desc';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '50');

  const supabase = createServerClient();
  let query = supabase
    .from('securities')
    .select('symbol, name, sector, industry, market_cap, price, change_1d_pct, change_7d_pct, volume, logo_url', { count: 'exact' })
    .eq('type', type)
    .eq('is_actively_trading', true)
    .order(sort, { ascending: order === 'asc', nullsFirst: false })
    .range((page - 1) * limit, page * limit - 1);

  if (sector) query = query.eq('sector', sector);

  const { data, count, error } = await query;
  // ... return response
}
```

### 5.2 `GET /api/securities/[ticker]`

Full detail for a single security (used by client-side tab switches on the detail page).

Returns all fields from `securities` plus joined data from `etf_details` (if ETF).

### 5.3 `GET /api/prices/[ticker]`

Historical price data for the chart component.

**Query params:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `range` | `7d`, `1m`, `3m`, `6m`, `1y`, `5y`, `all` | `1y` | Time range |

**Response:**
```json
{
  "symbol": "CBA",
  "prices": [
    { "date": "2026-02-12", "close": 178.74, "volume": 4169009 },
    { "date": "2026-02-11", "close": 171.45, "volume": 3800000 }
  ]
}
```

The chart component (Lightweight Charts) consumes this as `{ time: date, value: close }` pairs.

### 5.4 `GET /api/search`

Typeahead search for the SearchBar component.

**Query params:**
| Param | Type | Description |
|-------|------|-------------|
| `q` | string | Search query (min 1 char) |
| `limit` | integer | Max results (default 8) |

**Implementation:** Uses PostgreSQL full-text search on `symbol || name`:
```sql
SELECT symbol, name, type, logo_url, market_cap
FROM securities
WHERE is_actively_trading = true
  AND (symbol ILIKE $1 || '%' OR name ILIKE '%' || $1 || '%')
ORDER BY market_cap DESC NULLS LAST
LIMIT $2;
```

The `ILIKE` with prefix match on symbol ensures "CB" matches "CBA" first. The `name ILIKE` catches partial name matches.

### 5.5 Sync Routes (Protected)

All `/api/sync/*` routes validate a shared secret:

```js
export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // ... run sync
}
```

Vercel Cron Jobs automatically include the `CRON_SECRET` header.

---

## 6. Component Architecture

### 6.1 Data Flow Pattern

```
┌──────────────────────────────────────────────────────────┐
│  Server Component (page.js)                              │
│  - Fetches data from Supabase (server client)            │
│  - Renders HTML with data                                │
│  - Passes data as props to client components             │
└────────────┬─────────────────────────────────────────────┘
             │ props
             ▼
┌──────────────────────────────────────────────────────────┐
│  Client Component ('use client')                         │
│  - Receives initial data via props (SSR'd)               │
│  - Manages interactive state (sort, filter, page)        │
│  - Calls /api/* routes for updated data on interaction   │
└──────────────────────────────────────────────────────────┘
```

### 6.2 Screener Page Data Flow

```
page.js (SSR, server component)
  │
  ├── Fetches: supabase.from('securities').select(...)
  │   with default sort (market_cap DESC), limit 50
  │
  ├── Renders: <ScreenerTable initialData={data} initialPagination={pagination} />
  │
  └── ScreenerTable.js ('use client')
        ├── State: { sort, order, sector, page, data }
        ├── On sort/filter/page change: fetch('/api/securities?...')
        ├── Renders: SortHeader, ScreenerRow[], Pagination
        └── Sub-components:
            ├── SectorFilter ('use client') — dropdown with sector options
            ├── SearchBar ('use client') — debounced fetch to /api/search
            └── Pagination ('use client') — page number controls
```

### 6.3 Detail Page Data Flow

```
page.js (ISR, server component)
  │
  ├── Fetches (all parallel on server):
  │   ├── securities row (by symbol)
  │   ├── daily_prices (last 365 days for default 1Y chart)
  │   ├── income_statements (all periods)
  │   ├── balance_sheets (all periods)
  │   ├── cash_flow_statements (all periods)
  │   ├── key_metrics (all periods)
  │   ├── stock_peers + joined securities data
  │   └── etf_details + etf_holdings + etf_sector_weights (if ETF)
  │
  ├── Renders server components:
  │   ├── DetailHeader (logo, name, price, change, market cap, sector badges)
  │   ├── KeyStatsBar (P/E, EPS, dividend yield, beta, 52W range)
  │   ├── CompanyDescription (description text, CEO, employees, website)
  │   ├── PeersTable (peer rows linking to their detail pages)
  │   ├── FinancialDataTable (key financial metrics)
  │   └── HistoricalPriceTable (last 30 days of OHLCV)
  │
  └── Renders client components:
      ├── PriceChart initialData={dailyPrices} — Lightweight Charts
      │   └── On timeframe change: fetch('/api/prices/[ticker]?range=5y')
      └── FinancialCharts data={incomeStatements, keyMetrics} — Lightweight Charts
```

### 6.4 Lightweight Charts Integration

```js
// src/components/detail/PriceChart.js
'use client';

import { useRef, useEffect, useState } from 'react';
import { createChart } from 'lightweight-charts';

export default function PriceChart({ initialData, symbol }) {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const [timeRange, setTimeRange] = useState('1y');

  useEffect(() => {
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: '#FFFDF7' },   // --color-warm-white
        textColor: '#8B7355',                 // --color-bark
      },
      grid: {
        vertLines: { color: '#F0E8D8' },
        horzLines: { color: '#F0E8D8' },
      },
      width: chartContainerRef.current.clientWidth,
      height: 400,
    });

    const areaSeries = chart.addAreaSeries({
      lineColor: '#A8C6A0',   // --color-sage
      topColor: 'rgba(168, 198, 160, 0.4)',
      bottomColor: 'rgba(168, 198, 160, 0.0)',
      lineWidth: 2,
    });

    areaSeries.setData(
      initialData.map((d) => ({ time: d.date, value: d.close }))
    );

    chartRef.current = { chart, areaSeries };

    const handleResize = () => {
      chart.applyOptions({ width: chartContainerRef.current.clientWidth });
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, []);

  // ... timeframe switching logic

  return (
    <div>
      <div className="flex gap-2 mb-4">
        {['7d', '1m', '3m', '6m', '1y', '5y', 'all'].map((range) => (
          <button
            key={range}
            onClick={() => setTimeRange(range)}
            className={`px-3 py-1 rounded-full text-sm ${
              timeRange === range
                ? 'bg-sage text-white'
                : 'bg-cream text-bark hover:bg-bark-light/20'
            }`}
          >
            {range.toUpperCase()}
          </button>
        ))}
      </div>
      <div ref={chartContainerRef} />
    </div>
  );
}
```

---

## 7. npm Dependencies

### Production Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `next` | `^14.2` | Framework — App Router, SSR, ISR, API routes |
| `react` | `^18.3` | UI library |
| `react-dom` | `^18.3` | React DOM renderer |
| `@supabase/supabase-js` | `^2.45` | Supabase client for database queries |
| `lightweight-charts` | `^4.2` | TradingView charting library for price/financial charts |
| `next-sitemap` | `^4.2` | Auto-generates sitemap.xml and robots.txt |

### Development Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `tailwindcss` | `^3.4` | Utility-first CSS framework |
| `postcss` | `^8.4` | CSS processing (required by Tailwind) |
| `autoprefixer` | `^10.4` | CSS vendor prefixing (required by Tailwind) |
| `eslint` | `^8.57` | Linting |
| `eslint-config-next` | `^14.2` | Next.js ESLint rules |

### package.json

```json
{
  "name": "asx-marketcap",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "postbuild": "next-sitemap"
  },
  "dependencies": {
    "next": "^14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "@supabase/supabase-js": "^2.45.0",
    "lightweight-charts": "^4.2.0",
    "next-sitemap": "^4.2.0"
  },
  "devDependencies": {
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0",
    "eslint": "^8.57.0",
    "eslint-config-next": "^14.2.0"
  }
}
```

**Notably excluded:**
- No `recharts` — Lightweight Charts handles all charting needs (price charts, area charts). Financial trend charts (revenue, earnings) can use simple bar/area series in Lightweight Charts.
- No `axios` — Native `fetch` is sufficient (Next.js extends it with caching).
- No `date-fns` / `dayjs` — `Intl.DateTimeFormat` and `Intl.NumberFormat` handle all formatting needs. See `formatters.js` below.
- No state management (Redux, Zustand) — Server components handle data fetching; minimal client state uses `useState`/`useReducer`.
- No `@supabase/ssr` — For Phase 1 (no auth), the standard Supabase JS client is sufficient. Add `@supabase/ssr` in Phase 2 when adding Supabase Auth with cookie-based sessions.

---

## 8. Environment Variables

```bash
# .env.local (gitignored)

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...       # Public anon key (safe for client)
SUPABASE_SERVICE_ROLE_KEY=eyJ...           # Private service role key (server-only)

# FMP API
FMP_API_KEY=your_fmp_api_key               # Server-only, never exposed to client

# Cron Authentication
CRON_SECRET=your_random_secret_string      # Vercel Cron uses this to authenticate sync calls

# Site
NEXT_PUBLIC_SITE_URL=https://asxmarketcap.com
```

**Security rules:**
- `NEXT_PUBLIC_*` variables are safe to expose in the browser bundle.
- `FMP_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are server-only. They must NEVER appear in any client component or `NEXT_PUBLIC_` variable. Next.js enforces this by not including non-prefixed env vars in the client bundle.
- `CRON_SECRET` is server-only. Vercel automatically injects it into cron requests.

---

## 9. Key Implementation Notes

### 9.1 Supabase Client Setup

```js
// src/lib/supabase/server.js
import { createClient } from '@supabase/supabase-js';

export function createServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );
}
```

```js
// src/lib/supabase/client.js — Only used in Phase 2 for auth
import { createClient } from '@supabase/supabase-js';

let client = null;

export function getSupabaseClient() {
  if (!client) {
    client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
  }
  return client;
}
```

### 9.2 Formatting Utilities

```js
// src/lib/formatters.js

export function formatMarketCap(value) {
  if (!value) return '—';
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  return `$${value.toLocaleString()}`;
}

export function formatPrice(value) {
  if (value == null) return '—';
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(value);
}

export function formatChange(value) {
  if (value == null) return '—';
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

export function formatVolume(value) {
  if (!value) return '—';
  return new Intl.NumberFormat('en-AU', { notation: 'compact' }).format(value);
}
```

### 9.3 Tailwind Configuration

```js
// tailwind.config.js
module.exports = {
  content: ['./src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        cream: '#FFF8EF',
        'warm-white': '#FFFDF7',
        sage: '#A8C6A0',
        'sage-dark': '#7BA375',
        bark: '#8B7355',
        'bark-light': '#B8A88A',
        terracotta: '#C4725A',
        'terracotta-light': '#D4967E',
        sky: '#A8C8E8',
        lavender: '#C5B8D9',
        butter: '#F2D98B',
        leaf: '#6B9E5B',
      },
      fontFamily: {
        sans: ['Nunito', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
    },
  },
  plugins: [],
};
```

### 9.4 Error Handling and Resilience

**Sync jobs:**
- All sync jobs wrap each individual security processing in try/catch. A failure for one ticker does not abort the entire sync.
- Failed records are logged with the error message in `sync_log`.
- Stale data is always preferred over no data. If a sync fails entirely, the screener continues serving the last successful data.
- The `DataFreshness` component reads the latest `sync_log` entry and displays "Last updated X min ago" in the screener header. If data is older than 15 minutes during market hours, it shows a warning badge.

**Client-side:**
- API route failures return appropriate HTTP status codes (500 for server errors, 400 for bad params).
- The `error.js` boundary catches unhandled errors and shows a friendly error state.
- The `not-found.js` page handles invalid ticker URLs with a suggestion to search.

### 9.5 FMP Endpoint Versioning Matrix

Based on FMPTesting.md findings, some `/stable/` endpoints return empty for ASX. Here is the definitive endpoint selection:

| Data | Use This | Do NOT Use |
|------|----------|------------|
| Batch exchange quote | `/stable/batch-exchange-quote` | — |
| Batch quote | `/stable/batch-quote` | — |
| Company screener | `/stable/company-screener` | — |
| Profile | `/stable/profile` | — |
| Historical prices | `/stable/historical-price-eod/full` | — |
| Income statement | `/api/v3/income-statement/{symbol}` | `/stable/income-statement` |
| Balance sheet | `/api/v3/balance-sheet-statement/{symbol}` | `/stable/balance-sheet` (empty for ASX) |
| Cash flow | `/api/v3/cash-flow-statement/{symbol}` | `/stable/cash-flow-statement` (empty for ASX) |
| Key metrics | `/api/v3/key-metrics/{symbol}` | `/stable/key-metrics` (empty for ASX) |
| Stock peers | `/api/v4/stock_peers` | — |
| ETF holders | `/api/v3/etf-holder/{symbol}` | — |
| ETF sector weights | `/api/v3/etf-sector-weightings/{symbol}` | — |
| ETF info | `/api/v4/etf-info` | — |
| Sectors list | `/api/v3/sectors-list` | — |
| Stock news | N/A | `/api/v3/stock_news` (empty for ASX) |

### 9.6 Performance Considerations

1. **Screener query optimization:** The `idx_securities_type_mcap` index covers the default screener query (filter by type, sort by market_cap). PostgreSQL can serve the first 50 rows from the index without a full table scan.

2. **Detail page parallel fetches:** All Supabase queries for the detail page run in parallel using `Promise.all`. This reduces the ISR generation time to the duration of the slowest single query rather than the sum of all queries.

3. **Image optimization:** Use Next.js `<Image>` component for company logos. FMP logo URLs are proxied through Next.js image optimization (auto WebP, responsive sizing).

4. **Chart data transfer:** For the "All" timeframe chart (potentially 5+ years of daily data = ~1,200 points), the API route returns only `{ date, close }` pairs to minimize payload size. The full OHLCV data is only loaded for the historical price table.

5. **ISR on-demand revalidation:** In addition to time-based ISR (5 min), we can add on-demand revalidation triggered by the EOD sync. After the sync completes, it calls `revalidatePath('/stock/[ticker]')` for securities whose data changed significantly. This is an optimization for later — time-based ISR is sufficient for launch.

### 9.7 jsconfig.json

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

Allows imports like `import { formatPrice } from '@/lib/formatters'` instead of relative paths.

### 9.8 next.config.js

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.financialmodelingprep.com',
        pathname: '/symbol/**',
      },
    ],
  },
};

module.exports = nextConfig;
```

Allows Next.js Image component to optimize FMP-hosted company logos.

---

*End of Technical Architecture Document*
