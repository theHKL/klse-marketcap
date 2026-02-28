import { createServiceClient } from '@/lib/supabase/server';
import { unstable_cache } from 'next/cache';

const getCachedLastSync = unstable_cache(
  async () => {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from('sync_log')
      .select('completed_at')
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(1);
    return data?.[0]?.completed_at || null;
  },
  ['last-sync'],
  { revalidate: 60 }
);

export async function GET() {
  const lastSync = await getCachedLastSync();
  return Response.json(
    { lastSync },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    }
  );
}
