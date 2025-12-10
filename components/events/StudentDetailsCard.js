"use client";

import {
  FaUser,
  FaPhone,
  FaSchool,
  FaCalendar,
  FaCheck,
  FaTimes,
  FaTrash,
  FaTimes as FaClose,
} from "react-icons/fa";

export default function StudentDetailsCard({
  request,
  event,
  status,
  onClose,
  onApprove,
  onReject,
  onRemove,
  loading,
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold mb-2">{request.student.name}</h2>
            <p className="text-blue-100">
              {request.school.name} • Grade {request.student.grade}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-blue-100 text-2xl"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Contact Information */}
          <section>
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <FaPhone className="text-blue-600" /> Contact Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">
                  Contact Person
                </label>
                <p className="text-gray-900 font-semibold mt-1">
                  {request.contactPerson || "N/A"}
                </p>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">
                  Phone Number
                </label>
                <p className="text-gray-900 font-semibold mt-1">
                  {request.phone || "N/A"}
                </p>
              </div>
            </div>
          </section>

          {/* School & Grade */}
          <section>
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <FaSchool className="text-blue-600" /> School Details
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">
                  School
                </label>
                <p className="text-gray-900 font-semibold mt-1">
                  {request.school.name}
                </p>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">
                  Grade
                </label>
                <p className="text-gray-900 font-semibold mt-1">
                  {request.student.grade}
                </p>
              </div>
            </div>
          </section>

          {/* Notes */}
          {request.notes && (
            <section>
              <h3 className="text-lg font-bold text-gray-900 mb-4">Notes</h3>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <p className="text-gray-700">{request.notes}</p>
              </div>
            </section>
          )}

          {/* Rejection Reason */}
          {request.rejectionReason && (
            <section>
              <h3 className="text-lg font-bold text-gray-900 mb-4 text-red-600">
                Rejection Reason
              </h3>
              <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                <p className="text-red-700">{request.rejectionReason}</p>
              </div>
            </section>
          )}

          {/* Request Dates */}
          <section>
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <FaCalendar className="text-blue-600" /> Request Timeline
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">
                  Submitted
                </label>
                <p className="text-gray-900 font-semibold mt-1">
                  {new Date(request.createdAt).toLocaleDateString()}
                </p>
              </div>
              {request.status === "ENROLLED" && request.approvedAt && (
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">
                    Approved
                  </label>
                  <p className="text-gray-900 font-semibold mt-1">
                    {new Date(request.approvedAt).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Status Badge */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">
              Current Status
            </p>
            <span
              className={`inline-block px-4 py-2 rounded-lg font-semibold text-sm ${
                request.status === "PENDING"
                  ? "bg-yellow-100 text-yellow-700"
                  : request.status === "ENROLLED"
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {request.status}
            </span>
          </div>
        </div>

        {/* Actions Footer */}
        <div className="bg-gray-50 border-t border-gray-200 p-6 flex gap-3">
          {status === "PENDING" && (
            <>
              <button
                onClick={onApprove}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-3 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                <FaCheck /> Approve
              </button>
              <button
                onClick={onReject}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 bg-red-600 text-white px-4 py-3 rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                <FaTimes /> Reject
              </button>
            </>
          )}

          {status === "APPROVED" && (
            <button
              onClick={onRemove}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 bg-red-600 text-white px-4 py-3 rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              <FaTrash /> Remove Student
            </button>
          )}

          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-100 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
