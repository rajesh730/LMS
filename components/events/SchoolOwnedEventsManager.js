"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  FaBan,
  FaBell,
  FaCalendarAlt,
  FaCheckCircle,
  FaCircle,
  FaEdit,
  FaFilter,
  FaPlus,
  FaSearch,
  FaTrash,
  FaTrophy,
  FaUndo,
  FaUsers,
} from "react-icons/fa";
import { useSession } from "next-auth/react";
import EventEditorForm from "./EventEditorForm";
import EmptyState from "@/components/EmptyState";
import LoadingState from "@/components/ui/LoadingState";
import AlertBanner from "@/components/ui/AlertBanner";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import useRealtimeChannel from "@/lib/useRealtimeChannel";
import useWorkIndicators from "@/lib/useWorkIndicators";
import { isTeamEventLike } from "@/lib/eventParticipationFormat";
import {
  formatEventWorkflowStatus,
  getEventNextActionLabel,
  getEventWorkflowStatus,
} from "@/lib/eventWorkflow";
import { getEventDeletionPolicy } from "@/lib/eventDeletion";

function isTerminalState(event) {
  return ["ARCHIVED", "CANCELLED"].includes(
    String(event.lifecycleStatus || "ACTIVE").toUpperCase()
  );
}

// Sub-tabs that carry a "new activity" red dot map to a seen-surface; clicking
// the tab clears that surface until something new lands.
const TAB_SEEN_SURFACE = {
  REGISTRATION: "school.eventRegistrations",
};

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

function getRegisteredCount(event) {
  return Number(event.enrolled ?? event.studentCapacityCount ?? event.studentCount ?? 0) || 0;
}

function getCapacityTotal(event) {
  return Number(event.capacity ?? event.maxParticipants ?? 0) || 0;
}

function getEventUnitLabel(event) {
  return isTeamEventLike(event) ? "Teams" : "Students";
}

function formatGradeSummary(grades = []) {
  const visibleGrades = grades.filter(Boolean);
  if (visibleGrades.length === 0) return "All grades";
  if (visibleGrades.length <= 2) return visibleGrades.join(", ");
  return `${visibleGrades.length} grades`;
}

function isApprovedEvent(event) {
  return String(event.status || "APPROVED").toUpperCase() === "APPROVED";
}

function isRegistrationOpen(event) {
  return getEventWorkflowStatus(event) === "OPEN_FOR_REGISTRATION";
}

function getCurrentStageLabel(event) {
  return formatEventWorkflowStatus(getEventWorkflowStatus(event));
}

function isLiveEvent(event) {
  const state = String(event.lifecycleStatus || "ACTIVE").toUpperCase();
  const workflowStatus = getEventWorkflowStatus(event);
  return (
    state === "ACTIVE" &&
    isApprovedEvent(event) &&
    ["REGISTRATION_CLOSED", "ROUND_ACTIVE", "RESULTS_DRAFT"].includes(workflowStatus)
  );
}

