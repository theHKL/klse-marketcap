import useSWR from 'swr';

const fetcher = (url) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error('fetch failed');
    return r.json();
  });

export function useMarketOverview() {
  const { data, error, isLoading } = useSWR('/api/market-overview', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 5 * 60 * 1000, // 5 min — index data updates slowly
  });

  return {
    data,
    isLoading,
    failed: !!error,
  };
}
