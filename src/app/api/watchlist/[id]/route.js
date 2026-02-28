import { createAuthServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(_request, { params }) {
  const { id } = await params;

  if (!id || !UUID_RE.test(id)) {
    return Response.json({ error: 'Invalid watchlist ID' }, { status: 400 });
  }

  const supabase = await createAuthServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify the watchlist belongs to the user
  const { data: wl } = await supabase
    .from('watchlists')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (!wl) {
    return Response.json({ error: 'Watchlist not found' }, { status: 404 });
  }

  const { data, error } = await supabase
    .from('watchlist_items')
    .select('security_id')
    .eq('watchlist_id', id)
    .eq('user_id', user.id)
    .order('added_at', { ascending: false });

  if (error) {
    console.error('Watchlist items GET error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }

  return Response.json({ items: data || [] }, {
    headers: { 'Cache-Control': 'private, no-store' },
  });
}
