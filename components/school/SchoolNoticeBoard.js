"use client";

import Link from "next/link";
import { useCallback } from "react";
import { FaBell, FaSyncAlt } from "react-icons/fa";
import EmptyState from "@/components/EmptyState";
import {
  NotificationBulkActions,
  NotificationMeta,
  NotificationNewBadge,
  NotificationReadToggleButton,
  NotificationTypeBadge,
} from "@/components/notifications/NotificationUi";
import LoadingState from "@/components/ui/LoadingState";
import useNotificationInbox from "@/lib/useNotificationInbox";

function formatDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function SchoolNoticeBoard() {
  const {
    loading,
    notifications,
    loadNotifications,
    toggleNotificationReadState,
    updateNotificationsReadState: updateNotificationsReadStateBase,
  } = useNotificationInbox({
    listUrl: "/api/school/notifications",
    readUrl: "/api/school/notifications/read",
    limit: 100,
    realtimeChannel: "school-notifications",
    markVisibleOnLoad: true,
  });

  const updateNotificationsReadState = useCallback(
    async (action) => {
      await updateNotificationsReadStateBase(action, notifications, {
        allVisible: true,
      });
    },
    [notifications, updateNotificationsReadStateBase]
  );

  const platformNotices = notifications.filter(
    (notification) => notification.noticeType === "GENERAL"
  );
  const magazineNotices = notifications.filter(
    (notification) => notification.noticeType === "MAGAZINE"
  );
  const eventNotices = notifications.filter(
    (notification) => notification.noticeType === "EVENT"
  );

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[#d7cdbb] bg-white p-6 shadow-[0_14px_36px_rgba(10,47,102,0.06)]">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="flex items-center gap-3 text-2xl font-bold text-[#17120a]">
              <FaBell className="text-red-600" />
              Received Notices
            </h2>
            <p className="mt-2 text-sm text-[#344f77]">
              View platform updates and event notices sent to your school dashboard.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {notifications.length > 0 && (
              <NotificationBulkActions
                onMarkAllUnread={() =>
                  void updateNotificationsReadState("unread")
                }
                onMarkAllRead={() => void updateNotificationsReadState("read")}
              />
            )}
            <button
              type="button"
              onClick={() => void loadNotifications()}
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-500"
            >
              <FaSyncAlt />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <section className="rounded-2xl border border-[#d7cdbb] bg-white p-6 shadow-[0_10px_28px_rgba(10,47,102,0.05)]">
        <h3 className="text-xl font-semibold text-[#17120a]">
          Magazine Notices ({magazineNotices.length})
        </h3>
        <p className="mt-1 text-sm text-[#344f77]">
          Student magazine submissions and resubmissions that need school attention.
        </p>

        {loading ? (
          <LoadingState
            title="Loading magazine notices"
            message="Preparing magazine submission updates."
            className="mt-4"
          />
        ) : magazineNotices.length === 0 ? (
          <EmptyState
            icon={FaBell}
            title="No magazine notices yet"
            description="Student writing submissions and resubmissions will appear here."
          />
        ) : (
          <div className="mt-4 space-y-4">
            {magazineNotices.map((notification) => (
              <article
                key={`${notification.noticeType}-${notification.id}`}
                className="rounded-xl border border-[#d7cdbb] bg-white p-4 transition hover:border-red-200 hover:bg-red-50/40"
              >
                <Link href={notification.href} className="block">
                  <div className="flex flex-wrap items-center gap-2">
                    <NotificationTypeBadge
                      noticeType={notification.noticeType}
                    />
                  </div>
                  <p className="mt-3 text-lg font-semibold text-[#17120a]">
                    {notification.title}
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-[#27344a]">
                    {notification.message}
                  </p>
                  <NotificationMeta
                    className="mt-3"
                    date={formatDate(notification.publishedAt)}
                  />
                  {!notification.isRead && (
                    <div className="mt-3">
                      <NotificationNewBadge isRead={notification.isRead} />
                    </div>
                  )}
                </Link>
                <div className="mt-4">
                  <NotificationReadToggleButton
                    notification={notification}
                    onToggle={(item) => void toggleNotificationReadState(item)}
                  />
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-[#d7cdbb] bg-white p-6 shadow-[0_10px_28px_rgba(10,47,102,0.05)]">
        <h3 className="text-xl font-semibold text-[#17120a]">
          Platform Notices ({platformNotices.length})
        </h3>
        <p className="mt-1 text-sm text-[#344f77]">
          These are platform-wide updates created by super admin.
        </p>

        {loading ? (
          <LoadingState
            title="Loading platform notices"
            message="Preparing platform-wide updates from super admin."
            className="mt-4"
          />
        ) : platformNotices.length === 0 ? (
          <EmptyState
            icon={FaBell}
            title="No platform notices yet"
            description="Platform-wide announcements from super admin will appear here."
          />
        ) : (
          <div className="mt-4 space-y-4">
            {platformNotices.map((notification) => (
              <div
                key={`${notification.noticeType}-${notification.id}`}
                className="w-full rounded-xl border border-[#d7cdbb] bg-white p-4 text-left"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <NotificationTypeBadge
                    noticeType={notification.noticeType}
                  />
                </div>
                <p className="mt-3 text-lg font-semibold text-[#17120a]">
                  {notification.title}
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-[#27344a]">
                  {notification.message}
                </p>
                <NotificationMeta
                  className="mt-3"
                  date={formatDate(notification.publishedAt)}
                />
                {!notification.isRead && (
                  <div className="mt-3">
                    <NotificationNewBadge isRead={notification.isRead} />
                  </div>
                )}
                <div className="mt-4">
                  <NotificationReadToggleButton
                    notification={notification}
                    onToggle={(item) => void toggleNotificationReadState(item)}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-[#d7cdbb] bg-white p-6 shadow-[0_10px_28px_rgba(10,47,102,0.05)]">
        <h3 className="text-xl font-semibold text-[#17120a]">
          Event Notices ({eventNotices.length})
        </h3>
        <p className="mt-1 text-sm text-[#344f77]">
          Event-specific updates for competitions and activities relevant to your school.
        </p>

        {loading ? (
          <LoadingState
            title="Loading event notices"
            message="Preparing updates from events relevant to your school."
            className="mt-4"
          />
        ) : eventNotices.length === 0 ? (
          <EmptyState
            icon={FaBell}
            title="No event notices yet"
            description="Event-specific updates will appear here after organizers publish them."
          />
        ) : (
          <div className="mt-4 space-y-4">
            {eventNotices.map((notification) => (
              <article
                key={`${notification.noticeType}-${notification.id}`}
                className="rounded-xl border border-[#d7cdbb] bg-white p-4 transition hover:border-red-200 hover:bg-red-50/40"
              >
                <Link href={notification.href} className="block">
                  <div className="flex flex-wrap items-center gap-2">
                    <NotificationTypeBadge
                      noticeType={notification.noticeType}
                    />
                  </div>
                  <p className="mt-3 text-lg font-semibold text-[#17120a]">
                    {notification.title}
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-[#27344a]">
                    {notification.message}
                  </p>
                  <NotificationMeta
                    className="mt-3"
                    date={formatDate(notification.publishedAt)}
                    eventTitle={notification.event?.title}
                  />
                  {!notification.isRead && (
                    <div className="mt-3">
                      <NotificationNewBadge isRead={notification.isRead} />
                    </div>
                  )}
                </Link>
                <div className="mt-4">
                  <NotificationReadToggleButton
                    notification={notification}
                    onToggle={(item) => void toggleNotificationReadState(item)}
                  />
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
