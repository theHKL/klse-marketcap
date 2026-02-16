import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  getSecurityBySymbol,
  getDailyPrices,
  getETFDetails,
  getETFHoldings,
  getETFSectorWeights,
  getAllSymbols,
} from "@/lib/queries";
import {
  formatMarketCap,
  formatPrice,
  formatChange,
  formatVolume,
  formatNumber,
  formatDate,
  safeJsonLd,
} from "@/lib/format";
import { CURRENCY_SYMBOL } from "@/lib/constants";
import { PriceChart, SectorBreakdownChart } from "@/components/charts";
import StatCard from "@/components/StatCard";

export const revalidate = 300;

export async function generateStaticParams() {
  const symbols = await getAllSymbols("etf");
  return symbols.slice(0, 200).map((symbol) => ({ ticker: symbol }));
}

export async function generateMetadata({ params }) {
  const { ticker } = await params;
  const etf = await getSecurityBySymbol(ticker);
  if (!etf) {
    return { title: "ETF Not Found" };
  }
  return {
    title: `${etf.name} (${etf.symbol}) ETF — Price, Holdings & Info`,
    description: `${etf.name} (${etf.symbol}) ETF has a market cap of ${formatMarketCap(etf.market_cap)}. View price, holdings, sector breakdown, and expense ratio on KLSE MarketCap.`,
    openGraph: {
      title: `${etf.name} (${etf.symbol}) ETF — Price, Holdings & Info`,
      description: `${etf.name} (${etf.symbol}) ETF has a market cap of ${formatMarketCap(etf.market_cap)}.`,
      images: etf.logo_url ? [{ url: etf.logo_url }] : [],
    },
  };
}

function LogoFallback({ symbol, size = 64 }) {
  const letter = symbol ? symbol.charAt(0).toUpperCase() : "?";
  return (
    <div
      className="rounded-full bg-lavender/40 flex items-center justify-center text-xl font-bold text-navy"
      style={{ width: size, height: size }}
    >
      {letter}
    </div>
  );
}

