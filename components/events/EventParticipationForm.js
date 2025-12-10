"use client";

import { useState, useEffect } from "react";
import {
  FaPhone,
  FaUser,
  FaSchool,
  FaSearch,
  FaTimes,
  FaCheck,
  FaUsers,
} from "react-icons/fa";
import { useSession } from "next-auth/react";

export default function EventParticipationForm({ event, onSuccess }) {
  const { data: session } = useSession();
  const [formData, setFormData] = useState({
    contactPerson: "",
    phone: "",
    notes: "",
    selectedStudents: [],
  });

  const [students, setStudents] = useState([]);
  const [classFilter, setClassFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [classes, setClasses] = useState([]);

  // New states for interested students
  const [interestedStudents, setInterestedStudents] = useState([]);
  const [interestedFilter, setInterestedFilter] = useState("all"); // all, pending, approved, rejected
  const [interestedClassFilter, setInterestedClassFilter] = useState("all");
  const [interestedSearch, setInterestedSearch] = useState("");
  const [loadingInterested, setLoadingInterested] = useState(true);

  useEffect(() => {
    loadStudents();
    loadClasses();
    loadInterestedStudents();
  }, []);

  const loadClasses = async () => {
    try {
      const res = await fetch("/api/classrooms");
      if (res.ok) {
        const data = await res.json();
        setClasses(Array.isArray(data) ? data : []);
      } else {
        setClasses([]);
      }
    } catch (error) {
      console.error("Error loading classes:", error);
      setClasses([]);
    }
  };

  const loadInterestedStudents = async () => {
    try {
      setLoadingInterested(true);
      const res = await fetch(`/api/events/${event._id}/manage`);
      if (res.ok) {
        const data = await res.json();
        setInterestedStudents(Array.isArray(data.requests) ? data.requests : []);
      } else {
        setInterestedStudents([]);
      }
    } catch (error) {
      console.error("Error loading interested students:", error);
      setInterestedStudents([]);
    } finally {
      setLoadingInterested(false);
    }
  };

  const loadStudents = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/students?page=1&limit=500");
      if (res.ok) {
        const data = await res.json();
        setStudents(Array.isArray(data.students) ? data.students : []);
      } else {
        setStudents([]);
      }
    } catch (error) {
      console.error("Error loading students:", error);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter((student) => {
    const matchesSearch = student.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesClass =
      classFilter === "all" || student.className === classFilter;
    return matchesSearch && matchesClass;
  });

  const handleStudentToggle = (studentId) => {
    setFormData((prev) => ({
      ...prev,
      selectedStudents: prev.selectedStudents.includes(studentId)
        ? prev.selectedStudents.filter((id) => id !== studentId)
        : [...prev.selectedStudents, studentId],
    }));
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setFormData((prev) => ({
        ...prev,
        selectedStudents: filteredStudents.map((s) => s._id),
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        selectedStudents: [],
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.contactPerson.trim()) {
      alert("Please enter contact person name");
      return;
    }
    if (!formData.phone.trim()) {
      alert("Please enter phone number");
      return;
    }
    if (formData.selectedStudents.length === 0) {
      alert("Please select at least one student");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch(`/api/events/${event._id}/participate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactPerson: formData.contactPerson,
          phone: formData.phone,
          notes: formData.notes,
          studentIds: formData.selectedStudents,
        }),
      });

      if (res.ok) {
        alert("Participation request submitted successfully!");
        onSuccess?.();
      } else {
        const data = await res.json();
        alert(data.message || "Error submitting participation request");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Error submitting request");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2 className="text-3xl font-bold text-white mb-8">
        {session?.user?.role === 'STUDENT' ? 'Join Event:' : 'Manage Event Participation:'} <span className="text-emerald-400">{event.title}</span>
      </h2>

      {/* 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* LEFT COLUMN: Contact Details */}
        <div>
          <div className="mb-8">
            <h3 className="text-lg font-bold text-emerald-400 mb-6 flex items-center gap-2">
              <FaUser className="text-xl" /> Contact Details
            </h3>

            {/* Contact Person */}
            <div className="mb-6">
              <label className="block text-slate-300 font-medium mb-2">
                Contact Person *
              </label>
              <input
                type="text"
                placeholder="Enter name of contact person"
                value={formData.contactPerson}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    contactPerson: e.target.value,
                  }))
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition"
              />
              <p className="text-slate-500 text-xs mt-1">
                Name of the person coordinating the participation
              </p>
            </div>

            {/* Phone */}
            <div className="mb-6">
              <label className="block text-slate-300 font-medium mb-2 flex items-center gap-2">
                <FaPhone className="text-emerald-400" /> Contact Phone *
              </label>
              <input
                type="tel"
                placeholder="Enter contact phone number"
                value={formData.phone}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, phone: e.target.value }))
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition"
              />
              <p className="text-slate-500 text-xs mt-1">
                Phone number for event coordination
              </p>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-slate-300 font-medium mb-2">
                Notes (Optional)
              </label>
              <textarea
                placeholder="Any questions, special requirements, or additional notes..."
                value={formData.notes}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, notes: e.target.value }))
                }
                rows="4"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition resize-none"
              />
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Student Selection */}
        <div>
          <h3 className="text-lg font-bold text-emerald-400 mb-2 flex items-center gap-2">
            <FaUser className="text-xl" /> Select Students
          </h3>
          <p className="text-slate-400 text-sm mb-6">
            {formData.selectedStudents.length} student
            {formData.selectedStudents.length !== 1 ? "s" : ""} selected
          </p>

          {/* Search & Filter Bar */}
          <div className="mb-6 space-y-3">
            {/* Search */}
            <div className="flex items-center gap-2 bg-slate-900 rounded-lg px-3 py-2 border border-slate-700 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 transition">
              <FaSearch className="text-slate-500" />
              <input
                type="text"
                placeholder="Search student name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent outline-none text-white placeholder-slate-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="text-slate-500 hover:text-slate-300"
                >
                  <FaTimes />
                </button>
              )}
            </div>

            {/* Class Filter */}
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition"
            >
              <option value="all">All Classes</option>
              {Array.isArray(classes) && classes.map((cls) => (
                <option key={cls._id} value={cls.name}>
                  {cls.name}
                </option>
              ))}
            </select>
          </div>

          {/* Students List */}
          <div className="bg-slate-900/50 rounded-lg border border-slate-700 overflow-hidden">
            {loading ? (
              <div className="p-6 text-center text-slate-400">
                Loading students...
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="p-6 text-center text-slate-400">
                No students found
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto">
                {/* Select All */}
                <div className="flex items-center gap-3 p-4 bg-slate-800/50 border-b border-slate-700">
                  <input
                    type="checkbox"
                    checked={
                      filteredStudents.length > 0 &&
                      filteredStudents.every((s) =>
                        formData.selectedStudents.includes(s._id)
                      )
                    }
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="w-5 h-5 rounded cursor-pointer accent-emerald-500"
                  />
                  <span className="text-white font-medium flex-1">
                    Select All ({filteredStudents.length})
                  </span>
                  {formData.selectedStudents.length > 0 && (
                    <span className="text-xs bg-emerald-900/50 text-emerald-200 px-3 py-1 rounded-full">
                      {formData.selectedStudents.length} selected
                    </span>
                  )}
                </div>

                {/* Students */}
                <div className="divide-y divide-slate-700">
                  {Array.isArray(filteredStudents) && filteredStudents.map((student) => (
                    <label
                      key={student._id}
                      className="flex items-center gap-3 p-4 hover:bg-slate-800/50 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={formData.selectedStudents.includes(
                          student._id
                        )}
                        onChange={() => handleStudentToggle(student._id)}
                        className="w-5 h-5 rounded cursor-pointer accent-emerald-500"
                      />
                      <div className="flex-1">
                        <div className="text-white font-medium">
                          {student.name}
                        </div>
                        <div className="text-slate-400 text-sm flex items-center gap-2">
                          <FaSchool className="text-xs" />
                          {student.className}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Interested Students Section */}
          <div className="mt-8">
            <h3 className="text-lg font-bold text-blue-400 mb-2 flex items-center gap-2">
              <FaUsers className="text-xl" /> Interested Students
            </h3>
            <p className="text-slate-400 text-sm mb-6">
              Students who have registered for this event
            </p>

            {/* Filters for Interested Students */}
            <div className="mb-4 space-y-3">
              {/* Status Filter */}
              <div className="flex flex-wrap gap-2">
                {[
                  { id: "all", label: "All", count: interestedStudents.length },
                  {
                    id: "PENDING",
                    label: "Pending",
                    count: interestedStudents.filter(
                      (s) => s.status === "PENDING"
                    ).length,
                  },
                  {
                    id: "APPROVED",
                    label: "Approved",
                    count: interestedStudents.filter(
                      (s) => s.status === "APPROVED"
                    ).length,
                  },
                  {
                    id: "REJECTED",
                    label: "Rejected",
                    count: interestedStudents.filter(
                      (s) => s.status === "REJECTED"
                    ).length,
                  },
                ].map((filter) => (
                  <button
                    key={filter.id}
                    type="button"
                    onClick={() => setInterestedFilter(filter.id)}
                    className={`px-3 py-1 text-sm rounded-lg font-medium transition-colors ${
                      interestedFilter === filter.id
                        ? filter.id === "PENDING"
                          ? "bg-yellow-600 text-white"
                          : filter.id === "APPROVED"
                          ? "bg-green-600 text-white"
                          : filter.id === "REJECTED"
                          ? "bg-red-600 text-white"
                          : "bg-blue-600 text-white"
                        : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                    }`}
                  >
                    {filter.label} ({filter.count})
                  </button>
                ))}
              </div>

              {/* Search & Class Filter */}
              <div className="flex gap-3">
                <div className="flex-1 flex items-center gap-2 bg-slate-900 rounded-lg px-3 py-2 border border-slate-700">
                  <FaSearch className="text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search interested students..."
                    value={interestedSearch}
                    onChange={(e) => setInterestedSearch(e.target.value)}
                    className="flex-1 bg-transparent outline-none text-white placeholder-slate-500"
                  />
                  {interestedSearch && (
                    <button
                      type="button"
                      onClick={() => setInterestedSearch("")}
                      className="text-slate-500 hover:text-slate-300"
                    >
                      <FaTimes />
                    </button>
                  )}
                </div>
                <select
                  value={interestedClassFilter}
                  onChange={(e) => setInterestedClassFilter(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white"
                >
                  <option value="all">All Classes</option>
                  {Array.isArray(classes) && classes.map((cls) => (
                    <option key={cls._id} value={cls.name}>
                      {cls.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Interested Students List */}
            <div className="bg-slate-900/50 rounded-lg border border-slate-700 overflow-hidden">
              {loadingInterested ? (
                <div className="p-6 text-center text-slate-400">
                  Loading interested students...
                </div>
              ) : (
                (() => {
                  const filteredInterested = interestedStudents.filter(
                    (request) => {
                      const matchesStatus =
                        interestedFilter === "all" ||
                        request.status === interestedFilter;
                      const matchesSearch = request.student.name
                        .toLowerCase()
                        .includes(interestedSearch.toLowerCase());
                      const matchesClass =
                        interestedClassFilter === "all" ||
                        request.student.className === interestedClassFilter;
                      return matchesStatus && matchesSearch && matchesClass;
                    }
                  );

                  return filteredInterested.length === 0 ? (
                    <div className="p-6 text-center text-slate-400">
                      No interested students found
                    </div>
                  ) : (
                    <div className="max-h-80 overflow-y-auto divide-y divide-slate-700">
                      {Array.isArray(filteredInterested) && filteredInterested.map((request) => (
                        <div
                          key={request._id}
                          className="p-4 hover:bg-slate-800/50 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="text-white font-medium">
                                {request.student.name}
                              </div>
                              <div className="text-slate-400 text-sm flex items-center gap-2 mt-1">
                                <FaSchool className="text-xs" />
                                {request.school.name} • Grade{" "}
                                {request.student.grade}
                              </div>
                              {request.contactPerson && (
                                <div className="text-slate-400 text-sm flex items-center gap-2 mt-1">
                                  <FaUser className="text-xs" />
                                  Contact: {request.contactPerson}
                                  {request.phone && (
                                    <span>• {request.phone}</span>
                                  )}
                                </div>
                              )}
                              {request.notes && (
                                <div className="text-slate-500 text-xs mt-1 italic">
                                  "{request.notes}"
                                </div>
                              )}
                            </div>
                            <div className="ml-4">
                              <span
                                className={`px-3 py-1 rounded-full text-xs font-bold ${
                                  request.status === "PENDING"
                                    ? "bg-yellow-900/40 text-yellow-200 border border-yellow-700"
                                    : request.status === "APPROVED"
                                    ? "bg-green-900/40 text-green-200 border border-green-700"
                                    : "bg-red-900/40 text-red-200 border border-red-700"
                                }`}
                              >
                                {request.status}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-8 flex gap-4 justify-end">
        <button
          type="button"
          onClick={() => {
            setFormData({
              contactPerson: "",
              phone: "",
              notes: "",
              selectedStudents: [],
            });
          }}
          className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
        >
          Clear
        </button>
        <button
          type="submit"
          disabled={submitting || formData.selectedStudents.length === 0}
          className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg font-bold transition-colors flex items-center gap-2"
        >
          <FaCheck /> {session?.user?.role === 'STUDENT' ? 'Confirm Participation' : 'Submit Students'} ({formData.selectedStudents.length})
        </button>
      </div>
    </form>
  );
}
