import Link from "next/link";
import Image from "next/image";
import { formatMarketCap, formatPrice, formatChange } from "@/lib/format";

const SORTABLE_COLUMNS = [
  { key: "name", label: "Name" },
  { key: "sector", label: "Sector" },
  { key: "market_cap", label: "Market Cap" },
  { key: "price", label: "Price" },
  { key: "change_1d_pct", label: "1D Change" },
  { key: "change_7d_pct", label: "7D Change" },
];

function SortableHeader({ columnKey, label, currentSort, currentOrder, type }) {
  const isActive = currentSort === columnKey;
  const nextOrder = isActive && currentOrder === "desc" ? "asc" : "desc";

  const params = new URLSearchParams();
  params.set("sort", columnKey);
  params.set("order", nextOrder);

  const sectorLabel = type === "etf" && columnKey === "sector" ? "Category" : label;

  return (
    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-silver whitespace-nowrap">
      <Link
        href={`?${params.toString()}`}
        className="inline-flex items-center gap-1 hover:text-navy transition-colors"
      >
        {sectorLabel}
        {isActive ? (
          <span className="text-sky">
            {currentOrder === "asc" ? "\u25B2" : "\u25BC"}
          </span>
        ) : (
          <span className="text-silver/40">{"\u25BC"}</span>
        )}
      </Link>
    </th>
  );
}

function ChangeCell({ value }) {
  if (value == null || isNaN(value)) {
    return <span className="text-silver font-price">{"\u2014"}</span>;
  }
  const num = Number(value);
  if (num > 0) {
    return (
      <span className="text-teal font-price">
        {"\u25B2 "}{formatChange(num)}
      </span>
    );
  }
  if (num < 0) {
    return (
      <span className="text-coral font-price">
        {"\u25BC "}{formatChange(num)}
      </span>
    );
  }
  return <span className="text-silver font-price">{"\u2014"}</span>;
}

function LogoFallback({ symbol }) {
  const letter = symbol ? symbol.charAt(0).toUpperCase() : "?";
  const colors = [
    "bg-sky-light text-sky",
    "bg-mint text-teal",
    "bg-lavender text-navy",
    "bg-frost text-slate",
  ];
  const index = letter.charCodeAt(0) % colors.length;
  return (
    <div
      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${colors[index]}`}
    >
      {letter}
    </div>
  );
}

export default function ScreenerTable({
  securities,
  type,
  sort = "market_cap",
  order = "desc",
  startRank = 1,
}) {
  if (!securities || securities.length === 0) {
    return (
      <div className="card p-8 text-center">
        <p className="text-silver text-sm">No securities found.</p>
      </div>
    );
  }

  return (
    <div className="card rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-mist border-b border-silver/20">
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-silver w-10">
                #
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-silver w-10">
                {/* Logo */}
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-silver">
                Symbol
              </th>
              {SORTABLE_COLUMNS.map((col) => (
                <SortableHeader
                  key={col.key}
                  columnKey={col.key}
                  label={col.label}
                  currentSort={sort}
                  currentOrder={order}
                  type={type}
                />
              ))}
            </tr>
          </thead>
          <tbody>
            {securities.map((sec, i) => {
              const detailPath =
                sec.type === "etf"
                  ? `/etf/${sec.symbol.toLowerCase()}`
                  : `/stock/${sec.symbol.toLowerCase()}`;

              return (
                <tr
                  key={sec.symbol}
                  className="table-row-alt border-b border-silver/10 hover:bg-frost/50 transition-colors"
                >
                  {/* Rank */}
                  <td className="px-3 py-3 text-silver text-xs font-medium">
                    {startRank + i}
                  </td>

                  {/* Logo */}
                  <td className="px-3 py-3">
                    {sec.logo_url ? (
                      <Image
                        src={sec.logo_url}
                        alt={sec.symbol}
                        width={32}
                        height={32}
                        className="rounded-full"
                        unoptimized
                      />
                    ) : (
                      <LogoFallback symbol={sec.symbol} />
                    )}
                  </td>

                  {/* Symbol */}
                  <td className="px-3 py-3">
                    <Link
                      href={detailPath}
                      className="text-sky font-semibold hover:underline"
                    >
                      {sec.symbol}
                    </Link>
                  </td>

                  {/* Name */}
                  <td className="px-3 py-3 text-slate max-w-[200px] truncate">
                    {sec.name || "\u2014"}
                  </td>

                  {/* Sector / Category */}
                  <td className="px-3 py-3 text-slate text-xs whitespace-nowrap">
                    {sec.sector || "\u2014"}
                  </td>

                  {/* Market Cap */}
                  <td className="px-3 py-3 font-price text-navy">
                    {formatMarketCap(sec.market_cap)}
                  </td>

                  {/* Price */}
                  <td className="px-3 py-3 font-price text-navy">
                    {formatPrice(sec.price)}
                  </td>

                  {/* 1D Change */}
                  <td className="px-3 py-3">
                    <ChangeCell value={sec.change_1d_pct} />
                  </td>

                  {/* 7D Change */}
                  <td className="px-3 py-3">
                    <ChangeCell value={sec.change_7d_pct} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
