import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { unstable_cache } from 'next/cache';

const RANGE_DAYS = {
  '7d': 7,
  '1m': 30,
  '3m': 90,
  '6m': 180,
  '1y': 365,
  '5y': 1825,
  all: null,
};

/** Cache ticker → security ID mapping (rarely changes) */
const getCachedSecurityId = unstable_cache(
  async (symbol) => {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('securities')
      .select('id, symbol')
      .ilike('symbol', symbol)
      .single();
    if (error || !data) return null;
    return data;
  },
  ['security-by-ticker'],
  { revalidate: 3600 }
);

export async function GET(request, { params }) {
  const { ticker } = await params;
  const { searchParams } = new URL(request.url);
  const range = searchParams.get('range') || '1y';
  const symbol = ticker.toUpperCase();

  // Cached security lookup
  const security = await getCachedSecurityId(symbol);

  if (!security) {
    return NextResponse.json({ error: 'Security not found' }, { status: 404 });
  }

  const supabase = createServiceClient();

  // Build price query
  let query = supabase
    .from('daily_prices')
    .select('date, open, high, low, close, volume')
    .eq('security_id', security.id)
    .order('date', { ascending: true });

  const days = RANGE_DAYS[range];
  if (days) {
    const since = new Date();
    since.setDate(since.getDate() - days);
    query = query.gte('date', since.toISOString().split('T')[0]);
  }

  const { data: prices, error: priceError } = await query.limit(5000);

  if (priceError) {
    return NextResponse.json({ error: 'Failed to fetch prices' }, { status: 500 });
  }

  // Longer cache for historical ranges, shorter for recent
  const isHistorical = range === '5y' || range === 'all';
  const maxAge = isHistorical ? 3600 : 300;

  return NextResponse.json(
    { symbol: security.symbol, prices: prices || [] },
    {
      headers: {
        'Cache-Control': `public, s-maxage=${maxAge}, stale-while-revalidate=${maxAge * 2}`,
      },
    }
  );
}
