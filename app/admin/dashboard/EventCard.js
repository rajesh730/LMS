"use client";

import Link from "next/link";
import {
  FaUsers,
  FaChevronDown,
  FaChevronUp,
  FaClock,
  FaPhone,
  FaUser,
  FaUserGraduate,
  FaCalendarAlt,
  FaDownload,
  FaEdit,
  FaCheck,
  FaTimes,
  FaUndo,
  FaArchive,
  FaCog,
  FaBell,
} from "react-icons/fa";
import { getEventStage, getStageClasses } from "@/lib/eventUiStatus";

export default function EventCard({
  event,
  onDelete,
  isDeleting,
  onEdit,
  filterContext,
  onViewParticipants,
  onUpdateStatus,
  actionMode = "manage",
}) {
  const isTeamEvent =
    String(event?.participationFormat || "INDIVIDUAL").toUpperCase() === "TEAM";
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
  const pendingEntries = event.pendingEntryCount ?? allParticipants.filter((p) => p.status === "PENDING").length;
  const approvedEntries = event.approvedEntryCount ?? allParticipants.filter((p) => p.status === "APPROVED").length;
  const rejectedEntries = event.rejectedEntryCount ?? allParticipants.filter((p) => p.status === "REJECTED").length;
  const stats = {
    totalSchools: event.schoolCount ?? allParticipants.length,
    pendingSchools: pendingEntries,
    approvedSchools: approvedEntries,
    rejectedSchools: rejectedEntries,
    totalStudents: isTeamEvent
      ? event.teamCount ??
        allParticipants.length
      : allParticipants.reduce(
          (sum, p) => sum + (p.expectedStudents || p.students?.length || 0),
          0
        ),
    approvedStudents: isTeamEvent
      ? approvedEntries
      : allParticipants
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

  const studentCapacityCount =
    event.studentCapacityCount ?? event.studentCount ?? totalExpectedStudents;

  // Progress percentage for total student capacity
  const progressPercent = event.maxParticipants
    ? Math.min((studentCapacityCount / event.maxParticipants) * 100, 100)
    : 0;
  const stage = getEventStage(event);
  const isManageMode = actionMode === "manage";
  const isCompletedMode = actionMode === "completed";
  const isArchivedMode = actionMode === "archived";

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/60 shadow-sm transition hover:border-slate-700">
      {/* Header */}
      <div className="p-6">
        <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-2xl font-bold text-white">{event.title}</h4>
              <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-300">
                {event.eventScope === "PLATFORM" ? "Platform" : "School"}
              </span>
              <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-300">
                {isTeamEvent ? "Team" : "Individual"}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-400">
              <span className="flex items-center gap-1">
                <FaCalendarAlt className="text-emerald-400" />
                {new Date(event.date).toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </div>

            <div
              className={`mt-3 rounded-xl border px-3 py-2 text-sm ${getStageClasses(
                stage.tone
              )}`}
            >
              <div className="font-semibold">{stage.label}</div>
              <div className="text-xs opacity-90">{stage.nextAction}</div>
            </div>

            {/* Limits Badges */}
            <div className="flex flex-wrap gap-2 mt-2">
              {(() => {
                const pendingCount =
                  event.pendingEntryCount ??
                  (event.participants?.filter((p) => p.status === "PENDING")
                    .length || 0);
                const rejectedCount =
                  event.rejectedEntryCount ??
                  (event.participants?.filter((p) => p.status === "REJECTED")
                    .length || 0);

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
                  Max {event.maxParticipantsPerSchool} {isTeamEvent ? "Teams" : "Students"}/School
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
                {isTeamEvent ? "Total Teams" : "Total Students"}
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
                  <span className="text-slate-500">No deadline</span>
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
              <span>{isTeamEvent ? "Team Capacity Filled" : "Student Capacity Filled"}</span>
              <span>
                {studentCapacityCount} / {event.maxParticipants}
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

        <p className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-sm leading-6 text-slate-300">
          {event.description || "No event description added yet."}
        </p>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 mt-4">
          {isManageMode && (
            <>
              <Link
                href={`/admin/events/${event._id}/manage`}
                className="py-2 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition flex items-center justify-center gap-2 font-semibold"
              >
                <FaCog /> Manage Event
              </Link>
              <Link
                href={`/admin/events/${event._id}/manage?tab=notices`}
                className="py-2 px-4 bg-[#0a2f66] hover:bg-[#1150a1] text-white rounded-lg transition flex items-center justify-center gap-2 font-semibold"
              >
                <FaBell /> Event Notices
              </Link>
            </>
          )}

          {isCompletedMode && (
            <Link
              href={`/admin/events/${event._id}/manage`}
              className="py-2 px-4 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition flex items-center justify-center gap-2 font-semibold"
            >
              <FaCog /> View Event
            </Link>
          )}

          {/* Edit - Only for active management */}
          {isManageMode && event.lifecycleStatus !== "ARCHIVED" && (
            <button
              onClick={() => onEdit && onEdit(event)}
              className="bg-blue-600 hover:bg-blue-500 text-white p-3 rounded-lg flex items-center justify-center transition shadow-lg hover:shadow-blue-500/20"
              title="Edit Event"
            >
              <FaEdit size={18} />
            </button>
          )}

          {/* Mark Complete - Only if ACTIVE */}
          {isManageMode && (event.lifecycleStatus === "ACTIVE" || !event.lifecycleStatus) && (
            <button
              onClick={() => onUpdateStatus && onUpdateStatus(event._id, "COMPLETED")}
              className="bg-emerald-600 hover:bg-emerald-500 text-white p-3 rounded-lg flex items-center justify-center transition shadow-lg hover:shadow-emerald-500/20"
              title="Mark as Complete"
            >
              <FaCheck size={18} />
            </button>
          )}

          {/* Archive (Soft Delete) - If not already archived */}
          {(isManageMode || isCompletedMode) && event.lifecycleStatus !== "ARCHIVED" && (
            <button
              onClick={() => onDelete(event._id, false)}
              disabled={isDeleting}
              className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-3 rounded-lg flex items-center justify-center gap-2 transition shadow-lg hover:shadow-slate-500/20"
              title="Archive Event"
            >
              <FaArchive size={18} />
              <span className="font-semibold">Archive Event</span>
            </button>
          )}

          {/* Restore - If ARCHIVED */}
          {isArchivedMode && event.lifecycleStatus === "ARCHIVED" && (
            <button
              onClick={() => onUpdateStatus && onUpdateStatus(event._id, "ACTIVE")}
              className="bg-blue-600 hover:bg-blue-500 text-white p-3 rounded-lg flex items-center justify-center transition shadow-lg hover:shadow-blue-500/20"
              title="Restore to Active"
            >
              <FaUndo size={18} />
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

