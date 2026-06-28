"use client";

import NotificationBell from "@/components/notifications/NotificationBell";

export default function SchoolNotificationCenter() {
  return (
    <NotificationBell
      listUrl="/api/school/notifications"
      readUrl="/api/school/notifications/read"
      realtimeChannel="school-notifications"
      limit={15}
      title="Notifications"
      subtitle="Event notices & platform updates"
      viewAllHref="/school/dashboard?tab=notices"
      viewAllLabel="See all notifications"
      toastMessageBuilder={(notification) =>
        notification.noticeType === "MAGAZINE"
          ? `Magazine update: ${notification.title}`
          : notification.noticeType === "EVENT"
          ? `New event notice: ${notification.title}`
          : `New platform notice: ${notification.title}`
      }
    />
  );
}
