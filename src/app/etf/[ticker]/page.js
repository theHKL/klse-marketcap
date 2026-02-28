import { cache } from 'react';
import { notFound, redirect } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase/server';
import { formatMarketCap, formatPrice } from '@/lib/formatters';
import { fixLogoUrl } from '@/lib/supabase/storage';
import { generateEtfJsonLd, generateBreadcrumbJsonLd, safeJsonLd } from '@/lib/structured-data';
import Breadcrumbs from '@/components/layout/Breadcrumbs';
import DetailHeader from '@/components/detail/DetailHeader';
import DetailWatchlistStar from '@/components/detail/DetailWatchlistStar';
import KeyStatsBar from '@/components/detail/KeyStatsBar';
import PriceChart from '@/components/detail/PriceChart';
import CompanyDescription from '@/components/detail/CompanyDescription';
import PeersTable from '@/components/detail/PeersTable';
import PriceRangeBar from '@/components/detail/PriceRangeBar';
import HistoricalPriceTable from '@/components/detail/HistoricalPriceTable';
import EtfInfoCard from '@/components/detail/etf/EtfInfoCard';
import HoldingsTable from '@/components/detail/etf/HoldingsTable';
import SectorBreakdownChart from '@/components/detail/etf/SectorBreakdownChart';

export const revalidate = 300;

const getSecurityByTicker = cache(async (ticker) => {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from('securities')
    .select('*')
    .ilike('symbol', ticker.toUpperCase())
    .eq('type', 'etf')
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
    .eq('type', 'etf')
    .order('market_cap', { ascending: false })
    .limit(200);

  return (data || []).map((s) => ({ ticker: s.symbol.toLowerCase() }));
}

export async function generateMetadata({ params }) {
  const { ticker } = await params;
  const security = await getSecurityByTicker(ticker);

  if (!security) {
    return { title: `${ticker.toUpperCase()} ETF - Not Found` };
  }

  const formattedCap = formatMarketCap(security.market_cap);

  return {
    title: `${security.symbol} ETF - Holdings, Expense Ratio & Price - KLSE MarketCap`,
    description: `${security.name} (${security.symbol}) ETF with AUM of ${formattedCap}. View holdings, sector breakdown, expense ratio, and price on KLSE MarketCap.`,
    openGraph: {
      title: `${security.symbol} ETF - ${security.name}`,
      description: `AUM: ${formattedCap}. Current price: ${formatPrice(security.price)}`,
      images: security.logo_url ? [fixLogoUrl(security.logo_url)] : [],
    },
  };
}

export default async function EtfDetailPage({ params }) {
  const { ticker } = await params;
  const supabase = createServiceClient();

  const security = await getSecurityByTicker(ticker);

  if (!security) {
    const { data: alias } = await supabase
      .from('symbol_aliases')
      .select('new_symbol')
      .ilike('old_symbol', ticker.toUpperCase())
      .single();

    if (alias) {
      redirect(`/etf/${alias.new_symbol.toLowerCase()}`);
    }

    notFound();
  }

  // Fetch all data in parallel
  const [
    { data: dailyPrices },
    { data: etfDetails },
    { data: etfHoldings },
    { data: sectorWeights },
    { data: peerRows },
    { data: etfHistory },
    { data: keyMetrics },
    rank,
  ] = await Promise.all([
    supabase
      .from('daily_prices')
      .select('date, open, high, low, close, volume')
      .eq('security_id', security.id)
      .order('date', { ascending: true })
      .gte('date', new Date(Date.now() - 365 * 86400000).toISOString().split('T')[0]),
    supabase
      .from('etf_details')
      .select('*')
      .eq('security_id', security.id)
      .single(),
    supabase
      .from('etf_holdings')
      .select('*')
      .eq('etf_security_id', security.id)
      .order('weight_percentage', { ascending: false })
      .limit(20),
    supabase
      .from('etf_sector_weights')
      .select('*')
      .eq('security_id', security.id),
    supabase
      .from('stock_peers')
      .select('peer_yahoo_symbol')
      .eq('security_id', security.id),
    supabase
      .from('etf_metrics_history')
      .select('date, aum, nav, expense_ratio, dividend_yield, holdings_count')
      .eq('security_id', security.id)
      .order('date', { ascending: true })
      .gte('date', new Date(Date.now() - 365 * 86400000).toISOString().split('T')[0]),
    supabase
      .from('key_metrics')
      .select('date, market_cap, dividend_yield')
      .eq('security_id', security.id)
      .order('date', { ascending: false })
      .limit(40),
    getRank(supabase, security.market_cap),
  ]);

  // Resolve peers
  let peers = [];
  if (peerRows && peerRows.length > 0) {
    const peerSymbols = peerRows
      .map((p) => p.peer_yahoo_symbol)
      .filter(Boolean);

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

  const etfDetail = etfDetails?.error ? null : etfDetails;

  const breadcrumbs = [
    { label: 'ETFs', href: '/etfs' },
    { label: security.symbol },
  ];

  const etfJsonLd = generateEtfJsonLd(security, etfDetail);
  const breadcrumbJsonLd = generateBreadcrumbJsonLd([
    { name: 'Home', href: '/' },
    { name: 'ETFs', href: '/etfs' },
    { name: security.symbol, href: `/etf/${security.symbol.toLowerCase()}` },
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(etfJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbJsonLd) }}
      />

      <Breadcrumbs items={breadcrumbs} />

      <div className="mt-2 space-y-8">
        <DetailHeader security={security} rank={rank} actions={<DetailWatchlistStar securityId={security.id} />} />

        <KeyStatsBar security={security} />

        <PriceChart initialData={dailyPrices || []} symbol={security.symbol} etfHistory={etfHistory || []} keyMetrics={keyMetrics} securityType="etf" />

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

        <EtfInfoCard etfDetails={etfDetail} />

        <HoldingsTable holdings={etfHoldings} />

        <SectorBreakdownChart sectorWeights={sectorWeights} />

        <CompanyDescription security={security} />

        <PeersTable peers={peers} />

        <HistoricalPriceTable prices={dailyPrices} />
      </div>
    </div>
  );
}
