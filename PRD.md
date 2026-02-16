# ASX MarketCap - Product Requirements Document

**Version:** 1.1
**Last Updated:** 2026-02-16
**Status:** Phase 1 Complete - Deployed
**Product:** asxmarketcap.com

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Product Vision & Goals](#3-product-vision--goals)
4. [Target Audience](#4-target-audience)
5. [Tech Stack & Architecture](#5-tech-stack--architecture)
6. [Data Strategy](#6-data-strategy)
7. [Phase 1 - Core Product](#7-phase-1---core-product)
8. [Phase 2 - User Engagement & Gamification](#8-phase-2---user-engagement--gamification)
9. [Phase 3 - Premium & Monetisation Expansion](#9-phase-3---premium--monetisation-expansion)
10. [UI/UX Design System](#10-uiux-design-system)
11. [SEO Strategy](#11-seo-strategy)
12. [Monetisation Strategy](#12-monetisation-strategy)
13. [FMP API Endpoint Reference](#13-fmp-api-endpoint-reference)
14. [Supabase Database Schema (High-Level)](#14-supabase-database-schema-high-level)
15. [Non-Functional Requirements](#15-non-functional-requirements)
16. [Risks & Mitigations](#16-risks--mitigations)
17. [Success Metrics](#17-success-metrics)
18. [Open Questions](#18-open-questions)

---

## 1. Executive Summary

ASX MarketCap is a market capitalisation screener for Australian Securities Exchange (ASX) listed stocks, ETFs, and managed funds. Inspired by the simplicity of CoinMarketCap and CoinGecko but tailored to the Australian equities market, the product provides a clean, visually appealing way to browse, filter, and research ASX-listed securities.

The product differentiates itself through:
- **Australian focus** - purpose-built for ASX securities, a currently underserved niche
- **Comprehensive ticker pages** - SEO-optimised individual pages for every listed stock, ETF, and managed fund
- **Cosy visual identity** - a warm, pastel, Animal Crossing-inspired design that makes financial data approachable
- **Gamification (Phase 2)** - a virtual garden where users' watchlisted stocks are represented as plants that grow or wilt based on price performance

---

## 2. Problem Statement

Australian retail investors lack a simple, visually appealing market cap screener purpose-built for the ASX. Existing tools are either:
- **Global platforms** (Yahoo Finance, TradingView) that treat ASX as an afterthought
- **Broker platforms** (CommSec, SelfWealth) that are feature-heavy and require accounts
- **Data-dense sites** (ASX.com.au) with poor UX and no modern screener functionality

There is an opportunity to build the "CoinMarketCap for ASX" - a lightweight, fast, beautifully designed screener that retail investors actually enjoy using.

---

## 3. Product Vision & Goals

**Vision:** The most approachable and visually delightful way to explore Australian stocks and ETFs.

**Goals:**
- Provide a fast, SEO-optimised screener covering all ASX-listed stocks (~2,200), ETFs (~250), and managed funds (~70)
- Serve data from our own backend (Supabase) for speed and reliability, not direct client-side API calls
- Deliver comprehensive individual ticker pages that rank well in Google for queries like "CBA market cap" or "BBUS ETF"
- Establish a unique brand identity through the cosy/gaming-inspired design system
- Build toward a community of engaged users through gamification in Phase 2

---

## 4. Target Audience

| Segment | Description | Key Needs |
|---------|-------------|-----------|
| **Casual Retail Investors** | Australians who occasionally check stock prices and market caps | Simple interface, fast answers, no account required |
| **Active Retail Traders** | Self-directed investors using platforms like CommSec, SelfWealth, Stake | Sector filtering, peer comparison, comprehensive financials |
| **ETF Investors** | Passive investors comparing ASX-listed ETFs | Dedicated ETF tab, sector exposure, expense ratios |
| **Finance Enthusiasts** | People interested in markets who enjoy gamification | Watchlists, plant garden, stock discovery |

---

## 5. Tech Stack & Architecture

### Frontend
| Component | Technology | Version | Rationale |
|-----------|-----------|---------|-----------|
| Framework | Next.js (App Router) | 15.x | SSR/SSG, API routes, ISR caching, SEO |
| UI Library | React (JavaScript only, no TypeScript) | 19.x | Developer familiarity |
| Styling | Tailwind CSS | 3.4 | Rapid UI development, easy theming |
| Charts | lightweight-charts (TradingView) | 5.x | Small bundle, financial chart features |
| Hosting | Vercel Pro ($25/mo) | — | Edge network, cron jobs, easy deploys |
| Sitemap | next-sitemap | 4.x | Auto-generated sitemap via postbuild |

### Backend / Data
| Component | Technology | Rationale |
|-----------|-----------|-----------|
| Database | Supabase Free plan (PostgreSQL) | Managed Postgres, RLS, Storage, built-in auth |
| Data Source | Financial Modeling Prep API (Ultimate Plan) | Comprehensive ASX coverage, bulk endpoints, 3,000 calls/min |
| Data Sync | Vercel Cron Jobs (5 scheduled routes) | Intraday, EOD, profiles, financials, logos |
| Logo Storage | Supabase Storage (public bucket) | Self-hosted logos, Next.js Image optimisation |
| Auth (Phase 2) | Supabase Auth | Email/password, social login, session management |

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        USERS                                │
│                    (Web Browsers)                            │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                   VERCEL (Frontend)                          │
│  ┌─────────────┐  ┌─────────────┐  ┌────────────────────┐  │
│  │  Next.js     │  │  SSR/SSG    │  │  API Routes        │  │
│  │  React + JS  │  │  Pages      │  │  (proxy to         │  │
│  │  Tailwind    │  │  /stock/cba │  │   Supabase)        │  │
│  └─────────────┘  └─────────────┘  └────────────────────┘  │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                  SUPABASE (Backend)                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  PostgreSQL   │  │  Edge        │  │  Auth (Phase 2)  │  │
│  │  Database     │  │  Functions   │  │  User accounts   │  │
│  │              │  │  (data sync) │  │  Watchlists      │  │
│  └──────────────┘  └──────┬───────┘  └──────────────────┘  │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│            FINANCIAL MODELING PREP API                       │
│            (Ultimate Plan - 3,000 calls/min)                │
│  Quotes • Profiles • Historicals • Financials • ETFs        │
└─────────────────────────────────────────────────────────────┘
```

**Key Principle:** All user-facing pages read from Supabase. No direct FMP API calls from the client. FMP is only called by backend sync processes.

---

## 6. Data Strategy

### 6.1 Data Coverage
- **Stocks:** All ASX-listed companies (~2,200 securities)
- **ETFs:** All ASX-listed ETFs (~250 securities)
- **Managed Funds:** ASX-listed managed funds (~70 securities)
- **Total:** ~2,520 securities
- **Identifier format:** FMP uses `.AX` suffix for ASX tickers (e.g., `CBA.AX`, `BHP.AX`)

### 6.2 Sync Schedule

| Sync Type | Frequency | Timing | Data |
|-----------|-----------|--------|------|
| **Intraday Price Sync** | Every 5 minutes | Market hours only (10:00 AM - 4:00 PM AEST, Mon-Fri) | Price, change, volume, day high/low |
| **End-of-Day Full Sync** | Once daily | 4:30 PM AEST (30 min after close) | Closing prices, daily OHLCV, market cap recalculation |
| **Profile Sync** | Once daily | 5:00 AM AEST (before market open) | Company profiles, logos, descriptions, sector/industry |
| **Financials Sync** | Weekly | Sunday 2:00 AM AEST | Income statements, balance sheets, key metrics, ratios |
| **Logo Sync** | Once daily | 5:30 AM AEST (after profiles) | Downloads logos from FMP, uploads to Supabase Storage |
| **Historical Backfill** | On-demand / manual | As needed | Full price history for all securities |

### 6.3 API Budget Estimation (Ultimate Plan: 3,000 calls/min)

**Intraday sync (every 5 minutes during market hours):**
- Using bulk quote endpoint: ~10 batch calls per sync (250 tickers per call)
- 72 syncs per day (6 hours x 12 per hour) = ~720 calls/day
- Well within the 3,000 calls/min limit

**Daily profile + EOD sync:** ~20 bulk calls
**Weekly financials sync:** ~100 calls

**Total estimated daily usage:** ~750-800 API calls (well under limits)

### 6.4 Historical Data Storage
- Store **daily closing prices** for all securities (used for 7-day change, charts, ATH/ATL calculations)
- Store **1-minute intraday data** for the current trading day only (for intraday charts)
- Retain daily close data indefinitely for historical charts and trend analysis

---

## 7. Phase 1 - Core Product

### 7.1 Pages & Routes

| Route | Page | Rendering | Revalidate |
|-------|------|-----------|------------|
| `/` | Homepage / All securities screener | ISR | 60s |
| `/stocks` | Stocks screener tab | ISR | 60s |
| `/etfs` | ETF screener tab | ISR | 60s |
| `/funds` | Managed funds screener tab | ISR | 60s |
| `/stock/[ticker]` | Individual stock detail page (e.g., `/stock/cba`) | SSG + ISR | 5m |
| `/etf/[ticker]` | Individual ETF detail page (e.g., `/etf/bbus`) | SSG + ISR | 5m |
| `/fund/[ticker]` | Individual fund detail page (e.g., `/fund/mxt`) | SSG + ISR | 5m |
| `/sectors` | Sector overview page (11 GICS sectors) | ISR | 60s |
| `/about` | About page | Static | — |

> **ISR** = Incremental Static Regeneration (pages are statically generated and revalidated at set intervals for SEO + freshness). Screener pages revalidate every 60 seconds. Detail pages revalidate every 5 minutes.

### 7.2 Main Screener Page

The homepage is a tabbed screener view with four tabs: **All**, **Stocks**, **ETFs**, and **Managed Funds**.

#### 7.2.1 Screener Table - Columns

| Column | Description | Sortable |
|--------|-------------|----------|
| **#** | Rank by market cap | - |
| **Logo** | Company/ETF logo from FMP | No |
| **Symbol** | ASX ticker (e.g., CBA, BHP) - links to detail page | No |
| **Name** | Full company or ETF name | Yes |
| **Sector / Industry** | GICS sector and industry classification | Yes |
| **Market Cap** | Current market capitalisation (formatted: $1.2B, $450M) | Yes (default sort) |
| **Price** | Current share price in AUD | Yes |
| **1D Change** | 24-hour price change (% with colour: green positive, red negative) | Yes |
| **7D Change** | 7-day price change (% with colour) - calculated from stored daily closes | Yes |

#### 7.2.2 Filtering & Sorting
- **Sector filter:** Dropdown/chip selector to filter by GICS sector (e.g., Financials, Materials, Healthcare, Energy, Technology, etc.)
- **Default sort:** Market cap descending (largest first)
- **Sortable columns:** Name, Market Cap, Price, 1D Change, 7D Change, Sector
- **Search bar:** Type-ahead search by ticker symbol or company name
- **Pagination:** 50 results per page with pagination controls (or infinite scroll)

#### 7.2.3 ETF Tab Specifics
The ETF tab uses the same table layout but with the following adjustments:
- **Industry** column replaced with **Category** (e.g., Australian Equities, International Equities, Fixed Income, Commodity)
- Additional future consideration: Expense Ratio column

### 7.3 Individual Stock Detail Page (`/stock/[ticker]`)

A comprehensive, SEO-optimised page for each ASX-listed stock. Design inspired by a combination of [CompaniesMarketCap](https://companiesmarketcap.com/) and [CoinMarketCap](https://coinmarketcap.com/).

#### 7.3.1 Page Header
- Company logo (large)
- Company name + ASX ticker symbol (e.g., "Commonwealth Bank of Australia (CBA)")
- Current price (large, prominent)
- 1D change (absolute + percentage, colour-coded)
- Market cap with global/ASX rank
- Sector and Industry badges

#### 7.3.2 Key Statistics Bar
A horizontal bar of key metrics displayed as cards:
- **Market Cap** (e.g., $198.5B)
- **Volume** (24h trading volume)
- **P/E Ratio**
- **EPS** (Earnings Per Share)
- **Dividend Yield**
- **52-Week High / Low**
- **Beta**

#### 7.3.3 Interactive Price Chart
- **Timeframes:** 1D, 7D, 1M, 3M, 6M, 1Y, 5Y, All
- **Chart types:** Line chart (default), with the area filled in with a gradient
- **Data:** Price history sourced from stored daily close data
- Chart library: Lightweight Charts (TradingView) or Recharts

#### 7.3.4 Trends & Financial Charts Section
Tabbed or scrollable section with individual trend charts for:
- **Market Cap History** (over time)
- **Revenue** (quarterly/annual)
- **Earnings / Net Income** (quarterly/annual)
- **P/E Ratio** (historical)
- **P/S Ratio** (Price-to-Sales historical)
- **EPS** (historical trend)

Each chart is a small card with a mini time-series graph and the latest value prominently displayed.

#### 7.3.5 Company Description
- Brief paragraph about the company (sourced from FMP company profile)
- Founded year, headquarters, CEO, number of employees
- Links: Official website, social media profiles

#### 7.3.6 Similar Companies (Peers)
- Table of 5-8 peer companies (same sector, similar market cap)
- Columns: Logo, Symbol, Name, Market Cap, Price, 1D Change
- Each row links to the peer's detail page
- Sourced from FMP Stock Peers endpoint

#### 7.3.7 Additional Details Section

**Price Ranges:**
| Metric | Display |
|--------|---------|
| 24H Range | Horizontal bar showing low-high with current price marker |
| 7D Range | Horizontal bar showing low-high with current price marker |
| 52-Week Range | Horizontal bar showing low-high with current price marker |
| All-Time High | Price + date achieved |
| All-Time Low | Price + date achieved |

**Key Financial Data:**
| Metric | Source |
|--------|--------|
| Revenue (TTM) | Income statement |
| Net Income (TTM) | Income statement |
| Total Assets | Balance sheet |
| Total Debt | Balance sheet |
| Free Cash Flow | Cash flow statement |
| Return on Equity | Key metrics |
| Profit Margin | Key metrics |
| Operating Margin | Key metrics |

#### 7.3.8 Historical Price Table
- Tabular view of recent price history (last 30 days by default)
- Columns: Date, Open, High, Low, Close, Volume, Change %
- Downloadable as CSV (stretch goal)

### 7.4 Individual ETF Detail Page (`/etf/[ticker]`)

Similar layout to stock detail page, with the following differences:
- **ETF-specific info:** Expense ratio, AUM (Assets Under Management), issuer, inception date
- **Holdings section:** Top 10-20 holdings with weighting percentages
- **Sector breakdown:** Pie chart or bar chart showing sector allocation
- **No individual financial statements** (ETFs don't have earnings in the same way)
- **Peer comparison** with other ETFs in the same category

---

## 8. Phase 2 - User Engagement & Gamification

### 8.1 User Authentication
- **Provider:** Supabase Auth
- **Methods:** Email/password, Google OAuth, Apple Sign-In
- **User profile:** Display name, avatar, join date
- **Session management:** Persistent login with refresh tokens

### 8.2 Watchlist
- Users can add any stock or ETF to their watchlist
- Watchlist is accessible from a dedicated `/watchlist` page
- Watchlist table mirrors the screener table columns
- Add/remove stocks via a heart/bookmark icon on screener rows and detail pages
- Watchlists are stored in Supabase, linked to user accounts

### 8.3 Event-Based Price Change
- Users can select a date to see the price change of any stock since that date
- **Pre-set events** available as quick selectors:
  - e.g., "Trump Presidency" (20 Jan 2025), "Trump Tariff Hike" (specific date), custom dates
- Displayed as: "Since [Event Name]: +15.3% ($4.20 → $4.84)"
- Events can be community-suggested or admin-curated
- Available on individual ticker pages and as a screener sort option

### 8.4 Gamification - The Stock Garden

The signature feature of Phase 2. Each user gets a virtual garden where watchlisted stocks are represented as plants.

#### 8.4.1 Core Mechanics

- Each user starts with **1 plot of land** containing **10 plant pots**
- Users assign their priority watchlist stocks to plant pots (1 stock = 1 plant)
- Users can **create additional plots** to monitor more stocks or swap plants between plots
- Each plot represents a "watchlist garden" that the user curates

#### 8.4.2 Plant Health Tiers

Plant appearance changes based on the **stock's daily price change**:

| Daily Change | Plant State | Visual Description |
|-------------|-------------|-------------------|
| > +15% | Blooming | Full bloom with flowers, sparkle effects, vibrant colours |
| +10% to +15% | Thriving | Tall, lush plant with buds appearing |
| +5% to +10% | Growing | Healthy green plant, visibly growing |
| +3% to +5% | Sprouting | Small green sprout, slightly upright |
| +1% to +3% | Budding | Tiny seedling just emerging from soil |
| -1% to +1% | Neutral | Seed in soil, no visible growth (resting state) |
| -1% to -3% | Drooping | Slightly wilted, leaves turning down |
| -3% to -5% | Wilting | Visibly wilted, yellowing leaves |
| -5% to -10% | Withering | Brown leaves, drooping significantly |
| -10% to -15% | Dried | Nearly dead plant, brown and dry |
| < -15% | Dead | Wilted husk, grey/brown, needs watering (attention) |

#### 8.4.3 Garden Page (`/garden`)

- Visual grid layout showing the user's garden plot(s)
- Each pot displays: plant visual + ticker symbol + daily change %
- **Click on a plant** to navigate to the stock's detail page
- **Click on a wilting/dead plant** to see a quick modal with:
  - Stock name and current price
  - Why it's down (recent news headlines from FMP news endpoint)
  - Link to full detail page
- **Plot management:**
  - Drag-and-drop to rearrange plants
  - Add/remove/swap stocks from pots
  - Create new plots (unlimited, but each holds 10 pots)

#### 8.4.4 Discovery Mechanic (Seeds)

- **Earning seeds:** Users earn a "seed" when they:
  - View a stock's detail page for the first time
  - Add a stock to their watchlist
  - Read news about a stock (tracked via click)
- **Using seeds:** Seeds are planted in empty pots to add new stocks to the garden
- This encourages stock discovery and engagement

---

## 9. Phase 3 - Premium & Monetisation Expansion

> Phase 3 is outlined at a high level for future scoping.

### 9.1 Premium Subscription
- **Tier:** Single premium tier (price TBD)
- **Premium-only data:**
  - Insider trades (who is buying/selling within the company)
  - Congress/politician trades (if data available for Australian equivalents, or US data for cross-listed)
  - Advanced screener filters (additional financial ratios, custom screens)
  - Extended historical data exports
  - Ad-free experience

### 9.2 Additional Features (To Be Scoped)
- Portfolio tracker (input holdings, track performance)
- Price alerts (email/push notifications)
- Advanced charting (technical indicators)
- Community features (comments on stock pages, sentiment voting)

---

## 10. UI/UX Design System

### 10.1 Design Philosophy

The visual identity is inspired by **cosy gaming aesthetics** (Animal Crossing, Stardew Valley) - warm, approachable, and delightful. Financial data should feel welcoming, not intimidating.

### 10.2 Colour Palette

> **WCAG AA Compliance:** Primary text colours (bark, sage-dark, terracotta) have been darkened from the original pastel values to meet WCAG 2.1 AA contrast ratios (4.5:1 minimum) against the cream background. Original pastels are used for decorative/background elements only. Price changes always pair colour with directional arrows/symbols (WCAG 1.4.1).

| Token | Colour | Hex | Usage |
|-------|--------|-----|-------|
| `--color-cream` | Cream | `#FFF8EF` | Page background |
| `--color-warm-white` | Warm White | `#FFFDF7` | Card backgrounds |
| `--color-sage` | Sage Green | `#A8C6A0` | Decorative accent, backgrounds |
| `--color-sage-dark` | Dark Sage | `#5C7A57` | Positive change text (WCAG AA) |
| `--color-bark` | Warm Brown | `#6B5A3E` | Headings, primary text (WCAG AA) |
| `--color-bark-light` | Light Brown | `#8B7355` | Secondary text |
| `--color-bark-lighter` | Lighter Brown | `#B8A88A` | Muted text, borders |
| `--color-terracotta` | Terracotta | `#A6604C` | Negative change text (WCAG AA) |
| `--color-terracotta-light` | Light Terracotta | `#C4725A` | Negative hover states |
| `--color-terracotta-lighter` | Lighter Terracotta | `#D4967E` | Decorative negative |
| `--color-sky` | Soft Blue | `#4A7FAD` | Links, informational elements |
| `--color-sky-light` | Light Blue | `#A8C8E8` | Decorative blue |
| `--color-lavender` | Lavender | `#C5B8D9` | ETF badge accent, secondary actions |
| `--color-butter` | Butter Yellow | `#F2D98B` | Highlights, decorative (not for text) |
| `--color-leaf` | Leaf Green | `#557D48` | Strong positive indicators |

### 10.3 Typography

| Element | Font | Weight | Size |
|---------|------|--------|------|
| Headings | **Nunito** (Google Fonts) | 700-800 | 1.5rem - 2.5rem |
| Body | **Nunito** | 400-600 | 0.875rem - 1rem |
| Monospace (prices, numbers) | **JetBrains Mono** or **Source Code Pro** | 500 | 0.875rem |

> Nunito's rounded letterforms complement the cosy aesthetic while remaining highly legible.

### 10.4 Component Styling

| Component | Style |
|-----------|-------|
| **Buttons** | Rounded corners (`rounded-full` or `rounded-xl`), soft shadow, pastel fills |
| **Cards** | `rounded-2xl`, subtle warm shadow, cream/white backgrounds |
| **Tables** | Rounded container, alternating row tints, no harsh borders |
| **Tabs** | Pill-style tabs with `rounded-full`, active state uses sage green |
| **Badges/Chips** | `rounded-full`, pastel backgrounds matching their category colour |
| **Inputs** | `rounded-xl`, cream background, warm brown border on focus |
| **Charts** | Sage green for positive, terracotta for negative, butter yellow for neutral |
| **Tooltips** | `rounded-lg`, warm brown background, cream text |

### 10.5 Illustrative Elements
- **Nature-inspired icons:** Leaf motifs for navigation, small plant icons for section dividers
- **Empty states:** Illustrated scenes (e.g., a cosy garden bench for empty watchlist)
- **Loading states:** Gentle animations (growing seedling, floating leaf)
- **Micro-interactions:** Soft bounce on button clicks, gentle fade transitions
- **Paper-like textures:** Subtle background texture on cards for a handcrafted feel

### 10.6 Responsive Design
- **Desktop:** Full table layout, side-by-side charts, 3-column detail pages
- **Tablet:** 2-column layout, collapsible sidebar
- **Mobile:** Single-column, horizontal scroll for tables, stacked charts

---

## 11. SEO Strategy

### 11.1 URL Structure
- Stock pages: `www.asxmarketcap.com/stock/[ticker]` (e.g., `/stock/cba`)
- ETF pages: `www.asxmarketcap.com/etf/[ticker]` (e.g., `/etf/bbus`)
- Fund pages: `www.asxmarketcap.com/fund/[ticker]` (e.g., `/fund/mxt`)
- All tickers in **lowercase** in URLs

### 11.2 Rendering Strategy
- **SSG (Static Site Generation)** with **ISR (Incremental Static Regeneration)** for all ticker pages
- Revalidation intervals: 60 seconds for screener pages, 5 minutes for detail pages
- React `cache()` wraps shared data fetches to deduplicate between `generateMetadata()` and page body
- JSON-LD output is XSS-safe via `safeJsonLd()` helper that escapes `<` and `>` characters
- This ensures Google sees fully rendered HTML with fresh data

### 11.3 Meta Tags & Structured Data
Each ticker page includes:
- **Title tag:** `CBA Market Cap, Price & Financials - ASX MarketCap`
- **Meta description:** `Commonwealth Bank of Australia (CBA) has a market cap of $198.5B AUD. View live price, charts, financials, and peer comparison on ASX MarketCap.`
- **Open Graph tags:** For social sharing (title, description, company logo as image)
- **JSON-LD structured data:** `FinancialProduct` or `Corporation` schema markup
- **Canonical URLs:** Self-referencing canonicals on each page

### 11.4 Sitemap & Indexing
- Auto-generated `sitemap.xml` via `next-sitemap` (runs as postbuild script)
- Sitemap files excluded from git — generated fresh each deploy
- `robots.txt` allowing full crawling, pointing to `https://asxmarketcap.com/sitemap.xml`
- Internal linking: Peer comparison sections link between ticker pages
- Breadcrumbs: Home > Stocks > CBA

### 11.5 Target Keywords (examples)
- "[Ticker] market cap" (e.g., "CBA market cap")
- "[Ticker] share price" (e.g., "BHP share price")
- "ASX stocks by market cap"
- "Australian ETFs list"
- "[Company name] ASX" (e.g., "Commonwealth Bank ASX")

---

## 12. Monetisation Strategy

### Phase 1: Free with Ads + Referral Links
- **Display ads:** Non-intrusive ad placements (e.g., banner between table rows, sidebar on detail pages)
- **Referral links:** "Buy [Ticker]" buttons that link to broker/platform partners where users can purchase the stock or ETF
  - Potential partners: Stake, SelfWealth, CommSec, Interactive Brokers
  - Revenue model: CPA (cost per acquisition) or revenue share
- **Placement:** Referral CTAs on individual ticker pages (above the fold, near price display)

### Phase 2: Continue Phase 1 + Build User Base
- Focus on growing registered users through the garden/gamification features
- Gather data on usage patterns to inform premium feature set

### Phase 3: Premium Subscription
- Ad-free experience + exclusive data (insider trades, congress trades, etc.)
- Pricing TBD based on market research

---

## 13. FMP API Endpoint Reference

All endpoints use the base URL: `https://financialmodelingprep.com/api`
ASX tickers use the `.AX` suffix (e.g., `CBA.AX`)

### 13.1 Data Sync Endpoints

| Purpose | Endpoint | Frequency |
|---------|----------|-----------|
| **All stock symbols** | `GET /v3/stock/list` | Daily (profile sync) |
| **ETF list** | `GET /v3/etf/list` | Daily (profile sync) |
| **Company profile** (logo, sector, industry, description) | `GET /v3/profile/{symbol}` | Daily (profile sync) |
| **Bulk quote** (price, change, volume, market cap) | `GET /v3/quote/{symbol1},{symbol2},...` | Every 5 min (intraday) |
| **Batch EOD prices** | `GET /v4/batch-request-end-of-day-prices?date={date}` | Daily (EOD sync) |
| **Historical daily prices** | `GET /v3/historical-price-full/{symbol}` | Initial backfill + daily |
| **Income statement** | `GET /v3/income-statement/{symbol}` | Weekly |
| **Balance sheet** | `GET /v3/balance-sheet-statement/{symbol}` | Weekly |
| **Cash flow statement** | `GET /v3/cash-flow-statement/{symbol}` | Weekly |
| **Key metrics** (P/E, EPS, etc.) | `GET /v3/key-metrics/{symbol}` | Weekly |
| **Stock peers** | `GET /v4/stock_peers?symbol={symbol}` | Weekly |
| **ETF holdings** | `GET /v3/etf-holder/{symbol}` | Weekly |
| **ETF sector weighting** | `GET /v3/etf-sector-weightings/{symbol}` | Weekly |
| **ETF info** (expense ratio, AUM) | `GET /v4/etf-info?symbol={symbol}` | Weekly |
| **Available sectors** | `GET /v3/sectors-list` | Monthly |
| **Company logo** | `GET /v3/profile/{symbol}` → `image` field | Daily (profile sync) |
| **Stock news** | `GET /v3/stock_news?tickers={symbol}` | On-demand / cached |

### 13.2 Bulk Endpoints (for initial data load)

| Purpose | Endpoint |
|---------|----------|
| **Bulk profiles** | `GET /v4/profile/all` |
| **Bulk key metrics** | `GET /v4/key-metrics-bulk?year={year}&period=annual` |
| **Bulk EOD prices** | `GET /v4/batch-request-end-of-day-prices?date={date}` |

> **Rate limit note:** Bulk endpoints can be hit once every 10 seconds; profile bulk once every 60 seconds.

---

## 14. Supabase Database Schema (High-Level)

### Phase 1 Tables (11 tables, as implemented)

> **Security:** RLS is enabled on all tables. The `anon` role has SELECT-only access. The `service_role` (used by sync jobs) bypasses RLS. See `supabase/migrations/004_enable_rls.sql`.

```
securities
├── id (UUID, PK)
├── symbol (TEXT, UNIQUE) -- e.g., "CBA"
├── fmp_symbol (TEXT, UNIQUE) -- e.g., "CBA.AX"
├── name (TEXT, NOT NULL)
├── type (TEXT, CHECK: 'stock', 'etf', 'fund')
├── is_actively_trading (BOOLEAN, DEFAULT true)
├── sector (TEXT)
├── industry (TEXT)
├── description (TEXT)
├── logo_url (TEXT) -- Supabase Storage URL (self-hosted)
├── website (TEXT)
├── ceo (TEXT)
├── employees (INTEGER)
├── ipo_date (DATE)
├── currency (TEXT, DEFAULT 'AUD')
├── price (NUMERIC(12,4))
├── change_1d (NUMERIC(10,4))
├── change_1d_pct (NUMERIC(8,4))
├── change_7d_pct (NUMERIC(8,4))
├── volume (BIGINT)
├── day_high (NUMERIC(12,4))
├── day_low (NUMERIC(12,4))
├── day_open (NUMERIC(12,4))
├── previous_close (NUMERIC(12,4))
├── market_cap (BIGINT)
├── year_high (NUMERIC(12,4))
├── year_low (NUMERIC(12,4))
├── price_avg_50 (NUMERIC(12,4))
├── price_avg_200 (NUMERIC(12,4))
├── all_time_high (NUMERIC(12,4))
├── all_time_high_date (DATE)
├── all_time_low (NUMERIC(12,4))
├── all_time_low_date (DATE)
├── beta (NUMERIC(8,4))
├── pe_ratio (NUMERIC(10,4))
├── eps (NUMERIC(10,4))
├── dividend_yield (NUMERIC(8,6))
├── last_annual_dividend (NUMERIC(10,4))
├── last_price_sync (TIMESTAMPTZ)
├── last_profile_sync (TIMESTAMPTZ)
├── created_at (TIMESTAMPTZ)
└── updated_at (TIMESTAMPTZ)

daily_prices
├── id (UUID, PK)
├── security_id (UUID, FK → securities.id, CASCADE)
├── date (DATE)
├── open (NUMERIC(12,4))
├── high (NUMERIC(12,4))
├── low (NUMERIC(12,4))
├── close (NUMERIC(12,4))
├── volume (BIGINT)
├── change (NUMERIC(10,4))
├── change_percent (NUMERIC(8,4))
├── vwap (NUMERIC(12,4))
└── UNIQUE(security_id, date)

income_statements
├── id (UUID, PK)
├── security_id (UUID, FK → securities.id, CASCADE)
├── period (TEXT, CHECK: 'FY', 'Q1', 'Q2', 'Q3', 'Q4')
├── date (DATE)
├── fiscal_year (TEXT)
├── reported_currency (TEXT, DEFAULT 'AUD')
├── revenue (BIGINT)
├── gross_profit (BIGINT)
├── operating_income (BIGINT)
├── operating_expenses (BIGINT)
├── net_income (BIGINT)
├── eps (NUMERIC(10,4))
├── eps_diluted (NUMERIC(10,4))
├── ebitda (BIGINT)
└── UNIQUE(security_id, date, period)

balance_sheets
├── id (UUID, PK)
├── security_id (UUID, FK → securities.id, CASCADE)
├── period (TEXT, CHECK: 'FY', 'Q1', 'Q2', 'Q3', 'Q4')
├── date (DATE)
├── fiscal_year (TEXT)
├── reported_currency (TEXT, DEFAULT 'AUD')
├── total_assets (BIGINT)
├── total_liabilities (BIGINT)
├── total_stockholders_equity (BIGINT)
├── total_debt (BIGINT)
├── net_debt (BIGINT)
├── cash_and_cash_equivalents (BIGINT)
└── UNIQUE(security_id, date, period)

cash_flow_statements
├── id (UUID, PK)
├── security_id (UUID, FK → securities.id, CASCADE)
├── period (TEXT, CHECK: 'FY', 'Q1', 'Q2', 'Q3', 'Q4')
├── date (DATE)
├── fiscal_year (TEXT)
├── reported_currency (TEXT, DEFAULT 'AUD')
├── operating_cash_flow (BIGINT)
├── capital_expenditure (BIGINT)
├── free_cash_flow (BIGINT)
├── dividends_paid (BIGINT)
└── UNIQUE(security_id, date, period)

key_metrics
├── id (UUID, PK)
├── security_id (UUID, FK → securities.id, CASCADE)
├── date (DATE)
├── pe_ratio (NUMERIC(10,4))
├── ps_ratio (NUMERIC(10,4))
├── pb_ratio (NUMERIC(10,4))
├── eps (NUMERIC(10,4))
├── dividend_yield (NUMERIC(8,6))
├── roe (NUMERIC(8,4))
├── roa (NUMERIC(8,4))
├── debt_to_equity (NUMERIC(10,4))
├── current_ratio (NUMERIC(10,4))
├── market_cap (BIGINT)
├── enterprise_value (BIGINT)
├── revenue_per_share (NUMERIC(10,4))
├── net_income_per_share (NUMERIC(10,4))
├── book_value_per_share (NUMERIC(10,4))
└── UNIQUE(security_id, date)

stock_peers
├── id (UUID, PK)
├── security_id (UUID, FK → securities.id, CASCADE)
├── peer_fmp_symbol (TEXT)
└── UNIQUE(security_id, peer_fmp_symbol)

etf_details
├── id (UUID, PK)
├── security_id (UUID, FK → securities.id, CASCADE, UNIQUE)
├── expense_ratio (NUMERIC(6,4))
├── aum (BIGINT)
├── nav (NUMERIC(12,4))
├── nav_currency (TEXT, DEFAULT 'AUD')
├── issuer (TEXT)
├── inception_date (DATE)
├── asset_class (TEXT)
├── holdings_count (INTEGER)
├── category (TEXT)
└── updated_at (TIMESTAMPTZ)

etf_holdings
├── id (UUID, PK)
├── etf_security_id (UUID, FK → securities.id, CASCADE)
├── holding_symbol (TEXT)
├── holding_name (TEXT)
├── weight_percentage (NUMERIC(8,4))
├── shares (BIGINT)
├── market_value (BIGINT)
└── updated_at (TIMESTAMPTZ)

etf_sector_weights
├── id (UUID, PK)
├── security_id (UUID, FK → securities.id, CASCADE)
├── sector (TEXT)
├── weight_percentage (NUMERIC(6,4))
├── updated_at (TIMESTAMPTZ)
└── UNIQUE(security_id, sector)

sync_log
├── id (UUID, PK)
├── job_name (TEXT, NOT NULL)
├── started_at (TIMESTAMPTZ, NOT NULL)
├── completed_at (TIMESTAMPTZ)
├── status (TEXT, CHECK: 'running', 'completed', 'failed')
├── records_processed (INTEGER, DEFAULT 0)
├── error_message (TEXT)
└── created_at (TIMESTAMPTZ)
```

### Phase 2 Additional Tables

```
users
├── id (UUID, PK) -- managed by Supabase Auth
├── display_name (TEXT)
├── avatar_url (TEXT)
├── seeds_balance (INTEGER, DEFAULT 0)
├── created_at (TIMESTAMPTZ)
└── updated_at (TIMESTAMPTZ)

watchlist_items
├── id (UUID, PK)
├── user_id (UUID, FK → users.id)
├── security_id (UUID, FK → securities.id)
├── added_at (TIMESTAMPTZ)
└── UNIQUE(user_id, security_id)

garden_plots
├── id (UUID, PK)
├── user_id (UUID, FK → users.id)
├── name (TEXT, DEFAULT 'My Garden')
├── position (INTEGER) -- ordering of plots
├── created_at (TIMESTAMPTZ)
└── updated_at (TIMESTAMPTZ)

garden_plants
├── id (UUID, PK)
├── plot_id (UUID, FK → garden_plots.id)
├── security_id (UUID, FK → securities.id)
├── pot_position (INTEGER) -- 1-10 within the plot
├── planted_at (TIMESTAMPTZ)
└── UNIQUE(plot_id, pot_position)

seed_transactions
├── id (UUID, PK)
├── user_id (UUID, FK → users.id)
├── amount (INTEGER)
├── reason (TEXT) -- e.g., "Viewed CBA detail page", "Added BHP to watchlist"
├── security_id (UUID, FK → securities.id, NULLABLE)
├── created_at (TIMESTAMPTZ)
└── INDEX(user_id, created_at)

price_events
├── id (UUID, PK)
├── name (TEXT) -- e.g., "Trump Presidency"
├── description (TEXT)
├── event_date (DATE)
├── is_featured (BOOLEAN)
├── created_by (UUID, FK → users.id, NULLABLE) -- NULL = admin-created
└── created_at (TIMESTAMPTZ)
```

### Database Indexes (Critical for Performance)

```sql
-- Screener queries (sorted/filtered)
CREATE INDEX idx_securities_type_market_cap ON securities(type, market_cap DESC);
CREATE INDEX idx_securities_type_sector ON securities(type, sector);
CREATE INDEX idx_securities_symbol ON securities(symbol);
CREATE INDEX idx_securities_fmp_symbol ON securities(fmp_symbol);

-- Daily prices (chart queries)
CREATE INDEX idx_daily_prices_security_date ON daily_prices(security_id, date DESC);

-- Financial statements (detail page)
CREATE INDEX idx_financial_statements_security ON financial_statements(security_id, period, date DESC);

-- Watchlist (Phase 2)
CREATE INDEX idx_watchlist_user ON watchlist_items(user_id);

-- Garden (Phase 2)
CREATE INDEX idx_garden_plants_plot ON garden_plants(plot_id);
```

---

## 15. Non-Functional Requirements

### 15.1 Performance
| Metric | Target |
|--------|--------|
| Screener page load (SSR) | < 1.5 seconds |
| Ticker detail page load (ISR) | < 1 second (cached) |
| Data freshness | Within 5 minutes during market hours |
| API response time (Supabase) | < 200ms for screener queries |
| Lighthouse Performance Score | > 90 |

### 15.2 Scalability
- Supabase Free plan: 500MB database, 1GB file storage (logos ~80MB)
- Vercel Pro ($25/mo): Increased bandwidth, cron jobs, analytics
- Design for horizontal scaling: stateless frontend, all state in Supabase

### 15.3 Reliability
- Data sync failures should retry with exponential backoff
- Stale data indicator: show "Last updated X minutes ago" on screener
- Graceful degradation: if sync fails, serve last known data (never show empty state)

### 15.4 Security
- No FMP API key exposed to the client - all API calls server-side only
- Supabase Row Level Security (RLS) for user data (Phase 2)
- Rate limiting on API routes to prevent abuse
- HTTPS enforced via Vercel

### 15.5 Accessibility
- WCAG 2.1 AA compliance
- Colour contrast ratios ≥ 4.5:1 for text
- Keyboard navigable tables and charts
- Screen reader compatible with ARIA labels

---

## 16. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **FMP API doesn't cover all ASX tickers** | Medium | High | Audit ASX coverage early in development; supplement with alternative API if gaps found |
| **FMP rate limits hit during sync** | Low | Medium | Use bulk endpoints, stagger requests, implement retry with backoff |
| **FMP API pricing changes** | Low | High | Abstract data layer so API provider can be swapped; cache aggressively |
| **SEO takes time to index ~2,450 pages** | High | Medium | Proper sitemap, internal linking, ISR; consider Google Search Console submission |
| **Supabase free tier storage limits** | Medium | Medium | Monitor usage; budget for Pro tier upgrade ($25/mo) |
| **Historical data backfill is large** | Medium | Low | Batch backfill over several days; prioritise ASX 200 first |
| **Plant sprites/illustrations require design work** | High | Medium | Use/commission a consistent sprite set; start with simple CSS-based plants, upgrade later |
| **Cosy design conflicts with data density** | Medium | Medium | Prioritise readability; use the aesthetic for chrome/accents, keep tables clean |

---

## 17. Success Metrics

### Phase 1 (Launch + 3 months)
| Metric | Target |
|--------|--------|
| Indexed pages in Google | > 2,000 ticker pages |
| Monthly organic visitors | > 5,000 |
| Average session duration | > 2 minutes |
| Bounce rate | < 60% |
| Lighthouse SEO score | > 95 |
| Core Web Vitals | All "Good" |

### Phase 2 (6-12 months post-launch)
| Metric | Target |
|--------|--------|
| Registered users | > 1,000 |
| Users with active gardens | > 30% of registered users |
| Daily active users | > 500 |
| Referral link click-through rate | > 2% |

---

## 18. Open Questions

1. **Domain:** Is `asxmarketcap.com` already registered? If not, should we secure it now?
2. **Legal disclaimer:** Do we need specific AFSL (Australian Financial Services License) disclaimers for displaying financial data? Likely yes - "This is not financial advice" type disclaimers.
3. **ASX data licensing:** Does the ASX require a license for redistributing delayed price data? Need legal review.
4. **Plant sprites:** Do we commission custom illustrations or use/adapt existing asset packs? Budget implications.
5. **Mobile app:** Is a native mobile app on the roadmap, or is responsive web sufficient for the foreseeable future?
6. **Analytics:** What analytics platform? Vercel Analytics, Google Analytics, or privacy-focused alternative (Plausible, Umami)?
7. **FMP ASX coverage audit:** Before development begins, we should run a test to confirm how many of the ~2,450 ASX tickers FMP actually covers.

---

*This is a living document. It will be updated as requirements are refined and implementation progresses.*
