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
    blue: "bg-[#eaf2ff] text-[#0a2f66] border-[#2f7fdb]/25",
    emerald: "bg-emerald-50 text-emerald-800 border-emerald-500/25",
    amber: "bg-[#eaf2ff] text-[#0a2f66] border-[#2f7fdb]/25",
    red: "bg-red-50 text-red-800 border-red-500/25",
    purple: "bg-[#f2f0ff] text-[#3730a3] border-indigo-500/25",
  };

  const trendColor = trend && trend > 0 ? "text-emerald-700" : "text-red-700";
  const trendIcon = trend && trend > 0 ? FaArrowUp : FaArrowDown;
  const TrendIcon = trendIcon;

  return (
    <div
      className={`${colorMap[color]} p-6 rounded-xl border backdrop-blur-sm hover:border-opacity-100 transition`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="rounded-xl bg-white/75 p-3 shadow-sm">
          <Icon className="text-xl" />
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 text-sm ${trendColor}`}>
            <TrendIcon className="text-xs" />
            <span>{Math.abs(trend)}%</span>
          </div>
        )}
      </div>

      <p className="mb-1 text-sm font-semibold text-[#52657d]">{label}</p>
      <p className="mb-2 text-3xl font-black text-[#17120a]">{value}</p>
      {subtext && <p className="text-xs text-[#52657d]">{subtext}</p>}
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
