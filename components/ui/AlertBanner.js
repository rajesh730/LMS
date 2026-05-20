const STYLE_MAP = {
  info: "border-blue-500/25 bg-blue-500/10 text-blue-100",
  success: "border-emerald-500/25 bg-emerald-500/10 text-emerald-100",
  warning: "border-amber-500/25 bg-amber-500/10 text-amber-100",
  error: "border-red-500/25 bg-red-500/10 text-red-100",
};

export default function AlertBanner({ type = "info", title, message, action }) {
  return (
    <div
      className={`rounded-xl border p-4 text-sm ${
        STYLE_MAP[type] || STYLE_MAP.info
      }`}
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          {title && <p className="font-bold text-white">{title}</p>}
          {message && <p className={title ? "mt-1" : ""}>{message}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </div>
  );
}
