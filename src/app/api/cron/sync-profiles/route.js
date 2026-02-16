import { NextResponse } from 'next/server';
import { getStockList, getETFList, getProfile, getETFInfo } from '@/lib/fmp';
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
    // Fetch stock and ETF lists from FMP, filtered to .KL
    const [stockList, etfList] = await Promise.all([
      getStockList(),
      getETFList(),
    ]);

    // Build sets for quick lookup
    const fmpStockSymbols = new Set(stockList.map((s) => s.symbol));
    const fmpETFSymbols = new Set(etfList.map((s) => s.symbol));
    const allFmpSymbols = new Set([...fmpStockSymbols, ...fmpETFSymbols]);

    // Fetch existing securities from DB
    const { data: existingSecurities, error: fetchErr } = await supabase
      .from('securities')
      .select('id, symbol, fmp_symbol, type');

    if (fetchErr) throw new Error(`Failed to fetch securities: ${fetchErr.message}`);

    const existingByFmpSymbol = {};
    for (const sec of existingSecurities || []) {
      if (sec.fmp_symbol) {
        existingByFmpSymbol[sec.fmp_symbol] = sec;
      }
    }

    let processed = 0;

    // Insert new tickers not yet in DB
    const allItems = [
      ...stockList.map((s) => ({ ...s, type: 'stock' })),
      ...etfList.map((s) => ({ ...s, type: 'etf' })),
    ];

    for (const item of allItems) {
      if (!existingByFmpSymbol[item.symbol]) {
        const localSymbol = item.symbol.replace('.KL', '');
        const { error: insertErr } = await supabase.from('securities').upsert(
          {
            symbol: localSymbol,
            fmp_symbol: item.symbol,
            name: item.name || localSymbol,
            type: item.type,
            is_actively_trading: true,
            currency: 'MYR',
          },
          { onConflict: 'fmp_symbol' }
        );
        if (insertErr) {
          console.error(`[sync-profiles] Insert failed for ${item.symbol}:`, insertErr.message);
        }
      }
    }

    // Re-fetch all securities to get any newly inserted ones
    const { data: allSecurities, error: refetchErr } = await supabase
      .from('securities')
      .select('id, symbol, fmp_symbol, type')
      .not('fmp_symbol', 'is', null);

    if (refetchErr) throw new Error(`Failed to re-fetch securities: ${refetchErr.message}`);

    // Update profiles for each security
    for (const sec of allSecurities || []) {
      try {
        const profile = await getProfile(sec.fmp_symbol);
        await sleep(100); // Rate limit: 100ms between profile fetches

        if (!profile) {
          console.warn(`[sync-profiles] No profile returned for ${sec.fmp_symbol}`);
          continue;
        }

        const { error: updateErr } = await supabase
          .from('securities')
          .update({
            name: profile.companyName || sec.symbol,
            sector: profile.sector || null,
            industry: profile.industry || null,
            description: profile.description || null,
            website: profile.website || null,
            ceo: profile.ceo || null,
            employees: profile.fullTimeEmployees
              ? parseInt(profile.fullTimeEmployees, 10)
              : null,
            ipo_date: profile.ipoDate || null,
            logo_url: profile.image || null,
            beta: profile.beta || null,
            price_avg_50: profile.priceAvg50 || null,
            price_avg_200: profile.priceAvg200 || null,
            dividend_yield: profile.lastDiv || null,
            last_annual_dividend: profile.lastDiv || null,
            last_profile_sync: new Date().toISOString(),
          })
          .eq('id', sec.id);

        if (updateErr) {
          console.error(`[sync-profiles] Update failed for ${sec.fmp_symbol}:`, updateErr.message);
          continue;
        }

        // For ETFs: also fetch and upsert ETF details
        if (sec.type === 'etf') {
          const etfInfo = await getETFInfo(sec.fmp_symbol);
          await sleep(100);

          if (etfInfo) {
            const { error: etfErr } = await supabase.from('etf_details').upsert(
              {
                security_id: sec.id,
                expense_ratio: etfInfo.expenseRatio || null,
                aum: etfInfo.aum || null,
                nav: etfInfo.nav || null,
                nav_currency: etfInfo.navCurrency || 'MYR',
                issuer: etfInfo.issuer || null,
                inception_date: etfInfo.inceptionDate || null,
                asset_class: etfInfo.assetClass || null,
                holdings_count: etfInfo.holdingsCount || null,
                category: etfInfo.etfCategory || null,
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'security_id' }
            );

            if (etfErr) {
              console.error(`[sync-profiles] ETF details upsert failed for ${sec.fmp_symbol}:`, etfErr.message);
            }
          }
        }

        processed++;
      } catch (innerErr) {
        console.error(`[sync-profiles] Error processing ${sec.fmp_symbol}:`, innerErr.message);
      }
    }

    // Mark securities not found in FMP lists as inactive
    for (const sec of allSecurities || []) {
      if (sec.fmp_symbol && !allFmpSymbols.has(sec.fmp_symbol)) {
        await supabase
          .from('securities')
          .update({ is_actively_trading: false })
          .eq('id', sec.id);
      }
    }

    await logSyncComplete(supabase, logId, processed);
    return NextResponse.json({ status: 'ok', records: processed });
  } catch (err) {
    console.error('[sync-profiles] Fatal error:', err.message);
    await logSyncFail(supabase, logId, err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
