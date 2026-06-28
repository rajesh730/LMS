"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  FaBell,
  FaCalendarAlt,
  FaCheckCircle,
  FaCircle,
  FaEye,
  FaSignOutAlt,
  FaTrophy,
  FaUsers,
} from "react-icons/fa";
import EmptyState from "@/components/EmptyState";
import LoadingState from "@/components/ui/LoadingState";
import AlertBanner from "@/components/ui/AlertBanner";
import AppDate from "@/components/common/AppDate";
import useRealtimeChannel from "@/lib/useRealtimeChannel";
import useWorkIndicators from "@/lib/useWorkIndicators";
import { isTeamEventLike } from "@/lib/eventParticipationFormat";
import {
  formatEventWorkflowStatus,
  getEventNextActionLabel,
  getEventWorkflowStatus,
} from "@/lib/eventWorkflow";
import EventFilterBar from "@/components/events/EventFilterBar";
import EventListCard from "@/components/events/EventListCard";
import {
  isCompletedEvent,
  isLiveEvent,
  isRegistrationOpenEvent,
  isTerminalEvent,
  matchesEventFacets,
  matchesEventListFilter,
} from "@/lib/eventListTaxonomy";

// Sub-tabs that carry a "new activity" red dot map to a seen-surface.
const TAB_SEEN_SURFACE = {
  COMPLETED: "student.eventResults",
};

function formatType(value) {
  return String(value || "EVENT").replaceAll("_", " ");
}

