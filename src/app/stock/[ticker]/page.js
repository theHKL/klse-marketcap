import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  getSecurityBySymbol,
  getDailyPrices,
  getIncomeStatements,
  getBalanceSheets,
  getCashFlows,
  getKeyMetrics,
  getStockPeers,
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
import { PriceChart, MiniTrendChart, PriceRangeBar } from "@/components/charts";
import StatCard from "@/components/StatCard";
import PeerTable from "@/components/PeerTable";

export const revalidate = 300;

export async function generateStaticParams() {
  const symbols = await getAllSymbols("stock");
  return symbols.slice(0, 200).map((symbol) => ({ ticker: symbol }));
}

export async function generateMetadata({ params }) {
  const { ticker } = await params;
  const stock = await getSecurityBySymbol(ticker);
  if (!stock) {
    return { title: "Stock Not Found" };
  }
  return {
    title: `${stock.name} (${stock.symbol}) Market Cap, Price & Financials`,
    description: `${stock.name} (${stock.symbol}) has a market cap of ${formatMarketCap(stock.market_cap)}. View live price, charts, financials, and peer comparison on KLSE MarketCap.`,
    openGraph: {
      title: `${stock.name} (${stock.symbol}) Market Cap, Price & Financials`,
      description: `${stock.name} (${stock.symbol}) has a market cap of ${formatMarketCap(stock.market_cap)}.`,
      images: stock.logo_url ? [{ url: stock.logo_url }] : [],
    },
  };
}

function LogoFallback({ symbol, size = 64 }) {
  const letter = symbol ? symbol.charAt(0).toUpperCase() : "?";
  return (
    <div
      className="rounded-full bg-frost flex items-center justify-center text-xl font-bold text-navy"
      style={{ width: size, height: size }}
    >
      {letter}
    </div>
  );
}

function FinancialRow({ label, value }) {
  return (
    <div className="flex justify-between py-2 border-b border-silver/10 last:border-0">
      <span className="text-sm text-slate">{label}</span>
      <span className="text-sm font-price text-navy">{value ?? "\u2014"}</span>
    </div>
  );
}

