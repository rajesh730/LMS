"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  FaBell,
  FaCalendarAlt,
  FaCheckCircle,
  FaCircle,
  FaClipboardCheck,
  FaFilter,
  FaGlobe,
  FaSearch,
  FaTimesCircle,
  FaTrophy,
  FaUserPlus,
  FaUsers,
} from "react-icons/fa";
import EmptyState from "@/components/EmptyState";
import LoadingState from "@/components/ui/LoadingState";
import AlertBanner from "@/components/ui/AlertBanner";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import useRealtimeChannel from "@/lib/useRealtimeChannel";
import useWorkIndicators from "@/lib/useWorkIndicators";
import { isTeamEventLike } from "@/lib/eventParticipationFormat";
import {
  formatEventWorkflowStatus,
  getEventWorkflowStatus,
  isRegistrationOpen,
} from "@/lib/eventWorkflow";

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

function formatGradeSummary(grades = []) {
  const visible = grades.filter(Boolean);
  if (visible.length === 0) return "All grades";
  if (visible.length <= 2) return visible.join(", ");
  return `${visible.length} grades`;
}

// The per-school invitation drives the school-side state of a platform event.
// A missing invitation behaves like a fresh, actionable one.
function getInvitationStatus(event) {
  return String(event.schoolInvitationStatus || "PENDING").toUpperCase();
}

function getSchoolRegistrationCount(event) {
  return Number(event.myParticipation?.studentCount || 0) || 0;
}

function getUnitLabel(event) {
  return isTeamEventLike(event) ? "Teams" : "Students";
}

function isArchivedEvent(event) {
  return String(event.lifecycleStatus || "ACTIVE").toUpperCase() === "ARCHIVED";
}

function isCompletedEvent(event) {
  return Boolean(
    event.resultsPublished ||
      String(event.lifecycleStatus || "").toUpperCase() === "COMPLETED"
  );
}

function isLiveEvent(event) {
  return (
    !isArchivedEvent(event) &&
    !isCompletedEvent(event) &&
    ["REGISTRATION_CLOSED", "ROUND_ACTIVE", "RESULTS_DRAFT"].includes(
      getEventWorkflowStatus(event)
    )
  );
}

// "Joinable" means the school can still accept/decline and add students: the
// event is open for registration and has not started. Once it starts or the
// deadline passes, the invitation is no longer actionable.
function isJoinable(event) {
  return (
    !isArchivedEvent(event) &&
    !isCompletedEvent(event) &&
    isRegistrationOpen(event)
  );
}

// A single label that blends the school's invitation decision with the
// event stage, so a stale (started) invitation never looks actionable.
function getDisplayStatus(event) {
  if (String(event.lifecycleStatus || "").toUpperCase() === "CANCELLED") {
    return { label: "Cancelled", classes: "bg-rose-50 text-rose-700" };
  }
  const status = getInvitationStatus(event);
  if (status === "APPROVED") {
    return { label: "Joined", classes: "bg-emerald-50 text-emerald-700" };
  }
  if (status === "DISAPPROVED") {
    return { label: "Declined", classes: "bg-rose-50 text-rose-700" };
  }
  if (status === "WITHDRAWN") {
    return { label: "Closed", classes: "bg-slate-100 text-slate-600" };
  }
  // PENDING
  if (isJoinable(event)) {
    return { label: "Invitation", classes: "bg-amber-50 text-amber-800" };
  }
  return { label: "Missed", classes: "bg-slate-100 text-slate-600" };
}

function isOpenInvitation(event) {
  return getInvitationStatus(event) === "PENDING" && isJoinable(event);
}

// Each sub-tab that carries a "new activity" red dot maps to a seen-surface;
// clicking the tab clears that surface.
const TAB_SEEN_SURFACE = {
  INVITATIONS: "school.eventInvitations",
  COMPLETED: "school.eventResults",
};

