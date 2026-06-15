"use client";

import { useCallback, useEffect, useState } from "react";
import { FaCalendarAlt, FaCheckCircle, FaSchool } from "react-icons/fa";
import EventHub from "@/components/events/EventHub";
import StudentQuickNav from "@/components/student/StudentQuickNav";
import StudentNotificationCenter from "@/components/student/StudentNotificationCenter";
import useWorkIndicators from "@/lib/useWorkIndicators";
import useRealtimeChannel from "@/lib/useRealtimeChannel";

const REGISTERED_FILTERS = [
  { id: "participated", label: "All Registered" },
  { id: "pending", label: "Pending" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Rejected" },
];

const DISCOVERY_FILTERS = [
  { id: "all", label: "All Available" },
  { id: "pending", label: "Pending" },
  { id: "approved", label: "Registered" },
];

export default function StudentEventWorkspace() {
  const { loadIndicators } = useWorkIndicators();
  const [activeTab, setActiveTab] = useState("registered");

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

  const tabs = [
    {
      id: "registered",
      label: "My Registered Events",
      icon: FaCheckCircle,
    },
    {
      id: "platform",
      label: "Platform Competitions",
      icon: FaCalendarAlt,
    },
    {
      id: "school",
      label: "School Events",
      icon: FaSchool,
    },
  ];

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

        <div className="student-events-tabs rounded-2xl border border-slate-800 bg-slate-900/70 p-2">
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                    activeTab === tab.id
                      ? "bg-blue-600 text-white"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <Icon />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {activeTab === "registered" && (
          <EventHub
            defaultFilter="participated"
            filters={REGISTERED_FILTERS}
            title="My Registered Events"
            description="Track your registrations, event notices, rounds, results, and certificates."
          />
        )}

        {activeTab === "platform" && (
          <EventHub
            eventScope="PLATFORM"
            filters={DISCOVERY_FILTERS}
            title="Platform Competitions"
            description="Inter-school competitions organized by the platform. Your school handles registration for participating students."
          />
        )}

        {activeTab === "school" && (
          <EventHub
            eventScope="SCHOOL"
            filters={DISCOVERY_FILTERS}
            title="School Events"
            description="Events created by your school for internal participation, auditions, showcases, and other school activities. Teachers and school admins manage the final registrations."
          />
        )}
    </div>
  );
}
