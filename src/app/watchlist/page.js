import ScreenerShell from '@/components/screener/ScreenerShell';

export const metadata = {
  title: 'My Watchlists',
  description: 'Track your favourite KLSE securities with personal watchlists.',
};

export default function WatchlistPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <ScreenerShell
        initialTab="/watchlist"
        initialData={[]}
        initialPagination={null}
        initialTotal={0}
      />
    </div>
  );
}
