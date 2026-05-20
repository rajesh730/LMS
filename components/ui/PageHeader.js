export default function PageHeader({
  icon: Icon,
  eyebrow,
  title,
  description,
  action,
  meta,
}) {
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-6 shadow-sm">
      <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            {Icon && (
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-200">
                <Icon className="text-xl" />
              </span>
            )}
            <div>
              {eyebrow && (
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                  {eyebrow}
                </p>
              )}
              <h1 className="text-3xl font-bold tracking-tight text-white">
                {title}
              </h1>
            </div>
          </div>
          {description && (
            <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-400">
              {description}
            </p>
          )}
          {meta && <div className="mt-4">{meta}</div>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </section>
  );
}
