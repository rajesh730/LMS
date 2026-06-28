"use client";

import Link from "next/link";
import {
  FaBan,
  FaBell,
  FaCalendarAlt,
  FaCircle,
  FaDownload,
  FaEdit,
  FaHistory,
  FaTrash,
  FaTrophy,
  FaUsers,
} from "react-icons/fa";
import { isTeamEventLike } from "@/lib/eventParticipationFormat";
import {
  getEventNextActionLabel,
  getEventWorkflowStatus,
} from "@/lib/eventWorkflow";
import { getEventDeletionPolicy } from "@/lib/eventDeletion";
import AppDate from "@/components/common/AppDate";
import EventListCard from "@/components/events/EventListCard";

function formatType(value) {
  return String(value || "EVENT").replaceAll("_", " ");
}

function getEventUnitLabel(event) {
  return isTeamEventLike(event) ? "Teams" : "Students";
}

function getRegisteredCount(event) {
  return Number(event.studentCapacityCount ?? event.studentCount ?? 0) || 0;
}

function getSchoolCount(event) {
  return Number(event.schoolCount ?? event.participants?.length ?? 0) || 0;
}

function formatGradeSummary(grades = []) {
  const visibleGrades = grades.filter(Boolean);
  if (visibleGrades.length === 0) return "All grades";
  if (visibleGrades.length <= 2) return visibleGrades.join(", ");
  return `${visibleGrades.length} grades`;
}

