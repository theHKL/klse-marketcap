import { createServiceClient } from '@/lib/supabase/server';
import { PAGE_SIZE, SECURITIES_SELECT } from '@/lib/constants';
import { enrichWithSparklines } from '@/lib/sparkline-data';
import ScreenerShell from '@/components/screener/ScreenerShell';

export const revalidate = 60;

export default async function HomePage() {
  const supabase = createServiceClient();

  const { data, count } = await supabase
    .from('securities')
    .select(SECURITIES_SELECT, { count: 'exact' })
    .eq('is_actively_trading', true)
    .not('type', 'in', '("hybrid","fund")')
    .order('market_cap', { ascending: false, nullsFirst: false })
    .range(0, PAGE_SIZE - 1);

  const total = count || 0;
  const enrichedData = await enrichWithSparklines(supabase, data || []);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <ScreenerShell
        initialTab="/"
        initialData={enrichedData}
        initialPagination={{
          page: 1,
          limit: PAGE_SIZE,
          total,
          totalPages: Math.ceil(total / PAGE_SIZE),
        }}
        initialTotal={total}
      />
    </div>
  );
}
