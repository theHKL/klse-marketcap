/**
 * Backfill all financial data by calling /api/cron/sync-financials in batches.
 *
 * Syncs: income statements, balance sheets, cash flow, key metrics,
 *        stock peers, ETF holdings, sector weights, ETF info.
 *
 * Usage:
 *   node scripts/backfill-financials.mjs
 *
 * Options (env vars):
 *   BACKFILL_SECRET  — required, must match CRON_SECRET in .env.local
 *   BASE_URL         — optional, defaults to http://localhost:3000
 *   BATCH_SIZE       — optional, securities per batch (default 50)
 *   START_OFFSET     — optional, resume from a specific offset (default 0)
 *
 * Requires the dev server running on localhost:3000.
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const SECRET = process.env.BACKFILL_SECRET;
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || '50', 10);
const START_OFFSET = parseInt(process.env.START_OFFSET || '0', 10);
const PAUSE_MS = 5000; // 5s pause between batches (financials are heavy — multiple Yahoo calls per security)

if (!SECRET) {
  console.error('Error: BACKFILL_SECRET env var is required.');
  console.error('Run with: BACKFILL_SECRET=your-secret node scripts/backfill-financials.mjs');
  process.exit(1);
}

async function runBackfill() {
  let offset = START_OFFSET;
  let totalProcessed = 0;
  let batchNum = 0;
  const totals = {
    incomeStatements: 0,
    balanceSheets: 0,
    cashFlows: 0,
    keyMetrics: 0,
    peers: 0,
    etfHoldings: 0,
    etfSectorWeights: 0,
    etfDetails: 0,
    errors: 0,
  };

  console.log(`Starting financials backfill (batch size: ${BATCH_SIZE})...`);
  if (START_OFFSET > 0) console.log(`Resuming from offset ${START_OFFSET}`);
  console.log();

  const startTime = Date.now();

  while (true) {
    batchNum++;
    const url = `${BASE_URL}/api/cron/sync-financials?secret=${SECRET}&offset=${offset}&limit=${BATCH_SIZE}`;

    console.log(`Batch ${batchNum}: offset=${offset}, limit=${BATCH_SIZE}`);

    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(600000) }); // 10min timeout
      const data = await res.json();

      if (!res.ok) {
        console.error(`  Error: ${data.error || data.message}`);
        console.error(`  Retrying in 30s...`);
        await new Promise((r) => setTimeout(r, 30000));
        continue;
      }

      totalProcessed += data.securitiesProcessed || 0;

      // Accumulate stats
      if (data.stats) {
        totals.incomeStatements += data.stats.incomeStatements || 0;
        totals.balanceSheets += data.stats.balanceSheets || 0;
        totals.cashFlows += data.stats.cashFlows || 0;
        totals.keyMetrics += data.stats.keyMetrics || 0;
        totals.peers += data.stats.peers || 0;
        totals.etfHoldings += data.stats.etfHoldings || 0;
        totals.etfSectorWeights += data.stats.etfSectorWeights || 0;
        totals.etfDetails += data.stats.etfDetails || 0;
      }
      totals.errors += data.errors || 0;

      console.log(`  Securities: ${data.securitiesProcessed} (${data.etfsProcessed || 0} ETFs)`);
      console.log(`  Records: income=${data.stats?.incomeStatements || 0}, balance=${data.stats?.balanceSheets || 0}, cashflow=${data.stats?.cashFlows || 0}, metrics=${data.stats?.keyMetrics || 0}, peers=${data.stats?.peers || 0}`);

      if (data.etfsProcessed > 0) {
        console.log(`  ETF: holdings=${data.stats?.etfHoldings || 0}, sectors=${data.stats?.etfSectorWeights || 0}, details=${data.stats?.etfDetails || 0}`);
      }

      if (data.errors > 0) {
        console.log(`  Errors: ${data.errors}`);
        data.errorDetails?.forEach((e) => console.log(`    - ${e}`));
      }

      if (data.nextOffset == null) {
        console.log('\nBackfill complete!');
        break;
      }

      offset = data.nextOffset;
      console.log(`  Remaining: ${data.remaining}`);

      // Progress estimate
      const elapsed = (Date.now() - startTime) / 1000;
      const pctDone = totalProcessed / (data.totalSecurities || 1);
      const estTotal = elapsed / pctDone;
      const estRemaining = Math.round(estTotal - elapsed);
      console.log(`  Progress: ${totalProcessed}/${data.totalSecurities} (${(pctDone * 100).toFixed(1)}%), ~${formatDuration(estRemaining)} remaining`);
      console.log();

      // Pause between batches
      await new Promise((r) => setTimeout(r, PAUSE_MS));
    } catch (err) {
      console.error(`  Fetch failed: ${err.message}`);
      console.error(`  Retrying in 30s...`);
      await new Promise((r) => setTimeout(r, 30000));
    }
  }

  const totalDuration = Math.round((Date.now() - startTime) / 1000);
  console.log(`\n--- Summary ---`);
  console.log(`Securities processed: ${totalProcessed}`);
  console.log(`Income statements:    ${totals.incomeStatements}`);
  console.log(`Balance sheets:       ${totals.balanceSheets}`);
  console.log(`Cash flow statements: ${totals.cashFlows}`);
  console.log(`Key metrics:          ${totals.keyMetrics}`);
  console.log(`Stock peers:          ${totals.peers}`);
  console.log(`ETF holdings:         ${totals.etfHoldings}`);
  console.log(`ETF sector weights:   ${totals.etfSectorWeights}`);
  console.log(`ETF details:          ${totals.etfDetails}`);
  console.log(`Errors:               ${totals.errors}`);
  console.log(`Duration:             ${formatDuration(totalDuration)}`);
}

function formatDuration(seconds) {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins < 60) return `${mins}m ${secs}s`;
  const hrs = Math.floor(mins / 60);
  const remainMins = mins % 60;
  return `${hrs}h ${remainMins}m`;
}

runBackfill();
