"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  FaBell,
  FaCalendarAlt,
  FaCheckCircle,
  FaFeatherAlt,
  FaHandshake,
  FaSchool,
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

function CommandCard({
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
    cyan: "border-cyan-500/20 bg-cyan-500/10 text-cyan-200",
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

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        setLoading(true);
        setError("");

        const [noticesRes, challengesRes, submissionsRes] = await Promise.all([
          fetch("/api/notices?scope=PLATFORM&limit=5", { cache: "no-store" }),
          fetch("/api/admin/challenges", { cache: "no-store" }),
          fetch("/api/admin/challenges/submissions?status=SUBMITTED", {
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
          <div
            key={item}
            className="h-48 animate-pulse rounded-2xl border border-slate-800 bg-slate-900/70"
          />
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

      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
              Today&apos;s command center
            </p>
            <h2 className="mt-2 text-2xl font-bold text-white">
              What needs platform attention?
            </h2>
          </div>
          <p className="max-w-xl text-sm leading-6 text-slate-400">
            A quick operational view for approvals, flagship events, notices,
            partners, and student challenge publishing.
          </p>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
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
            tone="blue"
          />

          <CommandCard
            href="/admin/dashboard?tab=notices"
            icon={FaBell}
            count={notices.length}
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
            count={challengeSubmissions.length}
            label="to review"
            title={latestSubmission?.title || "No challenge submissions waiting"}
            description={
              latestSubmission?.student?.name
                ? `Submission from ${latestSubmission.student.name}.`
                : "Review student responses and select the best for public showcase."
            }
            actionLabel="Review challenges"
            tone="violet"
          />

          <CommandCard
            href="/admin/dashboard?tab=challenges"
            icon={FaCheckCircle}
            count={publishedChallenges.length}
            label="live"
            title="Student challenge program"
            description="Published challenges are visible to students and can produce public showcase responses."
            actionLabel="Manage challenges"
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
            description="Manage event partners and approved proposals for platform promotion."
            actionLabel="Open partners"
            tone="cyan"
          />
        </div>

        <div className="mt-5 flex flex-wrap gap-3 text-sm">
          <Link
            href="/admin/dashboard?tab=events"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 font-semibold text-white transition hover:bg-blue-500"
          >
            Create or manage platform event
          </Link>
          <Link
            href="/admin/dashboard?tab=notices"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 font-semibold text-slate-200 transition hover:bg-slate-800"
          >
            Publish platform notice
          </Link>
        </div>
      </div>
    </section>
  );
}
