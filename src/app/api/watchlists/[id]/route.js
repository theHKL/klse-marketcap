import { createAuthServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function PATCH(request, { params }) {
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
  const { name } = body;

  if (!name || typeof name !== 'string' || name.trim().length === 0 || name.trim().length > 50) {
    return Response.json({ error: 'Name is required (max 50 characters)' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('watchlists')
    .update({ name: name.trim(), updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)
    .select('id, name, is_default, created_at')
    .single();

  if (error) {
    if (error.code === '23505') {
      return Response.json({ error: 'A watchlist with that name already exists' }, { status: 409 });
    }
    console.error('Watchlist PATCH error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }

  if (!data) {
    return Response.json({ error: 'Watchlist not found' }, { status: 404 });
  }

  return Response.json({ watchlist: data });
}

export async function DELETE(_request, { params }) {
  const { id } = await params;

  if (!id || !UUID_RE.test(id)) {
    return Response.json({ error: 'Invalid watchlist ID' }, { status: 400 });
  }

  const supabase = await createAuthServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check if it's the default watchlist
  const { data: wl } = await supabase
    .from('watchlists')
    .select('is_default')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (!wl) {
    return Response.json({ error: 'Watchlist not found' }, { status: 404 });
  }

  if (wl.is_default) {
    return Response.json({ error: 'Cannot delete default watchlist' }, { status: 400 });
  }

  const { error } = await supabase
    .from('watchlists')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    console.error('Watchlist DELETE error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }

  return Response.json({ success: true });
}
