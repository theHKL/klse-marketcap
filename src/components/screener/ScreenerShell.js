'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { SCREENER_TABS, PAGE_SIZE } from '@/lib/constants';
import Tabs from '@/components/ui/Tabs';
import ScreenerTable from '@/components/screener/ScreenerTable';
import MarketOverviewCards from '@/components/layout/MarketOverviewCards';
import Breadcrumbs from '@/components/layout/Breadcrumbs';
import Skeleton from '@/components/ui/Skeleton';

function getTabByHref(href) {
  return SCREENER_TABS.find((t) => t.href === href) || SCREENER_TABS[0];
}

export default function ScreenerShell({ initialTab, initialData, initialPagination, initialTotal }) {
  const [activeTabHref, setActiveTabHref] = useState(initialTab);
  const [tabData, setTabData] = useState(() => ({
    [initialTab]: { data: initialData, pagination: initialPagination, total: initialTotal },
  }));
  const [loadingTab, setLoadingTab] = useState(null);
  const fetchControllerRef = useRef(null);

  const activeTab = getTabByHref(activeTabHref);

  // Sync with browser back/forward
  useEffect(() => {
    function handlePopState() {
      const path = window.location.pathname;
      const tab = SCREENER_TABS.find((t) => t.href === path);
      if (tab) {
        setActiveTabHref(tab.href);
      }
    }
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const fetchTabData = useCallback(async (tab) => {
    // Abort any in-flight request
    if (fetchControllerRef.current) {
      fetchControllerRef.current.abort();
    }
    const controller = new AbortController();
    fetchControllerRef.current = controller;

    setLoadingTab(tab.href);
    try {
      const params = new URLSearchParams({
        type: tab.type,
        sort: 'market_cap',
        order: 'desc',
        page: '1',
        limit: String(PAGE_SIZE),
      });
      const res = await fetch(`/api/securities?${params}`, { signal: controller.signal });
      const json = await res.json();
      setTabData((prev) => ({
        ...prev,
        [tab.href]: {
          data: json.data,
          pagination: json.pagination,
          total: json.pagination?.total || 0,
        },
      }));
    } catch (err) {
      if (err.name === 'AbortError') return;
    } finally {
      if (!controller.signal.aborted) {
        setLoadingTab(null);
        fetchControllerRef.current = null;
      }
    }
  }, []);

  function handleTabClick(href) {
    if (href === activeTabHref) return;

    const tab = getTabByHref(href);

    // Update URL without navigation
    history.pushState(null, '', href);

    // Update document title
    document.title = tab.title + ' | KLSE MarketCap';

    setActiveTabHref(href);

    // Fetch data if not cached
    if (!tabData[href]) {
      fetchTabData(tab);
    }
  }

  const cached = tabData[activeTabHref];
  const isLoading = loadingTab === activeTabHref;

  // Build description text
  const descriptionText = cached && cached.total > 0
    ? activeTab.description.replace('{total}', cached.total.toLocaleString())
    : activeTab.descriptionFallback;

  return (
    <>
      <Breadcrumbs items={[{ label: activeTab.breadcrumb }]} />

      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-slate-800">{activeTab.title}</h1>
        <p className="mt-1 text-sm text-slate-400">{descriptionText}</p>
      </div>

      <div className="mb-6">
        <Tabs tabs={SCREENER_TABS} activeTab={activeTabHref} onTabClick={handleTabClick} />
      </div>

      <MarketOverviewCards />
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton variant="row" count={10} />
        </div>
      ) : cached ? (
        <ScreenerTable
          key={activeTabHref}
          initialData={cached.data}
          initialPagination={cached.pagination}
          type={activeTab.type}
        />
      ) : null}
    </>
  );
}
