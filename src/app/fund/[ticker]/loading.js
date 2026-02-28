export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 animate-pulse">
      <div className="h-4 w-32 bg-slate-400/20 rounded mb-4" />
      <div className="flex items-center gap-4 mb-6">
        <div className="h-12 w-12 bg-slate-400/20 rounded-full" />
        <div>
          <div className="h-6 w-40 bg-slate-400/20 rounded mb-2" />
          <div className="h-4 w-24 bg-slate-400/10 rounded" />
        </div>
      </div>
      <div className="h-64 bg-slate-400/10 rounded-2xl mb-6" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 bg-slate-400/10 rounded-2xl" />
        ))}
      </div>
      <div className="h-96 bg-slate-400/10 rounded-2xl" />
    </div>
  );
}
