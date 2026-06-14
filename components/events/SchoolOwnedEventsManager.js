"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  FaArchive,
  FaBell,
  FaCalendarAlt,
  FaCheckCircle,
  FaCircle,
  FaEdit,
  FaFilter,
  FaHistory,
  FaPlus,
  FaSearch,
  FaTrophy,
  FaUsers,
} from "react-icons/fa";
import { useSession } from "next-auth/react";
import EventEditorForm from "./EventEditorForm";
import EmptyState from "@/components/EmptyState";
import LoadingState from "@/components/ui/LoadingState";
import AlertBanner from "@/components/ui/AlertBanner";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import useRealtimeChannel from "@/lib/useRealtimeChannel";
import { getEventStage, isDatePast } from "@/lib/eventUiStatus";
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
  const state = String(event.lifecycleStatus || "ACTIVE").toUpperCase();
  const deadline = event.registrationDeadline || event.deadline;
  return (
    state === "ACTIVE" &&
    isApprovedEvent(event) &&
    !(
      deadline &&
      isDatePast(deadline, {
        endOfDay: true,
      })
    )
  );
}

function getCurrentStageLabel(event) {
  const state = String(event.lifecycleStatus || "ACTIVE").toUpperCase();
  if (state === "ARCHIVED") return "Archived";
  if (state === "COMPLETED" || event.resultsPublished) return "Completed";
  if (isRegistrationOpen(event)) return "Registration";
  return "Round 1";
}

