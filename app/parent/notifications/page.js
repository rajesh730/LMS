"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useParentApp } from "@/components/parent/ParentAppContext";
import { useParentNotifications } from "@/components/parent/ParentNotificationContext";
import ParentEmptyState from "@/components/parent/ParentEmptyState";
import { notificationStatus } from "@/lib/parentStatus";
import { formatRelativeShort } from "@/lib/parentFormat";

/** Combined inbox; every row names its child and school before it deep-links. */
export default function ParentNotificationsPage() {
  const router = useRouter();
  const { t } = useParentApp();
  const {
    loading,
    error,
    notifications,
    refresh,
    markSeen,
    markRead,
    markAllRead,
  } = useParentNotifications();
  const [pendingId, setPendingId] = useState("");

  useEffect(() => {
    void markSeen();
  }, [markSeen]);

  const openNotification = async (notification) => {
    if (pendingId) return;
    setPendingId(notification.id);
    try {
      if (notification.status !== "READ") await markRead(notification.id);
      router.push(notification.actionUrl || "/parent/notifications");
    } catch {
      // Authoritative state is restored by the shared provider. Leave the row
      // in place so the parent can retry instead of navigating on a failed write.
    } finally {
      setPendingId("");
    }
  };

  if (loading && notifications.length === 0) {
    return (
      <div className="space-y-2" aria-busy="true" aria-label="Loading notifications">
        {[0, 1, 2].map((index) => (
          <div key={index} className="h-24 animate-pulse rounded-2xl bg-slate-100" />
        ))}
      </div>
    );
  }

  const hasNotRead = notifications.some(
    (notification) => notification.status !== "READ"
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[var(--brand-ink)]">
            {t("settings.notifications")}
          </h1>
          <p className="mt-1 text-sm text-[var(--brand-muted)]">
            Messages and notices across your children&apos;s schools
          </p>
        </div>
        {hasNotRead ? (
          <button
            type="button"
            onClick={() => void markAllRead()}
            className="min-h-11 shrink-0 rounded-lg px-3 text-sm font-semibold text-[var(--brand-primary)] hover:bg-slate-100"
          >
            Mark all read
          </button>
        ) : null}
      </div>

      {error ? (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"
        >
          <span>Notifications could not be refreshed.</span>
          <button
            type="button"
            onClick={() => void refresh()}
            className="min-h-11 rounded-lg px-3 font-semibold"
          >
            {t("common.retry")}
          </button>
        </div>
      ) : null}

      {notifications.length === 0 ? (
        <ParentEmptyState emoji="🔔" title={t("home.allCaughtUp")} />
      ) : (
        <ul className="space-y-2">
          {notifications.map((notification) => {
            const descriptor = notificationStatus(notification.priority);
            const isRead = notification.status === "READ";

            return (
              <li key={notification.id}>
                <button
                  type="button"
                  onClick={() => void openNotification(notification)}
                  disabled={pendingId === notification.id}
                  className={[
                    "flex min-h-[76px] w-full gap-3 rounded-2xl border p-3.5 text-left transition hover:bg-slate-50 disabled:cursor-wait disabled:opacity-70",
                    isRead
                      ? "border-[var(--brand-border)] bg-white"
                      : descriptor.classes.card,
                  ].join(" ")}
                >
                  <span
                    aria-hidden="true"
                    className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${descriptor.classes.dot}`}
                  >
                    {descriptor.icon}
                  </span>

                  <span className="min-w-0 flex-1">
                    {notification.child ? (
                      <span className="block text-[11px] font-bold uppercase tracking-wide text-[var(--brand-muted)]">
                        {notification.child.name}
                        {notification.school ? ` • ${notification.school.name}` : ""}
                      </span>
                    ) : null}
                    <span className="block break-words font-semibold leading-snug text-[var(--brand-ink)]">
                      {notification.title}
                    </span>
                    <span className="mt-0.5 block break-words text-sm leading-relaxed text-[var(--brand-muted)]">
                      {notification.body}
                    </span>
                    <span className="mt-1 block text-[11px] text-[var(--brand-muted)]">
                      {formatRelativeShort(notification.createdAt)}
                    </span>
                  </span>

                  {!isRead ? (
                    <span
                      aria-label={notification.status === "UNREAD" ? "New" : "Not read"}
                      className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--brand-primary)]"
                    />
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