export default function SchoolOwnedEventsManager({
  teachers = [],
  refreshKey = 0,
  onCreate,
  onChanged,
}) {
  const { data: session } = useSession();
  const { getIndicator, markSurfaceSeen } = useWorkIndicators();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [gradeFilter, setGradeFilter] = useState("");
  const [visibilityFilter, setVisibilityFilter] = useState("");
  const [showFilters, setShowFilters] = useState(true);
  const [editingEvent, setEditingEvent] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [clearTarget, setClearTarget] = useState(null);
  const [clearAllRequested, setClearAllRequested] = useState(false);

  const loadEvents = useCallback(async ({ silent = false } = {}) => {
    try {
      if (!silent) {
        setLoading(true);
      }
      const res = await fetch("/api/events", { cache: "no-store" });
      if (!res.ok) {
        setEvents([]);
        return;
      }

      const data = await res.json();
      const schoolId = session?.user?.schoolId || session?.user?.id;
      const schoolEvents = (data.events || []).filter((event) => {
        const eventSchoolId = event.school?._id || event.school;
        return (
          event.eventScope === "SCHOOL" &&
          eventSchoolId &&
          String(eventSchoolId) === String(schoolId)
        );
      });

      setEvents(schoolEvents);
    } catch (error) {
      console.error("Failed to load school-owned events", error);
      setFeedback({
        type: "error",
        title: "School events could not be loaded",
        message: "Please retry or check the server connection.",
      });
      setEvents([]);
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [session?.user?.id, session?.user?.schoolId]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents, refreshKey]);

  useRealtimeChannel(
    "events",
    useCallback(
      (message) => {
        const payload = message?.payload || {};
        if (payload.eventScope && payload.eventScope !== "SCHOOL") return;
        void loadEvents({ silent: true });
      },
      [loadEvents]
    )
  );

  const eventTypes = useMemo(
    () => Array.from(new Set(events.map((event) => event.eventType).filter(Boolean))),
    [events]
  );

  const gradeOptions = useMemo(
    () =>
      Array.from(
        new Set(events.flatMap((event) => event.eligibleGrades || []).filter(Boolean))
      ),
    [events]
  );

  const eventMetrics = useMemo(() => {
    const activeRecords = events.filter((event) => !isTerminalState(event));
    const live = events.filter(
      (event) => isLiveEvent(event)
    );
    const registrationOpen = events.filter(
      (event) => isRegistrationOpen(event)
    );
    return {
      live: live.length,
      registrationOpen: registrationOpen.length,
      completed: events.filter(
        (event) =>
          String(event.lifecycleStatus || "").toUpperCase() !== "ARCHIVED" &&
          (String(event.lifecycleStatus || "").toUpperCase() === "COMPLETED" ||
            event.resultsPublished)
      ).length,
      archived: events.filter((event) => isTerminalState(event)).length,
      activeRecords: activeRecords.length,
    };
  }, [events]);

  const filteredEvents = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return events.filter((event) => {
      const state = String(event.lifecycleStatus || "ACTIVE").toUpperCase();
      const terminal = isTerminalState(event);
      const matchesStatus =
        (activeFilter === "ALL" && !terminal) ||
        (activeFilter === "ACTIVE" &&
          isLiveEvent(event)) ||
        (activeFilter === "REGISTRATION" &&
          isRegistrationOpen(event) &&
          getRegisteredCount(event) === 0) ||
        (activeFilter === "COMPLETED" &&
          !terminal &&
          (state === "COMPLETED" || event.resultsPublished)) ||
        (activeFilter === "ARCHIVED" && terminal);
      const matchesSearch =
        !needle ||
        String(event.title || "").toLowerCase().includes(needle) ||
        String(event.description || "").toLowerCase().includes(needle);
      const matchesType = !typeFilter || event.eventType === typeFilter;
      const matchesGrade =
        !gradeFilter || (event.eligibleGrades || []).includes(gradeFilter);
      const matchesVisibility =
        !visibilityFilter || event.visibility === visibilityFilter;
      return (
        matchesStatus &&
        matchesSearch &&
        matchesType &&
        matchesGrade &&
        matchesVisibility
      );
    });
  }, [activeFilter, events, gradeFilter, search, typeFilter, visibilityFilter]);

  const handleCancel = async () => {
    if (!cancelTarget) return;
    try {
      const res = await fetch(`/api/events/${cancelTarget._id}/cancel`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || "Failed to cancel event");
      }
      setFeedback({
        type: "success",
        title: "Event cancelled",
        message:
          data.message ||
          `${cancelTarget.title} was cancelled and students were notified.`,
      });
      setCancelTarget(null);
      await loadEvents();
      onChanged?.();
    } catch (error) {
      setFeedback({
        type: "error",
        title: "Event was not cancelled",
        message: error.message || "Failed to cancel event.",
      });
      setCancelTarget(null);
    }
  };

  const handleRestore = async (event) => {
    try {
      const res = await fetch(`/api/events/${event._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lifecycleStatus: "ACTIVE",
          eventWorkflowStatus: "OPEN_FOR_REGISTRATION",
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to restore event");
      }

      setFeedback({
        type: "success",
        title: "Event restored",
        message: `${event.title} is back in the active event list.`,
      });
      await loadEvents();
      onChanged?.();
    } catch (error) {
      setFeedback({
        type: "error",
        title: "Event was not restored",
        message: error.message || "Failed to restore event.",
      });
    }
  };

  const permanentlyDeleteEvent = async (event) => {
    const res = await fetch(`/api/events/${event._id}/delete`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message || "Failed to permanently delete event");
    }
  };

  const handleClearOne = async () => {
    if (!clearTarget) return;
    try {
      await permanentlyDeleteEvent(clearTarget);
      setFeedback({
        type: "success",
        title: "Event permanently deleted",
        message: `${clearTarget.title} was removed permanently.`,
      });
      setClearTarget(null);
      await loadEvents();
      onChanged?.();
    } catch (error) {
      setFeedback({
        type: "error",
        title: "Event was not deleted",
        message: error.message || "Failed to permanently delete event.",
      });
      setClearTarget(null);
    }
  };

  const archivedEvents = useMemo(
    () => events.filter((event) => isTerminalState(event)),
    [events]
  );

  const handleClearAll = async () => {
    try {
      for (const event of archivedEvents) {
        await permanentlyDeleteEvent(event);
      }
      setFeedback({
        type: "success",
        title: "Cancelled events deleted",
        message: `${archivedEvents.length} cancelled event${
          archivedEvents.length === 1 ? "" : "s"
        } permanently deleted.`,
      });
      setClearAllRequested(false);
      await loadEvents();
      onChanged?.();
    } catch (error) {
      setFeedback({
        type: "error",
        title: "Cancelled events were not fully cleared",
        message: error.message || "Failed to delete cancelled events.",
      });
      setClearAllRequested(false);
    }
  };

  const metricCards = [
    {
      key: "ACTIVE",
      label: "Live",
      value: eventMetrics.live,
      note: "Rounds or results in progress",
      icon: FaCalendarAlt,
      tone: "purple",
    },
    {
      key: "REGISTRATION",
      label: "Registration Open",
      value: eventMetrics.registrationOpen,
      note: "Accepting entries",
      icon: FaUsers,
      tone: "emerald",
    },
    {
      key: "COMPLETED",
      label: "Completed",
      value: eventMetrics.completed,
      note: "Results/certificates ready",
      icon: FaCheckCircle,
      tone: "blue",
    },
    {
      key: "ARCHIVED",
      label: "Cancelled",
      value: eventMetrics.archived,
      note: "Cancelled events",
      icon: FaBan,
      tone: "slate",
    },
  ];

  const metricTones = {
    purple: "border-purple-100 bg-purple-50 text-purple-700",
    emerald: "border-emerald-100 bg-emerald-50 text-emerald-700",
    amber: "border-amber-100 bg-amber-50 text-amber-700",
    blue: "border-blue-100 bg-blue-50 text-[#0a2f66]",
    slate: "border-slate-100 bg-slate-50 text-slate-700",
  };

  const filterTabs = [
    ["ACTIVE", "Live", FaCircle, eventMetrics.live],
    ["REGISTRATION", "Registration Open", FaUsers, eventMetrics.registrationOpen],
    ["ALL", "All Events", FaCalendarAlt, eventMetrics.activeRecords],
    ["COMPLETED", "Completed", FaCheckCircle, eventMetrics.completed],
    ["ARCHIVED", "Cancelled", FaBan, eventMetrics.archived],
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-black text-[#17120a]">School Events</h1>
          <p className="mt-2 text-base text-[#52657d]">
            Manage school-created events, student registration, rounds, results,
            and certificates.
          </p>
        </div>
        <button
          type="button"
          onClick={onCreate}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-purple-700 px-5 text-sm font-black text-white shadow-sm transition hover:bg-purple-800"
        >
          <FaPlus />
          Create School Event
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {metricCards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.key}
              type="button"
              onClick={() => setActiveFilter(card.key)}
              className={`rounded-2xl border border-[#e6eaf7] bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-purple-200 hover:shadow-md ${
                activeFilter === card.key ? "ring-2 ring-purple-100" : ""
              }`}
            >
              <div className="flex items-center gap-4">
                <span
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${
                    metricTones[card.tone]
                  }`}
                >
                  <Icon />
                </span>
                <span className="min-w-0">
                  <strong className="block text-2xl font-black text-[#17120a]">
                    {card.value}
                  </strong>
                  <span className="block truncate text-sm font-black text-[#24314d]">
                    {card.label}
                  </span>
                  <span className="mt-1 block text-xs font-bold text-[#52657d]">
                    {card.note}
                  </span>
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {feedback && (
        <AlertBanner
          type={feedback.type}
          title={feedback.title}
          message={feedback.message}
        />
      )}

      <section className="overflow-hidden rounded-2xl border border-[#e1e7f2] bg-white shadow-[0_14px_34px_rgba(10,47,102,0.08)]">
        <div className="border-b border-[#e1e7f2]">
          <div className="flex flex-wrap gap-0 px-4">
            {filterTabs.map(([key, label, Icon, count]) => {
              const seenSurface = TAB_SEEN_SURFACE[key];
              const showDot =
                Boolean(seenSurface) &&
                getIndicator(seenSurface).count > 0 &&
                activeFilter !== key;
              return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setActiveFilter(key);
                  if (seenSurface) void markSurfaceSeen(seenSurface);
                }}
                className={`relative inline-flex min-h-14 items-center gap-2 px-5 text-sm font-black transition ${
                  activeFilter === key
                    ? "text-purple-700 after:absolute after:bottom-0 after:left-0 after:h-[3px] after:w-full after:rounded-full after:bg-purple-700"
                    : "text-[#24314d] hover:bg-[#f8fbff] hover:text-purple-700"
                }`}
              >
                <span className="relative inline-flex">
                  <Icon />
                  {showDot && (
                    <span className="absolute -right-1.5 -top-1.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />
                  )}
                </span>
                {label}
                {count > 0 && (
                  <span
                    className={`ml-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-black ${
                      activeFilter === key
                        ? "bg-purple-100 text-purple-700"
                        : "bg-[#eef2f8] text-[#52657d]"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
              );
            })}
          </div>

          <div className="grid gap-3 border-t border-[#e1e7f2] p-4 lg:grid-cols-[minmax(240px,1fr)_150px_150px_150px_auto_auto]">
            <div className="relative">
              <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-[#75869b]" />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search events..."
                className="h-12 w-full rounded-xl border border-[#dbe5f4] bg-[#f8fbff] pl-11 pr-4 text-sm font-semibold outline-none transition focus:border-purple-300"
              />
            </div>
            <select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
              className={`h-12 rounded-xl border border-[#dbe5f4] bg-white px-4 text-sm font-black text-[#24314d] outline-none transition focus:border-purple-300 ${
                showFilters ? "" : "hidden"
              }`}
            >
              <option value="">All Types</option>
              {eventTypes.map((type) => (
                <option key={type} value={type}>
                  {formatType(type)}
                </option>
              ))}
            </select>
            <select
              value={gradeFilter}
              onChange={(event) => setGradeFilter(event.target.value)}
              className={`h-12 rounded-xl border border-[#dbe5f4] bg-white px-4 text-sm font-black text-[#24314d] outline-none transition focus:border-purple-300 ${
                showFilters ? "" : "hidden"
              }`}
            >
              <option value="">All Grades</option>
              {gradeOptions.map((grade) => (
                <option key={grade} value={grade}>
                  {grade}
                </option>
              ))}
            </select>
            <select
              value={visibilityFilter}
              onChange={(event) => setVisibilityFilter(event.target.value)}
              className={`h-12 rounded-xl border border-[#dbe5f4] bg-white px-4 text-sm font-black text-[#24314d] outline-none transition focus:border-purple-300 ${
                showFilters ? "" : "hidden"
              }`}
            >
              <option value="">All Visibility</option>
              <option value="INVITED">School Visible</option>
              <option value="PUBLIC">Public</option>
              <option value="PRIVATE">Private</option>
            </select>
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setTypeFilter("");
                setGradeFilter("");
                setVisibilityFilter("");
              }}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-[#dbe5f4] bg-white px-4 text-sm font-black text-[#0a2f66] transition hover:bg-[#f8fbff]"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => setShowFilters((value) => !value)}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-[#dbe5f4] bg-[#f8fbff] px-4 text-sm font-black text-[#0a2f66] transition hover:bg-white"
            >
              <FaFilter />
              Filters
            </button>
          </div>
        </div>

        <div className="p-4">
          {activeFilter === "ARCHIVED" && archivedEvents.length > 0 && (
            <div className="mb-4 flex flex-col gap-3 rounded-xl border border-[#e6eaf7] bg-[#fbfcff] p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                  <FaBan />
                </span>
                <div>
                  <p className="text-sm font-black text-[#17120a]">
                    Cancelled events
                  </p>
                  <p className="mt-0.5 text-xs font-semibold text-[#52657d]">
                    Restore an event to bring it back, or permanently delete the
                    records you no longer need.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setClearAllRequested(true)}
                className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white px-4 text-sm font-black text-rose-700 transition hover:bg-rose-50"
              >
                <FaTrash />
                Delete all permanently
              </button>
            </div>
          )}

          {loading ? (
            <LoadingState
              title="Loading school events"
              message="Preparing your school-created events and registration status."
            />
          ) : filteredEvents.length === 0 ? (
            <EmptyState
              icon={FaCalendarAlt}
              title="No school events found"
              description="Create a school event or adjust filters to see more records."
            />
          ) : (
            <div className="space-y-3">
              {filteredEvents.map((event) => {
                const isTeamEvent = isTeamEventLike(event);
                const workflowStatus = getEventWorkflowStatus(event);
                const eventState = String(
                  event.lifecycleStatus || "ACTIVE"
                ).toUpperCase();
                const policy = getEventDeletionPolicy(event);
                const terminal = isTerminalState(event);
                const registered = getRegisteredCount(event);
                const capacity = getCapacityTotal(event);
                const currentStage = getCurrentStageLabel(event);
                const gradeSummary = formatGradeSummary(event.eligibleGrades || []);
                const gradeTitle =
                  event.eligibleGrades?.length > 0
                    ? event.eligibleGrades.join(", ")
                    : "All grades";
                const isFinished =
                  event.resultsPublished ||
                  eventState === "COMPLETED" ||
                  eventState === "ARCHIVED";
                const nextAction = getEventNextActionLabel(event);
                const rowStats = [
                  ["Registrations", registered, getEventUnitLabel(event)],
                  ["Schools", event.schoolCount || 1, "School"],
                  ["Status", currentStage, isFinished ? "Finished" : "Needs action"],
                  [
                    "Results",
                    workflowStatus === "RESULTS_PUBLISHED" ? "Published" : "Draft",
                    workflowStatus === "RESULTS_DRAFT"
                      ? "Review"
                      : workflowStatus === "RESULTS_PUBLISHED"
                      ? "Ready"
                      : "-",
                  ],
                  [
                    "Certificates",
                    workflowStatus === "RESULTS_PUBLISHED" ? "Active" : "Preview",
                    workflowStatus === "RESULTS_PUBLISHED" ? "Ready" : "-",
                  ],
                ];
                const steps = [
                  {
                    label: "Registration",
                    active: ["OPEN_FOR_REGISTRATION", "REGISTRATION_CLOSED"].includes(
                      workflowStatus
                    ),
                    complete: !["DRAFT", "OPEN_FOR_REGISTRATION"].includes(
                      workflowStatus
                    ),
                  },
                  {
                    label: "Rounds",
                    active: workflowStatus === "ROUND_ACTIVE",
                    complete: [
                      "RESULTS_DRAFT",
                      "RESULTS_PUBLISHED",
                      "COMPLETED",
                    ].includes(workflowStatus),
                  },
                  {
                    label: "Results Review",
                    active: workflowStatus === "RESULTS_DRAFT",
                    complete: ["RESULTS_PUBLISHED", "COMPLETED"].includes(
                      workflowStatus
                    ),
                  },
                  {
                    label: "Published",
                    active: workflowStatus === "RESULTS_PUBLISHED",
                    complete: ["RESULTS_PUBLISHED", "COMPLETED"].includes(
                      workflowStatus
                    ),
                  },
                  {
                    label: "Completed",
                    active: false,
                    complete: isFinished,
                  },
                ];

                return (
                  <div
                    key={event._id}
                    className="overflow-hidden rounded-xl border border-[#dfe7f3] bg-white shadow-sm transition hover:border-purple-200 hover:shadow-md"
                  >
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
                            {terminal && (
                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${
                                  eventState === "CANCELLED"
                                    ? "bg-rose-50 text-rose-700"
                                    : "bg-slate-100 text-slate-600"
                                }`}
                              >
                                {eventState === "CANCELLED" ? "Cancelled" : "Archived"}
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
                            {event.description}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-4 text-xs font-bold text-[#75869b]">
                            <span className="inline-flex items-center gap-1.5">
                              <FaCalendarAlt />
                              {formatDate(event.date)}
                            </span>
                            <span className="inline-flex items-center gap-1.5">
                              <FaUsers />
                              {registered}
                              {capacity ? `/${capacity}` : ""} {getEventUnitLabel(event)}
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
                            {terminal ? (
                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleRestore(event)}
                                  className="inline-flex min-h-9 items-center gap-2 rounded-xl bg-white px-4 text-xs font-black text-[#0a2f66] transition hover:bg-[#f8fbff]"
                                >
                                  <FaUndo />
                                  Restore Event
                                </button>
                                {policy.canDelete ? (
                                  <button
                                    type="button"
                                    onClick={() => setClearTarget(event)}
                                    className="inline-flex min-h-9 items-center gap-2 rounded-xl bg-rose-50 px-4 text-xs font-black text-rose-700 transition hover:bg-rose-100"
                                  >
                                    <FaTrash />
                                    Clear Permanently
                                  </button>
                                ) : (
                                  <span
                                    title={policy.deleteBlockedReason}
                                    className="inline-flex min-h-9 items-center gap-2 rounded-xl bg-[#f4f8fd] px-4 text-[11px] font-black text-[#75869b]"
                                  >
                                    Kept for records
                                  </span>
                                )}
                              </div>
                            ) : (
                              policy.canCancel && (
                                <button
                                  type="button"
                                  onClick={() => setCancelTarget(event)}
                                  className="inline-flex min-h-9 items-center gap-2 rounded-xl bg-white px-4 text-xs font-black text-rose-700 transition hover:bg-rose-50"
                                >
                                  <FaBan />
                                  Cancel Event
                                </button>
                              )
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="relative flex flex-col gap-2 border-l border-[#e1e7f2] pl-4">
                        <Link
                          href={`/school/events/${event._id}/manage?tab=${
                            isFinished ? "results" : "registrations"
                          }`}
                          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-purple-700 px-4 text-xs font-black text-white shadow-sm transition hover:bg-purple-800"
                        >
                          {isFinished ? "Results" : "Continue Management"}
                        </Link>
                        {!isFinished && (
                          <button
                            type="button"
                            onClick={() => setEditingEvent(event)}
                            className="inline-flex min-h-8 items-center gap-2 rounded-lg bg-white px-3 text-[11px] font-black text-[#0a2f66] transition hover:bg-[#f8fbff]"
                          >
                            <FaEdit />
                            Edit Event
                          </button>
                        )}
                        <Link
                          href={`/school/events/${event._id}/manage?tab=notices`}
                          className="inline-flex min-h-8 items-center gap-2 rounded-lg bg-white px-3 text-[11px] font-black text-[#0a2f66] transition hover:bg-[#f8fbff]"
                        >
                          <FaBell />
                          Event Notices
                        </Link>
                        </div>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {editingEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-[#d7cdbb] bg-white shadow-2xl">
            <div className="p-1">
              <EventEditorForm
                teachers={teachers}
                ownerMode="school"
                initialData={editingEvent}
                onEventCreated={async () => {
                  setEditingEvent(null);
                  await loadEvents();
                  onChanged?.();
                }}
                onCancel={() => setEditingEvent(null)}
              />
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(cancelTarget)}
        title="Cancel this event?"
        message={
          cancelTarget
            ? `${cancelTarget.title} will be marked cancelled. Registered students are notified and their registrations are withdrawn. Use this when the event should not go ahead.`
            : ""
        }
        confirmLabel="Cancel event"
        tone="danger"
        onClose={() => setCancelTarget(null)}
        onConfirm={handleCancel}
      />
      <ConfirmDialog
        open={Boolean(clearTarget)}
        title="Permanently delete this event?"
        message={
          clearTarget
            ? `${clearTarget.title} and its related registrations, rounds, notices, and certificates will be permanently deleted. This cannot be undone.`
            : ""
        }
        confirmLabel="Delete permanently"
        tone="danger"
        onClose={() => setClearTarget(null)}
        onConfirm={handleClearOne}
      />
      <ConfirmDialog
        open={clearAllRequested}
        title="Delete all cancelled events?"
        message={`${archivedEvents.length} cancelled event${
          archivedEvents.length === 1 ? "" : "s"
        } will be permanently deleted with related registrations, rounds, notices, and certificates. This cannot be undone.`}
        confirmLabel="Delete all permanently"
        tone="danger"
        onClose={() => setClearAllRequested(false)}
        onConfirm={handleClearAll}
      />
    </div>
  );
}