export default function SchoolOwnedEventsManager({
  teachers = [],
  refreshKey = 0,
  onCreate,
  onChanged,
}) {
  const { data: session } = useSession();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [gradeFilter, setGradeFilter] = useState("");
  const [visibilityFilter, setVisibilityFilter] = useState("");
  const [showFilters, setShowFilters] = useState(true);
  const [editingEvent, setEditingEvent] = useState(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [archiveTarget, setArchiveTarget] = useState(null);

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
    const live = events.filter(
      (event) =>
        String(event.lifecycleStatus || "ACTIVE").toUpperCase() === "ACTIVE" &&
        isApprovedEvent(event) &&
        getRegisteredCount(event) > 0
    );
    const registrationOpen = events.filter(
      (event) =>
        isRegistrationOpen(event) &&
        getRegisteredCount(event) === 0
    );
    return {
      live: live.length,
      registrationOpen: registrationOpen.length,
      drafts: events.filter(
        (event) => String(event.status || "").toUpperCase() === "PENDING"
      ).length,
      completed: events.filter(
        (event) =>
          String(event.lifecycleStatus || "").toUpperCase() === "COMPLETED" ||
          event.resultsPublished
      ).length,
      archived: events.filter(
        (event) => String(event.lifecycleStatus || "").toUpperCase() === "ARCHIVED"
      ).length,
    };
  }, [events]);

  const filteredEvents = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return events.filter((event) => {
      const state = String(event.lifecycleStatus || "ACTIVE").toUpperCase();
      const matchesStatus =
        activeFilter === "ALL" ||
        (activeFilter === "ACTIVE" &&
          state === "ACTIVE" &&
          isApprovedEvent(event) &&
          getRegisteredCount(event) > 0) ||
        (activeFilter === "REGISTRATION" &&
          isRegistrationOpen(event) &&
          getRegisteredCount(event) === 0) ||
        (activeFilter === "DRAFTS" &&
          String(event.status || "").toUpperCase() === "PENDING") ||
        (activeFilter === "COMPLETED" &&
          (state === "COMPLETED" || event.resultsPublished)) ||
        (activeFilter === "ARCHIVED" && state === "ARCHIVED");
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

  const handleStatusChange = async (eventId, lifecycleStatus) => {
    try {
      const res = await fetch(`/api/events/${eventId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lifecycleStatus }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to update event status");
      }

      setStatusMessage(`Event moved to ${lifecycleStatus.toLowerCase()}.`);
      setFeedback({
        type: "success",
        title: "Event updated",
        message: `Event moved to ${lifecycleStatus.toLowerCase()}.`,
      });
      await loadEvents();
      onChanged?.();
    } catch (error) {
      console.error("Failed to update school event status", error);
      setFeedback({
        type: "error",
        title: "Event status was not updated",
        message: error.message || "Failed to update event status.",
      });
    }
  };

  const handleArchive = async () => {
    if (!archiveTarget) return;
    try {
      const res = await fetch(`/api/events/${archiveTarget._id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to archive event");
      }

      setStatusMessage("Event archived.");
      setFeedback({
        type: "success",
        title: "Event archived",
        message: `${archiveTarget.title} moved to event history.`,
      });
      setArchiveTarget(null);
      await loadEvents();
      onChanged?.();
    } catch (error) {
      console.error("Failed to archive event", error);
      setFeedback({
        type: "error",
        title: "Event was not archived",
        message: error.message || "Failed to archive event.",
      });
      setArchiveTarget(null);
    }
  };

  const metricCards = [
    {
      key: "ACTIVE",
      label: "Live Events",
      value: eventMetrics.live,
      note: "Currently running",
      icon: FaCalendarAlt,
      tone: "purple",
    },
    {
      key: "REGISTRATION",
      label: "Registration Open",
      value: eventMetrics.registrationOpen,
      note: "Accepting students",
      icon: FaUsers,
      tone: "emerald",
    },
    {
      key: "COMPLETED",
      label: "Completed",
      value: eventMetrics.completed,
      note: "This academic year",
      icon: FaCheckCircle,
      tone: "blue",
    },
    {
      key: "ARCHIVED",
      label: "Archived",
      value: eventMetrics.archived,
      note: "Older events",
      icon: FaArchive,
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
    ["ACTIVE", "Live Events", FaCircle, eventMetrics.live],
    ["REGISTRATION", "Registration Open", FaUsers, eventMetrics.registrationOpen],
    ["ALL", "All Events", FaCalendarAlt, events.length],
    ["COMPLETED", "Completed", FaCheckCircle, eventMetrics.completed],
    ["DRAFTS", "Drafts", FaEdit, eventMetrics.drafts],
    ["ARCHIVED", "Archived", FaArchive, eventMetrics.archived],
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

      {feedback ? (
        <AlertBanner
          type={feedback.type}
          title={feedback.title}
          message={feedback.message}
        />
      ) : (
        statusMessage && <p className="text-sm font-semibold text-[#17643a]">{statusMessage}</p>
      )}

      <section className="overflow-hidden rounded-2xl border border-[#e1e7f2] bg-white shadow-[0_14px_34px_rgba(10,47,102,0.08)]">
        <div className="border-b border-[#e1e7f2]">
          <div className="flex flex-wrap gap-0 px-4">
            {filterTabs.map(([key, label, Icon, count]) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveFilter(key)}
                className={`relative inline-flex min-h-14 items-center gap-2 px-5 text-sm font-black transition ${
                  activeFilter === key
                    ? "text-purple-700 after:absolute after:bottom-0 after:left-0 after:h-[3px] after:w-full after:rounded-full after:bg-purple-700"
                    : "text-[#24314d] hover:bg-[#f8fbff] hover:text-purple-700"
                }`}
              >
                <Icon />
                {label}
              </button>
            ))}
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
                const stage = getEventStage(event);
                const eventState = String(
                  event.lifecycleStatus || "ACTIVE"
                ).toUpperCase();
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
                const rowStats = [
                  ["Registrations", registered, getEventUnitLabel(event)],
                  ["Schools", event.schoolCount || 1, "School"],
                  ["Current", currentStage, isFinished ? "Finished" : "Live"],
                  [
                    "Results",
                    event.resultsPublished ? "Published" : "Pending",
                    event.resultsPublished ? "Ready" : "-",
                  ],
                  [
                    "Certificates",
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
                    label: "Round 1",
                    active: currentStage === "Round 1",
                    complete: currentStage !== "Registration" || isFinished,
                  },
                  {
                    label: "Round 2",
                    active: currentStage === "Round 2",
                    complete: isFinished,
                  },
                  {
                    label: "Results",
                    active: !event.resultsPublished && isFinished,
                    complete: Boolean(event.resultsPublished),
                  },
                  {
                    label: "Certificates",
                    active: false,
                    complete: Boolean(event.resultsPublished),
                  },
                  {
                    label: "Completed",
                    active: eventState === "COMPLETED",
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
                            {!isFinished &&
                            (event.lifecycleStatus || "ACTIVE") !== "ARCHIVED" ? (
                              <button
                                type="button"
                                onClick={() => setArchiveTarget(event)}
                                className="inline-flex min-h-9 items-center gap-2 rounded-xl bg-white px-4 text-xs font-black text-rose-700 transition hover:bg-rose-50"
                              >
                                <FaArchive />
                                Delete / Archive Event
                              </button>
                            ) : (event.lifecycleStatus || "ACTIVE") === "ARCHIVED" ? (
                              <button
                                type="button"
                                onClick={() => handleStatusChange(event._id, "ACTIVE")}
                                className="inline-flex min-h-9 items-center gap-2 rounded-xl bg-white px-4 text-xs font-black text-[#0a2f66] transition hover:bg-[#f8fbff]"
                              >
                                <FaHistory />
                                Restore Event
                              </button>
                            ) : null}
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
                showFeaturedOnLanding={false}
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
        open={Boolean(archiveTarget)}
        title="Archive this event?"
        message={
          archiveTarget
            ? `${archiveTarget.title} will move to history and disappear from active student discovery. You can restore it later from archived events.`
            : ""
        }
        confirmLabel="Archive event"
        tone="danger"
        onClose={() => setArchiveTarget(null)}
        onConfirm={handleArchive}
      />
    </div>
  );
}
