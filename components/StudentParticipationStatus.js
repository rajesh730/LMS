"use client";

import { useEffect, useState } from "react";
import { FaCheckCircle, FaClock, FaEye, FaTimesCircle } from "react-icons/fa";

export default function StudentParticipationStatus() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    fetchParticipationStatus();
  }, []);

  const fetchParticipationStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/student/participation-status");
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setRequests(Array.isArray(data.data) ? data.data : []);
      } else {
        setMessage(`Error: ${data.message || "Failed to load participation status"}`);
      }
    } catch (error) {
      console.error("Error fetching participation status:", error);
      setMessage("Error: Network error");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const classes =
      "px-3 py-1 rounded-full text-sm font-medium inline-flex items-center gap-2";
    switch (status) {
      case "PENDING":
        return (
          <span className={`${classes} bg-yellow-100 text-yellow-800`}>
            <FaClock size={14} /> Pending Review
          </span>
        );
      case "APPROVED":
        return (
          <span className={`${classes} bg-blue-100 text-blue-800`}>
            <FaCheckCircle size={14} /> Approved
          </span>
        );
      case "ENROLLED":
        return (
          <span className={`${classes} bg-green-100 text-green-800`}>
            <FaCheckCircle size={14} /> Enrolled
          </span>
        );
      case "REJECTED":
        return (
          <span className={`${classes} bg-red-100 text-red-800`}>
            <FaTimesCircle size={14} /> Rejected
          </span>
        );
      default:
        return <span className={`${classes} bg-gray-100 text-gray-800`}>{status}</span>;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "PENDING":
        return "bg-yellow-50 border-yellow-200";
      case "APPROVED":
        return "bg-blue-50 border-blue-200";
      case "ENROLLED":
        return "bg-green-50 border-green-200";
      case "REJECTED":
        return "bg-red-50 border-red-200";
      default:
        return "bg-gray-50 border-gray-200";
    }
  };

  const getPresentationLabel = (presentation) => {
    if (!presentation) return "";
    if (presentation.finalOutcomeReady) return "Final outcome ready";
    if (presentation.registrationLocked) return "Registration closed";
    if (presentation.isPublicResultAvailable) return "Public result available";
    return "";
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <div className="animate-spin inline-block h-8 w-8 rounded-full border-4 border-blue-500 border-t-transparent" />
        <p className="mt-3 text-gray-600">Loading participation status...</p>
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <FaEye size={32} className="mx-auto mb-3 text-gray-400" />
        <p className="text-gray-600">No participation requests yet</p>
        <p className="mt-2 text-sm text-gray-500">
          Submit a request for an event to see its status here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {message && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
          {message}
        </div>
      )}

      <div className="grid gap-4">
        {requests.map((request) => (
          <div
            key={request._id}
            className={`rounded-lg border p-4 ${getStatusColor(request.status)}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">
                  {request.event?.title || "Event"}
                </h3>
                <div className="mt-2 flex items-center gap-2">
                  {getStatusBadge(request.status)}
                </div>

                {request.status === "REJECTED" && request.rejectionReason && (
                  <div className="mt-3 rounded border border-red-300 bg-red-100 p-2">
                    <p className="text-sm text-red-800">
                      <span className="font-semibold">Rejection Reason:</span>{" "}
                      {request.rejectionReason}
                    </p>
                  </div>
                )}

                {request.validationErrors?.length > 0 && (
                  <div className="mt-3 rounded border border-yellow-300 bg-yellow-100 p-2">
                    <p className="mb-1 text-sm font-semibold text-yellow-800">
                      Validation Issues:
                    </p>
                    <ul className="list-inside list-disc text-sm text-yellow-800">
                      {request.validationErrors.map((error, idx) => (
                        <li key={idx}>{error}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <p className="mt-2 text-sm text-gray-600">
                  Requested on: {new Date(request.requestedAt).toLocaleDateString()}
                </p>

                {request.event?.date && (
                  <p className="text-sm text-gray-600">
                    Event Date: {new Date(request.event.date).toLocaleDateString()}
                  </p>
                )}

                {getPresentationLabel(request.presentation) && (
                  <p className="text-sm text-gray-600">
                    Event State: {getPresentationLabel(request.presentation)}
                  </p>
                )}
              </div>

              <button
                onClick={() => {
                  setSelectedRequest(request);
                  setShowDetails(true);
                }}
                className="ml-4 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-600"
              >
                View Details
              </button>
            </div>
          </div>
        ))}
      </div>

      {showDetails && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6">
            <h2 className="mb-4 text-2xl font-bold text-gray-900">
              {selectedRequest.event?.title || "Event"}
            </h2>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <div className="mt-1">{getStatusBadge(selectedRequest.status)}</div>
              </div>

              {selectedRequest.event?.description && (
                <div>
                  <p className="text-sm text-gray-600">Description</p>
                  <p className="mt-1 text-gray-900">
                    {selectedRequest.event.description}
                  </p>
                </div>
              )}

              {selectedRequest.event?.date && (
                <div>
                  <p className="text-sm text-gray-600">Event Date</p>
                  <p className="mt-1 text-gray-900">
                    {new Date(selectedRequest.event.date).toLocaleDateString()}
                  </p>
                </div>
              )}

              <div>
                <p className="text-sm text-gray-600">Requested On</p>
                <p className="mt-1 text-gray-900">
                  {new Date(selectedRequest.requestedAt).toLocaleDateString()}
                </p>
              </div>

              {selectedRequest.presentation && (
                <div className="rounded border border-slate-200 bg-slate-50 p-3">
                  <p className="mb-1 text-sm font-semibold text-slate-900">
                    Current Event Mode
                  </p>
                  <p className="text-sm text-slate-700">
                    {selectedRequest.presentation.finalOutcomeReady
                      ? "Final outcome available"
                      : selectedRequest.presentation.registrationLocked
                      ? "Registration closed and event is in tracking mode"
                      : "Registration or approval flow is still active"}
                  </p>
                </div>
              )}

              {selectedRequest.status === "APPROVED" && (
                <div className="rounded border border-blue-200 bg-blue-50 p-3">
                  <p className="text-sm text-blue-900">
                    Your request has been approved. Awaiting final enrollment confirmation.
                  </p>
                </div>
              )}

              {selectedRequest.status === "ENROLLED" && (
                <div className="rounded border border-green-200 bg-green-50 p-3">
                  <p className="text-sm text-green-900">
                    You are successfully enrolled in this event.
                  </p>
                </div>
              )}

              {selectedRequest.rejectionReason && (
                <div className="rounded border border-red-200 bg-red-50 p-3">
                  <p className="mb-1 text-sm font-semibold text-red-900">
                    Rejection Reason:
                  </p>
                  <p className="text-sm text-red-900">
                    {selectedRequest.rejectionReason}
                  </p>
                </div>
              )}
            </div>

            <button
              onClick={() => setShowDetails(false)}
              className="mt-6 w-full rounded-lg bg-gray-500 px-4 py-2 font-medium text-white transition hover:bg-gray-600"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
