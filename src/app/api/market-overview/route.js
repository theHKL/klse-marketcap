import { getQuote, getHistorical } from '@/lib/yahoo/client';
import { unstable_cache } from 'next/cache';

const INDEX_SYMBOLS = [
  { symbol: '^KLSE', label: 'FTSE Bursa KLCI' },
];

const getCachedMarketData = unstable_cache(
  async () => {
    const indices = [];

    for (const def of INDEX_SYMBOLS) {
      try {
        // Fetch quote and 7-day history in parallel
        const [quote, history] = await Promise.allSettled([
          getQuote(def.symbol),
          getHistorical(def.symbol, {
            period1: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            period2: new Date().toISOString().split('T')[0],
          }),
        ]);

        const q = quote.status === 'fulfilled' ? quote.value : null;
        const hist = history.status === 'fulfilled' ? history.value : [];

        if (q && q.regularMarketPrice != null) {
          indices.push({
            symbol: def.symbol,
            label: def.label,
            price: q.regularMarketPrice,
            change: q.regularMarketChange ?? 0,
            changePercent: q.regularMarketChangePercent ?? 0,
            sparkline: hist.map((d) => d.close).filter((v) => v != null),
          });
        }
      } catch (err) {
        console.error(`Market overview fetch failed for ${def.symbol}:`, err.message);
      }
    }

    return indices;
  },
  ['market-overview'],
  { revalidate: 300 }
);

export async function GET() {
  try {
    const indices = await getCachedMarketData();
    return Response.json(
      { indices, timestamp: new Date().toISOString() },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      }
    );
  } catch (error) {
    console.error('Market overview fetch failed:', error);
    return Response.json({ indices: [] }, { status: 500 });
  }
}
