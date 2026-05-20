"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FaBell, FaCalendarAlt, FaSchool } from "react-icons/fa";
import EmptyState from "@/components/EmptyState";
import AlertBanner from "@/components/ui/AlertBanner";
import LoadingState from "@/components/ui/LoadingState";
import PageHeader from "@/components/ui/PageHeader";

function formatDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function StudentNoticeBoard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const res = await fetch("/api/student/notifications?limit=100", {
          cache: "no-store",
        });
        const payload = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(payload.message || "Failed to load notices");
        }

        if (active) {
          setNotifications(
            Array.isArray(payload.notifications) ? payload.notifications : []
          );
        }
      } catch (loadError) {
        if (active) {
          setError(loadError.message || "Failed to load notices");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      active = false;
    };
  }, []);

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
              className="rounded-xl border border-slate-800 bg-slate-900/70 p-6"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                        notification.noticeType === "EVENT"
                          ? "bg-sky-500/15 text-sky-200"
                          : "bg-emerald-500/15 text-emerald-200"
                      }`}
                    >
                      {notification.noticeType === "EVENT"
                        ? "Event Notice"
                        : "School Notice"}
                    </span>
                  </div>
                  <h3 className="mt-4 text-xl font-bold text-white">
                    {notification.title}
                  </h3>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-300">
                    {notification.message}
                  </p>
                </div>

                <div className="text-right text-sm text-slate-400">
                  <div className="inline-flex items-center gap-2">
                    <FaCalendarAlt className="text-slate-500" />
                    <span>{formatDate(notification.publishedAt)}</span>
                  </div>
                  {notification.event && (
                    <div className="mt-3 inline-flex items-center gap-2 text-slate-300">
                      <FaSchool className="text-slate-500" />
                      <span>{notification.event.title}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-5">
                <Link
                  href={notification.href}
                  className="inline-flex items-center rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-slate-700"
                >
                  {notification.noticeType === "EVENT"
                    ? "Open Event"
                    : "Back to Dashboard"}
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
