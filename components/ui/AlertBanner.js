const STYLE_MAP = {
  info: "border-[#2f7fdb]/30 bg-[#eaf2ff] text-[#0a2f66]",
  success: "border-emerald-500/30 bg-emerald-50 text-emerald-800",
  warning: "border-[#2f7fdb]/30 bg-[#eaf2ff] text-[#0a2f66]",
  error: "border-red-500/30 bg-red-50 text-red-800",
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
          {title && <p className="font-black">{title}</p>}
          {message && <p className={title ? "mt-1" : ""}>{message}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </div>
  );
}
