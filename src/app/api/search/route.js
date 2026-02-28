import { createAnonServerClient } from '@/lib/supabase/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');
  const limit = Math.min(parseInt(searchParams.get('limit') || '8', 10), 20);

  if (!q || q.length < 1) {
    return Response.json([]);
  }

  const safeQ = q.replace(/[^a-zA-Z0-9 .\-]/g, '').slice(0, 50);

  if (!safeQ) {
    return Response.json([]);
  }

  const supabase = createAnonServerClient();

  const { data, error } = await supabase
    .from('securities')
    .select('symbol, name, type, logo_url, market_cap')
    .eq('is_actively_trading', true)
    .or(`symbol.ilike.${safeQ}%,name.ilike.%${safeQ}%`)
    .order('market_cap', { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error) {
    return Response.json([], { status: 500 });
  }

  return Response.json(data || [], {
    headers: {
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
    },
  });
}
