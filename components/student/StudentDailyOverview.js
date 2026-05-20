"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  FaBell,
  FaBookOpen,
  FaCalendarAlt,
  FaFeatherAlt,
  FaPenNib,
} from "react-icons/fa";
import AlertBanner from "@/components/ui/AlertBanner";

function formatDate(value) {
  if (!value) return "No date set";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function DailyActionCard({
  href,
  icon: Icon,
  label,
  title,
  description,
  meta,
  tone = "blue",
}) {
  const tones = {
    blue: "border-blue-500/20 bg-blue-500/10 text-blue-200",
    amber: "border-amber-500/20 bg-amber-500/10 text-amber-200",
    emerald: "border-emerald-500/20 bg-emerald-500/10 text-emerald-200",
    violet: "border-violet-500/20 bg-violet-500/10 text-violet-200",
  };

  return (
    <Link
      href={href}
      className={`group rounded-2xl border p-5 transition hover:-translate-y-0.5 hover:bg-slate-900/80 ${
        tones[tone] || tones.blue
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-current/10">
          <Icon className="text-xl" />
        </span>
        <span className="rounded-full border border-current/20 px-3 py-1 text-xs font-bold uppercase tracking-wide">
          {label}
        </span>
      </div>
      <h3 className="mt-5 line-clamp-2 text-lg font-bold text-white">
        {title}
      </h3>
      <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-300">
        {description}
      </p>
      {meta && <p className="mt-4 text-xs font-semibold text-slate-400">{meta}</p>}
    </Link>
  );
}

export default function StudentDailyOverview() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notices, setNotices] = useState([]);
  const [events, setEvents] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [articles, setArticles] = useState([]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        setLoading(true);
        setError("");

        const [noticeRes, eventRes, challengeRes, magazineRes] =
          await Promise.all([
            fetch("/api/student/notifications?limit=5", { cache: "no-store" }),
            fetch("/api/student/eligible-events", { cache: "no-store" }),
            fetch("/api/student/challenges", { cache: "no-store" }),
            fetch("/api/student/magazine", { cache: "no-store" }),
          ]);

        const [noticePayload, eventPayload, challengePayload, magazinePayload] =
          await Promise.all([
            noticeRes.json().catch(() => ({})),
            eventRes.json().catch(() => ({})),
            challengeRes.json().catch(() => ({})),
            magazineRes.json().catch(() => ({})),
          ]);

        if (!active) return;

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
        setChallenges(
          challengeRes.ok && Array.isArray(challengePayload.challenges)
            ? challengePayload.challenges
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
          !challengeRes.ok && "challenges",
          !magazineRes.ok && "magazine",
        ].filter(Boolean);

        if (failedSources.length > 0) {
          setError(`Some updates could not load: ${failedSources.join(", ")}.`);
        }
      } catch (loadError) {
        if (active) {
          setError(loadError.message || "Failed to load dashboard updates");
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

  const nextEvent = useMemo(
    () =>
      [...events]
        .filter((event) => !event.deadlinePassed)
        .sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0))[0] ||
      events[0] ||
      null,
    [events]
  );

  const openChallenge = challenges.find((challenge) => !challenge.response);
  const latestNotice = notices[0] || null;
  const latestArticle = articles[0] || null;

  if (loading) {
    return (
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <div
            key={item}
            className="h-48 animate-pulse rounded-2xl border border-slate-800 bg-slate-900/70"
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

      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
              Today&apos;s focus
            </p>
            <h2 className="mt-2 text-2xl font-bold text-white">
              What should you check next?
            </h2>
          </div>
          <p className="max-w-xl text-sm leading-6 text-slate-400">
            Notices, events, writing tasks, and magazine updates are gathered
            here so the student dashboard feels like a real starting point.
          </p>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <DailyActionCard
            href="/student/notices"
            icon={FaBell}
            label={`${notices.length} updates`}
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
            tone="amber"
          />

          <DailyActionCard
            href="/student/events"
            icon={FaCalendarAlt}
            label={`${events.length} events`}
            title={nextEvent?.title || "No eligible events yet"}
            description={
              nextEvent?.description ||
              "Events for your grade will appear here after your school opens them."
            }
            meta={nextEvent ? `Event date: ${formatDate(nextEvent.date)}` : "Check later"}
            tone="emerald"
          />

          <DailyActionCard
            href="/student/writing"
            icon={FaPenNib}
            label={`${challenges.length} tasks`}
            title={openChallenge?.title || "No pending writing task"}
            description={
              openChallenge?.prompt ||
              "When the platform publishes a challenge, you can respond from My Writing."
            }
            meta={
              openChallenge
                ? `Deadline: ${formatDate(openChallenge.deadline)}`
                : "You are caught up"
            }
            tone="blue"
          />

          <DailyActionCard
            href="/student/magazine"
            icon={FaBookOpen}
            label={`${articles.length} articles`}
            title={latestArticle?.title || "No magazine articles yet"}
            description={
              latestArticle?.content ||
              "Published school magazine articles will appear after approval."
            }
            meta={
              latestArticle
                ? `By ${latestArticle.authorStudent?.name || "Student"}`
                : "Reading room is quiet"
            }
            tone="violet"
          />
        </div>

        <div className="mt-5 flex flex-wrap gap-3 text-sm">
          <Link
            href="/student/challenges"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 font-semibold text-slate-200 transition hover:bg-slate-800"
          >
            <FaFeatherAlt />
            View public challenge showcase
          </Link>
          <Link
            href="/student/writing"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 font-semibold text-white transition hover:bg-blue-500"
          >
            Start writing
          </Link>
        </div>
      </div>
    </section>
  );
}
