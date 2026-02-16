-- Performance indexes for KLSE MarketCap

-- Screener queries (sorted/filtered)
CREATE INDEX idx_securities_type_market_cap ON securities(type, market_cap DESC);
CREATE INDEX idx_securities_type_sector ON securities(type, sector);
CREATE INDEX idx_securities_symbol ON securities(symbol);
CREATE INDEX idx_securities_fmp_symbol ON securities(fmp_symbol);
CREATE INDEX idx_securities_active ON securities(is_actively_trading);

-- Daily prices (chart queries)
CREATE INDEX idx_daily_prices_security_date ON daily_prices(security_id, date DESC);

-- Financial statements (detail page)
CREATE INDEX idx_income_security ON income_statements(security_id, period, date DESC);
CREATE INDEX idx_balance_security ON balance_sheets(security_id, period, date DESC);
CREATE INDEX idx_cashflow_security ON cash_flow_statements(security_id, period, date DESC);

-- Key metrics
CREATE INDEX idx_key_metrics_security ON key_metrics(security_id, date DESC);

-- Stock peers
CREATE INDEX idx_stock_peers_security ON stock_peers(security_id);

-- ETF
CREATE INDEX idx_etf_holdings_security ON etf_holdings(etf_security_id);
CREATE INDEX idx_etf_sector_weights_security ON etf_sector_weights(security_id);

-- Sync log
CREATE INDEX idx_sync_log_job ON sync_log(job_name, started_at DESC);
