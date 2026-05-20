"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  FaBell,
  FaCalendarCheck,
  FaClipboardCheck,
  FaFeatherAlt,
  FaBullhorn,
  FaTrophy,
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

function WorkCard({
  href,
  icon: Icon,
  count,
  label,
  title,
  description,
  actionLabel,
  tone = "blue",
}) {
  const tones = {
    blue: "border-blue-500/20 bg-blue-500/10 text-blue-200",
    emerald: "border-emerald-500/20 bg-emerald-500/10 text-emerald-200",
    amber: "border-amber-500/20 bg-amber-500/10 text-amber-200",
    violet: "border-violet-500/20 bg-violet-500/10 text-violet-200",
    rose: "border-rose-500/20 bg-rose-500/10 text-rose-200",
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
          {count} {label}
        </span>
      </div>
      <h3 className="mt-5 line-clamp-2 text-lg font-bold text-white">
        {title}
      </h3>
      <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-300">
        {description}
      </p>
      <p className="mt-4 text-xs font-bold uppercase tracking-wide text-slate-400 transition group-hover:text-white">
        {actionLabel}
      </p>
    </Link>
  );
}

export default function SchoolDailyOverview() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submissions, setSubmissions] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [events, setEvents] = useState([]);
  const [challengeWinners, setChallengeWinners] = useState([]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        setLoading(true);
        setError("");

        const [
          submissionsRes,
          invitationsRes,
          notificationsRes,
          eventsRes,
          challengeWinnersRes,
        ] = await Promise.all([
          fetch("/api/school/magazine-submissions?status=SUBMITTED", {
            cache: "no-store",
          }),
          fetch("/api/school/event-invitations?status=PENDING", {
            cache: "no-store",
          }),
          fetch("/api/school/notifications?limit=5", { cache: "no-store" }),
          fetch("/api/events", { cache: "no-store" }),
          fetch("/api/school/challenge-winners", { cache: "no-store" }),
        ]);

        const [
          submissionsPayload,
          invitationsPayload,
          notificationsPayload,
          eventsPayload,
          challengeWinnersPayload,
        ] = await Promise.all([
          submissionsRes.json().catch(() => ({})),
          invitationsRes.json().catch(() => ({})),
          notificationsRes.json().catch(() => ({})),
          eventsRes.json().catch(() => ({})),
          challengeWinnersRes.json().catch(() => ({})),
        ]);

        if (!active) return;

        setSubmissions(
          submissionsRes.ok && Array.isArray(submissionsPayload.submissions)
            ? submissionsPayload.submissions
            : []
        );
        setInvitations(
          invitationsRes.ok && Array.isArray(invitationsPayload.invitations)
            ? invitationsPayload.invitations
            : []
        );
        setNotifications(
          notificationsRes.ok && Array.isArray(notificationsPayload.notifications)
            ? notificationsPayload.notifications
            : []
        );
        setEvents(
          eventsRes.ok && Array.isArray(eventsPayload.events)
            ? eventsPayload.events
            : []
        );
        setChallengeWinners(
          challengeWinnersRes.ok &&
            Array.isArray(challengeWinnersPayload.submissions)
            ? challengeWinnersPayload.submissions
            : []
        );

        const failedSources = [
          !submissionsRes.ok && "magazine submissions",
          !invitationsRes.ok && "event invitations",
          !notificationsRes.ok && "notifications",
          !eventsRes.ok && "events",
          !challengeWinnersRes.ok && "challenge showcase",
        ].filter(Boolean);

        if (failedSources.length > 0) {
          setError(`Some work areas could not load: ${failedSources.join(", ")}.`);
        }
      } catch (loadError) {
        if (active) {
          setError(loadError.message || "Failed to load today's work");
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

  const activeSchoolEvents = useMemo(
    () =>
      events.filter(
        (event) =>
          event.eventScope === "SCHOOL" &&
          String(event.lifecycleStatus || "ACTIVE").toUpperCase() === "ACTIVE"
      ),
    [events]
  );
  const nextSchoolEvent =
    [...activeSchoolEvents].sort(
      (a, b) => new Date(a.date || 0) - new Date(b.date || 0)
    )[0] || null;
  const latestNotice = notifications[0] || null;
  const winnerToAdd = challengeWinners.find(
    (submission) => !submission.addedToSchoolMagazine
  );

  if (loading) {
    return (
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {[0, 1, 2, 3, 4].map((item) => (
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
              Today&apos;s work
            </p>
            <h2 className="mt-2 text-2xl font-bold text-white">
              What needs school attention?
            </h2>
          </div>
          <p className="max-w-xl text-sm leading-6 text-slate-400">
            This section gathers the practical admin jobs: review writing,
            accept platform events, manage school events, read notices, and
            publish selected student work.
          </p>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <WorkCard
            href="/school/dashboard?tab=magazine"
            icon={FaFeatherAlt}
            count={submissions.length}
            label="pending"
            title={
              submissions[0]?.title || "No magazine submissions waiting"
            }
            description={
              submissions[0]?.authorStudent?.name
                ? `Review writing from ${submissions[0].authorStudent.name}.`
                : "Student writing that needs approval will appear here."
            }
            actionLabel="Review magazine"
            tone="violet"
          />

          <WorkCard
            href="/school/dashboard?tab=platform-events"
            icon={FaClipboardCheck}
            count={invitations.length}
            label="invites"
            title={
              invitations[0]?.event?.title || "No platform invitations pending"
            }
            description="Approve platform events before your students can see or join them."
            actionLabel="Check invitations"
            tone="emerald"
          />

          <WorkCard
            href="/school/dashboard?tab=school-events"
            icon={FaCalendarCheck}
            count={activeSchoolEvents.length}
            label="active"
            title={nextSchoolEvent?.title || "No active school events"}
            description={
              nextSchoolEvent
                ? `Next event date: ${formatDate(nextSchoolEvent.date)}.`
                : "Create an event when your school is ready to run an activity."
            }
            actionLabel="Manage events"
            tone="blue"
          />

          <WorkCard
            href="/school/dashboard?tab=notices"
            icon={FaBell}
            count={notifications.length}
            label="updates"
            title={latestNotice?.title || "No received notices yet"}
            description={
              latestNotice?.message ||
              "Platform and event updates relevant to your school will appear here."
            }
            actionLabel="Read notices"
            tone="amber"
          />

          <WorkCard
            href="/school/dashboard?tab=challenge-showcase"
            icon={FaTrophy}
            count={challengeWinners.length}
            label="selected"
            title={winnerToAdd?.title || "No showcase responses to add"}
            description={
              winnerToAdd?.student?.name
                ? `Selected response by ${winnerToAdd.student.name}.`
                : "Platform-selected student responses can be added to your school magazine."
            }
            actionLabel="Open showcase"
            tone="rose"
          />
        </div>

        <div className="mt-5 flex flex-wrap gap-3 text-sm">
          <Link
            href="/school/dashboard?tab=student-notices"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 font-semibold text-white transition hover:bg-blue-500"
          >
            <FaBullhorn />
            Send notice to students
          </Link>
          <Link
            href="/school/dashboard?tab=school-events"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 font-semibold text-slate-200 transition hover:bg-slate-800"
          >
            Create or manage school event
          </Link>
        </div>
      </div>
    </section>
  );
}
