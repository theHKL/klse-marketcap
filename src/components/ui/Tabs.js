'use client';

import Link from 'next/link';

export default function Tabs({ tabs, activeTab, onTabClick }) {
  function handleClick(e, tab) {
    if (!onTabClick) return;
    // Let Cmd/Ctrl+click open in new tab natively
    if (e.metaKey || e.ctrlKey) return;
    e.preventDefault();
    onTabClick(tab.href);
  }

  return (
    <nav className="flex gap-2" aria-label="Security type filter">
      {tabs.map((tab) => {
        const isActive = tab.href === activeTab;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            onClick={(e) => handleClick(e, tab)}
            aria-current={isActive ? 'page' : undefined}
            className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-5 py-2 text-sm font-semibold transition-colors ${
              isActive
                ? 'bg-primary text-white'
                : 'bg-white text-slate-800 hover:bg-primary-light/20'
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
