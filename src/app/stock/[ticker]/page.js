import { cache } from 'react';
import { notFound, redirect } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase/server';
import { formatMarketCap, formatPrice } from '@/lib/formatters';
import { fixLogoUrl } from '@/lib/supabase/storage';
import { generateStockJsonLd, generateBreadcrumbJsonLd, safeJsonLd } from '@/lib/structured-data';
import Breadcrumbs from '@/components/layout/Breadcrumbs';
import DetailHeader from '@/components/detail/DetailHeader';
import DetailWatchlistStar from '@/components/detail/DetailWatchlistStar';
import KeyStatsBar from '@/components/detail/KeyStatsBar';
import PriceChart from '@/components/detail/PriceChart';
import CompanyNews from '@/components/detail/CompanyNews';
import CompanyDescription from '@/components/detail/CompanyDescription';
import PeersTable from '@/components/detail/PeersTable';
import PriceRangeBar from '@/components/detail/PriceRangeBar';
import FinancialDataTable from '@/components/detail/FinancialDataTable';
import HistoricalPriceTable from '@/components/detail/HistoricalPriceTable';

export const revalidate = 300;

const getSecurityByTicker = cache(async (ticker) => {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from('securities')
    .select('*')
    .ilike('symbol', ticker.toUpperCase())
    .eq('type', 'stock')
    .single();
  return data;
});

async function getRank(supabase, marketCap) {
  if (!marketCap) return null;
  const { count } = await supabase
    .from('securities')
    .select('id', { count: 'exact', head: true })
    .eq('is_actively_trading', true)
    .gt('market_cap', marketCap);
  return count != null ? count + 1 : null;
}

export async function generateStaticParams() {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from('securities')
    .select('symbol')
    .eq('type', 'stock')
    .order('market_cap', { ascending: false })
    .limit(200);

  return (data || []).map((s) => ({ ticker: s.symbol.toLowerCase() }));
}

export async function generateMetadata({ params }) {
  const { ticker } = await params;
  const security = await getSecurityByTicker(ticker);

  if (!security) {
    return { title: `${ticker.toUpperCase()} - Not Found` };
  }

  const formattedCap = formatMarketCap(security.market_cap);

  return {
    title: `${security.symbol} Market Cap, Price & Financials - KLSE MarketCap`,
    description: `${security.name} (${security.symbol}) has a market cap of ${formattedCap}. View live price, charts, financials, and peer comparison on KLSE MarketCap.`,
    openGraph: {
      title: `${security.symbol} - ${security.name}`,
      description: `Market cap: ${formattedCap}. Current price: ${formatPrice(security.price)}`,
      images: security.logo_url ? [fixLogoUrl(security.logo_url)] : [],
    },
  };
}

