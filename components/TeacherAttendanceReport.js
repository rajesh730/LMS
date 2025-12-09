"use client";

import { useState, useEffect } from "react";
import LoadingSpinner from "@/components/LoadingSpinner";
import { FiCalendar, FiUser, FiUsers } from "react-icons/fi";

export default function TeacherAttendanceReport() {
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [stats, setStats] = useState([]);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchTeacherAttendance();
  }, [month, year]);

  const fetchTeacherAttendance = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch(
        `/api/attendance/monthly/teacher?month=${month}&year=${year}`
      );

      if (res.ok) {
        const data = await res.json();
        setStats(data.data?.stats || []);
        setSummary(data.data?.summary);
      } else {
        setError("Failed to load teacher attendance report");
      }
    } catch (err) {
      console.error("Error fetching teacher attendance:", err);
      setError("Error loading attendance data");
    } finally {
      setLoading(false);
    }
  };

  const previousMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  };

  const nextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  };

  const monthName = new Date(year, month - 1).toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <FiCalendar className="w-6 h-6" />
          Teacher Attendance Report
        </h2>
        <p className="text-gray-400 mt-1">
          Monthly attendance statistics for all teachers
        </p>
      </div>

      {/* Month Navigation */}
      <div className="bg-gray-900/50 rounded-lg border border-gray-700/50 p-4 flex items-center justify-between">
        <button
          onClick={previousMonth}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-semibold transition"
        >
          ← Previous
        </button>
        <div className="text-xl font-semibold text-white">{monthName}</div>
        <button
          onClick={nextMonth}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-semibold transition"
        >
          Next →
        </button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-blue-600/20 to-blue-700/20 rounded-lg border border-blue-500/30 p-6">
            <div className="flex items-center gap-3">
              <FiUsers className="w-8 h-8 text-blue-400" />
              <div>
                <p className="text-gray-400 text-sm">Total Teachers</p>
                <p className="text-3xl font-bold text-white">
                  {summary.totalTeachers}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-emerald-600/20 to-emerald-700/20 rounded-lg border border-emerald-500/30 p-6">
            <div className="flex items-center gap-3">
              <FiCalendar className="w-8 h-8 text-emerald-400" />
              <div>
                <p className="text-gray-400 text-sm">Average Attendance</p>
                <p className="text-3xl font-bold text-white">
                  {summary.averageAttendance}%
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 text-red-300">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner />
        </div>
      )}

      {/* Attendance Table */}
      {!loading && stats.length > 0 && (
        <div className="bg-gray-900/50 rounded-lg border border-gray-700/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-800/50 border-b border-gray-700/50">
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">
                    Teacher Name
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">
                    Subject
                  </th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-gray-300">
                    Present
                  </th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-gray-300">
                    Absent
                  </th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-gray-300">
                    Leave
                  </th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-gray-300">
                    Total
                  </th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-gray-300">
                    Attendance %
                  </th>
                </tr>
              </thead>
              <tbody>
                {stats.map((stat, idx) => (
                  <tr
                    key={stat.teacherId}
                    className={`border-b border-gray-700/30 ${
                      idx % 2 === 0 ? "bg-gray-900/30" : ""
                    } hover:bg-gray-800/50 transition`}
                  >
                    <td className="px-6 py-3 text-sm text-white flex items-center gap-2">
                      <FiUser className="w-4 h-4 text-gray-500" />
                      {stat.name}
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-300">
                      {stat.subject || "N/A"}
                    </td>
                    <td className="px-6 py-3 text-center">
                      <span className="bg-emerald-600/30 text-emerald-300 px-3 py-1 rounded-full text-sm font-medium">
                        {stat.present}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-center">
                      <span className="bg-red-600/30 text-red-300 px-3 py-1 rounded-full text-sm font-medium">
                        {stat.absent}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-center">
                      <span className="bg-yellow-600/30 text-yellow-300 px-3 py-1 rounded-full text-sm font-medium">
                        {stat.leave}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-center text-sm text-gray-300 font-semibold">
                      {stat.total}
                    </td>
                    <td className="px-6 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-16 h-2 bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all ${
                              stat.percentage >= 80
                                ? "bg-emerald-500"
                                : stat.percentage >= 60
                                ? "bg-yellow-500"
                                : "bg-red-500"
                            }`}
                            style={{ width: `${stat.percentage}%` }}
                          />
                        </div>
                        <span className="text-sm font-semibold text-white w-12 text-right">
                          {stat.percentage}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && stats.length === 0 && !error && (
        <div className="bg-gray-900/50 rounded-lg border border-gray-700/50 p-12 text-center">
          <p className="text-gray-400">
            No teacher attendance records found for {monthName}
          </p>
        </div>
      )}
    </div>
  );
}
