"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  FaAward,
  FaBookOpen,
  FaCalendarAlt,
  FaCertificate,
  FaCheck,
  FaDownload,
  FaExternalLinkAlt,
  FaGlobeAsia,
  FaHome,
  FaPenNib,
  FaSchool,
  FaShareAlt,
  FaTimes,
  FaTrophy,
  FaUserCircle,
} from "react-icons/fa";
import AlertBanner from "@/components/ui/AlertBanner";
import EmptyState from "@/components/EmptyState";
import LoadingState from "@/components/ui/LoadingState";
import StatTile from "@/components/ui/StatTile";
import { formatPlacement, formatDate } from "@/lib/displayFormat";

const CELEBRATION_WINDOW_DAYS = 30;
const CELEBRATION_DISMISS_KEY = "pravyo:celebrated-certificates";

function formatWritingLabel(value) {
  return String(value || "")
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function isRecentlyIssued(value) {
  if (!value) return false;
  const issued = new Date(value).getTime();
  if (Number.isNaN(issued)) return false;
  const ageDays = (Date.now() - issued) / (1000 * 60 * 60 * 24);
  return ageDays >= 0 && ageDays <= CELEBRATION_WINDOW_DAYS;
}

function CelebrationBanner({ achievement, firstName, onDismiss }) {
  const placement = formatPlacement(achievement.placement);
  const eventTitle = achievement.event?.title || achievement.title || "an event";
  const isWin = ["WINNER", "RUNNER_UP", "THIRD_PLACE"].includes(
    String(achievement.placement || "").toUpperCase()
  );

  return (
    <section className="relative overflow-hidden rounded-2xl border border-[#d6c7ff] bg-gradient-to-br from-[#4326e8] via-[#5b3bf0] to-[#7c4dff] p-5 text-white shadow-[0_18px_50px_rgba(67,38,232,0.28)] sm:p-6">
      <div className="pointer-events-none absolute -right-6 -top-8 text-[120px] opacity-15">
        🎉
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25"
      >
        <FaTimes className="text-xs" />
      </button>

      <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/18 text-2xl">
            {isWin ? "🏆" : "🎓"}
          </span>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-white/80">
              Congratulations{firstName ? `, ${firstName}` : ""}!
            </p>
            <h2 className="mt-1 text-lg font-black leading-tight sm:text-xl">
              You earned a {placement} certificate in {eventTitle}
            </h2>
            <p className="mt-1 text-sm font-semibold text-white/85">
              Your verified certificate is ready to view, download, and share.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Link
            href={achievement.certificateUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-white px-4 text-sm font-black text-[#4326e8] transition hover:bg-[#f4f1ff]"
          >
            <FaCertificate /> View
          </Link>
          <Link
            href={`${achievement.certificateUrl}?download=pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-white/40 px-4 text-sm font-black text-white transition hover:bg-white/10"
          >
            <FaDownload /> Download
          </Link>
        </div>
      </div>
    </section>
  );
}

function PublicProfileCard({ studentId, name }) {
  const [copied, setCopied] = useState(false);
  const href = `/students/${studentId}`;

  const copyLink = async () => {
    try {
      const url = `${window.location.origin}${href}`;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch (_error) {
      /* clipboard unavailable */
    }
  };

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-[#e6eaf7] bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#f4f1ff] text-xl text-[#4326e8]">
          <FaUserCircle />
        </span>
        <div>
          <h2 className="text-base font-black text-[#10142f]">
            Your public profile is live
          </h2>
          <p className="mt-1 text-sm font-semibold text-[#526071]">
            Share a verified portfolio of {name ? `${name}'s` : "your"} achievements,
            certificates, and writing with family and the world.
          </p>
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        <Link
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[#4326e8] px-4 text-sm font-black text-white transition hover:bg-[#3217d3]"
        >
          <FaExternalLinkAlt /> View profile
        </Link>
        <button
          type="button"
          onClick={copyLink}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[#dbe5f4] bg-white px-4 text-sm font-black text-[#0a2f66] transition hover:bg-[#f8fbff]"
        >
          {copied ? <FaCheck className="text-emerald-600" /> : <FaShareAlt />}
          {copied ? "Link copied" : "Share"}
        </button>
      </div>
    </section>
  );
}

function CertificatesAndAchievements({ achievements }) {
  return (
    <section className="rounded-xl border border-[#e6eaf7] bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#f4f1ff] text-[#4326e8]">
          <FaCertificate />
        </span>
        <div>
          <h2 className="text-lg font-black text-[#10142f]">
            My Certificates & Achievements
          </h2>
          <p className="text-sm font-semibold text-[#526071]">
            Verified results and issued certificates from your school.
          </p>
        </div>
      </div>

      {achievements.length === 0 ? (
        <div className="mt-5">
          <EmptyState
            icon={FaTrophy}
            title="No achievements yet"
            description="When your school publishes verified results, they will appear here."
          />
        </div>
      ) : (
        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {achievements.map((certificate) => (
            <article
              key={certificate.id}
              className="flex min-w-0 flex-col gap-3 rounded-xl border border-[#e6eaf7] bg-[#f8f9fd] p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-xl text-[#d98b00] shadow-sm">
                  🎓
                </span>
                <span className="rounded-full bg-[#f4f1ff] px-2.5 py-1 text-[10px] font-black uppercase text-[#4326e8]">
                  {formatPlacement(certificate.placement)}
                </span>
              </div>
              <div className="min-w-0">
                <h3 className="break-words text-sm font-black leading-snug text-[#10142f]">
                  {certificate.event?.title || certificate.title}
                </h3>
                <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-[#526071]">
                  <FaCalendarAlt className="text-[#4326e8]" />
                  {formatDate(certificate.certificateIssuedAt || certificate.awardedAt)}
                </p>
                {certificate.certificateCode ? (
                  <p className="mt-1 break-all text-[11px] font-bold uppercase tracking-wide text-[#8a9ab1]">
                    ID: {certificate.certificateCode}
                  </p>
                ) : (
                  <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-[#8a9ab1]">
                    Certificate not issued yet
                  </p>
                )}
              </div>
              <div className="mt-auto flex flex-wrap gap-2 pt-1">
                {certificate.certificateUrl ? (
                  <>
                    <Link
                      href={certificate.certificateUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#4326e8] px-3 text-xs font-black text-white transition hover:bg-[#3217d3]"
                    >
                      <FaCertificate /> View Certificate
                    </Link>
                    <Link
                      href={`${certificate.certificateUrl}?download=pdf`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-[#dbe5f4] bg-white px-3 text-xs font-black text-[#0a2f66] transition hover:bg-[#f8fbff]"
                    >
                      <FaDownload /> Download PDF
                    </Link>
                  </>
                ) : (
                  <span className="inline-flex min-h-9 w-full items-center justify-center rounded-lg border border-dashed border-[#dbe5f4] bg-white px-3 text-xs font-black text-[#526071]">
                    Certificate pending
                  </span>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function WritingInsightTile({ icon: Icon, label, value, description }) {
  return (
    <div className="min-w-0 rounded-xl border border-[#e6eaf7] bg-[#f8f9fd] p-4">
      <div className="flex min-w-0 items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-[#4326e8] shadow-sm">
          <Icon />
        </span>
        <div className="min-w-0">
          <p className="text-2xl font-black leading-none text-[#10142f]">
            {value || 0}
          </p>
          <h3 className="mt-1 break-words text-sm font-black leading-snug text-[#10142f]">
            {label}
          </h3>
          {description && (
            <p className="mt-1 text-xs font-semibold leading-5 text-[#526071]">
              {description}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function WritingActivityInsights({ summary }) {
  const safeSummary = summary || {};
  const destinations = safeSummary.destinations || {};
  const status = safeSummary.status || {};
  const categories = safeSummary.categories || {};
  const categoryEntries = Object.entries(categories).sort((a, b) => b[1] - a[1]);

  return (
    <section className="rounded-xl border border-[#e6eaf7] bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#f4f1ff] text-[#4326e8]">
            <FaPenNib />
          </span>
          <div>
            <h2 className="text-lg font-black text-[#10142f]">
              My Writing Activity
            </h2>
            <p className="text-sm font-semibold text-[#526071]">
              Your writing count by review status and publishing destination.
            </p>
          </div>
        </div>
        <span className="rounded-full bg-[#f4f1ff] px-3 py-1 text-xs font-black text-[#4326e8]">
          {safeSummary.total || 0} total writings
        </span>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <WritingInsightTile
          icon={FaPenNib}
          label="Total Writings"
          value={safeSummary.total}
          description="All drafts, submissions, and approved pieces."
        />
        <WritingInsightTile
          icon={FaCheck}
          label="Approved"
          value={safeSummary.approved}
          description="Reviewed and accepted by your school."
        />
        <WritingInsightTile
          icon={FaBookOpen}
          label="Pending Review"
          value={safeSummary.pendingReview}
          description="Submitted writings waiting for review."
        />
        <WritingInsightTile
          icon={FaTimes}
          label="Rejected"
          value={safeSummary.rejected}
          description="Returned by the school reviewer."
        />
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <WritingInsightTile
          icon={FaSchool}
          label="School Wall"
          value={destinations.schoolWall}
          description="Visible in your school's writing feed."
        />
        <WritingInsightTile
          icon={FaHome}
          label="Featured Homepage"
          value={destinations.homepage}
          description="Selected for the main public homepage."
        />
        <WritingInsightTile
          icon={FaBookOpen}
          label="School Magazine"
          value={destinations.magazine}
          description="Published in a magazine issue."
        />
        <WritingInsightTile
          icon={FaGlobeAsia}
          label="Global Wall"
          value={destinations.globalWall}
          description="Visible in the public student writing feed."
        />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-[#e6eaf7] bg-white p-4">
          <h3 className="text-sm font-black text-[#10142f]">Review Status</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {["DRAFT", "SUBMITTED", "APPROVED", "REJECTED"].map((key) => (
              <span
                key={key}
                className="rounded-full bg-[#f8f9fd] px-3 py-1 text-xs font-black text-[#526071]"
              >
                {formatWritingLabel(key)}: {status[key] || 0}
              </span>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-[#e6eaf7] bg-white p-4">
          <h3 className="text-sm font-black text-[#10142f]">Writing Types</h3>
          {categoryEntries.length === 0 ? (
            <p className="mt-3 text-xs font-semibold text-[#526071]">
              No writing categories yet.
            </p>
          ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              {categoryEntries.map(([key, count]) => (
                <span
                  key={key}
                  className="rounded-full bg-[#f8f9fd] px-3 py-1 text-xs font-black text-[#526071]"
                >
                  {formatWritingLabel(key)}: {count}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default function StudentActivityOverview() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dismissedCertificates, setDismissedCertificates] = useState(null);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(CELEBRATION_DISMISS_KEY);
      setDismissedCertificates(new Set(stored ? JSON.parse(stored) : []));
    } catch (_error) {
      setDismissedCertificates(new Set());
    }
  }, []);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const res = await fetch("/api/student/activity-summary", {
          cache: "no-store",
        });
        const payload = await res.json();

        if (!res.ok) {
          throw new Error(payload.message || "Failed to load activity");
        }

        if (active) setData(payload.data || null);
      } catch (loadError) {
        if (active) setError(loadError.message || "Failed to load activity");
      } finally {
        if (active) setLoading(false);
      }
    };

    load();

    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <LoadingState
        title="Loading activity"
        message="Preparing your achievements."
      />
    );
  }

  if (error) {
    return (
      <AlertBanner
        type="error"
        title="Unable to load activity"
        message={error}
      />
    );
  }

  const metrics = data?.metrics || {};
  const achievements = data?.achievements || [];
  const firstName = String(data?.student?.name || "").trim().split(/\s+/)[0] || "";

  // Celebrate the most recent, recently-issued certificate the student hasn't
  // dismissed yet — turning a published result into a real moment.
  const celebration = !dismissedCertificates
    ? null
    : achievements
        .filter(
          (achievement) =>
            achievement.certificateUrl &&
            isRecentlyIssued(achievement.certificateIssuedAt) &&
            !dismissedCertificates.has(achievement.id)
        )
        .sort(
          (a, b) =>
            new Date(b.certificateIssuedAt).getTime() -
            new Date(a.certificateIssuedAt).getTime()
        )[0] || null;

  const dismissCelebration = (id) => {
    setDismissedCertificates((prev) => {
      const next = new Set(prev || []);
      next.add(id);
      try {
        window.localStorage.setItem(
          CELEBRATION_DISMISS_KEY,
          JSON.stringify(Array.from(next))
        );
      } catch (_error) {
        /* ignore storage errors */
      }
      return next;
    });
  };

  return (
    <div className="space-y-5">
      {celebration && (
        <CelebrationBanner
          achievement={celebration}
          firstName={firstName}
          onDismiss={() => dismissCelebration(celebration.id)}
        />
      )}

      {data?.publicProfileAvailable && data?.student?.id && (
        <PublicProfileCard studentId={data.student.id} name={firstName} />
      )}

      <section className="mobile-accessory-info grid grid-cols-2 gap-4 sm:grid sm:grid-cols-2 xl:grid-cols-4">
        <StatTile icon={FaTrophy} accent="amber" label="Achievements" value={metrics.achievementsCount || 0} />
        <StatTile icon={FaAward} accent="amber" label="Wins" value={metrics.winsCount || 0} />
        <StatTile icon={FaAward} accent="indigo" label="Finalist" value={metrics.finalistCount || 0} />
        <StatTile icon={FaCertificate} accent="purple" label="Certificates" value={metrics.certificatesCount || 0} />
      </section>

      <WritingActivityInsights summary={data?.writingSummary} />

      <CertificatesAndAchievements achievements={achievements} />
    </div>
  );
}
