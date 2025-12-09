"use client";

import { useState, useEffect } from "react";
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaFileAlt,
  FaCheckCircle,
  FaTimes,
} from "react-icons/fa";
import { useNotification } from "@/components/NotificationSystem";

export default function MarksManager({ classrooms = [] }) {
  const [subjects, setSubjects] = useState([]);
  const [selectedClassroom, setSelectedClassroom] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [marks, setMarks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingMark, setEditingMark] = useState(null);
  const [students, setStudents] = useState([]);
  const [fetchedClassrooms, setFetchedClassrooms] = useState(classrooms);
  const { success, error: showError } = useNotification();

  const [formData, setFormData] = useState({
    studentId: "",
    assessmentType: "UNIT_TEST",
    assessmentName: "",
    totalMarks: 100,
    marksObtained: 0,
    feedback: "",
  });

  // Fetch classrooms on mount
  useEffect(() => {
    const fetchClassrooms = async () => {
      try {
        const res = await fetch("/api/classrooms");
        if (res.ok) {
          const data = await res.json();
          const classroomsList = Array.isArray(data)
            ? data
            : data.classrooms || [];
          setFetchedClassrooms(classroomsList);
        }
      } catch (err) {
        console.error("Error fetching classrooms:", err);
      }
    };

    if (classrooms.length === 0) {
      fetchClassrooms();
    } else {
      setFetchedClassrooms(classrooms);
    }
  }, [classrooms]);

  // Fetch subjects for selected classroom
  useEffect(() => {
    if (selectedClassroom) {
      fetchSubjects();
      fetchStudents();
    }
  }, [selectedClassroom]);

  // Fetch marks for selected subject
  useEffect(() => {
    if (selectedSubject && selectedClassroom) {
      fetchMarks();
    }
  }, [selectedSubject, selectedClassroom]);

  const fetchSubjects = async () => {
    try {
      const res = await fetch(
        `/api/teacher/subjects?classroom=${selectedClassroom}`
      );
      if (res.ok) {
        const data = await res.json();
        setSubjects(Array.isArray(data) ? data : data.subjects || []);
      }
    } catch (err) {
      console.error("Error fetching subjects:", err);
    }
  };

  const fetchStudents = async () => {
    try {
      const res = await fetch(
        `/api/students?classroom=${selectedClassroom}&limit=500`
      );
      if (res.ok) {
        const data = await res.json();
        setStudents(Array.isArray(data) ? data : data.students || []);
      }
    } catch (err) {
      console.error("Error fetching students:", err);
    }
  };

  const fetchMarks = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/marks?subject=${selectedSubject}&classroom=${selectedClassroom}`
      );
      if (res.ok) {
        const data = await res.json();
        setMarks(data.data || data);
      }
    } catch (err) {
      console.error("Error fetching marks:", err);
      showError("Failed to load marks");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !formData.studentId ||
      !formData.assessmentName ||
      formData.totalMarks <= 0 ||
      formData.marksObtained < 0
    ) {
      showError("Please fill in all required fields correctly");
      return;
    }

    if (formData.marksObtained > formData.totalMarks) {
      showError("Marks obtained cannot exceed total marks");
      return;
    }

    try {
      const endpoint = editingMark
        ? `/api/marks/${editingMark._id}`
        : "/api/marks";
      const method = editingMark ? "PATCH" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: formData.studentId,
          subjectId: selectedSubject,
          classroomId: selectedClassroom,
          ...formData,
        }),
      });

      if (res.ok) {
        success(
          editingMark
            ? "Marks updated successfully"
            : "Marks added successfully"
        );
        setShowForm(false);
        setEditingMark(null);
        setFormData({
          studentId: "",
          assessmentType: "UNIT_TEST",
          assessmentName: "",
          totalMarks: 100,
          marksObtained: 0,
          feedback: "",
        });
        fetchMarks();
      } else {
        const data = await res.json();
        showError(data.message || "Failed to save marks");
      }
    } catch (err) {
      console.error("Error saving marks:", err);
      showError("Failed to save marks");
    }
  };

  const handleEdit = (mark) => {
    setEditingMark(mark);
    setFormData({
      studentId: mark.student._id,
      assessmentType: mark.assessmentType,
      assessmentName: mark.assessmentName,
      totalMarks: mark.totalMarks,
      marksObtained: mark.marksObtained,
      feedback: mark.feedback || "",
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this mark entry?"))
      return;

    try {
      const res = await fetch(`/api/marks/${id}`, { method: "DELETE" });
      if (res.ok) {
        success("Marks deleted successfully");
        fetchMarks();
      } else {
        showError("Failed to delete marks");
      }
    } catch (err) {
      console.error("Error deleting marks:", err);
      showError("Failed to delete marks");
    }
  };

  const getGradeColor = (grade) => {
    switch (grade) {
      case "A+":
      case "A":
        return "text-emerald-400 bg-emerald-500/10";
      case "B+":
      case "B":
        return "text-blue-400 bg-blue-500/10";
      case "C+":
      case "C":
        return "text-yellow-400 bg-yellow-500/10";
      case "D+":
      case "D":
        return "text-orange-400 bg-orange-500/10";
      default:
        return "text-red-400 bg-red-500/10";
    }
  };

  if (classrooms.length === 0) {
    return (
      <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800 text-center">
        <p className="text-slate-400">No classrooms assigned</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800">
        <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
          <FaFileAlt className="text-blue-400" /> Marks Management
        </h3>

        {/* Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-slate-300 font-semibold mb-2">
              Select Class
            </label>
            <select
              value={selectedClassroom}
              onChange={(e) => setSelectedClassroom(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
            >
              <option value="">Choose a class...</option>
              {fetchedClassrooms.map((cls) => (
                <option key={cls._id} value={cls._id}>
                  {cls.name}
                </option>
              ))}
            </select>
          </div>

          {selectedClassroom && (
            <div>
              <label className="block text-slate-300 font-semibold mb-2">
                Select Subject
              </label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              >
                <option value="">Choose a subject...</option>
                {subjects.map((sub) => (
                  <option key={sub._id} value={sub._id}>
                    {sub.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {selectedSubject && (
            <div className="flex items-end">
              <button
                onClick={() => {
                  setEditingMark(null);
                  setFormData({
                    studentId: "",
                    assessmentType: "UNIT_TEST",
                    assessmentName: "",
                    totalMarks: 100,
                    marksObtained: 0,
                    feedback: "",
                  });
                  setShowForm(!showForm);
                }}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition"
              >
                <FaPlus /> Add Marks
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Form */}
      {showForm && selectedSubject && (
        <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800">
          <h4 className="text-lg font-bold text-white mb-4">
            {editingMark ? "Edit Marks Entry" : "Add New Marks Entry"}
          </h4>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-300 font-semibold mb-2">
                  Student
                </label>
                <select
                  value={formData.studentId}
                  onChange={(e) =>
                    setFormData({ ...formData, studentId: e.target.value })
                  }
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">Select student...</option>
                  {students.map((student) => (
                    <option key={student._id} value={student._id}>
                      {student.name} ({student.rollNumber})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-2">
                  Assessment Type
                </label>
                <select
                  value={formData.assessmentType}
                  onChange={(e) =>
                    setFormData({ ...formData, assessmentType: e.target.value })
                  }
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="UNIT_TEST">Unit Test</option>
                  <option value="MIDTERM">Midterm Exam</option>
                  <option value="FINAL_EXAM">Final Exam</option>
                  <option value="ASSIGNMENT">Assignment</option>
                  <option value="PROJECT">Project</option>
                  <option value="PRACTICAL">Practical</option>
                  <option value="ORAL">Oral</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-2">
                Assessment Name
              </label>
              <input
                type="text"
                value={formData.assessmentName}
                onChange={(e) =>
                  setFormData({ ...formData, assessmentName: e.target.value })
                }
                placeholder="e.g., Chapter 1-3 Test"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-slate-300 font-semibold mb-2">
                  Total Marks
                </label>
                <input
                  type="number"
                  value={formData.totalMarks}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      totalMarks: parseInt(e.target.value),
                    })
                  }
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-2">
                  Marks Obtained
                </label>
                <input
                  type="number"
                  value={formData.marksObtained}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      marksObtained: parseInt(e.target.value),
                    })
                  }
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-2">
                  Percentage
                </label>
                <div className="w-full bg-slate-700 rounded-lg px-3 py-2 text-white font-semibold">
                  {formData.totalMarks > 0
                    ? Math.round(
                        (formData.marksObtained / formData.totalMarks) * 100
                      )
                    : 0}
                  %
                </div>
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-2">
                Feedback (Optional)
              </label>
              <textarea
                value={formData.feedback}
                onChange={(e) =>
                  setFormData({ ...formData, feedback: e.target.value })
                }
                placeholder="Comments about student performance..."
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                rows="3"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition"
              >
                <FaCheckCircle /> {editingMark ? "Update Marks" : "Save Marks"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingMark(null);
                }}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition"
              >
                <FaTimes /> Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Marks List */}
      {loading ? (
        <div className="text-center py-8 text-slate-400">Loading marks...</div>
      ) : marks.length === 0 ? (
        <div className="bg-slate-900/50 p-8 rounded-xl border border-slate-800 border-dashed text-center">
          <FaFileAlt className="text-4xl text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400">No marks entered yet</p>
          {selectedSubject && (
            <p className="text-slate-500 text-sm mt-2">
              Click "Add Marks" to get started
            </p>
          )}
        </div>
      ) : (
        <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left py-3 px-4 text-slate-300 font-semibold">
                  Student
                </th>
                <th className="text-left py-3 px-4 text-slate-300 font-semibold">
                  Assessment
                </th>
                <th className="text-center py-3 px-4 text-slate-300 font-semibold">
                  Marks
                </th>
                <th className="text-center py-3 px-4 text-slate-300 font-semibold">
                  %
                </th>
                <th className="text-center py-3 px-4 text-slate-300 font-semibold">
                  Grade
                </th>
                <th className="text-left py-3 px-4 text-slate-300 font-semibold">
                  Feedback
                </th>
                <th className="text-center py-3 px-4 text-slate-300 font-semibold">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {marks.map((mark) => (
                <tr
                  key={mark._id}
                  className="border-b border-slate-800 hover:bg-slate-800/50 transition"
                >
                  <td className="py-3 px-4 text-white font-medium">
                    {mark.student.name}
                  </td>
                  <td className="py-3 px-4 text-slate-400">
                    <div className="text-white font-medium">
                      {mark.assessmentName}
                    </div>
                    <div className="text-xs text-slate-500">
                      {mark.assessmentType}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center text-white font-semibold">
                    {mark.marksObtained}/{mark.totalMarks}
                  </td>
                  <td className="py-3 px-4 text-center font-bold text-blue-400">
                    {mark.percentage}%
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`px-2 py-1 rounded text-xs font-bold ${getGradeColor(
                        mark.grade
                      )}`}
                    >
                      {mark.grade}
                    </span>
                  </td>
                  <td
                    className="py-3 px-4 text-slate-400 text-xs max-w-xs truncate"
                    title={mark.feedback || ""}
                  >
                    {mark.feedback || "-"}
                  </td>
                  <td className="py-3 px-4 text-center flex gap-2 justify-center">
                    <button
                      onClick={() => handleEdit(mark)}
                      className="text-blue-400 hover:text-blue-300 transition"
                      title="Edit"
                    >
                      <FaEdit />
                    </button>
                    <button
                      onClick={() => handleDelete(mark._id)}
                      className="text-red-400 hover:text-red-300 transition"
                      title="Delete"
                    >
                      <FaTrash />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
