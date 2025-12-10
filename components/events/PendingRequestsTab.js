"use client";

import { useState } from "react";
import { FaCheckCircle, FaTimesCircle, FaSpinner } from "react-icons/fa";

export default function PendingRequestsTab({
  requests,
  event,
  onApprovalChange,
}) {
  const [selectedRequests, setSelectedRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionInProgress, setActionInProgress] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);

  const toggleRequest = (requestId) => {
    setSelectedRequests((prev) =>
      prev.includes(requestId)
        ? prev.filter((id) => id !== requestId)
        : [...prev, requestId]
    );
  };

  const toggleAll = () => {
    if (selectedRequests.length === requests.length) {
      setSelectedRequests([]);
    } else {
      setSelectedRequests(requests.map((r) => r._id));
    }
  };

  const handleApprove = async (requestIds) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/events/${event.id}/approve`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestIds, action: "approve" }),
      });

      if (res.ok) {
        setSelectedRequests([]);
        onApprovalChange();
      }
    } catch (error) {
      console.error("Error approving:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (requestIds) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/events/${event.id}/manage/reject`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestIds, reason: rejectReason }),
      });

      if (res.ok) {
        setSelectedRequests([]);
        setRejectReason("");
        setShowRejectForm(false);
        onApprovalChange();
      }
    } catch (error) {
      console.error("Error rejecting:", error);
    } finally {
      setLoading(false);
    }
  };

  if (requests.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500 text-lg">No pending requests</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Bulk Actions */}
      {selectedRequests.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex justify-between items-center">
          <span className="text-blue-900 font-semibold">
            {selectedRequests.length} request(s) selected
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => handleApprove(selectedRequests)}
              disabled={loading}
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-semibold disabled:opacity-50 flex items-center gap-2"
            >
              {loading && actionInProgress === "approve" && (
                <FaSpinner className="animate-spin" />
              )}
              Approve Selected
            </button>
            <button
              onClick={() => setShowRejectForm(true)}
              disabled={loading}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-semibold disabled:opacity-50"
            >
              Reject Selected
            </button>
          </div>
        </div>
      )}

      {/* Reject Form */}
      {showRejectForm && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-3">
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Reason for rejection..."
            className="w-full p-3 border border-red-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            rows="3"
          />
          <div className="flex gap-2">
            <button
              onClick={() => handleReject(selectedRequests)}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-semibold disabled:opacity-50"
            >
              Confirm Rejection
            </button>
            <button
              onClick={() => {
                setShowRejectForm(false);
                setRejectReason("");
              }}
              className="bg-slate-300 hover:bg-slate-400 text-slate-900 px-4 py-2 rounded-lg font-semibold"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Requests Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 border-b border-slate-300">
            <tr>
              <th className="p-3 text-left">
                <input
                  type="checkbox"
                  checked={
                    selectedRequests.length === requests.length &&
                    requests.length > 0
                  }
                  onChange={toggleAll}
                  className="rounded cursor-pointer"
                />
              </th>
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
                Requested
              </th>
              <th className="p-3 text-left font-semibold text-slate-700">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {requests.map((request) => (
              <tr
                key={request._id}
                className="border-b border-slate-200 hover:bg-slate-50"
              >
                <td className="p-3">
                  <input
                    type="checkbox"
                    checked={selectedRequests.includes(request._id)}
                    onChange={() => toggleRequest(request._id)}
                    className="rounded cursor-pointer"
                  />
                </td>
                <td className="p-3 font-medium">{request.student.name}</td>
                <td className="p-3">{request.school.name}</td>
                <td className="p-3">{request.student.grade}</td>
                <td className="p-3 text-xs text-slate-500">
                  {new Date(request.requestedAt).toLocaleDateString()}
                </td>
                <td className="p-3 flex gap-2">
                  <button
                    onClick={() => handleApprove([request._id])}
                    disabled={loading}
                    className="text-green-600 hover:text-green-700 font-semibold disabled:opacity-50"
                    title="Approve"
                  >
                    <FaCheckCircle size={18} />
                  </button>
                  <button
                    onClick={() => {
                      setSelectedRequests([request._id]);
                      setShowRejectForm(true);
                    }}
                    disabled={loading}
                    className="text-red-600 hover:text-red-700 font-semibold disabled:opacity-50"
                    title="Reject"
                  >
                    <FaTimesCircle size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
