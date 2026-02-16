-- Enable Row Level Security on all tables
-- anon role gets SELECT-only access
-- service_role bypasses RLS (used by cron sync jobs)

ALTER TABLE securities ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE income_statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE balance_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_flow_statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE key_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_peers ENABLE ROW LEVEL SECURITY;
ALTER TABLE etf_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE etf_holdings ENABLE ROW LEVEL SECURITY;
ALTER TABLE etf_sector_weights ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_log ENABLE ROW LEVEL SECURITY;

-- Public read access for all tables
CREATE POLICY "Public read access" ON securities FOR SELECT TO anon USING (true);
CREATE POLICY "Public read access" ON daily_prices FOR SELECT TO anon USING (true);
CREATE POLICY "Public read access" ON income_statements FOR SELECT TO anon USING (true);
CREATE POLICY "Public read access" ON balance_sheets FOR SELECT TO anon USING (true);
CREATE POLICY "Public read access" ON cash_flow_statements FOR SELECT TO anon USING (true);
CREATE POLICY "Public read access" ON key_metrics FOR SELECT TO anon USING (true);
CREATE POLICY "Public read access" ON stock_peers FOR SELECT TO anon USING (true);
CREATE POLICY "Public read access" ON etf_details FOR SELECT TO anon USING (true);
CREATE POLICY "Public read access" ON etf_holdings FOR SELECT TO anon USING (true);
CREATE POLICY "Public read access" ON etf_sector_weights FOR SELECT TO anon USING (true);
CREATE POLICY "Public read access" ON sync_log FOR SELECT TO anon USING (true);
