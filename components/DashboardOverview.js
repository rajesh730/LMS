"use client";

import { useEffect, useMemo, useState } from "react";
import {
  FaCalendarAlt,
  FaChalkboardTeacher,
  FaCheckCircle,
  FaExclamationTriangle,
  FaLayerGroup,
  FaUserGraduate,
} from "react-icons/fa";
import EmptyState from "@/components/EmptyState";
import LoadingState from "@/components/ui/LoadingState";

function getCount(map = {}, key) {
  return Number(map?.[key] || 0);
}

function formatDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function MetricCard({ icon: Icon, value, label, note, tone = "blue" }) {
  const tones = {
    blue: "bg-blue-50 text-[#0a2f66] border-blue-100",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100",
    purple: "bg-purple-50 text-purple-700 border-purple-100",
  };

  return (
    <div className="rounded-2xl border border-[#e6eaf7] bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <span className={`flex h-11 w-11 items-center justify-center rounded-xl border ${tones[tone]}`}>
          <Icon />
        </span>
        <strong className="text-3xl font-black text-[#10142f]">{value}</strong>
      </div>
      <p className="mt-4 text-sm font-black text-[#24314d]">{label}</p>
      <p className="mt-1 text-xs font-semibold text-[#526071]">{note}</p>
    </div>
  );
}

