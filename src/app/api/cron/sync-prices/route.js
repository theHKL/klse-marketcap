import { NextResponse } from 'next/server';
import { getBulkQuotes } from '@/lib/fmp';
import {
  verifyCronSecret,
  createServiceClient,
  logSyncStart,
  logSyncComplete,
  logSyncFail,
  isMarketHours,
} from '@/lib/cron-helpers';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function GET(request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Skip if outside KLSE market hours
  if (!isMarketHours()) {
    return NextResponse.json({
      status: 'skipped',
      message: 'Outside KLSE market hours (9:00-12:30, 14:30-17:00 MYT, Mon-Fri)',
    });
  }

  const supabase = createServiceClient();
  const logId = await logSyncStart(supabase, 'sync-prices');

  try {
    // Fetch all actively trading securities
    const { data: securities, error: fetchErr } = await supabase
      .from('securities')
      .select('id, fmp_symbol')
      .eq('is_actively_trading', true)
      .not('fmp_symbol', 'is', null);

    if (fetchErr) throw new Error(`Failed to fetch securities: ${fetchErr.message}`);
    if (!securities || securities.length === 0) {
      await logSyncComplete(supabase, logId, 0);
      return NextResponse.json({ status: 'ok', message: 'No active securities found', records: 0 });
    }

    // Build a lookup map: fmp_symbol -> security id
    const symbolToId = {};
    for (const sec of securities) {
      symbolToId[sec.fmp_symbol] = sec.id;
    }

    const fmpSymbols = securities.map((s) => s.fmp_symbol);

    // Batch quotes (getBulkQuotes already batches into groups of 50)
    const quotes = await getBulkQuotes(fmpSymbols);

    let processed = 0;
    const now = new Date().toISOString();

    // Upsert each quote into securities
    for (const quote of quotes) {
      const secId = symbolToId[quote.symbol];
      if (!secId) continue;

      const { error: upsertErr } = await supabase
        .from('securities')
        .update({
          price: quote.price,
          change_1d: quote.change,
          change_1d_pct: quote.changesPercentage,
          volume: quote.volume,
          day_high: quote.dayHigh,
          day_low: quote.dayLow,
          day_open: quote.open,
          market_cap: quote.marketCap,
          previous_close: quote.previousClose,
          pe_ratio: quote.pe,
          eps: quote.eps,
          last_price_sync: now,
        })
        .eq('id', secId);

      if (upsertErr) {
        console.error(`[sync-prices] Failed to update ${quote.symbol}:`, upsertErr.message);
        continue;
      }
      processed++;
    }

    await logSyncComplete(supabase, logId, processed);
    return NextResponse.json({ status: 'ok', records: processed });
  } catch (err) {
    console.error('[sync-prices] Fatal error:', err.message);
    await logSyncFail(supabase, logId, err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
