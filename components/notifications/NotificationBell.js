"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FaBell, FaCheckDouble, FaRegBell, FaRegBellSlash } from "react-icons/fa";
import useNotificationInbox from "@/lib/useNotificationInbox";
import {
  formatRelativeTime,
  getNotificationType,
  groupNotificationsByTime,
} from "@/components/notifications/NotificationUi";

const keyOf = (n) => `${n.noticeType}:${n.id}`;

function NotificationRow({ notification, unread, onClick }) {
  const type = getNotificationType(notification.noticeType);
  const Icon = type.Icon;

  return (
    <li>
      <button
        type="button"
        onClick={(event) => onClick(event, notification)}
        className={`flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-[#f7f8fc] ${
          unread ? "bg-[#f4f1ff]" : "bg-white"
        }`}
      >
        <span
          className={`mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${type.circle}`}
        >
          <Icon className="text-base" />
        </span>
        <span className="min-w-0 flex-1">
          <span
            className={`block text-sm leading-snug ${
              unread ? "font-black text-[#10142f]" : "font-bold text-[#27344a]"
            }`}
          >
            {notification.title}
          </span>
          {notification.message && (
            <span className="mt-0.5 line-clamp-2 block text-xs leading-5 text-[#6b7890]">
              {notification.message}
            </span>
          )}
          <span className="mt-1 flex items-center gap-1.5 text-[11px] font-semibold text-[#9aa3b4]">
            <span>{formatRelativeTime(notification.publishedAt)}</span>
            {notification.event?.title && (
              <>
                <span aria-hidden>·</span>
                <span className="truncate">{notification.event.title}</span>
              </>
            )}
          </span>
        </span>
        {unread && (
          <span
            className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--brand-primary)]"
            aria-label="Unread"
          />
        )}
      </button>
    </li>
  );
}

