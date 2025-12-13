"use client";

import { useState, useEffect, useCallback } from "react";
import {
  FaChalkboardTeacher,
  FaEdit,
  FaTrash,
  FaSearch,
  FaPlus,
  FaKey,
} from "react-icons/fa";
import Modal from "@/components/Modal";
import PasswordField from "@/components/PasswordField";
import CredentialsModal from "@/components/CredentialsModal";

export default function TeacherManager() {
  // Data State
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    totalTeachers: 0,
    limit: 10,
  });

  // Filters & Search
  const [search, setSearch] = useState("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [credentialsModal, setCredentialsModal] = useState({
    isOpen: false,
    credentials: null,
  });

  // Form State
  const initialFormState = {
    name: "",
    email: "",
    phone: "",
    address: "",
    gender: "",
    dob: "",
    bloodGroup: "",
    designation: "",
    experience: "",
    dateOfJoining: "",
    qualification: "",
    emergencyContact: "",
    subject: "",
    roles: ["SUBJECT_TEACHER"],
    employmentType: "FULL_TIME",
  };
  const [formData, setFormData] = useState(initialFormState);

  // Fetch Teachers
  const fetchTeachers = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page,
        limit: 10,
        ...(search && { search }),
      });

      const res = await fetch(`/api/teachers?${params}`);
      if (res.ok) {
        const data = await res.json();
        // Handle both paginated and non-paginated responses
        if (data.teachers) {
            setTeachers(data.teachers);
            if (data.pagination) {
                setPagination(data.pagination);
            } else {
                // Fallback if API doesn't return pagination
                setPagination({
                    page: 1,
                    totalPages: 1,
                    totalTeachers: data.teachers.length,
                    limit: data.teachers.length
                });
            }
        }
      }
    } catch (error) {
      console.error("Error fetching teachers:", error);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTeachers(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [fetchTeachers]);

  // Handlers
  const handleOpenModal = (teacher = null) => {
    if (teacher) {
      setEditingTeacher(teacher);
      setFormData({
        name: teacher.name || "",
        email: teacher.email || "",
        phone: teacher.phone || "",
        address: teacher.address || "",
        gender: teacher.gender || "",
        dob: teacher.dob ? new Date(teacher.dob).toISOString().split('T')[0] : "",
        bloodGroup: teacher.bloodGroup || "",
        designation: teacher.designation || "",
        experience: teacher.experience || "",
        dateOfJoining: teacher.dateOfJoining ? new Date(teacher.dateOfJoining).toISOString().split('T')[0] : "",
        qualification: teacher.qualification || "",
        emergencyContact: teacher.emergencyContact || "",
        subject: teacher.subject || "",
        roles: teacher.roles || ["SUBJECT_TEACHER"],
        employmentType: teacher.employmentType || "FULL_TIME",
      });
    } else {
      setEditingTeacher(null);
      setFormData(initialFormState);
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editingTeacher
        ? `/api/teachers/${editingTeacher._id}`
        : "/api/teachers";
      const method = editingTeacher ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok) {
        alert(data.message || `Teacher ${editingTeacher ? "updated" : "created"} successfully`);
        setIsModalOpen(false);
        fetchTeachers(pagination.page);
        if (!editingTeacher && data.credentials) {
            // Show credentials for new teacher
            setCredentialsModal({
                isOpen: true,
                credentials: data.credentials
            });
        }
      } else {
        alert(`Error: ${data.message}`);
      }
    } catch (error) {
      console.error("Error saving teacher:", error);
      alert("Network error");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this teacher?")) return;
    try {
      const res = await fetch(`/api/teachers/${id}`, { method: "DELETE" });
      if (res.ok) {
        alert("Teacher deleted successfully");
        fetchTeachers(pagination.page);
      } else {
        alert("Failed to delete teacher");
      }
    } catch (error) {
      console.error("Error deleting teacher:", error);
    }
  };

  const handleRoleChange = (role) => {
    if (formData.roles.includes(role)) {
      setFormData({ ...formData, roles: formData.roles.filter(r => r !== role) });
    } else {
      setFormData({ ...formData, roles: [...formData.roles, role] });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-900/50 p-4 rounded-2xl border border-slate-800">
        <div className="relative flex-1 w-full md:max-w-md">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search teachers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-800 text-white pl-10 pr-4 py-2 rounded-lg border border-slate-700 focus:border-emerald-500 outline-none"
          />
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <FaPlus /> Add Teacher
        </button>
      </div>

      {/* Table */}
      <div className="bg-slate-900/50 rounded-2xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-800 text-slate-400 uppercase text-xs">
              <tr>
                <th className="p-4">Teacher</th>
                <th className="p-4">Contact</th>
                <th className="p-4">Role & Subject</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-slate-500">
                    Loading teachers...
                  </td>
                </tr>
              ) : teachers.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-slate-500">
                    No teachers found.
                  </td>
                </tr>
              ) : (
                teachers.map((teacher) => (
                  <tr key={teacher._id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-white">{teacher.name}</div>
                      <div className="text-xs text-slate-500">{teacher.designation || "Teacher"}</div>
                    </td>
                    <td className="p-4">
                      <div className="text-white">{teacher.email}</div>
                      <div className="text-xs text-slate-500">{teacher.phone}</div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1 mb-1">
                        {teacher.roles.map((role, i) => (
                          <span key={i} className="bg-slate-700 px-2 py-0.5 rounded text-xs">
                            {role}
                          </span>
                        ))}
                      </div>
                      <div className="text-xs text-emerald-400">{teacher.subject}</div>
                    </td>
                    <td className="p-4">
                        <span className="bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded text-xs">
                            Active
                        </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setCredentialsModal({
                            isOpen: true,
                            credentials: { email: teacher.email, password: teacher.visiblePassword }
                          })}
                          className="p-2 text-yellow-400 hover:bg-yellow-400/10 rounded transition-colors"
                          title="View Credentials"
                        >
                          <FaKey />
                        </button>
                        <button
                          onClick={() => handleOpenModal(teacher)}
                          className="p-2 text-blue-400 hover:bg-blue-400/10 rounded transition-colors"
                          title="Edit"
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => handleDelete(teacher._id)}
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
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingTeacher ? "Edit Teacher" : "Add New Teacher"}
      >
        <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-4">
          {/* Personal Info */}
          <div className="md:col-span-2 font-semibold text-emerald-400 border-b border-slate-700 pb-2 mb-2">
            Personal Information
          </div>
          
          <input
            type="text"
            placeholder="Full Name *"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="bg-slate-800 text-white p-3 rounded border border-slate-700 focus:border-emerald-500"
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

          {/* Professional Info */}
          <div className="md:col-span-2 font-semibold text-emerald-400 border-b border-slate-700 pb-2 mb-2 mt-4">
            Professional Details
          </div>

          <input
            type="text"
            placeholder="Designation (e.g. Senior Teacher)"
            value={formData.designation}
            onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
            className="bg-slate-800 text-white p-3 rounded border border-slate-700 focus:border-emerald-500"
          />
          <input
            type="text"
            placeholder="Qualification (e.g. M.Sc. Physics)"
            value={formData.qualification}
            onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
            className="bg-slate-800 text-white p-3 rounded border border-slate-700 focus:border-emerald-500"
          />
          <input
            type="text"
            placeholder="Experience (e.g. 5 years)"
            value={formData.experience}
            onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
            className="bg-slate-800 text-white p-3 rounded border border-slate-700 focus:border-emerald-500"
          />
          <div className="flex flex-col">
            <label className="text-xs text-slate-400 mb-1">Date of Joining</label>
            <input
                type="date"
                value={formData.dateOfJoining}
                onChange={(e) => setFormData({ ...formData, dateOfJoining: e.target.value })}
                className="bg-slate-800 text-white p-3 rounded border border-slate-700 focus:border-emerald-500"
            />
          </div>
          <input
            type="text"
            placeholder="Primary Subject *"
            value={formData.subject}
            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
            className="bg-slate-800 text-white p-3 rounded border border-slate-700 focus:border-emerald-500"
            required
          />
          <select
            value={formData.employmentType}
            onChange={(e) => setFormData({ ...formData, employmentType: e.target.value })}
            className="bg-slate-800 text-white p-3 rounded border border-slate-700 focus:border-emerald-500"
          >
            <option value="FULL_TIME">Full Time</option>
            <option value="PART_TIME">Part Time</option>
            <option value="CONTRACT">Contract</option>
          </select>
          <input
            type="text"
            placeholder="Emergency Contact"
            value={formData.emergencyContact}
            onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
            className="bg-slate-800 text-white p-3 rounded border border-slate-700 focus:border-emerald-500"
          />

          {/* Roles */}
          <div className="md:col-span-2 mt-2">
            <label className="block text-sm text-slate-400 mb-2">Roles</label>
            <div className="flex flex-wrap gap-2">
              {['SUBJECT_TEACHER', 'CLASS_TEACHER', 'HEAD_OF_DEPARTMENT', 'COORDINATOR'].map(role => (
                <button
                  key={role}
                  type="button"
                  onClick={() => handleRoleChange(role)}
                  className={`px-3 py-1 rounded text-sm border ${
                    formData.roles.includes(role)
                      ? 'bg-emerald-600 border-emerald-500 text-white'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-emerald-500'
                  }`}
                >
                  {role.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          </div>

          <div className="md:col-span-2 flex justify-end gap-3 mt-6 pt-4 border-t border-slate-800">
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
              {editingTeacher ? <FaEdit /> : <FaPlus />}
              {editingTeacher ? "Update Teacher" : "Add Teacher"}
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
