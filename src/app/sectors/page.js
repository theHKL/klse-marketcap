import { createServiceClient } from '@/lib/supabase/server';
import { GICS_SECTORS } from '@/lib/constants';
import Breadcrumbs from '@/components/layout/Breadcrumbs';
import Card from '@/components/ui/Card';
import ChangeIndicator from '@/components/ui/ChangeIndicator';
import Logo from '@/components/ui/Logo';
import Link from 'next/link';

export const revalidate = 60;

export const metadata = {
  title: 'KLSE Sectors',
  description: 'Overview of all GICS sectors on the Bursa Malaysia.',
};

async function getSectorData(supabase) {
  const results = await Promise.all(
    GICS_SECTORS.map(async (sectorName) => {
      const { data, count } = await supabase
        .from('securities')
        .select('symbol, name, logo_url, change_1d_pct, market_cap', { count: 'exact' })
        .eq('type', 'stock')
        .eq('is_actively_trading', true)
        .eq('sector', sectorName)
        .order('market_cap', { ascending: false, nullsFirst: false })
        .limit(3);

      if (count && count > 0) {
        const avgChange = data.reduce((sum, s) => sum + (s.change_1d_pct || 0), 0) / data.length;
        return {
          name: sectorName,
          count: count,
          topCompanies: data || [],
          avgChange,
        };
      }
      return null;
    })
  );

  return results.filter(Boolean).sort((a, b) => b.count - a.count);
}

export default async function SectorsPage() {
  const supabase = createServiceClient();
  const sectors = await getSectorData(supabase);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <Breadcrumbs items={[{ label: 'Sectors' }]} />

      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-slate-800">KLSE Sectors</h1>
        <p className="mt-1 text-sm text-slate-400">
          GICS sector overview for the Bursa Malaysia
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sectors.map((sector) => (
          <Link key={sector.name} href={`/?sector=${encodeURIComponent(sector.name)}`}>
            <Card className="p-5 transition-shadow hover:shadow-card-hover">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-800">{sector.name}</h2>
                <ChangeIndicator value={sector.avgChange} />
              </div>

              <p className="mb-3 text-xs text-slate-400">
                {sector.count} {sector.count === 1 ? 'stock' : 'stocks'}
              </p>

              <div className="flex items-center gap-2">
                {sector.topCompanies.map((company) => (
                  <div key={company.symbol} className="flex items-center gap-1">
                    <Logo src={company.logo_url} alt={company.symbol} size="sm" />
                    <span className="font-mono text-xs text-slate-400">{company.symbol}</span>
                  </div>
                ))}
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
