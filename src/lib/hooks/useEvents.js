import useSWR from 'swr';

const fetcher = (url) =>
  fetch(url)
    .then((r) => r.json())
    .then((j) => j.events || []);

export function useEvents() {
  const { data, error, isLoading } = useSWR('/api/events', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 5 * 60 * 1000, // 5 min — events rarely change
  });

  return {
    events: data || [],
    isLoading,
    error,
  };
}
