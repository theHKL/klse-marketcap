const shimmer = 'animate-pulse bg-gradient-to-r from-surface via-white to-surface rounded';

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className={`h-4 w-6 ${shimmer}`} />
      <div className={`h-8 w-8 rounded-full ${shimmer}`} />
      <div className={`h-4 w-16 ${shimmer}`} />
      <div className={`h-4 flex-1 ${shimmer}`} />
      <div className={`h-4 w-20 ${shimmer}`} />
      <div className={`h-4 w-16 ${shimmer}`} />
      <div className={`h-4 w-16 ${shimmer}`} />
      <div className={`hidden h-4 w-24 lg:block ${shimmer}`} />
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-card">
      <div className={`mb-3 h-5 w-1/2 ${shimmer}`} />
      <div className={`mb-2 h-4 w-3/4 ${shimmer}`} />
      <div className={`h-4 w-1/3 ${shimmer}`} />
    </div>
  );
}

function SkeletonText() {
  return <div className={`h-4 w-full ${shimmer}`} />;
}

const variants = {
  row: SkeletonRow,
  card: SkeletonCard,
  text: SkeletonText,
};

export default function Skeleton({ variant = 'row', count = 1 }) {
  const Component = variants[variant] || variants.row;
  return (
    <div className="space-y-2">
      {Array.from({ length: count }, (_, i) => (
        <Component key={i} />
      ))}
    </div>
  );
}
