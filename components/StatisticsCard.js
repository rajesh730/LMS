import { FaArrowUp, FaArrowDown } from "react-icons/fa";

export default function StatisticsCard({
  icon: Icon,
  label,
  value,
  subtext,
  trend,
  color = "blue",
}) {
  const colorMap = {
    blue: "bg-[var(--brand-primary-soft)] text-[var(--brand-primary)] border-[var(--brand-primary-border)]",
    emerald: "bg-emerald-50 text-emerald-800 border-emerald-200",
    amber: "bg-amber-50 text-amber-900 border-amber-200",
    red: "bg-red-50 text-red-800 border-red-200",
    purple: "bg-[var(--brand-primary-soft)] text-[var(--brand-primary)] border-[var(--brand-primary-border)]",
  };

  const trendColor = trend && trend > 0 ? "text-emerald-700" : "text-red-700";
  const trendIcon = trend && trend > 0 ? FaArrowUp : FaArrowDown;
  const TrendIcon = trendIcon;

  return (
    <div
      className={`${colorMap[color]} rounded-[var(--card-radius)] border p-5 shadow-[var(--card-shadow)] transition hover:-translate-y-0.5 sm:p-6`}
    >
      <div className="mb-4 flex items-start justify-between">
        <div className="rounded-xl bg-white/80 p-3">
          <Icon className="text-lg" />
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 text-sm ${trendColor}`}>
            <TrendIcon className="text-xs" />
            <span>{Math.abs(trend)}%</span>
          </div>
        )}
      </div>

      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--brand-muted)]">
        {label}
      </p>
      <p className="mb-2 text-2xl font-semibold text-[var(--brand-ink)] sm:text-3xl">{value}</p>
      {subtext && <p className="text-xs text-[var(--brand-muted)]">{subtext}</p>}
    </div>
  );
}

export function StatisticsGrid({ children }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 lg:gap-5">{children}</div>
  );
}
