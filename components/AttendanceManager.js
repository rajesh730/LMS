"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export default function AttendanceManager({ teachers, grades }) {
  const [students, setStudents] = useState([]);
  const [attendanceDate, setAttendanceDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [attendanceGrade, setAttendanceGrade] = useState("");
  const [attendanceStatusFilter, setAttendanceStatusFilter] = useState("ALL");
  const [attendanceSearch, setAttendanceSearch] = useState("");
  const [attendanceData, setAttendanceData] = useState({});
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceType, setAttendanceType] = useState("student"); // 'student' or 'teacher'
  const [isEditingAttendance, setIsEditingAttendance] = useState(true);
  const [attendanceView, setAttendanceView] = useState("daily"); // 'daily' or 'monthly'
  const [monthlyAttendance, setMonthlyAttendance] = useState({});
  const [attendanceMonth, setAttendanceMonth] = useState(
    new Date().getMonth() + 1
  );
  const [attendanceYear, setAttendanceYear] = useState(
    new Date().getFullYear()
  );

  // Track the current fetch request to prevent race conditions
  const fetchCounterRef = useRef(0);

  // Initialize default grade from localStorage or props
  useEffect(() => {
    const savedGrade = localStorage.getItem("attendanceGrade");
    if (savedGrade && grades.find((c) => c._id === savedGrade)) {
      setAttendanceGrade(savedGrade);
    } else if (grades.length > 0 && !attendanceGrade) {
      setAttendanceGrade(grades[0]._id);
    }
  }, [grades]);

  // Fetch students when grade changes
  useEffect(() => {
    if (attendanceGrade && attendanceType === "student") {
      // Fetch all students for the grade (limit high enough)
      fetch(`/api/students?grade=${attendanceGrade}&limit=200`)
        .then((res) => res.json())
        .then((data) => setStudents(data.students || []))
        .catch((err) =>
          console.error("Error fetching students for attendance", err)
        );
    } else if (attendanceType === "teacher") {
      // Teachers are passed as props
    } else {
      setStudents([]);
    }
  }, [attendanceGrade, attendanceType]);

  // Save grade to localStorage when changed
  useEffect(() => {
    if (attendanceGrade) {
      localStorage.setItem("attendanceGrade", attendanceGrade);
    }
  }, [attendanceGrade]);

  const fetchAttendance = useCallback(
    async (date) => {
      // Increment counter for this new fetch
      fetchCounterRef.current += 1;
      const currentFetchId = fetchCounterRef.current;

      console.log(`🔍 [Fetch #${currentFetchId}] Starting for:`, {
        date,
        type: attendanceType,
        grade: attendanceGrade,
      });

      setAttendanceLoading(true);
      try {
        let url = `/api/attendance?date=${date}&type=${attendanceType}`;
        if (attendanceType === "student" && attendanceGrade) {
          url += `&grade=${attendanceGrade}`;
        }

        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();

          // Check if this is still the current fetch request
          if (currentFetchId !== fetchCounterRef.current) {
            console.log(
              `⚠️ [Fetch #${currentFetchId}] STALE - Discarding (current is #${fetchCounterRef.current})`
            );
            return; // Discard stale results
          }

          const map = {};
          let hasData = false;
          if (data.attendance && Array.isArray(data.attendance)) {
            data.attendance.forEach((record) => {
              const id = record.student?._id || record.teacher?._id;
              if (id) {
                map[id] = record.status;
                hasData = true;
              }
            });
          }

          console.log(`📊 [Fetch #${currentFetchId}] Data:`, {
            records: data.attendance?.length || 0,
            hasData,
            mode: hasData ? "READ-ONLY" : "EDIT",
          });

          setAttendanceData(map);
          setIsEditingAttendance(!hasData);

          console.log(
            `✅ [Fetch #${currentFetchId}] Mode set to:`,
            !hasData ? "🟡 EDIT" : "✅ READ-ONLY"
          );
        }
      } catch (error) {
        console.error(`❌ [Fetch #${currentFetchId}] Error:`, error);
      } finally {
        // Only clear loading if this is still the current request
        if (currentFetchId === fetchCounterRef.current) {
          setAttendanceLoading(false);
        }
      }
    },
    [attendanceType, attendanceGrade]
  );

  // Fetch Attendance when Date or Class changes
  useEffect(() => {
    if (attendanceView === "daily") {
      console.log("🔄 useEffect triggered - fetching attendance");
      fetchAttendance(attendanceDate);
    }
  }, [attendanceDate, fetchAttendance, attendanceView]);

  const saveAttendance = async () => {
    try {
      const records = Object.entries(attendanceData).map(([id, status]) => {
        // Use attendanceType to determine if this is a student or teacher record
        // Only include the relevant ID field
        if (attendanceType === "student") {
          return { studentId: id, status };
        } else {
          return { teacherId: id, status };
        }
      });

      console.log("💾 Saving attendance:", {
        date: attendanceDate,
        recordCount: records.length,
        type: attendanceType,
        grade: attendanceGrade,
        records: records.slice(0, 3), // Show first 3 for debugging
      });

      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: attendanceDate, records }),
      });

      if (res.ok) {
        alert("Attendance saved successfully");
        console.log("✅ Save successful, refetching...");
        await fetchAttendance(attendanceDate);

        // Auto-refresh monthly view if the saved date is in the current month
        const savedDate = new Date(attendanceDate);
        if (
          savedDate.getMonth() + 1 === attendanceMonth &&
          savedDate.getFullYear() === attendanceYear
        ) {
          console.log("🔄 Auto-refreshing monthly view");
          await fetchMonthlyAttendance();
        }
      } else {
        const error = await res.json();
        console.error("❌ Save failed:", error);
        alert(`Failed to save attendance: ${error.message || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Error saving attendance", error);
      alert("Error saving attendance. Check console for details.");
    }
  };

  const handleBulkStatus = (status) => {
    const newData = { ...attendanceData };
    const targetList =
      attendanceType === "student"
        ? students.filter((s) => {
            const sGradeId = s.grade && (s.grade._id || s.grade);
            const selectedGradeObj = grades.find(
              (c) => c._id === attendanceGrade
            );
            return (
              !attendanceGrade ||
              String(sGradeId) === String(attendanceGrade) ||
              (selectedGradeObj && s.grade === selectedGradeObj.name)
            );
          })
        : teachers;

    targetList.forEach((p) => (newData[p._id] = status));
    setAttendanceData(newData);
  };

  const getAttendanceSummary = () => {
    const targetList =
      attendanceType === "student"
        ? students.filter((s) => {
            const sGradeId = s.grade && (s.grade._id || s.grade);
            const selectedGradeObj = grades.find(
              (c) => c._id === attendanceGrade
            );
            return (
              !attendanceGrade ||
              String(sGradeId) === String(attendanceGrade) ||
              (selectedGradeObj && s.grade === selectedGradeObj.name)
            );
          })
        : teachers;

    const summary = {
      total: targetList.length,
      PRESENT: 0,
      ABSENT: 0,
      LATE: 0,
      EXCUSED: 0,
    };
    targetList.forEach((p) => {
      const status = attendanceData[p._id] || "PRESENT";
      if (summary[status] !== undefined) summary[status]++;
    });
    return summary;
  };

  const fetchMonthlyAttendance = useCallback(async () => {
    if (!attendanceGrade) return;
    setAttendanceLoading(true);
    console.log("📅 Fetching monthly data for:", {
      month: attendanceMonth,
      year: attendanceYear,
      grade: attendanceGrade,
    });

    try {
      const res = await fetch(
        `/api/attendance/monthly?month=${attendanceMonth}&year=${attendanceYear}&gradeId=${attendanceGrade}`
      );
      if (res.ok) {
        const data = await res.json();
        console.log("📊 Monthly data received:", {
          students: data.students?.length,
          records: data.attendance?.length,
        });

        // Build map: studentId => { day: status }
        const map = {};

        // Initialize all students
        if (data.students) {
          data.students.forEach((student) => {
            map[student._id] = { _student: student }; // Store student info
          });
        }

        // Fill in attendance data
        if (data.attendance) {
          data.attendance.forEach((record) => {
            const dayOfMonth = new Date(record.date).getUTCDate();
            const studentId = record.student?._id || record.student;
            if (!map[studentId]) map[studentId] = {};
            map[studentId][dayOfMonth] = record.status;
          });
        }

        setMonthlyAttendance(map);
      } else {
        console.error("Failed to fetch monthly attendance");
      }
    } catch (error) {
      console.error("Fetch Monthly Attendance Error", error);
    } finally {
      setAttendanceLoading(false);
    }
  }, [attendanceMonth, attendanceYear, attendanceGrade]);

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white">Attendance</h2>
            <p className="text-slate-400 text-sm">
              Manage attendance for students and teachers
            </p>
          </div>
          <div className="flex gap-3 bg-slate-800 p-1 rounded-lg">
            <button
              onClick={() => setAttendanceView("daily")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                attendanceView === "daily"
                  ? "bg-emerald-600 text-white shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Daily
            </button>
            <button
              onClick={() => setAttendanceView("monthly")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                attendanceView === "monthly"
                  ? "bg-emerald-600 text-white shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Monthly
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {attendanceView === "daily" ? (
            <div>
              <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
                Date
              </label>
              <input
                type="date"
                value={attendanceDate}
                onChange={(e) => setAttendanceDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-white p-3 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition"
              />
            </div>
          ) : (
            <>
              <div>
                <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
                  Month
                </label>
                <select
                  value={attendanceMonth}
                  onChange={(e) => setAttendanceMonth(parseInt(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 text-white p-3 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition"
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {new Date(0, i).toLocaleString("default", {
                        month: "long",
                      })}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
                  Year
                </label>
                <input
                  type="number"
                  value={attendanceYear}
                  onChange={(e) => setAttendanceYear(parseInt(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 text-white p-3 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition"
                />
              </div>
            </>
          )}

          {attendanceView === "daily" && (
            <div className="flex gap-3 bg-slate-800 p-1 rounded-lg col-span-1 h-[50px] items-center px-2 mt-6">
              <button
                onClick={() => setAttendanceType("student")}
                className={`flex-1 py-1.5 rounded-md text-sm font-medium transition ${
                  attendanceType === "student"
                    ? "bg-slate-700 text-white shadow"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Students
              </button>
              <button
                onClick={() => setAttendanceType("teacher")}
                className={`flex-1 py-1.5 rounded-md text-sm font-medium transition ${
                  attendanceType === "teacher"
                    ? "bg-slate-700 text-white shadow"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Teachers
              </button>
            </div>
          )}

          {attendanceType === "student" && (
            <div>
              <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
                Grade
              </label>
              <select
                value={attendanceGrade}
                onChange={(e) => setAttendanceGrade(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-white p-3 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition"
              >
                {grades.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {attendanceView === "monthly" && (
            <div className="flex items-end">
              <button
                onClick={fetchMonthlyAttendance}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white p-3 rounded-xl font-bold transition"
              >
                Load Monthly Data
              </button>
            </div>
          )}

          {attendanceView === "daily" && (
            <div className="md:col-span-1">
              <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
                Search
              </label>
              <input
                type="text"
                placeholder="Search by name..."
                value={attendanceSearch}
                onChange={(e) => setAttendanceSearch(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-white p-3 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition"
              />
            </div>
          )}
        </div>

        {attendanceLoading ? (
          <div className="text-center py-12 text-slate-400 animate-pulse">
            Loading attendance data...
          </div>
        ) : (
          <>
            {attendanceView === "daily" ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                  {(() => {
                    const summary = getAttendanceSummary();
                    return (
                      <>
                        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                          <div className="text-slate-400 text-xs font-bold uppercase">
                            Total
                          </div>
                          <div className="text-2xl font-bold text-white">
                            {summary.total}
                          </div>
                        </div>
                        <div className="bg-emerald-500/10 p-4 rounded-xl border border-emerald-500/20">
                          <div className="text-emerald-400 text-xs font-bold uppercase">
                            Present
                          </div>
                          <div className="text-2xl font-bold text-emerald-400">
                            {summary.PRESENT}
                          </div>
                        </div>
                        <div className="bg-red-500/10 p-4 rounded-xl border border-red-500/20">
                          <div className="text-red-400 text-xs font-bold uppercase">
                            Absent
                          </div>
                          <div className="text-2xl font-bold text-red-400">
                            {summary.ABSENT}
                          </div>
                        </div>
                        <div className="bg-yellow-500/10 p-4 rounded-xl border border-yellow-500/20">
                          <div className="text-yellow-400 text-xs font-bold uppercase">
                            Late
                          </div>
                          <div className="text-2xl font-bold text-yellow-400">
                            {summary.LATE}
                          </div>
                        </div>
                        <div className="bg-blue-500/10 p-4 rounded-xl border border-blue-500/20">
                          <div className="text-blue-400 text-xs font-bold uppercase">
                            Excused
                          </div>
                          <div className="text-2xl font-bold text-blue-400">
                            {summary.EXCUSED}
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>

                <div className="flex flex-wrap gap-3 mb-6 p-4 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-slate-400 text-sm font-medium self-center mr-2">
                    Bulk Actions:
                  </span>
                  <button
                    disabled={!isEditingAttendance}
                    onClick={() => handleBulkStatus("PRESENT")}
                    className={`px-3 py-1.5 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 rounded-lg text-sm font-medium transition ${
                      !isEditingAttendance
                        ? "opacity-50 cursor-not-allowed"
                        : ""
                    }`}
                  >
                    Mark All Present
                  </button>
                  <button
                    disabled={!isEditingAttendance}
                    onClick={() => handleBulkStatus("ABSENT")}
                    className={`px-3 py-1.5 bg-red-600/20 text-red-400 hover:bg-red-600/30 rounded-lg text-sm font-medium transition ${
                      !isEditingAttendance
                        ? "opacity-50 cursor-not-allowed"
                        : ""
                    }`}
                  >
                    Mark All Absent
                  </button>
                  <button
                    disabled={!isEditingAttendance}
                    onClick={() => handleBulkStatus("LATE")}
                    className={`px-3 py-1.5 bg-yellow-600/20 text-yellow-400 hover:bg-yellow-600/30 rounded-lg text-sm font-medium transition ${
                      !isEditingAttendance
                        ? "opacity-50 cursor-not-allowed"
                        : ""
                    }`}
                  >
                    Mark All Late
                  </button>
                  <div className="flex-1"></div>
                  <select
                    value={attendanceStatusFilter}
                    onChange={(e) => setAttendanceStatusFilter(e.target.value)}
                    className="bg-slate-800 text-white px-3 py-1.5 rounded-lg text-sm outline-none border border-slate-700 focus:border-slate-500"
                  >
                    <option value="ALL">Show All</option>
                    <option value="PRESENT">Show Present</option>
                    <option value="ABSENT">Show Absent</option>
                    <option value="LATE">Show Late</option>
                    <option value="EXCUSED">Show Excused</option>
                  </select>
                </div>

                <div className="overflow-hidden rounded-xl border border-slate-800">
                  <table className="w-full">
                    <thead className="bg-slate-800/50">
                      <tr>
                        <th className="text-left p-4 text-slate-300 font-bold uppercase text-xs">
                          Name
                        </th>
                        {attendanceType === "student" && (
                          <th className="text-left p-4 text-slate-300 font-bold uppercase text-xs">
                            Grade
                          </th>
                        )}
                        <th className="text-center p-4 text-slate-300 font-bold uppercase text-xs">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const targetList =
                          attendanceType === "student"
                            ? students.filter((s) => {
                                const sGradeId =
                                  s.grade && (s.grade._id || s.grade);
                                const selectedGradeObj = grades.find(
                                  (c) => c._id === attendanceGrade
                                );
                                const matchesGrade =
                                  !attendanceGrade ||
                                  String(sGradeId) ===
                                    String(attendanceGrade) ||
                                  (selectedGradeObj &&
                                    s.grade === selectedGradeObj.name);
                                const matchesSearch =
                                  !attendanceSearch ||
                                  s.name
                                    .toLowerCase()
                                    .includes(attendanceSearch.toLowerCase());
                                const status =
                                  attendanceData[s._id] || "PRESENT";
                                const matchesFilter =
                                  attendanceStatusFilter === "ALL" ||
                                  status === attendanceStatusFilter;
                                return (
                                  matchesGrade && matchesSearch && matchesFilter
                                );
                              })
                            : teachers.filter((t) => {
                                const matchesSearch =
                                  !attendanceSearch ||
                                  t.name
                                    .toLowerCase()
                                    .includes(attendanceSearch.toLowerCase());
                                const status =
                                  attendanceData[t._id] || "PRESENT";
                                const matchesFilter =
                                  attendanceStatusFilter === "ALL" ||
                                  status === attendanceStatusFilter;
                                return matchesSearch && matchesFilter;
                              });

                        return targetList.length > 0 ? (
                          targetList.map((person) => {
                            const status =
                              attendanceData[person._id] || "PRESENT";
                            return (
                              <tr
                                key={person._id}
                                className="border-t border-slate-800 hover:bg-slate-900/50 transition"
                              >
                                <td className="p-4 text-white font-medium">
                                  {person.name}
                                </td>
                                {attendanceType === "student" && (
                                  <td className="p-4 text-slate-400">
                                    {person.grade || "N/A"}
                                  </td>
                                )}
                                <td className="p-4">
                                  <div className="flex justify-center gap-2">
                                    <button
                                      disabled={!isEditingAttendance}
                                      onClick={() =>
                                        setAttendanceData({
                                          ...attendanceData,
                                          [person._id]: "PRESENT",
                                        })
                                      }
                                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                                        status === "PRESENT"
                                          ? "bg-emerald-600 text-white"
                                          : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                                      } ${
                                        !isEditingAttendance
                                          ? "opacity-50 cursor-not-allowed"
                                          : ""
                                      }`}
                                    >
                                      Present
                                    </button>
                                    <button
                                      disabled={!isEditingAttendance}
                                      onClick={() =>
                                        setAttendanceData({
                                          ...attendanceData,
                                          [person._id]: "ABSENT",
                                        })
                                      }
                                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                                        status === "ABSENT"
                                          ? "bg-red-600 text-white"
                                          : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                                      } ${
                                        !isEditingAttendance
                                          ? "opacity-50 cursor-not-allowed"
                                          : ""
                                      }`}
                                    >
                                      Absent
                                    </button>
                                    <button
                                      disabled={!isEditingAttendance}
                                      onClick={() =>
                                        setAttendanceData({
                                          ...attendanceData,
                                          [person._id]: "LATE",
                                        })
                                      }
                                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                                        status === "LATE"
                                          ? "bg-yellow-600 text-white"
                                          : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                                      } ${
                                        !isEditingAttendance
                                          ? "opacity-50 cursor-not-allowed"
                                          : ""
                                      }`}
                                    >
                                      Late
                                    </button>
                                    <button
                                      disabled={!isEditingAttendance}
                                      onClick={() =>
                                        setAttendanceData({
                                          ...attendanceData,
                                          [person._id]: "EXCUSED",
                                        })
                                      }
                                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                                        status === "EXCUSED"
                                          ? "bg-blue-600 text-white"
                                          : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                                      } ${
                                        !isEditingAttendance
                                          ? "opacity-50 cursor-not-allowed"
                                          : ""
                                      }`}
                                    >
                                      Excused
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td
                              colSpan={attendanceType === "student" ? 3 : 2}
                              className="p-8 text-center text-slate-400"
                            >
                              No{" "}
                              {attendanceType === "student"
                                ? "students"
                                : "teachers"}{" "}
                              found
                            </td>
                          </tr>
                        );
                      })()}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-between items-center mt-6">
                  <div className="text-sm text-slate-400">
                    Mode:{" "}
                    <span
                      className={`font-bold ${
                        isEditingAttendance
                          ? "text-yellow-400"
                          : "text-emerald-400"
                      }`}
                    >
                      {isEditingAttendance
                        ? "🟡 EDIT MODE"
                        : "✅ READ-ONLY MODE"}
                    </span>
                  </div>

                  {isEditingAttendance ? (
                    <button
                      onClick={saveAttendance}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl font-bold transition shadow-lg"
                    >
                      Save Attendance
                    </button>
                  ) : (
                    <button
                      onClick={() => setIsEditingAttendance(true)}
                      className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-bold transition shadow-lg"
                    >
                      Edit Attendance
                    </button>
                  )}
                </div>
              </>
            ) : (
              <div className="space-y-6">
                {/* Monthly Calendar View */}
                {Object.keys(monthlyAttendance).length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="bg-slate-800">
                          <th className="sticky left-0 z-10 bg-slate-800 border border-slate-700 p-2 text-left min-w-[150px]">
                            Student Name
                          </th>
                          {(() => {
                            const daysInMonth = new Date(
                              attendanceYear,
                              attendanceMonth,
                              0
                            ).getDate();
                            return Array.from(
                              { length: daysInMonth },
                              (_, i) => (
                                <th
                                  key={i + 1}
                                  className="border border-slate-700 p-2 text-center min-w-[40px]"
                                >
                                  {i + 1}
                                </th>
                              )
                            );
                          })()}
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(monthlyAttendance).map(
                          ([studentId, attendance]) => {
                            const student = attendance._student;
                            if (!student) return null;

                            return (
                              <tr
                                key={studentId}
                                className="hover:bg-slate-800/30"
                              >
                                <td className="sticky left-0 z-10 bg-slate-900 border border-slate-700 p-2 font-medium text-white">
                                  {student.name}
                                  <div className="text-xs text-slate-400">
                                    {student.grade}
                                  </div>
                                </td>
                                {(() => {
                                  const daysInMonth = new Date(
                                    attendanceYear,
                                    attendanceMonth,
                                    0
                                  ).getDate();
                                  return Array.from(
                                    { length: daysInMonth },
                                    (_, i) => {
                                      const day = i + 1;
                                      const status = attendance[day];

                                      let bgColor = "bg-slate-800";
                                      let textColor = "text-slate-600";
                                      let displayText = "-";

                                      if (status) {
                                        if (status === "PRESENT") {
                                          bgColor = "bg-emerald-500/20";
                                          textColor = "text-emerald-400";
                                          displayText = "P";
                                        } else if (status === "ABSENT") {
                                          bgColor = "bg-red-500/20";
                                          textColor = "text-red-400";
                                          displayText = "A";
                                        } else if (status === "LATE") {
                                          bgColor = "bg-yellow-500/20";
                                          textColor = "text-yellow-400";
                                          displayText = "L";
                                        } else if (status === "EXCUSED") {
                                          bgColor = "bg-blue-500/20";
                                          textColor = "text-blue-400";
                                          displayText = "E";
                                        }
                                      }

                                      return (
                                        <td
                                          key={day}
                                          className={`border border-slate-700 p-2 text-center ${bgColor}`}
                                        >
                                          <span
                                            className={`font-bold ${textColor}`}
                                          >
                                            {displayText}
                                          </span>
                                        </td>
                                      );
                                    }
                                  );
                                })()}
                              </tr>
                            );
                          }
                        )}
                      </tbody>
                    </table>

                    {/* Legend */}
                    <div className="mt-4 flex flex-wrap gap-4 justify-center text-sm">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded bg-emerald-500/20 border border-emerald-500/40"></span>
                        <span className="text-slate-300">Present (P)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded bg-red-500/20 border border-red-500/40"></span>
                        <span className="text-slate-300">Absent (A)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded bg-yellow-500/20 border border-yellow-500/40"></span>
                        <span className="text-slate-300">Late (L)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded bg-blue-500/20 border border-blue-500/40"></span>
                        <span className="text-slate-300">Excused (E)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded bg-slate-800 border border-slate-700"></span>
                        <span className="text-slate-300">No Data (-)</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center text-slate-400">
                    <p>No monthly attendance data loaded.</p>
                    <p className="text-sm mt-2">
                      Select a grade and click "Load Monthly Data" to view the
                      calendar.
                    </p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
