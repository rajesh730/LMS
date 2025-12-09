import { FaArrowUp, FaArrowDown } from "react-icons/fa";

/**
 * StatisticsCard Component
 * Displays a metric with icon, value, and trend
 *
 * Props:
 * - icon: React component icon
 * - label: Card title
 * - value: Main metric value
 * - subtext: Secondary text
 * - trend: Percentage change (positive or negative)
 * - color: Card accent color (blue, emerald, amber, red, purple)
 */
export default function StatisticsCard({
  icon: Icon,
  label,
  value,
  subtext,
  trend,
  color = "blue",
}) {
  const colorMap = {
    blue: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    emerald: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    amber: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    red: "bg-red-500/10 text-red-400 border-red-500/20",
    purple: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  };

  const trendColor = trend && trend > 0 ? "text-emerald-400" : "text-red-400";
  const trendIcon = trend && trend > 0 ? FaArrowUp : FaArrowDown;
  const TrendIcon = trendIcon;

  return (
    <div
      className={`${colorMap[color]} p-6 rounded-xl border backdrop-blur-sm hover:border-opacity-100 transition`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="p-3 bg-slate-800/50 rounded-lg">
          <Icon className="text-xl" />
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 text-sm ${trendColor}`}>
            <TrendIcon className="text-xs" />
            <span>{Math.abs(trend)}%</span>
          </div>
        )}
      </div>

      <p className="text-slate-400 text-sm mb-1">{label}</p>
      <p className="text-3xl font-bold text-white mb-2">{value}</p>
      {subtext && <p className="text-xs text-slate-500">{subtext}</p>}
    </div>
  );
}

/**
 * StatisticsGrid Component
 * Container for multiple statistics cards
 */
export function StatisticsGrid({ children }) {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">{children}</div>
  );
}
