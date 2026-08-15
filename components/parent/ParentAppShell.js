"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { FaCog, FaBell } from "react-icons/fa";
import { useParentApp } from "./ParentAppContext";
import ChildSwitcher from "./ChildSwitcher";
import ParentBottomNav, { ParentNavRail } from "./ParentBottomNav";

/**
 * The Parent App frame (§32, §33, §34).
 *
 * Mobile: sticky header with the child switcher, scrolling content, fixed
 * bottom navigation. Desktop/tablet: the same five destinations become a
 * compact left rail with a centred content column — still the parent app, NOT
 * the admin dashboard (§33).
 *
 * `font-size` scales with Simple Mode at the root so every child component
 * inherits it, rather than each one re-implementing its own large variant.
 */
export default function ParentAppShell({ children }) {
  const { loading, error, needsChildLink, simpleMode, t, reload, badges } =
    useParentApp();
  const pathname = usePathname();
  const router = useRouter();

  // A guardian with no authorised child gets the linking screen, not an empty
  // dashboard (§26). Handled here so every route inherits the behaviour.
  useEffect(() => {
    if (!loading && needsChildLink && pathname !== "/parent/link") {
      router.replace("/parent/link");
    }
  }, [loading, needsChildLink, pathname, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
        <div className="flex flex-col items-center gap-3">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--brand-primary)] border-t-transparent" />
          <p className="text-sm text-[var(--brand-muted)]">
            {t("common.loading")}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)] px-6">
        <div className="w-full max-w-sm rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-2xl" aria-hidden="true">
            ⚠️
          </p>
          <p className="mt-2 font-bold text-red-800">
            {t("common.somethingWrong")}
          </p>
          <button
            type="button"
            onClick={reload}
            className="mt-4 min-h-[48px] w-full rounded-xl bg-red-600 px-5 font-bold text-white"
          >
            {t("common.retry")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-[var(--background)]"
      // Root-level type scale for Simple Mode (§8).
      style={{ fontSize: simpleMode ? "17px" : undefined }}
    >
      <div className="mx-auto flex max-w-6xl">
        <ParentNavRail badges={badges} />

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 border-b border-[var(--brand-border)] bg-white/95 backdrop-blur">
            <div className="flex items-center">
              <div className="min-w-0 flex-1">
                <ChildSwitcher />
              </div>
              <div className="flex items-center gap-1 pr-3">
                <Link
                  href="/parent/notifications"
                  aria-label={t("settings.notifications")}
                  className="relative flex h-11 w-11 items-center justify-center rounded-full text-[var(--brand-muted)] transition-colors hover:bg-slate-100"
                >
                  <FaBell aria-hidden="true" className="h-5 w-5" />
                  {badges.notifications > 0 ? (
                    <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
                      {badges.notifications > 9 ? "9+" : badges.notifications}
                    </span>
                  ) : null}
                </Link>
                <Link
                  href="/parent/settings"
                  aria-label={t("settings.title")}
                  className="flex h-11 w-11 items-center justify-center rounded-full text-[var(--brand-muted)] transition-colors hover:bg-slate-100"
                >
                  <FaCog aria-hidden="true" className="h-5 w-5" />
                </Link>
              </div>
            </div>
          </header>

          {/* Bottom padding clears the fixed nav plus the iOS safe area. */}
          <main className="px-4 pb-28 pt-4 md:pb-10">
            <div className="mx-auto max-w-2xl">{children}</div>
          </main>
        </div>
      </div>

      <ParentBottomNav badges={badges} />
    </div>
  );
}
