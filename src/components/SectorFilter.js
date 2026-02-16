"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

export default function SectorFilter({ sectors, activeSector }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleClick = useCallback(
    (sector) => {
      const params = new URLSearchParams(searchParams.toString());
      if (sector) {
        params.set("sector", sector);
      } else {
        params.delete("sector");
      }
      params.delete("page");
      router.push(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  return (
    <div className="overflow-x-auto pb-2 -mx-1">
      <div className="flex gap-2 px-1">
        <button
          onClick={() => handleClick(null)}
          className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
            !activeSector
              ? "bg-sky text-white"
              : "bg-mist text-slate hover:bg-sky-light"
          }`}
        >
          All
        </button>
        {sectors.map((sector) => (
          <button
            key={sector}
            onClick={() => handleClick(sector)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              activeSector === sector
                ? "bg-sky text-white"
                : "bg-mist text-slate hover:bg-sky-light"
            }`}
          >
            {sector}
          </button>
        ))}
      </div>
    </div>
  );
}
