import { createServiceClient } from '@/lib/supabase/server';
import { unstable_cache } from 'next/cache';

const getCachedEvents = unstable_cache(
  async () => {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('market_events')
      .select('id, name, event_date, description, category')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) throw error;
    return data || [];
  },
  ['market-events'],
  { revalidate: 300 }
);

export async function GET() {
  try {
    const events = await getCachedEvents();
    return Response.json(
      { events },
      {
        headers: {
          'Cache-Control':
            'public, max-age=300, s-maxage=300, stale-while-revalidate=600',
        },
      }
    );
  } catch (error) {
    console.error('Failed to fetch events:', error);
    return Response.json({ error: 'Failed to fetch events' }, { status: 500 });
  }
}
