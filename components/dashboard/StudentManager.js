"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  FaChartLine,
  FaCheckCircle,
  FaCopy,
  FaDownload,
  FaEdit,
  FaFilter,
  FaGraduationCap,
  FaKey,
  FaPlus,
  FaSearch,
  FaTrash,
  FaUpload,
  FaUserClock,
  FaUserGraduate,
  FaUserSlash,
} from "react-icons/fa";
import { TableSkeleton } from "@/components/Skeletons";
import PaginationControls from "@/components/PaginationControls";
import EmptyState from "@/components/EmptyState";
import Modal from "@/components/Modal";
import CredentialsModal from "@/components/CredentialsModal";
import AlertBanner from "@/components/ui/AlertBanner";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import StudentTransferPanel from "@/components/dashboard/StudentTransferPanel";

export default function StudentManager({ initialGrade, hideGradeFilter = false }) {
  // Data State
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    totalStudents: 0,
    limit: 10,
  });

  // Filter State
  const [grades, setGrades] = useState([]);
  const [selectedGrade, setSelectedGrade] = useState(initialGrade || "");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [search, setSearch] = useState("");
  const [studentStats, setStudentStats] = useState(null);

  // Edit State
  const [editingStudent, setEditingStudent] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [credentialsModal, setCredentialsModal] = useState({
    isOpen: false,
    credentials: null,
  });
  const [feedback, setFeedback] = useState(null);
  const [confirmState, setConfirmState] = useState(null);
  
  useEffect(() => {
    if (initialGrade) {
      setSelectedGrade(initialGrade);
    }
  }, [initialGrade]);

  // Fetch Grades
  useEffect(() => {
    const fetchGrades = async () => {
      try {
        const res = await fetch("/api/school/grade-structure");
        if (res.ok) {
          const data = await res.json();
          setGrades(data.grades || []);
        }
      } catch (error) {
        console.error("Error fetching grades:", error);
      }
    };
    fetchGrades();
  }, []);

  const fetchStudentStats = useCallback(async () => {
    try {
      const res = await fetch("/api/school/dashboard/stats", {
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        setStudentStats(data.data?.students || null);
      }
    } catch (error) {
      console.error("Error fetching student stats:", error);
    }
  }, []);

  useEffect(() => {
    fetchStudentStats();
  }, [fetchStudentStats]);

  // Fetch Students
  const fetchStudents = useCallback(
    async (page = 1) => {
      setLoading(true);
      setFeedback(null);
      try {
        const params = new URLSearchParams({
          page,
          limit: 10,
          status: selectedStatus,
          ...(search.trim() && { search: search.trim() }),
          ...(selectedGrade && { grade: selectedGrade }),
        });

        const res = await fetch(`/api/students?${params}`);
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(data.message || "Failed to load students.");
        }

        const nextStudents = Array.isArray(data.students) ? data.students : [];
        setStudents(nextStudents);
        if (data.pagination) {
          setPagination({
            page: data.pagination.currentPage,
            totalPages: data.pagination.totalPages,
            totalStudents: data.pagination.totalStudents,
            limit: data.pagination.limit,
            start: data.pagination.start,
            end: data.pagination.end,
          });
        } else {
          setPagination({
            page: 1,
            totalPages: 1,
            totalStudents: nextStudents.length,
            limit: nextStudents.length,
          });
        }
      } catch (error) {
        console.error("Error fetching students:", error);
        setStudents([]);
        setFeedback({
          type: "error",
          title: "Students could not be loaded",
          message:
            error.message ||
            "Please retry. If it continues, check your connection and server logs.",
          retry: () => fetchStudents(page),
        });
      } finally {
        setLoading(false);
      }
    },
    [search, selectedGrade, selectedStatus]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchStudents(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [fetchStudents]);

  // Page Change Handlers
  const handlePageChange = (newPage) => {
    fetchStudents(newPage);
  };

  const handleEdit = (student) => {
    setEditingStudent({ ...student });
    setIsEditModalOpen(true);
  };

  const handleCopyLogin = async (student) => {
    if (!student.username) return;
    try {
      await navigator.clipboard.writeText(student.username);
      setFeedback({
        type: "success",
        title: "Login ID copied",
        message: `${student.username} is ready to share with ${student.name}.`,
      });
    } catch (error) {
      console.error("Could not copy login ID:", error);
      setFeedback({
        type: "error",
        title: "Login ID was not copied",
        message: "Please copy it manually from the student row.",
      });
    }
  };

  const handleExportCsv = () => {
    if (students.length === 0) {
      setFeedback({
        type: "error",
        title: "No students to export",
        message: "Adjust filters or add students before exporting.",
      });
      return;
    }

    const headers = [
      "Name",
      "Student ID",
      "Grade",
      "Roll Number",
      "Login ID",
      "Status",
      "Parent Name",
      "Parent Contact",
      "Email",
      "Phone",
    ];
    const rows = students.map((student) => [
      student.name || "",
      student.platformStudentId || "",
      student.grade || "",
      student.rollNumber || "",
      student.username || "",
      student.status || "",
      student.parentName || "",
      student.parentContactNumber || student.parentPhone || "",
      student.email || "",
      student.phone || "",
    ]);

    const escapeCsv = (value) => `"${String(value).replaceAll('"', '""')}"`;
    const csv = [headers, ...rows]
      .map((row) => row.map(escapeCsv).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `students-page-${pagination.page || 1}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const requestDelete = (student) => {
    setConfirmState({
      type: "archive",
      student,
      title: "Archive this student?",
      message: `${student.name} will be removed from active student lists, but their record will stay safely archived for reporting and history.`,
      confirmLabel: "Archive student",
      tone: "danger",
      busy: false,
    });
  };

  const executeDelete = async (student) => {
    try {
      setConfirmState((current) => ({ ...current, busy: true }));
      const res = await fetch(`/api/students/${student._id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.message || "Failed to archive student.");
      }

      setConfirmState(null);
      setFeedback({
        type: "success",
        title: "Student archived",
        message: `${student.name} is no longer shown in active student records.`,
      });
      await fetchStudents(pagination.page);
      await fetchStudentStats();
    } catch (error) {
      console.error("Error deleting student:", error);
      setConfirmState(null);
      setFeedback({
        type: "error",
        title: "Student was not archived",
        message: error.message || "Please retry after checking the connection.",
      });
    }
  };

  const requestResetPassword = (student) => {
    setConfirmState({
      type: "reset-password",
      student,
      title: "Reset student password?",
      message: `A new temporary password will be generated for ${student.name}. Share it only with the student or school staff responsible for the account.`,
      confirmLabel: "Reset password",
      tone: "warning",
      busy: false,
    });
  };

  const executeResetPassword = async (student) => {
    try {
      setConfirmState((current) => ({ ...current, busy: true }));
      const res = await fetch(`/api/students/${student._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to reset password");
      }

      setConfirmState(null);
      setFeedback({
        type: "success",
        title: "Password reset",
        message: `A new temporary password is ready for ${student.name}.`,
      });

      if (data.credentials) {
        setCredentialsModal({
          isOpen: true,
          credentials: data.credentials,
        });
      }
    } catch (error) {
      console.error("Error resetting student password:", error);
      setConfirmState(null);
      setFeedback({
        type: "error",
        title: "Password was not reset",
        message: error.message || "Failed to reset student password",
      });
    }
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch(`/api/students/${editingStudent._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingStudent),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.message || "Failed to update student.");
      }

      await fetchStudents(pagination.page);
      await fetchStudentStats();
      setIsEditModalOpen(false);
      setEditingStudent(null);
      setFeedback({
        type: "success",
        title: "Student updated",
        message: `${data.name || editingStudent.name} has been saved successfully.`,
      });
    } catch (error) {
      console.error("Error updating student:", error);
      setFeedback({
        type: "error",
        title: "Student was not updated",
        message: error.message || "Please retry after checking the details.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const statusCounts = studentStats?.byStatus || {};
  const totalStudentCount =
    typeof studentStats?.total === "number"
      ? studentStats.total
      : pagination.totalStudents || students.length;
  const activeStudentCount = Number(statusCounts.ACTIVE || 0);
  const inactiveStudentCount =
    Number(statusCounts.INACTIVE || 0) + Number(statusCounts.SUSPENDED || 0);
  const alumniStudentCount = Number(statusCounts.ALUMNI || 0);
  const participationReady =
    totalStudentCount > 0
      ? Math.round((activeStudentCount / totalStudentCount) * 100)
      : 0;

  const metricCards = [
    {
      label: "Total Students",
      value: totalStudentCount,
      note: `${activeStudentCount} active`,
      icon: FaUserGraduate,
      tone: "purple",
    },
    {
      label: "Active Students",
      value: activeStudentCount,
      note: "Ready for events",
      icon: FaCheckCircle,
      tone: "emerald",
    },
    {
      label: "Inactive Records",
      value: inactiveStudentCount,
      note: "Not active now",
      icon: FaUserSlash,
      tone: "amber",
    },
    {
      label: "Participation Ready",
      value: `${participationReady}%`,
      note: `${activeStudentCount} of ${totalStudentCount || 0} students`,
      icon: FaChartLine,
      tone: "blue",
    },
    {
      label: "Graduated",
      value: alumniStudentCount,
      note: "Alumni records",
      icon: FaGraduationCap,
      tone: "violet",
    },
  ];

  const toneClasses = {
    purple: "border-purple-100 bg-purple-50 text-purple-700",
    emerald: "border-emerald-100 bg-emerald-50 text-emerald-700",
    amber: "border-amber-100 bg-amber-50 text-amber-700",
    blue: "border-blue-100 bg-blue-50 text-[#0a2f66]",
    violet: "border-violet-100 bg-violet-50 text-violet-700",
  };

  const statusStyles = {
    ACTIVE: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    INACTIVE: "bg-slate-100 text-slate-600 ring-slate-200",
    SUSPENDED: "bg-amber-50 text-amber-700 ring-amber-200",
    ALUMNI: "bg-purple-50 text-purple-700 ring-purple-200",
  };

  const initialsFor = (name = "Student") =>
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "ST";

  return (
    <div className="space-y-5">
      {!hideGradeFilter && (
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-black text-[#17120a]">Students</h1>
            <p className="mt-2 text-base text-[#52657d]">
              Manage student accounts, login IDs, participation, and access.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/school/dashboard?tab=register-student"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#dbe5f4] bg-white px-4 text-sm font-black text-[#0a2f66] shadow-sm transition hover:bg-[#f8fbff]"
            >
              <FaUpload />
              Import Students
            </Link>
            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#dbe5f4] bg-white px-4 text-sm font-black text-[#0a2f66] shadow-sm transition hover:bg-[#f8fbff]"
            >
              <FaDownload />
              Export CSV
            </button>
            <Link
              href="/school/dashboard?tab=register-student"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-purple-700 px-5 text-sm font-black text-white shadow-sm transition hover:bg-purple-800"
            >
              <FaPlus />
              Add Student
            </Link>
          </div>
        </div>
      )}

      {!hideGradeFilter && (
        <StudentTransferPanel
          grades={grades}
          onChanged={() => fetchStudents(pagination.page)}
        />
      )}

      {!hideGradeFilter && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {metricCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.label}
                className="rounded-2xl border border-[#e6eaf7] bg-white p-5 shadow-sm"
              >
                <div className="flex items-center gap-4">
                  <span
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${
                      toneClasses[card.tone]
                    }`}
                  >
                    <Icon />
                  </span>
                  <span className="min-w-0">
                    <strong className="block text-2xl font-black text-[#17120a]">
                      {card.value}
                    </strong>
                    <span className="block truncate text-sm font-black text-[#24314d]">
                      {card.label}
                    </span>
                    <span className="mt-1 block text-xs font-bold text-[#52657d]">
                      {card.note}
                    </span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {feedback && (
        <AlertBanner
          type={feedback.type}
          title={feedback.title}
          message={feedback.message}
          action={
            feedback.retry ? (
              <button
                type="button"
                onClick={feedback.retry}
                className="rounded-lg bg-white/80 px-3 py-2 text-xs font-black text-slate-900 transition hover:bg-white"
              >
                Retry
              </button>
            ) : null
          }
        />
      )}

      {/* Filters */}
      <div className="rounded-2xl border border-[#e6eaf7] bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[minmax(240px,1fr)_180px_180px_auto]">
          <div className="relative">
            <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-[#75869b]" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name, roll, login ID, or parent..."
              className="h-12 w-full rounded-xl border border-[#dbe5f4] bg-[#f8fbff] pl-11 pr-4 text-sm font-semibold outline-none transition focus:border-purple-300"
            />
          </div>
          {!hideGradeFilter && (
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="h-12 rounded-xl border border-[#dbe5f4] bg-white px-4 text-sm font-black text-[#24314d] outline-none transition focus:border-purple-300"
            >
              <option value="">All Grades</option>
              {grades.map((g) => (
                <option key={g._id} value={g.originalValue || g._id}>
                  {g.name}
                </option>
              ))}
            </select>
          )}

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="h-12 rounded-xl border border-[#dbe5f4] bg-white px-4 text-sm font-black text-[#24314d] outline-none transition focus:border-purple-300"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active Students</option>
            <option value="ALUMNI">Alumni (Graduated)</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="INACTIVE">Inactive</option>
          </select>
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setSelectedStatus("ALL");
              setSelectedGrade(initialGrade || "");
            }}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-[#dbe5f4] bg-white px-4 text-sm font-black text-[#0a2f66] transition hover:bg-[#f8fbff]"
          >
            <FaFilter />
            Clear Filters
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-[#e1e7f2] bg-white shadow-[0_14px_34px_rgba(10,47,102,0.08)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm text-[#27344a]">
            <thead className="border-b border-[#e1e7f2] bg-[#f8fbff] text-[11px] uppercase text-[#75869b]">
              <tr>
                <th className="w-12 px-4 py-3">
                  <input type="checkbox" className="h-4 w-4 rounded border-[#c8d4e6]" />
                </th>
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Grade & Roll</th>
                <th className="px-4 py-3">Login ID</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Parent / Contact</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e1e7f2]">
              {loading ? (
                <tr>
                  <td colSpan="8" className="p-8 text-center text-slate-500">
                    <TableSkeleton />
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-8 text-center text-slate-500">
                    <EmptyState
                      title={search ? "No students match this search" : "No students added yet"}
                      description={
                        search
                          ? "Try a different name, roll number, username, or student ID."
                          : "Add students manually or upload a CSV so they can access events, notices, writing, and magazine content."
                      }
                    />
                  </td>
                </tr>
              ) : (
                students.map((student) => (
                  <tr key={student._id} className="transition-colors hover:bg-[#f8fbff]">
                    <td className="px-4 py-3">
                      <input type="checkbox" className="h-4 w-4 rounded border-[#c8d4e6]" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple-50 text-xs font-black text-purple-700">
                          {initialsFor(student.name)}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-black text-[#17120a]">
                            {student.name}
                          </span>
                          <span className="block truncate text-xs font-bold text-[#75869b]">
                            {student.platformStudentId || "Student ID pending"}
                          </span>
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-[#24314d]">{student.grade || "No grade"}</div>
                      <div className="text-xs font-semibold text-[#75869b]">
                        Roll: {student.rollNumber || "-"}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#24314d]">
                          {student.username || "Pending"}
                        </span>
                        {student.username && (
                          <button
                            type="button"
                            onClick={() => handleCopyLogin(student)}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-[#dbe5f4] text-[#52657d] transition hover:bg-purple-50 hover:text-purple-700"
                            title="Copy login ID"
                          >
                            <FaCopy className="text-xs" />
                          </button>
                        )}
                      </div>
                      <div className="text-xs font-semibold text-[#75869b]">Student login ID</div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black ring-1 ${
                          statusStyles[String(student.status || "ACTIVE").toUpperCase()] ||
                          statusStyles.INACTIVE
                        }`}
                      >
                        {String(student.status || "ACTIVE").toUpperCase() === "ACTIVE" ? (
                          <FaCheckCircle />
                        ) : (
                          <FaUserClock />
                        )}
                        {student.status || "ACTIVE"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-[#24314d]">
                        {student.parentName || "Not provided"}
                      </div>
                      <div className="text-xs font-semibold text-[#75869b]">
                        {student.parentContactNumber ||
                          student.parentPhone ||
                          student.parentEmail ||
                          "No contact"}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-[#24314d]">
                        {student.email || "No email"}
                      </div>
                      <div className="text-xs font-semibold text-[#75869b]">
                        {student.phone || "No phone"}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(student)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#dbe5f4] bg-white text-[#0a2f66] transition hover:bg-[#f8fbff]"
                          title="Edit Student"
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => requestResetPassword(student)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#dbe5f4] bg-white text-[#0a2f66] transition hover:bg-[#f8fbff]"
                          title="Reset Password"
                        >
                          <FaKey />
                        </button>
                        <button
                          onClick={() => requestDelete(student)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-rose-200 bg-rose-50 text-rose-800 transition hover:bg-rose-100"
                          title="Delete Student"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {!loading && students.length > 0 && (
            <div className="border-t border-[#e1e7f2] p-4">
                <PaginationControls
                    currentPage={pagination.page}
                    totalPages={pagination.totalPages}
                    onPageChange={handlePageChange}
                    totalItems={pagination.totalStudents}
                    start={pagination.start}
                    end={pagination.end}
                />
            </div>
        )}
      </div>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Student Details"
      >
        {editingStudent && (
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={editingStudent.name}
                  onChange={(e) => setEditingStudent({ ...editingStudent, name: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Email</label>
                <input
                  type="email"
                  value={editingStudent.email || ""}
                  onChange={(e) => setEditingStudent({ ...editingStudent, email: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Grade</label>
                <select
                  value={editingStudent.grade}
                  onChange={(e) => setEditingStudent({ ...editingStudent, grade: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white focus:border-blue-500 outline-none"
                >
                  {grades.map((g) => (
                    <option key={g._id} value={g.originalValue || g._id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Roll Number</label>
                <input
                  type="text"
                  required
                  value={editingStudent.rollNumber}
                  onChange={(e) => setEditingStudent({ ...editingStudent, rollNumber: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Phone</label>
                <input
                  type="text"
                  value={editingStudent.phone || ""}
                  onChange={(e) => setEditingStudent({ ...editingStudent, phone: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Gender</label>
                <select
                  value={editingStudent.gender || ""}
                  onChange={(e) => setEditingStudent({ ...editingStudent, gender: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white focus:border-blue-500 outline-none"
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Parent Name</label>
                <input
                  type="text"
                  value={editingStudent.parentName || ""}
                  onChange={(e) => setEditingStudent({ ...editingStudent, parentName: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Parent Phone</label>
                <input
                  type="text"
                  value={editingStudent.parentPhone || ""}
                  onChange={(e) => setEditingStudent({ ...editingStudent, parentPhone: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Status</label>
                <select
                  value={editingStudent.status || "ACTIVE"}
                  onChange={(e) => setEditingStudent({ ...editingStudent, status: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white focus:border-blue-500 outline-none"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive (Left School)</option>
                  <option value="SUSPENDED">Suspended</option>
                  <option value="ALUMNI">Alumni (Graduated)</option>
                </select>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        )}
      </Modal>

      <CredentialsModal
        isOpen={credentialsModal.isOpen}
        credentials={credentialsModal.credentials}
        onClose={() =>
          setCredentialsModal({ isOpen: false, credentials: null })
        }
      />

      <ConfirmDialog
        open={Boolean(confirmState)}
        title={confirmState?.title}
        message={confirmState?.message}
        confirmLabel={confirmState?.confirmLabel}
        tone={confirmState?.tone}
        busy={Boolean(confirmState?.busy)}
        onClose={() => setConfirmState(null)}
        onConfirm={() => {
          if (!confirmState?.student) return;
          if (confirmState.type === "archive") {
            executeDelete(confirmState.student);
          } else if (confirmState.type === "reset-password") {
            executeResetPassword(confirmState.student);
          }
        }}
      />
    </div>
  );
}
