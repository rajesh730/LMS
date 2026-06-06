"use client";

import Link from "next/link";
import {
  FaArchive,
  FaBell,
  FaCalendarAlt,
  FaCircle,
  FaDownload,
  FaEdit,
  FaHistory,
  FaTrophy,
  FaUsers,
} from "react-icons/fa";
import { getEventStage } from "@/lib/eventUiStatus";
import { isTeamEventLike } from "@/lib/eventParticipationFormat";

function formatType(value) {
  return String(value || "EVENT").replaceAll("_", " ");
}

function formatDate(value) {
  if (!value) return "Not set";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function isApprovedEvent(event) {
  return String(event.status || "APPROVED").toUpperCase() === "APPROVED";
}

function getCurrentStageLabel(event) {
  const state = String(event.lifecycleStatus || "ACTIVE").toUpperCase();
  if (state === "ARCHIVED") return "Archived";
  if (state === "COMPLETED" || event.resultsPublished) return "Completed";
  return "Registration";
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
  onDelete,
  isDeleting,
  onEdit,
  onUpdateStatus,
  actionMode = "manage",
}) {
  const isTeamEvent = isTeamEventLike(event);
  const eventState = String(event.lifecycleStatus || "ACTIVE").toUpperCase();
  const isArchivedMode = actionMode === "archived" || eventState === "ARCHIVED";
  const isFinished =
    event.resultsPublished || eventState === "COMPLETED" || eventState === "ARCHIVED";
  const registered = getRegisteredCount(event);
  const stage = getEventStage(event);
  const currentStage = getCurrentStageLabel(event);
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
      event.resultsPublished ? "Published" : "Pending",
      event.resultsPublished ? "Ready" : "-",
    ],
  ];

  const steps = [
    {
      label: "Registration",
      active: currentStage === "Registration",
      complete: isApprovedEvent(event),
    },
    {
      label: "Review",
      active: Number(event.pendingEntryCount || 0) > 0,
      complete: Number(event.pendingEntryCount || 0) === 0,
    },
    {
      label: "Rounds",
      active: false,
      complete: isFinished,
    },
    {
      label: "Results",
      active: !event.resultsPublished && isFinished,
      complete: Boolean(event.resultsPublished),
    },
    {
      label: "Completed",
      active: eventState === "COMPLETED",
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
    <div className="overflow-hidden rounded-xl border border-[#dfe7f3] bg-white shadow-sm transition hover:border-purple-200 hover:shadow-md">
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
                {formatDate(event.date)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <FaUsers />
                {registered} {getEventUnitLabel(event)}
              </span>
              <span className="truncate">Stage: {stage.label}</span>
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
                <button
                  type="button"
                  onClick={() => onUpdateStatus?.(event._id, "ACTIVE")}
                  className="inline-flex min-h-9 items-center gap-2 rounded-xl bg-white px-4 text-xs font-black text-[#0a2f66] transition hover:bg-[#f8fbff]"
                >
                  <FaHistory />
                  Restore Event
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => onDelete?.(event)}
                  className="inline-flex min-h-9 items-center gap-2 rounded-xl bg-white px-4 text-xs font-black text-rose-700 transition hover:bg-rose-50 disabled:cursor-wait disabled:opacity-60"
                >
                  <FaArchive />
                  Delete / Archive Event
                </button>
              )}
              {event.participants?.length > 0 && (
                <button
                  type="button"
                  onClick={exportToCSV}
                  className="inline-flex min-h-9 items-center gap-2 rounded-xl bg-white px-4 text-xs font-black text-[#0a2f66] transition hover:bg-[#f8fbff]"
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
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-purple-700 px-4 text-xs font-black text-white shadow-sm transition hover:bg-purple-800"
            >
              <FaHistory />
              Restore Event
            </button>
          ) : (
            <Link
              href={`/admin/events/${event._id}/manage?tab=registrations`}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-purple-700 px-4 text-xs font-black text-white shadow-sm transition hover:bg-purple-800"
            >
              Continue Management
            </Link>
          )}
          {!isArchivedMode && actionMode !== "completed" && (
            <button
              type="button"
              onClick={() => onEdit?.(event)}
              className="inline-flex min-h-8 items-center gap-2 rounded-lg bg-white px-3 text-[11px] font-black text-[#0a2f66] transition hover:bg-[#f8fbff]"
            >
              <FaEdit />
              Edit Event
            </button>
          )}
          {!isArchivedMode && (
            <Link
              href={`/admin/events/${event._id}/manage?tab=notices`}
              className="inline-flex min-h-8 items-center gap-2 rounded-lg bg-white px-3 text-[11px] font-black text-[#0a2f66] transition hover:bg-[#f8fbff]"
            >
              <FaBell />
              Event Notices
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
