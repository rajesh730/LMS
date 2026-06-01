"use client";

import { useEffect, useState } from "react";
import {
  FaCalendarAlt,
  FaChalkboardTeacher,
  FaLayerGroup,
  FaUserGraduate,
} from "react-icons/fa";
import EmptyState from "@/components/EmptyState";
import LoadingState from "@/components/ui/LoadingState";

function MetricCard({ icon: Icon, value, label }) {
  return (
    <div className="rounded-xl border border-[#e6eaf7] bg-white p-5 shadow-sm">
      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#f4f1ff] text-[#4326e8]">
        <Icon />
      </span>
      <strong className="mt-4 block text-3xl font-black text-[#10142f]">
        {value}
      </strong>
      <span className="mt-1 block text-sm font-bold text-[#526071]">
        {label}
      </span>
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
        setError("Dashboard numbers could not load.");
      }
    } catch {
      setError("Dashboard numbers could not load.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <LoadingState
        title="Preparing overview"
        message="Loading school numbers."
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
        description="Your numbers will appear after students, teachers, or events are added."
      />
    );
  }

  const totalStudents = stats.overview?.totalStudents || 0;
  const totalTeachers = stats.teachers?.total || 0;
  const totalEvents = stats.overview?.totalEvents || 0;
  const gradeCount = stats.students?.byGrade?.length || 0;

  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard icon={FaUserGraduate} value={totalStudents} label="Students" />
      <MetricCard icon={FaChalkboardTeacher} value={totalTeachers} label="Teachers" />
      <MetricCard icon={FaCalendarAlt} value={totalEvents} label="Events" />
      <MetricCard icon={FaLayerGroup} value={gradeCount} label="Grades" />
    </section>
  );
}
