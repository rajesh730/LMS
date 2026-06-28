"use client";

import NotificationBell from "@/components/notifications/NotificationBell";

export default function StudentNotificationCenter() {
  return (
    <NotificationBell
      listUrl="/api/student/notifications"
      readUrl="/api/student/notifications/read"
      realtimeChannel="student-notifications"
      limit={15}
      title="Notifications"
      subtitle="School updates, events & your activity"
      viewAllHref="/student/notices"
      viewAllLabel="See all notifications"
      toastMessageBuilder={(notification) =>
        notification.noticeType === "ACHIEVEMENT"
          ? `🎉 ${notification.title}`
          : notification.noticeType === "MAGAZINE"
          ? `Magazine update: ${notification.title}`
          : notification.noticeType === "EVENT"
          ? `New event notice: ${notification.title}`
          : `New school notice: ${notification.title}`
      }
    />
  );
}
