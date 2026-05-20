import { FaSearch } from "react-icons/fa";

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
    <div className="pratyo-card flex flex-col items-center justify-center rounded-2xl border-dashed px-6 py-12 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-[#eaf2ff] text-[#0a2f66]">
        <Icon className="text-2xl" />
      </div>
      <h3 className="text-xl font-black text-[#17120a]">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-[#52657d]">
        {helperText}
      </p>
      {action && <div className="mt-6">{action}</div>}
      {!action && actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#0a2f66] px-5 text-sm font-bold text-white transition hover:bg-[#123f82]"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
