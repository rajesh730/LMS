"use client";

import { useEffect, useState } from "react";
import {
  FaCalendarAlt,
  FaChalkboardTeacher,
  FaLayerGroup,
  FaUserGraduate,
  FaUsers,
} from "react-icons/fa";
import StatisticsCard, { StatisticsGrid } from "@/components/StatisticsCard";
import EmptyState from "@/components/EmptyState";
import EducationConfigCard from "@/components/EducationConfigCard";
import LoadingState from "@/components/ui/LoadingState";

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
      const res = await fetch("/api/school/dashboard/stats");

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

  return (
    <div className="space-y-8">
      <div>
        <EducationConfigCard />
      </div>

      <div>
        <h2 className="mb-6 text-2xl font-black text-[#17120a]">
          School overview
        </h2>
        <StatisticsGrid>
          <StatisticsCard
            icon={FaUserGraduate}
            label="Total Students"
            value={stats.overview?.totalStudents || 0}
            subtext={`Active: ${stats.students?.byStatus?.ACTIVE || 0}`}
            color="blue"
          />
          <StatisticsCard
            icon={FaChalkboardTeacher}
            label="Total Mentors"
            value={stats.teachers?.total || 0}
            color="emerald"
          />
          <StatisticsCard
            icon={FaLayerGroup}
            label="Active Grades"
            value={stats.students?.byGrade?.length || 0}
            color="purple"
          />
          <StatisticsCard
            icon={FaCalendarAlt}
            label="School Events"
            value={stats.overview?.totalEvents || 0}
            color="amber"
          />
        </StatisticsGrid>
      </div>

      <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
        <h3 className="mb-4 text-xl font-black text-[#17120a]">
          Student status
        </h3>
        <div className="grid md:grid-cols-3 gap-4">
          {stats.students?.byStatus &&
            Object.entries(stats.students.byStatus).map(([status, count]) => (
              <div
                key={status}
                className="bg-slate-800/50 p-4 rounded-lg border border-slate-700"
              >
                <p className="text-slate-400 text-sm mb-1">{status}</p>
                <p className="text-2xl font-bold text-white">{count}</p>
              </div>
            ))}
        </div>
      </div>

      {stats.students?.byGrade && stats.students.byGrade.length > 0 && (
        <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
        <h3 className="mb-4 text-xl font-black text-[#17120a]">
          Students by Grade
        </h3>
          <div className="space-y-2">
            {stats.students.byGrade.map((group) => (
              <div
                key={group._id}
                className="flex items-center justify-between bg-slate-800/50 p-4 rounded-lg border border-slate-700"
              >
                <span className="text-slate-300">
                  {group.gradeName || "Unassigned"}
                </span>
                <span className="bg-blue-600/20 text-blue-400 px-3 py-1 rounded-full text-sm font-semibold">
                  {group.count} students
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
        <h3 className="mb-4 flex items-center gap-2 text-xl font-black text-[#17120a]">
          <FaUsers /> Participation Snapshot
        </h3>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
            <p className="text-slate-400 text-sm mb-1">Students Ready to Participate</p>
            <p className="text-2xl font-bold text-white">
              {stats.overview?.totalStudents || 0}
            </p>
          </div>
          <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
            <p className="text-slate-400 text-sm mb-1">Mentors Available</p>
            <p className="text-2xl font-bold text-white">
              {stats.teachers?.total || 0}
            </p>
          </div>
          <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
            <p className="text-slate-400 text-sm mb-1">School Events in Motion</p>
            <div className="flex items-end gap-2">
              <p className="text-2xl font-bold text-white">
                {stats.overview?.totalEvents || 0}
              </p>
              <p className="text-emerald-400 text-sm mb-1">live</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-blue-900/20 border border-blue-500/30 p-6 rounded-xl">
        <h4 className="mb-2 font-black text-[#17120a]">School snapshot</h4>
        <ul className="text-blue-200 text-sm space-y-1">
          <li>
            You currently have{" "}
            <strong>
              {stats.students?.byStatus?.SUSPENDED || 0} suspended{" "}
              {(stats.students?.byStatus?.SUSPENDED || 0) === 1
                ? "student"
                : "students"}
            </strong>
          </li>
          <li>
            {stats.overview?.totalEvents || 0} school event
            {(stats.overview?.totalEvents || 0) !== 1 ? "s" : ""} planned
          </li>
        </ul>
      </div>
    </div>
  );
}
