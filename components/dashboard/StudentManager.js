"use client";

import { useState, useEffect, useCallback } from "react";
import {
  FaUserGraduate,
  FaEdit,
  FaTrash,
  FaPlus,
  FaKey
} from "react-icons/fa";
import { TableSkeleton } from "@/components/Skeletons";
import PaginationControls from "@/components/PaginationControls";
import EmptyState from "@/components/EmptyState";
import Modal from "@/components/Modal";
import CredentialsModal from "@/components/CredentialsModal";

export default function StudentManager() {
  // Data State
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    totalStudents: 0,
    limit: 10,
  });

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [credentialsModal, setCredentialsModal] = useState({
    isOpen: false,
    credentials: null,
  });

  // Tab State
  const [activeTab, setActiveTab] = useState("personal");

  // Form State
  const initialFormState = {
    name: "",
    email: "",
    grade: "",
    section: "",
    rollNumber: "",
    phone: "",
    address: "",
    gender: "",
    dob: "",
    bloodGroup: "",
    parentName: "",
    parentEmail: "",
    parentPhone: "",
    emergencyContact: "",
  };
  const [formData, setFormData] = useState(initialFormState);

  // Fetch Students
  const fetchStudents = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page,
          limit: 10,
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
    []
  );

  useEffect(() => {
    fetchStudents(1);
  }, [fetchStudents]);

  // Page Change Handlers
  const handlePageChange = (newPage) => {
    fetchStudents(newPage);
  };

  // Handlers
  const handleOpenModal = (student = null) => {
    if (student) {
      setEditingStudent(student);
      setFormData({
        name: student.name || "",
        email: student.email || "",
        grade: student.grade || "",
        section: student.section || "",
        rollNumber: student.rollNumber || "",
        phone: student.phone || "",
        address: student.address || "",
        gender: student.gender || "",
        dob: student.dob ? new Date(student.dob).toISOString().split('T')[0] : "",
        bloodGroup: student.bloodGroup || "",
        parentName: student.parentName || "",
        parentEmail: student.parentEmail || "",
        parentPhone: student.parentPhone || "",
        emergencyContact: student.emergencyContact || "",
      });
    } else {
      setEditingStudent(null);
      setFormData(initialFormState);
    }
    setIsModalOpen(true);
    setActiveTab("personal");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (
      !formData.name ||
      !formData.email ||
      !formData.grade ||
      !formData.rollNumber ||
      !formData.parentEmail
    ) {
      alert("Please fill in all required fields");
      return;
    }

    try {
      const url = editingStudent
        ? `/api/students/${editingStudent._id}`
        : "/api/students";
      const method = editingStudent ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok) {
        alert(data.message || `Student ${editingStudent ? "updated" : "created"} successfully`);
        setIsModalOpen(false);
        fetchStudents(pagination.page);
        
        if (!editingStudent && data.credentials) {
             setCredentialsModal({
                isOpen: true,
                credentials: data.credentials
            });
        }
      } else {
        alert(`Error: ${data.message || "Operation failed"}`);
      }
    } catch (error) {
      console.error("Error saving student:", error);
      alert("Network error");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this student?")) return;
    try {
      const res = await fetch(`/api/students/${id}`, { method: "DELETE" });
      const data = await res.json();

      if (res.ok) {
        alert(data.message || "Student deleted successfully");
        fetchStudents(pagination.page);
      } else {
        alert(`Error: ${data.message || "Failed to delete student"}`);
      }
    } catch (error) {
      console.error("Error deleting student:", error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex justify-end">
        <button
        onClick={() => handleOpenModal()}
        className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
        <FaPlus /> Add Student
        </button>
      </div>

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
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setCredentialsModal({
                            isOpen: true,
                            credentials: { 
                                username: student.username,
                                email: student.email, 
                                password: student.visiblePassword 
                            }
                          })}
                          className="p-2 text-yellow-400 hover:bg-yellow-400/10 rounded transition-colors"
                          title="View Credentials"
                        >
                          <FaKey />
                        </button>
                        <button
                          onClick={() => handleOpenModal(student)}
                          className="p-2 text-blue-400 hover:bg-blue-400/10 rounded transition-colors"
                          title="Edit"
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => handleDelete(student._id)}
                          className="p-2 text-red-400 hover:bg-red-400/10 rounded transition-colors"
                          title="Delete"
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

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingStudent ? "Edit Student" : "Add New Student"}
      >
        {/* Tab Navigation */}
        <div className="flex border-b border-slate-700 mb-6">
          <button
            type="button"
            onClick={() => setActiveTab("personal")}
            className={`px-4 py-2 text-sm font-medium transition-colors relative ${
              activeTab === "personal"
                ? "text-emerald-400"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Personal
            {activeTab === "personal" && (
              <div className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-400" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("grade")}
            className={`px-4 py-2 text-sm font-medium transition-colors relative ${
              activeTab === "grade"
                ? "text-emerald-400"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Grade
            {activeTab === "grade" && (
              <div className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-400" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("guardian")}
            className={`px-4 py-2 text-sm font-medium transition-colors relative ${
              activeTab === "guardian"
                ? "text-emerald-400"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Guardian
            {activeTab === "guardian" && (
              <div className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-400" />
            )}
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid md:grid-cols-2 gap-4">
            {/* Personal Info */}
            {activeTab === "personal" && (
              <>
                <input
                  type="text"
                  placeholder="Full Name *"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="bg-slate-800 text-white p-3 rounded border border-slate-700 focus:border-emerald-500 md:col-span-2"
                  required
                />
                <input
                  type="email"
                  placeholder="Email *"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="bg-slate-800 text-white p-3 rounded border border-slate-700 focus:border-emerald-500"
                  required
                />
                <input
                  type="text"
                  placeholder="Phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="bg-slate-800 text-white p-3 rounded border border-slate-700 focus:border-emerald-500"
                />
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  className="bg-slate-800 text-white p-3 rounded border border-slate-700 focus:border-emerald-500"
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
                <input
                  type="date"
                  placeholder="Date of Birth"
                  value={formData.dob}
                  onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                  className="bg-slate-800 text-white p-3 rounded border border-slate-700 focus:border-emerald-500"
                />
                <select
                  value={formData.bloodGroup}
                  onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                  className="bg-slate-800 text-white p-3 rounded border border-slate-700 focus:border-emerald-500"
                >
                  <option value="">Blood Group</option>
                  {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => <option key={bg} value={bg}>{bg}</option>)}
                </select>
                <input
                  type="text"
                  placeholder="Address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="bg-slate-800 text-white p-3 rounded border border-slate-700 focus:border-emerald-500 md:col-span-2"
                />
              </>
            )}

            {/* Grade Info */}
            {activeTab === "grade" && (
              <>
                <input
                  type="text"
                  placeholder="Grade/Class *"
                  value={formData.grade}
                  onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                  className="bg-slate-800 text-white p-3 rounded border border-slate-700 focus:border-emerald-500 md:col-span-2"
                  required
                />
                <input
                  type="text"
                  placeholder="Section"
                  value={formData.section}
                  onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                  className="bg-slate-800 text-white p-3 rounded border border-slate-700 focus:border-emerald-500"
                />
                <input
                  type="text"
                  placeholder="Roll Number *"
                  value={formData.rollNumber}
                  onChange={(e) => setFormData({ ...formData, rollNumber: e.target.value })}
                  className="bg-slate-800 text-white p-3 rounded border border-slate-700 focus:border-emerald-500"
                  required
                />
              </>
            )}

            {/* Parent Info */}
            {activeTab === "guardian" && (
              <>
                <input
                  type="text"
                  placeholder="Parent Name"
                  value={formData.parentName}
                  onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
                  className="bg-slate-800 text-white p-3 rounded border border-slate-700 focus:border-emerald-500 md:col-span-2"
                />
                <input
                  type="email"
                  placeholder="Parent Email *"
                  value={formData.parentEmail}
                  onChange={(e) => setFormData({ ...formData, parentEmail: e.target.value })}
                  className="bg-slate-800 text-white p-3 rounded border border-slate-700 focus:border-emerald-500"
                  required
                />
                <input
                  type="text"
                  placeholder="Parent Phone"
                  value={formData.parentPhone}
                  onChange={(e) => setFormData({ ...formData, parentPhone: e.target.value })}
                  className="bg-slate-800 text-white p-3 rounded border border-slate-700 focus:border-emerald-500"
                />
                <input
                  type="text"
                  placeholder="Emergency Contact"
                  value={formData.emergencyContact}
                  onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                  className="bg-slate-800 text-white p-3 rounded border border-slate-700 focus:border-emerald-500"
                />
              </>
            )}
          </div>

          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-6 py-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded font-bold transition-colors flex items-center gap-2"
            >
              {editingStudent ? <FaEdit /> : <FaPlus />}
              {editingStudent ? "Update Student" : "Add Student"}
            </button>
          </div>
        </form>
      </Modal>

      <CredentialsModal
        isOpen={credentialsModal.isOpen}
        onClose={() => setCredentialsModal({ isOpen: false, credentials: null })}
        credentials={credentialsModal.credentials}
      />
    </div>
  );
}
