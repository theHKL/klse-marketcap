import { NextResponse } from 'next/server';
import { getQuotes } from '@/lib/yahoo/client';
import { transformQuote } from '@/lib/yahoo/transforms';
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
      .select('id, yahoo_symbol')
      .eq('is_actively_trading', true)
      .not('yahoo_symbol', 'is', null);

    if (fetchErr) throw new Error(`Failed to fetch securities: ${fetchErr.message}`);
    if (!securities || securities.length === 0) {
      await logSyncComplete(supabase, logId, 0);
      return NextResponse.json({ status: 'ok', message: 'No active securities found', records: 0 });
    }

    // Build a lookup map: yahoo_symbol -> security id
    const symbolToId = {};
    for (const sec of securities) {
      symbolToId[sec.yahoo_symbol] = sec.id;
    }

    const yahooSymbols = securities.map((s) => s.yahoo_symbol);

    // Batch quotes using yahoo-finance2
    const quotes = await getQuotes(yahooSymbols);

    let processed = 0;
    const now = new Date().toISOString();

    // Upsert each quote into securities
    for (const rawQuote of quotes) {
      const quote = transformQuote(rawQuote);
      if (!quote) continue;

      const secId = symbolToId[rawQuote.symbol];
      if (!secId) continue;

      const { error: upsertErr } = await supabase
        .from('securities')
        .update({
          price: quote.price,
          change_1d: quote.change_1d,
          change_1d_pct: quote.change_1d_pct,
          volume: quote.volume,
          day_high: quote.day_high,
          day_low: quote.day_low,
          day_open: quote.day_open,
          market_cap: quote.market_cap,
          previous_close: quote.previous_close,
          pe_ratio: quote.pe_ratio,
          eps: quote.eps,
          last_price_sync: now,
        })
        .eq('id', secId);

      if (upsertErr) {
        console.error(`[sync-prices] Failed to update ${rawQuote.symbol}:`, upsertErr.message);
        continue;
      }
      processed++;
    }

    await logSyncComplete(supabase, logId, processed);
    return NextResponse.json({ status: 'ok', records: processed });
  } catch (err) {
    console.error('[sync-prices] Fatal error:', err.message);
    await logSyncFail(supabase, logId, err.message);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}
