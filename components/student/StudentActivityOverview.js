"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  FaAward,
  FaCalendarAlt,
  FaCertificate,
  FaTrophy,
} from "react-icons/fa";
import AlertBanner from "@/components/ui/AlertBanner";
import EmptyState from "@/components/EmptyState";
import LoadingState from "@/components/ui/LoadingState";

function formatPlacement(value) {
  if (value === "RUNNER_UP") return "Runner Up";
  if (value === "THIRD_PLACE") return "Third Place";
  return String(value || "").replaceAll("_", " ");
}

function formatDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleDateString();
}

function MetricCard({ label, value }) {
  return (
    <div className="rounded-xl border border-[#e6eaf7] bg-white p-5 shadow-sm">
      <strong className="block text-3xl font-black text-[#10142f]">
        {value}
      </strong>
      <span className="mt-1 block text-sm font-bold text-[#526071]">
        {label}
      </span>
    </div>
  );
}

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

  return (
    <div className="space-y-5">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Achievements" value={metrics.achievementsCount || 0} />
        <MetricCard label="Wins" value={metrics.winsCount || 0} />
        <MetricCard label="Finalist" value={metrics.finalistCount || 0} />
        <MetricCard label="Certificates" value={metrics.certificatesCount || 0} />
      </section>

      <section className="rounded-xl border border-[#e6eaf7] bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#f4f1ff] text-[#4326e8]">
            <FaAward />
          </span>
          <div>
            <h2 className="text-lg font-black text-[#10142f]">
              Achievement History
            </h2>
            <p className="text-sm font-semibold text-[#526071]">
              Published results and certificates appear here.
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
          <div className="mt-5 divide-y divide-[#e6eaf7]">
            {achievements.map((achievement) => (
              <article
                key={achievement.id}
                className="flex flex-col gap-3 py-4 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <span className="rounded-full bg-[#f4f1ff] px-3 py-1 text-xs font-black text-[#4326e8]">
                    {formatPlacement(achievement.placement)}
                  </span>
                  <h3 className="mt-3 text-base font-black text-[#10142f]">
                    {achievement.event?.title || achievement.title}
                  </h3>
                  <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-[#526071]">
                    <FaCalendarAlt className="text-[#4326e8]" />
                    {formatDate(achievement.awardedAt)}
                  </p>
                </div>

                {achievement.certificateUrl && (
                  <Link
                    href={achievement.certificateUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[#4326e8] px-4 text-sm font-black text-white"
                  >
                    <FaCertificate />
                    Certificate
                  </Link>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
