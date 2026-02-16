-- Auto-update updated_at timestamp on row changes

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to tables with updated_at column
CREATE TRIGGER set_updated_at_securities
  BEFORE UPDATE ON securities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_etf_details
  BEFORE UPDATE ON etf_details
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
