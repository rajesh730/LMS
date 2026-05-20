"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FaBell } from "react-icons/fa";

function formatDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function StudentNotificationCenter() {
  const router = useRouter();
  const panelRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);

  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/student/notifications?limit=12", {
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || "Failed to load notifications");
      }
      setNotifications(
        Array.isArray(data.notifications) ? data.notifications : []
      );
    } catch (error) {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      loadNotifications();
    }, 30000);

    return () => clearInterval(intervalId);
  }, [loadNotifications]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }

    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isOpen]);

  const handleTogglePanel = useCallback(async () => {
    if (isOpen) {
      setIsOpen(false);
      return;
    }

    setIsOpen(true);
    await loadNotifications();
  }, [isOpen, loadNotifications]);

  const handleNotificationClick = (event, notification) => {
    event.preventDefault();
    setIsOpen(false);
    router.push(notification.href);
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={handleTogglePanel}
        className="relative rounded-full bg-slate-800 p-3 text-white transition hover:bg-slate-700"
        aria-label="Toggle student notifications"
      >
        <FaBell />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-14 z-50 w-[360px] rounded-2xl border border-slate-700 bg-slate-900/95 p-4 shadow-2xl shadow-black/50 backdrop-blur">
          <div className="mb-4">
            <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-slate-200">
              Student Notices
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              School updates and event notices for your student dashboard
            </p>
          </div>

          {loading ? (
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 text-sm text-slate-400">
              Loading notices...
            </div>
          ) : notifications.length === 0 ? (
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 text-sm text-slate-400">
              No notices yet.
            </div>
          ) : (
            <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
              {notifications.map((notification) => (
                <a
                  key={`${notification.noticeType}-${notification.id}`}
                  href={notification.href}
                  onClick={(event) =>
                    handleNotificationClick(event, notification)
                  }
                  className="block rounded-xl border border-slate-800 bg-slate-950/60 p-3 transition hover:border-slate-700 hover:bg-slate-900"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${
                        notification.noticeType === "EVENT"
                          ? "bg-sky-500/15 text-sky-200"
                          : "bg-emerald-500/15 text-emerald-200"
                      }`}
                    >
                      {notification.noticeType === "EVENT" ? "Event" : "School"}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-white">
                    {notification.title}
                  </p>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-300">
                    {notification.message}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <span>{formatDate(notification.publishedAt)}</span>
                    {notification.event && <span>{notification.event.title}</span>}
                  </div>
                </a>
              ))}

              <a
                href="/student/notices"
                onClick={(event) => {
                  event.preventDefault();
                  setIsOpen(false);
                  router.push("/student/notices");
                }}
                className="block rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-center text-sm font-semibold text-slate-200 transition hover:border-slate-700 hover:bg-slate-900"
              >
                View all student notices
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
