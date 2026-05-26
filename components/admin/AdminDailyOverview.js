"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  FaBell,
  FaCalendarAlt,
  FaCheckCircle,
  FaFeatherAlt,
  FaBullseye,
  FaHeadset,
  FaHandshake,
  FaSchool,
} from "react-icons/fa";
import DashboardFocusCard from "@/components/dashboard/DashboardFocusCard";
import AlertBanner from "@/components/ui/AlertBanner";
import useWorkIndicators from "@/lib/useWorkIndicators";

function formatDate(value) {
  if (!value) return "No date set";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function AdminDailyOverview({
  pendingSchools = [],
  activeEvents = [],
  partners = [],
  proposals = [],
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notices, setNotices] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [challengeSubmissions, setChallengeSubmissions] = useState([]);
  const [totals, setTotals] = useState({
    notices: 0,
    challengeSubmissions: 0,
  });
  const { getIndicator } = useWorkIndicators();

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        setLoading(true);
        setError("");

        const [noticesRes, challengesRes, submissionsRes] = await Promise.all([
          fetch("/api/notices?scope=PLATFORM&limit=5", { cache: "no-store" }),
          fetch("/api/admin/challenges", { cache: "no-store" }),
          fetch("/api/admin/challenges/submissions?status=SUBMITTED&limit=5", {
            cache: "no-store",
          }),
        ]);

        const [noticesPayload, challengesPayload, submissionsPayload] =
          await Promise.all([
            noticesRes.json().catch(() => ({})),
            challengesRes.json().catch(() => ({})),
            submissionsRes.json().catch(() => ({})),
          ]);

        if (!active) return;

        setNotices(
          noticesRes.ok && Array.isArray(noticesPayload.notices)
            ? noticesPayload.notices
            : []
        );
        setChallenges(
          challengesRes.ok && Array.isArray(challengesPayload.challenges)
            ? challengesPayload.challenges
            : []
        );
        setChallengeSubmissions(
          submissionsRes.ok && Array.isArray(submissionsPayload.submissions)
            ? submissionsPayload.submissions
            : []
        );
        setTotals({
          notices:
            noticesPayload.pagination?.totalItems ??
            noticesPayload.notices?.length ??
            0,
          challengeSubmissions:
            submissionsPayload.pagination?.totalItems ??
            submissionsPayload.submissions?.length ??
            0,
        });

        const failedSources = [
          !noticesRes.ok && "platform notices",
          !challengesRes.ok && "student challenges",
          !submissionsRes.ok && "challenge submissions",
        ].filter(Boolean);

        if (failedSources.length > 0) {
          setError(
            `Some command-center data could not load: ${failedSources.join(", ")}.`
          );
        }
      } catch (loadError) {
        if (active) {
          setError(loadError.message || "Failed to load command center");
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
      [...activeEvents].sort(
        (a, b) => new Date(a.date || 0) - new Date(b.date || 0)
      )[0] || null,
    [activeEvents]
  );
  const publishedChallenges = challenges.filter(
    (challenge) => challenge.status === "PUBLISHED"
  );
  const latestNotice = notices[0] || null;
  const latestSubmission = challengeSubmissions[0] || null;

  if (loading) {
    return (
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        {[0, 1, 2, 3, 4, 5].map((item) => (
          <div key={item} className="h-44 animate-pulse rounded-lg border border-[#d7cdbb] bg-white" />
        ))}
      </section>
    );
  }

  return (
    <section className="mb-8 space-y-4">
      {error && (
        <AlertBanner
          type="info"
          title="Command center partially loaded"
          message={error}
        />
      )}

      <div className="rounded-xl border border-[#d7cdbb] bg-[#f8fbff]/90 p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-normal text-[#52657d]">
              Today&apos;s command center
            </p>
            <h2 className="mt-1 text-xl font-bold text-[#17120a] sm:text-2xl">
              What needs platform attention?
            </h2>
          </div>
          <p className="max-w-xl text-sm leading-6 text-[#52657d]">
            A quick operational view for approvals, flagship events, notices,
            partners, and student challenge publishing.
          </p>
        </div>

        <div className="mt-5 grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          <DashboardFocusCard
            href="/admin/dashboard?tab=approvals"
            icon={FaSchool}
            badge={`${pendingSchools.length} pending`}
            title={
              pendingSchools[0]?.schoolName || "No school approvals waiting"
            }
            description="Review new school registrations before they can use the platform."
            actionLabel="Review approvals"
            indicator={getIndicator("admin.approvals")}
            tone="amber"
          />

          <DashboardFocusCard
            href="/admin/dashboard?tab=events"
            icon={FaCalendarAlt}
            badge={`${activeEvents.length} active`}
            title={nextEvent?.title || "No active platform events"}
            description={
              nextEvent
                ? `Next event date: ${formatDate(nextEvent.date)}.`
                : "Create a platform event when you are ready to invite schools."
            }
            actionLabel="Manage events"
            indicator={getIndicator("admin.events")}
            tone="blue"
          />

          <DashboardFocusCard
            href="/admin/dashboard?tab=notices"
            icon={FaBell}
            badge={`${totals.notices} notices`}
            title={latestNotice?.title || "No platform notices yet"}
            description={
              latestNotice?.content ||
              "Publish platform-wide updates for school dashboards."
            }
            actionLabel="Open notices"
            tone="emerald"
          />

          <DashboardFocusCard
            href="/admin/dashboard?tab=challenges"
            icon={FaFeatherAlt}
            badge={`${totals.challengeSubmissions} to review`}
            title={latestSubmission?.title || "No challenge submissions waiting"}
            description={
              latestSubmission?.student?.name
                ? `Submission from ${latestSubmission.student.name}.`
                : "Review student responses and select the best for Pratyo Pulse."
            }
            actionLabel="Review challenges"
            indicator={getIndicator("admin.challenges")}
            tone="violet"
          />

          <DashboardFocusCard
            href="/admin/dashboard?tab=challenges"
            icon={FaCheckCircle}
            badge={`${publishedChallenges.length} live`}
            title="Student challenge program"
            description="Published challenges are visible to students and can produce Pratyo Pulse responses."
            actionLabel="Manage challenges"
            tone="rose"
          />

          <DashboardFocusCard
            href="/admin/support"
            icon={FaHeadset}
            badge={`${getIndicator("admin.support").count} pending`}
            title="Support queue"
            description="Review school support tickets that still need platform action."
            actionLabel="Open support"
            indicator={getIndicator("admin.support")}
            tone="amber"
          />

          <DashboardFocusCard
            href="/admin/dashboard?tab=spotlight"
            icon={FaBullseye}
            badge={`${getIndicator("admin.spotlight").count} pending`}
            title="School spotlight"
            description="Review school spotlight requests and promotion work waiting on platform attention."
            actionLabel="Open spotlight"
            indicator={getIndicator("admin.spotlight")}
            tone="rose"
          />

          <DashboardFocusCard
            href="/admin/dashboard?tab=partners"
            icon={FaHandshake}
            badge={`${partners.length} partners`}
            title={
              proposals.length > 0
                ? `${proposals.length} proposal links ready`
                : "Partner network"
            }
            description="Manage event partners, approved proposals, and partner spotlight visibility."
            actionLabel="Open partners"
            tone="cyan"
          />
        </div>

        <div className="mt-5 flex flex-wrap gap-3 text-sm">
          <Link
            href="/admin/dashboard?tab=events"
            className="inline-flex items-center gap-2 rounded-lg bg-[#0a2f66] px-3 py-2 font-semibold text-white transition hover:bg-[#123f82]"
          >
            Create or manage platform event
          </Link>
          <Link
            href="/admin/dashboard?tab=notices"
            className="inline-flex items-center gap-2 rounded-lg border border-[#d7cdbb] bg-white px-3 py-2 font-semibold text-[#0a2f66] transition hover:bg-[#eaf2ff]"
          >
            Publish platform notice
          </Link>
        </div>
      </div>
    </section>
  );
}