export default async function StockDetailPage({ params }) {
  const { ticker } = await params;
  const stock = await getSecurityBySymbol(ticker);

  if (!stock) {
    notFound();
  }

  const [dailyPrices, incomeStatements, balanceSheets, cashFlows, keyMetrics, peers] =
    await Promise.all([
      getDailyPrices(stock.id, 365),
      getIncomeStatements(stock.id),
      getBalanceSheets(stock.id),
      getCashFlows(stock.id),
      getKeyMetrics(stock.id),
      getStockPeers(stock.id),
    ]);

  const recentPrices = await getDailyPrices(stock.id, 30);

  // Transform daily prices for chart (ascending order)
  const chartData = [...dailyPrices]
    .reverse()
    .map((d) => ({ time: d.date, value: Number(d.close) }));

  const change1d = Number(stock.change_1d_pct);
  const isPositive = change1d >= 0;

  // Key metrics latest
  const latestMetrics = keyMetrics[0] || {};
  const latestIncome = incomeStatements[0] || {};
  const latestBalance = balanceSheets[0] || {};
  const latestCashFlow = cashFlows[0] || {};

  // Mini trend data builders (ascending order for charts)
  function buildTrendData(items, dateField, valueField) {
    return [...items]
      .filter((d) => d[dateField] && d[valueField] != null)
      .reverse()
      .map((d) => ({ time: d[dateField], value: Number(d[valueField]) }));
  }

  function determineTrend(items, valueField) {
    if (!items || items.length < 2) return "neutral";
    const latest = Number(items[0]?.[valueField]);
    const prev = Number(items[1]?.[valueField]);
    if (isNaN(latest) || isNaN(prev)) return "neutral";
    return latest >= prev ? "up" : "down";
  }

  const mcapTrend = buildTrendData(keyMetrics, "date", "market_cap");
  const revenueTrend = buildTrendData(incomeStatements, "date", "revenue");
  const netIncomeTrend = buildTrendData(incomeStatements, "date", "net_income");
  const peTrend = buildTrendData(keyMetrics, "date", "pe_ratio");
  const epsTrend = buildTrendData(keyMetrics, "date", "earnings_per_share");

  return (
    <div>
      {/* Breadcrumbs */}
      <nav className="text-sm text-slate mb-4">
        <Link href="/" className="text-sky hover:underline">
          Home
        </Link>
        <span className="mx-1.5">/</span>
        <Link href="/stocks" className="text-sky hover:underline">
          Stocks
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-navy font-medium">{stock.symbol}</span>
      </nav>

      {/* Page Header */}
      <div className="card p-6 mb-6">
        <div className="flex items-start gap-4">
          {stock.logo_url ? (
            <Image
              src={stock.logo_url}
              alt={stock.name}
              width={64}
              height={64}
              className="rounded-full shrink-0"
              unoptimized
            />
          ) : (
            <LogoFallback symbol={stock.symbol} />
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-navy">
              {stock.name}{" "}
              <span className="text-slate font-normal">({stock.symbol})</span>
            </h1>
            <div className="flex flex-wrap items-baseline gap-3 mt-2">
              <span className="text-3xl font-price text-navy">
                {formatPrice(stock.price)}
              </span>
              <span
                className={`text-lg font-price ${
                  isPositive ? "text-teal" : "text-coral"
                }`}
              >
                {isPositive ? "\u25B2" : "\u25BC"}{" "}
                {formatChange(stock.change_1d_pct)}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-2">
              <span className="text-sm font-price text-navy">
                {formatMarketCap(stock.market_cap)}
              </span>
              {stock.sector && (
                <span className="inline-block px-2.5 py-0.5 rounded-full bg-frost text-navy text-xs font-medium">
                  {stock.sector}
                </span>
              )}
              {stock.industry && (
                <span className="inline-block px-2.5 py-0.5 rounded-full bg-frost text-navy text-xs font-medium">
                  {stock.industry}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Key Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatCard label="Market Cap" value={formatMarketCap(stock.market_cap)} />
        <StatCard label="Volume" value={formatVolume(stock.volume)} />
        <StatCard
          label="P/E Ratio"
          value={
            latestMetrics.pe_ratio != null
              ? Number(latestMetrics.pe_ratio).toFixed(2)
              : "\u2014"
          }
        />
        <StatCard
          label="EPS"
          value={
            latestMetrics.earnings_per_share != null
              ? `${CURRENCY_SYMBOL} ${Number(latestMetrics.earnings_per_share).toFixed(2)}`
              : "\u2014"
          }
        />
        <StatCard
          label="Dividend Yield"
          value={
            latestMetrics.dividend_yield != null
              ? `${(Number(latestMetrics.dividend_yield) * 100).toFixed(2)}%`
              : "\u2014"
          }
        />
        <StatCard
          label="52-Week High"
          value={
            stock.year_high != null
              ? `${CURRENCY_SYMBOL} ${Number(stock.year_high).toFixed(2)}`
              : "\u2014"
          }
        />
        <StatCard
          label="52-Week Low"
          value={
            stock.year_low != null
              ? `${CURRENCY_SYMBOL} ${Number(stock.year_low).toFixed(2)}`
              : "\u2014"
          }
        />
        <StatCard
          label="Beta"
          value={
            latestMetrics.beta != null
              ? Number(latestMetrics.beta).toFixed(2)
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

      {/* Financial Trends */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-navy mb-3">
          Financial Trends
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <MiniTrendChart
            title="Market Cap"
            data={mcapTrend}
            latestValue={formatMarketCap(latestMetrics.market_cap)}
            trend={determineTrend(keyMetrics, "market_cap")}
          />
          <MiniTrendChart
            title="Revenue"
            data={revenueTrend}
            latestValue={formatMarketCap(latestIncome.revenue)}
            trend={determineTrend(incomeStatements, "revenue")}
          />
          <MiniTrendChart
            title="Net Income"
            data={netIncomeTrend}
            latestValue={formatMarketCap(latestIncome.net_income)}
            trend={determineTrend(incomeStatements, "net_income")}
          />
          <MiniTrendChart
            title="P/E Ratio"
            data={peTrend}
            latestValue={
              latestMetrics.pe_ratio != null
                ? Number(latestMetrics.pe_ratio).toFixed(2)
                : "\u2014"
            }
            trend={determineTrend(keyMetrics, "pe_ratio")}
          />
          <MiniTrendChart
            title="EPS"
            data={epsTrend}
            latestValue={
              latestMetrics.earnings_per_share != null
                ? `${CURRENCY_SYMBOL} ${Number(latestMetrics.earnings_per_share).toFixed(2)}`
                : "\u2014"
            }
            trend={determineTrend(keyMetrics, "earnings_per_share")}
          />
        </div>
      </div>

      {/* Company Description */}
      {(stock.description || stock.ceo || stock.website) && (
        <div className="card p-6 mb-6">
          <h2 className="text-lg font-semibold text-navy mb-3">
            About {stock.name}
          </h2>
          {stock.description && (
            <p className="text-slate text-sm leading-relaxed mb-4">
              {stock.description}
            </p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-sm">
            {stock.ceo && (
              <div className="flex justify-between py-1">
                <span className="text-silver">CEO</span>
                <span className="text-navy">{stock.ceo}</span>
              </div>
            )}
            {stock.full_time_employees != null && (
              <div className="flex justify-between py-1">
                <span className="text-silver">Employees</span>
                <span className="text-navy">
                  {formatNumber(stock.full_time_employees)}
                </span>
              </div>
            )}
            {stock.ipo_date && (
              <div className="flex justify-between py-1">
                <span className="text-silver">Founded / IPO</span>
                <span className="text-navy">{formatDate(stock.ipo_date)}</span>
              </div>
            )}
            {stock.website && (
              <div className="flex justify-between py-1">
                <span className="text-silver">Website</span>
                <a
                  href={stock.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sky hover:underline truncate max-w-[200px]"
                >
                  {stock.website.replace(/^https?:\/\//, "")}
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Price Ranges */}
      {(stock.year_low != null || stock.year_high != null) && (
        <div className="card p-6 mb-6">
          <h2 className="text-lg font-semibold text-navy mb-4">
            Price Ranges
          </h2>
          <div className="space-y-4">
            {stock.year_low != null &&
              stock.year_high != null &&
              stock.price != null && (
                <PriceRangeBar
                  label="52-Week Range"
                  low={Number(stock.year_low)}
                  high={Number(stock.year_high)}
                  current={Number(stock.price)}
                  formatFn={(v) => `${CURRENCY_SYMBOL} ${v.toFixed(2)}`}
                />
              )}
            {stock.all_time_high != null && (
              <div className="flex justify-between text-sm">
                <span className="text-silver">All-Time High</span>
                <span className="font-price text-navy">
                  {CURRENCY_SYMBOL} {Number(stock.all_time_high).toFixed(2)}
                  {stock.all_time_high_date && (
                    <span className="text-silver ml-2">
                      ({formatDate(stock.all_time_high_date)})
                    </span>
                  )}
                </span>
              </div>
            )}
            {stock.all_time_low != null && (
              <div className="flex justify-between text-sm">
                <span className="text-silver">All-Time Low</span>
                <span className="font-price text-navy">
                  {CURRENCY_SYMBOL} {Number(stock.all_time_low).toFixed(2)}
                  {stock.all_time_low_date && (
                    <span className="text-silver ml-2">
                      ({formatDate(stock.all_time_low_date)})
                    </span>
                  )}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Key Financial Data */}
      <div className="card p-6 mb-6">
        <h2 className="text-lg font-semibold text-navy mb-3">
          Key Financial Data
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
          <FinancialRow
            label="Revenue (TTM)"
            value={formatMarketCap(latestIncome.revenue)}
          />
          <FinancialRow
            label="Net Income (TTM)"
            value={formatMarketCap(latestIncome.net_income)}
          />
          <FinancialRow
            label="Total Assets"
            value={formatMarketCap(latestBalance.total_assets)}
          />
          <FinancialRow
            label="Total Debt"
            value={formatMarketCap(latestBalance.total_debt)}
          />
          <FinancialRow
            label="Free Cash Flow"
            value={formatMarketCap(latestCashFlow.free_cash_flow)}
          />
          <FinancialRow
            label="ROE"
            value={
              latestMetrics.return_on_equity != null
                ? formatChange(Number(latestMetrics.return_on_equity) * 100)
                : "\u2014"
            }
          />
          <FinancialRow
            label="Profit Margin"
            value={
              latestMetrics.net_income_per_revenue != null
                ? formatChange(
                    Number(latestMetrics.net_income_per_revenue) * 100
                  )
                : "\u2014"
            }
          />
        </div>
      </div>

      {/* Similar Companies */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-navy mb-3">
          Similar Companies
        </h2>
        <PeerTable peers={peers} />
      </div>

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
            "@type": "Corporation",
            name: stock.name,
            tickerSymbol: stock.symbol,
            url: stock.website,
            description: stock.description,
            logo: stock.logo_url,
          }),
        }}
      />
    </div>
  );
}
