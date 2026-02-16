"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";

function getPageNumbers(current, total) {
  if (total <= 5) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages = [];
  let start = Math.max(1, current - 2);
  let end = Math.min(total, current + 2);

  if (current <= 3) {
    end = 5;
  }
  if (current >= total - 2) {
    start = total - 4;
  }

  if (start > 1) {
    pages.push(1);
    if (start > 2) pages.push("...");
  }

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (end < total) {
    if (end < total - 1) pages.push("...");
    pages.push(total);
  }

  return pages;
}

function PageButton({ page, isCurrent, searchParams }) {
  if (page === "...") {
    return (
      <span className="px-3 py-2 text-sm text-silver select-none">...</span>
    );
  }

  const params = new URLSearchParams(searchParams.toString());
  params.set("page", String(page));

  return (
    <Link
      href={`?${params.toString()}`}
      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
        isCurrent
          ? "bg-sky text-white"
          : "bg-white text-slate hover:bg-mist border border-silver/20"
      }`}
    >
      {page}
    </Link>
  );
}

export default function Pagination({ currentPage, totalPages }) {
  const searchParams = useSearchParams();

  if (totalPages <= 1) return null;

  const pages = getPageNumbers(currentPage, totalPages);

  const prevParams = new URLSearchParams(searchParams.toString());
  prevParams.set("page", String(currentPage - 1));

  const nextParams = new URLSearchParams(searchParams.toString());
  nextParams.set("page", String(currentPage + 1));

  return (
    <div className="flex items-center justify-center gap-1 mt-6">
      {currentPage > 1 ? (
        <Link
          href={`?${prevParams.toString()}`}
          className="px-3 py-2 rounded-lg text-sm font-medium bg-white text-slate hover:bg-mist border border-silver/20 transition-colors"
        >
          Previous
        </Link>
      ) : (
        <span className="px-3 py-2 rounded-lg text-sm font-medium bg-white text-silver/50 border border-silver/10 cursor-not-allowed">
          Previous
        </span>
      )}

      {pages.map((page, i) => (
        <PageButton
          key={`${page}-${i}`}
          page={page}
          isCurrent={page === currentPage}
          searchParams={searchParams}
        />
      ))}

      {currentPage < totalPages ? (
        <Link
          href={`?${nextParams.toString()}`}
          className="px-3 py-2 rounded-lg text-sm font-medium bg-white text-slate hover:bg-mist border border-silver/20 transition-colors"
        >
          Next
        </Link>
      ) : (
        <span className="px-3 py-2 rounded-lg text-sm font-medium bg-white text-silver/50 border border-silver/10 cursor-not-allowed">
          Next
        </span>
      )}
    </div>
  );
}
