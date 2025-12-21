"use client";

import { useState, useEffect } from "react";
import {
  FaDownload,
  FaChartBar,
  FaCalendarAlt,
  FaExclamationCircle,
} from "react-icons/fa";

export default function AttendanceReports() {
  const [reportMonth, setReportMonth] = useState(new Date().getMonth() + 1);
  const [reportYear, setReportYear] = useState(new Date().getFullYear());
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalStudents: 0,
    avgAttendance: 0,
    highestAttendance: 0,
    lowestAttendance: 100,
    studentsAbove75: 0,
    studentsBelow60: 0,
  });

  // Generate report
  useEffect(() => {
    generateReport();
  }, [reportMonth, reportYear]);

  const generateReport = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/attendance/monthly?year=${reportYear}&month=${reportMonth}`
      );

      if (res.ok) {
        const data = await res.json();

        // Process data for display
        const students = Object.entries(data).map(
          ([studentId, attendanceData]) => ({
            studentId,
            ...attendanceData,
          })
        );

        const calculatedStats = calculateStatistics(students);

        setReportData(students);
        setStats(calculatedStats);
      }
    } catch (error) {
      console.error("Error generating report:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStatistics = (students) => {
    if (students.length === 0) {
      return {
        totalStudents: 0,
        avgAttendance: 0,
        highestAttendance: 0,
        lowestAttendance: 100,
        studentsAbove75: 0,
        studentsBelow60: 0,
      };
    }

    const attendances = students.map((s) => {
      const total = s.total || 0;
      const present = s.present || 0;
      return total > 0 ? (present / total) * 100 : 0;
    });

    const above75 = attendances.filter((a) => a >= 75).length;
    const below60 = attendances.filter((a) => a < 60).length;
    const avgAttendance =
      attendances.reduce((a, b) => a + b, 0) / attendances.length;

    return {
      totalStudents: students.length,
      avgAttendance: Math.round(avgAttendance),
      highestAttendance: Math.round(Math.max(...attendances)),
      lowestAttendance: Math.round(Math.min(...attendances)),
      studentsAbove75: above75,
      studentsBelow60: below60,
    };
  };

  const getAttendancePercentage = (student) => {
    const total = student.total || 0;
    const present = student.present || 0;
    return total > 0 ? Math.round((present / total) * 100) : 0;
  };

  const getStatusBadge = (percentage) => {
    if (percentage >= 75) {
      return { color: "text-emerald-400 bg-emerald-500/10", label: "Good" };
    } else if (percentage >= 60) {
      return { color: "text-yellow-400 bg-yellow-500/10", label: "Warning" };
    } else {
      return { color: "text-red-400 bg-red-500/10", label: "Low" };
    }
  };

  const exportToCSV = () => {
    if (reportData.length === 0) return;

    const headers = [
      "Student ID",
      "Present",
      "Absent",
      "Late",
      "Total Days",
      "Attendance %",
      "Status",
    ];
    const rows = reportData.map((s) => {
      const percentage = getAttendancePercentage(s);
      const status = getStatusBadge(percentage).label;
      return [
        s.studentId,
        s.present || 0,
        s.absent || 0,
        s.late || 0,
        s.total || 0,
        `${percentage}%`,
        status,
      ];
    });

    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance-report-${reportYear}-${String(
      reportMonth
    ).padStart(2, "0")}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800">
        <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
          <FaChartBar className="text-purple-400" /> Attendance Reports
        </h3>

        {/* Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-slate-300 font-semibold mb-2">
              Month
            </label>
            <select
              value={reportMonth}
              onChange={(e) => setReportMonth(parseInt(e.target.value))}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                <option key={m} value={m}>
                  {new Date(2024, m - 1).toLocaleString("default", {
                    month: "long",
                  })}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-2">
              Year
            </label>
            <select
              value={reportYear}
              onChange={(e) => setReportYear(parseInt(e.target.value))}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
            >
              {[2024, 2025, 2026].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Export Button */}
        {reportData.length > 0 && (
          <button
            onClick={exportToCSV}
            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition"
          >
            <FaDownload /> Export as CSV
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-8 text-slate-400">
          Generating report...
        </div>
      ) : reportData.length === 0 ? (
        <div className="bg-slate-900/50 p-8 rounded-xl border border-slate-800 text-center">
          <FaCalendarAlt className="text-4xl text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400">
            No attendance data available for the selected period
          </p>
        </div>
      ) : (
        <>
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800">
              <p className="text-slate-400 text-sm mb-1">Total Students</p>
              <p className="text-2xl font-bold text-blue-400">
                {stats.totalStudents}
              </p>
            </div>
            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800">
              <p className="text-slate-400 text-sm mb-1">Avg. Attendance</p>
              <p className="text-2xl font-bold text-purple-400">
                {stats.avgAttendance}%
              </p>
            </div>
            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800">
              <p className="text-slate-400 text-sm mb-1">Highest</p>
              <p className="text-2xl font-bold text-emerald-400">
                {stats.highestAttendance}%
              </p>
            </div>
            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800">
              <p className="text-slate-400 text-sm mb-1">Lowest</p>
              <p className="text-2xl font-bold text-red-400">
                {stats.lowestAttendance}%
              </p>
            </div>
            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800">
              <p className="text-slate-400 text-sm mb-1">&ge; 75% (Good)</p>
              <p className="text-2xl font-bold text-emerald-400">
                {stats.studentsAbove75}
              </p>
            </div>
            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800">
              <p className="text-slate-400 text-sm mb-1">&lt; 60% (Low)</p>
              <p className="text-2xl font-bold text-red-400">
                {stats.studentsBelow60}
              </p>
            </div>
          </div>

          {/* Report Table */}
          <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-3 px-4 text-slate-300 font-semibold">
                    Student ID
                  </th>
                  <th className="text-center py-3 px-4 text-slate-300 font-semibold">
                    Present
                  </th>
                  <th className="text-center py-3 px-4 text-slate-300 font-semibold">
                    Absent
                  </th>
                  <th className="text-center py-3 px-4 text-slate-300 font-semibold">
                    Late
                  </th>
                  <th className="text-center py-3 px-4 text-slate-300 font-semibold">
                    Total Days
                  </th>
                  <th className="text-center py-3 px-4 text-slate-300 font-semibold">
                    Attendance %
                  </th>
                  <th className="text-center py-3 px-4 text-slate-300 font-semibold">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {reportData.map((student) => {
                  const percentage = getAttendancePercentage(student);
                  const badge = getStatusBadge(percentage);
                  return (
                    <tr
                      key={student.studentId}
                      className="border-b border-slate-800 hover:bg-slate-800/50 transition"
                    >
                      <td className="py-3 px-4 text-white font-medium">
                        {student.studentId}
                      </td>
                      <td className="py-3 px-4 text-center text-emerald-400 font-semibold">
                        {student.present || 0}
                      </td>
                      <td className="py-3 px-4 text-center text-red-400 font-semibold">
                        {student.absent || 0}
                      </td>
                      <td className="py-3 px-4 text-center text-yellow-400 font-semibold">
                        {student.late || 0}
                      </td>
                      <td className="py-3 px-4 text-center text-slate-400">
                        {student.total || 0}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`font-bold ${
                            percentage >= 75
                              ? "text-emerald-400"
                              : percentage >= 60
                              ? "text-yellow-400"
                              : "text-red-400"
                          }`}
                        >
                          {percentage}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold ${badge.color}`}
                        >
                          {badge.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Low Attendance Alert */}
          {stats.studentsBelow60 > 0 && (
            <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl flex items-start gap-3">
              <FaExclamationCircle className="text-red-400 text-lg flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-400 font-semibold">
                  Low Attendance Alert
                </p>
                <p className="text-red-400/80 text-sm">
                  {stats.studentsBelow60} student(s) have attendance below 60%.
                  Consider parent communication.
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
