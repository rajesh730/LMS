"use client";

function formatDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusClass(status = "") {
  const normalized = String(status).toUpperCase();
  if (["APPROVED", "ENROLLED", "SELECTED", "PUBLISHED"].includes(normalized)) {
    return "border-emerald-400/40 bg-emerald-500/10 text-emerald-200";
  }
  if (["REJECTED", "DISAPPROVED", "WITHDRAWN"].includes(normalized)) {
    return "border-rose-400/40 bg-rose-500/10 text-rose-200";
  }
  if (["PENDING", "SUBMITTED", "DRAFT"].includes(normalized)) {
    return "border-amber-400/40 bg-amber-500/10 text-amber-100";
  }
  return "border-sky-400/30 bg-sky-500/10 text-sky-100";
}

export default function LifecycleTimeline({
  items = [],
  title = "Decision history",
  compact = false,
}) {
  const visibleItems = Array.isArray(items)
    ? items.filter((item) => item?.label && item?.at)
    : [];

  if (visibleItems.length === 0) return null;

  return (
    <div className="rounded-xl border border-slate-700/70 bg-slate-950/50 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h4 className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
          {title}
        </h4>
        <span className="rounded-full bg-slate-800 px-2 py-1 text-[11px] font-semibold text-slate-300">
          {visibleItems.length} step{visibleItems.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className={compact ? "space-y-2" : "space-y-3"}>
        {visibleItems.map((item, index) => (
          <div key={`${item.label}-${item.at}-${index}`} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span className="mt-1 h-2.5 w-2.5 rounded-full bg-sky-300 ring-4 ring-sky-400/10" />
              {index < visibleItems.length - 1 && (
                <span className="mt-1 h-full min-h-8 w-px bg-slate-700" />
              )}
            </div>
            <div className="min-w-0 flex-1 pb-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-slate-100">{item.label}</span>
                <span
                  className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${statusClass(
                    item.status
                  )}`}
                >
                  {item.status || "UPDATED"}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {formatDate(item.at)}
                {item.actor?.name ? ` by ${item.actor.name}` : ""}
              </p>
              {!compact && item.description && (
                <p className="mt-1 text-sm leading-6 text-slate-400">
                  {item.description}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
