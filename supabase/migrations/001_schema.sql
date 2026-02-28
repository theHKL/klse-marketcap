-- KLSE MarketCap — Core Data Schema
-- All tables for Bursa Malaysia securities data (fresh Supabase project)

-- ===========================================
-- SECURITIES TABLE
-- ===========================================
CREATE TABLE securities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol TEXT UNIQUE NOT NULL,
  yahoo_symbol TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('stock', 'etf', 'fund', 'hybrid')),
  is_actively_trading BOOLEAN DEFAULT true,

  -- Profile data
  sector TEXT,
  industry TEXT,
  description TEXT,
  logo_url TEXT,
  website TEXT,
  ceo TEXT,
  employees INTEGER,
  ipo_date DATE,
  currency TEXT DEFAULT 'MYR',
  exchange TEXT,
  country TEXT,
  parent_symbol TEXT,

  -- Quote data (intraday sync)
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

  -- Range data
  year_high NUMERIC(12,4),
  year_low NUMERIC(12,4),
  price_avg_50 NUMERIC(12,4),
  price_avg_200 NUMERIC(12,4),

  -- ATH/ATL
  all_time_high NUMERIC(12,4),
  all_time_high_date DATE,
  all_time_low NUMERIC(12,4),
  all_time_low_date DATE,

  -- Key metrics snapshot
  beta NUMERIC(8,4),
  pe_ratio NUMERIC(10,4),
  eps NUMERIC(10,4),
  dividend_yield NUMERIC(8,6),
  last_annual_dividend NUMERIC(10,4),

  -- Timestamps
  last_price_sync TIMESTAMPTZ,
  last_profile_sync TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ===========================================
-- DAILY PRICES TABLE
-- ===========================================
CREATE TABLE daily_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  security_id UUID NOT NULL REFERENCES securities(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  open NUMERIC(12,4),
  high NUMERIC(12,4),
  low NUMERIC(12,4),
  close NUMERIC(12,4),
  adj_close NUMERIC(12,4),
  volume BIGINT,
  change NUMERIC(10,4),
  change_percent NUMERIC(8,4),
  vwap NUMERIC(12,4),
  UNIQUE(security_id, date)
);

-- ===========================================
-- INCOME STATEMENTS TABLE
-- ===========================================
CREATE TABLE income_statements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  security_id UUID NOT NULL REFERENCES securities(id) ON DELETE CASCADE,
  period TEXT NOT NULL CHECK (period IN ('FY', 'Q1', 'Q2', 'Q3', 'Q4')),
  date DATE NOT NULL,
  fiscal_year TEXT,
  reported_currency TEXT DEFAULT 'MYR',
  revenue NUMERIC,
  gross_profit NUMERIC,
  operating_income NUMERIC,
  operating_expenses NUMERIC,
  net_income NUMERIC,
  eps NUMERIC,
  eps_diluted NUMERIC,
  ebitda NUMERIC,
  UNIQUE(security_id, date, period)
);

-- ===========================================
-- BALANCE SHEETS TABLE
-- ===========================================
CREATE TABLE balance_sheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  security_id UUID NOT NULL REFERENCES securities(id) ON DELETE CASCADE,
  period TEXT NOT NULL CHECK (period IN ('FY', 'Q1', 'Q2', 'Q3', 'Q4')),
  date DATE NOT NULL,
  fiscal_year TEXT,
  reported_currency TEXT DEFAULT 'MYR',
  total_assets NUMERIC,
  total_liabilities NUMERIC,
  total_stockholders_equity NUMERIC,
  total_debt NUMERIC,
  net_debt NUMERIC,
  cash_and_cash_equivalents NUMERIC,
  UNIQUE(security_id, date, period)
);

-- ===========================================
-- CASH FLOW STATEMENTS TABLE
-- ===========================================
CREATE TABLE cash_flow_statements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  security_id UUID NOT NULL REFERENCES securities(id) ON DELETE CASCADE,
  period TEXT NOT NULL CHECK (period IN ('FY', 'Q1', 'Q2', 'Q3', 'Q4')),
  date DATE NOT NULL,
  fiscal_year TEXT,
  reported_currency TEXT DEFAULT 'MYR',
  operating_cash_flow NUMERIC,
  capital_expenditure NUMERIC,
  free_cash_flow NUMERIC,
  dividends_paid NUMERIC,
  UNIQUE(security_id, date, period)
);

-- ===========================================
-- KEY METRICS TABLE
-- ===========================================
CREATE TABLE key_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  security_id UUID NOT NULL REFERENCES securities(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  pe_ratio NUMERIC,
  ps_ratio NUMERIC,
  pb_ratio NUMERIC,
  eps NUMERIC,
  dividend_yield NUMERIC,
  roe NUMERIC,
  roa NUMERIC,
  debt_to_equity NUMERIC,
  current_ratio NUMERIC,
  market_cap NUMERIC,
  enterprise_value NUMERIC,
  revenue_per_share NUMERIC,
  net_income_per_share NUMERIC,
  book_value_per_share NUMERIC,
  UNIQUE(security_id, date)
);

