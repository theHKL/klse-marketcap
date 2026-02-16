export const metadata = {
  title: "About",
  description:
    "Learn about KLSE MarketCap, our data sources, and important disclaimers.",
};

export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-navy mb-6">
        About KLSE MarketCap
      </h1>

      <section className="card p-6 mb-6">
        <h2 className="text-lg font-semibold text-navy mb-3">What We Do</h2>
        <p className="text-slate text-sm leading-relaxed">
          KLSE MarketCap is a free market capitalisation screener for Bursa
          Malaysia (KLSE) listed securities. We provide live prices, financial
          data, charts, and company information for all listed stocks and ETFs
          on the Malaysian stock exchange.
        </p>
        <p className="text-slate text-sm leading-relaxed mt-3">
          Our mission is to make Malaysian financial data accessible, beautiful,
          and easy to understand for everyone — from casual investors to seasoned
          traders.
        </p>
      </section>

      <section className="card p-6 mb-6">
        <h2 className="text-lg font-semibold text-navy mb-3">Data Sources</h2>
        <p className="text-slate text-sm leading-relaxed">
          Market data is sourced from Financial Modeling Prep and updated every 5
          minutes during Bursa Malaysia trading hours (9:00 AM — 12:30 PM, 2:30
          PM — 5:00 PM MYT, Monday to Friday). End-of-day data is updated 30
          minutes after market close.
        </p>
      </section>

      <section className="card p-6 mb-6 border-l-4 border-coral-light">
        <h2 className="text-lg font-semibold text-navy mb-3">Disclaimer</h2>
        <div className="text-slate text-sm leading-relaxed space-y-3">
          <p>
            KLSE MarketCap is for informational purposes only and does not
            constitute financial, investment, or trading advice. The information
            provided on this website should not be relied upon for making
            investment decisions.
          </p>
          <p>
            Data may be delayed, inaccurate, or incomplete. Always verify
            information with official sources before making any investment
            decisions. We are not licensed by the Securities Commission Malaysia
            (SC) and do not provide financial advice.
          </p>
          <p>
            Past performance is not indicative of future results. Investing in
            securities carries risk, including the potential loss of principal.
            You should consult a licensed financial advisor before making
            investment decisions.
          </p>
          <p>
            By using this website, you acknowledge that KLSE MarketCap, its
            creators, and affiliates are not responsible for any losses or
            damages arising from the use of information provided on this site.
          </p>
        </div>
      </section>

      <section className="card p-6">
        <h2 className="text-lg font-semibold text-navy mb-3">Contact</h2>
        <p className="text-slate text-sm">
          For feedback, corrections, or partnership enquiries, contact us at{" "}
          <a href="mailto:contact@klsemarketcap.com" className="text-sky hover:underline">
            contact@klsemarketcap.com
          </a>
        </p>
      </section>
    </div>
  );
}
