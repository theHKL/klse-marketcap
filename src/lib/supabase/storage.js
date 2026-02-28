const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const BUCKET = 'logos';

/**
 * Fix Supabase Storage URLs that are missing /public/ in the path.
 */
export function fixLogoUrl(url) {
  if (
    url &&
    url.includes('supabase.co/storage/') &&
    !url.includes('/object/public/')
  ) {
    return url.replace('/object/', '/object/public/');
  }
  return url;
}

/**
 * Build the public URL for a logo stored in Supabase Storage.
 * @param {string} yahooSymbol — e.g. "1155.KL"
 * @returns {string}
 */
export function getLogoPublicUrl(yahooSymbol) {
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${yahooSymbol}.png`;
}

/**
 * Download an image from a URL and upload it to Supabase Storage.
 * Returns the public URL on success, null on failure.
 * Skips empty or tiny responses (<100 bytes).
 */
export async function downloadAndUploadLogo(supabase, yahooSymbol, sourceUrl) {
  try {
    const response = await fetch(sourceUrl);
    if (!response.ok) return null;

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length < 100) return null;

    const filePath = `${yahooSymbol}.png`;

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, buffer, {
        contentType: 'image/png',
        upsert: true,
        cacheControl: '31536000',
      });

    if (error) {
      console.error(`Logo upload failed for ${yahooSymbol}:`, error.message);
      return null;
    }

    return getLogoPublicUrl(yahooSymbol);
  } catch (err) {
    console.error(`Logo download failed for ${yahooSymbol}:`, err.message);
    return null;
  }
}

/**
 * Try fetching a logo from logo.dev using the company's website domain.
 * Falls back to ticker-based lookup if no website is available.
 * Returns the Supabase public URL on success, null on failure.
 */
export async function downloadLogoFromLogoDev(supabase, yahooSymbol, website) {
  const token = process.env.LOGO_DEV_TOKEN;
  if (!token) return null;

  // Try domain-based lookup first (higher quality matches)
  if (website) {
    try {
      const domain = new URL(website).hostname.replace('www.', '');
      const url = `https://img.logo.dev/${domain}?token=${token}&format=png&size=128`;
      const result = await downloadAndUploadLogo(supabase, yahooSymbol, url);
      if (result) return result;
    } catch {
      // Invalid website URL, fall through to ticker lookup
    }
  }

  // Fall back to ticker-based lookup
  const ticker = yahooSymbol.replace(/\.KL$/i, '');
  const url = `https://img.logo.dev/ticker/${ticker}?token=${token}&format=png&size=128`;
  return downloadAndUploadLogo(supabase, yahooSymbol, url);
}
