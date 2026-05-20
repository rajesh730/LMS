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
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="flex items-center gap-3 text-2xl font-bold text-white">
              <FaBell className="text-blue-400" />
              Received Notices
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              View platform updates and event notices sent to your school dashboard.
            </p>
          </div>
          <button
            type="button"
            onClick={loadNotifications}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            <FaSyncAlt />
            Refresh
          </button>
        </div>
      </div>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
        <h3 className="text-xl font-semibold text-white">
          Platform Notices ({platformNotices.length})
        </h3>
        <p className="mt-1 text-sm text-slate-400">
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
                className="w-full rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-left"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-amber-200">
                    Platform
                  </span>
                </div>
                <p className="mt-3 text-lg font-semibold text-white">
                  {notification.title}
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-300">
                  {notification.message}
                </p>
                <div className="mt-3 text-xs text-slate-500">
                  {formatDate(notification.publishedAt)}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
        <h3 className="text-xl font-semibold text-white">
          Event Notices ({eventNotices.length})
        </h3>
        <p className="mt-1 text-sm text-slate-400">
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
                className="block rounded-xl border border-slate-800 bg-slate-950/60 p-4 transition hover:border-slate-700 hover:bg-slate-900"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-sky-500/15 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-sky-200">
                    Event
                  </span>
                </div>
                <p className="mt-3 text-lg font-semibold text-white">
                  {notification.title}
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-300">
                  {notification.message}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
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
