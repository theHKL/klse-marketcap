import { NextResponse } from 'next/server';
import { getQuoteSummary, yahooBatchFetch, screenKlseSecurities } from '@/lib/yahoo/client';
import { stripSuffix, mapSecurityType, transformEtfInfo } from '@/lib/yahoo/transforms';
import {
  verifyCronSecret,
  createServiceClient,
  logSyncStart,
  logSyncComplete,
  logSyncFail,
  sleep,
} from '@/lib/cron-helpers';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET(request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceClient();
  const logId = await logSyncStart(supabase, 'sync-profiles');

  try {
    // Discover KLSE securities using Yahoo screener (paginated)
    const allQuotes = [];
    for (let offset = 0; offset < 5000; offset += 250) {
      const batch = await screenKlseSecurities(offset, 250);
      if (!batch || batch.length === 0) break;
      allQuotes.push(...batch);
      if (batch.length < 250) break;
      await sleep(200);
    }

    // Build sets for quick lookup
    const yahooSymbols = new Set(allQuotes.map((q) => q.symbol).filter(Boolean));

    // Fetch existing securities from DB
    const { data: existingSecurities, error: fetchErr } = await supabase
      .from('securities')
      .select('id, symbol, yahoo_symbol, type');

    if (fetchErr) throw new Error(`Failed to fetch securities: ${fetchErr.message}`);

    const existingByYahooSymbol = {};
    for (const sec of existingSecurities || []) {
      if (sec.yahoo_symbol) {
        existingByYahooSymbol[sec.yahoo_symbol] = sec;
      }
    }

    // Insert new tickers / fix type for existing ones
    for (const q of allQuotes) {
      if (!q.symbol) continue;

      const localSymbol = stripSuffix(q.symbol);
      const type = mapSecurityType(q.quoteType, q.symbol);
      const existing = existingByYahooSymbol[q.symbol];

      // Fix type if an ETF was previously stored as 'stock'
      if (existing && existing.type !== type) {
        await supabase
          .from('securities')
          .update({ type })
          .eq('id', existing.id);
        continue;
      }

      if (existing) continue;

      const { error: insertErr } = await supabase.from('securities').upsert(
        {
          symbol: localSymbol,
          yahoo_symbol: q.symbol,
          name: q.longName || q.shortName || localSymbol,
          type,
          is_actively_trading: true,
          currency: 'MYR',
        },
        { onConflict: 'yahoo_symbol' }
      );
      if (insertErr) {
        console.error(`[sync-profiles] Insert failed for ${q.symbol}:`, insertErr.message);
      }
    }

    // Re-fetch all securities to get any newly inserted ones
    const { data: allSecurities, error: refetchErr } = await supabase
      .from('securities')
      .select('id, symbol, yahoo_symbol, type')
      .not('yahoo_symbol', 'is', null);

    if (refetchErr) throw new Error(`Failed to re-fetch securities: ${refetchErr.message}`);

    let processed = 0;

    // Update profiles for each security
    for (const sec of allSecurities || []) {
      try {
        const summary = await getQuoteSummary(sec.yahoo_symbol, [
          'summaryProfile', 'price', 'summaryDetail',
        ]);
        await sleep(200);

        if (!summary) {
          console.warn(`[sync-profiles] No summary returned for ${sec.yahoo_symbol}`);
          continue;
        }

        const profile = summary.summaryProfile || {};
        const price = summary.price || {};
        const detail = summary.summaryDetail || {};

        const { error: updateErr } = await supabase
          .from('securities')
          .update({
            name: price.longName || price.shortName || sec.symbol,
            sector: profile.sector || null,
            industry: profile.industry || null,
            description: profile.longBusinessSummary || null,
            website: profile.website || null,
            ceo: null,
            employees: profile.fullTimeEmployees || null,
            logo_url: null, // Handled by sync-logos
            beta: detail.beta ?? null,
            price_avg_50: price.fiftyDayAverage ?? null,
            price_avg_200: price.twoHundredDayAverage ?? null,
            dividend_yield: detail.dividendYield ?? null,
            last_profile_sync: new Date().toISOString(),
          })
          .eq('id', sec.id);

        if (updateErr) {
          console.error(`[sync-profiles] Update failed for ${sec.yahoo_symbol}:`, updateErr.message);
          continue;
        }

        // For ETFs/funds: also fetch and upsert ETF details
        if (sec.type === 'etf' || sec.type === 'fund') {
          const etfSummary = await getQuoteSummary(sec.yahoo_symbol, [
            'fundProfile', 'defaultKeyStatistics', 'topHoldings',
          ]);
          await sleep(200);

          if (etfSummary) {
            const etfInfo = transformEtfInfo(etfSummary, sec.id);
            const { error: etfErr } = await supabase.from('etf_details').upsert(
              {
                security_id: sec.id,
                expense_ratio: etfInfo.expense_ratio,
                aum: etfInfo.aum,
                nav: etfInfo.nav,
                nav_currency: 'MYR',
                issuer: etfInfo.issuer,
                inception_date: etfInfo.inception_date,
                asset_class: etfInfo.asset_class,
                holdings_count: etfInfo.holdings_count,
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'security_id' }
            );

            if (etfErr) {
              console.error(`[sync-profiles] ETF details upsert failed for ${sec.yahoo_symbol}:`, etfErr.message);
            }
          }
        }

        processed++;
      } catch (innerErr) {
        console.error(`[sync-profiles] Error processing ${sec.yahoo_symbol}:`, innerErr.message);
      }
    }

    // Mark securities not found in Yahoo screener as inactive
    // Safety: only deactivate if screener returned a reasonable number
    if (yahooSymbols.size < 100) {
      console.warn(`[sync-profiles] Screener returned only ${yahooSymbols.size} symbols — skipping deactivation to prevent data loss`);
    } else {
      for (const sec of allSecurities || []) {
        if (sec.yahoo_symbol && !yahooSymbols.has(sec.yahoo_symbol)) {
          await supabase
            .from('securities')
            .update({ is_actively_trading: false })
            .eq('id', sec.id);
        }
      }
    }

    await logSyncComplete(supabase, logId, processed);
    return NextResponse.json({ status: 'ok', records: processed });
  } catch (err) {
    console.error('[sync-profiles] Fatal error:', err.message);
    await logSyncFail(supabase, logId, err.message);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}
