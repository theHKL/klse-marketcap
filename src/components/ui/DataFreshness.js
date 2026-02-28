'use client';

import useSWR from 'swr';

const fetcher = (url) => fetch(url).then((r) => r.json());

export default function DataFreshness() {
  const { data, error } = useSWR('/api/last-sync', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60 * 1000, // 1 min
  });

  if (error) {
    return (
      <span className="text-xs font-medium text-slate-400">
        Sync status unavailable
      </span>
    );
  }

  if (!data) {
    return (
      <span className="text-xs font-medium text-slate-400">Loading...</span>
    );
  }

  if (!data.lastSync) {
    return (
      <span className="text-xs font-medium text-slate-400">
        No sync data
      </span>
    );
  }

  const diffMs = Date.now() - new Date(data.lastSync).getTime();
  const diffMin = Math.round(diffMs / 60000);

  let colorClass;
  if (diffMin < 10) {
    colorClass = 'text-primary';
  } else if (diffMin < 30) {
    colorClass = 'text-[#9A7B1F]';
  } else {
    colorClass = 'text-red-500';
  }

  return (
    <span className={`text-xs font-medium ${colorClass}`}>
      Synced {diffMin}m ago
    </span>
  );
}
