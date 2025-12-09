"use client";

import { useState, useEffect, useCallback } from "react";
import {
  FaUserGraduate,
  FaEdit,
  FaTrash,
  FaSearch,
  FaFilter,
} from "react-icons/fa";
import CSVUploader from "@/components/CSVUploader";
import { TableSkeleton } from "@/components/Skeletons";
import PaginationControls from "@/components/PaginationControls";
import EmptyState from "@/components/EmptyState";
import StudentStatusManager from "@/components/StudentStatusManager";

export default function StudentManager({ classrooms }) {
  // Data State
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    totalStudents: 0,
    limit: 10,
  });

  // Filters & Search
  const [search, setSearch] = useState("");
  const [classroomFilter, setClassroomFilter] = useState("");

  // Forms State
  const [studentForm, setStudentForm] = useState({
    name: "",
    email: "",
    grade: "",
    parentEmail: "",
    classroom: "",
    rollNumber: "",
  });
  const [editingStudent, setEditingStudent] = useState(null);

  // Bulk Actions State
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [targetUpgradeClass, setTargetUpgradeClass] = useState("");

  // Fetch Students with Debounce for Search
  const fetchStudents = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page,
          limit: 10,
          ...(search && { search }),
          ...(classroomFilter && { classroom: classroomFilter }),
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
            // Fallback for non-paginated API
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
    [search, classroomFilter]
  );

  const refreshCurrentPage = () => fetchStudents(pagination.page || 1);

  // Initial Fetch & Refetch on Filter Change
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchStudents(1); // Reset to page 1 on filter change
    }, 500); // 500ms debounce
    return () => clearTimeout(timer);
  }, [fetchStudents]);

  // Page Change Handlers
  const handlePageChange = (newPage) => {
    fetchStudents(newPage);
  };

  // CRUD Operations
  const createStudent = async (e) => {
    e.preventDefault();

    // Validation
    if (
      !studentForm.name ||
      !studentForm.email ||
      !studentForm.classroom ||
      !studentForm.rollNumber ||
      !studentForm.parentEmail
    ) {
      alert("Please fill in all required fields");
      return;
    }

    try {
      const res = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...studentForm,
          grade:
            classrooms.find((c) => c._id === studentForm.classroom)?.name ||
            "N/A",
        }),
      });

      const data = await res.json();

      if (res.ok) {
        alert(data.message || "Student created successfully");
        setStudentForm({
          name: "",
          email: "",
          grade: "",
          parentEmail: "",
          classroom: "",
          rollNumber: "",
        });
        fetchStudents(pagination.page); // Refresh current page
      } else {
        alert(`Error: ${data.message || "Failed to create student"}`);
        console.error("Student creation failed:", data);
      }
    } catch (error) {
      console.error("Error creating student", error);
      alert("Network error: Failed to create student");
    }
  };

  const updateStudent = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/students/${editingStudent._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingStudent),
      });

      const data = await res.json();

      if (res.ok) {
        alert(data.message || "Student updated successfully");
        setEditingStudent(null);
        fetchStudents(pagination.page);
      } else {
        alert(`Error: ${data.message || "Failed to update student"}`);
        console.error("Student update failed:", data);
      }
    } catch (error) {
      console.error("Error updating student", error);
      alert("Network error: Failed to update student");
    }
  };

  const deleteStudent = async (id) => {
    if (!confirm("Delete this student?")) return;
    try {
      const res = await fetch(`/api/students/${id}`, { method: "DELETE" });
      const data = await res.json();

      if (res.ok) {
        alert(data.message || "Student deleted successfully");
        fetchStudents(pagination.page);
      } else {
        alert(`Error: ${data.message || "Failed to delete student"}`);
        console.error("Student delete failed:", data);
      }
    } catch (error) {
      console.error("Error deleting student", error);
      alert("Network error: Failed to delete student");
    }
  };

  // Bulk Operations
  const handleBulkStudentUpload = async (data) => {
    // ... (Same logic as before, just adapted)
    const normalizedData = data
      .map((item) => {
        const newItem = {};
        Object.keys(item).forEach((key) => {
          const lowerKey = key.toLowerCase().trim();
          if (
            lowerKey === "name" ||
            lowerKey === "student name" ||
            lowerKey === "studentname"
          )
            newItem.name = item[key];
          else if (
            lowerKey === "email" ||
            lowerKey === "student email" ||
            lowerKey === "studentemail"
          )
            newItem.email = item[key];
          else if (
            lowerKey === "grade" ||
            lowerKey === "class" ||
            lowerKey === "classname" ||
            lowerKey === "grade/class"
          )
            newItem.grade = item[key];
          else if (lowerKey === "parent email" || lowerKey === "parentemail")
            newItem.parentEmail = item[key];
          else if (lowerKey === "classroom") {
            const cls = classrooms.find(
              (c) => c.name.toLowerCase() === item[key].toLowerCase().trim()
            );
            if (cls) {
              newItem.classroom = cls._id;
              if (!newItem.grade) newItem.grade = cls.name;
            }
          }
        });
        if (!newItem.grade && newItem.classroom) {
          const cls = classrooms.find((c) => c._id === newItem.classroom);
          if (cls) newItem.grade = cls.name;
        }
        return newItem;
      })
      .filter((item) => item.name && item.email);

    if (normalizedData.length === 0) return alert("No valid students found.");

    try {
      const res = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(normalizedData),
      });

      const result = await res.json();

      if (res.ok) {
        alert(
          result.message ||
            `Successfully imported ${normalizedData.length} students`
        );
        fetchStudents(1);
      } else {
        alert(`Error: ${result.message || "Failed to upload students"}`);
        console.error("Bulk upload failed:", result);
      }
    } catch (error) {
      console.error("Error uploading students", error);
      alert("Network error: Failed to upload students");
    }
  };

  const handleBulkDelete = async () => {
    if (
      !confirm(
        `Are you sure you want to delete ${selectedStudents.length} students?`
      )
    )
      return;
    try {
      const res = await fetch("/api/students/bulk", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentIds: selectedStudents }),
      });

      const data = await res.json();

      if (res.ok) {
        alert(data.message || "Students deleted successfully");
        setSelectedStudents([]);
        fetchStudents(pagination.page);
      } else {
        alert(`Error: ${data.message || "Failed to delete students"}`);
        console.error("Bulk delete failed:", data);
      }
    } catch (error) {
      console.error("Bulk Delete Error", error);
      alert("Network error: Failed to delete students");
    }
  };

  const handleBulkUpgrade = async () => {
    if (!targetUpgradeClass) return alert("Please select a target class");
    try {
      const res = await fetch("/api/students/upgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentIds: selectedStudents,
          targetClassroomId: targetUpgradeClass,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        alert(data.message || "Students upgraded successfully");
        setSelectedStudents([]);
        setShowUpgradeModal(false);
        fetchStudents(pagination.page);
      } else {
        alert(`Error: ${data.message || "Failed to upgrade students"}`);
        console.error("Bulk upgrade failed:", data);
      }
    } catch (error) {
      console.error("Bulk Upgrade Error", error);
      alert("Network error: Failed to upgrade students");
    }
  };

  return (
    <div className="space-y-6">
      {/* Create Student Form */}
      <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
        <h2 className="text-xl font-semibold text-white mb-4">
          {editingStudent ? "Edit Student" : "Add New Student"}
        </h2>
        <form
          onSubmit={editingStudent ? updateStudent : createStudent}
          className="grid md:grid-cols-2 gap-4"
        >
          <input
            type="text"
            placeholder="Student Name"
            value={
              (editingStudent ? editingStudent.name : studentForm.name) || ""
            }
            onChange={(e) =>
              editingStudent
                ? setEditingStudent({ ...editingStudent, name: e.target.value })
                : setStudentForm({ ...studentForm, name: e.target.value })
            }
            className="bg-slate-800 text-white p-2 rounded border border-slate-700 focus:border-emerald-500"
            required
          />
          <input
            type="email"
            placeholder="Email"
            value={
              (editingStudent ? editingStudent.email : studentForm.email) || ""
            }
            onChange={(e) =>
              editingStudent
                ? setEditingStudent({
                    ...editingStudent,
                    email: e.target.value,
                  })
                : setStudentForm({ ...studentForm, email: e.target.value })
            }
            className="bg-slate-800 text-white p-2 rounded border border-slate-700 focus:border-emerald-500"
            required
          />
          <select
            value={
              (editingStudent
                ? editingStudent.classroom?._id || editingStudent.classroom
                : studentForm.classroom) || ""
            }
            onChange={(e) =>
              editingStudent
                ? setEditingStudent({
                    ...editingStudent,
                    classroom: e.target.value,
                  })
                : setStudentForm({ ...studentForm, classroom: e.target.value })
            }
            className="bg-slate-800 text-white p-2 rounded border border-slate-700 focus:border-emerald-500"
            required
          >
            <option value="">Select Class</option>
            {classrooms.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Roll Number"
            value={
              (editingStudent
                ? editingStudent.rollNumber
                : studentForm.rollNumber) || ""
            }
            onChange={(e) =>
              editingStudent
                ? setEditingStudent({
                    ...editingStudent,
                    rollNumber: e.target.value,
                  })
                : setStudentForm({ ...studentForm, rollNumber: e.target.value })
            }
            className="bg-slate-800 text-white p-2 rounded border border-slate-700 focus:border-emerald-500"
            required
          />
          <input
            type="email"
            placeholder="Parent Email"
            value={
              (editingStudent
                ? editingStudent.parentEmail
                : studentForm.parentEmail) || ""
            }
            onChange={(e) =>
              editingStudent
                ? setEditingStudent({
                    ...editingStudent,
                    parentEmail: e.target.value,
                  })
                : setStudentForm({
                    ...studentForm,
                    parentEmail: e.target.value,
                  })
            }
            className="bg-slate-800 text-white p-2 rounded border border-slate-700 focus:border-emerald-500"
            required
          />
          <div className="md:col-span-2 flex gap-2">
            {editingStudent && (
              <button
                type="button"
                onClick={() => setEditingStudent(null)}
                className="flex-1 bg-slate-700 text-white px-4 py-2 rounded font-bold hover:bg-slate-600"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              className="flex-1 bg-emerald-600 text-white px-4 py-2 rounded font-bold hover:bg-emerald-500"
            >
              {editingStudent ? "Update Student" : "Add Student"}
            </button>
          </div>
        </form>
      </div>

      {/* Controls & list */}
      <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <FaUserGraduate className="text-emerald-400" />
            Student List
            {pagination.totalStudents > 0 && (
              <span className="text-sm font-normal text-slate-400">
                ({pagination.totalStudents})
              </span>
            )}
          </h2>

          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:flex-none">
              <FaSearch className="absolute left-3 top-3 text-slate-500" />
              <input
                type="text"
                placeholder="Search students..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-slate-800 text-white pl-10 pr-4 py-2 rounded-lg border border-slate-700 w-full focus:border-emerald-500 outline-none"
              />
            </div>
            <select
              value={classroomFilter}
              onChange={(e) => setClassroomFilter(e.target.value)}
              className="bg-slate-800 text-white p-2 rounded-lg border border-slate-700 focus:border-emerald-500 outline-none"
            >
              <option value="">All Classes</option>
              {classrooms.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {selectedStudents.length > 0 && (
          <div className="bg-emerald-900/20 border border-emerald-900/50 p-2 mb-4 rounded flex items-center justify-between">
            <span className="text-emerald-400 text-sm font-medium px-2">
              {selectedStudents.length} Selected
            </span>
            <div className="flex gap-2">
              <button
                onClick={handleBulkDelete}
                className="bg-red-600/20 text-red-400 hover:bg-red-600/30 px-3 py-1 rounded text-sm font-medium transition"
              >
                Delete
              </button>
              <button
                onClick={() => setShowUpgradeModal(true)}
                className="bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 px-3 py-1 rounded text-sm font-medium transition"
              >
                Upgrade Class
              </button>
            </div>
          </div>
        )}

        {/* Table or Loading or Empty */}
        {loading ? (
          <TableSkeleton rows={5} cols={5} />
        ) : students.length > 0 ? (
          <>
            <div className="overflow-x-auto rounded-lg border border-slate-800">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-800/50 text-slate-400 uppercase text-xs">
                  <tr>
                    <th className="p-4 w-10">
                      <input
                        type="checkbox"
                        onChange={(e) => {
                          if (e.target.checked)
                            setSelectedStudents(students.map((s) => s._id));
                          else setSelectedStudents([]);
                        }}
                        className="rounded border-slate-600 bg-slate-700 text-emerald-500"
                      />
                    </th>
                    <th className="p-4">Name</th>
                    <th className="p-4">Class</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Credentials (Email / Pass)</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr
                      key={student._id}
                      className="border-b border-slate-800 hover:bg-slate-800/50 transition"
                    >
                      <td className="p-4">
                        <input
                          type="checkbox"
                          checked={selectedStudents.includes(student._id)}
                          onChange={(e) => {
                            if (e.target.checked)
                              setSelectedStudents([
                                ...selectedStudents,
                                student._id,
                              ]);
                            else
                              setSelectedStudents(
                                selectedStudents.filter(
                                  (id) => id !== student._id
                                )
                              );
                          }}
                          className="rounded border-slate-600 bg-slate-700 text-emerald-500"
                        />
                      </td>
                      <td className="p-4 font-medium text-white">
                        {student.name}
                      </td>
                      <td className="p-4">
                        <span className="bg-slate-800 text-slate-300 px-2 py-1 rounded text-xs border border-slate-700">
                          {student.classroom?.name || student.grade}
                        </span>
                      </td>
                      <td className="p-4">
                        <StudentStatusManager
                          studentId={student._id}
                          currentStatus={student.status || "ACTIVE"}
                          onStatusChanged={refreshCurrentPage}
                        />
                      </td>
                      <td className="p-4">
                        <div className="text-slate-300">{student.email}</div>
                        {student.visiblePassword && (
                          <div className="text-xs text-emerald-400 font-mono mt-1">
                            Pass: {student.visiblePassword}
                          </div>
                        )}
                      </td>
                      <td className="p-4 flex gap-2 justify-end">
                        <button
                          onClick={() => setEditingStudent(student)}
                          className="text-blue-400 hover:bg-blue-400/10 p-2 rounded transition"
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => deleteStudent(student._id)}
                          className="text-red-400 hover:bg-red-400/10 p-2 rounded transition"
                        >
                          <FaTrash />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <PaginationControls
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={handlePageChange}
            />
          </>
        ) : (
          <EmptyState
            title="No Students Found"
            description={
              search
                ? `No results for "${search}"`
                : "Get started by adding your first student!"
            }
            icon={FaUserGraduate}
          />
        )}
      </div>

      {/* Bulk Import */}
      <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 mt-6">
        <h2 className="text-xl font-semibold text-white mb-4">Bulk Import</h2>
        <CSVUploader
          onUpload={handleBulkStudentUpload}
          label="Upload Students CSV"
        />
      </div>

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 p-6 rounded-2xl border border-slate-700 max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-4">
              Upgrade Selected Students
            </h3>
            <p className="text-slate-400 mb-4">
              Select the new class for the {selectedStudents.length} selected
              students.
            </p>
            <select
              value={targetUpgradeClass}
              onChange={(e) => setTargetUpgradeClass(e.target.value)}
              className="bg-slate-800 text-white p-3 rounded-lg border border-slate-700 w-full mb-6"
            >
              <option value="">Select Target Class</option>
              {classrooms.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
            <div className="flex gap-4">
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="flex-1 bg-slate-800 py-2 rounded-lg text-white font-medium hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkUpgrade}
                className="flex-1 bg-emerald-600 py-2 rounded-lg text-white font-medium hover:bg-emerald-500"
              >
                Confirm Upgrade
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
