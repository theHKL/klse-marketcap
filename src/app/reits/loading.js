export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 animate-pulse">
      <div className="h-8 w-48 bg-slate-400/20 rounded mb-6" />
      <div className="space-y-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="h-12 bg-slate-400/10 rounded" />
        ))}
      </div>
    </div>
  );
}
