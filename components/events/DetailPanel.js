"use client";

import { useState } from "react";
import {
  FaSearch,
  FaCheck,
  FaTimes,
  FaTrash,
  FaDownload,
  FaPhone,
  FaUser,
  FaSchool,
  FaCalendar,
} from "react-icons/fa";
import StudentDetailsCard from "./StudentDetailsCard";

export default function DetailPanel({
  status,
  requests,
  selectedStudents,
  selectedStudent,
  event,
  capacityInfo,
  onSelectStudent,
  onSelectAll,
  onSelectStudentDetail,
  onClearSelection,
  onDataChange,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectionForm, setShowRejectionForm] = useState(false);

  const filteredRequests = requests.filter((req) =>
    req.student.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleApproveSelected = async () => {
    if (selectedStudents.length === 0) {
      alert("Please select students to approve");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`/api/events/${event._id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentIds: selectedStudents }),
      });

      if (res.ok) {
        onDataChange();
        onClearSelection();
      } else {
        alert("Error approving students");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Error approving students");
    } finally {
      setLoading(false);
    }
  };

  const handleRejectSelected = async () => {
    if (selectedStudents.length === 0) {
      alert("Please select students to reject");
      return;
    }

    try {
      setLoading(true);
      const requestIds = selectedStudents
        .map((sid) => requests.find((r) => r.student._id === sid)?._id)
        .filter(Boolean);

      const res = await fetch(`/api/events/${event._id}/manage/reject`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestIds,
          reason: rejectionReason || "Request rejected",
        }),
      });

      if (res.ok) {
        onDataChange();
        onClearSelection();
        setShowRejectionForm(false);
        setRejectionReason("");
      } else {
        alert("Error rejecting students");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Error rejecting students");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveStudent = async (studentId) => {
    if (!confirm("Remove this student from the event?")) return;

    try {
      setLoading(true);
      const res = await fetch(`/api/events/${event._id}/manage/remove`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentIds: [studentId] }),
      });

      if (res.ok) {
        onDataChange();
        onSelectStudentDetail(null);
      } else {
        alert("Error removing student");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Error removing student");
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    const csv = [
      ["Name", "School", "Grade", "Status", "Date"],
      ...filteredRequests.map((r) => [
        r.student.name,
        r.school.name,
        r.student.grade,
        r.status,
        new Date(r.createdAt).toLocaleDateString(),
      ]),
    ];

    const csvContent = csv
      .map((row) => row.map((c) => `"${c}"`).join(","))
      .join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${status}-requests-${Date.now()}.csv`;
    a.click();
  };

  return (
    <div className="lg:col-span-3 bg-white rounded-lg border border-gray-200 p-6 h-full flex flex-col">
      {/* Main Content Grid: Left (Details) + Right (Student Selection) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 overflow-y-auto">
        {/* LEFT PANEL: Contact Details Section */}
        {selectedStudent && (
          <div className="lg:col-span-1 bg-gray-50 rounded-lg p-6 border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
              <FaUser className="text-blue-600" /> Details
            </h3>

            {/* Student Name */}
            <div className="mb-6">
              <label className="text-xs font-semibold text-gray-500 uppercase block mb-2">
                Student Name
              </label>
              <p className="text-gray-900 font-bold text-lg">
                {selectedStudent.student.name}
              </p>
            </div>

            {/* Contact Person */}
            <div className="mb-6">
              <label className="text-xs font-semibold text-gray-500 uppercase block mb-2">
                Contact Person
              </label>
              <p className="text-gray-900 font-semibold">
                {selectedStudent.contactPerson || "N/A"}
              </p>
            </div>

            {/* Phone */}
            <div className="mb-6">
              <label className="text-xs font-semibold text-gray-500 uppercase block mb-2 flex items-center gap-2">
                <FaPhone className="text-blue-600" /> Phone
              </label>
              <p className="text-gray-900 font-semibold">
                {selectedStudent.phone || "N/A"}
              </p>
            </div>

            {/* School */}
            <div className="mb-6">
              <label className="text-xs font-semibold text-gray-500 uppercase block mb-2 flex items-center gap-2">
                <FaSchool className="text-blue-600" /> School
              </label>
              <p className="text-gray-900 font-semibold">
                {selectedStudent.school.name}
              </p>
            </div>

            {/* Grade */}
            <div className="mb-6">
              <label className="text-xs font-semibold text-gray-500 uppercase block mb-2">
                Grade
              </label>
              <p className="text-gray-900 font-semibold">
                {selectedStudent.student.grade}
              </p>
            </div>

            {/* Status */}
            <div className="mb-6">
              <label className="text-xs font-semibold text-gray-500 uppercase block mb-2">
                Status
              </label>
              <span
                className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                  selectedStudent.status === "PENDING"
                    ? "bg-yellow-100 text-yellow-700"
                    : selectedStudent.status === "ENROLLED"
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {selectedStudent.status}
              </span>
            </div>

            {/* Notes */}
            {selectedStudent.notes && (
              <div className="mb-6">
                <label className="text-xs font-semibold text-gray-500 uppercase block mb-2">
                  Notes
                </label>
                <p className="text-gray-700 text-sm bg-white p-3 rounded border border-gray-200">
                  {selectedStudent.notes}
                </p>
              </div>
            )}

            {/* Rejection Reason */}
            {selectedStudent.rejectionReason && (
              <div className="mb-6">
                <label className="text-xs font-semibold text-red-600 uppercase block mb-2">
                  Rejection Reason
                </label>
                <p className="text-red-700 text-sm bg-red-50 p-3 rounded border border-red-200">
                  {selectedStudent.rejectionReason}
                </p>
              </div>
            )}
          </div>
        )}

        {/* RIGHT PANEL: Student Selection */}
        <div className={selectedStudent ? "lg:col-span-2" : "lg:col-span-3"}>
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            {status === "ALL" ? "All Requests" : `${status} Requests`}
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            {selectedStudents.length} students selected
          </p>

          {/* Search */}
          <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-4 py-2 border border-gray-200 mb-4">
            <FaSearch className="text-gray-400" />
            <input
              type="text"
              placeholder="Search by student name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent outline-none text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            )}
          </div>

          {/* Table */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-y-auto max-h-96">
            {filteredRequests.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 mb-2">
                  No {status.toLowerCase()} requests found
                </p>
                <p className="text-xs text-gray-400">Try adjusting your search</p>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Select All */}
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <input
                    type="checkbox"
                    checked={
                      selectedStudents.length === filteredRequests.length &&
                      filteredRequests.length > 0
                    }
                    onChange={(e) => onSelectAll(e.target.checked)}
                    className="w-4 h-4 rounded cursor-pointer"
                  />
                  <span className="text-sm font-semibold text-gray-700 flex-1">
                    Select All ({filteredRequests.length})
                  </span>
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                    {selectedStudents.length} selected
                  </span>
                </div>

                {/* Student List */}
                {filteredRequests.map((request) => (
                  <div
                    key={request._id}
                    className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedStudents.includes(request.student._id)}
                      onChange={(e) =>
                        onSelectStudent(request.student._id, e.target.checked)
                      }
                      onClick={(e) => e.stopPropagation()}
                      className="w-4 h-4 rounded cursor-pointer"
                    />

                    <div
                      className="flex-1"
                      onClick={() => onSelectStudentDetail(request)}
                    >
                      <div className="font-semibold text-gray-900">
                        {request.student.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {request.school.name} • Grade {request.student.grade}
                      </div>
                    </div>

                    <span
                      className={`px-2 py-1 rounded text-xs font-semibold ${
                        request.status === "PENDING"
                          ? "bg-yellow-100 text-yellow-700"
                          : request.status === "ENROLLED"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {request.status}
                    </span>

                    {/* Individual Actions */}
                    {status === "PENDING" && (
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleApproveSelected();
                          }}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Approve"
                        >
                          <FaCheck />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowRejectionForm(true);
                          }}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Reject"
                        >
                          <FaTimes />
                        </button>
                      </div>
                    )}

                    {status === "APPROVED" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveStudent(request.student._id);
                        }}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remove"
                      >
                        <FaTrash />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
      {selectedStudent && (
        <StudentDetailsCard
          request={selectedStudent}
          event={event}
          status={status}
          onClose={() => onSelectStudentDetail(null)}
          onApprove={() => handleApproveSelected()}
          onReject={() => setShowRejectionForm(true)}
          onRemove={() => handleRemoveStudent(selectedStudent.student._id)}
          loading={loading}
        />
      )}

      {/* Rejection Form */}
      {showRejectionForm && status === "PENDING" && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <label className="block text-sm font-semibold text-red-900 mb-2">
            Rejection Reason
          </label>
          <textarea
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="Enter reason for rejection..."
            className="w-full px-3 py-2 border border-red-300 rounded-lg text-sm bg-white text-gray-900 placeholder-gray-500 mb-3"
            rows="3"
          />
          <div className="flex gap-2">
            <button
              onClick={handleRejectSelected}
              disabled={loading || selectedStudents.length === 0}
              className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              Reject{" "}
              {selectedStudents.length > 0
                ? `(${selectedStudents.length})`
                : ""}
            </button>
            <button
              onClick={() => {
                setShowRejectionForm(false);
                setRejectionReason("");
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Bottom Actions */}
      <div className="flex gap-2 pt-6 border-t border-gray-200">
        {status === "PENDING" && (
          <>
            <button
              onClick={handleApproveSelected}
              disabled={loading || selectedStudents.length === 0}
              className="flex items-center gap-2 flex-1 bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              <FaCheck /> Approve ({selectedStudents.length})
            </button>
            <button
              onClick={() => setShowRejectionForm(true)}
              disabled={loading || selectedStudents.length === 0}
              className="flex items-center gap-2 flex-1 bg-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              <FaTimes /> Reject ({selectedStudents.length})
            </button>
          </>
        )}

        {status === "APPROVED" && (
          <>
            <button
              onClick={handleExportCSV}
              disabled={loading || filteredRequests.length === 0}
              className="flex items-center gap-2 flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <FaDownload /> Export CSV
            </button>
            {selectedStudents.length > 0 && (
              <button
                onClick={() => {
                  if (confirm("Remove selected students?")) {
                    selectedStudents.forEach((sid) => handleRemoveStudent(sid));
                  }
                }}
                disabled={loading}
                className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                <FaTrash /> Remove ({selectedStudents.length})
              </button>
            )}
          </>
        )}

        {status === "REJECTED" && (
          <button
            onClick={handleExportCSV}
            disabled={loading || filteredRequests.length === 0}
            className="flex items-center gap-2 flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <FaDownload /> Export CSV
          </button>
        )}

        {selectedStudents.length > 0 && (
          <button
            onClick={onClearSelection}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-semibold"
          >
            Clear Selection
          </button>
        )}
      </div>
    </div>
  );
}
