import { NextResponse } from 'next/server';
import { getBulkQuotes } from '@/lib/fmp';
import {
  verifyCronSecret,
  createServiceClient,
  logSyncStart,
  logSyncComplete,
  logSyncFail,
  getMYTDate,
  formatDate,
} from '@/lib/cron-helpers';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET(request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceClient();
  const logId = await logSyncStart(supabase, 'sync-eod');

  try {
    // Fetch all active securities
    const { data: securities, error: fetchErr } = await supabase
      .from('securities')
      .select('id, fmp_symbol')
      .eq('is_actively_trading', true)
      .not('fmp_symbol', 'is', null);

    if (fetchErr) throw new Error(`Failed to fetch securities: ${fetchErr.message}`);
    if (!securities || securities.length === 0) {
      await logSyncComplete(supabase, logId, 0);
      return NextResponse.json({ status: 'ok', message: 'No active securities', records: 0 });
    }

    const symbolToId = {};
    for (const sec of securities) {
      symbolToId[sec.fmp_symbol] = sec.id;
    }

    const fmpSymbols = securities.map((s) => s.fmp_symbol);
    const today = formatDate(getMYTDate());

    // Get quotes for all active securities
    const quotes = await getBulkQuotes(fmpSymbols);

    let processed = 0;

    for (const quote of quotes) {
      const secId = symbolToId[quote.symbol];
      if (!secId) continue;

      try {
        // Upsert daily_prices for today
        const { error: dpErr } = await supabase
          .from('daily_prices')
          .upsert(
            {
              security_id: secId,
              date: today,
              open: quote.open,
              high: quote.dayHigh,
              low: quote.dayLow,
              close: quote.price,
              volume: quote.volume,
              change: quote.change,
              change_percent: quote.changesPercentage,
            },
            { onConflict: 'security_id,date' }
          );

        if (dpErr) {
          console.error(`[sync-eod] daily_prices upsert failed for ${quote.symbol}:`, dpErr.message);
          continue;
        }

        // Calculate change_7d_pct: get close from ~7 trading days ago
        const { data: pastPrices } = await supabase
          .from('daily_prices')
          .select('close, date')
          .eq('security_id', secId)
          .lt('date', today)
          .order('date', { ascending: false })
          .limit(7);

        let change7dPct = null;
        if (pastPrices && pastPrices.length >= 7) {
          const oldClose = pastPrices[6].close; // 7th most recent trading day
          if (oldClose && oldClose > 0) {
            change7dPct = ((quote.price - oldClose) / oldClose) * 100;
          }
        } else if (pastPrices && pastPrices.length > 0) {
          // Use oldest available if fewer than 7 trading days
          const oldClose = pastPrices[pastPrices.length - 1].close;
          if (oldClose && oldClose > 0) {
            change7dPct = ((quote.price - oldClose) / oldClose) * 100;
          }
        }

        // Year high/low: MAX(high) and MIN(low) over last 252 trading days
        const { data: yearStats } = await supabase
          .from('daily_prices')
          .select('high, low')
          .eq('security_id', secId)
          .order('date', { ascending: false })
          .limit(252);

        let yearHigh = null;
        let yearLow = null;
        if (yearStats && yearStats.length > 0) {
          yearHigh = Math.max(...yearStats.map((r) => r.high).filter(Boolean));
          yearLow = Math.min(...yearStats.map((r) => r.low).filter(Boolean));
        }

        // All-time high/low: check current security values and update if exceeded
        const { data: secData } = await supabase
          .from('securities')
          .select('all_time_high, all_time_low')
          .eq('id', secId)
          .single();

        const updates = {
          change_7d_pct: change7dPct,
          year_high: yearHigh,
          year_low: yearLow,
        };

        if (
          quote.price &&
          (!secData?.all_time_high || quote.price > secData.all_time_high)
        ) {
          updates.all_time_high = quote.price;
          updates.all_time_high_date = today;
        }

        if (
          quote.price &&
          (!secData?.all_time_low || quote.price < secData.all_time_low)
        ) {
          updates.all_time_low = quote.price;
          updates.all_time_low_date = today;
        }

        const { error: updateErr } = await supabase
          .from('securities')
          .update(updates)
          .eq('id', secId);

        if (updateErr) {
          console.error(`[sync-eod] securities update failed for ${quote.symbol}:`, updateErr.message);
          continue;
        }

        processed++;
      } catch (innerErr) {
        console.error(`[sync-eod] Error processing ${quote.symbol}:`, innerErr.message);
      }
    }

    await logSyncComplete(supabase, logId, processed);
    return NextResponse.json({ status: 'ok', records: processed });
  } catch (err) {
    console.error('[sync-eod] Fatal error:', err.message);
    await logSyncFail(supabase, logId, err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