function SkeletonList() {
  return (
    <div className="space-y-1 p-2">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex items-start gap-3 px-2 py-3">
          <div className="h-11 w-11 shrink-0 animate-pulse rounded-full bg-[#eef0f6]" />
          <div className="flex-1 space-y-2 py-1">
            <div className="h-3 w-3/4 animate-pulse rounded bg-[#eef0f6]" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-[#f1f3f8]" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#f4f6fb] text-2xl text-[#aab2c5]">
        <FaRegBellSlash />
      </span>
      <p className="mt-4 text-sm font-black text-[#10142f]">You&apos;re all caught up</p>
      <p className="mt-1 text-xs text-[#75869b]">
        New notifications will show up here.
      </p>
    </div>
  );
}

function ErrorState({ error, onRetry }) {
  return (
    <div className="px-4 py-6 text-center">
      <p className="text-sm font-bold text-[#10142f]">Couldn&apos;t load notifications</p>
      <p className="mt-1 text-xs text-[#75869b]">{error}</p>
      <button
        type="button"
        onClick={() => onRetry()}
        className="mt-3 rounded-full bg-[var(--brand-primary)] px-4 py-1.5 text-xs font-black text-white transition hover:opacity-90"
      >
        Try again
      </button>
    </div>
  );
}

export default function NotificationBell({
  listUrl,
  readUrl,
  realtimeChannel,
  limit = 15,
  toastMessageBuilder,
  title = "Notifications",
  subtitle = "",
  viewAllHref,
  viewAllLabel = "See all notifications",
}) {
  const router = useRouter();
  const panelRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  // Items that were unread the moment the panel opened — kept visually
  // highlighted even after we clear the count, so the user still sees what's new
  // (Facebook/Instagram behaviour).
  const [highlightKeys, setHighlightKeys] = useState(() => new Set());

  const {
    loading,
    error,
    notifications,
    unreadCount,
    loadNotifications,
    markNotificationsRead,
  } = useNotificationInbox({
    listUrl,
    readUrl,
    limit,
    realtimeChannel,
    enableRealtimeToast: true,
    toastMessageBuilder,
  });

  useEffect(() => {
    if (!isOpen) return undefined;
    const onPointer = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    const onKey = (event) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [isOpen]);

  const openPanel = useCallback(async () => {
    setIsOpen(true);
    const next = await loadNotifications({ silent: true });
    const unread = (next || []).filter((item) => !item.isRead);
    if (unread.length > 0) {
      setHighlightKeys(new Set(unread.map(keyOf)));
      void markNotificationsRead(unread);
    } else {
      setHighlightKeys(new Set());
    }
  }, [loadNotifications, markNotificationsRead]);

  const togglePanel = useCallback(() => {
    if (isOpen) {
      setIsOpen(false);
      return;
    }
    void openPanel();
  }, [isOpen, openPanel]);

  const handleItemClick = (event, notification) => {
    event.preventDefault();
    setIsOpen(false);
    if (!notification.isRead) void markNotificationsRead([notification]);
    if (notification.href) router.push(notification.href);
  };

  const handleViewAll = (event) => {
    event.preventDefault();
    setIsOpen(false);
    if (notifications.length > 0) void markNotificationsRead(notifications);
    if (viewAllHref) router.push(viewAllHref);
  };

  const hasUnread = notifications.some((item) => !item.isRead);
  const groups = groupNotificationsByTime(notifications);

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={togglePanel}
        aria-label={title}
        aria-expanded={isOpen}
        className="relative inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-[#e4e7f2] bg-white text-[#3d4a5c] shadow-sm transition hover:bg-[#f4f6fb] hover:text-[var(--brand-primary)]"
      >
        {isOpen ? <FaBell /> : <FaRegBell />}
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white ring-2 ring-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-label={title}
          className="absolute right-0 top-14 z-50 w-[min(calc(100vw-1.5rem),384px)] overflow-hidden rounded-2xl border border-[#e9ecf5] bg-white shadow-[0_24px_60px_rgba(16,20,47,0.18)]"
        >
          <div className="flex items-center justify-between gap-3 border-b border-[#f0f2f8] px-4 py-3">
            <div className="min-w-0">
              <h3 className="text-base font-black text-[#10142f]">{title}</h3>
              {subtitle && (
                <p className="mt-0.5 truncate text-xs text-[#75869b]">{subtitle}</p>
              )}
            </div>
            {hasUnread && (
              <button
                type="button"
                onClick={() => void markNotificationsRead(notifications)}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-black text-[var(--brand-primary)] transition hover:bg-[#f4f1ff]"
              >
                <FaCheckDouble className="text-[11px]" />
                Mark all read
              </button>
            )}
          </div>

          {loading && notifications.length === 0 ? (
            <SkeletonList />
          ) : error ? (
            <ErrorState error={error} onRetry={loadNotifications} />
          ) : notifications.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="max-h-[min(70vh,460px)] overflow-y-auto">
              {groups.map((group) => (
                <div key={group.key}>
                  <p className="sticky top-0 z-10 bg-white/95 px-4 pb-1 pt-3 text-[11px] font-black uppercase tracking-wide text-[#8a93a6] backdrop-blur">
                    {group.label}
                  </p>
                  <ul className="divide-y divide-[#f4f6fb]">
                    {group.items.map((notification) => (
                      <NotificationRow
                        key={keyOf(notification)}
                        notification={notification}
                        unread={
                          highlightKeys.has(keyOf(notification)) ||
                          !notification.isRead
                        }
                        onClick={handleItemClick}
                      />
                    ))}
                  </ul>
                </div>
              ))}
              {viewAllHref && (
                <a
                  href={viewAllHref}
                  onClick={handleViewAll}
                  className="block border-t border-[#f0f2f8] px-4 py-3 text-center text-sm font-black text-[var(--brand-primary)] transition hover:bg-[#f4f1ff]"
                >
                  {viewAllLabel}
                </a>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