export default function EventCard({
  event,
  onCancel,
  onPermanentDelete,
  isDeleting,
  onEdit,
  onUpdateStatus,
  actionMode = "manage",
}) {
  const isTeamEvent = isTeamEventLike(event);
  const eventState = String(event.lifecycleStatus || "ACTIVE").toUpperCase();
  const isCancelledState = eventState === "CANCELLED";
  // Archived and cancelled are both terminal: managed the same way (restore /
  // permanently delete), and never editable.
  const isArchivedMode =
    actionMode === "archived" || eventState === "ARCHIVED" || isCancelledState;
  const policy = getEventDeletionPolicy(event);
  const isFinished =
    event.resultsPublished || eventState === "ARCHIVED";
  const registered = getRegisteredCount(event);
  const workflowStatus = getEventWorkflowStatus(event);
  const nextAction = getEventNextActionLabel(event);
  const gradeSummary = formatGradeSummary(event.eligibleGrades || []);
  const gradeTitle =
    event.eligibleGrades?.length > 0 ? event.eligibleGrades.join(", ") : "All grades";

  const rowStats = [
    ["Registrations", registered, getEventUnitLabel(event)],
    ["Schools", getSchoolCount(event), "Schools"],
    ["Pending", event.pendingEntryCount ?? 0, "Requests"],
    ["Approved", event.approvedEntryCount ?? 0, "Entries"],
    [
      "Results",
      workflowStatus === "RESULTS_PUBLISHED" ? "Published" : "Draft",
      workflowStatus === "RESULTS_DRAFT"
        ? "Review"
        : workflowStatus === "RESULTS_PUBLISHED"
        ? "Ready"
        : "-",
    ],
  ];

  const steps = [
    {
      label: "Registration",
      active: ["OPEN_FOR_REGISTRATION", "REGISTRATION_CLOSED"].includes(
        workflowStatus
      ),
      complete: !["DRAFT", "OPEN_FOR_REGISTRATION"].includes(workflowStatus),
    },
    {
      label: "Review",
      active: Number(event.pendingEntryCount || 0) > 0,
      complete: Number(event.pendingEntryCount || 0) === 0,
    },
    {
      label: "Rounds",
      active: workflowStatus === "ROUND_ACTIVE",
      complete: ["RESULTS_DRAFT", "RESULTS_PUBLISHED", "COMPLETED"].includes(
        workflowStatus
      ),
    },
    {
      label: "Results",
      active: workflowStatus === "RESULTS_DRAFT",
      complete: workflowStatus === "RESULTS_PUBLISHED" || isFinished,
    },
    {
      label: "Completed",
      active: workflowStatus === "COMPLETED",
      complete: isFinished,
    },
  ];

  const exportToCSV = () => {
    if (!event.participants || event.participants.length === 0) return;

    const headers =
      "School Name,Contact Person,Phone,Expected Students,Joined Date,Notes";
    const rows = event.participants.map((participant) => {
      const schoolName = participant.school?.schoolName || "Unknown";
      const joinDate = new Date(participant.joinedAt).toLocaleDateString();
      return `"${schoolName}","${participant.contactPerson || ""}","${
        participant.contactPhone || ""
      }","${participant.expectedStudents || 0}","${joinDate}","${
        participant.notes || ""
      }"`;
    });

    const csvContent =
      "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute(
      "download",
      `${event.title.replace(/[^a-z0-9]/gi, "_")}_participants.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <EventListCard accent="purple">
      <div className="grid gap-3 px-4 py-3 xl:grid-cols-[minmax(360px,1.18fr)_minmax(520px,1fr)_210px] xl:items-start">
        <div className="flex min-w-0 gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-lg text-purple-700">
            {event.resultsPublished ? <FaTrophy /> : <FaEdit />}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <h3 className="max-w-[260px] truncate text-base font-black text-[#17120a]">
                {event.title}
              </h3>
              <span className="rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-black uppercase text-purple-700">
                {formatType(event.eventType)}
              </span>
              <span className="rounded-full bg-[#f4f8fd] px-2 py-0.5 text-[10px] font-black uppercase text-[#52657d]">
                {isTeamEvent ? "Team Event" : "Individual Event"}
              </span>
              {(isCancelledState || eventState === "ARCHIVED") && (
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${
                    isCancelledState
                      ? "bg-rose-50 text-rose-700"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {isCancelledState ? "Cancelled" : "Archived"}
                </span>
              )}
              <span
                title={gradeTitle}
                className="max-w-[180px] truncate rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-black uppercase text-[#0a2f66]"
              >
                Visible to {gradeSummary}
              </span>
            </div>
            <p className="mt-2 line-clamp-1 text-sm text-[#52657d]">
              {event.description || "No event description added yet."}
            </p>
            <div className="mt-3 flex flex-wrap gap-4 text-xs font-bold text-[#75869b]">
              <span className="inline-flex items-center gap-1.5">
                <FaCalendarAlt />
                <AppDate value={event.date} fallback="Not set" />
              </span>
              <span className="inline-flex items-center gap-1.5">
                <FaUsers />
                {registered} {getEventUnitLabel(event)}
              </span>
              <span className="truncate">Next: {nextAction}</span>
            </div>
          </div>
        </div>

        <div className="min-h-[96px] border-l border-[#e1e7f2] pl-4">
          <div className="grid grid-cols-5 gap-0 divide-x divide-[#e1e7f2]">
            {rowStats.map(([label, value, detail]) => (
              <div key={label} className="min-w-0 px-3 first:pl-0">
                <p className="truncate text-[11px] font-black text-[#75869b]">
                  {label}
                </p>
                <p className="mt-1 truncate text-base font-black text-[#17120a]">
                  {value}
                </p>
                <p className="truncate text-[11px] font-bold text-[#52657d]">
                  {detail}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-3 border-t border-[#e1e7f2] pt-2">
            <div className="flex flex-wrap gap-3 text-[11px] font-bold text-[#52657d]">
              {steps.map((step) => (
                <span key={step.label} className="inline-flex items-center gap-1.5">
                  <FaCircle
                    className={
                      step.active
                        ? "text-purple-700"
                        : step.complete
                        ? "text-emerald-600"
                        : "text-[#c8d4e6]"
                    }
                  />
                  {step.label}
                </span>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {isArchivedMode ? (
                policy.canDelete ? (
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={() => onPermanentDelete?.(event)}
                    className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-rose-300 bg-rose-50 px-3.5 py-1.5 text-xs font-bold text-rose-700 transition hover:bg-rose-100 disabled:cursor-wait disabled:opacity-60"
                  >
                    <FaTrash />
                    Delete Permanently
                  </button>
                ) : (
                  <span
                    title={policy.deleteBlockedReason}
                    className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-[#e1e7f2] bg-[#f8fafc] px-3.5 py-1.5 text-[11px] font-bold text-[#75869b]"
                  >
                    Kept for records — cannot delete
                  </span>
                )
              ) : (
                policy.canCancel && (
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={() => onCancel?.(event)}
                    className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-rose-200 bg-white px-3.5 py-1.5 text-xs font-bold text-rose-700 transition hover:bg-rose-50 disabled:cursor-wait disabled:opacity-60"
                  >
                    <FaBan />
                    Cancel Event
                  </button>
                )
              )}
            {event.participants?.length > 0 && (
              <button
                type="button"
                onClick={exportToCSV}
                className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-[#cbd5e1] bg-white px-3.5 py-1.5 text-xs font-bold text-[#1e293b] transition hover:bg-[#f8fafc] hover:text-[#0a2f66]"
              >
                <FaDownload />
                Export
              </button>
            )}
            </div>
          </div>
        </div>

        <div className="relative flex flex-col gap-2 border-l border-[#e1e7f2] pl-4">
          {isArchivedMode ? (
            <button
              type="button"
              onClick={() => onUpdateStatus?.(event._id, "ACTIVE")}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-purple-700 px-4 text-xs font-bold text-white shadow-sm transition hover:bg-purple-800"
            >
              <FaHistory />
              Restore Event
            </button>
          ) : (
            <Link
              href={`/admin/events/${event._id}/manage?tab=registrations`}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-purple-700 px-4 text-xs font-bold text-white shadow-sm transition hover:bg-purple-800"
            >
              Continue Management
            </Link>
          )}
          {!isArchivedMode && actionMode !== "completed" && (
            <button
              type="button"
              onClick={() => onEdit?.(event)}
              className="inline-flex min-h-8 items-center gap-2 rounded-lg border border-[#cbd5e1] bg-white px-3 text-[11px] font-bold text-[#1e293b] transition hover:bg-[#f8fafc]"
            >
              <FaEdit />
              Edit Event
            </button>
          )}
          {!isArchivedMode && (
            <Link
              href={`/admin/events/${event._id}/manage?tab=notices`}
              className="inline-flex min-h-8 items-center gap-2 rounded-lg border border-[#cbd5e1] bg-white px-3 text-[11px] font-bold text-[#1e293b] transition hover:bg-[#f8fafc]"
            >
              <FaBell />
              Event Notices
            </Link>
          )}
        </div>
      </div>
    </EventListCard>
  );
}