function getRegisteredCount(event) {
  return Number(event.enrolled ?? event.studentCapacityCount ?? event.studentCount ?? 0) || 0;
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

function isCancelled(event) {
  return String(event.lifecycleStatus || "ACTIVE").toUpperCase() === "CANCELLED";
}

function getStudentStatus(event) {
  if (event.participationStatus) return event.participationStatus;
  if (event.isGradeEligible === false) return "NOT_ELIGIBLE";
  if (event.canRequest) return "CAN_ENROLL";
  return "SCHOOL_MANAGED";
}

function formatStudentStatus(status) {
  const labels = {
    PENDING: "Pending",
    APPROVED: "Registered",
    ENROLLED: "Enrolled",
    REJECTED: "Declined",
    NOT_ELIGIBLE: "Not for your grade",
    CAN_ENROLL: "Can enroll",
    SCHOOL_MANAGED: "School managed",
  };
  return labels[status] || formatType(status);
}

function statusClasses(status) {
  if (["APPROVED", "ENROLLED"].includes(status)) {
    return "bg-emerald-50 text-emerald-700";
  }
  if (status === "PENDING") return "bg-amber-50 text-amber-800";
  if (status === "REJECTED" || status === "NOT_ELIGIBLE") {
    return "bg-rose-50 text-rose-700";
  }
  if (status === "CAN_ENROLL") return "bg-blue-50 text-[#0a2f66]";
  return "bg-[#f4f8fd] text-[#52657d]";
}

function getStudentNextAction(event) {
  if (isCancelled(event))
    return "This event was cancelled. Your registration was withdrawn.";
  if (isCompletedEvent(event)) return "Review final result and certificates.";
  if (event.participationStatus) return "Follow notices, rounds, and event updates.";
  if (event.isGradeEligible === false) {
    return event.ineligibilityReason || "This event is outside your grade eligibility.";
  }
  if (event.canRequest) return "Enroll before registration closes.";
  return "Your school manages registration for this event.";
}

export default function StudentEventsManager() {
  const { getIndicator, markSurfaceSeen } = useWorkIndicators();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [gradeFilter, setGradeFilter] = useState("");
  const [showFilters, setShowFilters] = useState(true);
  const [feedback, setFeedback] = useState(null);
  const [certificateLoadingId, setCertificateLoadingId] = useState("");

  const loadEvents = useCallback(async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true);
      const res = await fetch("/api/events/hub/available", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || "Student events could not be loaded.");
      }
      setEvents(Array.isArray(data.events) ? data.events : []);
    } catch (error) {
      setFeedback({
        type: "error",
        title: "Events could not be loaded",
        message: error.message || "Please retry or check the server connection.",
      });
      setEvents([]);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  useRealtimeChannel(
    "events",
    useCallback(() => {
      void loadEvents({ silent: true });
    }, [loadEvents])
  );

  const enroll = async (event) => {
    try {
      setFeedback(null);
      const res = await fetch(`/api/events/${event._id}/participate`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || data.message || "Enrollment failed.");
      setFeedback({
        type: "success",
        title: "Enrollment complete",
        message: `You are enrolled in ${event.title}.`,
      });
      await loadEvents({ silent: true });
    } catch (error) {
      setFeedback({
        type: "error",
        title: "Enrollment failed",
        message: error.message || "Please retry after checking registration rules.",
      });
    }
  };

  const withdraw = async (event) => {
    try {
      setFeedback(null);
      const res = await fetch(`/api/events/${event._id}/participate`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(data.error || data.message || "Withdrawal failed.");
      setFeedback({
        type: "success",
        title: "Withdrawn",
        message: `You have withdrawn from ${event.title}.`,
      });
      await loadEvents({ silent: true });
    } catch (error) {
      setFeedback({
        type: "error",
        title: "Withdrawal failed",
        message: error.message || "Please retry after checking registration rules.",
      });
    }
  };

  const openStudentCertificate = async (event) => {
    try {
      setCertificateLoadingId(event._id);
      setFeedback(null);
      const res = await fetch(`/api/events/${event._id}/certificates/student`, {
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || "Certificate could not be loaded.");
      }

      const certificates = Array.isArray(data.certificates) ? data.certificates : [];
      const certificate = certificates.find((item) => item.certificateUrl);
      if (!certificate) {
        throw new Error(
          data.resultState || "No issued certificate is assigned to your account yet."
        );
      }

      window.open(certificate.certificateUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      setFeedback({
        type: "warning",
        title: "Certificate unavailable",
        message: error.message || "No certificate is assigned to your account yet.",
      });
    } finally {
      setCertificateLoadingId("");
    }
  };

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

  const metrics = useMemo(() => {
    const activeRecords = events.filter((event) => !isTerminalEvent(event));
    return {
      live: events.filter(isLiveEvent).length,
      registrationOpen: events.filter(isRegistrationOpenEvent).length,
      myEvents: events.filter((event) => Boolean(event.participationStatus)).length,
      completed: events.filter(isCompletedEvent).length,
      activeRecords: activeRecords.length,
    };
  }, [events]);

  const filteredEvents = useMemo(() => {
    return events.filter(
      (event) =>
        matchesEventListFilter(event, activeFilter, {
          isMine: Boolean(event.participationStatus),
        }) &&
        matchesEventFacets(event, {
          search,
          type: typeFilter,
          grade: gradeFilter,
        })
    );
  }, [activeFilter, events, gradeFilter, search, typeFilter]);

  const metricCards = [
    {
      key: "LIVE",
      label: "Live",
      value: metrics.live,
      note: "Rounds or results in progress",
      icon: FaCalendarAlt,
      tone: "blue",
    },
    {
      key: "REGISTRATION",
      label: "Registration Open",
      value: metrics.registrationOpen,
      note: "Events accepting entries",
      icon: FaUsers,
      tone: "emerald",
    },
    {
      key: "MINE",
      label: "My Events",
      value: metrics.myEvents,
      note: "You are registered",
      icon: FaCheckCircle,
      tone: "purple",
    },
    {
      key: "COMPLETED",
      label: "Results Ready",
      value: metrics.completed,
      note: "Results/certificates",
      icon: FaTrophy,
      tone: "amber",
    },
  ];

  const metricTones = {
    purple: "border-purple-100 bg-purple-50 text-purple-700",
    emerald: "border-emerald-100 bg-emerald-50 text-emerald-700",
    amber: "border-amber-100 bg-amber-50 text-amber-700",
    blue: "border-blue-100 bg-blue-50 text-[#0a2f66]",
  };

  const filterTabs = [
    { key: "LIVE", label: "Live", icon: FaCircle, count: metrics.live },
    { key: "REGISTRATION", label: "Registration Open", icon: FaUsers, count: metrics.registrationOpen },
    { key: "ALL", label: "All Events", icon: FaCalendarAlt, count: metrics.activeRecords },
    { key: "MINE", label: "My Events", icon: FaCheckCircle, count: metrics.myEvents },
    { key: "COMPLETED", label: "Completed", icon: FaTrophy, count: metrics.completed, surface: TAB_SEEN_SURFACE.COMPLETED },
  ];

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metricCards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.key}
              type="button"
              onClick={() => setActiveFilter(card.key)}
              className={`rounded-2xl border border-[#e6eaf7] bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#b9c9eb] hover:shadow-md ${
                activeFilter === card.key ? "ring-2 ring-blue-100" : ""
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
        <EventFilterBar
          tabs={filterTabs}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          search={search}
          onSearchChange={setSearch}
          typeFilter={typeFilter}
          onTypeChange={setTypeFilter}
          typeOptions={eventTypes}
          gradeFilter={gradeFilter}
          onGradeChange={setGradeFilter}
          gradeOptions={gradeOptions}
          showFilters={showFilters}
          onToggleFilters={() => setShowFilters((value) => !value)}
          onClear={() => {
            setSearch("");
            setTypeFilter("");
            setGradeFilter("");
          }}
          getNotificationCount={(surface) => getIndicator(surface).count}
          onSurfaceSeen={(surface) => void markSurfaceSeen(surface)}
        />

        <div className="p-4">
          {loading ? (
            <LoadingState
              title="Loading student events"
              message="Preparing registrations, notices, rounds, and results."
            />
          ) : filteredEvents.length === 0 ? (
            <EmptyState
              icon={FaCalendarAlt}
              title="No student events found"
              description="Adjust filters or check again after your school publishes an event."
            />
          ) : (
            <div className="space-y-3">
              {filteredEvents.map((event) => {
                const workflowStatus = getEventWorkflowStatus(event);
                const registered = getRegisteredCount(event);
                const studentStatus = getStudentStatus(event);
                const currentStage = formatEventWorkflowStatus(workflowStatus);
                const gradeSummary = formatGradeSummary(event.eligibleGrades || []);
                const gradeTitle =
                  event.eligibleGrades?.length > 0
                    ? event.eligibleGrades.join(", ")
                    : "All grades";
                const finished = isCompletedEvent(event);
                const cancelled = isCancelled(event);
                const primaryHref = `/student/events/${event._id}${
                  finished ? "?tab=results" : ""
                }`;
                const rowStats = [
                  ["Registration", formatStudentStatus(studentStatus), finished ? "Finished" : "Student status"],
                  ["Participants", registered, getEventUnitLabel(event)],
                  ["Stage", currentStage, finished ? "Finished" : "In progress"],
                  ["Results", finished ? "Published" : "Pending", finished ? "Ready" : "-"],
                  ["Certificates", finished ? "Available" : "Pending", finished ? "Ready" : "-"],
                ];
                const steps = [
                  {
                    label: "Registration",
                    active: ["OPEN_FOR_REGISTRATION", "REGISTRATION_CLOSED"].includes(workflowStatus),
                    complete: !["DRAFT", "OPEN_FOR_REGISTRATION"].includes(workflowStatus),
                  },
                  {
                    label: "Rounds",
                    active: workflowStatus === "ROUND_ACTIVE",
                    complete: ["RESULTS_DRAFT", "RESULTS_PUBLISHED", "COMPLETED"].includes(workflowStatus),
                  },
                  {
                    label: "Results",
                    active: workflowStatus === "RESULTS_DRAFT",
                    complete: ["RESULTS_PUBLISHED", "COMPLETED"].includes(workflowStatus),
                  },
                  {
                    label: "Certificates",
                    active: false,
                    complete: finished,
                  },
                ];

                return (
                  <EventListCard
                    key={event._id}
                  >
                    <div className="grid gap-3 px-4 py-3 xl:grid-cols-[minmax(360px,1.18fr)_minmax(520px,1fr)_190px] xl:items-start">
                      <div className="flex min-w-0 gap-3">
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-lg text-[#0a2f66]">
                          {finished ? <FaTrophy /> : <FaCalendarAlt />}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex min-w-0 flex-wrap items-center gap-2">
                            <h3 className="max-w-[260px] truncate text-base font-black text-[#17120a]">
                              {event.title}
                            </h3>
                            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-black uppercase text-[#0a2f66]">
                              {formatType(event.eventType)}
                            </span>
                            {event.eventScope === "PLATFORM" && (
                              <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-black uppercase text-indigo-700">
                                Platform
                              </span>
                            )}
                            {cancelled && (
                              <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-black uppercase text-rose-700">
                                Cancelled
                              </span>
                            )}
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${statusClasses(studentStatus)}`}>
                              {formatStudentStatus(studentStatus)}
                            </span>
                            <span
                              title={gradeTitle}
                              className="max-w-[180px] truncate rounded-full bg-[#f4f8fd] px-2 py-0.5 text-[10px] font-black uppercase text-[#52657d]"
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
                              <AppDate value={event.date} fallback="Not set" />
                            </span>
                            <span className="inline-flex items-center gap-1.5">
                              <FaUsers />
                              {registered} {getEventUnitLabel(event)}
                            </span>
                            <span className="truncate">Next: {getStudentNextAction(event)}</span>
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
                                      ? "text-[#0a2f66]"
                                      : step.complete
                                      ? "text-emerald-600"
                                      : "text-[#c8d4e6]"
                                  }
                                />
                                {step.label}
                              </span>
                            ))}
                          </div>
                          <p className="mt-3 text-xs font-bold text-[#52657d]">
                            Next: {getEventNextActionLabel(event)}
                          </p>
                        </div>
                      </div>

                      <div className="relative flex flex-col gap-2 border-l border-[#e1e7f2] pl-4">
                        {event.canRequest && !event.participationStatus && !finished && !cancelled ? (
                          <button
                            type="button"
                            onClick={() => enroll(event)}
                            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[#0a2f66] px-4 text-xs font-black text-white shadow-sm transition hover:bg-[#123f7d]"
                          >
                            <FaCheckCircle />
                            Enroll
                          </button>
                        ) : (
                          <Link
                            href={primaryHref}
                            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[#0a2f66] px-4 text-xs font-black text-white shadow-sm transition hover:bg-[#123f7d]"
                          >
                            <FaEye />
                            {finished ? "View Result" : "View Event"}
                          </Link>
                        )}
                        {event.canWithdraw && !finished && !cancelled && (
                          <button
                            type="button"
                            onClick={() => withdraw(event)}
                            className="inline-flex min-h-8 items-center gap-2 rounded-lg bg-white px-3 text-[11px] font-black text-rose-600 transition hover:bg-rose-50"
                          >
                            <FaSignOutAlt />
                            Withdraw
                          </button>
                        )}
                        <Link
                          href={`/student/events/${event._id}?tab=notices`}
                          className="inline-flex min-h-8 items-center gap-2 rounded-lg bg-white px-3 text-[11px] font-black text-[#0a2f66] transition hover:bg-[#f8fbff]"
                        >
                          <FaBell />
                          Event Notices
                        </Link>
                        {finished && (
                          <button
                            type="button"
                            onClick={() => openStudentCertificate(event)}
                            disabled={certificateLoadingId === event._id}
                            className="inline-flex min-h-8 items-center gap-2 rounded-lg bg-white px-3 text-left text-[11px] font-black text-[#0a2f66] transition hover:bg-[#f8fbff] disabled:cursor-wait disabled:opacity-60"
                          >
                            <FaTrophy />
                            {certificateLoadingId === event._id
                              ? "Opening..."
                              : "My Certificate"}
                          </button>
                        )}
                      </div>
                    </div>
                  </EventListCard>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
