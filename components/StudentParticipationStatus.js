"use client";

import { useState, useEffect } from "react";
import { FaCheckCircle, FaClock, FaTimesCircle, FaEye } from "react-icons/fa";

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
      if (res.ok) {
        const data = await res.json();
        setRequests(Array.isArray(data.data) ? data.data : []);
      } else {
        const error = await res.json();
        setMessage(
          `❌ ${error.message || "Failed to load participation status"}`
        );
      }
    } catch (error) {
      console.error("Error fetching participation status:", error);
      setMessage("❌ Network error");
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "PENDING":
        return <FaClock className="text-yellow-500" />;
      case "APPROVED":
        return <FaCheckCircle className="text-blue-500" />;
      case "ENROLLED":
        return <FaCheckCircle className="text-green-500" />;
      case "REJECTED":
        return <FaTimesCircle className="text-red-500" />;
      default:
        return <FaClock className="text-gray-500" />;
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
        return (
          <span className={`${classes} bg-gray-100 text-gray-800`}>
            {status}
          </span>
        );
    }
  };

  const handleViewDetails = (request) => {
    setSelectedRequest(request);
    setShowDetails(true);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <div className="animate-spin inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
        <p className="mt-3 text-gray-600">Loading participation status...</p>
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <FaEye size={32} className="mx-auto text-gray-400 mb-3" />
        <p className="text-gray-600">No participation requests yet</p>
        <p className="text-gray-500 text-sm mt-2">
          Submit a request for an event to see its status here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {message && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {message}
        </div>
      )}

      <div className="grid gap-4">
        {requests.map((request) => (
          <div
            key={request._id}
            className={`border rounded-lg p-4 ${getStatusColor(
              request.status
            )}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 text-lg">
                  {request.event?.title || "Event"}
                </h3>
                <div className="mt-2 flex items-center gap-2">
                  {getStatusBadge(request.status)}
                </div>

                {request.status === "REJECTED" && request.rejectionReason && (
                  <div className="mt-3 bg-red-100 border border-red-300 rounded p-2">
                    <p className="text-sm text-red-800">
                      <span className="font-semibold">Rejection Reason:</span>{" "}
                      {request.rejectionReason}
                    </p>
                  </div>
                )}

                {request.validationErrors &&
                  request.validationErrors.length > 0 && (
                    <div className="mt-3 bg-yellow-100 border border-yellow-300 rounded p-2">
                      <p className="text-sm font-semibold text-yellow-800 mb-1">
                        Validation Issues:
                      </p>
                      <ul className="text-sm text-yellow-800 list-disc list-inside">
                        {request.validationErrors.map((error, idx) => (
                          <li key={idx}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                <p className="text-sm text-gray-600 mt-2">
                  Requested on:{" "}
                  {new Date(request.requestedAt).toLocaleDateString()}
                </p>

                {request.event?.date && (
                  <p className="text-sm text-gray-600">
                    Event Date:{" "}
                    {new Date(request.event.date).toLocaleDateString()}
                  </p>
                )}
              </div>

              <button
                onClick={() => handleViewDetails(request)}
                className="ml-4 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition"
              >
                View Details
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Details Modal */}
      {showDetails && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {selectedRequest.event?.title || "Event"}
            </h2>

            <div className="space-y-4">
              <div>
                <p className="text-gray-600 text-sm">Status</p>
                <div className="mt-1">
                  {getStatusBadge(selectedRequest.status)}
                </div>
              </div>

              {selectedRequest.event?.description && (
                <div>
                  <p className="text-gray-600 text-sm">Description</p>
                  <p className="text-gray-900 mt-1">
                    {selectedRequest.event.description}
                  </p>
                </div>
              )}

              {selectedRequest.event?.date && (
                <div>
                  <p className="text-gray-600 text-sm">Event Date</p>
                  <p className="text-gray-900 mt-1">
                    {new Date(selectedRequest.event.date).toLocaleDateString()}
                  </p>
                </div>
              )}

              <div>
                <p className="text-gray-600 text-sm">Requested On</p>
                <p className="text-gray-900 mt-1">
                  {new Date(selectedRequest.requestedAt).toLocaleDateString()}
                </p>
              </div>

              {selectedRequest.status === "APPROVED" && (
                <div className="bg-blue-50 border border-blue-200 rounded p-3">
                  <p className="text-blue-900 text-sm">
                    Your request has been approved! Awaiting final enrollment
                    confirmation.
                  </p>
                </div>
              )}

              {selectedRequest.status === "ENROLLED" && (
                <div className="bg-green-50 border border-green-200 rounded p-3">
                  <p className="text-green-900 text-sm">
                    ✓ You are successfully enrolled in this event!
                  </p>
                </div>
              )}

              {selectedRequest.rejectionReason && (
                <div className="bg-red-50 border border-red-200 rounded p-3">
                  <p className="text-red-900 text-sm font-semibold mb-1">
                    Rejection Reason:
                  </p>
                  <p className="text-red-900 text-sm">
                    {selectedRequest.rejectionReason}
                  </p>
                </div>
              )}
            </div>

            <button
              onClick={() => setShowDetails(false)}
              className="w-full mt-6 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
