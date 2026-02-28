import '@/styles/globals.css';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import AuthProvider from '@/components/auth/AuthProvider';
import { WatchlistProvider } from '@/lib/hooks/useWatchlist';

export const metadata = {
  title: {
    default: 'KLSE MarketCap - Bursa Malaysia Stock Screener',
    template: '%s | KLSE MarketCap',
  },
  description:
    'Browse and compare all KLSE-listed stocks and ETFs by market capitalisation. Live prices, charts, financials, and peer comparison.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://klsemarketcap.com'),
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-surface text-slate-800 antialiased">
        <AuthProvider>
          <WatchlistProvider>
            <Navbar />
            <main className="min-h-screen pt-16">{children}</main>
            <Footer />
          </WatchlistProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
