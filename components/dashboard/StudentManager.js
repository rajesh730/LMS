"use client";

import { useState, useEffect, useCallback } from "react";
import {
  FaUserGraduate,
  FaEdit,
  FaTrash,
} from "react-icons/fa";
import { TableSkeleton } from "@/components/Skeletons";
import PaginationControls from "@/components/PaginationControls";
import EmptyState from "@/components/EmptyState";
import Modal from "@/components/Modal";
import StudentPromotionManager from "./StudentPromotionManager";

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

  // Edit State
  const [editingStudent, setEditingStudent] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Promotion State
  const [isPromotionModalOpen, setIsPromotionModalOpen] = useState(false);

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
      try {
        const params = new URLSearchParams({
          page,
          limit: 10,
          status: selectedStatus,
          ...(selectedGrade && { grade: selectedGrade }),
        });

        const res = await fetch(`/api/students?${params}`);
        if (res.ok) {
          const data = await res.json();
          setStudents(data.students);
          if (data.pagination) {
            setPagination({
              page: data.pagination.currentPage,
              totalPages: data.pagination.totalPages,
              totalStudents: data.pagination.totalStudents,
              limit: data.pagination.limit,
            });
          } else {
            setPagination({
              page: 1,
              totalPages: 1,
              totalStudents: data.students.length,
              limit: data.students.length,
            });
          }
        }
      } catch (error) {
        console.error("Error fetching students:", error);
      } finally {
        setLoading(false);
      }
    },
    [selectedGrade, selectedStatus]
  );

  useEffect(() => {
    fetchStudents(1);
  }, [fetchStudents]);

  // Page Change Handlers
  const handlePageChange = (newPage) => {
    fetchStudents(newPage);
  };

  const handleEdit = (student) => {
    setEditingStudent({ ...student });
    setIsEditModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this student?")) return;
    try {
      const res = await fetch(`/api/students/${id}`, { method: "DELETE" });
      if (res.ok) {
        setStudents(students.filter((s) => s._id !== id));
      } else {
        alert("Failed to delete student");
      }
    } catch (error) {
      console.error("Error deleting student:", error);
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

      if (res.ok) {
        const updatedStudent = await res.json();
        // Refresh list or update local state
        fetchStudents(pagination.page);
        setIsEditModalOpen(false);
        setEditingStudent(null);
      } else {
        const error = await res.json();
        alert(`Failed to update: ${error.message}`);
      }
    } catch (error) {
      console.error("Error updating student:", error);
      alert("Error updating student");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      {!hideGradeFilter && (
      <div className="flex justify-between items-center bg-slate-900/50 p-4 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-4">
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

        <button 
            onClick={() => setIsPromotionModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
        >
            <FaUserGraduate />
            <span>Promote Students</span>
        </button>
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
                <th className="p-4">Contact</th>
                <th className="p-4">Parent</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-slate-500">
                    <TableSkeleton />
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-slate-500">
                    <EmptyState message="No students found" />
                  </td>
                </tr>
              ) : (
                students.map((student) => (
                  <tr key={student._id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-white">{student.name}</div>
                      <div className="text-xs text-slate-500">{student.gender}</div>
                    </td>
                    <td className="p-4">
                      <div className="text-white">Grade: {student.grade}</div>
                      <div className="text-xs text-slate-500">Roll: {student.rollNumber}</div>
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
                          onClick={() => handleDelete(student._id)}
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

      {/* Promotion Modal */}
      <Modal
        isOpen={isPromotionModalOpen}
        onClose={() => setIsPromotionModalOpen(false)}
        title="Promote Students"
      >
        <StudentPromotionManager 
            onClose={() => setIsPromotionModalOpen(false)}
            onSuccess={() => {
                fetchStudents(pagination.page);
                setIsPromotionModalOpen(false);
            }}
        />
      </Modal>
    </div>
  );
}
