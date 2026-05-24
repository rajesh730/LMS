import Link from "next/link";
import { FaArrowRight } from "react-icons/fa";

export function PublicPageShell({ children, className = "" }) {
  return (
    <main
      className={`pratyo-public-shell min-h-screen overflow-x-hidden bg-[#f5f1e8] pb-32 text-slate-950 selection:bg-[#2f7fdb]/20 md:pb-0 ${className}`.trim()}
    >
      {children}
    </main>
  );
}

export function PublicContainer({ children, className = "" }) {
  return (
    <div className={`mx-auto w-full max-w-7xl px-4 sm:px-6 ${className}`.trim()}>
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
    <section className="border-b border-[#d7cdbb] bg-[#f8fbff]">
      <PublicContainer className="py-5 lg:py-7">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-stretch">
          <div className="min-w-0 px-1 sm:rounded-[26px] sm:border sm:border-[#d7cdbb] sm:bg-white sm:p-6 sm:shadow-sm lg:p-7">
            {eyebrow && <PublicEyebrow>{eyebrow}</PublicEyebrow>}
            <h1 className="mt-3 max-w-4xl break-words text-[1.7rem] font-black leading-[1.08] tracking-tight text-slate-950 sm:text-5xl">
              {title}
            </h1>
            {description && (
              <p className="mt-3 max-w-3xl break-words text-sm leading-6 text-slate-600 sm:text-lg sm:leading-8">
                {description}
              </p>
            )}
            {action && <div className="mt-6">{action}</div>}
            {stats && <div className="mt-5 lg:hidden">{stats}</div>}
          </div>
          {stats || children ? (
            <div className="hidden rounded-[26px] border border-[#c5d8f4] bg-[#edf3fb] p-4 shadow-sm lg:block">
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
    <div className="inline-flex items-center gap-2 rounded-full bg-[#eaf2ff] px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-[#0a2f66]">
      {Icon && <Icon />}
      {children}
    </div>
  );
}

export function PublicSectionHeader({ eyebrow, title, description, action }) {
  return (
    <div className="mb-4 flex flex-col gap-3 px-1 md:flex-row md:items-end md:justify-between md:px-0">
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#0a2f66]">
            {eyebrow}
          </p>
        )}
        <h2 className="mt-1 text-lg font-black text-slate-950 sm:text-3xl">
          {title}
        </h2>
        {description && (
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
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
      className={`min-w-0 border-y border-[#d7cdbb] bg-white p-5 transition sm:rounded-[26px] sm:border sm:shadow-sm ${
        flushMobile ? "-mx-4 sm:mx-0" : ""
      } ${className}`.trim()}
      {...props}
    >
      {children}
    </Component>
  );
}

export function PublicBadge({ children, tone = "soft", icon: Icon, className = "" }) {
  const tones = {
    soft: "border-[#bfd7f7] bg-[#eaf2ff] text-[#0a2f66]",
    white: "border-[#d7cdbb] bg-white text-[#0a2f66]",
    success: "border-emerald-200 bg-emerald-50 text-emerald-800",
    result: "border-[#bfd7f7] bg-[#eaf2ff] text-[#0a2f66]",
  };

  return (
    <span
      className={`inline-flex max-w-full items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] ${tones[tone] || tones.soft} ${className}`.trim()}
    >
      {Icon && <Icon className="shrink-0" />}
      <span className="truncate">{children}</span>
    </span>
  );
}

export function PublicStatTile({ label, value, icon: Icon, className = "" }) {
  return (
    <div className={`rounded-[22px] border border-[#d7e5f7] bg-white p-4 shadow-sm ${className}`.trim()}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
          {label}
        </p>
        {Icon && <Icon className="text-[#0a2f66]" />}
      </div>
      <p className="mt-2 text-xl font-black text-slate-950 sm:text-2xl">{value}</p>
    </div>
  );
}

export function PublicTextLink({ href, children }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 rounded-full bg-[#0a2f66] px-5 py-3 text-sm font-black text-white shadow-lg shadow-[#0a2f66]/15 transition hover:bg-[#123f82]"
    >
      {children}
      <FaArrowRight />
    </Link>
  );
}
