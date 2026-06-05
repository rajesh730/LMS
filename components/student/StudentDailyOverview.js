"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FaBell,
  FaBookOpen,
  FaCalendarAlt,
  FaPenNib,
} from "react-icons/fa";
import DashboardFocusCard from "@/components/dashboard/DashboardFocusCard";
import AlertBanner from "@/components/ui/AlertBanner";
import useWorkIndicators from "@/lib/useWorkIndicators";
import useRealtimeChannel from "@/lib/useRealtimeChannel";

function formatDate(value) {
  if (!value) return "No date set";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function StudentDailyOverview() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notices, setNotices] = useState([]);
  const [events, setEvents] = useState([]);
  const [articles, setArticles] = useState([]);
  const { getIndicator } = useWorkIndicators();

  const load = useCallback(
    async ({ silent = false } = {}) => {
      try {
        if (!silent) {
          setLoading(true);
        }
        setError("");

        const [noticeRes, eventRes, magazineRes] =
          await Promise.all([
            fetch("/api/student/notifications?limit=5", { cache: "no-store" }),
            fetch("/api/student/eligible-events", { cache: "no-store" }),
            fetch("/api/student/magazine", { cache: "no-store" }),
          ]);

        const [noticePayload, eventPayload, magazinePayload] =
          await Promise.all([
            noticeRes.json().catch(() => ({})),
            eventRes.json().catch(() => ({})),
            magazineRes.json().catch(() => ({})),
          ]);

        setNotices(
          noticeRes.ok && Array.isArray(noticePayload.notifications)
            ? noticePayload.notifications
            : []
        );
        setEvents(
          eventRes.ok && Array.isArray(eventPayload.data)
            ? eventPayload.data
            : []
        );
        setArticles(
          magazineRes.ok && Array.isArray(magazinePayload.articles)
            ? magazinePayload.articles
            : []
        );

        const failedSources = [
          !noticeRes.ok && "notices",
          !eventRes.ok && "events",
          !magazineRes.ok && "magazine",
        ].filter(Boolean);

        if (failedSources.length > 0) {
          setError(`Some updates could not load: ${failedSources.join(", ")}.`);
        }
      } catch (loadError) {
        setError(loadError.message || "Failed to load dashboard updates");
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    let active = true;

    void load().finally(() => {
      if (!active) return;
    });

    return () => {
      active = false;
    };
  }, [load]);

  useRealtimeChannel(
    ["student-notifications", "events", "work-indicators"],
    useCallback(() => {
      void load({ silent: true });
    }, [load])
  );

  const nextEvent = useMemo(
    () =>
      [...events]
        .filter((event) => !event.deadlinePassed)
        .sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0))[0] ||
      events[0] ||
      null,
    [events]
  );

  const latestNotice = notices[0] || null;
  const latestArticle = articles[0] || null;

  if (loading) {
    return (
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <div
            key={item}
            className="h-44 animate-pulse rounded-lg border border-[#d7cdbb] bg-white"
          />
        ))}
      </section>
    );
  }

  return (
    <section className="space-y-4">
      {error && (
        <AlertBanner
          type="info"
          title="Dashboard partially loaded"
          message={error}
        />
      )}

      <div className="rounded-xl border border-[#d7cdbb] bg-[#f8fbff]/90 p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-normal text-[#52657d]">
              Today&apos;s focus
            </p>
            <h2 className="mt-1 text-xl font-bold text-[#17120a] sm:text-2xl">
              What should you check next?
            </h2>
          </div>
          <p className="max-w-xl text-sm leading-6 text-[#52657d]">
            Notices, events, writing tasks, and magazine updates are gathered
            here so the student dashboard stays current.
          </p>
        </div>

        <div className="mt-5 grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <DashboardFocusCard
            href="/student/notices"
            icon={FaBell}
            badge={`${notices.length} updates`}
            title={latestNotice?.title || "No new notices yet"}
            description={
              latestNotice?.message ||
              "School and event notices will appear here when published."
            }
            meta={
              latestNotice
                ? `${latestNotice.noticeType === "EVENT" ? "Event" : "School"} notice`
                : "All clear"
            }
            indicator={getIndicator("student.notices")}
            tone="rose"
          />

          <DashboardFocusCard
            href="/student/events"
            icon={FaCalendarAlt}
            badge={`${events.length} events`}
            title={nextEvent?.title || "No events yet"}
            description={
              nextEvent?.description ||
              "Events from your school will appear here as soon as they are published."
            }
            meta={nextEvent ? `Event date: ${formatDate(nextEvent.date)}` : "Check later"}
            indicator={getIndicator("student.events")}
            tone="emerald"
          />

          <DashboardFocusCard
            href="/student/writing"
            icon={FaPenNib}
            badge="Writing"
            title="My Writing"
            description="Write blog articles, opinions, research, creative writing, and poems for your school wall."
            meta="Draft and submit"
            indicator={getIndicator("student.writing")}
            tone="blue"
          />

          <DashboardFocusCard
            href="/student/magazine"
            icon={FaBookOpen}
            badge={`${articles.length} articles`}
            title={latestArticle?.title || "No magazine articles yet"}
            description={
              latestArticle?.content ||
              "Weekly magazine articles will appear after your school selects student writing."
            }
            meta={
              latestArticle
                ? `By ${latestArticle.authorStudent?.name || "Student"}`
                : "Reading room is quiet"
            }
            indicator={getIndicator("student.magazine")}
            tone="violet"
          />

        </div>

        <div className="mt-5 flex flex-wrap gap-3 text-sm">
          <Link
            href="/student/writing"
            className="inline-flex items-center gap-2 rounded-lg bg-[#0a2f66] px-3 py-2 font-semibold text-white transition hover:bg-[#123f82]"
          >
            Start writing
          </Link>
        </div>
      </div>
    </section>
  );
}
