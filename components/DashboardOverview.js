"use client";

import { useEffect, useMemo, useState } from "react";
import {
  FaCalendarAlt,
  FaChalkboardTeacher,
  FaCheckCircle,
  FaClipboardList,
  FaLayerGroup,
  FaPenNib,
  FaRegClock,
  FaUserGraduate,
  FaUsers,
} from "react-icons/fa";
import EmptyState from "@/components/EmptyState";
import EducationConfigCard from "@/components/EducationConfigCard";
import LoadingState from "@/components/ui/LoadingState";

function MetricCard({ icon: Icon, value, label, subtext, tone = "blue" }) {
  const toneMap = {
    blue: "bg-blue-50 text-[#0a2f66]",
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    violet: "bg-violet-50 text-violet-700",
    cyan: "bg-cyan-50 text-cyan-700",
  };

  return (
    <div className="rounded-2xl border border-[#e6eaf7] bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-purple-200 hover:shadow-md">
      <div className="flex items-center gap-4">
        <span
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
            toneMap[tone] || toneMap.blue
          }`}
        >
          <Icon />
        </span>
        <span className="min-w-0">
          <strong className="block text-2xl font-black text-[#17120a]">
            {value}
          </strong>
          <span className="block text-sm font-black text-[#52657d]">{label}</span>
          {subtext && (
            <span className="mt-1 block text-[11px] font-semibold text-purple-700">
              {subtext}
            </span>
          )}
        </span>
      </div>
    </div>
  );
}

function Panel({ title, action, children }) {
  return (
    <section className="rounded-2xl border border-[#e6eaf7] bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-xl font-black text-[#17120a]">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function formatRelativeDate(value) {
  if (!value) return "";
  const then = new Date(value).getTime();
  const now = Date.now();
  const diffMinutes = Math.max(0, Math.round((now - then) / 60000));
  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes} min ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hr ago`;
  const diffDays = Math.round(diffHours / 24);
  if (diffDays === 1) return "Yesterday";
  return `${diffDays} days ago`;
}

function activityIcon(type = "") {
  const normalized = String(type).toLowerCase();
  if (normalized.includes("student")) return FaUserGraduate;
  if (normalized.includes("teacher")) return FaChalkboardTeacher;
  if (normalized.includes("event")) return FaCalendarAlt;
  return FaCheckCircle;
}

function EmptyActivityState() {
  return (
    <div className="flex min-h-[18rem] flex-col items-center justify-center rounded-2xl border border-dashed border-[#d6e1f3] bg-[#f8fbff] p-8 text-center">
      <div className="relative h-28 w-40">
        <div className="absolute left-4 top-8 h-16 w-24 -rotate-6 rounded-2xl bg-white shadow-sm" />
        <div className="absolute right-4 top-4 h-16 w-24 rotate-6 rounded-2xl bg-white shadow-sm" />
        <div className="absolute inset-x-0 bottom-0 mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-50 text-2xl text-purple-700 shadow-sm">
          <FaPenNib />
        </div>
      </div>
      <h3 className="mt-5 text-xl font-black text-[#17120a]">No activity yet</h3>
      <p className="mt-2 max-w-sm text-base leading-7 text-[#52657d]">
        Recent student, teacher, event, and dashboard actions will appear here
        as your school starts working.
      </p>
    </div>
  );
}

