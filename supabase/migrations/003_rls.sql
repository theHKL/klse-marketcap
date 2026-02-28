-- KLSE MarketCap — Row Level Security
-- Enable RLS and create policies for all tables.
-- service_role bypasses RLS automatically (used by cron sync jobs).

-- ===========================================
-- ENABLE RLS ON ALL TABLES
-- ===========================================
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
ALTER TABLE etf_metrics_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE symbol_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlist_items ENABLE ROW LEVEL SECURITY;

-- ===========================================
-- PUBLIC READ POLICIES (anon + authenticated)
-- ===========================================
CREATE POLICY "Public read securities" ON securities FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read daily_prices" ON daily_prices FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read income_statements" ON income_statements FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read balance_sheets" ON balance_sheets FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read cash_flow_statements" ON cash_flow_statements FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read key_metrics" ON key_metrics FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read stock_peers" ON stock_peers FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read etf_details" ON etf_details FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read etf_holdings" ON etf_holdings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read etf_sector_weights" ON etf_sector_weights FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read etf_metrics_history" ON etf_metrics_history FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read market_events" ON market_events FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read event_returns" ON event_returns FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read symbol_aliases" ON symbol_aliases FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read sync_log" ON sync_log FOR SELECT TO anon, authenticated USING (true);

-- ===========================================
-- PROFILE POLICIES (own-row access)
-- ===========================================
CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);

-- ===========================================
-- WATCHLIST POLICIES (own-row access)
-- ===========================================
CREATE POLICY "Users can read own watchlists" ON watchlists
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own watchlists" ON watchlists
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own watchlists" ON watchlists
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own watchlists" ON watchlists
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ===========================================
-- WATCHLIST ITEMS POLICIES (own-row access)
-- ===========================================
CREATE POLICY "Users can read own watchlist items" ON watchlist_items
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own watchlist items" ON watchlist_items
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own watchlist items" ON watchlist_items
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
