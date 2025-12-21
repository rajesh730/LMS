"use client";

import { useState, useEffect } from "react";
import { FaSearch, FaSpinner } from "react-icons/fa";

export default function AddStudentModal({ event, onClose, onSuccess }) {
  const [students, setStudents] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchStudents();
  }, [event.id]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      // You'll need to create this API endpoint
      const res = await fetch(`/api/students/available?eventId=${event.id}`);
      if (res.ok) {
        const data = await res.json();
        setStudents(data.students || []);
      }
    } catch (error) {
      console.error("Error fetching students:", error);
      // Fallback: Load all students if API fails
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter((student) => {
    const matchesSearch = student.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const toggleStudent = (studentId) => {
    setSelectedStudents((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    );
  };

  const toggleAll = () => {
    if (selectedStudents.length === filteredStudents.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(filteredStudents.map((s) => s._id));
    }
  };

  const handleAddStudents = async () => {
    if (selectedStudents.length === 0) return;

    try {
      setSubmitting(true);
      const res = await fetch(`/api/events/${event.id}/manage/student/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentIds: selectedStudents }),
      });

      if (res.ok) {
        const data = await res.json();
        onSuccess();
      } else {
        const error = await res.json();
        alert(error.message || "Failed to add students");
      }
    } catch (error) {
      console.error("Error adding students:", error);
      alert("Error adding students");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-emerald-600 to-teal-500 text-white p-6 border-b">
          <h2 className="text-2xl font-bold">Add Students to Event</h2>
          <p className="text-emerald-50 text-sm mt-1">
            Select students to manually add to this event
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Search & Filter */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="relative">
              <FaSearch className="absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by student name..."
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Selection Count */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
            <p className="text-emerald-900 font-semibold">
              {selectedStudents.length} student(s) selected
            </p>
          </div>

          {/* Students Table */}
          {loading ? (
            <div className="text-center py-8">
              <FaSpinner className="animate-spin text-4xl text-emerald-500 mx-auto" />
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              No students found
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-slate-100 border-b border-slate-300">
                  <tr>
                    <th className="p-3 text-left">
                      <input
                        type="checkbox"
                        checked={
                          selectedStudents.length === filteredStudents.length &&
                          filteredStudents.length > 0
                        }
                        onChange={toggleAll}
                        className="rounded cursor-pointer"
                      />
                    </th>
                    <th className="p-3 text-left font-semibold text-slate-700">
                      Name
                    </th>
                    <th className="p-3 text-left font-semibold text-slate-700">
                      Grade
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((student) => (
                    <tr
                      key={student._id}
                      className="border-b border-slate-200 hover:bg-slate-50"
                    >
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={selectedStudents.includes(student._id)}
                          onChange={() => toggleStudent(student._id)}
                          className="rounded cursor-pointer"
                        />
                      </td>
                      <td className="p-3 font-medium">{student.name}</td>
                      <td className="p-3">{student.grade}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-slate-100 border-t border-slate-300 p-6 flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-slate-300 hover:bg-slate-400 text-slate-900 rounded-lg font-semibold"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            onClick={handleAddStudents}
            disabled={submitting || selectedStudents.length === 0}
            className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-semibold disabled:opacity-50 flex items-center gap-2"
          >
            {submitting && <FaSpinner className="animate-spin" />}
            Add {selectedStudents.length} Student(s)
          </button>
        </div>
      </div>
    </div>
  );
}
