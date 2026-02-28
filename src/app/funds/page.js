import { createServiceClient } from '@/lib/supabase/server';
import { PAGE_SIZE, FUND_SECURITIES_SELECT } from '@/lib/constants';
import { enrichWithSparklines } from '@/lib/sparkline-data';
import ScreenerShell from '@/components/screener/ScreenerShell';

export const revalidate = 60;

export const metadata = {
  title: 'KLSE Unit Trusts',
  description: 'Browse all KLSE-listed unit trusts by assets under management.',
};

export default async function FundsPage() {
  const supabase = createServiceClient();

  const { data, count } = await supabase
    .from('securities')
    .select(FUND_SECURITIES_SELECT, { count: 'exact' })
    .eq('type', 'fund')
    .eq('is_actively_trading', true)
    .order('market_cap', { ascending: false, nullsFirst: false })
    .range(0, PAGE_SIZE - 1);

  const total = count || 0;

  // Flatten etf_details join
  const flattened = (data || []).map(({ etf_details, ...rest }) => ({
    ...rest,
    aum: etf_details?.aum ?? null,
    expense_ratio: etf_details?.expense_ratio ?? null,
  }));

  const enrichedData = await enrichWithSparklines(supabase, flattened);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <ScreenerShell
        initialTab="/funds"
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
