"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { FaBell, FaSyncAlt } from "react-icons/fa";
import EmptyState from "@/components/EmptyState";
import LoadingState from "@/components/ui/LoadingState";

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
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);

  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/school/notifications?limit=100", {
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || "Failed to load school notices");
      }
      setNotifications(Array.isArray(data.notifications) ? data.notifications : []);
    } catch (error) {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const platformNotices = notifications.filter(
    (notification) => notification.noticeType === "GENERAL"
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
              <FaBell className="text-[#0a2f66]" />
              Received Notices
            </h2>
            <p className="mt-2 text-sm text-[#344f77]">
              View platform updates and event notices sent to your school dashboard.
            </p>
          </div>
          <button
            type="button"
            onClick={loadNotifications}
            className="inline-flex items-center gap-2 rounded-lg bg-[#0a2f66] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#123f7d]"
          >
            <FaSyncAlt />
            Refresh
          </button>
        </div>
      </div>

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
                  <span className="rounded-full border border-[#bfd7f7] bg-[#eaf2ff] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-[#0a2f66]">
                    Platform
                  </span>
                </div>
                <p className="mt-3 text-lg font-semibold text-[#17120a]">
                  {notification.title}
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-[#27344a]">
                  {notification.message}
                </p>
                <div className="mt-3 text-xs text-[#52657d]">
                  {formatDate(notification.publishedAt)}
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
              <Link
                key={`${notification.noticeType}-${notification.id}`}
                href={notification.href}
                className="block rounded-xl border border-[#d7cdbb] bg-white p-4 transition hover:border-[#bfd7f7] hover:bg-[#f8fbff]"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-[#bdefff] bg-[#e8fbff] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-[#07576b]">
                    Event
                  </span>
                </div>
                <p className="mt-3 text-lg font-semibold text-[#17120a]">
                  {notification.title}
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-[#27344a]">
                  {notification.message}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-[#52657d]">
                  <span>{formatDate(notification.publishedAt)}</span>
                  {notification.event && <span>{notification.event.title}</span>}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
