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
import AlertBanner from "@/components/ui/AlertBanner";
import WorkIndicatorBadge from "@/components/work-indicators/WorkIndicatorBadge";
import useWorkIndicators from "@/lib/useWorkIndicators";

function formatDate(value) {
  if (!value) return "No date set";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function CommandCard({
  href,
  icon: Icon,
  count,
  label,
  title,
  description,
  actionLabel,
  indicator,
  tone = "blue",
}) {
  const tones = {
    blue: {
      card: "border-[#bfd7f7] bg-[#eaf2ff]",
      icon: "bg-white text-[#0a2f66] ring-[#bfd7f7]",
      pill: "border-[#bfd7f7] bg-white text-[#0a2f66]",
    },
    emerald: {
      card: "border-emerald-200 bg-emerald-50",
      icon: "bg-white text-emerald-800 ring-emerald-200",
      pill: "border-emerald-200 bg-white text-emerald-800",
    },
    amber: {
      card: "border-[#bfd7f7] bg-[#eaf2ff]",
      icon: "bg-white text-[#0a2f66] ring-[#bfd7f7]",
      pill: "border-[#bfd7f7] bg-white text-[#0a2f66]",
    },
    violet: {
      card: "border-indigo-200 bg-indigo-50",
      icon: "bg-white text-indigo-800 ring-indigo-200",
      pill: "border-indigo-200 bg-white text-indigo-800",
    },
    cyan: {
      card: "border-cyan-200 bg-cyan-50",
      icon: "bg-white text-cyan-800 ring-cyan-200",
      pill: "border-cyan-200 bg-white text-cyan-800",
    },
    rose: {
      card: "border-rose-200 bg-rose-50",
      icon: "bg-white text-rose-800 ring-rose-200",
      pill: "border-rose-200 bg-white text-rose-800",
    },
  };
  const toneClasses = tones[tone] || tones.blue;

  return (
    <Link
      href={href}
      className={`group rounded-2xl border p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#2f7fdb]/45 ${toneClasses.card}`}
    >
      <div className="flex items-start justify-between gap-4">
        <span className={`flex h-11 w-11 items-center justify-center rounded-xl ring-1 ${toneClasses.icon}`}>
          <Icon className="text-xl" />
        </span>
        <span className="flex flex-col items-end gap-2">
          <WorkIndicatorBadge
            count={indicator?.count}
            tone={indicator?.tone}
          />
          <span className={`rounded-full border px-3 py-1 text-xs font-black uppercase tracking-wide ${toneClasses.pill}`}>
            {count} {label}
          </span>
        </span>
      </div>
      <h3 className="mt-5 line-clamp-2 text-lg font-black text-slate-950">
        {title}
      </h3>
      <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">
        {description}
      </p>
      <p className="mt-4 text-xs font-black uppercase tracking-wide text-[#0a2f66] transition group-hover:text-[#123f82]">
        {actionLabel}
      </p>
    </Link>
  );
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
          <div key={item} className="h-48 animate-pulse rounded-2xl border border-[#d7cdbb] bg-white" />
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

      <div className="rounded-[26px] border border-[#d7cdbb] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#0a2f66]">
              Today&apos;s command center
            </p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">
              What needs platform attention?
            </h2>
          </div>
          <p className="max-w-xl text-sm leading-6 text-slate-600">
            A quick operational view for approvals, flagship events, notices,
            partners, and student challenge publishing.
          </p>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <CommandCard
            href="/admin/dashboard?tab=approvals"
            icon={FaSchool}
            count={pendingSchools.length}
            label="pending"
            title={
              pendingSchools[0]?.schoolName || "No school approvals waiting"
            }
            description="Review new school registrations before they can use the platform."
            actionLabel="Review approvals"
            indicator={getIndicator("admin.approvals")}
            tone="amber"
          />

          <CommandCard
            href="/admin/dashboard?tab=events"
            icon={FaCalendarAlt}
            count={activeEvents.length}
            label="active"
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

          <CommandCard
            href="/admin/dashboard?tab=notices"
            icon={FaBell}
            count={totals.notices}
            label="notices"
            title={latestNotice?.title || "No platform notices yet"}
            description={
              latestNotice?.content ||
              "Publish platform-wide updates for school dashboards."
            }
            actionLabel="Open notices"
            tone="emerald"
          />

          <CommandCard
            href="/admin/dashboard?tab=challenges"
            icon={FaFeatherAlt}
            count={totals.challengeSubmissions}
            label="to review"
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

          <CommandCard
            href="/admin/dashboard?tab=challenges"
            icon={FaCheckCircle}
            count={publishedChallenges.length}
            label="live"
            title="Student challenge program"
            description="Published challenges are visible to students and can produce Pratyo Pulse responses."
            actionLabel="Manage challenges"
            tone="rose"
          />

          <CommandCard
            href="/admin/support"
            icon={FaHeadset}
            count={getIndicator("admin.support").count}
            label="pending"
            title="Support queue"
            description="Review school support tickets that still need platform action."
            actionLabel="Open support"
            indicator={getIndicator("admin.support")}
            tone="amber"
          />

          <CommandCard
            href="/admin/dashboard?tab=spotlight"
            icon={FaBullseye}
            count={getIndicator("admin.spotlight").count}
            label="pending"
            title="School spotlight"
            description="Review school spotlight requests and promotion work waiting on platform attention."
            actionLabel="Open spotlight"
            indicator={getIndicator("admin.spotlight")}
            tone="rose"
          />

          <CommandCard
            href="/admin/dashboard?tab=partners"
            icon={FaHandshake}
            count={partners.length}
            label="partners"
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