-- ===========================================
-- STOCK PEERS TABLE
-- ===========================================
CREATE TABLE stock_peers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  security_id UUID NOT NULL REFERENCES securities(id) ON DELETE CASCADE,
  peer_yahoo_symbol TEXT NOT NULL,
  UNIQUE(security_id, peer_yahoo_symbol)
);

-- ===========================================
-- ETF DETAILS TABLE
-- ===========================================
CREATE TABLE etf_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  security_id UUID NOT NULL UNIQUE REFERENCES securities(id) ON DELETE CASCADE,
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

-- ===========================================
-- ETF HOLDINGS TABLE
-- ===========================================
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

-- ===========================================
-- ETF SECTOR WEIGHTS TABLE
-- ===========================================
CREATE TABLE etf_sector_weights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  security_id UUID NOT NULL REFERENCES securities(id) ON DELETE CASCADE,
  sector TEXT NOT NULL,
  weight_percentage NUMERIC(8,4),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(security_id, sector)
);

-- ===========================================
-- ETF METRICS HISTORY TABLE
-- ===========================================
CREATE TABLE etf_metrics_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  security_id UUID NOT NULL REFERENCES securities(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  aum BIGINT,
  nav NUMERIC(12,4),
  expense_ratio NUMERIC(6,4),
  dividend_yield NUMERIC(8,6),
  holdings_count INTEGER,
  UNIQUE(security_id, date)
);

-- ===========================================
-- MARKET EVENTS TABLE
-- ===========================================
CREATE TABLE market_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  event_date DATE NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'global' CHECK (category IN ('global', 'my')),
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ===========================================
-- EVENT RETURNS TABLE
-- ===========================================
CREATE TABLE event_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES market_events(id) ON DELETE CASCADE,
  security_id UUID NOT NULL REFERENCES securities(id) ON DELETE CASCADE,
  change_pct NUMERIC(10,4),
  price_at_event NUMERIC(12,4),
  current_price_at_calc NUMERIC(12,4),
  calculated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(event_id, security_id)
);

-- ===========================================
-- SYMBOL ALIASES TABLE
-- ===========================================
CREATE TABLE symbol_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  old_symbol TEXT NOT NULL UNIQUE,
  new_symbol TEXT NOT NULL,
  security_id UUID NOT NULL REFERENCES securities(id) ON DELETE CASCADE,
  changed_date DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ===========================================
-- SYNC LOG TABLE
-- ===========================================
CREATE TABLE sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'failed')),
  records_processed INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ===========================================
-- INDEXES
-- ===========================================

-- Securities
CREATE INDEX idx_securities_type_mcap ON securities(type, market_cap DESC NULLS LAST);
CREATE INDEX idx_securities_type_sector ON securities(type, sector);
CREATE INDEX idx_securities_symbol_lower ON securities(LOWER(symbol));
CREATE INDEX idx_securities_yahoo_symbol ON securities(yahoo_symbol);
CREATE INDEX idx_securities_active ON securities(is_actively_trading) WHERE is_actively_trading = true;
CREATE INDEX idx_securities_parent ON securities(parent_symbol) WHERE parent_symbol IS NOT NULL;
CREATE INDEX idx_securities_search ON securities USING gin(
  to_tsvector('english', symbol || ' ' || name)
);

-- Daily prices
CREATE INDEX idx_daily_prices_sid_date ON daily_prices(security_id, date DESC);

-- Financial statements
CREATE INDEX idx_income_sid_date ON income_statements(security_id, date DESC);
CREATE INDEX idx_balance_sid_date ON balance_sheets(security_id, date DESC);
CREATE INDEX idx_cashflow_sid_date ON cash_flow_statements(security_id, date DESC);
CREATE INDEX idx_metrics_sid_date ON key_metrics(security_id, date DESC);

-- Stock peers
CREATE INDEX idx_peers_sid ON stock_peers(security_id);

-- ETF
CREATE INDEX idx_etf_holdings_eid ON etf_holdings(etf_security_id);
CREATE INDEX idx_etf_sectors_sid ON etf_sector_weights(security_id);
CREATE INDEX idx_etf_metrics_history_lookup ON etf_metrics_history(security_id, date);

-- Market events & returns
CREATE INDEX idx_market_events_active ON market_events(is_active, category, display_order);
CREATE INDEX idx_event_returns_eid ON event_returns(event_id);
CREATE INDEX idx_event_returns_eid_sid ON event_returns(event_id, security_id);

-- Symbol aliases
CREATE INDEX idx_symbol_aliases_old ON symbol_aliases(LOWER(old_symbol));

-- Sync log
CREATE INDEX idx_sync_log_job ON sync_log(job_name, started_at DESC);
