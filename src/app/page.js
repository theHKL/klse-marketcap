import Link from "next/link";
import { getSecurities } from "@/lib/queries";
import { BURSA_SECTORS, ITEMS_PER_PAGE } from "@/lib/constants";
import ScreenerTable from "@/components/ScreenerTable";
import SectorFilter from "@/components/SectorFilter";
import Pagination from "@/components/Pagination";

export const revalidate = 60;

export const metadata = {
  title: "KLSE MarketCap — Bursa Malaysia Stock Screener",
  description:
    "Browse all Bursa Malaysia listed stocks and ETFs ranked by market cap. Live prices, charts, and financials for every KLSE security.",
};

export default async function HomePage({ searchParams }) {
  const params = await searchParams;
  const sort = params?.sort || "market_cap";
  const order = params?.order || "desc";
  const sector = params?.sector || null;
  const page = Number(params?.page) || 1;

  const { data, count } = await getSecurities({
    sort,
    order,
    sector,
    page,
  });

  const totalPages = Math.ceil(count / ITEMS_PER_PAGE);
  const startRank = (page - 1) * ITEMS_PER_PAGE + 1;

  return (
    <div>
      {/* Hero */}
      <div className="text-center mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-navy mb-2">
          KLSE MarketCap
        </h1>
        <p className="text-slate text-base">
          Track every stock and ETF on Bursa Malaysia
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 mb-4">
        <span className="px-4 py-1.5 rounded-full text-sm font-medium bg-sky text-white">
          All
        </span>
        <Link
          href="/stocks"
          className="px-4 py-1.5 rounded-full text-sm font-medium text-slate hover:bg-mist hover:text-navy transition-colors"
        >
          Stocks
        </Link>
        <Link
          href="/etfs"
          className="px-4 py-1.5 rounded-full text-sm font-medium text-slate hover:bg-mist hover:text-navy transition-colors"
        >
          ETFs
        </Link>
      </div>

      {/* Sector Filter */}
      <div className="mb-6">
        <SectorFilter sectors={BURSA_SECTORS} activeSector={sector} />
      </div>

      {/* Screener Table */}
      <ScreenerTable
        securities={data}
        type={null}
        sort={sort}
        order={order}
        startRank={startRank}
      />

      {/* Pagination */}
      <Pagination currentPage={page} totalPages={totalPages} />
    </div>
  );
}
