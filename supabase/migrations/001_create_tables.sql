-- KLSE MarketCap — Phase 1 Database Schema
-- 11 tables for Bursa Malaysia securities data

-- Securities: main table for all listed securities
CREATE TABLE securities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol TEXT UNIQUE NOT NULL,
  fmp_symbol TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('stock', 'etf', 'fund')),
  is_actively_trading BOOLEAN DEFAULT true,
  sector TEXT,
  industry TEXT,
  description TEXT,
  logo_url TEXT,
  website TEXT,
  ceo TEXT,
  employees INTEGER,
  ipo_date DATE,
  currency TEXT DEFAULT 'MYR',
  price NUMERIC(12,4),
  change_1d NUMERIC(10,4),
  change_1d_pct NUMERIC(8,4),
  change_7d_pct NUMERIC(8,4),
  volume BIGINT,
  day_high NUMERIC(12,4),
  day_low NUMERIC(12,4),
  day_open NUMERIC(12,4),
  previous_close NUMERIC(12,4),
  market_cap BIGINT,
  year_high NUMERIC(12,4),
  year_low NUMERIC(12,4),
  price_avg_50 NUMERIC(12,4),
  price_avg_200 NUMERIC(12,4),
  all_time_high NUMERIC(12,4),
  all_time_high_date DATE,
  all_time_low NUMERIC(12,4),
  all_time_low_date DATE,
  beta NUMERIC(8,4),
  pe_ratio NUMERIC(10,4),
  eps NUMERIC(10,4),
  dividend_yield NUMERIC(8,6),
  last_annual_dividend NUMERIC(10,4),
  last_price_sync TIMESTAMPTZ,
  last_profile_sync TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Daily prices: historical OHLCV data
CREATE TABLE daily_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  security_id UUID NOT NULL REFERENCES securities(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  open NUMERIC(12,4),
  high NUMERIC(12,4),
  low NUMERIC(12,4),
  close NUMERIC(12,4),
  volume BIGINT,
  change NUMERIC(10,4),
  change_percent NUMERIC(8,4),
  vwap NUMERIC(12,4),
  UNIQUE(security_id, date)
);

-- Income statements
CREATE TABLE income_statements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  security_id UUID NOT NULL REFERENCES securities(id) ON DELETE CASCADE,
  period TEXT NOT NULL CHECK (period IN ('FY', 'Q1', 'Q2', 'Q3', 'Q4')),
  date DATE NOT NULL,
  fiscal_year TEXT,
  reported_currency TEXT DEFAULT 'MYR',
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

-- Balance sheets
CREATE TABLE balance_sheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  security_id UUID NOT NULL REFERENCES securities(id) ON DELETE CASCADE,
  period TEXT NOT NULL CHECK (period IN ('FY', 'Q1', 'Q2', 'Q3', 'Q4')),
  date DATE NOT NULL,
  fiscal_year TEXT,
  reported_currency TEXT DEFAULT 'MYR',
  total_assets BIGINT,
  total_liabilities BIGINT,
  total_stockholders_equity BIGINT,
  total_debt BIGINT,
  net_debt BIGINT,
  cash_and_cash_equivalents BIGINT,
  UNIQUE(security_id, date, period)
);

-- Cash flow statements
CREATE TABLE cash_flow_statements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  security_id UUID NOT NULL REFERENCES securities(id) ON DELETE CASCADE,
  period TEXT NOT NULL CHECK (period IN ('FY', 'Q1', 'Q2', 'Q3', 'Q4')),
  date DATE NOT NULL,
  fiscal_year TEXT,
  reported_currency TEXT DEFAULT 'MYR',
  operating_cash_flow BIGINT,
  capital_expenditure BIGINT,
  free_cash_flow BIGINT,
  dividends_paid BIGINT,
  UNIQUE(security_id, date, period)
);

-- Key metrics
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
  enterprise_value BIGINT,
  revenue_per_share NUMERIC(10,4),
  net_income_per_share NUMERIC(10,4),
  book_value_per_share NUMERIC(10,4),
  UNIQUE(security_id, date)
);

-- Stock peers
CREATE TABLE stock_peers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  security_id UUID NOT NULL REFERENCES securities(id) ON DELETE CASCADE,
  peer_fmp_symbol TEXT NOT NULL,
  UNIQUE(security_id, peer_fmp_symbol)
);

-- ETF details
CREATE TABLE etf_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  security_id UUID NOT NULL REFERENCES securities(id) ON DELETE CASCADE UNIQUE,
  expense_ratio NUMERIC(6,4),
  aum BIGINT,
  nav NUMERIC(12,4),
  nav_currency TEXT DEFAULT 'MYR',
  issuer TEXT,
  inception_date DATE,
  asset_class TEXT,
  holdings_count INTEGER,
  category TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ETF holdings
CREATE TABLE etf_holdings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  etf_security_id UUID NOT NULL REFERENCES securities(id) ON DELETE CASCADE,
  holding_symbol TEXT,
  holding_name TEXT,
  weight_percentage NUMERIC(8,4),
  shares BIGINT,
  market_value BIGINT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ETF sector weights
CREATE TABLE etf_sector_weights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  security_id UUID NOT NULL REFERENCES securities(id) ON DELETE CASCADE,
  sector TEXT NOT NULL,
  weight_percentage NUMERIC(6,4),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(security_id, sector)
);

-- Sync log
CREATE TABLE sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  status TEXT CHECK (status IN ('running', 'completed', 'failed')),
  records_processed INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
