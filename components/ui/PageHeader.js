export default function PageHeader({
  icon: Icon,
  eyebrow,
  title,
  description,
  action,
  meta,
}) {
  return (
    <section className="pratyo-card rounded-2xl p-6">
      <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            {Icon && (
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0a2f66] text-white">
                <Icon className="text-xl" />
              </span>
            )}
            <div>
              {eyebrow && (
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#52657d]">
                  {eyebrow}
                </p>
              )}
              <h1 className="text-3xl font-black tracking-tight text-[#17120a]">
                {title}
              </h1>
            </div>
          </div>
          {description && (
            <p className="mt-4 max-w-3xl text-sm leading-6 text-[#52657d]">
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
