"use client";

import Link from "next/link";
import { FaBell, FaCalendarAlt, FaSchool } from "react-icons/fa";
import EmptyState from "@/components/EmptyState";
import {
  NotificationNewBadge,
  NotificationTypeBadge,
} from "@/components/notifications/NotificationUi";
import AlertBanner from "@/components/ui/AlertBanner";
import LoadingState from "@/components/ui/LoadingState";
import PageHeader from "@/components/ui/PageHeader";
import AppDate from "@/components/common/AppDate";
import useNotificationInbox from "@/lib/useNotificationInbox";

export default function StudentNoticeBoard() {
  const {
    loading,
    error,
    notifications,
  } =
    useNotificationInbox({
      listUrl: "/api/student/notifications",
      readUrl: "/api/student/notifications/read",
      limit: 100,
      realtimeChannel: "student-notifications",
      markVisibleOnLoad: true,
    });

  if (loading) {
    return (
      <LoadingState
        title="Loading student notices"
        message="Preparing school and event updates for you."
      />
    );
  }

  if (error) {
    return <AlertBanner type="error" title="Unable to load notices" message={error} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={FaBell}
        eyebrow="Student Updates"
        title="Notices"
        description="Read school announcements and event updates from one simple place."
      />

      {notifications.length === 0 ? (
        <EmptyState
          icon={FaBell}
          title="No notices yet"
          description="When your school or event organizers publish notices, they will appear here automatically."
        />
      ) : (
        <div className="space-y-4">
          {notifications.map((notification) => (
            <article
              key={`${notification.noticeType}-${notification.id}`}
              className="rounded-xl border border-[#d7cdbb] bg-white p-6 shadow-[0_10px_26px_rgba(10,47,102,0.05)]"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <NotificationTypeBadge
                      noticeType={notification.noticeType}
                      detailed
                    />
                  </div>
                  <h3 className="mt-4 text-xl font-bold text-[#17120a]">
                    {notification.title}
                  </h3>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-[#27344a]">
                    {notification.message}
                  </p>
                </div>

                <div className="text-right text-sm text-[#52657d]">
                  <div className="inline-flex items-center gap-2">
                    <FaCalendarAlt className="text-[#52657d]" />
                    <span><AppDate value={notification.publishedAt} mode="dateTime" /></span>
                  </div>
                  {!notification.isRead && (
                    <div className="mt-3">
                      <NotificationNewBadge isRead={notification.isRead} />
                    </div>
                  )}
                  {notification.event && (
                    <div className="mt-3 inline-flex items-center gap-2 text-[#27344a]">
                      <FaSchool className="text-[#52657d]" />
                      <span>{notification.event.title}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-5">
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={notification.href}
                    className="inline-flex items-center rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-500"
                  >
                    {notification.noticeType === "EVENT"
                      ? "Open Event"
                      : "Back to Dashboard"}
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
