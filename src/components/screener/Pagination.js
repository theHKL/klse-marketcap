'use client';

export default function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  function getPages() {
    const pages = [];
    const delta = 2;
    const left = Math.max(2, currentPage - delta);
    const right = Math.min(totalPages - 1, currentPage + delta);

    pages.push(1);
    if (left > 2) pages.push('...');
    for (let i = left; i <= right; i++) pages.push(i);
    if (right < totalPages - 1) pages.push('...');
    if (totalPages > 1) pages.push(totalPages);

    return pages;
  }

  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-1 py-4">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="min-h-[44px] min-w-[44px] rounded-xl px-3 py-2 text-sm font-semibold text-slate-800 transition-colors hover:bg-primary-light/10 disabled:text-slate-400/40 disabled:hover:bg-transparent"
      >
        Prev
      </button>

      {getPages().map((page, idx) =>
        page === '...' ? (
          <span key={`ellipsis-${idx}`} className="px-1 text-slate-400">
            ...
          </span>
        ) : (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`min-h-[44px] min-w-[44px] rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
              page === currentPage
                ? 'bg-primary text-white'
                : 'text-slate-800 hover:bg-primary-light/10'
            }`}
            aria-current={page === currentPage ? 'page' : undefined}
          >
            {page}
          </button>
        )
      )}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="min-h-[44px] min-w-[44px] rounded-xl px-3 py-2 text-sm font-semibold text-slate-800 transition-colors hover:bg-primary-light/10 disabled:text-slate-400/40 disabled:hover:bg-transparent"
      >
        Next
      </button>
    </nav>
  );
}
