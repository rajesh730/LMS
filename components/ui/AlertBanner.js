import { AlertTriangle, CheckCircle, Info, XCircle } from "lucide-react";

const STYLE_MAP = {
  info: "border-[var(--brand-primary-border)] bg-[var(--brand-primary-soft)] text-[var(--brand-primary)]",
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  error: "border-red-200 bg-red-50 text-red-800",
};

const ICON_MAP = {
  info: <Info className="h-4 w-4 flex-shrink-0" />,
  success: <CheckCircle className="h-4 w-4 flex-shrink-0" />,
  warning: <AlertTriangle className="h-4 w-4 flex-shrink-0" />,
  error: <XCircle className="h-4 w-4 flex-shrink-0" />,
};

export default function AlertBanner({ type = "info", title, message, action, className = "" }) {
  const styles = STYLE_MAP[type] || STYLE_MAP.info;
  const Icon = ICON_MAP[type] || ICON_MAP.info;

  return (
    <div
      className={`rounded-lg border p-4 flex items-start gap-4 text-sm ${styles} ${className}`}
      role="alert"
      aria-live="polite"
    >
      <div className="flex-shrink-0">
        {Icon}
      </div>
      <div className="flex-1 min-w-0">
        {title && <p className="font-semibold mb-1">{title}</p>}
        {message && <p className="text-[var(--brand-muted)]">{message}</p>}
      </div>
      {action && (
        <div className="mt-2 flex-shrink-0 sm:mt-0 sm:ml-4">
          {action}
        </div>
      )}
    </div>
  );
}
