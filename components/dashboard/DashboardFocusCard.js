"use client";

import Link from "next/link";
import WorkIndicatorBadge from "@/components/work-indicators/WorkIndicatorBadge";

const toneClasses = {
  blue: {
    icon: "bg-[#eaf2ff] text-[#0a2f66]",
    badge: "border-[#bfd7f7] bg-[#f8fbff] text-[#0a2f66]",
  },
  emerald: {
    icon: "bg-emerald-50 text-emerald-800",
    badge: "border-emerald-200 bg-emerald-50 text-emerald-800",
  },
  amber: {
    icon: "bg-amber-50 text-amber-800",
    badge: "border-amber-200 bg-amber-50 text-amber-800",
  },
  violet: {
    icon: "bg-violet-50 text-violet-800",
    badge: "border-violet-200 bg-violet-50 text-violet-800",
  },
  rose: {
    icon: "bg-rose-50 text-rose-800",
    badge: "border-rose-200 bg-rose-50 text-rose-800",
  },
  cyan: {
    icon: "bg-cyan-50 text-cyan-800",
    badge: "border-cyan-200 bg-cyan-50 text-cyan-800",
  },
};

export default function DashboardFocusCard({
  href,
  icon: Icon,
  badge,
  title,
  description,
  meta,
  actionLabel,
  indicator,
  tone = "blue",
}) {
  const toneClass = toneClasses[tone] || toneClasses.blue;

  return (
    <Link
      href={href}
      className="group flex min-h-[172px] min-w-0 flex-col rounded-lg border border-[#d7cdbb] bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-[#2f7fdb]/45 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2f7fdb]"
    >
      <div className="flex min-w-0 items-start justify-between gap-3">
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${toneClass.icon}`}
        >
          <Icon className="text-base" />
        </span>
        <span className="flex min-w-0 flex-col items-end gap-1.5">
          <WorkIndicatorBadge
            count={indicator?.count}
            tone={indicator?.tone}
            compact
          />
          {badge && (
            <span
              className={`max-w-full truncate rounded-full border px-2.5 py-1 text-[11px] font-bold leading-none ${toneClass.badge}`}
            >
              {badge}
            </span>
          )}
        </span>
      </div>

      <h3 className="mt-4 line-clamp-2 text-[15px] font-bold leading-snug text-[#17120a]">
        {title}
      </h3>
      <p className="mt-2 line-clamp-2 text-[13px] leading-5 text-[#52657d]">
        {description}
      </p>

      {(meta || actionLabel) && (
        <p className="mt-auto pt-4 text-xs font-bold leading-5 text-[#40516b]">
          {meta || actionLabel}
        </p>
      )}
    </Link>
  );
}