function StatusBar({ label, value, total, tone = "blue" }) {
  const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
  const colors = {
    blue: "bg-[#0a2f66]",
    emerald: "bg-emerald-600",
    amber: "bg-amber-500",
    rose: "bg-rose-600",
    slate: "bg-slate-500",
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-bold text-[#24314d]">{label}</span>
        <span className="font-black text-[#10142f]">{value}</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#eef2f8]">
        <div
          className={`h-full rounded-full ${colors[tone]}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export default function DashboardOverview() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/school/dashboard/stats", {
        cache: "no-store",
      });

      if (!res.ok) {
        setError("Dashboard numbers could not load.");
        return;
      }

      const data = await res.json();
      setStats(data.data);
      setError(null);
    } catch {
      setError("Dashboard numbers could not load.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchStats();
  }, []);

  const summary = useMemo(() => {
    const studentStatus = stats?.students?.byStatus || {};
    const teacherStatus = stats?.teachers?.byStatus || {};
    const eventLifecycle = stats?.events?.byLifecycle || {};
    const eventScope = stats?.events?.byScope || {};
    const totalStudents = stats?.students?.total || 0;
    const totalTeachers = stats?.teachers?.total || 0;
    const totalEvents = stats?.events?.total || 0;
    const activeStudents = getCount(studentStatus, "ACTIVE");
    const activeTeachers = getCount(teacherStatus, "ACTIVE");
    const activeEvents = getCount(eventLifecycle, "ACTIVE");
    const gradeCount = stats?.students?.byGrade?.filter((grade) => grade.gradeName).length || 0;
    const studentHealth =
      totalStudents > 0 ? Math.round((activeStudents / totalStudents) * 100) : 0;
    const teacherHealth =
      totalTeachers > 0 ? Math.round((activeTeachers / totalTeachers) * 100) : 0;

    return {
      totalStudents,
      totalTeachers,
      totalEvents,
      activeStudents,
      inactiveStudents:
        getCount(studentStatus, "INACTIVE") +
        getCount(studentStatus, "SUSPENDED") +
        getCount(studentStatus, "ALUMNI"),
      activeTeachers,
      inactiveTeachers: getCount(teacherStatus, "INACTIVE"),
      activeEvents,
      completedEvents: getCount(eventLifecycle, "COMPLETED"),
      archivedEvents: getCount(eventLifecycle, "ARCHIVED"),
      schoolEvents: getCount(eventScope, "SCHOOL"),
      platformEvents: getCount(eventScope, "PLATFORM"),
      gradeCount,
      studentHealth,
      teacherHealth,
    };
  }, [stats]);

  if (loading) {
    return (
      <LoadingState
        title="Preparing overview"
        message="Loading school, student, teacher, and event status."
      />
    );
  }

  if (error) {
    return (
      <EmptyState
        title="Overview unavailable"
        description={error}
        actionLabel="Try again"
        onAction={fetchStats}
      />
    );
  }

  if (!stats) {
    return (
      <EmptyState
        title="No overview yet"
        description="Your school status will appear after students, teachers, or events are added."
      />
    );
  }

  const gradeRows = [...(stats.students?.byGrade || [])]
    .filter((grade) => grade.gradeName)
    .sort((a, b) => String(a.gradeName).localeCompare(String(b.gradeName)))
    .slice(0, 8);
  const recentActivity = stats.recentActivity || [];

  return (
    <section className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={FaUserGraduate}
          value={summary.totalStudents}
          label="Students"
          note={`${summary.activeStudents} active, ${summary.inactiveStudents} inactive or alumni`}
          tone="blue"
        />
        <MetricCard
          icon={FaChalkboardTeacher}
          value={summary.totalTeachers}
          label="Teachers"
          note={`${summary.activeTeachers} active mentors`}
          tone="emerald"
        />
        <MetricCard
          icon={FaCalendarAlt}
          value={summary.totalEvents}
          label="Events"
          note={`${summary.activeEvents} active, ${summary.completedEvents} completed`}
          tone="purple"
        />
        <MetricCard
          icon={FaLayerGroup}
          value={summary.gradeCount}
          label="Grades"
          note="Grades with active records"
          tone="amber"
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
        <div className="rounded-2xl border border-[#e6eaf7] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-[#10142f]">
                School Status
              </h2>
              <p className="mt-1 text-sm font-semibold text-[#526071]">
                Overall operational health of students, teachers, and events.
              </p>
            </div>
            <FaCheckCircle className="text-2xl text-emerald-600" />
          </div>

          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <StatusBar
              label="Active students"
              value={summary.activeStudents}
              total={summary.totalStudents}
              tone="blue"
            />
            <StatusBar
              label="Active teachers"
              value={summary.activeTeachers}
              total={summary.totalTeachers}
              tone="emerald"
            />
            <StatusBar
              label="Active events"
              value={summary.activeEvents}
              total={Math.max(summary.totalEvents, 1)}
              tone="purple"
            />
            <StatusBar
              label="Completed events"
              value={summary.completedEvents}
              total={Math.max(summary.totalEvents, 1)}
              tone="amber"
            />
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {[
              ["Student Health", `${summary.studentHealth}%`],
              ["Teacher Coverage", `${summary.teacherHealth}%`],
              ["School Events", summary.schoolEvents],
              ["Platform Events", summary.platformEvents],
              ["Archived Events", summary.archivedEvents],
              ["Active Grades", summary.gradeCount],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-[#eef2f8] bg-[#fbfcff] p-3">
                <p className="text-xs font-black uppercase text-[#526071]">{label}</p>
                <p className="mt-1 text-xl font-black text-[#10142f]">{value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-[#e6eaf7] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-[#10142f]">
                Student Distribution
              </h2>
              <p className="mt-1 text-sm font-semibold text-[#526071]">
                Grade-level record coverage.
              </p>
            </div>
            <FaUserGraduate className="text-2xl text-[#0a2f66]" />
          </div>

          <div className="mt-5 space-y-3">
            {gradeRows.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#dbe5f4] bg-[#fbfcff] p-5 text-sm font-semibold text-[#526071]">
                No grade distribution available yet.
              </div>
            ) : (
              gradeRows.map((grade) => (
                <StatusBar
                  key={grade.gradeName}
                  label={grade.gradeName}
                  value={grade.count}
                  total={summary.totalStudents}
                  tone="blue"
                />
              ))
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-[#e6eaf7] bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-[#10142f]">
              Recent School Activity
            </h2>
            <p className="mt-1 text-sm font-semibold text-[#526071]">
              Latest student, teacher, event, and system updates.
            </p>
          </div>
          <FaExclamationTriangle className="text-xl text-amber-500" />
        </div>

        <div className="mt-5 divide-y divide-[#eef2f8]">
          {recentActivity.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#dbe5f4] bg-[#fbfcff] p-5 text-sm font-semibold text-[#526071]">
              No recent activity yet.
            </div>
          ) : (
            recentActivity.slice(0, 8).map((item) => (
              <div key={`${item.type}-${item.id}`} className="grid gap-2 py-3 sm:grid-cols-[160px_minmax(0,1fr)_120px] sm:items-center">
                <span className="text-xs font-black uppercase text-[#526071]">
                  {item.type}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-[#10142f]">
                    {item.title}
                  </p>
                  <p className="truncate text-xs font-semibold text-[#526071]">
                    {item.description}
                  </p>
                </div>
                <span className="text-xs font-bold text-[#75869b] sm:text-right">
                  {formatDate(item.createdAt)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
