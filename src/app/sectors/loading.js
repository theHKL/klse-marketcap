export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 animate-pulse">
      <div className="h-8 w-32 bg-slate-400/20 rounded mb-6" />
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 11 }).map((_, i) => (
          <div key={i} className="h-48 bg-slate-400/10 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
