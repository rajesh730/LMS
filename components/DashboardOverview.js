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
import LoadingSpinner from "@/components/LoadingSpinner";
import EmptyState from "@/components/EmptyState";
import EducationConfigCard from "@/components/EducationConfigCard";

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
          setError(err.message || "Failed to load statistics");
        } catch {
          setError("Failed to load statistics");
        }
      }
    } catch (err) {
      console.error("Error fetching dashboard stats:", err);
      setError("Failed to load dashboard statistics");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <LoadingSpinner text="Loading statistics..." />
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        title="Error Loading Statistics"
        description={error}
        actionLabel="Retry"
        onAction={fetchStats}
      />
    );
  }

  if (!stats) {
    return (
      <EmptyState
        title="No Data Available"
        description="Dashboard statistics could not be loaded"
      />
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <EducationConfigCard />
      </div>

      <div>
        <h2 className="text-2xl font-bold text-white mb-6">Overview</h2>
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
            label="Student Groups"
            value={stats.students?.byGrade?.length || 0}
            color="purple"
          />
          <StatisticsCard
            icon={FaCalendarAlt}
            label="Talent Events"
            value={stats.overview?.totalEvents || 0}
            color="amber"
          />
        </StatisticsGrid>
      </div>

      <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
        <h3 className="text-xl font-bold text-white mb-4">Student Status</h3>
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
          <h3 className="text-xl font-bold text-white mb-4">
            Students by Group
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
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
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
            <p className="text-slate-400 text-sm mb-1">Events in Motion</p>
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
        <h4 className="text-white font-semibold mb-2">Platform Snapshot</h4>
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
