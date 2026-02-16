import Link from "next/link";
import { getSecurities } from "@/lib/queries";
import { BURSA_SECTORS, ITEMS_PER_PAGE } from "@/lib/constants";
import ScreenerTable from "@/components/ScreenerTable";
import SectorFilter from "@/components/SectorFilter";
import Pagination from "@/components/Pagination";

export const revalidate = 60;

export const metadata = {
  title: "KLSE Stocks by Market Cap",
  description:
    "Browse all Bursa Malaysia listed stocks ranked by market capitalisation. Live prices, sector filtering, and financial data.",
};

export default async function StocksPage({ searchParams }) {
  const params = await searchParams;
  const sort = params?.sort || "market_cap";
  const order = params?.order || "desc";
  const sector = params?.sector || null;
  const page = Number(params?.page) || 1;

  const { data, count } = await getSecurities({
    type: "stock",
    sort,
    order,
    sector,
    page,
  });

  const totalPages = Math.ceil(count / ITEMS_PER_PAGE);
  const startRank = (page - 1) * ITEMS_PER_PAGE + 1;

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-navy mb-1">Stocks</h1>
        <p className="text-slate text-sm">
          All Bursa Malaysia listed stocks ranked by market cap
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 mb-4">
        <Link
          href="/"
          className="px-4 py-1.5 rounded-full text-sm font-medium text-slate hover:bg-mist hover:text-navy transition-colors"
        >
          All
        </Link>
        <span className="px-4 py-1.5 rounded-full text-sm font-medium bg-sky text-white">
          Stocks
        </span>
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
        type="stock"
        sort={sort}
        order={order}
        startRank={startRank}
      />

      {/* Pagination */}
      <Pagination currentPage={page} totalPages={totalPages} />
    </div>
  );
}
