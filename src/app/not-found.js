import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8 text-center">
      <div className="text-6xl">🔍</div>
      <h1 className="mt-4 text-3xl font-bold">We couldn&apos;t find that stock</h1>
      <p className="mt-2 max-w-md text-slate-400">
        The ticker or page you are looking for does not exist. Try searching below or head back to
        the homepage to browse KLSE stocks and ETFs.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow-button transition-colors hover:bg-primary-light"
      >
        Back to Home
      </Link>
    </div>
  );
}
