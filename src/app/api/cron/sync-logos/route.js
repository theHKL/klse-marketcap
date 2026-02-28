import { NextResponse } from 'next/server';
import { getQuoteSummary } from '@/lib/yahoo/client';
import { downloadLogoFromLogoDev } from '@/lib/supabase/storage';
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
  const logId = await logSyncStart(supabase, 'sync-logos');

  try {
    // Fetch securities needing logos
    const { data: securities, error: fetchErr } = await supabase
      .from('securities')
      .select('id, symbol, yahoo_symbol, logo_url, website')
      .eq('is_actively_trading', true)
      .not('yahoo_symbol', 'is', null);

    if (fetchErr) throw new Error(`Failed to fetch securities: ${fetchErr.message}`);

    // Filter to those needing logo upload
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const toProcess = (securities || []).filter(
      (s) => !s.logo_url || !s.logo_url.includes(supabaseUrl)
    );

    let processed = 0;

    for (const sec of toProcess) {
      try {
        // Get website from Yahoo if not stored
        let website = sec.website;
        if (!website) {
          const summary = await getQuoteSummary(sec.yahoo_symbol, ['summaryProfile']);
          await sleep(200);
          website = summary?.summaryProfile?.website || null;
        }

        // Use logo.dev to fetch and upload logo
        const logoUrl = await downloadLogoFromLogoDev(supabase, sec.yahoo_symbol, website);
        if (!logoUrl) {
          continue;
        }

        const { error: updateErr } = await supabase
          .from('securities')
          .update({
            logo_url: logoUrl,
            website: website || sec.website,
          })
          .eq('id', sec.id);

        if (updateErr) {
          console.error(`[sync-logos] Update logo_url failed for ${sec.symbol}:`, updateErr.message);
          continue;
        }

        processed++;
        await sleep(100);
      } catch (innerErr) {
        console.error(`[sync-logos] Error processing ${sec.symbol}:`, innerErr.message);
      }
    }

    await logSyncComplete(supabase, logId, processed);
    return NextResponse.json({ status: 'ok', records: processed });
  } catch (err) {
    console.error('[sync-logos] Fatal error:', err.message);
    await logSyncFail(supabase, logId, err.message);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}
