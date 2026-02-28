export default function Card({ children, className = '' }) {
  return (
    <div
      className={`rounded-2xl bg-white shadow-card ${className}`}
    >
      {children}
    </div>
  );
}