export default async function StockDetailPage({ params }) {
  const { ticker } = await params;
  const supabase = createServiceClient();

  const security = await getSecurityByTicker(ticker);

  if (!security) {
    // Check if this is an old ticker that was renamed
    const { data: alias } = await supabase
      .from('symbol_aliases')
      .select('new_symbol')
      .ilike('old_symbol', ticker.toUpperCase())
      .single();

    if (alias) {
      redirect(`/stock/${alias.new_symbol.toLowerCase()}`);
    }

    notFound();
  }

  // Fetch all data in parallel
  const [
    { data: dailyPrices },
    { data: incomeStatements },
    { data: balanceSheets },
    { data: cashFlowStatements },
    { data: keyMetrics },
    { data: peerRows },
    { data: capitalNotes },
    rank,
  ] = await Promise.all([
    supabase
      .from('daily_prices')
      .select('date, open, high, low, close, volume')
      .eq('security_id', security.id)
      .order('date', { ascending: true })
      .gte('date', new Date(Date.now() - 365 * 86400000).toISOString().split('T')[0]),
    supabase
      .from('income_statements')
      .select('*')
      .eq('security_id', security.id)
      .order('date', { ascending: false })
      .limit(40),
    supabase
      .from('balance_sheets')
      .select('*')
      .eq('security_id', security.id)
      .order('date', { ascending: false })
      .limit(1),
    supabase
      .from('cash_flow_statements')
      .select('*')
      .eq('security_id', security.id)
      .order('date', { ascending: false })
      .limit(1),
    supabase
      .from('key_metrics')
      .select('*')
      .eq('security_id', security.id)
      .order('date', { ascending: false })
      .limit(40),
    supabase
      .from('stock_peers')
      .select('peer_yahoo_symbol')
      .eq('security_id', security.id),
    supabase
      .from('securities')
      .select('symbol, name, price, change_1d_pct')
      .eq('type', 'hybrid')
      .eq('parent_symbol', security.symbol)
      .eq('is_actively_trading', true)
      .order('symbol', { ascending: true }),
    getRank(supabase, security.market_cap),
  ]);

  // Resolve peers to full security objects
  let peers = [];
  if (peerRows && peerRows.length > 0) {
    const peerSymbols = peerRows
      .map((p) => p.peer_yahoo_symbol)
      .filter((s) => s && s.length <= 7 && !/[A-Z]{2,}$/.test(s.replace('.KL', '').slice(-2)));

    if (peerSymbols.length > 0) {
      const { data: peerSecurities } = await supabase
        .from('securities')
        .select('symbol, name, market_cap, price, change_1d_pct, logo_url')
        .in('yahoo_symbol', peerSymbols)
        .eq('is_actively_trading', true)
        .order('market_cap', { ascending: false })
        .limit(8);
      peers = peerSecurities || [];
    }
  }

  const latestIncome = incomeStatements?.[0] || null;
  const latestBalance = balanceSheets?.[0] || null;
  const latestCashFlow = cashFlowStatements?.[0] || null;
  const latestMetrics = keyMetrics?.[0] || null;

  const breadcrumbs = [
    { label: 'Stocks', href: '/stocks' },
    { label: security.symbol },
  ];

  const stockJsonLd = generateStockJsonLd(security);
  const breadcrumbJsonLd = generateBreadcrumbJsonLd([
    { name: 'Home', href: '/' },
    { name: 'Stocks', href: '/stocks' },
    { name: security.symbol, href: `/stock/${security.symbol.toLowerCase()}` },
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(stockJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbJsonLd) }}
      />

      <Breadcrumbs items={breadcrumbs} />

      <div className="mt-2 space-y-8">
        <DetailHeader security={security} rank={rank} actions={<DetailWatchlistStar securityId={security.id} />} />

        <KeyStatsBar security={security} />

        {security.description && (
          <p className="text-sm leading-relaxed text-slate-500">
            {security.description.length > 200
              ? `${security.description.slice(0, 200)}... `
              : security.description}
            {security.description.length > 200 && (
              <a href="#about" className="font-medium text-blue-500 hover:underline">
                Read more
              </a>
            )}
          </p>
        )}

        <PriceChart
          initialData={dailyPrices || []}
          symbol={security.symbol}
          incomeStatements={incomeStatements}
          keyMetrics={keyMetrics}
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <PriceRangeBar
            label="24H Range"
            low={security.day_low}
            high={security.day_high}
            current={security.price}
          />
          <PriceRangeBar
            label="52-Week Range"
            low={security.year_low}
            high={security.year_high}
            current={security.price}
          />
        </div>

        <CompanyDescription security={security} id="about" />

        <FinancialDataTable
          latestIncome={latestIncome}
          latestBalance={latestBalance}
          latestCashFlow={latestCashFlow}
          latestMetrics={latestMetrics}
        />

        <CompanyNews symbol={security.symbol} />

        <PeersTable peers={peers} />

        {capitalNotes && capitalNotes.length > 0 && (
          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-800">Capital Notes</h2>
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    <th className="px-4 py-2">Symbol</th>
                    <th className="px-4 py-2">Name</th>
                    <th className="px-4 py-2 text-right">Price</th>
                    <th className="px-4 py-2 text-right">1D Change</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {capitalNotes.map((note) => (
                    <tr key={note.symbol} className="hover:bg-slate-50">
                      <td className="px-4 py-2">
                        <a
                          href={`/stock/${note.symbol.toLowerCase()}`}
                          className="font-medium text-blue-500 hover:underline"
                        >
                          {note.symbol}
                        </a>
                      </td>
                      <td className="px-4 py-2 text-slate-500">{note.name}</td>
                      <td className="px-4 py-2 text-right font-mono">
                        {note.price != null ? formatPrice(note.price) : '-'}
                      </td>
                      <td className={`px-4 py-2 text-right font-mono ${
                        note.change_1d_pct > 0
                          ? 'text-emerald-600'
                          : note.change_1d_pct < 0
                            ? 'text-red-500'
                            : 'text-slate-500'
                      }`}>
                        {note.change_1d_pct != null
                          ? `${note.change_1d_pct > 0 ? '+' : ''}${note.change_1d_pct.toFixed(2)}%`
                          : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <HistoricalPriceTable prices={dailyPrices} />
      </div>
    </div>
  );
}
