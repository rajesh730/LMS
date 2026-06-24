import LoadingSpinner from "@/components/LoadingSpinner";

export default function LoadingState({
  title = "Preparing this screen",
  message = "Getting the latest information ready for you.",
  className = "",
  icon: Icon,
  iconDescription,
  action,
  showAction = true,
}) {
  return (
    <div
      className={`pravyo-card flex min-h-[220px] flex-col items-center justify-center rounded-[var(--card-radius)] px-6 py-10 text-center gap-5 ${className}`}
    >
      {Icon ? (
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--brand-primary-soft)] text-[var(--brand-primary)]">
          <Icon className="h-5 w-5" aria-label={iconDescription || "Loading icon"} />
        </div>
      ) : (
        <LoadingSpinner text="" size="md" />
      )}
      <h3 className="pravyo-heading mt-0 text-lg">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-[var(--brand-muted)]">
        {message}
      </p>
      {showAction && action && (
        <div className="mt-6">
          {action}
        </div>
      )}
    </div>
  );
}
