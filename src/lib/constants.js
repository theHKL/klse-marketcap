export const GICS_SECTORS = [
  'Basic Materials',
  'Communication Services',
  'Consumer Cyclical',
  'Consumer Defensive',
  'Energy',
  'Financial Services',
  'Healthcare',
  'Industrials',
  'Real Estate',
  'Technology',
  'Utilities',
];

/** Distinct colour for each GICS sector — bg is the soft tint, accent is the saturated shade. */
export const SECTOR_COLORS = {
  'Basic Materials':        { bg: '#E0ECFF', accent: '#3B6FA0' },
  'Communication Services': { bg: '#D6E8F5', accent: '#1565C0' },
  'Consumer Cyclical':      { bg: '#DBEAFE', accent: '#2563EB' },
  'Consumer Defensive':     { bg: '#D1FAE5', accent: '#059669' },
  'Energy':                 { bg: '#FEE2E2', accent: '#DC2626' },
  'Financial Services':     { bg: '#EDE9FE', accent: '#7C3AED' },
  'Healthcare':             { bg: '#CCFBF1', accent: '#0D9488' },
  'Industrials':            { bg: '#E2E8F0', accent: '#475569' },
  'Real Estate':            { bg: '#FCE7F3', accent: '#DB2777' },
  'Technology':             { bg: '#DBEAFE', accent: '#1D4ED8' },
  'Utilities':              { bg: '#ECFCCB', accent: '#65A30D' },
};

export const SYNC_INTERVALS = {
  INTRADAY_MS: 5 * 60 * 1000,       // 5 minutes
  EOD_HOUR_UTC: 9,                    // 9:15 UTC = 17:15 MYT (after market close)
  PROFILE_HOUR_UTC: 20,              // 8 PM UTC = 4:00 AM MYT
  FINANCIALS_HOUR_UTC: 16,           // 4 PM UTC Sunday = 12 AM MYT Monday
};

export const PAGE_SIZE = 50;

export const CHART_RANGES = ['7d', '1m', '3m', '6m', '1y', '5y', 'all'];

export const SCREENER_TABS = [
  {
    label: 'All',
    href: '/',
    type: 'all',
    title: 'KLSE Securities by Market Cap',
    description: 'Showing {total} actively traded securities on Bursa Malaysia',
    descriptionFallback: 'Browse KLSE-listed securities by market capitalisation',
    breadcrumb: 'Securities',
  },
  {
    label: 'Stocks',
    href: '/stocks',
    type: 'stock',
    title: 'KLSE Stocks by Market Cap',
    description: 'Showing {total} actively traded stocks on Bursa Malaysia',
    descriptionFallback: 'Browse KLSE-listed stocks by market capitalisation',
    breadcrumb: 'Stocks',
  },
  {
    label: 'ETFs',
    href: '/etfs',
    type: 'etf',
    title: 'KLSE ETFs',
    description: 'Showing {total} actively traded ETFs on Bursa Malaysia',
    descriptionFallback: 'Browse KLSE-listed ETFs by assets under management',
    breadcrumb: 'ETFs',
    defaultSort: 'aum',
  },
  {
    label: 'REITs',
    href: '/reits',
    type: 'reit',
    title: 'KLSE REITs by Market Cap',
    description: 'Showing {total} actively traded REITs on Bursa Malaysia',
    descriptionFallback: 'Browse KLSE-listed Real Estate Investment Trusts by market capitalisation',
    breadcrumb: 'REITs',
  },
];

export const SECURITIES_SELECT =
  'id, symbol, name, type, sector, industry, market_cap, price, change_1d_pct, change_7d_pct, volume, logo_url, beta, pe_ratio, eps, dividend_yield, year_high, year_low, price_avg_50, price_avg_200';

export const FUND_SECURITIES_SELECT =
  'id, symbol, name, type, sector, industry, market_cap, price, change_1d_pct, change_7d_pct, volume, logo_url, beta, pe_ratio, eps, dividend_yield, year_high, year_low, price_avg_50, price_avg_200, etf_details(aum, expense_ratio)';

export const KLSE_MARKET_HOURS = {
  morning: { open: { hour: 9, minute: 0 }, close: { hour: 12, minute: 30 } },
  afternoon: { open: { hour: 14, minute: 30 }, close: { hour: 17, minute: 0 } },
  timezone: 'Asia/Kuala_Lumpur',
};
