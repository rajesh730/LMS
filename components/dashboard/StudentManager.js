"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  FaEdit,
  FaKey,
  FaPlus,
  FaSearch,
  FaTrash,
} from "react-icons/fa";
import { TableSkeleton } from "@/components/Skeletons";
import PaginationControls from "@/components/PaginationControls";
import EmptyState from "@/components/EmptyState";
import Modal from "@/components/Modal";
import CredentialsModal from "@/components/CredentialsModal";
import AlertBanner from "@/components/ui/AlertBanner";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

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
  const [selectedStatus, setSelectedStatus] = useState("ACTIVE");
  const [search, setSearch] = useState("");

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

  return (
    <div className="space-y-6">
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
      {!hideGradeFilter && (
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 bg-slate-900/50 p-4 rounded-2xl border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="relative w-full sm:w-72">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, roll, ID..."
              className="w-full rounded-lg border border-slate-700 bg-slate-800 py-2 pl-10 pr-3 text-white outline-none transition focus:border-blue-500"
            />
          </div>
          <select
            value={selectedGrade}
            onChange={(e) => setSelectedGrade(e.target.value)}
            className="bg-slate-800 text-white p-2 rounded border border-slate-700 focus:border-emerald-500 outline-none"
          >
            <option value="">All Grades</option>
            {grades.map((g) => (
              <option key={g._id} value={g.originalValue || g._id}>
                {g.name}
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-slate-800 text-white p-2 rounded border border-slate-700 focus:border-emerald-500 outline-none"
          >
            <option value="ACTIVE">Active Students</option>
            <option value="ALUMNI">Alumni (Graduated)</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="INACTIVE">Inactive</option>
            <option value="ALL">All Records</option>
          </select>
        </div>
        <Link
          href="/school/dashboard?tab=register-student"
          className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-4 py-2 rounded-lg transition"
        >
          <FaPlus className="text-sm" />
          Add Student
        </Link>
      </div>
      )}

      {/* Table */}
      <div className="bg-slate-900/50 rounded-2xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-800 text-slate-400 uppercase text-xs">
              <tr>
                <th className="p-4">Student</th>
                <th className="p-4">Grade</th>
                <th className="p-4">Login ID</th>
                <th className="p-4">Contact</th>
                <th className="p-4">Parent</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-slate-500">
                    <TableSkeleton />
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-slate-500">
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
                  <tr key={student._id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-white">{student.name}</div>
                      <div className="text-xs text-slate-500">
                        {student.platformStudentId || "Student ID pending"}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-white">Grade: {student.grade}</div>
                      <div className="text-xs text-slate-500">Roll: {student.rollNumber}</div>
                    </td>
                    <td className="p-4">
                      <div className="text-white">{student.username || "Username pending"}</div>
                      <div className="text-xs text-slate-500">
                        Share this as the student login ID
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-white">{student.email}</div>
                      <div className="text-xs text-slate-500">{student.phone}</div>
                    </td>
                    <td className="p-4">
                      <div className="text-white">{student.parentName}</div>
                      <div className="text-xs text-slate-500">{student.parentPhone}</div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(student)}
                          className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors"
                          title="Edit Student"
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => requestResetPassword(student)}
                          className="p-2 text-slate-400 hover:text-amber-400 hover:bg-amber-400/10 rounded-lg transition-colors"
                          title="Reset Password"
                        >
                          <FaKey />
                        </button>
                        <button
                          onClick={() => requestDelete(student)}
                          className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
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
            <div className="p-4 border-t border-slate-800">
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
