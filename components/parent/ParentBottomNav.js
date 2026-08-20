"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FaHome,
  FaSeedling,
  FaCalendarAlt,
  FaCommentDots,
  FaChild,
} from "react-icons/fa";
import { useParentApp } from "./ParentAppContext";

/**
 * Fixed bottom navigation — the Parent App's primary navigation on mobile (§1).
 *
 * Exactly five destinations, never more: a bottom bar stops being scannable
 * past five, and every additional tab makes the important ones smaller.
 *
 * Accessibility decisions that are not negotiable here:
 *  - Touch targets are a minimum of 56px tall. Anything smaller is a miss-tap
 *    for a guardian using the phone one-handed on a bus.
 *  - The active tab is marked FOUR ways — filled icon, bold label, colour, and
 *    a top rule — because colour alone fails for colour-blind users and on a
 *    sun-washed screen (§4's principle applied to navigation).
 *  - `aria-current="page"` so screen readers announce it too.
 */

const TABS = [
  { href: "/parent", icon: FaHome, labelKey: "nav.home", exact: true },
  { href: "/parent/journey", icon: FaSeedling, labelKey: "nav.journey" },
  { href: "/parent/events", icon: FaCalendarAlt, labelKey: "nav.events" },
  { href: "/parent/messages", icon: FaCommentDots, labelKey: "nav.messages" },
  { href: "/parent/child", icon: FaChild, labelKey: "nav.child" },
];

export default function ParentBottomNav({ badges = {} }) {
  const pathname = usePathname();
  const { t, simpleMode } = useParentApp();

  const isActive = (tab) =>
    tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);

  return (
    <nav
      // `pb-[env(safe-area-inset-bottom)]` keeps the bar clear of the iPhone
      // home indicator, which otherwise overlaps the last row of tap targets.
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--brand-border)] bg-white pb-[env(safe-area-inset-bottom)] md:hidden"
      aria-label={t("nav.home")}
    >
      <ul className="mx-auto flex min-w-0 max-w-2xl">
        {TABS.map((tab) => {
          const active = isActive(tab);
          const Icon = tab.icon;
          const badge = badges[tab.href] || 0;

          return (
            <li key={tab.href} className="min-w-0 flex-1">
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={[
                  "relative flex min-h-[56px] min-w-0 flex-col items-center justify-center gap-1 px-0.5 py-2 transition-colors sm:px-1",
                  active
                    ? "text-[var(--brand-primary)]"
                    : "text-[var(--brand-muted)]",
                ].join(" ")}
              >
                {/* Marker 1: a rule across the top of the active tab. */}
                {active ? (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-3 top-0 h-0.5 rounded-full bg-[var(--brand-primary)]"
                  />
                ) : null}

                <span className="relative">
                  <Icon
                    aria-hidden="true"
                    className={simpleMode ? "h-7 w-7" : "h-6 w-6"}
                  />
                  {badge > 0 ? (
                    <span
                      className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white"
                      aria-label={`${badge} new`}
                    >
                      {badge > 9 ? "9+" : badge}
                    </span>
                  ) : null}
                </span>

                <span
                  className={[
                    simpleMode ? "text-[13px]" : "text-[11px]",
                    "max-w-full truncate leading-tight",
                    active ? "font-bold" : "font-medium",
                  ].join(" ")}
                >
                  {t(tab.labelKey)}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/**
 * The same five destinations as a desktop/tablet rail (§33).
 *
 * Deliberately a compact rail, not the admin sidebar: the parent experience
 * must not turn into school management software on a wider screen. Same tabs,
 * same order, same icons — only the axis changes.
 */
export function ParentNavRail({ badges = {} }) {
  const pathname = usePathname();
  const { t } = useParentApp();

  const isActive = (tab) =>
    tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);

  return (
    <nav
      className="sticky top-0 hidden h-screen w-60 shrink-0 border-r border-[var(--brand-border)] bg-white px-3 py-6 md:block"
      aria-label="Parent navigation"
    >
      <ul className="space-y-1">
        {TABS.map((tab) => {
          const active = isActive(tab);
          const Icon = tab.icon;
          const badge = badges[tab.href] || 0;

          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={[
                  "flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition-colors",
                  active
                    ? "bg-[var(--brand-primary-soft)] font-bold text-[var(--brand-primary)]"
                    : "font-medium text-[var(--brand-muted)] hover:bg-slate-50",
                ].join(" ")}
              >
                <Icon aria-hidden="true" className="h-5 w-5 shrink-0" />
                <span className="flex-1">{t(tab.labelKey)}</span>
                {badge > 0 ? (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 text-[11px] font-bold text-white">
                    {badge > 99 ? "99+" : badge}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export { TABS as PARENT_NAV_TABS };