export default function DashboardOverview() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/school/dashboard/stats", {
        cache: "no-store",
      });

      if (res.ok) {
        const data = await res.json();
        setStats(data.data);
        setError(null);
      } else {
        try {
          const err = await res.json();
          setError(err.message || "We could not load your dashboard numbers.");
        } catch {
          setError("We could not load your dashboard numbers.");
        }
      }
    } catch (err) {
      console.error("Error fetching dashboard stats:", err);
      setError("We could not load your dashboard numbers. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const recentActivity = stats?.recentActivity || [];

  const topGrades = useMemo(
    () =>
      [...(stats?.students?.byGrade || [])]
        .sort((a, b) => Number(b.count || 0) - Number(a.count || 0))
        .slice(0, 6),
    [stats]
  );

  if (loading) {
    return (
      <LoadingState
        title="Preparing school overview"
        message="Loading student, mentor, grade, and event totals."
      />
    );
  }

  if (error) {
    return (
      <EmptyState
        title="Dashboard numbers could not load"
        description={error}
        actionLabel="Try again"
        onAction={fetchStats}
      />
    );
  }

  if (!stats) {
    return (
      <EmptyState
        title="Dashboard overview is not ready yet"
        description="Once students, teachers, or events are added, your school overview will appear here."
      />
    );
  }

  const totalStudents = stats.overview?.totalStudents || 0;
  const totalTeachers = stats.teachers?.total || 0;
  const totalEvents = stats.overview?.totalEvents || 0;
  const activeStudents = stats.students?.byStatus?.ACTIVE || 0;
  const gradeCount = stats.students?.byGrade?.length || 0;
  const profileCompletion =
    totalStudents > 0 || totalTeachers > 0 || totalEvents > 0 ? 70 : 20;

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          icon={FaUserGraduate}
          value={totalStudents}
          label="Total Students"
          subtext={`${activeStudents} active`}
          tone="violet"
        />
        <MetricCard
          icon={FaChalkboardTeacher}
          value={totalTeachers}
          label="Teachers"
          subtext="Available"
          tone="emerald"
        />
        <MetricCard
          icon={FaCalendarAlt}
          value={totalEvents}
          label="School Events"
          subtext="In motion"
          tone="amber"
        />
        <MetricCard
          icon={FaLayerGroup}
          value={gradeCount}
          label="Active Grades"
          subtext="Configured"
          tone="blue"
        />
        <MetricCard
          icon={FaClipboardList}
          value={`${profileCompletion}%`}
          label="Profile Setup"
          subtext="Completion"
          tone="cyan"
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Panel
          title="Recent Activity"
          action={
            <span className="text-sm font-black text-purple-700">Latest updates</span>
          }
        >
          <div className="max-h-[22rem] overflow-y-auto pr-2 [scrollbar-color:#8b00e6_#edf2fb] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-purple-300 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-[#edf2fb]">
            <div className="space-y-3">
              {recentActivity.length === 0 ? (
                <EmptyActivityState />
              ) : (
                recentActivity.map((activity) => {
                  const Icon = activityIcon(activity.type);
                  return (
                    <div
                      key={`${activity.type}-${activity.id}-${activity.createdAt}`}
                      className="flex min-h-[72px] items-center gap-3 rounded-xl bg-[#f8fbff] p-3"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-purple-700 shadow-sm">
                        <Icon />
                      </span>
                      <span className="min-w-0 flex-1">
                        <strong className="block truncate text-base text-[#17120a]">
                          {activity.title}
                        </strong>
                        <span className="block truncate text-sm text-[#52657d]">
                          {activity.description}
                        </span>
                      </span>
                      <span className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-black text-[#0a2f66]">
                        {formatRelativeDate(activity.createdAt)}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </Panel>

        <Panel title="Participation Snapshot">
          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            {[
              ["Students Ready", totalStudents, FaUsers],
              ["Mentors Available", totalTeachers, FaChalkboardTeacher],
              ["Events in Motion", totalEvents, FaRegClock],
            ].map(([title, value, Icon]) => (
              <div
                key={title}
                className="flex items-center gap-3 rounded-xl border border-[#e6eaf7] bg-[#f8fbff] p-3"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-purple-700 shadow-sm">
                  <Icon />
                </span>
                <span>
                  <strong className="block text-xl font-black text-[#17120a]">
                    {value}
                  </strong>
                  <span className="text-sm font-bold text-[#52657d]">{title}</span>
                </span>
              </div>
            ))}
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-sm font-bold text-[#52657d]">
              <span>School Profile Completion</span>
              <span>{profileCompletion}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#eaf2ff]">
              <div
                className="h-full rounded-full bg-emerald-500"
                style={{ width: `${profileCompletion}%` }}
              />
            </div>
          </div>
        </Panel>
      </div>

      {topGrades.length > 0 && (
        <Panel title="Students by Grade">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {topGrades.map((group) => (
              <div
                key={group._id}
                className="flex items-center justify-between rounded-xl bg-[#f8fbff] p-3"
              >
                <span className="text-base font-bold text-[#24314d]">
                  {group.gradeName || "Unassigned"}
                </span>
                <span className="rounded-full bg-white px-3 py-1 text-sm font-black text-purple-700">
                  {group.count} students
                </span>
              </div>
            ))}
          </div>
        </Panel>
      )}

      <EducationConfigCard />
    </div>
  );
}
