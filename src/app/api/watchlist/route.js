import { createAuthServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Helper: get or create the user's default watchlist */
async function getDefaultWatchlist(supabase, userId) {
  const { data } = await supabase
    .from('watchlists')
    .select('id')
    .eq('user_id', userId)
    .eq('is_default', true)
    .single();

  if (data) return data.id;

  // Shouldn't happen (trigger creates it), but handle gracefully
  const { data: created, error } = await supabase
    .from('watchlists')
    .insert({ user_id: userId, name: 'Watchlist', is_default: true })
    .select('id')
    .single();

  if (error?.code === '23505') {
    // Race condition: another request already created it
    const { data: existing } = await supabase
      .from('watchlists')
      .select('id')
      .eq('user_id', userId)
      .eq('is_default', true)
      .single();
    return existing?.id;
  }

  return created?.id;
}

export async function GET() {
  const supabase = await createAuthServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const defaultId = await getDefaultWatchlist(supabase, user.id);

  const { data, error } = await supabase
    .from('watchlist_items')
    .select('security_id')
    .eq('watchlist_id', defaultId)
    .eq('user_id', user.id)
    .order('added_at', { ascending: false });

  if (error) {
    console.error('Watchlist GET error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }

  return Response.json({ items: data || [] }, {
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
  const { security_id } = body;

  if (!security_id || !UUID_RE.test(security_id)) {
    return Response.json({ error: 'Valid security_id required' }, { status: 400 });
  }

  const defaultId = await getDefaultWatchlist(supabase, user.id);

  const { error } = await supabase
    .from('watchlist_items')
    .upsert(
      { user_id: user.id, watchlist_id: defaultId, security_id },
      { onConflict: 'watchlist_id,security_id' }
    );

  if (error) {
    console.error('Watchlist POST error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }

  return Response.json({ success: true });
}

export async function DELETE(request) {
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
  const { security_id } = body;

  if (!security_id || !UUID_RE.test(security_id)) {
    return Response.json({ error: 'Valid security_id required' }, { status: 400 });
  }

  const defaultId = await getDefaultWatchlist(supabase, user.id);

  const { error } = await supabase
    .from('watchlist_items')
    .delete()
    .eq('watchlist_id', defaultId)
    .eq('user_id', user.id)
    .eq('security_id', security_id);

  if (error) {
    console.error('Watchlist DELETE error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }

  return Response.json({ success: true });
}
