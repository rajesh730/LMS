"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaCalendar,
  FaDownload,
  FaHistory,
} from "react-icons/fa";

export default function TeacherAttendanceManager({ teacherGrades = [] }) {
  const [grades, setGrades] = useState([]);
  const [selectedGrade, setSelectedGrade] = useState("");
  const [attendanceDate, setAttendanceDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [students, setStudents] = useState([]);
  const [attendanceData, setAttendanceData] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState("daily"); // 'daily' or 'monthly'
  const [monthlyData, setMonthlyData] = useState({});
  const [attendanceMonth, setAttendanceMonth] = useState(
    new Date().getMonth() + 1
  );
  const [attendanceYear, setAttendanceYear] = useState(
    new Date().getFullYear()
  );
  const [message, setMessage] = useState("");

  // Initialize grades
  useEffect(() => {
    const fetchTeacherGrades = async () => {
      try {
        setMessage("Grade management feature has been removed. Please use your school's primary attendance system.");
      } catch (error) {
        console.error("Error fetching grades:", error);
        setMessage("Grade management feature is not available");
      }
    };
    fetchTeacherGrades();
  }, []);

  // Fetch students for selected grade
  useEffect(() => {
    if (selectedGrade) {
      const fetchStudents = async () => {
        setLoading(true);
        try {
          const res = await fetch(
            `/api/students?grade=${selectedGrade}&limit=500`
          );
          if (res.ok) {
            const data = await res.json();
            const studentsList = Array.isArray(data)
              ? data
              : data.students || [];
            setStudents(studentsList);
          }
        } catch (error) {
          console.error("Error fetching students:", error);
          setMessage("Failed to load students");
        } finally {
          setLoading(false);
        }
      };
      fetchStudents();
    }
  }, [selectedGrade]);

  // Fetch attendance for selected date
  useEffect(() => {
    if (selectedGrade && mode === "daily") {
      fetchDailyAttendance();
    }
  }, [selectedGrade, attendanceDate, mode]);

  // Fetch monthly attendance
  useEffect(() => {
    if (selectedGrade && mode === "monthly") {
      fetchMonthlyAttendance();
    }
  }, [selectedGrade, attendanceMonth, attendanceYear, mode]);

  const fetchDailyAttendance = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/attendance?date=${attendanceDate}&type=student&grade=${selectedGrade}`
      );
      if (res.ok) {
        const data = await res.json();
        const map = {};
        if (data.attendance && Array.isArray(data.attendance)) {
          data.attendance.forEach((record) => {
            if (record.student?._id) {
              map[record.student._id] = record.status;
            }
          });
        }
        setAttendanceData(map);
      }
    } catch (error) {
      console.error("Error fetching attendance:", error);
      setMessage("Failed to load attendance");
    } finally {
      setLoading(false);
    }
  };

  const fetchMonthlyAttendance = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/attendance/monthly?year=${attendanceYear}&month=${attendanceMonth}&grade=${selectedGrade}`
      );
      if (res.ok) {
        const data = await res.json();
        setMonthlyData(data || {});
      }
    } catch (error) {
      console.error("Error fetching monthly attendance:", error);
      setMessage("Failed to load monthly attendance");
    } finally {
      setLoading(false);
    }
  };

  const handleAttendanceToggle = (studentId) => {
    const currentStatus = attendanceData[studentId] || "PRESENT";
    const statuses = ["PRESENT", "ABSENT", "LATE", "EXCUSED"];
    const nextStatus =
      statuses[(statuses.indexOf(currentStatus) + 1) % statuses.length];
    setAttendanceData((prev) => ({
      ...prev,
      [studentId]: nextStatus,
    }));
  };

  const saveAttendance = async () => {
    if (!selectedGrade) return;
    setSaving(true);
    setMessage("");

    try {
      const records = students.map((student) => ({
        studentId: student._id,
        status: attendanceData[student._id] || "PRESENT",
      }));

      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: attendanceDate,
          records,
        }),
      });

      if (res.ok) {
        setMessage("✅ Attendance saved successfully");
        setTimeout(() => setMessage(""), 3000);
      } else {
        const error = await res.json();
        setMessage(`❌ Error: ${error.message || "Failed to save"}`);
      }
    } catch (error) {
      console.error("Error saving attendance:", error);
      setMessage("❌ Failed to save attendance");
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "PRESENT":
        return "text-emerald-400 bg-emerald-500/10";
      case "ABSENT":
        return "text-red-400 bg-red-500/10";
      case "LATE":
        return "text-yellow-400 bg-yellow-500/10";
      case "EXCUSED":
        return "text-blue-400 bg-blue-500/10";
      default:
        return "text-slate-400 bg-slate-500/10";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "PRESENT":
        return <FaCheckCircle />;
      case "ABSENT":
        return <FaTimesCircle />;
      case "LATE":
        return <FaClock />;
      case "EXCUSED":
        return <FaCheckCircle />;
      default:
        return <FaCalendar />;
    }
  };

  const getAttendancePercentage = (studentId) => {
    if (!monthlyData[studentId]) return 0;
    const total = monthlyData[studentId].total || 0;
    const present = monthlyData[studentId].present || 0;
    return total > 0 ? Math.round((present / total) * 100) : 0;
  };

  if (!selectedGrade && grades.length === 0) {
    return (
      <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800 text-center">
        <p className="text-slate-400">
          No grades assigned. Contact your administrator.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800">
        <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
          <FaCalendar className="text-blue-400" /> Attendance Management
        </h3>

        {/* Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Grade Select */}
          <div>
            <label className="block text-slate-300 font-semibold mb-2">
              Select Grade
            </label>
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
            >
              <option value="">Choose a grade...</option>
              {grades.map((cls) => (
                <option key={cls._id} value={cls._id}>
                  {cls.name}
                </option>
              ))}
            </select>
          </div>

          {/* Mode Select */}
          <div>
            <label className="block text-slate-300 font-semibold mb-2">
              View Mode
            </label>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
            >
              <option value="daily">Daily Attendance</option>
              <option value="monthly">Monthly Report</option>
            </select>
          </div>

          {/* Date/Month Select */}
          {mode === "daily" ? (
            <div>
              <label className="block text-slate-300 font-semibold mb-2">
                Date
              </label>
              <input
                type="date"
                value={attendanceDate}
                onChange={(e) => setAttendanceDate(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          ) : (
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-slate-300 font-semibold mb-2">
                  Month
                </label>
                <select
                  value={attendanceMonth}
                  onChange={(e) => setAttendanceMonth(parseInt(e.target.value))}
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
              <div className="flex-1">
                <label className="block text-slate-300 font-semibold mb-2">
                  Year
                </label>
                <select
                  value={attendanceYear}
                  onChange={(e) => setAttendanceYear(parseInt(e.target.value))}
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
          )}
        </div>

        {/* Message */}
        {message && (
          <div
            className={`p-3 rounded-lg mb-4 ${
              message.includes("✅")
                ? "bg-emerald-500/10 text-emerald-400"
                : "bg-red-500/10 text-red-400"
            }`}
          >
            {message}
          </div>
        )}
      </div>

      {/* Daily Attendance View */}
      {mode === "daily" && (
        <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800">
          <h4 className="text-xl font-bold text-white mb-4">
            {new Date(attendanceDate).toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </h4>

          {loading ? (
            <div className="text-slate-400 text-center py-8">
              Loading students...
            </div>
          ) : students.length === 0 ? (
            <div className="text-slate-400 text-center py-8">
              No students in this grade
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                {students.map((student) => {
                  const status = attendanceData[student._id] || "PRESENT";
                  return (
                    <button
                      key={student._id}
                      onClick={() => handleAttendanceToggle(student._id)}
                      className={`p-4 rounded-lg border-2 transition text-left ${getStatusColor(
                        status
                      )} border-current`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold">{student.name}</p>
                          <p className="text-sm opacity-75">
                            Roll: {student.rollNumber}
                          </p>
                        </div>
                        <div className="text-2xl">{getStatusIcon(status)}</div>
                      </div>
                      <p className="text-sm mt-2 opacity-75">{status}</p>
                    </button>
                  );
                })}
              </div>

              <button
                onClick={saveAttendance}
                disabled={saving}
                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-600 text-white px-6 py-3 rounded-lg font-semibold transition"
              >
                {saving ? "Saving..." : "💾 Save Attendance"}
              </button>
            </>
          )}
        </div>
      )}

      {/* Monthly Attendance Report */}
      {mode === "monthly" && (
        <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800">
          <h4 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <FaHistory className="text-blue-400" />
            {new Date(attendanceYear, attendanceMonth - 1).toLocaleString(
              "default",
              { month: "long", year: "numeric" }
            )}{" "}
            Report
          </h4>

          {loading ? (
            <div className="text-slate-400 text-center py-8">
              Loading report...
            </div>
          ) : students.length === 0 ? (
            <div className="text-slate-400 text-center py-8">
              No students in this grade
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-3 px-4 text-slate-300 font-semibold">
                      Student Name
                    </th>
                    <th className="text-center py-3 px-4 text-slate-300 font-semibold">
                      Roll No
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
                      Attendance %
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => {
                    const studentData = monthlyData[student._id];
                    const percentage = getAttendancePercentage(student._id);
                    return (
                      <tr
                        key={student._id}
                        className="border-b border-slate-800 hover:bg-slate-800/50 transition"
                      >
                        <td className="py-3 px-4 text-white font-medium">
                          {student.name}
                        </td>
                        <td className="py-3 px-4 text-center text-slate-400">
                          {student.rollNumber}
                        </td>
                        <td className="py-3 px-4 text-center text-emerald-400 font-semibold">
                          {studentData?.present || 0}
                        </td>
                        <td className="py-3 px-4 text-center text-red-400 font-semibold">
                          {studentData?.absent || 0}
                        </td>
                        <td className="py-3 px-4 text-center text-yellow-400 font-semibold">
                          {studentData?.late || 0}
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
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
