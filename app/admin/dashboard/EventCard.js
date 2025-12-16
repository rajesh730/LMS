"use client";

import { useState } from "react";
import {
  FaUsers,
  FaChevronDown,
  FaChevronUp,
  FaTrash,
  FaClock,
  FaPhone,
  FaUser,
  FaUserGraduate,
  FaCalendarAlt,
  FaDownload,
  FaSpinner,
  FaEdit,
  FaCheck,
  FaTimes,
  FaUndo,
  FaArchive,
} from "react-icons/fa";

export default function EventCard({
  event,
  onDelete,
  isDeleting,
  onEdit,
  filterContext,
  onViewParticipants,
  onUpdateStatus,
}) {
  // Filter participants based on context
  const displayedParticipants = event.participants?.filter((p) => {
    if (!filterContext || filterContext === "ALL") return true;
    if (filterContext === "PENDING") return p.status === "PENDING";
    if (filterContext === "APPROVED") return p.status === "APPROVED";
    if (filterContext === "REJECTED") return p.status === "REJECTED";
    return true;
  });

  const totalParticipants = displayedParticipants?.length || 0;

  // Calculate detailed stats
  const allParticipants = event.participants || [];
  const stats = {
    totalSchools: allParticipants.length,
    pendingSchools: allParticipants.filter((p) => p.status === "PENDING")
      .length,
    approvedSchools: allParticipants.filter((p) => p.status === "APPROVED")
      .length,
    rejectedSchools: allParticipants.filter((p) => p.status === "REJECTED")
      .length,
    totalStudents: allParticipants.reduce(
      (sum, p) => sum + (p.expectedStudents || p.students?.length || 0),
      0
    ),
    approvedStudents: allParticipants
      .filter((p) => p.status === "APPROVED")
      .reduce(
        (sum, p) => sum + (p.expectedStudents || p.students?.length || 0),
        0
      ),
  };

  // Use pre-calculated counts from API if available, otherwise fallback
  const participantCount =
    event.schoolCount !== undefined
      ? event.schoolCount
      : event.participants?.length || 0;
  const totalExpectedStudents =
    event.studentCount !== undefined
      ? event.studentCount
      : event.participants?.reduce(
          (sum, p) => sum + (p.expectedStudents || 0),
          0
        ) || 0;

  // Calculate days until deadline
  const getDaysUntilDeadline = () => {
    if (!event.registrationDeadline) return null;
    const deadline = new Date(event.registrationDeadline);
    const today = new Date();
    const diffTime = deadline - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysUntilDeadline = getDaysUntilDeadline();
  const isDeadlinePassed = daysUntilDeadline !== null && daysUntilDeadline < 0;

  const exportToCSV = () => {
    if (!event.participants || event.participants.length === 0) {
      alert("No participants to export");
      return;
    }

    const headers =
      "School Name,Contact Person,Phone,Expected Students,Joined Date,Notes";
    const rows = event.participants.map((p) => {
      const schoolName = p.school?.schoolName || "Unknown";
      const joinDate = new Date(p.joinedAt).toLocaleDateString();
      return `"${schoolName}","${p.contactPerson || ""}","${
        p.contactPhone || ""
      }","${p.expectedStudents || 0}","${joinDate}","${p.notes || ""}"`;
    });

    const csvContent =
      "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `${event.title.replace(/[^a-z0-9]/gi, "_")}_participants.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Progress percentage for max participants
  const progressPercent = event.maxParticipants
    ? Math.min((participantCount / event.maxParticipants) * 100, 100)
    : 0;

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="p-5">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h4 className="text-xl font-bold text-white mb-1">{event.title}</h4>
            <div className="flex items-center gap-3 text-sm text-slate-400">
              <span className="flex items-center gap-1">
                <FaCalendarAlt className="text-emerald-400" />
                {new Date(event.date).toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
              <span className="bg-slate-700 px-2 py-0.5 rounded text-xs">
                {event.targetGroup?.name || "Global"}
              </span>
            </div>

            {/* Limits Badges */}
            <div className="flex flex-wrap gap-2 mt-2">
              {(() => {
                const pendingCount =
                  event.participants?.filter((p) => p.status === "PENDING")
                    .length || 0;
                const rejectedCount =
                  event.participants?.filter((p) => p.status === "REJECTED")
                    .length || 0;

                // Context-based display (Priority)
                if (filterContext === "PENDING") {
                  if (pendingCount > 0) {
                    return (
                      <span className="text-xs px-2 py-1 rounded border bg-yellow-500/10 text-yellow-400 border-yellow-500/20 animate-pulse">
                        {pendingCount} Pending Requests
                      </span>
                    );
                  }
                  if (event.status === "PENDING") {
                    return (
                      <span className="text-xs px-2 py-1 rounded border bg-yellow-500/10 text-yellow-400 border-yellow-500/20">
                        Pending
                      </span>
                    );
                  }
                } else if (filterContext === "REJECTED") {
                  if (rejectedCount > 0) {
                    return (
                      <span className="text-xs px-2 py-1 rounded border bg-red-500/10 text-red-400 border-red-500/20">
                        {rejectedCount} Rejected
                      </span>
                    );
                  }
                  if (event.status === "REJECTED") {
                    return (
                      <span className="text-xs px-2 py-1 rounded border bg-red-500/10 text-red-400 border-red-500/20">
                        Rejected
                      </span>
                    );
                  }
                }
                return null;
              })()}
              {event.maxParticipantsPerSchool && (
                <span className="text-xs bg-slate-800 border border-slate-600 px-2 py-1 rounded text-slate-300">
                  Max {event.maxParticipantsPerSchool} Students/School
                </span>
              )}
              {event.eligibleGrades && event.eligibleGrades.length > 0 && (
                <span className="text-xs bg-slate-800 border border-slate-600 px-2 py-1 rounded text-slate-300">
                  Grades: {event.eligibleGrades.join(", ")}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Analytics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {/* Total Schools */}
          <div className="bg-slate-900/50 p-3 rounded-lg text-center border border-slate-800">
            <div className="text-2xl font-bold text-white">
              {stats.totalSchools}
            </div>
            <div className="text-xs text-slate-400 uppercase tracking-wider">
              Registered
            </div>
          </div>

          {/* Pending */}
          <div className="bg-slate-900/50 p-3 rounded-lg text-center border border-slate-800">
            <div className="text-2xl font-bold text-yellow-400">
              {stats.pendingSchools}
            </div>
            <div className="text-xs text-slate-400 uppercase tracking-wider">
              Pending
            </div>
          </div>

          {/* Approved */}
          <div className="bg-slate-900/50 p-3 rounded-lg text-center border border-slate-800">
            <div className="text-2xl font-bold text-emerald-400">
              {stats.approvedSchools}
            </div>
            <div className="text-xs text-slate-400 uppercase tracking-wider">
              Approved
            </div>
          </div>

          {/* Rejected */}
          <div className="bg-slate-900/50 p-3 rounded-lg text-center border border-slate-800">
            <div className="text-2xl font-bold text-red-400">
              {stats.rejectedSchools}
            </div>
            <div className="text-xs text-slate-400 uppercase tracking-wider">
              Rejected
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-slate-900/50 p-3 rounded-lg flex items-center justify-between px-4 border border-slate-800">
            <div>
              <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">
                Total Students
              </div>
              <div className="text-xl font-bold text-blue-400">
                {stats.totalStudents}
              </div>
            </div>
            <FaUserGraduate className="text-slate-600 text-2xl" />
          </div>

          <div className="bg-slate-900/50 p-3 rounded-lg flex items-center justify-between px-4 border border-slate-800">
            <div>
              <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">
                {isDeadlinePassed ? "Registration" : "Days Left"}
              </div>
              <div
                className={`text-xl font-bold ${
                  isDeadlinePassed
                    ? "text-red-400"
                    : daysUntilDeadline <= 3
                    ? "text-yellow-400"
                    : "text-white"
                }`}
              >
                {daysUntilDeadline !== null ? (
                  isDeadlinePassed ? (
                    "Closed"
                  ) : (
                    daysUntilDeadline
                  )
                ) : (
                  <span className="text-slate-500">∞</span>
                )}
              </div>
            </div>
            <FaClock className="text-slate-600 text-2xl" />
          </div>
        </div>

        {/* Progress bar for max participants */}
        {event.maxParticipants && (
          <div className="mb-4">
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>Slots Filled</span>
              <span>
                {participantCount} / {event.maxParticipants}
              </span>
            </div>
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  progressPercent >= 100
                    ? "bg-red-500"
                    : progressPercent >= 80
                    ? "bg-yellow-500"
                    : "bg-emerald-500"
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        <p className="text-slate-400 text-sm">{event.description}</p>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 mt-4">
          {/* Edit - Only if not archived */}
          {event.lifecycleStatus !== "ARCHIVED" && (
            <button
              onClick={() => onEdit && onEdit(event)}
              className="bg-blue-600 hover:bg-blue-500 text-white p-3 rounded-lg flex items-center justify-center transition shadow-lg hover:shadow-blue-500/20"
              title="Edit Event"
            >
              <FaEdit size={18} />
            </button>
          )}

          {/* Mark Complete - Only if ACTIVE */}
          {(event.lifecycleStatus === "ACTIVE" || !event.lifecycleStatus) && (
            <button
              onClick={() => onUpdateStatus && onUpdateStatus(event._id, "COMPLETED")}
              className="bg-emerald-600 hover:bg-emerald-500 text-white p-3 rounded-lg flex items-center justify-center transition shadow-lg hover:shadow-emerald-500/20"
              title="Mark as Complete"
            >
              <FaCheck size={18} />
            </button>
          )}

          {/* Archive (Soft Delete) - If not already archived */}
          {event.lifecycleStatus !== "ARCHIVED" && (
            <button
              onClick={() => onDelete(event._id, false)} // false = soft delete
              disabled={isDeleting}
              className="bg-orange-600 hover:bg-orange-500 text-white p-3 rounded-lg flex items-center justify-center transition shadow-lg hover:shadow-orange-500/20"
              title="Archive Event"
            >
              <FaArchive size={18} />
            </button>
          )}

          {/* Restore - If ARCHIVED */}
          {event.lifecycleStatus === "ARCHIVED" && (
            <button
              onClick={() => onUpdateStatus && onUpdateStatus(event._id, "ACTIVE")}
              className="bg-blue-600 hover:bg-blue-500 text-white p-3 rounded-lg flex items-center justify-center transition shadow-lg hover:shadow-blue-500/20"
              title="Restore to Active"
            >
              <FaUndo size={18} />
            </button>
          )}

          {/* Permanent Delete - Only if ARCHIVED */}
          {event.lifecycleStatus === "ARCHIVED" && (
            <button
              onClick={() => onDelete(event._id, true)} // true = permanent
              disabled={isDeleting}
              className={`p-3 rounded-lg flex items-center justify-center transition shadow-lg ${
                isDeleting
                  ? "bg-red-500/50 text-white/50 cursor-not-allowed"
                  : "bg-red-600 hover:bg-red-500 text-white hover:shadow-red-500/20"
              }`}
              title="Delete Permanently"
            >
              {isDeleting ? (
                <FaSpinner className="animate-spin" size={18} />
              ) : (
                <FaTrash size={18} />
              )}
            </button>
          )}

          {event.participants?.length > 0 && (
            <button
              onClick={() => onViewParticipants && onViewParticipants(event)}
              className="flex-1 py-2 bg-blue-500/10 text-blue-400 rounded-lg hover:bg-blue-500/20 transition flex items-center justify-center gap-2"
            >
              <FaUsers /> Manage Participants
            </button>
          )}
          {event.participants?.length > 0 && (
            <button
              onClick={exportToCSV}
              className="py-2 px-4 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition flex items-center gap-2"
            >
              <FaDownload /> Export
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
