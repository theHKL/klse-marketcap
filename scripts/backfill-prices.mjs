/**
 * Backfill all historical prices by calling /api/cron/sync-eod in batches.
 *
 * Usage:
 *   node scripts/backfill-prices.mjs
 *
 * Requires the dev server running on localhost:3000.
 * Set BACKFILL_SECRET in .env.local.
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const SECRET = process.env.BACKFILL_SECRET;
const BATCH_SIZE = 100;

if (!SECRET) {
  console.error('Error: BACKFILL_SECRET env var is required.');
  console.error('Run with: BACKFILL_SECRET=your-secret node scripts/backfill-prices.mjs');
  process.exit(1);
}

async function runBackfill() {
  let offset = 0;
  let totalProcessed = 0;
  let totalPrices = 0;
  let batchNum = 0;

  console.log('Starting price backfill...\n');

  while (true) {
    batchNum++;
    const url = `${BASE_URL}/api/cron/sync-eod?secret=${SECRET}&offset=${offset}&limit=${BATCH_SIZE}`;

    console.log(`Batch ${batchNum}: offset=${offset}, limit=${BATCH_SIZE}`);

    try {
      const res = await fetch(url);
      const data = await res.json();

      if (!res.ok) {
        console.error(`  Error: ${data.error || data.message}`);
        break;
      }

      totalProcessed += data.batchProcessed || 0;
      totalPrices += data.pricesInserted || 0;

      console.log(`  Processed: ${data.batchProcessed} securities, ${data.pricesInserted} prices inserted`);

      if (data.errors > 0) {
        console.log(`  Errors: ${data.errors}`);
        data.errorDetails?.forEach((e) => console.log(`    - ${e}`));
      }

      if (data.nextOffset == null) {
        console.log('\nBackfill complete!');
        break;
      }

      offset = data.nextOffset;
      console.log(`  Remaining: ${data.remaining}\n`);

      // Brief pause between batches to avoid overwhelming the server
      await new Promise((r) => setTimeout(r, 2000));
    } catch (err) {
      console.error(`  Fetch failed: ${err.message}`);
      console.error(`  Retrying in 10s...`);
      await new Promise((r) => setTimeout(r, 10000));
    }
  }

  console.log(`\nTotal: ${totalProcessed} securities, ${totalPrices} prices inserted`);
}

runBackfill();
