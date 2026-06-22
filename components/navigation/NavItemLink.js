"use client";

import Link from "next/link";
import WorkIndicatorBadge from "@/components/work-indicators/WorkIndicatorBadge";

export default function NavItemLink({
  href,
  label,
  icon: Icon,
  active = false,
  onClick,
  indicator,
  className = "",
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`group flex min-h-[2.625rem] items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition-all duration-150 ${
        active
          ? "bg-[var(--brand-primary-soft)] text-[var(--brand-primary)]"
          : "text-[#3d4a5c] hover:bg-[var(--brand-primary-soft)]/70 hover:text-[var(--brand-primary)]"
      } ${className}`}
    >
      <span
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#f0eeff] transition-all duration-150 ${
          active
            ? "text-[var(--brand-primary)]"
            : "text-[var(--brand-muted)] group-hover:text-[var(--brand-primary)]"
        }`}
      >
        <Icon className="pravyo-sidebar-icon text-xs" />
      </span>
      <span className="pravyo-sidebar-label min-w-0 flex-1 truncate leading-tight">
        {label}
      </span>
      {indicator && (
        <WorkIndicatorBadge
          count={indicator.count}
          tone={indicator.tone}
          label={indicator.label}
          compact
        />
      )}
    </Link>
  );
}
