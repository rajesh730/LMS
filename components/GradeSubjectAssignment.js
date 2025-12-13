"use client";

import { useState, useEffect } from "react";
import { FaPlus, FaEdit, FaPause, FaPlay, FaTrash } from "react-icons/fa";
import LoadingSpinner from "@/components/LoadingSpinner";

export default function GradeSubjectAssignment({ grade }) {
  const [gradeSubjects, setGradeSubjects] = useState([]);
  const [allSubjects, setAllSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [formData, setFormData] = useState({
    subjectId: "",
    isCompulsory: true,
    fullMarks: 100,
    passMarks: 40,
    creditHours: 3,
    assignedTeacher: "",
    startDate: "",
    endDate: "",
    remarks: "",
  });

  useEffect(() => {
    fetchData();
  }, [grade]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch available subjects
      const subjectsRes = await fetch("/api/subjects");
      const subjectsData = await subjectsRes.json();
      if (subjectsRes.ok) {
        setAllSubjects(subjectsData.data?.subjects || []);
      }

      // Fetch assigned subjects for this grade
      const gradeRes = await fetch(`/api/grades/${grade}/subjects`);
      const gradeData = await gradeRes.json();
      if (gradeRes.ok) {
        setGradeSubjects(gradeData.data?.subjects || []);
      }

      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (!formData.subjectId) {
        setError("Please select a subject");
        return;
      }

      if (formData.fullMarks < formData.passMarks) {
        setError("Pass marks cannot exceed full marks");
        return;
      }

      const method = editingId ? "PUT" : "POST";
      const url = editingId
        ? `/api/grades/${grade}/subjects/${editingId}`
        : `/api/grades/${grade}/subjects`;

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.message);

      setSuccess(
        editingId
          ? "Subject updated successfully"
          : "Subject activated for grade successfully"
      );
      setFormData({
        subjectId: "",
        isCompulsory: true,
        fullMarks: 100,
        passMarks: 40,
        creditHours: 3,
        assignedTeacher: "",
        startDate: "",
        endDate: "",
        remarks: "",
      });
      setEditingId(null);
      setShowForm(false);
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleStatusToggle = async (id, currentStatus) => {
    try {
      const newStatus = currentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";
      const response = await fetch(`/api/grades/${grade}/subjects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) throw new Error("Failed to update status");

      setSuccess(`Subject ${newStatus.toLowerCase()} for grade successfully`);
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <LoadingSpinner />;

  // Get already assigned subject IDs
  const assignedSubjectIds = gradeSubjects.map((gs) => gs.subject?._id);
  // Filter available subjects to exclude already assigned ones
  const availableSubjects = allSubjects.filter(
    (s) => !assignedSubjectIds.includes(s._id) && s.status === "ACTIVE"
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Subjects for {grade}</h2>
        <button
          onClick={() => {
            setShowForm(!showForm);
            setEditingId(null);
            setFormData({
              subjectId: "",
              isCompulsory: true,
              fullMarks: 100,
              passMarks: 40,
              creditHours: 3,
              assignedTeacher: "",
              startDate: "",
              endDate: "",
              remarks: "",
            });
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
        >
          <FaPlus /> Add Subject
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-lg text-red-400">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-500/10 border border-green-500/30 p-4 rounded-lg text-green-400">
          {success}
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="bg-slate-800 border border-slate-700 p-6 rounded-lg space-y-4">
          <h3 className="text-lg font-semibold text-white">
            {editingId ? "Edit Subject Assignment" : "Assign Subject to Grade"}
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <select
                value={formData.subjectId}
                onChange={(e) => setFormData({ ...formData, subjectId: e.target.value })}
                className="col-span-2 bg-slate-700 text-white p-3 rounded border border-slate-600"
                disabled={editingId !== null}
                required
              >
                <option value="">Select a subject</option>
                {availableSubjects.map((subject) => (
                  <option key={subject._id} value={subject._id}>
                    {subject.name} ({subject.code})
                  </option>
                ))}
              </select>

              <div className="col-span-2">
                <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isCompulsory}
                    onChange={(e) =>
                      setFormData({ ...formData, isCompulsory: e.target.checked })
                    }
                    className="rounded"
                  />
                  Compulsory Subject
                </label>
              </div>

              <input
                type="number"
                placeholder="Full Marks"
                value={formData.fullMarks}
                onChange={(e) => setFormData({ ...formData, fullMarks: Number(e.target.value) })}
                className="bg-slate-700 text-white p-3 rounded border border-slate-600"
                required
              />

              <input
                type="number"
                placeholder="Pass Marks"
                value={formData.passMarks}
                onChange={(e) => setFormData({ ...formData, passMarks: Number(e.target.value) })}
                className="bg-slate-700 text-white p-3 rounded border border-slate-600"
                required
              />

              <input
                type="number"
                placeholder="Credit Hours"
                value={formData.creditHours}
                onChange={(e) => setFormData({ ...formData, creditHours: Number(e.target.value) })}
                className="col-span-2 bg-slate-700 text-white p-3 rounded border border-slate-600"
              />

              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="bg-slate-700 text-white p-3 rounded border border-slate-600"
              />

              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="bg-slate-700 text-white p-3 rounded border border-slate-600"
              />

              <textarea
                placeholder="Remarks (optional)"
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                className="col-span-2 bg-slate-700 text-white p-3 rounded border border-slate-600"
                rows="2"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded"
              >
                {editingId ? "Update" : "Assign"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Subjects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {gradeSubjects.map((gradeSubject) => (
          <div
            key={gradeSubject._id}
            className="bg-slate-800 border border-slate-700 p-4 rounded-lg space-y-3"
          >
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-semibold text-white">{gradeSubject.subject?.name}</h4>
                <p className="text-sm text-slate-400 font-mono">{gradeSubject.subject?.code}</p>
              </div>
              <span
                className={`px-2 py-1 rounded text-xs ${
                  gradeSubject.isCompulsory
                    ? "bg-red-500/20 text-red-300"
                    : "bg-blue-500/20 text-blue-300"
                }`}
              >
                {gradeSubject.isCompulsory ? "Compulsory" : "Optional"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm text-slate-300">
              <div>
                <p className="text-xs text-slate-400">Full Marks</p>
                <p className="font-semibold">{gradeSubject.fullMarks}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Pass Marks</p>
                <p className="font-semibold">{gradeSubject.passMarks}</p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-700">
              <span
                className={`text-xs px-2 py-1 rounded ${
                  gradeSubject.status === "ACTIVE"
                    ? "bg-green-500/20 text-green-300"
                    : "bg-red-500/20 text-red-300"
                }`}
              >
                {gradeSubject.status}
              </span>

              <div className="space-x-2">
                <button
                  onClick={() => {
                    setEditingId(gradeSubject._id);
                    setFormData({
                      subjectId: gradeSubject.subject?._id,
                      isCompulsory: gradeSubject.isCompulsory,
                      fullMarks: gradeSubject.fullMarks,
                      passMarks: gradeSubject.passMarks,
                      creditHours: gradeSubject.creditHours,
                      assignedTeacher: gradeSubject.assignedTeacher?._id || "",
                      startDate: gradeSubject.startDate?.split("T")[0] || "",
                      endDate: gradeSubject.endDate?.split("T")[0] || "",
                      remarks: gradeSubject.remarks || "",
                    });
                    setShowForm(true);
                  }}
                  className="text-blue-400 hover:text-blue-300 text-sm"
                >
                  <FaEdit className="inline" /> Edit
                </button>
                <button
                  onClick={() => handleStatusToggle(gradeSubject._id, gradeSubject.status)}
                  className={`text-sm ${
                    gradeSubject.status === "ACTIVE"
                      ? "text-yellow-400 hover:text-yellow-300"
                      : "text-green-400 hover:text-green-300"
                  }`}
                >
                  {gradeSubject.status === "ACTIVE" ? (
                    <>
                      <FaPause className="inline" /> Deactivate
                    </>
                  ) : (
                    <>
                      <FaPlay className="inline" /> Activate
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {gradeSubjects.length === 0 && !showForm && (
        <div className="text-center py-12 text-slate-400">
          <p className="mb-4">No subjects assigned to {grade} yet</p>
          <button
            onClick={() => setShowForm(true)}
            className="text-blue-400 hover:text-blue-300 underline"
          >
            Assign a subject to get started
          </button>
        </div>
      )}
    </div>
  );
}
