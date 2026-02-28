'use client';

export default function SortHeader({ label, field, currentSort, currentOrder, onSort, align = 'left' }) {
  const isActive = currentSort === field;

  function handleClick() {
    if (!isActive) {
      onSort(field, 'desc');
    } else if (currentOrder === 'desc') {
      onSort(field, 'asc');
    } else {
      onSort('market_cap', 'desc');
    }
  }

  return (
    <button
      onClick={handleClick}
      className={`group flex min-h-[44px] w-full items-center gap-1 whitespace-nowrap text-xs font-bold uppercase tracking-wider text-slate-400 transition-colors hover:text-slate-800 ${align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : ''}`}
      aria-label={`Sort by ${label}${isActive ? (currentOrder === 'asc' ? ', ascending' : ', descending') : ''}`}
    >
      {label}
      <span className={`text-[10px] ${isActive ? 'text-primary' : 'text-slate-400/50'}`}>
        {isActive ? (currentOrder === 'asc' ? '▲' : '▼') : '⇅'}
      </span>
    </button>
  );
}