export default async function ETFDetailPage({ params }) {
  const { ticker } = await params;
  const etf = await getSecurityBySymbol(ticker);

  if (!etf) {
    notFound();
  }

  const [dailyPrices, etfDetails, holdings, sectorWeights] = await Promise.all([
    getDailyPrices(etf.id, 365),
    getETFDetails(etf.id),
    getETFHoldings(etf.id),
    getETFSectorWeights(etf.id),
  ]);

  const recentPrices = await getDailyPrices(etf.id, 30);

  // Transform daily prices for chart (ascending order)
  const chartData = [...dailyPrices]
    .reverse()
    .map((d) => ({ time: d.date, value: Number(d.close) }));

  const change1d = Number(etf.change_1d_pct);
  const isPositive = change1d >= 0;

  const details = etfDetails || {};

  // Transform sector weights for SectorBreakdownChart
  const sectorChartData = sectorWeights.map((sw) => ({
    sector: sw.sector,
    weight: Number(sw.weight_percentage),
  }));

  // Top 20 holdings
  const topHoldings = holdings.slice(0, 20);

  return (
    <div>
      {/* Breadcrumbs */}
      <nav className="text-sm text-slate mb-4">
        <Link href="/" className="text-sky hover:underline">
          Home
        </Link>
        <span className="mx-1.5">/</span>
        <Link href="/etfs" className="text-sky hover:underline">
          ETFs
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-navy font-medium">{etf.symbol}</span>
      </nav>

      {/* Page Header */}
      <div className="card p-6 mb-6">
        <div className="flex items-start gap-4">
          {etf.logo_url ? (
            <Image
              src={etf.logo_url}
              alt={etf.name}
              width={64}
              height={64}
              className="rounded-full shrink-0"
              unoptimized
            />
          ) : (
            <LogoFallback symbol={etf.symbol} />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-navy">
                {etf.name}{" "}
                <span className="text-slate font-normal">({etf.symbol})</span>
              </h1>
              <span className="inline-block px-2.5 py-0.5 rounded-full bg-lavender text-navy text-xs font-medium">
                ETF
              </span>
            </div>
            <div className="flex flex-wrap items-baseline gap-3 mt-2">
              <span className="text-3xl font-price text-navy">
                {formatPrice(etf.price)}
              </span>
              <span
                className={`text-lg font-price ${
                  isPositive ? "text-teal" : "text-coral"
                }`}
              >
                {isPositive ? "\u25B2" : "\u25BC"}{" "}
                {formatChange(etf.change_1d_pct)}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-2">
              <span className="text-sm font-price text-navy">
                {formatMarketCap(etf.market_cap)}
              </span>
              {etf.sector && (
                <span className="inline-block px-2.5 py-0.5 rounded-full bg-frost text-navy text-xs font-medium">
                  {etf.sector}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Key Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <StatCard
          label="Expense Ratio"
          value={
            details.expense_ratio != null
              ? `${(Number(details.expense_ratio) * 100).toFixed(2)}%`
              : "\u2014"
          }
        />
        <StatCard
          label="AUM"
          value={formatMarketCap(details.aum)}
        />
        <StatCard
          label="NAV"
          value={
            details.nav != null
              ? `${CURRENCY_SYMBOL} ${Number(details.nav).toFixed(2)}`
              : "\u2014"
          }
        />
        <StatCard
          label="Issuer"
          value={details.etf_company || "\u2014"}
        />
        <StatCard
          label="Inception Date"
          value={formatDate(details.inception_date)}
        />
        <StatCard
          label="Holdings Count"
          value={
            details.holdings_count != null
              ? formatNumber(details.holdings_count)
              : holdings.length > 0
              ? formatNumber(holdings.length)
              : "\u2014"
          }
        />
      </div>

      {/* Price Chart */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-navy mb-3">Price Chart</h2>
        {chartData.length > 0 ? (
          <PriceChart data={chartData} positive={isPositive} />
        ) : (
          <div className="card p-6 text-center">
            <p className="text-silver text-sm">No price data available</p>
          </div>
        )}
      </div>

      {/* Top Holdings */}
      {topHoldings.length > 0 && (
        <div className="card rounded-xl overflow-hidden mb-6">
          <div className="p-4 border-b border-silver/10">
            <h2 className="text-lg font-semibold text-navy">
              Top Holdings
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-mist border-b border-silver/20">
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-silver w-10">
                    #
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-silver">
                    Symbol
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-silver">
                    Name
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-silver">
                    Weight %
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-silver">
                    Market Value
                  </th>
                </tr>
              </thead>
              <tbody>
                {topHoldings.map((holding, i) => (
                  <tr
                    key={holding.asset_symbol || i}
                    className="table-row-alt border-b border-silver/10"
                  >
                    <td className="px-3 py-2 text-silver text-xs font-medium">
                      {i + 1}
                    </td>
                    <td className="px-3 py-2 text-sky font-semibold">
                      {holding.asset_symbol || "\u2014"}
                    </td>
                    <td className="px-3 py-2 text-slate max-w-[200px] truncate">
                      {holding.name || "\u2014"}
                    </td>
                    <td className="px-3 py-2 font-price text-navy">
                      {holding.weight_percentage != null
                        ? `${Number(holding.weight_percentage).toFixed(2)}%`
                        : "\u2014"}
                    </td>
                    <td className="px-3 py-2 font-price text-navy">
                      {holding.market_value != null
                        ? formatMarketCap(holding.market_value)
                        : "\u2014"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sector Breakdown */}
      {sectorChartData.length > 0 && (
        <div className="card p-6 mb-6">
          <h2 className="text-lg font-semibold text-navy mb-4">
            Sector Breakdown
          </h2>
          <SectorBreakdownChart data={sectorChartData} />
        </div>
      )}

      {/* Historical Price Table */}
      {recentPrices.length > 0 && (
        <div className="card rounded-xl overflow-hidden mb-6">
          <div className="p-4 border-b border-silver/10">
            <h2 className="text-lg font-semibold text-navy">
              Historical Prices (Last 30 Days)
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-mist border-b border-silver/20">
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-silver">
                    Date
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-silver">
                    Open
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-silver">
                    High
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-silver">
                    Low
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-silver">
                    Close
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-silver">
                    Volume
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-silver">
                    Change %
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentPrices.map((day) => {
                  const changePct = Number(day.change_percent);
                  const changeColor =
                    changePct > 0
                      ? "text-teal"
                      : changePct < 0
                      ? "text-coral"
                      : "text-silver";
                  return (
                    <tr
                      key={day.date}
                      className="table-row-alt border-b border-silver/10"
                    >
                      <td className="px-3 py-2 text-slate">
                        {formatDate(day.date)}
                      </td>
                      <td className="px-3 py-2 font-price text-navy">
                        {Number(day.open).toFixed(2)}
                      </td>
                      <td className="px-3 py-2 font-price text-navy">
                        {Number(day.high).toFixed(2)}
                      </td>
                      <td className="px-3 py-2 font-price text-navy">
                        {Number(day.low).toFixed(2)}
                      </td>
                      <td className="px-3 py-2 font-price text-navy">
                        {Number(day.close).toFixed(2)}
                      </td>
                      <td className="px-3 py-2 font-price text-navy">
                        {formatVolume(day.volume)}
                      </td>
                      <td className={`px-3 py-2 font-price ${changeColor}`}>
                        {formatChange(changePct)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: safeJsonLd({
            "@context": "https://schema.org",
            "@type": "InvestmentFund",
            name: etf.name,
            tickerSymbol: etf.symbol,
            description: etf.description,
            logo: etf.logo_url,
          }),
        }}
      />
    </div>
  );
}
