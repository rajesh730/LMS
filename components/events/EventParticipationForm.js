"use client";

import { useState, useEffect, memo, useCallback } from "react";
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

const EventParticipationForm = memo(function EventParticipationForm({
  event,
  onSuccess,
  isEditing = false,
}) {
  const { data: session } = useSession();
  const [formData, setFormData] = useState({
    contactPerson: "",
    phone: "",
    notes: "",
    selectedStudents: [],
  });

  const [students, setStudents] = useState([]);
  const [gradeFilter, setGradeFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [grades, setGrades] = useState([]);

  // New states for interested students
  const [interestedStudents, setInterestedStudents] = useState([]);
  const [interestedFilter, setInterestedFilter] = useState("all"); // all, pending, approved, rejected
  const [interestedClassFilter, setInterestedClassFilter] = useState("all");
  const [interestedSearch, setInterestedSearch] = useState("");
  const [loadingInterested, setLoadingInterested] = useState(true);

  useEffect(() => {
    loadStudents();
    loadGrades();
  }, []);

  useEffect(() => {
    if (isEditing && session?.user?.role === "SCHOOL_ADMIN") {
      loadMyParticipationDetails();
    }
  }, [isEditing, session, event._id]);

  const loadMyParticipationDetails = async () => {
    try {
      const res = await fetch(`/api/events/${event._id}/participate`);
      if (res.ok) {
        const json = await res.json();

        // Handle API response wrapper
        const data = json.data || json;

        if (data.requests && Array.isArray(data.requests)) {
          // We want to show ALL students that are part of the request, even if rejected,
          // so the admin can see who they tried to register.
          // But typically "Update" means modifying the current active set.
          // Let's include PENDING, APPROVED, and REJECTED so they can uncheck rejected ones if they want.
          const relevantRequests = data.requests.filter((r) =>
            ["PENDING", "APPROVED", "REJECTED"].includes(r.status)
          );

          const selectedIds = relevantRequests
            .map((r) => {
              if (!r.student) return null;
              const sId =
                typeof r.student === "object" ? r.student._id : r.student;
              return String(sId);
            })
            .filter(Boolean);

          console.log("Extracted selectedIds:", selectedIds);

          setFormData((prev) => {
            console.log("Setting form data with IDs:", selectedIds);
            return {
              ...prev,
              selectedStudents: selectedIds,
              contactPerson:
                data.contactInfo?.contactPerson || prev.contactPerson,
              phone: data.contactInfo?.contactPhone || prev.phone,
              notes: data.contactInfo?.notes || prev.notes,
            };
          });
        }
      }
    } catch (error) {
      console.error("Error loading participation details:", error);
    }
  };

  const loadGrades = async () => {
    try {
      const res = await fetch("/api/schools/grades");
      if (res.ok) {
        const json = await res.json();
        let fetchedGrades = json.data?.grades || [];

        // Filter grades if event has restrictions
        if (event.eligibleGrades && event.eligibleGrades.length > 0) {
          fetchedGrades = fetchedGrades.filter((g) => {
            const gradeVal = g._id || g;
            return event.eligibleGrades.includes(String(gradeVal));
          });
        }

        setGrades(fetchedGrades);
      } else {
        setGrades([]);
      }
    } catch (error) {
      console.error("Error loading grades:", error);
      setGrades([]);
    }
  };

  const loadInterestedStudents = async () => {
    try {
      setLoadingInterested(true);
      const res = await fetch(`/api/events/${event._id}/manage`);
      if (res.ok) {
        const data = await res.json();

        // The API returns requests organized by status { PENDING: [], APPROVED: [], ... }
        // We need to flatten this into a single array for our logic
        if (data.requests && !Array.isArray(data.requests)) {
          const allRequests = [
            ...(data.requests.PENDING || []),
            ...(data.requests.APPROVED || []),
            ...(data.requests.REJECTED || []),
            ...(data.requests.WITHDRAWN || []),
            ...(data.requests.ENROLLED || []),
          ];
          setInterestedStudents(allRequests);
        } else {
          setInterestedStudents(
            Array.isArray(data.requests) ? data.requests : []
          );
        }
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

  const participationMap = new Map(
    interestedStudents.map((r) => [r.student._id, r])
  );

  const filteredStudents = students
    .filter((student) => {
      const request = participationMap.get(student._id);

      const matchesSearch = student.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase());

      const sGrade =
        student.grade &&
        (student.grade.name || student.grade._id || student.grade);

      // Check eligibility
      const isEligible =
        !event.eligibleGrades ||
        event.eligibleGrades.length === 0 ||
        event.eligibleGrades.includes(String(sGrade));

      if (!isEligible) return false;

      const matchesGrade =
        gradeFilter === "all" || String(sGrade) === String(gradeFilter);

      const matchesStatus =
        interestedFilter === "all" ||
        (interestedFilter === "UNREGISTERED" && !request) ||
        (interestedFilter === "REGISTERED" &&
          request &&
          ["PENDING", "APPROVED"].includes(request.status)) ||
        (request && request.status === interestedFilter);

      return matchesSearch && matchesGrade && matchesStatus;
    })
    .sort((a, b) => {
      // Sort selected students to the top
      const aSelected = formData.selectedStudents.includes(String(a._id));
      const bSelected = formData.selectedStudents.includes(String(b._id));
      if (aSelected && !bSelected) return -1;
      if (!aSelected && bSelected) return 1;
      return 0;
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
      const method = isEditing ? "PUT" : "POST";
      const res = await fetch(`/api/events/${event._id}/participate`, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactPerson: formData.contactPerson,
          phone: formData.phone,
          notes: formData.notes,
          studentIds: formData.selectedStudents,
        }),
      });

      if (res.ok) {
        alert(
          isEditing
            ? "Participation updated successfully!"
            : "Participation request submitted successfully!"
        );
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
        {session?.user?.role === "STUDENT"
          ? "Join Event:"
          : isEditing
          ? "Update Participation:"
          : "Manage Event Participation:"}{" "}
        <span className="text-emerald-400">{event.title}</span>
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

        {/* RIGHT COLUMN: Student Management */}
        <div>
          <h3 className="text-lg font-bold text-emerald-400 mb-2 flex items-center gap-2">
            <FaUsers className="text-xl" /> Student Management
          </h3>
          <p className="text-slate-400 text-sm mb-6">
            Manage participation for your students.
            {formData.selectedStudents.length > 0 && (
              <span className="text-emerald-400 ml-2 font-bold">
                ({formData.selectedStudents.length} selected)
              </span>
            )}
          </p>

          {/* Filters */}
          <div className="mb-6 space-y-3">
            {/* Status Filter Tabs */}
            <div className="flex flex-wrap gap-2">
              {[
                { id: "all", label: "All" },
                { id: "UNREGISTERED", label: "Unregistered" },
                { id: "REGISTERED", label: "Registered" },
                { id: "REJECTED", label: "Rejected" },
              ].map((filter) => (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => setInterestedFilter(filter.id)}
                  className={`px-3 py-1 text-sm rounded-lg font-medium transition-colors ${
                    interestedFilter === filter.id
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            {/* Search & Class Filter */}
            <div className="flex gap-3">
              <div className="flex-1 flex items-center gap-2 bg-slate-900 rounded-lg px-3 py-2 border border-slate-700">
                <FaSearch className="text-slate-500" />
                <input
                  type="text"
                  placeholder="Search student..."
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
              <select
                value={gradeFilter}
                onChange={(e) => setGradeFilter(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white"
              >
                <option value="all">All Grades</option>
                {Array.isArray(grades) &&
                  grades.map((grade) => {
                    const val = grade._id || grade;
                    const label = grade.name || grade;
                    return (
                      <option key={val} value={val}>
                        {label}
                      </option>
                    );
                  })}
              </select>
            </div>
          </div>

          {/* Unified List */}
          <div className="bg-slate-900/50 rounded-lg border border-slate-700 overflow-hidden">
            {loading ? (
              <div className="p-6 text-center text-slate-400">
                Loading students...
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="p-6 text-center text-slate-400">
                No students found matching filters
              </div>
            ) : (
              <div className="max-h-[500px] overflow-y-auto">
                {/* Select All (Only for Unregistered) */}
                <div className="flex items-center gap-3 p-4 bg-slate-800/50 border-b border-slate-700">
                  <input
                    type="checkbox"
                    checked={
                      filteredStudents.some(
                        (s) => !participationMap.get(s._id)
                      ) &&
                      filteredStudents
                        .filter((s) => !participationMap.get(s._id))
                        .every((s) => formData.selectedStudents.includes(s._id))
                    }
                    onChange={(e) => {
                      const unregistered = filteredStudents.filter(
                        (s) => !participationMap.get(s._id)
                      );
                      if (e.target.checked) {
                        setFormData((prev) => ({
                          ...prev,
                          selectedStudents: [
                            ...new Set([
                              ...prev.selectedStudents,
                              ...unregistered.map((s) => s._id),
                            ]),
                          ],
                        }));
                      } else {
                        const unregisteredIds = unregistered.map((s) => s._id);
                        setFormData((prev) => ({
                          ...prev,
                          selectedStudents: prev.selectedStudents.filter(
                            (id) => !unregisteredIds.includes(id)
                          ),
                        }));
                      }
                    }}
                    className="w-5 h-5 rounded cursor-pointer accent-emerald-500"
                  />
                  <span className="text-white font-medium flex-1">
                    Select All Unregistered
                  </span>
                  {formData.selectedStudents.length > 0 && (
                    <span className="text-xs bg-emerald-900/50 text-emerald-200 px-3 py-1 rounded-full">
                      {formData.selectedStudents.length} selected
                    </span>
                  )}
                </div>

                {/* Students List */}
                <div className="divide-y divide-slate-700">
                  {Array.isArray(filteredStudents) &&
                    filteredStudents.map((student) => {
                      const request = participationMap.get(student._id);
                      const isSelected = formData.selectedStudents.includes(
                        String(student._id)
                      );

                      return (
                        <div
                          key={student._id}
                          className={`flex items-center gap-3 p-4 transition-colors ${
                            request
                              ? "bg-slate-800/30"
                              : "hover:bg-slate-800/50 cursor-pointer"
                          }`}
                          onClick={() =>
                            !request && handleStudentToggle(student._id)
                          }
                        >
                          {!request ? (
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleStudentToggle(student._id)}
                              className="w-5 h-5 rounded cursor-pointer accent-emerald-500"
                              onClick={(e) => e.stopPropagation()}
                            />
                          ) : (
                            <div className="w-5 h-5 flex items-center justify-center">
                              {request.status === "APPROVED" && (
                                <FaCheck className="text-green-500" />
                              )}
                              {request.status === "REJECTED" && (
                                <FaTimes className="text-red-500" />
                              )}
                              {request.status === "PENDING" && (
                                <div className="w-2 h-2 rounded-full bg-yellow-500" />
                              )}
                            </div>
                          )}

                          <div className="flex-1">
                            <div className="text-white font-medium">
                              {student.name}
                            </div>
                            <div className="text-slate-400 text-sm flex items-center gap-2">
                              <FaSchool className="text-xs" />
                              {student.className}
                            </div>
                          </div>

                          {/* Status Badge */}
                          {request && (
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
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
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
          <FaCheck />{" "}
          {session?.user?.role === "STUDENT"
            ? "Confirm Participation"
            : isEditing
            ? "Update Participants"
            : "Submit Students"}{" "}
          ({formData.selectedStudents.length})
        </button>
      </div>
    </form>
  );
});

export default EventParticipationForm;