export default function PlatformEventsManager() {
  const { markSurfaceSeen, getIndicator } = useWorkIndicators();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [gradeFilter, setGradeFilter] = useState("");
  const [showFilters, setShowFilters] = useState(true);
  const [feedback, setFeedback] = useState(null);
  const [busyId, setBusyId] = useState("");
  const [declineTarget, setDeclineTarget] = useState(null);

  const loadEvents = useCallback(async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true);
      const res = await fetch("/api/events", { cache: "no-store" });
      if (!res.ok) {
        setEvents([]);
        return;
      }
      const data = await res.json();
      const platformEvents = (data.events || []).filter(
        (event) => event.eventScope === "PLATFORM"
      );
      setEvents(platformEvents);
    } catch (error) {
      console.error("Failed to load platform events", error);
      setFeedback({
        type: "error",
        title: "Platform events could not be loaded",
        message: "Please retry or check the server connection.",
      });
      setEvents([]);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  // Clear the "new invitations" badge once the school opens this surface.
  useEffect(() => {
    void markSurfaceSeen("school.platformEvents");
  }, [markSurfaceSeen]);

  useRealtimeChannel(
    "events",
    useCallback(
      (message) => {
        const payload = message?.payload || {};
        if (payload.eventScope && payload.eventScope !== "PLATFORM") return;
        void loadEvents({ silent: true });
      },
      [loadEvents]
    )
  );

  const decideInvitation = useCallback(
    async (event, action) => {
      try {
        setBusyId(event._id);
        setFeedback(null);
        const res = await fetch(`/api/events/${event._id}/school-invitation`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.message || "Could not update this event.");
        }
        setFeedback({
          type: "success",
          title: action === "approve" ? "Event joined" : "Event left",
          message: data.message || "Your school decision was saved.",
        });
        await loadEvents({ silent: true });
      } catch (error) {
        setFeedback({
          type: "error",
          title: "Action failed",
          message: error.message || "Please retry.",
        });
      } finally {
        setBusyId("");
      }
    },
    [loadEvents]
  );

  const selectTab = useCallback(
    (key) => {
      setActiveFilter(key);
      const surface = TAB_SEEN_SURFACE[key];
      if (surface) void markSurfaceSeen(surface);
    },
    [markSurfaceSeen]
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

  // A platform event matches a stage bucket as follows. INVITATIONS are only
  // the open, still-joinable ones; ALL excludes archived (like School Events).
  const matchesBucket = useCallback((event, key) => {
    const joined = getInvitationStatus(event) === "APPROVED";
    switch (key) {
      case "ALL":
        return !isArchivedEvent(event);
      case "INVITATIONS":
        return isOpenInvitation(event);
      case "REGISTRATION":
        return joined && isJoinable(event);
      case "LIVE":
        return isLiveEvent(event);
      case "COMPLETED":
        return isCompletedEvent(event) && !isArchivedEvent(event);
      case "DECLINED":
        return ["DISAPPROVED", "WITHDRAWN"].includes(
          getInvitationStatus(event)
        );
      default:
        return true;
    }
  }, []);

  const metrics = useMemo(() => {
    const count = (key) => events.filter((event) => matchesBucket(event, key)).length;
    return {
      total: count("ALL"),
      invitations: count("INVITATIONS"),
      registration: count("REGISTRATION"),
      live: count("LIVE"),
      completed: count("COMPLETED"),
      declined: count("DECLINED"),
    };
  }, [events, matchesBucket]);

  const filteredEvents = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return events.filter((event) => {
      const matchesFilter = matchesBucket(event, activeFilter);
      const matchesSearch =
        !needle ||
        String(event.title || "").toLowerCase().includes(needle) ||
        String(event.description || "").toLowerCase().includes(needle);
      const matchesType = !typeFilter || event.eventType === typeFilter;
      const matchesGrade =
        !gradeFilter || (event.eligibleGrades || []).includes(gradeFilter);
      return matchesFilter && matchesSearch && matchesType && matchesGrade;
    });
  }, [activeFilter, events, gradeFilter, matchesBucket, search, typeFilter]);

  const metricCards = [
    {
      key: "INVITATIONS",
      label: "Invitations",
      value: metrics.invitations,
      note: "Awaiting your decision",
      icon: FaBell,
      tone: "amber",
    },
    {
      key: "REGISTRATION",
      label: "Registration Open",
      value: metrics.registration,
      note: "Joined — add students",
      icon: FaUserPlus,
      tone: "emerald",
    },
    {
      key: "COMPLETED",
      label: "Completed",
      value: metrics.completed,
      note: "Results / certificates",
      icon: FaTrophy,
      tone: "indigo",
    },
    {
      key: "DECLINED",
      label: "Declined",
      value: metrics.declined,
      note: "Rejoin while open",
      icon: FaTimesCircle,
      tone: "rose",
    },
  ];

  const metricTones = {
    indigo: "border-indigo-100 bg-indigo-50 text-indigo-700",
    emerald: "border-emerald-100 bg-emerald-50 text-emerald-700",
    amber: "border-amber-100 bg-amber-50 text-amber-700",
    rose: "border-rose-100 bg-rose-50 text-rose-700",
    slate: "border-slate-100 bg-slate-50 text-slate-700",
  };

  const filterTabs = [
    ["LIVE", "Live", FaCircle, metrics.live],
    ["INVITATIONS", "Invitations", FaBell, metrics.invitations],
    ["REGISTRATION", "Registration Open", FaUserPlus, metrics.registration],
    ["ALL", "All Events", FaGlobe, metrics.total],
    ["COMPLETED", "Completed", FaTrophy, metrics.completed],
    ["DECLINED", "Declined", FaTimesCircle, metrics.declined],
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-xl text-indigo-700">
            <FaGlobe />
          </span>
          <div>
            <h1 className="text-3xl font-black text-[#17120a]">Platform Events</h1>
            <p className="mt-2 text-base text-[#52657d]">
              Competitions hosted by Pravyo. Join the ones you want, then register
              and manage your students.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metricCards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.label}
              type="button"
              onClick={() => selectTab(card.key)}
              className={`rounded-2xl border border-[#e6eaf7] bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md ${
                activeFilter === card.key ? "ring-2 ring-indigo-100" : ""
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
              // Count pills tell the school exactly which tab a notification was
              // for: Invitations (decision needed) and Registration Open (add
              // students) are the action tabs and get a coloured pill.
              const pillTone =
                key === "INVITATIONS"
                  ? "bg-indigo-100 text-indigo-700"
                  : key === "REGISTRATION"
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-[#eef2f8] text-[#52657d]";
              // Red "new activity here" dot — seen-based per tab; clears once
              // you open that tab and returns only when something new lands.
              const seenSurface = TAB_SEEN_SURFACE[key];
              const showDot =
                Boolean(seenSurface) &&
                getIndicator(seenSurface).count > 0 &&
                activeFilter !== key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => selectTab(key)}
                  className={`relative inline-flex min-h-14 items-center gap-2 px-5 text-sm font-black transition ${
                    activeFilter === key
                      ? "text-indigo-700 after:absolute after:bottom-0 after:left-0 after:h-[3px] after:w-full after:rounded-full after:bg-indigo-700"
                      : "text-[#24314d] hover:bg-[#f8fbff] hover:text-indigo-700"
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
                      className={`ml-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-black ${pillTone}`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="grid gap-3 border-t border-[#e1e7f2] p-4 lg:grid-cols-[minmax(240px,1fr)_180px_180px_auto_auto]">
            <div className="relative">
              <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-[#75869b]" />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search platform events..."
                className="h-12 w-full rounded-xl border border-[#dbe5f4] bg-[#f8fbff] pl-11 pr-4 text-sm font-semibold outline-none transition focus:border-indigo-300"
              />
            </div>
            <select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
              className={`h-12 rounded-xl border border-[#dbe5f4] bg-white px-4 text-sm font-black text-[#24314d] outline-none transition focus:border-indigo-300 ${
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
              className={`h-12 rounded-xl border border-[#dbe5f4] bg-white px-4 text-sm font-black text-[#24314d] outline-none transition focus:border-indigo-300 ${
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
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setTypeFilter("");
                setGradeFilter("");
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
              title="Loading platform events"
              message="Preparing invitations from Pravyo competitions."
            />
          ) : filteredEvents.length === 0 ? (
            <EmptyState
              icon={FaGlobe}
              title="No platform events found"
              description="When Pravyo publishes a competition for your school, it will appear here to join. Adjust filters to see more."
            />
          ) : (
            <div className="space-y-3">
              {filteredEvents.map((event) => {
                const status = getInvitationStatus(event);
                const meta = getDisplayStatus(event);
                const isTeamEvent = isTeamEventLike(event);
                const workflowStatus = getEventWorkflowStatus(event);
                const stageLabel = formatEventWorkflowStatus(workflowStatus);
                const gradeSummary = formatGradeSummary(event.eligibleGrades || []);
                const gradeTitle =
                  event.eligibleGrades?.length > 0
                    ? event.eligibleGrades.join(", ")
                    : "All grades";
                const registered = getSchoolRegistrationCount(event);
                const totalParticipants = Number(event.studentCount || 0) || 0;
                const schoolCount = Number(event.schoolCount || 0) || 0;
                const isBusy = busyId === event._id;
                const isApproved = status === "APPROVED";
                const isWithdrawn = status === "WITHDRAWN";
                const joinable = isJoinable(event);
                // Pending or previously-declined schools may (re)join only while
                // the event is still open. Started events are no longer joinable.
                const canJoin =
                  ["PENDING", "DISAPPROVED"].includes(status) && joinable;
                const registrationClosedForJoin =
                  ["PENDING", "DISAPPROVED"].includes(status) && !joinable;
                const manageHref = `/school/events/${event._id}/manage`;

                const rowStats = [
                  ["Your Status", meta.label, isApproved ? "Participating" : "Decision"],
                  [
                    "Your Entries",
                    isApproved ? registered : "—",
                    isApproved ? getUnitLabel(event) : "After joining",
                  ],
                  ["Schools", schoolCount, schoolCount === 1 ? "Joined" : "Joined"],
                  ["Participants", totalParticipants, "Platform-wide"],
                  ["Stage", stageLabel, "Event progress"],
                ];

                const steps = [
                  {
                    label: "Joined",
                    active: status === "PENDING",
                    complete: isApproved,
                  },
                  {
                    label: "Registration",
                    active:
                      isApproved &&
                      ["OPEN_FOR_REGISTRATION", "REGISTRATION_CLOSED"].includes(
                        workflowStatus
                      ),
                    complete:
                      isApproved &&
                      !["DRAFT", "OPEN_FOR_REGISTRATION"].includes(workflowStatus),
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
                    label: "Results",
                    active: workflowStatus === "RESULTS_DRAFT",
                    complete: ["RESULTS_PUBLISHED", "COMPLETED"].includes(
                      workflowStatus
                    ),
                  },
                  {
                    label: "Completed",
                    active: false,
                    complete:
                      event.resultsPublished ||
                      ["COMPLETED", "ARCHIVED"].includes(
                        String(event.lifecycleStatus || "").toUpperCase()
                      ),
                  },
                ];

                return (
                  <div
                    key={event._id}
                    className="overflow-hidden rounded-xl border border-[#dfe7f3] bg-white shadow-sm transition hover:border-indigo-200 hover:shadow-md"
                  >
                    <div className="grid gap-3 px-4 py-3 xl:grid-cols-[minmax(360px,1.18fr)_minmax(520px,1fr)_210px] xl:items-start">
                      <div className="flex min-w-0 gap-3">
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-lg text-indigo-700">
                          {event.resultsPublished ? <FaTrophy /> : <FaGlobe />}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex min-w-0 flex-wrap items-center gap-2">
                            <h3 className="max-w-[260px] truncate text-base font-black text-[#17120a]">
                              {event.title}
                            </h3>
                            <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-black uppercase text-indigo-700">
                              {formatType(event.eventType)}
                            </span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${meta.classes}`}
                            >
                              {meta.label}
                            </span>
                            <span className="rounded-full bg-[#f4f8fd] px-2 py-0.5 text-[10px] font-black uppercase text-[#52657d]">
                              {isTeamEvent ? "Team Event" : "Individual Event"}
                            </span>
                            <span
                              title={gradeTitle}
                              className="max-w-[180px] truncate rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-black uppercase text-[#0a2f66]"
                            >
                              {gradeSummary}
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
                            {event.registrationDeadline && (
                              <span className="inline-flex items-center gap-1.5">
                                <FaClipboardCheck />
                                Register by {formatDate(event.registrationDeadline)}
                              </span>
                            )}
                            <span className="inline-flex items-center gap-1.5">
                              <FaUsers />
                              {totalParticipants} {getUnitLabel(event)}
                            </span>
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
                              <span
                                key={step.label}
                                className="inline-flex items-center gap-1.5"
                              >
                                <FaCircle
                                  className={
                                    step.active
                                      ? "text-indigo-700"
                                      : step.complete
                                      ? "text-emerald-600"
                                      : "text-[#c8d4e6]"
                                  }
                                />
                                {step.label}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="relative flex flex-col gap-2 border-l border-[#e1e7f2] pl-4">
                        {isWithdrawn ? (
                          <span className="inline-flex min-h-10 items-center justify-center rounded-lg bg-slate-100 px-4 text-xs font-black text-slate-500">
                            No longer available
                          </span>
                        ) : isApproved ? (
                          <>
                            {joinable ? (
                              <Link
                                href={`${manageHref}?tab=registrations`}
                                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-indigo-700 px-4 text-xs font-black text-white shadow-sm transition hover:bg-indigo-800"
                              >
                                <FaUserPlus />
                                Register Students
                              </Link>
                            ) : (
                              <Link
                                href={manageHref}
                                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-indigo-700 px-4 text-xs font-black text-white shadow-sm transition hover:bg-indigo-800"
                              >
                                <FaClipboardCheck />
                                View Event
                              </Link>
                            )}
                            {joinable && (
                              <Link
                                href={manageHref}
                                className="inline-flex min-h-8 items-center justify-center gap-2 rounded-lg bg-white px-3 text-[11px] font-black text-[#0a2f66] transition hover:bg-[#f8fbff]"
                              >
                                <FaClipboardCheck />
                                View Event
                              </Link>
                            )}
                            {joinable && (
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => setDeclineTarget(event)}
                                className="inline-flex min-h-8 items-center justify-center gap-2 rounded-lg bg-white px-3 text-[11px] font-black text-rose-600 transition hover:bg-rose-50 disabled:opacity-50"
                              >
                                <FaTimesCircle />
                                Leave Event
                              </button>
                            )}
                          </>
                        ) : canJoin ? (
                          <>
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => decideInvitation(event, "approve")}
                              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-indigo-700 px-4 text-xs font-black text-white shadow-sm transition hover:bg-indigo-800 disabled:opacity-50"
                            >
                              <FaCheckCircle />
                              {isBusy
                                ? "Joining..."
                                : status === "DISAPPROVED"
                                ? "Rejoin Event"
                                : "Join Event"}
                            </button>
                            {status === "PENDING" && (
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => decideInvitation(event, "decline")}
                                className="inline-flex min-h-8 items-center justify-center gap-2 rounded-lg bg-white px-3 text-[11px] font-black text-[#52657d] transition hover:bg-[#f8fbff] disabled:opacity-50"
                              >
                                Decline
                              </button>
                            )}
                          </>
                        ) : (
                          <span className="inline-flex min-h-10 items-center justify-center rounded-lg bg-slate-100 px-4 text-center text-[11px] font-black text-slate-500">
                            {registrationClosedForJoin
                              ? "Registration closed"
                              : "View only"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <ConfirmDialog
        open={Boolean(declineTarget)}
        title="Leave this platform event?"
        message={
          declineTarget
            ? `Your school will leave "${declineTarget.title}". Any students you registered for this event will be withdrawn. You can rejoin later while registration is open.`
            : ""
        }
        confirmLabel="Leave event"
        tone="danger"
        onClose={() => setDeclineTarget(null)}
        onConfirm={() => {
          const target = declineTarget;
          setDeclineTarget(null);
          if (target) void decideInvitation(target, "decline");
        }}
      />
    </div>
  );
}
