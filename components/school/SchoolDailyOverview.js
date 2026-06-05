"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FaBell,
  FaCalendarCheck,
  FaClipboardCheck,
  FaFeatherAlt,
  FaBullhorn,
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
  const [totals, setTotals] = useState({
    submissions: 0,
    invitations: 0,
    notifications: 0,
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
        ] = await Promise.all([
          fetch("/api/school/magazine-submissions?status=POSTED&limit=5", {
            cache: "no-store",
          }),
          fetch("/api/school/event-invitations?status=PENDING&limit=5", {
            cache: "no-store",
          }),
          fetch("/api/school/notifications?limit=5", { cache: "no-store" }),
          fetch("/api/events", { cache: "no-store" }),
        ]);

        const [
          submissionsPayload,
          invitationsPayload,
          notificationsPayload,
          eventsPayload,
        ] = await Promise.all([
          submissionsRes.json().catch(() => ({})),
          invitationsRes.json().catch(() => ({})),
          notificationsRes.json().catch(() => ({})),
          eventsRes.json().catch(() => ({})),
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
        });

        const failedSources = [
          !submissionsRes.ok && "school wall posts",
          !invitationsRes.ok && "event invitations",
          !notificationsRes.ok && "notifications",
          !eventsRes.ok && "events",
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
  if (loading) {
    return (
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <div
            key={item}
            className="h-40 animate-pulse rounded-2xl border border-[#e6eaf7] bg-white"
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

      <div className="rounded-2xl border border-[#e6eaf7] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-normal text-[#52657d]">
              Today&apos;s work
            </p>
            <h2 className="mt-1 text-xl font-bold text-[#17120a] sm:text-2xl">
              What needs school attention?
            </h2>
          </div>
          <Link
            href="/school/dashboard?tab=notices"
            className="text-sm font-black text-purple-700"
          >
            View all tasks
          </Link>
        </div>

        <div className="mt-5 grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <DashboardFocusCard
            href="/school/dashboard?tab=magazine"
            icon={FaFeatherAlt}
            badge={`${totals.submissions} posts`}
            title={
              submissions[0]?.title || "No school wall posts yet"
            }
            description={
              submissions[0]?.authorStudent?.name
                ? `Read writing from ${submissions[0].authorStudent.name}.`
                : "Student writing appears here after students post it to school."
            }
            actionLabel="Open wall"
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

        </div>

        <div className="mt-5 flex flex-wrap gap-3 text-sm">
          <Link
            href="/school/dashboard?tab=student-notices"
            className="inline-flex items-center gap-2 rounded-xl bg-[#0a2f66] px-4 py-2.5 font-black text-white transition hover:bg-[#123f82]"
          >
            <FaBullhorn />
            Send notice to students
          </Link>
          <Link
            href="/school/dashboard?tab=school-events"
            className="inline-flex items-center gap-2 rounded-xl border border-[#e6eaf7] bg-white px-4 py-2.5 font-black text-[#0a2f66] transition hover:bg-[#eaf2ff]"
          >
            Create or manage school event
          </Link>
        </div>
      </div>
    </section>
  );
}
