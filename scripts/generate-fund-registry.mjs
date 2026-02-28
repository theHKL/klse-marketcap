/**
 * Generate a CSV registry of all active ETFs and funds from Supabase.
 *
 * Usage:
 *   node scripts/generate-fund-registry.mjs
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env.local.
 * Writes output to scripts/fund-registry.csv.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// Parse .env.local for required keys
function loadEnv() {
  const envPath = resolve(ROOT, '.env.local');
  const lines = readFileSync(envPath, 'utf-8').split('\n');
  const env = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    env[key] = value;
  }
  return env;
}

function escapeCsv(value) {
  if (value == null) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

async function main() {
  const env = loadEnv();
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('Fetching ETFs and funds from Supabase...');

  // Fetch all active ETFs and funds with their issuer from etf_details
  const { data, error } = await supabase
    .from('securities')
    .select('symbol, name, type, etf_details(issuer)')
    .in('type', ['etf', 'fund'])
    .eq('is_actively_trading', true)
    .order('type')
    .order('symbol');

  if (error) {
    console.error('Supabase query error:', error.message);
    process.exit(1);
  }

  if (!data || data.length === 0) {
    console.error('No ETFs or funds found.');
    process.exit(1);
  }

  // Build CSV
  const header = 'symbol,name,type,issuer';
  const rows = data.map((row) => {
    const issuer = row.etf_details?.[0]?.issuer || row.etf_details?.issuer || '';
    return [
      escapeCsv(row.symbol),
      escapeCsv(row.name),
      escapeCsv(row.type),
      escapeCsv(issuer),
    ].join(',');
  });

  const csv = [header, ...rows].join('\n') + '\n';
  const outPath = resolve(__dirname, 'fund-registry.csv');
  writeFileSync(outPath, csv, 'utf-8');

  console.log(`Wrote ${data.length} records to ${outPath}`);
}

main();
