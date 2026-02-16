import { NextResponse } from 'next/server';
import { getProfile } from '@/lib/fmp';
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
    // Fetch securities where logo_url is null or starts with http (external URL, not yet in storage)
    const { data: securities, error: fetchErr } = await supabase
      .from('securities')
      .select('id, symbol, fmp_symbol, logo_url')
      .eq('is_actively_trading', true)
      .not('fmp_symbol', 'is', null);

    if (fetchErr) throw new Error(`Failed to fetch securities: ${fetchErr.message}`);

    // Filter to those needing logo upload
    const needsLogo = (securities || []).filter(
      (s) => !s.logo_url || s.logo_url.startsWith('http')
    );

    // Exclude securities whose logo_url already points to our Supabase Storage
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const toProcess = needsLogo.filter(
      (s) => !s.logo_url || !s.logo_url.includes(supabaseUrl)
    );

    let processed = 0;

    for (const sec of toProcess) {
      try {
        // Get the external logo URL
        let imageUrl = sec.logo_url;

        // If no logo_url stored yet, fetch from FMP profile
        if (!imageUrl || !imageUrl.startsWith('http')) {
          const profile = await getProfile(sec.fmp_symbol);
          await sleep(100);
          if (!profile || !profile.image) {
            continue;
          }
          imageUrl = profile.image;
        }

        // Fetch the image as a blob
        const imageRes = await fetch(imageUrl);
        if (!imageRes.ok) {
          console.warn(`[sync-logos] Failed to fetch image for ${sec.symbol}: ${imageRes.status}`);
          continue;
        }

        const blob = await imageRes.blob();
        const arrayBuffer = await blob.arrayBuffer();
        const buffer = new Uint8Array(arrayBuffer);

        // Determine file extension from content type
        const contentType = imageRes.headers.get('content-type') || 'image/png';
        const ext = contentType.includes('svg') ? 'svg' : contentType.includes('jpeg') || contentType.includes('jpg') ? 'jpg' : 'png';
        const fileName = `${sec.symbol.toLowerCase()}.${ext}`;

        // Upload to Supabase Storage bucket "logos"
        const { error: uploadErr } = await supabase.storage
          .from('logos')
          .upload(fileName, buffer, {
            contentType,
            upsert: true,
          });

        if (uploadErr) {
          console.error(`[sync-logos] Upload failed for ${sec.symbol}:`, uploadErr.message);
          continue;
        }

        // Get the public URL
        const { data: publicUrlData } = supabase.storage
          .from('logos')
          .getPublicUrl(fileName);

        if (publicUrlData?.publicUrl) {
          const { error: updateErr } = await supabase
            .from('securities')
            .update({ logo_url: publicUrlData.publicUrl })
            .eq('id', sec.id);

          if (updateErr) {
            console.error(`[sync-logos] Update logo_url failed for ${sec.symbol}:`, updateErr.message);
            continue;
          }
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
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
