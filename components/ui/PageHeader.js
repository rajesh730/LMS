export default function PageHeader({
  icon: Icon,
  eyebrow,
  title,
  description,
  action,
  meta,
}) {
  return (
    <section className="pratyo-card -mx-4 rounded-none border-x-0 p-5 sm:mx-0 sm:rounded-[26px] sm:border-x sm:p-6">
      <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            {Icon && (
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#0a2f66] text-white shadow-lg shadow-[#0a2f66]/15">
                <Icon className="text-xl" />
              </span>
            )}
            <div>
              {eyebrow && (
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#0a2f66]">
                  {eyebrow}
                </p>
              )}
              <h1 className="pratyo-heading mt-1 text-xl text-[#17120a] sm:text-[2.35rem]">
                {title}
              </h1>
            </div>
          </div>
          {description && (
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[#52657d] sm:mt-4 sm:text-[0.95rem] sm:leading-7">
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
