import { createAuthServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const supabase = await createAuthServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const includeItems = searchParams.get('include_items') === 'true';

  // Fetch watchlists with item counts
  const { data: watchlists, error } = await supabase
    .from('watchlists')
    .select('id, name, is_default, created_at')
    .eq('user_id', user.id)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Watchlists GET error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }

  // Get item counts per watchlist (with safety limit)
  const { data: countData, error: countError } = await supabase
    .from('watchlist_items')
    .select('watchlist_id')
    .eq('user_id', user.id)
    .limit(10000);

  if (countError) {
    console.error('Watchlist count query error:', countError);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }

  const countMap = {};
  for (const item of countData || []) {
    countMap[item.watchlist_id] = (countMap[item.watchlist_id] || 0) + 1;
  }

  let itemsMap = null;
  if (includeItems) {
    const { data: items, error: itemsError } = await supabase
      .from('watchlist_items')
      .select('watchlist_id, security_id')
      .eq('user_id', user.id)
      .limit(10000);

    if (itemsError) {
      console.error('Watchlist items query error:', itemsError);
      return Response.json({ error: 'Internal server error' }, { status: 500 });
    }

    itemsMap = {};
    for (const item of items || []) {
      if (!itemsMap[item.watchlist_id]) {
        itemsMap[item.watchlist_id] = [];
      }
      itemsMap[item.watchlist_id].push(item.security_id);
    }
  }

  const result = (watchlists || []).map((wl) => ({
    ...wl,
    item_count: countMap[wl.id] || 0,
    ...(includeItems ? { security_ids: itemsMap?.[wl.id] || [] } : {}),
  }));

  return Response.json({ watchlists: result }, {
    headers: { 'Cache-Control': 'private, no-store' },
  });
}

export async function POST(request) {
  const supabase = await createAuthServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const { name } = body;

  if (!name || typeof name !== 'string' || name.trim().length === 0 || name.trim().length > 50) {
    return Response.json({ error: 'Name is required (max 50 characters)' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('watchlists')
    .insert({ user_id: user.id, name: name.trim(), is_default: false })
    .select('id, name, is_default, created_at')
    .single();

  if (error) {
    if (error.code === '23505') {
      return Response.json({ error: 'A watchlist with that name already exists' }, { status: 409 });
    }
    console.error('Watchlists POST error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }

  return Response.json({ watchlist: { ...data, item_count: 0, security_ids: [] } }, { status: 201 });
}
