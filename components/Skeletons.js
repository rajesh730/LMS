export function TableSkeleton({ rows = 5, cols = 4 }) {
    return (
        <div className="animate-pulse space-y-4">
            {/* Header */}
            <div className="h-10 bg-slate-700/50 rounded w-full mb-4"></div>

            {/* Rows */}
            {Array.from({ length: rows }).map((_, i) => (
                <div key={i} className="flex gap-4">
                    {Array.from({ length: cols }).map((_, j) => (
                        <div key={j} className="h-12 bg-slate-700/30 rounded flex-1"></div>
                    ))}
                </div>
            ))}
        </div>
    );
}

export function CardSkeleton({ count = 3 }) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="bg-slate-800 p-6 rounded-xl border border-slate-700 animate-pulse">
                    <div className="h-6 bg-slate-700/50 rounded w-3/4 mb-4"></div>
                    <div className="space-y-2">
                        <div className="h-4 bg-slate-700/30 rounded w-full"></div>
                        <div className="h-4 bg-slate-700/30 rounded w-5/6"></div>
                    </div>
                </div>
            ))}
        </div>
    );
}
