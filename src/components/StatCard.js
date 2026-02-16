export default function StatCard({ label, value, icon }) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2">
        {icon && <span className="text-silver">{icon}</span>}
        <p className="text-xs text-silver uppercase tracking-wide">{label}</p>
      </div>
      <p className="text-lg font-semibold text-navy font-price mt-1">
        {value ?? "\u2014"}
      </p>
    </div>
  );
}
