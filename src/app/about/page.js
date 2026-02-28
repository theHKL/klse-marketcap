import Breadcrumbs from '@/components/layout/Breadcrumbs';

export const metadata = {
  title: 'About',
  description: 'About KLSE MarketCap - track Bursa Malaysia stocks, ETFs, and unit trusts with live prices and financial data.',
};

const features = [
  {
    title: 'Live Prices',
    description:
      'Real-time and delayed price data for all Bursa Malaysia-listed securities including stocks, ETFs, and unit trusts.',
  },
  {
    title: 'Financial Data',
    description:
      'Income statements, balance sheets, cash flow statements, and key financial metrics updated regularly.',
  },
  {
    title: 'Market Screener',
    description:
      'Filter and sort securities by market capitalisation, price changes, sector, and more. Find opportunities quickly.',
  },
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <Breadcrumbs items={[{ label: 'About' }]} />

      <h1 className="mb-4 text-2xl font-extrabold text-slate-800">About KLSE MarketCap</h1>

      <div className="mb-8 space-y-4 text-sm leading-relaxed text-slate-500">
        <p>
          KLSE MarketCap is a market capitalisation screener for Bursa Malaysia listed securities.
          Browse stocks, ETFs, and unit trusts in one place with live prices, financial data, and
          peer comparisons. All prices are displayed in MYR (Malaysian Ringgit).
        </p>
        <p>
          Our goal is to make Malaysian market data approachable and easy to navigate. Whether you
          are a casual investor checking a stock price or an active trader comparing sectors, KLSE
          MarketCap provides the information you need in a clean, fast interface.
        </p>
      </div>

      <h2 className="mb-4 text-lg font-bold text-slate-800">Features</h2>
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        {features.map((feature) => (
          <div key={feature.title} className="rounded-2xl bg-surface p-5 shadow-card">
            <h3 className="mb-2 text-sm font-bold text-slate-800">{feature.title}</h3>
            <p className="text-xs leading-relaxed text-slate-500">{feature.description}</p>
          </div>
        ))}
      </div>

      <h2 className="mb-4 text-lg font-bold text-slate-800">Market Hours</h2>
      <div className="mb-8 rounded-2xl bg-surface p-5 shadow-card">
        <p className="mb-3 text-sm text-slate-500">
          Bursa Malaysia trading sessions (Monday to Friday, MYT):
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">Morning Session</p>
            <p className="mt-1 text-lg font-bold text-slate-800">9:00 AM - 12:30 PM</p>
          </div>
          <div className="rounded-xl bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">Afternoon Session</p>
            <p className="mt-1 text-lg font-bold text-slate-800">2:30 PM - 5:00 PM</p>
          </div>
        </div>
      </div>

      <h2 className="mb-4 text-lg font-bold text-slate-800">Data Source</h2>
      <div className="mb-8 space-y-2 text-sm leading-relaxed text-slate-500">
        <p>
          Price data is sourced from Yahoo Finance via the yahoo-finance2 library. Prices are
          updated regularly during Bursa Malaysia trading hours.
        </p>
        <p>
          Financial statements, key metrics, and company profiles are refreshed weekly.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-300/20 bg-white p-5">
        <h2 className="mb-2 text-sm font-bold text-slate-800">Disclaimer</h2>
        <p className="text-xs leading-relaxed text-slate-500">
          KLSE MarketCap provides general information only and does not constitute financial advice.
          The information on this website is not intended to be a recommendation to buy or sell any
          security. Always conduct your own research and consult a licensed financial adviser before
          making investment decisions. Prices may be delayed. We make no warranties about the
          accuracy or completeness of the data displayed.
        </p>
      </div>
    </div>
  );
}
