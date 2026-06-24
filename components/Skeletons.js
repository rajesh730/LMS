/**
 * Skeleton placeholders — brand-tinted shimmer surfaces.
 * Use the `.pravyo-skeleton` class (defined in globals.css) for the animation.
 */

export function Skeleton({ className = "", style }) {
  return <div className={`pravyo-skeleton ${className}`} style={style} />;
}

export function TableSkeleton({ rows = 5, cols = 4 }) {
  return (
    <div className="overflow-hidden rounded-[var(--card-radius)] border border-[var(--brand-border)] bg-[var(--brand-paper)]">
      {/* Header */}
      <div className="flex gap-4 border-b border-[var(--brand-border)] bg-[var(--brand-primary-soft)] px-4 py-3.5">
        {Array.from({ length: cols }).map((_, j) => (
          <Skeleton key={j} className="h-3.5 flex-1 rounded-md" />
        ))}
      </div>

      {/* Rows */}
      <div className="divide-y divide-[var(--brand-border)]">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-4">
            {Array.from({ length: cols }).map((_, j) => (
              <Skeleton
                key={j}
                className="h-4 flex-1 rounded-md"
                style={j === 0 ? { maxWidth: "55%" } : undefined}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function CardSkeleton({ count = 3 }) {
  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="pravyo-card p-5">
          <div className="flex items-center gap-3">
            <Skeleton className="h-11 w-11 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3.5 w-3/4 rounded-md" />
              <Skeleton className="h-3 w-1/2 rounded-md" />
            </div>
          </div>
          <div className="mt-5 space-y-2.5">
            <Skeleton className="h-3 w-full rounded-md" />
            <Skeleton className="h-3 w-5/6 rounded-md" />
            <Skeleton className="h-3 w-2/3 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ListSkeleton({ rows = 5 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 rounded-[var(--card-radius)] border border-[var(--brand-border)] bg-[var(--brand-paper)] p-4"
        >
          <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-2/5 rounded-md" />
            <Skeleton className="h-3 w-3/4 rounded-md" />
          </div>
          <Skeleton className="h-8 w-20 shrink-0 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

export function StatCardsSkeleton({ count = 4 }) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="pravyo-card p-5">
          <div className="flex items-center justify-between gap-3">
            <Skeleton className="h-3 w-20 rounded-md" />
            <Skeleton className="h-9 w-9 rounded-xl" />
          </div>
          <Skeleton className="mt-4 h-7 w-16 rounded-md" />
          <Skeleton className="mt-2 h-3 w-24 rounded-md" />
        </div>
      ))}
    </div>
  );
}
