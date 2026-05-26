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
  WINNER: "border-amber-200 bg-amber-50 text-amber-800",
  RUNNER_UP: "border-slate-200 bg-slate-50 text-slate-700",
  THIRD_PLACE: "border-orange-200 bg-orange-50 text-orange-800",
  FINALIST: "border-[#bfd7f7] bg-[#eaf2ff] text-[#0a2f66]",
  MERIT: "border-emerald-200 bg-emerald-50 text-emerald-800",
  SPECIAL_MENTION: "border-violet-200 bg-violet-50 text-violet-800",
  PARTICIPANT: "border-[#d7cdbb] bg-white text-[#40516b]",
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
        <div className="h-72 animate-pulse rounded-lg border border-[#d7cdbb] bg-white" />
        <div className="space-y-4">
          <div className="h-36 animate-pulse rounded-lg border border-[#d7cdbb] bg-white" />
          <div className="h-36 animate-pulse rounded-lg border border-[#d7cdbb] bg-white" />
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
        <div className="overflow-hidden rounded-lg border border-[#d7cdbb] bg-white shadow-sm">
          <div className="h-20 bg-gradient-to-r from-[#eaf2ff] via-emerald-50 to-amber-50" />
          <div className="-mt-10 p-6 pt-0">
            <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-[#0a2f66] text-2xl font-bold text-white shadow-lg shadow-[#0a2f66]/15">
              {student?.name?.charAt(0) || "S"}
            </div>
            <h2 className="mt-4 text-xl font-bold text-[#17120a]">
              {student?.name || "Student"}
            </h2>
            <p className="mt-2 text-sm text-[#52657d]">
              Verified student activity and achievement profile
            </p>

            <div className="mt-5 space-y-3 text-sm text-[#52657d]">
              <div className="flex items-center gap-3">
                <FaSchool className="text-[#0a2f66]" />
                <span>{student?.schoolName || "School"}</span>
              </div>
              {student?.schoolLocation && (
                <div className="flex items-center gap-3">
                  <FaMapMarkerAlt className="text-[#0a2f66]" />
                  <span>{student.schoolLocation}</span>
                </div>
              )}
              <div className="flex items-center gap-3">
                <FaAward className="text-[#0a2f66]" />
                <span>
                  {student?.grade || "Grade"} - Roll{" "}
                  {student?.rollNumber || "-"}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-[#d7cdbb] bg-white p-5 shadow-sm">
          <h3 className="text-base font-bold text-[#17120a]">Quick Highlights</h3>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {[
              ["Achievements", metrics.achievementsCount || 0],
              ["Wins", metrics.winsCount || 0],
              ["Finalist", metrics.finalistCount || 0],
              ["Certificates", metrics.certificatesCount || 0],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-lg border border-[#d7cdbb] bg-[#f8fbff] p-4"
              >
                <div className="text-xl font-bold text-[#17120a]">{value}</div>
                <div className="mt-1 text-xs font-semibold text-[#52657d]">
                  {label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </aside>

      <section className="space-y-6">
        <div className="rounded-lg border border-[#d7cdbb] bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-normal text-[#52657d]">
                Verified timeline
              </p>
              <h2 className="mt-1 text-xl font-bold text-[#17120a] sm:text-2xl">
                Achievement History
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#52657d]">
                This section updates automatically after schools publish event
                results and certificates.
              </p>
            </div>
            <FaClipboardList className="mt-1 text-xl text-[#0a2f66]" />
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
              className="rounded-lg border border-[#d7cdbb] bg-white p-5 shadow-sm"
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
                  <h4 className="mt-4 text-lg font-bold text-[#17120a]">
                    {achievement.event?.title || achievement.title}
                  </h4>
                  <p className="mt-2 text-sm leading-6 text-[#52657d]">
                    {achievement.description ||
                      `${student?.name || "Student"} earned ${formatPlacement(
                        achievement.placement
                      ).toLowerCase()} in ${
                        achievement.event?.title || "this event"
                      }.`}
                  </p>
                </div>

                <div className="text-right text-sm text-[#52657d]">
                  <div className="flex items-center justify-end gap-2">
                    <FaCalendarAlt className="text-[#0a2f66]" />
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
                    className="inline-flex items-center gap-2 rounded-lg bg-[#0a2f66] px-3 py-2 font-semibold text-white hover:bg-[#123f82]"
                  >
                    <FaCertificate />
                    View Certificate
                  </Link>
                )}
                {achievement.event?.id && (
                  <Link
                    href={`/events/${achievement.event.id}`}
                    className="inline-flex items-center gap-2 rounded-lg border border-[#d7cdbb] bg-white px-3 py-2 font-semibold text-[#0a2f66] hover:bg-[#eaf2ff]"
                  >
                    View Event
                  </Link>
                )}
                {achievement.scorePercentage > 0 && (
                  <span className="rounded-lg border border-[#d7cdbb] bg-[#f8fbff] px-3 py-2 text-[#52657d]">
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
