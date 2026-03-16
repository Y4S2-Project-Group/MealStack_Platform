export default function LoadingSkeleton({ count = 3, className = '' }) {
  return (
    <div className={`space-y-4 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="loading-skeleton h-24 w-full" />
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="glass-card p-4 space-y-3 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-dark-700 rounded-xl" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-dark-700 rounded w-3/4" />
          <div className="h-3 bg-dark-700 rounded w-1/2" />
        </div>
      </div>
      <div className="flex gap-2">
        <div className="h-8 bg-dark-700 rounded-lg flex-1" />
        <div className="h-8 bg-dark-700 rounded-lg flex-1" />
      </div>
    </div>
  );
}

export function StatSkeleton() {
  return (
    <div className="stat-card animate-pulse">
      <div className="h-8 w-16 bg-dark-700 rounded" />
      <div className="h-3 w-12 bg-dark-700 rounded" />
    </div>
  );
}
