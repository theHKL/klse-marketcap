import Link from "next/link";
import Image from "next/image";
import { formatMarketCap, formatPrice, formatChange } from "@/lib/format";

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
      className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${colors[index]}`}
    >
      {letter}
    </div>
  );
}

export default function PeerTable({ peers }) {
  if (!peers || peers.length === 0) {
    return (
      <div className="card p-6 text-center">
        <p className="text-silver text-sm">No peer data available</p>
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
                {/* Logo */}
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-silver">
                Symbol
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-silver">
                Name
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-silver">
                Market Cap
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-silver">
                Price
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-silver">
                1D Change
              </th>
            </tr>
          </thead>
          <tbody>
            {peers.map((peer) => {
              const detailPath =
                peer.type === "etf"
                  ? `/etf/${peer.symbol.toLowerCase()}`
                  : `/stock/${peer.symbol.toLowerCase()}`;
              const change = Number(peer.change_1d_pct);
              const changeColor =
                change > 0
                  ? "text-teal"
                  : change < 0
                  ? "text-coral"
                  : "text-silver";
              const arrow =
                change > 0 ? "\u25B2 " : change < 0 ? "\u25BC " : "";

              return (
                <tr
                  key={peer.symbol}
                  className="table-row-alt border-b border-silver/10 hover:bg-frost/50 transition-colors"
                >
                  <td className="px-3 py-3">
                    {peer.logo_url ? (
                      <Image
                        src={peer.logo_url}
                        alt={peer.symbol}
                        width={24}
                        height={24}
                        className="rounded-full"
                        unoptimized
                      />
                    ) : (
                      <LogoFallback symbol={peer.symbol} />
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <Link
                      href={detailPath}
                      className="text-sky font-semibold hover:underline"
                    >
                      {peer.symbol}
                    </Link>
                  </td>
                  <td className="px-3 py-3 text-slate max-w-[180px] truncate">
                    {peer.name || "\u2014"}
                  </td>
                  <td className="px-3 py-3 font-price text-navy">
                    {formatMarketCap(peer.market_cap)}
                  </td>
                  <td className="px-3 py-3 font-price text-navy">
                    {formatPrice(peer.price)}
                  </td>
                  <td className="px-3 py-3">
                    <span className={`font-price ${changeColor}`}>
                      {arrow}
                      {formatChange(peer.change_1d_pct)}
                    </span>
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
