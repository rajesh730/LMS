"use client";

import { useState } from "react";
import { FaTrash, FaPlus, FaDownload, FaSearch } from "react-icons/fa";
import AddStudentModal from "./AddStudentModal";

export default function ApprovedStudentsTab({
  requests,
  event,
  capacityInfo,
  onDataChange,
}) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);

  const filteredRequests = requests.filter((req) =>
    req.student.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRemoveStudent = async (studentId) => {
    if (!confirm("Remove this student from the event?")) return;

    try {
      setLoading(true);
      const res = await fetch(
        `/api/events/${event.id}/manage/student/${studentId}`,
        {
          method: "DELETE",
        }
      );

      if (res.ok) {
        onDataChange();
      }
    } catch (error) {
      console.error("Error removing student:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportRoster = () => {
    const csv = [
      ["Name", "School", "Grade", "Approved Date"],
      ...filteredRequests.map((r) => [
        r.student.name,
        r.school.name,
        r.student.grade,
        new Date(r.approvedAt).toLocaleDateString(),
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `event-roster-${event.id}.csv`;
    a.click();
  };

  if (requests.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500 text-lg mb-4">No approved students yet</p>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2 mx-auto"
        >
          <FaPlus /> Add Student Manually
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search & Actions Bar */}
      <div className="flex flex-col md:flex-row gap-3 mb-4">
        <div className="flex-1 relative">
          <FaSearch className="absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search approved students..."
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2 whitespace-nowrap"
        >
          <FaPlus /> Add Student
        </button>
        <button
          onClick={handleExportRoster}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2 whitespace-nowrap"
        >
          <FaDownload /> Export
        </button>
      </div>

      {/* Capacity Info */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
        <p className="text-emerald-900 font-semibold">
          {requests.length} student(s) enrolled
          {capacityInfo.total && ` out of ${capacityInfo.total} capacity`}
        </p>
      </div>

      {/* Students Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 border-b border-slate-300">
            <tr>
              <th className="p-3 text-left font-semibold text-slate-700">
                Student
              </th>
              <th className="p-3 text-left font-semibold text-slate-700">
                School
              </th>
              <th className="p-3 text-left font-semibold text-slate-700">
                Grade
              </th>
              <th className="p-3 text-left font-semibold text-slate-700">
                Approved
              </th>
              <th className="p-3 text-left font-semibold text-slate-700">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredRequests.map((request) => (
              <tr
                key={request._id}
                className="border-b border-slate-200 hover:bg-slate-50"
              >
                <td className="p-3 font-medium">{request.student.name}</td>
                <td className="p-3">{request.school.name}</td>
                <td className="p-3">{request.student.grade}</td>
                <td className="p-3 text-xs text-slate-500">
                  {new Date(request.approvedAt).toLocaleDateString()}
                </td>
                <td className="p-3">
                  <button
                    onClick={() => handleRemoveStudent(request.student._id)}
                    disabled={loading}
                    className="text-red-600 hover:text-red-700 font-semibold disabled:opacity-50"
                    title="Remove student"
                  >
                    <FaTrash size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Student Modal */}
      {showAddModal && (
        <AddStudentModal
          event={event}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            onDataChange();
          }}
        />
      )}
    </div>
  );
}
