"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParentApp } from "@/components/parent/ParentAppContext";
import ParentEmptyState from "@/components/parent/ParentEmptyState";
import { notificationStatus } from "@/lib/parentStatus";
import { formatRelativeShort } from "@/lib/parentFormat";

/**
 * The notification inbox (§17).
 *
 * Shows the COMBINED inbox across all of the guardian's children — which §36
 * permits provided every row names the child and school. Each row therefore
 * leads with "Aayush • Green Village", so a parent with children at two schools
 * is never left guessing which one an alert is about.
 *
 * Every row deep-links to the exact screen (`href` from the server), never to
 * the app root.
 */
export default function ParentNotificationsPage() {
  const { t, refreshBadges } = useParentApp();
  const [state, setState] = useState({ loading: true, error: "", data: null });

  const load = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: "" }));
      const res = await fetch("/api/parent/notifications", {
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Failed");
      setState({ loading: false, error: "", data: json.data });
    } catch (err) {
      setState({ loading: false, error: err.message, data: null });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const markAllRead = async () => {
    await fetch("/api/parent/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    await load();
    refreshBadges();
  };

  if (state.loading) {
    return (
      <div className="space-y-2" aria-busy="true">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-2xl bg-slate-100" />
        ))}
      </div>
    );
  }

  const notifications = state.data?.notifications || [];
  const hasUnread = notifications.some((n) => !n.read);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-[var(--brand-ink)]">
          {t("settings.notifications")}
        </h1>
        {hasUnread ? (
          <button
            type="button"
            onClick={markAllRead}
            className="min-h-[40px] rounded-lg px-3 text-sm font-semibold text-[var(--brand-primary)]"
          >
            {t("notices.read")}
          </button>
        ) : null}
      </div>

      {notifications.length === 0 ? (
        <ParentEmptyState emoji="🔔" title={t("home.allCaughtUp")} />
      ) : (
        <ul className="space-y-2">
          {notifications.map((notification) => {
            const descriptor = notificationStatus(notification.priority);
            const row = (
              <div
                className={[
                  "flex gap-3 rounded-2xl border p-3.5",
                  notification.read
                    ? "border-[var(--brand-border)] bg-white"
                    : descriptor.classes.card,
                ].join(" ")}
              >
                <span
                  aria-hidden="true"
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${descriptor.classes.dot}`}
                >
                  {descriptor.icon}
                </span>

                <div className="min-w-0 flex-1">
                  {/* Child + school on every row — §36's requirement. */}
                  {notification.child ? (
                    <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--brand-muted)]">
                      {notification.child.name}
                      {notification.school ? ` • ${notification.school.name}` : ""}
                    </p>
                  ) : null}

                  <p className="font-semibold leading-snug text-[var(--brand-ink)]">
                    {notification.title}
                  </p>
                  <p className="mt-0.5 text-sm leading-relaxed text-[var(--brand-muted)]">
                    {notification.message}
                  </p>
                  <p className="mt-1 text-[11px] text-[var(--brand-muted)]">
                    {formatRelativeShort(notification.publishedAt)}
                  </p>
                </div>

                {!notification.read ? (
                  <span
                    aria-label="Unread"
                    className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--brand-primary)]"
                  />
                ) : null}
              </div>
            );

            return (
              <li key={notification.id}>
                {notification.href ? (
                  <Link href={notification.href}>{row}</Link>
                ) : (
                  row
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
