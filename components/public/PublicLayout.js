import Link from "next/link";
import { FaArrowRight } from "react-icons/fa";

export function PublicPageShell({ children, className = "" }) {
  return (
    <main
      className={`pravyo-public-shell pravyo-page-shell min-h-screen overflow-x-hidden pb-32 md:pb-0 ${className}`.trim()}
    >
      {children}
    </main>
  );
}

export function PublicContainer({ children, className = "" }) {
  return (
    <div className={`mx-auto w-full max-w-7xl px-2 sm:px-6 ${className}`.trim()}>
      {children}
    </div>
  );
}

export function PublicHero({
  eyebrow,
  title,
  description,
  action,
  stats,
  children,
}) {
  return (
    <section className="border-b border-[var(--brand-border)] bg-white">
      <PublicContainer className="py-6 lg:py-8">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-stretch">
          <div className="mobile-full-bleed-card min-w-0 rounded-[var(--card-radius)] border border-[var(--brand-border)] bg-white p-4 shadow-[var(--card-shadow)] sm:p-6 lg:p-7">
            {eyebrow && <PublicEyebrow>{eyebrow}</PublicEyebrow>}
            <h1 className="pravyo-heading mt-3 max-w-4xl text-3xl sm:text-4xl">
              {title}
            </h1>
            {description && (
              <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--brand-muted)] sm:text-base sm:leading-7">
                {description}
              </p>
            )}
            {action && <div className="mt-6">{action}</div>}
            {stats && <div className="mt-5 lg:hidden">{stats}</div>}
          </div>
          {stats || children ? (
            <div className="hidden rounded-[var(--card-radius)] border border-[var(--brand-border)] bg-[var(--brand-primary-soft)]/50 p-5 lg:block">
              {stats || children}
            </div>
          ) : null}
        </div>
      </PublicContainer>
    </section>
  );
}

export function PublicEyebrow({ children, icon: Icon }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-[var(--brand-primary-border)] bg-[var(--brand-primary-soft)] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[var(--brand-primary)]">
      {Icon && <Icon />}
      {children}
    </div>
  );
}

export function PublicSectionHeader({ eyebrow, title, description, action }) {
  return (
    <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="pravyo-eyebrow">{eyebrow}</p>}
        <h2 className="pravyo-heading mt-1 text-xl sm:text-2xl">{title}</h2>
        {description && (
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--brand-muted)]">
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}

export function PublicCard({
  children,
  className = "",
  as: Component = "div",
  flushMobile = false,
  ...props
}) {
  return (
    <Component
      className={`mobile-full-bleed-card min-w-0 rounded-[var(--card-radius)] border border-[var(--brand-border)] bg-white p-3 shadow-[var(--card-shadow)] transition sm:p-5 ${
        flushMobile ? "-mx-4 rounded-none border-x-0 sm:mx-0 sm:rounded-[var(--card-radius)] sm:border-x" : ""
      } ${className}`.trim()}
      {...props}
    >
      {children}
    </Component>
  );
}

export function PublicBadge({ children, tone = "soft", icon: Icon, className = "" }) {
  const tones = {
    soft: "border-[var(--brand-primary-border)] bg-[var(--brand-primary-soft)] text-[var(--brand-primary)]",
    white: "border-[var(--brand-border)] bg-white text-[var(--brand-primary)]",
    success: "border-emerald-200 bg-emerald-50 text-emerald-800",
    result: "border-[var(--brand-primary-border)] bg-[var(--brand-primary-soft)] text-[var(--brand-primary)]",
  };

  return (
    <span
      className={`inline-flex max-w-full items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${tones[tone] || tones.soft} ${className}`.trim()}
    >
      {Icon && <Icon className="shrink-0" />}
      <span className="truncate">{children}</span>
    </span>
  );
}

export function PublicStatTile({ label, value, icon: Icon, className = "" }) {
  return (
    <div className={`rounded-[var(--card-radius)] border border-[var(--brand-border)] bg-white p-4 shadow-[var(--card-shadow)] ${className}`.trim()}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--brand-muted)]">
          {label}
        </p>
        {Icon && <Icon className="text-[var(--brand-primary)]" />}
      </div>
      <p className="mt-2 text-xl font-semibold text-[var(--brand-ink)] sm:text-2xl">{value}</p>
    </div>
  );
}

export function PublicTextLink({ href, children }) {
  return (
    <Link
      href={href}
      className="public-primary-action inline-flex items-center gap-2 rounded-lg bg-[var(--brand-primary)] px-5 py-3 text-sm font-semibold text-white shadow-[var(--button-shadow)] transition hover:bg-[var(--brand-primary-hover)]"
    >
      {children}
      <FaArrowRight />
    </Link>
  );
}
