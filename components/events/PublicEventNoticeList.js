"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useNotification } from "@/components/NotificationSystem";
import useRealtimeChannel from "@/lib/useRealtimeChannel";

function formatPublishedDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleDateString();
}

export default function PublicEventNoticeList({
  eventId,
  initialNotices = [],
}) {
  const { info } = useNotification();
  const toastedNoticeIdsRef = useRef(new Set());
  const [notices, setNotices] = useState(initialNotices);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadNotices = useCallback(
    async ({ silent = false, announce = false } = {}) => {
      try {
        if (!silent) {
          setLoading(true);
        }
        setError("");

        const res = await fetch(`/api/events/${eventId}/notices`, {
          cache: "no-store",
        });
        const payload = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(payload.message || "Failed to load event notices");
        }

        const nextNotices = Array.isArray(payload.notices) ? payload.notices : [];
        const visibleNotices = nextNotices.filter(
          (notice) =>
            notice.status === "PUBLISHED" &&
            notice.visibility === "PUBLIC" &&
            !notice.isDeleted &&
            !notice.round
        );
        if (announce) {
          const previousIds = new Set(notices.map((notice) => String(notice._id)));
          const newItems = visibleNotices.filter(
            (notice) =>
              !previousIds.has(String(notice._id)) &&
              !toastedNoticeIdsRef.current.has(String(notice._id))
          );
          if (newItems.length > 0) {
            info(`New event notice: ${newItems[0].title}`, 5000);
            toastedNoticeIdsRef.current.add(String(newItems[0]._id));
          }
        }
        setNotices(visibleNotices);
      } catch (loadError) {
        setError(loadError.message || "Failed to load event notices");
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    [eventId, info, notices]
  );

  useEffect(() => {
    setNotices(initialNotices);
  }, [initialNotices]);

  useRealtimeChannel(
    `event-${eventId}-notices`,
    useCallback(() => {
      void loadNotices({ silent: true, announce: true });
    }, [loadNotices])
  );

  if (notices.length === 0 && !loading && !error) {
    return null;
  }

  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-8 mb-10">
      <div className="mb-5">
        <h2 className="text-2xl font-bold">Event Notices</h2>
        <p className="mt-2 text-sm text-slate-400">
          Public updates tied directly to this event.
        </p>
      </div>

      {loading && notices.length === 0 ? (
        <p className="text-sm text-slate-400">Loading notices...</p>
      ) : error ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          {error}
        </div>
      ) : (
        <div className="space-y-4">
          {notices.map((notice) => (
            <article
              key={String(notice._id)}
              className="rounded-2xl border border-slate-800 bg-slate-950/50 p-5"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-300">
                  {String(notice.type || "GENERAL").replaceAll("_", " ")}
                </span>
                {notice.publishedAt && (
                  <span className="text-xs text-slate-500">
                    {formatPublishedDate(notice.publishedAt)}
                  </span>
                )}
              </div>
              <h3 className="mt-3 text-xl font-bold text-white">
                {notice.title}
              </h3>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-300">
                {notice.message}
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
