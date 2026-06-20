// Canonical compact stat tile shared across roles (dashboards, portfolios).
// Plain presentational component — safe in both server and client components.
const ACCENTS = {
  indigo: "bg-[#f4f1ff] text-[#4326e8]",
  amber: "bg-amber-50 text-amber-600",
  emerald: "bg-emerald-50 text-emerald-700",
  purple: "bg-purple-50 text-purple-700",
  slate: "bg-slate-100 text-slate-600",
};

export default function StatTile({ icon: Icon, label, value, accent = "indigo" }) {
  return (
    <div className="rounded-xl border border-[#e6eaf7] bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-center gap-3">
        {Icon && (
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
              ACCENTS[accent] || ACCENTS.indigo
            }`}
          >
            <Icon />
          </span>
        )}
        <div className="min-w-0">
          <p className="text-2xl font-black leading-none text-[#10142f] sm:text-3xl">
            {value}
          </p>
          <p className="mt-1 text-xs font-bold text-[#526071] sm:text-sm">{label}</p>
        </div>
      </div>
    </div>
  );
}
