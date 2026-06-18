"use client";

import { useCallback, useEffect } from "react";
import { FaCalendarAlt, FaCheckCircle, FaCircle, FaUsers } from "react-icons/fa";
import EventHub from "@/components/events/EventHub";
import StudentQuickNav from "@/components/student/StudentQuickNav";
import StudentNotificationCenter from "@/components/student/StudentNotificationCenter";
import useWorkIndicators from "@/lib/useWorkIndicators";
import useRealtimeChannel from "@/lib/useRealtimeChannel";

const STUDENT_EVENT_FILTERS = [
  { id: "live", label: "Live Events", icon: FaCircle },
  { id: "registration-open", label: "Registration Open", icon: FaUsers },
  { id: "all", label: "All Events", icon: FaCalendarAlt },
  { id: "completed", label: "Completed", icon: FaCheckCircle },
];

export default function StudentEventWorkspace() {
  const { loadIndicators } = useWorkIndicators();
  const markEventNotificationsRead = useCallback(async () => {
    try {
      const res = await fetch("/api/student/notifications?limit=100", {
        cache: "no-store",
      });
      const payload = await res.json().catch(() => ({}));

      if (!res.ok || !Array.isArray(payload.notifications)) return;

      const unreadEventNotifications = payload.notifications.filter(
        (notification) =>
          notification.noticeType === "EVENT" && !notification.isRead
      );

      if (unreadEventNotifications.length === 0) {
        await loadIndicators({ silent: true });
        return;
      }

      await fetch("/api/student/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notifications: unreadEventNotifications.map((notification) => ({
            id: notification.id,
            noticeType: notification.noticeType,
            storageType: notification.storageType,
          })),
        }),
      }).catch(() => {});
      await loadIndicators({ silent: true });
    } catch (_error) {
      await loadIndicators({ silent: true });
    }
  }, [loadIndicators]);

  useEffect(() => {
    void markEventNotificationsRead();
  }, [markEventNotificationsRead]);

  useRealtimeChannel(
    "student-notifications",
    useCallback(() => {
      void markEventNotificationsRead();
    }, [markEventNotificationsRead])
  );

  return (
    <div className="student-events-mobile-shell space-y-6 text-slate-200">
        <StudentQuickNav className="sm:hidden" />
        <div className="student-events-intro flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white">Student Events</h1>
            <p className="mt-2 text-slate-400">
              See what you are registered for, discover upcoming events, and
              follow notices, rounds, results, and certificates from one clear place.
            </p>
          </div>
          <StudentNotificationCenter />
        </div>

        <EventHub
          eventScope="SCHOOL"
          defaultFilter="all"
          filters={STUDENT_EVENT_FILTERS}
          title="School Events"
          description="All school events are shown. Events outside your grade stay visible, but registration is not available for your account."
        />
    </div>
  );
}
