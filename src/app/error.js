'use client';

export default function Error({ error, reset }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8 text-center">
      <div className="text-6xl">⚠️</div>
      <h1 className="mt-4 text-3xl font-bold">Something went wrong</h1>
      <p className="mt-2 max-w-md text-slate-400">
        Something unexpected happened. Please try again shortly.
      </p>
      <button
        onClick={() => reset()}
        className="mt-6 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow-button transition-colors hover:bg-primary-light"
      >
        Try again
      </button>
    </div>
  );
}
