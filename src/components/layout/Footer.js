import Link from 'next/link';
import DataFreshness from '@/components/ui/DataFreshness';

export default function Footer() {
  return (
    <footer className="border-t border-slate-300/20 bg-surface">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:justify-between sm:text-left">
          <div className="space-y-1">
            <p className="text-xs text-slate-400">
              Market data may be delayed. Not financial advice.
            </p>
            <p className="text-xs text-slate-400">
              Prices may be delayed. Always verify with your broker before trading.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <DataFreshness />
          </div>
        </div>

        <div className="mt-6 flex flex-wrap justify-center gap-4 text-xs">
          <Link href="/about" className="min-h-[44px] flex items-center text-slate-400 hover:text-slate-800 transition-colors">
            About
          </Link>
          <span className="text-slate-400/40">|</span>
          <span className="min-h-[44px] flex items-center text-slate-400">
            Privacy
          </span>
          <span className="text-slate-400/40">|</span>
          <span className="min-h-[44px] flex items-center text-slate-400">
            Terms
          </span>
        </div>
      </div>
    </footer>
  );
}
