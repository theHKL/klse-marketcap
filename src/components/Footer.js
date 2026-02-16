import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-silver/20 mt-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="text-sm font-semibold text-navy">
              KLSE MarketCap
            </span>
            <span className="text-sm text-silver">
              &copy; {new Date().getFullYear()}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/about"
              className="text-sm text-silver hover:text-navy transition-colors"
            >
              About
            </Link>
            <Link
              href="/about"
              className="text-sm text-silver hover:text-navy transition-colors"
            >
              Disclaimer
            </Link>
          </div>
        </div>
        <p className="text-xs text-silver mt-4 text-center sm:text-left">
          Not financial advice. Data may be delayed.
        </p>
      </div>
    </footer>
  );
}
