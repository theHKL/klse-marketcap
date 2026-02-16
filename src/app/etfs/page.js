import Link from "next/link";
import { getSecurities } from "@/lib/queries";
import { ITEMS_PER_PAGE } from "@/lib/constants";
import ScreenerTable from "@/components/ScreenerTable";
import Pagination from "@/components/Pagination";

export const revalidate = 60;

export const metadata = {
  title: "KLSE ETFs by Market Cap",
  description:
    "Browse all Bursa Malaysia listed ETFs. Compare expense ratios, AUM, and performance across Malaysian ETFs.",
};

export default async function ETFsPage({ searchParams }) {
  const params = await searchParams;
  const sort = params?.sort || "market_cap";
  const order = params?.order || "desc";
  const page = Number(params?.page) || 1;

  const { data, count } = await getSecurities({
    type: "etf",
    sort,
    order,
    page,
  });

  const totalPages = Math.ceil(count / ITEMS_PER_PAGE);
  const startRank = (page - 1) * ITEMS_PER_PAGE + 1;

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-navy mb-1">ETFs</h1>
        <p className="text-slate text-sm">
          All Bursa Malaysia listed ETFs ranked by market cap
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
        <Link
          href="/stocks"
          className="px-4 py-1.5 rounded-full text-sm font-medium text-slate hover:bg-mist hover:text-navy transition-colors"
        >
          Stocks
        </Link>
        <span className="px-4 py-1.5 rounded-full text-sm font-medium bg-sky text-white">
          ETFs
        </span>
      </div>

      {/* Screener Table */}
      <ScreenerTable
        securities={data}
        type="etf"
        sort={sort}
        order={order}
        startRank={startRank}
      />

      {/* Pagination */}
      <Pagination currentPage={page} totalPages={totalPages} />
    </div>
  );
}
