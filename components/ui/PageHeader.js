export default function PageHeader({
  icon: Icon,
  eyebrow,
  title,
  description,
  action,
  meta,
  className = "",
  fullWidth = false,
}) {
  return (
    <section
      className={[
        "pratyo-card",
        fullWidth ? "" : "-mx-4",
        "rounded-none border-x-0 p-5",
        "sm:mx-0 sm:rounded-[var(--card-radius)] sm:border-x sm:p-6",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            {Icon && (
              <span className="mobile-accessory-info flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-surface-secondary)] border border-[var(--brand-border)] shadow-sm text-[var(--brand-primary)] sm:flex">
                <Icon className="text-xl" aria-hidden="true" />
              </span>
            )}
            <div>
              {eyebrow && <p className="pratyo-eyebrow mobile-accessory-info sm:block">{eyebrow}</p>}
              <h1 className="pratyo-heading mt-1 text-xl sm:text-2xl">{title}</h1>
            </div>
          </div>
          {description && (
            <p className="mobile-accessory-info mt-3 max-w-3xl text-sm leading-6 text-[var(--brand-muted)] sm:mt-4 sm:block">
              {description}
            </p>
          )}
          {meta && <div className="mobile-accessory-info mt-4 sm:block">{meta}</div>}
        </div>
        {action && (
          <div className="mt-4 shrink-0 sm:mt-0 sm:self-end">
            {action}
          </div>
        )}
      </div>
    </section>
  );
}
