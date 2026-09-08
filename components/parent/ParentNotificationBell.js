"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  CalendarDays,
  CheckCheck,
  FileText,
  Megaphone,
  MessageCircle,
  Trophy,
} from "lucide-react";
import { useParentNotifications } from "@/components/parent/ParentNotificationContext";
import {
  formatRelativeTime,
  groupNotificationsByTime,
} from "@/components/notifications/NotificationUi";
import styles from "@/components/parent/ParentDesign.module.css";

const TYPE_ICON = {
  MESSAGE: MessageCircle,
  NOTICE: Megaphone,
  CONSENT: FileText,
  EVENT: CalendarDays,
  ACHIEVEMENT: Trophy,
  RESULT: Trophy,
};

function NotificationRow({ notification, pending, onOpen }) {
  const Icon = TYPE_ICON[notification.type] || Bell;
  const isRead = notification.status === "READ";

  return (
    <li>
      <button
        type="button"
        className={styles.notificationRow}
        data-highlighted={!isRead ? "true" : "false"}
        onClick={() => onOpen(notification)}
        disabled={pending}
      >
        <span className={styles.notificationIcon} data-type={notification.type}>
          <Icon aria-hidden="true" />
        </span>
        <span className={styles.notificationCopy}>
          {notification.child ? (
            <span className={styles.notificationContext}>
              {notification.child.name}
              {notification.school ? ` • ${notification.school.name}` : ""}
            </span>
          ) : null}
          <span className={styles.notificationTitle}>{notification.title}</span>
          {notification.body ? (
            <span className={styles.notificationBody}>{notification.body}</span>
          ) : null}
          <span className={styles.notificationTime}>
            {formatRelativeTime(notification.createdAt)}
          </span>
        </span>
        {!isRead ? (
          <span className={styles.notificationUnreadDot}>
            <span className="sr-only">Not read</span>
          </span>
        ) : null}
      </button>
    </li>
  );
}

export default function ParentNotificationBell() {
  const router = useRouter();
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [pendingId, setPendingId] = useState("");
  const {
    loading,
    error,
    notifications,
    unreadCount,
    refresh,
    markSeen,
    markRead,
    markAllRead,
  } = useParentNotifications();

  const openPanel = useCallback(async () => {
    setOpen(true);
    await markSeen();
    await refresh({ silent: true });
  }, [markSeen, refresh]);

  const toggle = () => {
    if (open) {
      setOpen(false);
      return;
    }
    void openPanel();
  };

  useEffect(() => {
    if (!open) return undefined;
    panelRef.current?.focus();

    const closeOnOutsidePress = (event) => {
      if (
        !panelRef.current?.contains(event.target) &&
        !triggerRef.current?.contains(event.target)
      ) {
        setOpen(false);
      }
    };
    const closeOnEscape = (event) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    };

    document.addEventListener("pointerdown", closeOnOutsidePress);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePress);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  // A notification arriving while the panel is already visible has been seen.
  useEffect(() => {
    if (!open || unreadCount === 0) return;
    const incoming = notifications.filter(
      (notification) => notification.status === "UNREAD"
    );
    if (incoming.length > 0) {
      void markSeen();
    }
  }, [markSeen, notifications, open, unreadCount]);

  const openNotification = async (notification) => {
    if (pendingId) return;
    setPendingId(notification.id);
    try {
      if (notification.status !== "READ") {
        await markRead(notification.id);
      }
      setOpen(false);
      router.push(notification.actionUrl || "/parent/notifications");
    } catch {
      // Keep the panel open so the parent can retry. The shared provider has
      // already restored authoritative state and exposes the error below.
    } finally {
      setPendingId("");
    }
  };

  const groups = groupNotificationsByTime(
    notifications.map((notification) => ({
      ...notification,
      publishedAt: notification.createdAt,
    }))
  );
  const hasNotRead = notifications.some(
    (notification) => notification.status !== "READ"
  );

  return (
    <div className={styles.notificationBell}>
      <button
        ref={triggerRef}
        type="button"
        className={styles.tool}
        onClick={toggle}
        aria-label={
          unreadCount > 0
            ? `Notifications, ${unreadCount} new`
            : "Notifications"
        }
        aria-haspopup="dialog"
        aria-expanded={open}
        title="Notifications"
      >
        <Bell aria-hidden="true" strokeWidth={open ? 2.3 : 1.8} />
        {unreadCount > 0 ? (
          <span className={styles.badge} aria-hidden="true">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </button>

      <span className="sr-only" aria-live="polite">
        {unreadCount > 0 ? `${unreadCount} new notifications` : ""}
      </span>

      {open ? (
        <div
          ref={panelRef}
          tabIndex={-1}
          role="dialog"
          aria-label="Notifications"
          className={styles.notificationPanel}
        >
          <div className={styles.notificationPanelHeader}>
            <div>
              <h2>Notifications</h2>
              <p>Messages and notices from your schools</p>
            </div>
            {hasNotRead ? (
              <button
                type="button"
                onClick={() => void markAllRead()}
                className={styles.notificationMarkAll}
              >
                <CheckCheck aria-hidden="true" />
                Mark all read
              </button>
            ) : null}
          </div>

          <div className={styles.notificationList}>
            {loading && notifications.length === 0 ? (
              <div className={styles.notificationState} role="status">
                Loading notifications…
              </div>
            ) : error && notifications.length === 0 ? (
              <div className={styles.notificationState} role="alert">
                <p>Notifications could not be loaded.</p>
                <button type="button" onClick={() => void refresh()}>
                  Try again
                </button>
              </div>
            ) : notifications.length === 0 ? (
              <div className={styles.notificationState}>
                <Bell aria-hidden="true" />
                <p>You&apos;re all caught up.</p>
              </div>
            ) : (
              groups.map((group) => (
                <section key={group.key} aria-labelledby={`notification-${group.key}`}>
                  <h3
                    id={`notification-${group.key}`}
                    className={styles.notificationGroupTitle}
                  >
                    {group.label}
                  </h3>
                  <ul className={styles.notificationRows}>
                    {group.items.map((notification) => (
                      <NotificationRow
                        key={notification.id}
                        notification={notification}
                        pending={pendingId === notification.id}
                        onOpen={openNotification}
                      />
                    ))}
                  </ul>
                </section>
              ))
            )}
          </div>

          <button
            type="button"
            className={styles.notificationViewAll}
            onClick={() => {
              setOpen(false);
              router.push("/parent/notifications");
            }}
          >
            See all notifications
          </button>
        </div>
      ) : null}
    </div>
  );
}
