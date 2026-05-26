"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FaBell,
  FaCalendarCheck,
  FaClipboardCheck,
  FaFeatherAlt,
  FaBullhorn,
  FaTrophy,
} from "react-icons/fa";
import DashboardFocusCard from "@/components/dashboard/DashboardFocusCard";
import AlertBanner from "@/components/ui/AlertBanner";
import useRealtimeChannel from "@/lib/useRealtimeChannel";

function formatDate(value) {
  if (!value) return "No date set";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function SchoolDailyOverview() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submissions, setSubmissions] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [events, setEvents] = useState([]);
  const [challengeWinners, setChallengeWinners] = useState([]);
  const [totals, setTotals] = useState({
    submissions: 0,
    invitations: 0,
    notifications: 0,
    challengeWinners: 0,
  });

  const load = useCallback(
    async ({ silent = false } = {}) => {
      try {
        if (!silent) {
          setLoading(true);
        }
        setError("");

        const [
          submissionsRes,
          invitationsRes,
          notificationsRes,
          eventsRes,
          challengeWinnersRes,
        ] = await Promise.all([
          fetch("/api/school/magazine-submissions?status=SUBMITTED&limit=5", {
            cache: "no-store",
          }),
          fetch("/api/school/event-invitations?status=PENDING&limit=5", {
            cache: "no-store",
          }),
          fetch("/api/school/notifications?limit=5", { cache: "no-store" }),
          fetch("/api/events", { cache: "no-store" }),
          fetch("/api/school/challenge-winners?limit=5", { cache: "no-store" }),
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
        setTotals({
          submissions:
            submissionsPayload.pagination?.totalItems ??
            submissionsPayload.submissions?.length ??
            0,
          invitations:
            invitationsPayload.pagination?.totalItems ??
            invitationsPayload.invitations?.length ??
            0,
          notifications:
            notificationsPayload.pagination?.totalItems ??
            notificationsPayload.notifications?.length ??
            0,
          challengeWinners:
            challengeWinnersPayload.pagination?.totalItems ??
            challengeWinnersPayload.submissions?.length ??
            0,
        });

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
        setError(loadError.message || "Failed to load today's work");
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    void load();
  }, [load]);

  useRealtimeChannel(
    ["school-notifications", "events", "work-indicators"],
    useCallback(() => {
      void load({ silent: true });
    }, [load])
  );

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
              Today&apos;s work
            </p>
            <h2 className="mt-1 text-xl font-bold text-[#17120a] sm:text-2xl">
              What needs school attention?
            </h2>
          </div>
          <p className="max-w-xl text-sm leading-6 text-[#52657d]">
            This section gathers the practical admin jobs: review writing,
            accept platform events, manage school events, read notices, and
            publish selected student work.
          </p>
        </div>

        <div className="mt-5 grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
          <DashboardFocusCard
            href="/school/dashboard?tab=magazine"
            icon={FaFeatherAlt}
            badge={`${totals.submissions} pending`}
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

          <DashboardFocusCard
            href="/school/dashboard?tab=platform-events"
            icon={FaClipboardCheck}
            badge={`${totals.invitations} invites`}
            title={
              invitations[0]?.event?.title || "No platform invitations pending"
            }
            description="Approve platform events before your students can see or join them."
            actionLabel="Check invitations"
            tone="emerald"
          />

          <DashboardFocusCard
            href="/school/dashboard?tab=school-events"
            icon={FaCalendarCheck}
            badge={`${activeSchoolEvents.length} active`}
            title={nextSchoolEvent?.title || "No active school events"}
            description={
              nextSchoolEvent
                ? `Next event date: ${formatDate(nextSchoolEvent.date)}.`
                : "Create an event when your school is ready to run an activity."
            }
            actionLabel="Manage events"
            tone="blue"
          />

          <DashboardFocusCard
            href="/school/dashboard?tab=notices"
            icon={FaBell}
            badge={`${totals.notifications} updates`}
            title={latestNotice?.title || "No received notices yet"}
            description={
              latestNotice?.message ||
              "Platform and event updates relevant to your school will appear here."
            }
            actionLabel="Read notices"
            tone="rose"
          />

          <DashboardFocusCard
            href="/school/dashboard?tab=challenge-showcase"
            icon={FaTrophy}
            badge={`${totals.challengeWinners} selected`}
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
            className="inline-flex items-center gap-2 rounded-lg bg-[#0a2f66] px-3 py-2 font-semibold text-white transition hover:bg-[#123f82]"
          >
            <FaBullhorn />
            Send notice to students
          </Link>
          <Link
            href="/school/dashboard?tab=school-events"
            className="inline-flex items-center gap-2 rounded-lg border border-[#d7cdbb] bg-white px-3 py-2 font-semibold text-[#0a2f66] transition hover:bg-[#eaf2ff]"
          >
            Create or manage school event
          </Link>
        </div>
      </div>
    </section>
  );
}
