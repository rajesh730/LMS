"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FaBell } from "react-icons/fa";
import {
  NotificationBulkActions,
  NotificationMeta,
  NotificationNewBadge,
  NotificationReadToggleButton,
  NotificationTypeBadge,
} from "@/components/notifications/NotificationUi";
import useNotificationInbox from "@/lib/useNotificationInbox";

function formatDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function StudentNotificationCenter() {
  const router = useRouter();
  const panelRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const {
    loading,
    error,
    notifications,
    unreadCount,
    loadNotifications,
    markNotificationsRead,
    toggleNotificationReadState,
    updateNotificationsReadState,
  } = useNotificationInbox({
    listUrl: "/api/student/notifications",
    readUrl: "/api/student/notifications/read",
    limit: 12,
    realtimeChannel: "student-notifications",
    enableRealtimeToast: true,
    toastMessageBuilder: (notification) =>
      notification.noticeType === "MAGAZINE"
        ? `Magazine update: ${notification.title}`
        : notification.noticeType === "EVENT"
        ? `New event notice: ${notification.title}`
        : `New school notice: ${notification.title}`,
  });

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }

    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isOpen]);

  const handleTogglePanel = useCallback(async () => {
    if (isOpen) {
      setIsOpen(false);
      return;
    }

    setIsOpen(true);
    const nextNotifications = await loadNotifications();
    await markNotificationsRead(nextNotifications);
  }, [isOpen, loadNotifications, markNotificationsRead]);

  const handleNotificationClick = (event, notification) => {
    event.preventDefault();
    setIsOpen(false);
    if (!notification.isRead) {
      void markNotificationsRead([notification]);
    }
    router.push(notification.href);
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={handleTogglePanel}
        className="relative inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-red-200 bg-white text-red-600 shadow-sm transition hover:bg-red-50"
        aria-label="Toggle student notifications"
      >
        <FaBell />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-14 z-50 w-[360px] rounded-2xl border border-red-100 bg-white p-4 shadow-[0_20px_50px_rgba(185,28,28,0.14)]">
          <div className="mb-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-normal text-red-700">
                  Student Notices
                </h3>
                <p className="mt-1 text-xs text-[#52657d]">
                  School updates and event notices for your student dashboard
                </p>
              </div>
              {notifications.length > 0 && (
                <NotificationBulkActions
                  compact
                  onMarkAllUnread={() =>
                    void updateNotificationsReadState("unread", notifications, {
                      allVisible: true,
                    })
                  }
                  onMarkAllRead={() =>
                    void updateNotificationsReadState("read", notifications, {
                      allVisible: true,
                    })
                  }
                />
              )}
            </div>
          </div>

          {loading ? (
            <div className="rounded-xl border border-[#d7cdbb] bg-[#f8fbff] p-4 text-sm text-[#52657d]">
              Loading notices...
            </div>
          ) : error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <p className="font-semibold">Failed to load</p>
              <p className="mt-1">{error}</p>
              <button
                type="button"
                onClick={loadNotifications}
                className="mt-2 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-500"
              >
                Retry
              </button>
            </div>
          ) : notifications.length === 0 ? (
            <div className="rounded-xl border border-[#d7cdbb] bg-[#f8fbff] p-4 text-sm text-[#52657d]">
              No notices yet.
            </div>
          ) : (
            <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
              {notifications.map((notification) => (
                <div
                  key={`${notification.noticeType}-${notification.id}`}
                  className="rounded-xl border border-[#d7cdbb] bg-white p-3 transition hover:border-red-200 hover:bg-red-50/40"
                >
                  <button
                    type="button"
                    onClick={(event) =>
                      handleNotificationClick(event, notification)
                    }
                    className="block w-full text-left"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <NotificationTypeBadge
                        noticeType={notification.noticeType}
                      />
                    </div>
                    <p className="mt-2 text-sm font-semibold text-[#17120a]">
                      {notification.title}
                    </p>
                    <p className="mt-1 line-clamp-2 text-sm text-[#344f77]">
                      {notification.message}
                    </p>
                    <NotificationMeta
                      className="mt-2"
                      date={formatDate(notification.publishedAt)}
                      eventTitle={notification.event?.title}
                    />
                    <div className="mt-2">
                      <NotificationNewBadge isRead={notification.isRead} />
                    </div>
                  </button>
                  <div className="mt-3 flex justify-end">
                    <NotificationReadToggleButton
                      notification={notification}
                      onToggle={(item) => void toggleNotificationReadState(item)}
                      size="xs"
                    />
                  </div>
                </div>
              ))}

              <a
                href="/student/notices"
                onClick={(event) => {
                  event.preventDefault();
                  setIsOpen(false);
                  void markNotificationsRead(notifications);
                  router.push("/student/notices");
                }}
                className="block rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm font-semibold text-red-700 transition hover:border-red-300 hover:bg-red-100"
              >
                View all student notices
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
