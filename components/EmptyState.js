import { FaSearch } from "react-icons/fa";
import Button from "@/components/ui/Button";

export default function EmptyState({
  title = "Nothing to show yet",
  description,
  message,
  icon: Icon = FaSearch,
  action,
  actionLabel,
  onAction,
}) {
  const helperText =
    description ||
    message ||
    "When the right information is available, it will appear here automatically.";

  return (
    <div className="pratyo-card flex flex-col items-center justify-center rounded-[var(--card-radius)] border-dashed px-6 py-12 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-[var(--brand-primary-soft)] text-[var(--brand-primary)]">
        <Icon className="text-2xl" />
      </div>
      <h3 className="pratyo-heading text-lg">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-[var(--brand-muted)]">
        {helperText}
      </p>
      {action && <div className="mt-6">{action}</div>}
      {!action && actionLabel && onAction && (
        <Button type="button" onClick={onAction} className="mt-6">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
