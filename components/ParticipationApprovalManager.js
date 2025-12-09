"use client";

import { useState, useEffect } from "react";
import {
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaFilter,
  FaDownload,
} from "react-icons/fa";

export default function ParticipationApprovalManager() {
  const [requests, setRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("PENDING"); // PENDING, APPROVED, REJECTED, ALL
  const [message, setMessage] = useState("");
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [notes, setNotes] = useState("");
  const [showForceEnroll, setShowForceEnroll] = useState(false);
  const [validationErrors, setValidationErrors] = useState([]);

  useEffect(() => {
    fetchRequests();
  }, []);

  useEffect(() => {
    applyFilter();
  }, [filter, requests]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/participation-requests");
      if (res.ok) {
        const response = await res.json();
        // API returns { success, message, data: [...] }
        const requestsList = Array.isArray(response)
          ? response
          : response.data || [];
        setRequests(requestsList);
      } else {
        const error = await res.json();
        setMessage(`❌ ${error.message || "Failed to load requests"}`);
      }
    } catch (error) {
      console.error("Error fetching requests:", error);
      setMessage("❌ Network error fetching requests");
    } finally {
      setLoading(false);
    }
  };

  const applyFilter = () => {
    if (filter === "ALL") {
      setFilteredRequests(requests);
    } else {
      setFilteredRequests(requests.filter((r) => r.status === filter));
    }
  };

  const handleApprove = async (requestId, forceEnroll = false) => {
    try {
      const res = await fetch("/api/participation-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId,
          action: "APPROVE",
          notes,
          forceEnroll,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage("✅ Request approved successfully");
        fetchRequests();
        setShowDetails(false);
        setShowForceEnroll(false);
        setNotes("");
        setValidationErrors([]);
        setTimeout(() => setMessage(""), 3000);
      } else {
        // If validation failed, extract the errors
        if (data.message && data.message.includes("Cannot approve")) {
          const errorText = data.message.replace("Cannot approve: ", "");
          const errors = errorText.split(" | ");
          setValidationErrors(errors);
          setShowForceEnroll(true);
        } else {
          setMessage(`❌ ${data.message || "Failed to approve request"}`);
        }
      }
    } catch (error) {
      console.error("Error approving request:", error);
      setMessage("❌ Network error approving request");
    }
  };

  const handleEnroll = async (requestId) => {
    try {
      const res = await fetch(
        `/api/participation-requests/${requestId}/enroll`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      );

      const data = await res.json();

      if (res.ok) {
        setMessage("✅ Student enrolled successfully!");
        fetchRequests();
        setShowDetails(false);
        setTimeout(() => setMessage(""), 3000);
      } else {
        setMessage(`❌ ${data.message || "Failed to enroll student"}`);
      }
    } catch (error) {
      console.error("Enrollment error:", error);
      setMessage("❌ Network error enrolling student");
    }
  };

  const handleReject = async (requestId) => {
    if (!rejectionReason.trim()) {
      setMessage("❌ Please provide a rejection reason");
      return;
    }

    try {
      const res = await fetch("/api/participation-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId,
          action: "REJECT",
          rejectionReason,
          notes,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage("✅ Request rejected successfully");
        fetchRequests();
        setShowDetails(false);
        setRejectionReason("");
        setNotes("");
        setTimeout(() => setMessage(""), 3000);
      } else {
        setMessage(`❌ ${data.message || "Failed to reject request"}`);
      }
    } catch (error) {
      console.error("Error rejecting request:", error);
      setMessage("❌ Network error rejecting request");
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "PENDING":
        return "bg-yellow-500/10 text-yellow-400 border-yellow-500/30";
      case "APPROVED":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
      case "REJECTED":
        return "bg-red-500/10 text-red-400 border-red-500/30";
      default:
        return "bg-slate-500/10 text-slate-400 border-slate-500/30";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "PENDING":
        return <FaClock className="text-yellow-400" />;
      case "APPROVED":
        return <FaCheckCircle className="text-emerald-400" />;
      case "REJECTED":
        return <FaTimesCircle className="text-red-400" />;
      default:
        return null;
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800">
        <h3 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
          <FaCheckCircle className="text-blue-400" /> Event Participation
          Requests
        </h3>
        <p className="text-slate-400">
          Review and approve/reject student requests to participate in events
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {["PENDING", "APPROVED", "REJECTED", "ALL"].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              filter === status
                ? "bg-blue-600 text-white"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            {status === "ALL" ? "All" : status} (
            {status === "ALL"
              ? requests.length
              : requests.filter((r) => r.status === status).length}
            )
          </button>
        ))}
      </div>

      {/* Message */}
      {message && (
        <div
          className={`p-4 rounded-lg ${
            message.includes("✅")
              ? "bg-emerald-500/10 text-emerald-400"
              : "bg-red-500/10 text-red-400"
          }`}
        >
          {message}
        </div>
      )}

      {/* Requests Table/List */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">
          Loading participation requests...
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="bg-slate-900/50 p-12 rounded-xl border border-slate-800 border-dashed text-center">
          <FaFilter className="text-4xl text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 text-lg">No requests found</p>
          <p className="text-slate-500 text-sm mt-2">
            {filter === "PENDING"
              ? "All pending requests have been reviewed"
              : `No ${filter.toLowerCase()} requests`}
          </p>
        </div>
      ) : (
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-800/50 border-b border-slate-700">
                  <th className="text-left py-4 px-6 text-slate-300 font-semibold">
                    Student
                  </th>
                  <th className="text-left py-4 px-6 text-slate-300 font-semibold">
                    Event
                  </th>
                  <th className="text-left py-4 px-6 text-slate-300 font-semibold">
                    Status
                  </th>
                  <th className="text-left py-4 px-6 text-slate-300 font-semibold">
                    Requested
                  </th>
                  <th className="text-center py-4 px-6 text-slate-300 font-semibold">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.map((request) => (
                  <tr
                    key={request._id}
                    className="border-b border-slate-700 hover:bg-slate-800/30 transition"
                  >
                    <td className="py-4 px-6">
                      <div className="text-white font-medium">
                        {request.student?.name || "Unknown"}
                      </div>
                      <div className="text-xs text-slate-500">
                        {request.student?.email || "-"}
                      </div>
                      <div className="text-xs text-slate-500">
                        Grade: {request.student?.grade || "N/A"}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div
                        className={`text-white font-medium ${
                          !request.event ? "text-red-400" : ""
                        }`}
                      >
                        {request.event?.title || (
                          <span className="flex items-center gap-2">
                            <span className="text-red-400">⚠️</span>
                            Deleted Event
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500">
                        {request.event?.date
                          ? new Date(request.event.date).toLocaleDateString()
                          : "N/A"}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border ${getStatusColor(
                          request.status
                        )}`}
                      >
                        {getStatusIcon(request.status)}
                        {request.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-slate-400 text-xs">
                      {formatDate(request.requestedAt)}
                    </td>
                    <td className="py-4 px-6 text-center">
                      {request.status === "PENDING" ? (
                        <button
                          onClick={() => {
                            setSelectedRequest(request);
                            setShowDetails(true);
                          }}
                          className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded font-medium transition text-xs"
                        >
                          Review
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setSelectedRequest(request);
                            setShowDetails(true);
                          }}
                          className="bg-slate-700 hover:bg-slate-600 text-slate-300 px-4 py-2 rounded font-medium transition text-xs"
                        >
                          View
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetails && selectedRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              {getStatusIcon(selectedRequest.status)}
              Request Details
            </h2>

            <div className="space-y-6">
              {/* Deleted Event Warning */}
              {!selectedRequest.event && (
                <div className="bg-red-900/30 border border-red-700 p-4 rounded-lg flex items-start gap-3">
                  <span className="text-red-400 text-xl mt-0.5">⚠️</span>
                  <div>
                    <p className="text-red-300 font-semibold">Event Deleted</p>
                    <p className="text-red-400 text-sm mt-1">
                      This event has been deleted. You can still approve or
                      reject this participation request, but the associated
                      event no longer exists.
                    </p>
                  </div>
                </div>
              )}

              {/* Student Info */}
              <div className="bg-slate-800/50 p-4 rounded-lg">
                <h3 className="text-sm font-semibold text-slate-300 mb-3">
                  Student Information
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Name:</span>
                    <span className="text-white">
                      {selectedRequest.student?.name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Email:</span>
                    <span className="text-white">
                      {selectedRequest.student?.email}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Grade:</span>
                    <span className="text-white">
                      {selectedRequest.student?.grade}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Roll Number:</span>
                    <span className="text-white">
                      {selectedRequest.student?.rollNumber}
                    </span>
                  </div>
                </div>
              </div>

              {/* Event Info */}
              <div className="bg-slate-800/50 p-4 rounded-lg">
                <h3 className="text-sm font-semibold text-slate-300 mb-3">
                  Event Information
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Event:</span>
                    <span className="text-white">
                      {selectedRequest.event?.title || (
                        <span className="flex items-center gap-2 text-red-400">
                          <span>⚠️</span>
                          Deleted Event
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Date:</span>
                    <span className="text-white">
                      {selectedRequest.event?.date
                        ? formatDate(selectedRequest.event.date)
                        : "N/A"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Request Status */}
              <div className="bg-slate-800/50 p-4 rounded-lg">
                <h3 className="text-sm font-semibold text-slate-300 mb-3">
                  Request Status
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Status:</span>
                    <span
                      className={`px-3 py-1 rounded-full font-medium flex items-center gap-2 ${getStatusColor(
                        selectedRequest.status
                      )}`}
                    >
                      {getStatusIcon(selectedRequest.status)}
                      {selectedRequest.status}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Requested:</span>
                    <span className="text-white">
                      {formatDate(selectedRequest.requestedAt)}
                    </span>
                  </div>
                  {selectedRequest.status === "APPROVED" && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Approved:</span>
                      <span className="text-emerald-400">
                        {formatDate(selectedRequest.approvedAt)}
                      </span>
                    </div>
                  )}
                  {selectedRequest.status === "REJECTED" && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Rejected:</span>
                        <span className="text-red-400">
                          {formatDate(selectedRequest.rejectedAt)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Reason:</span>
                        <span className="text-red-300">
                          {selectedRequest.rejectionReason}
                        </span>
                      </div>
                    </>
                  )}
                  {selectedRequest.notes && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Notes:</span>
                      <span className="text-slate-300">
                        {selectedRequest.notes}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons - Only if PENDING */}
              {selectedRequest.status === "PENDING" && (
                <div className="space-y-4 pt-4 border-t border-slate-700">
                  {/* Validation Errors Display */}
                  {validationErrors.length > 0 && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                      <h4 className="text-sm font-semibold text-red-400 mb-3 flex items-center gap-2">
                        ⚠️ Validation Conflicts
                      </h4>
                      <ul className="space-y-2">
                        {validationErrors.map((error, idx) => (
                          <li
                            key={idx}
                            className="text-sm text-red-300 flex items-start gap-2"
                          >
                            <span className="text-red-400 mt-1">•</span>
                            <span>{error}</span>
                          </li>
                        ))}
                      </ul>
                      <p className="text-xs text-red-300 mt-3 pt-3 border-t border-red-500/20">
                        These eligibility criteria conflicts can be overridden
                        with Force Enroll below.
                      </p>
                    </div>
                  )}

                  {/* Force Enroll Checkbox */}
                  {validationErrors.length > 0 && (
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={showForceEnroll}
                          onChange={(e) => setShowForceEnroll(e.target.checked)}
                          className="mt-1 w-4 h-4 rounded border-amber-500/50"
                        />
                        <div>
                          <div className="text-sm font-semibold text-amber-400">
                            Force Enroll Override
                          </div>
                          <div className="text-xs text-amber-300 mt-1">
                            Approve enrollment despite validation conflicts.
                            This action will be logged.
                          </div>
                        </div>
                      </label>
                    </div>
                  )}

                  {/* Rejection Reason */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">
                      Rejection Reason (if rejecting)
                    </label>
                    <textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="e.g., Class full, eligibility criteria not met..."
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 text-sm"
                      rows="2"
                    />
                  </div>

                  {/* General Notes */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">
                      Additional Notes (optional)
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="e.g., Alternative event available..."
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 text-sm"
                      rows="2"
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={() =>
                        handleApprove(selectedRequest._id, showForceEnroll)
                      }
                      className={`flex-1 text-white px-4 py-3 rounded-lg font-semibold transition flex items-center justify-center gap-2 ${
                        validationErrors.length > 0 && !showForceEnroll
                          ? "bg-slate-600 cursor-not-allowed"
                          : "bg-emerald-600 hover:bg-emerald-500"
                      }`}
                      disabled={validationErrors.length > 0 && !showForceEnroll}
                    >
                      <FaCheckCircle />{" "}
                      {showForceEnroll ? "Force Enroll" : "Approve"}
                    </button>
                    <button
                      onClick={() => handleReject(selectedRequest._id)}
                      className="flex-1 bg-red-600 hover:bg-red-500 text-white px-4 py-3 rounded-lg font-semibold transition flex items-center justify-center gap-2"
                    >
                      <FaTimesCircle /> Reject
                    </button>
                    <button
                      onClick={() => {
                        setShowDetails(false);
                        setValidationErrors([]);
                        setShowForceEnroll(false);
                      }}
                      className="flex-1 bg-slate-700 hover:bg-slate-600 text-white px-4 py-3 rounded-lg font-semibold transition"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}

              {/* Action Buttons - For non-pending requests */}
              {selectedRequest.status !== "PENDING" && (
                <div className="space-y-3">
                  {/* For APPROVED: Show Enroll and Reject options */}
                  {selectedRequest.status === "APPROVED" && (
                    <>
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleEnroll(selectedRequest._id)}
                          className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-3 rounded-lg font-semibold transition flex items-center justify-center gap-2"
                        >
                          <FaCheckCircle /> Finalize Enrollment
                        </button>
                        <button
                          onClick={() => handleReject(selectedRequest._id)}
                          className="flex-1 bg-red-600 hover:bg-red-500 text-white px-4 py-3 rounded-lg font-semibold transition flex items-center justify-center gap-2"
                        >
                          <FaTimesCircle /> Change to Reject
                        </button>
                      </div>
                      <p className="text-xs text-slate-400 text-center">
                        Changed your mind? You can still reject this request.
                      </p>
                    </>
                  )}

                  {/* For REJECTED: Show Re-approve option */}
                  {selectedRequest.status === "REJECTED" && (
                    <>
                      <button
                        onClick={() =>
                          handleApprove(selectedRequest._id, showForceEnroll)
                        }
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-3 rounded-lg font-semibold transition flex items-center justify-center gap-2"
                      >
                        <FaCheckCircle /> Re-approve Request
                      </button>
                      <p className="text-xs text-slate-400 text-center">
                        Want to reconsider? You can re-approve this request.
                      </p>
                    </>
                  )}

                  <button
                    onClick={() => setShowDetails(false)}
                    className="w-full bg-slate-700 hover:bg-slate-600 text-white px-4 py-3 rounded-lg font-semibold transition"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
