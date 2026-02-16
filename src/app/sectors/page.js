import Link from "next/link";
import Image from "next/image";
import { getSectorStats } from "@/lib/queries";
import { formatMarketCap, formatChange } from "@/lib/format";

export const revalidate = 60;

export const metadata = {
  title: "Bursa Malaysia Sectors Overview",
  description:
    "Explore all Bursa Malaysia sectors including Financial Services, Technology, Plantation, and more. See top companies and market cap by sector.",
};

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

export default async function SectorsPage() {
  const sectors = await getSectorStats();

  // Sort by total market cap descending
  const sortedSectors = [...sectors].sort(
    (a, b) => b.totalMarketCap - a.totalMarketCap
  );

  return (
    <div>
      <h1 className="text-2xl font-bold text-navy mb-1">Sectors</h1>
      <p className="text-slate text-sm mb-6">
        Bursa Malaysia sectors overview
      </p>

      {sortedSectors.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-silver text-sm">No sector data available</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedSectors.map((sector) => {
            const avgChange = Number(sector.avgChange1d);
            const changeColor =
              avgChange > 0
                ? "text-teal"
                : avgChange < 0
                ? "text-coral"
                : "text-silver";

            return (
              <Link
                key={sector.sector}
                href={`/stocks?sector=${encodeURIComponent(sector.sector)}`}
                className="card p-5 border-l-4 border-sky hover:shadow-md transition-shadow"
              >
                <h2 className="font-semibold text-navy">{sector.sector}</h2>
                <div className="flex items-center gap-3 mt-2 text-sm">
                  <span className="text-slate">
                    {sector.count} {sector.count === 1 ? "company" : "companies"}
                  </span>
                  <span className="text-silver">|</span>
                  <span className="font-price text-navy">
                    {formatMarketCap(sector.totalMarketCap)}
                  </span>
                </div>
                <div className="mt-1">
                  <span className={`text-xs font-price ${changeColor}`}>
                    Avg 1D: {formatChange(avgChange)}
                  </span>
                </div>

                {/* Top 3 companies */}
                {sector.topCompanies && sector.topCompanies.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-silver/10 space-y-1.5">
                    {sector.topCompanies.map((company) => {
                      const compChange = Number(company.change_1d_pct);
                      const compColor =
                        compChange > 0
                          ? "text-teal"
                          : compChange < 0
                          ? "text-coral"
                          : "text-silver";
                      return (
                        <div
                          key={company.symbol}
                          className="flex items-center gap-2"
                        >
                          {company.logo_url ? (
                            <Image
                              src={company.logo_url}
                              alt={company.symbol}
                              width={20}
                              height={20}
                              className="rounded-full"
                              unoptimized
                            />
                          ) : (
                            <LogoFallback symbol={company.symbol} />
                          )}
                          <span className="text-xs text-navy font-medium">
                            {company.symbol}
                          </span>
                          <span
                            className={`text-xs font-price ml-auto ${compColor}`}
                          >
                            {formatChange(company.change_1d_pct)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
