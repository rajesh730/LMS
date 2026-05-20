"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  FaAward,
  FaCalendarAlt,
  FaCertificate,
  FaClipboardList,
  FaMapMarkerAlt,
  FaSchool,
  FaTrophy,
} from "react-icons/fa";
import AlertBanner from "@/components/ui/AlertBanner";
import EmptyState from "@/components/EmptyState";

function formatPlacement(value) {
  if (value === "RUNNER_UP") return "Runner Up";
  if (value === "THIRD_PLACE") return "Third Place";
  return String(value || "").replaceAll("_", " ");
}

function formatDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleDateString();
}

const placementTone = {
  WINNER: "border-yellow-500/30 bg-yellow-500/10 text-yellow-200",
  RUNNER_UP: "border-slate-500/40 bg-slate-500/10 text-slate-200",
  THIRD_PLACE: "border-orange-500/30 bg-orange-500/10 text-orange-200",
  FINALIST: "border-blue-500/30 bg-blue-500/10 text-blue-200",
  MERIT: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
  SPECIAL_MENTION: "border-purple-500/30 bg-purple-500/10 text-purple-200",
  PARTICIPANT: "border-slate-700 bg-slate-800/80 text-slate-200",
};

export default function StudentActivityOverview() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

        if (active) {
          setData(payload.data || null);
        }
      } catch (loadError) {
        if (active) {
          setError(loadError.message || "Failed to load activity");
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

  if (loading) {
    return (
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="h-72 animate-pulse rounded-2xl border border-slate-800 bg-slate-900/70" />
        <div className="space-y-4">
          <div className="h-36 animate-pulse rounded-2xl border border-slate-800 bg-slate-900/70" />
          <div className="h-36 animate-pulse rounded-2xl border border-slate-800 bg-slate-900/70" />
        </div>
      </div>
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

  const student = data?.student;
  const metrics = data?.metrics || {};
  const achievements = data?.achievements || [];

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <aside className="space-y-6">
        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70">
          <div className="h-24 bg-gradient-to-r from-blue-600/40 via-emerald-500/20 to-amber-400/20" />
          <div className="-mt-10 p-6 pt-0">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-emerald-400 text-3xl font-black text-white shadow-xl shadow-blue-950/40">
              {student?.name?.charAt(0) || "S"}
            </div>
            <h2 className="mt-4 text-2xl font-bold text-white">
              {student?.name || "Student"}
            </h2>
            <p className="mt-2 text-sm text-slate-300">
              Verified student activity and achievement profile
            </p>

            <div className="mt-5 space-y-3 text-sm text-slate-400">
              <div className="flex items-center gap-3">
                <FaSchool className="text-slate-500" />
                <span>{student?.schoolName || "School"}</span>
              </div>
              {student?.schoolLocation && (
                <div className="flex items-center gap-3">
                  <FaMapMarkerAlt className="text-slate-500" />
                  <span>{student.schoolLocation}</span>
                </div>
              )}
              <div className="flex items-center gap-3">
                <FaAward className="text-slate-500" />
                <span>
                  {student?.grade || "Grade"} - Roll{" "}
                  {student?.rollNumber || "-"}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
          <h3 className="text-lg font-semibold text-white">Quick Highlights</h3>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {[
              ["Achievements", metrics.achievementsCount || 0],
              ["Wins", metrics.winsCount || 0],
              ["Finalist", metrics.finalistCount || 0],
              ["Certificates", metrics.certificatesCount || 0],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-xl border border-slate-800 bg-slate-950/70 p-4"
              >
                <div className="text-2xl font-black text-white">{value}</div>
                <div className="mt-1 text-xs uppercase tracking-wide text-slate-500">
                  {label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </aside>

      <section className="space-y-6">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                Verified timeline
              </p>
              <h2 className="mt-2 text-2xl font-bold text-white">
                Achievement History
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                This section updates automatically after schools publish event
                results and certificates.
              </p>
            </div>
            <FaClipboardList className="mt-1 text-2xl text-blue-300" />
          </div>
        </div>

        {achievements.length === 0 ? (
          <EmptyState
            icon={FaTrophy}
            title="No achievements published yet"
            description="When your school publishes verified event results, your wins and certificates will appear here automatically."
          />
        ) : (
          achievements.map((achievement) => (
            <article
              key={achievement.id}
              className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div
                    className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
                      placementTone[achievement.placement] ||
                      placementTone.PARTICIPANT
                    }`}
                  >
                    {formatPlacement(achievement.placement)}
                  </div>
                  <h4 className="mt-4 text-xl font-bold text-white">
                    {achievement.event?.title || achievement.title}
                  </h4>
                  <p className="mt-2 text-sm leading-7 text-slate-300">
                    {achievement.description ||
                      `${student?.name || "Student"} earned ${formatPlacement(
                        achievement.placement
                      ).toLowerCase()} in ${
                        achievement.event?.title || "this event"
                      }.`}
                  </p>
                </div>

                <div className="text-right text-sm text-slate-400">
                  <div className="flex items-center justify-end gap-2">
                    <FaCalendarAlt className="text-slate-500" />
                    <span>{formatDate(achievement.awardedAt)}</span>
                  </div>
                  <div className="mt-2">
                    {String(achievement.level || "").replaceAll("_", " ")}
                  </div>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-3 text-sm">
                {achievement.certificateUrl && (
                  <Link
                    href={achievement.certificateUrl}
                    className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 font-semibold text-white hover:bg-emerald-500"
                  >
                    <FaCertificate />
                    View Certificate
                  </Link>
                )}
                {achievement.event?.id && (
                  <Link
                    href={`/events/${achievement.event.id}`}
                    className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-3 py-2 font-semibold text-slate-100 hover:bg-slate-700"
                  >
                    View Event
                  </Link>
                )}
                {achievement.scorePercentage > 0 && (
                  <span className="rounded-lg border border-slate-700 px-3 py-2 text-slate-300">
                    Score: {achievement.scorePercentage}%
                  </span>
                )}
              </div>
            </article>
          ))
        )}
      </section>
    </div>
  );
}
