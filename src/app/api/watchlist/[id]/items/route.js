import { createAuthServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request, { params }) {
  const { id } = await params;

  if (!id || !UUID_RE.test(id)) {
    return Response.json({ error: 'Invalid watchlist ID' }, { status: 400 });
  }

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

  const { error } = await supabase
    .from('watchlist_items')
    .upsert(
      { user_id: user.id, watchlist_id: id, security_id },
      { onConflict: 'watchlist_id,security_id' }
    );

  if (error) {
    console.error('Watchlist item POST error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }

  return Response.json({ success: true });
}

export async function DELETE(request, { params }) {
  const { id } = await params;

  if (!id || !UUID_RE.test(id)) {
    return Response.json({ error: 'Invalid watchlist ID' }, { status: 400 });
  }

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

  const { error } = await supabase
    .from('watchlist_items')
    .delete()
    .eq('watchlist_id', id)
    .eq('user_id', user.id)
    .eq('security_id', security_id);

  if (error) {
    console.error('Watchlist item DELETE error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }

  return Response.json({ success: true });
}
