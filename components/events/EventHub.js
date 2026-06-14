"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  FaCalendarAlt,
  FaBell,
  FaClock,
  FaMapMarkerAlt,
  FaUsers,
  FaCheckCircle,
  FaTimesCircle,
  FaClock as FaClock2,
  FaSearch,
  FaTimes,
  FaChevronDown,
  FaChevronUp,
  FaTrash,
  FaEdit,
  FaEye,
} from "react-icons/fa";
import EventParticipationForm from "./EventParticipationForm";
import { useSession } from "next-auth/react";
import SchoolRoundPanel from "@/app/school/dashboard/SchoolRoundPanel";
import EventCertificatesPanel from "./EventCertificatesPanel";
import EmptyState from "@/components/EmptyState";
import LoadingState from "@/components/ui/LoadingState";
import AlertBanner from "@/components/ui/AlertBanner";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import useRealtimeChannel from "@/lib/useRealtimeChannel";
import { getEventStage, getStageClasses, isDatePast } from "@/lib/eventUiStatus";
import { isTeamEventLike } from "@/lib/eventParticipationFormat";

function formatEventDate(value, options = {}) {
  if (!value) return "Not set";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: options.year === false ? undefined : "numeric",
  });
}

function formatGradeList(event) {
  const grades = event.eligibleGrades || event.targetGrades || [];
  return grades.length ? grades.join(", ") : "All / not specified";
}

function EventDetailsModal({ event, onClose }) {
  if (!event) return null;

  const isTeamEvent = isTeamEventLike(event);
  const deadline = event.registrationDeadline || event.deadline;
  const partners = Array.isArray(event.partners)
    ? event.partners
        .map((partner) => partner.displayName || partner.organizationName || partner.name)
        .filter(Boolean)
    : [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-[#d7cdbb] bg-white shadow-2xl"
        onClick={(eventClick) => eventClick.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#e1e7f2] p-5">
          <div>
            <p className="text-xs font-black uppercase text-[#52657d]">
              {event.eventScope === "PLATFORM" ? "Platform Competition" : "School Event"}
            </p>
            <h2 className="mt-1 text-2xl font-black text-[#001233]">
              {event.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#d7cdbb] text-[#52657d] transition hover:bg-[#f8fbff] hover:text-[#0a2f66]"
            aria-label="Close event details"
          >
            <FaTimes />
          </button>
        </div>

        <div className="space-y-5 p-5">
          <p className="text-sm leading-6 text-[#344f77]">
            {event.description || "No description provided."}
          </p>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl border border-[#e1e7f2] bg-[#f8fbff] p-4">
              <p className="text-xs font-black uppercase text-[#52657d]">Date</p>
              <p className="mt-1 font-bold text-[#17120a]">
                {formatEventDate(event.date)}
              </p>
            </div>
            <div className="rounded-xl border border-[#e1e7f2] bg-[#f8fbff] p-4">
              <p className="text-xs font-black uppercase text-[#52657d]">
                Registration Deadline
              </p>
              <p className="mt-1 font-bold text-[#17120a]">
                {deadline ? formatEventDate(deadline) : "No deadline"}
              </p>
            </div>
            <div className="rounded-xl border border-[#e1e7f2] bg-[#f8fbff] p-4">
              <p className="text-xs font-black uppercase text-[#52657d]">
                {isTeamEvent ? "Team Capacity" : "Capacity"}
              </p>
              <p className="mt-1 font-bold text-[#17120a]">
                {event.capacity
                  ? `${event.enrolled || 0}/${event.capacity}`
                  : `${event.enrolled || 0}/Unlimited`}
              </p>
            </div>
            <div className="rounded-xl border border-[#e1e7f2] bg-[#f8fbff] p-4">
              <p className="text-xs font-black uppercase text-[#52657d]">Grades</p>
              <p className="mt-1 font-bold text-[#17120a]">
                {formatGradeList(event)}
              </p>
            </div>
            <div className="rounded-xl border border-[#e1e7f2] bg-[#f8fbff] p-4">
              <p className="text-xs font-black uppercase text-[#52657d]">Mode</p>
              <p className="mt-1 font-bold text-[#17120a]">
                {String(event.eventMode || event.mode || "Not specified").replaceAll(
                  "_",
                  " "
                )}
              </p>
            </div>
            <div className="rounded-xl border border-[#e1e7f2] bg-[#f8fbff] p-4">
              <p className="text-xs font-black uppercase text-[#52657d]">Schools</p>
              <p className="mt-1 font-bold text-[#17120a]">
                {event.schoolCount || 0} schools
              </p>
            </div>
          </div>

          {(event.venue || event.prizeDetails || partners.length > 0) && (
            <div className="grid gap-3 sm:grid-cols-2">
              {event.venue && (
                <div className="rounded-xl border border-[#e1e7f2] p-4">
                  <p className="text-xs font-black uppercase text-[#52657d]">Venue</p>
                  <p className="mt-1 text-sm font-semibold text-[#17120a]">
                    {event.venue}
                  </p>
                </div>
              )}
              {event.prizeDetails && (
                <div className="rounded-xl border border-[#e1e7f2] p-4">
                  <p className="text-xs font-black uppercase text-[#52657d]">Prize</p>
                  <p className="mt-1 text-sm font-semibold text-[#17120a]">
                    {event.prizeDetails}
                  </p>
                </div>
              )}
              {partners.length > 0 && (
                <div className="rounded-xl border border-[#e1e7f2] p-4 sm:col-span-2">
                  <p className="text-xs font-black uppercase text-[#52657d]">
                    Partner
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[#17120a]">
                    {partners.join(", ")}
                  </p>
                </div>
              )}
            </div>
          )}

          {event.visibility === "PUBLIC" && (
            <div className="flex justify-end border-t border-[#e1e7f2] pt-4">
              <Link
                href={`/events/${event._id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-10 items-center rounded-lg border border-[#d7cdbb] bg-white px-4 text-sm font-black text-[#0a2f66] transition hover:bg-[#f8fbff]"
              >
                View Public Page
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function EventHub({
  refreshKey = 0,
  eventScope = null,
  title = "Upcoming Events",
  description = "Explore and participate in upcoming school events",
  defaultFilter = "all",
  lifecycleFilter = null,
  completedView = false,
  showFilters = true,
  filters = [
    { id: "all", label: "All Events" },
    { id: "pending", label: "Pending Requests" },
    { id: "approved", label: "My Events" },
    { id: "rejected", label: "Declined" },
  ],
}) {
  const { data: session } = useSession();
  const isStudentView = session?.user?.role === "STUDENT";
  const isSchoolView = session?.user?.role === "SCHOOL_ADMIN";
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedEventId, setExpandedEventId] = useState(null);
  const [openNoticeEventId, setOpenNoticeEventId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState(defaultFilter); // all, participated, pending, approved, rejected
  const [feedback, setFeedback] = useState(null);
  const [withdrawTarget, setWithdrawTarget] = useState(null);
  const [detailEvent, setDetailEvent] = useState(null);

  const fetchEvents = useCallback(async ({ silent = false } = {}) => {
    try {
      if (!silent) {
        setLoading(true);
      }
      // Use different endpoint based on user role
      const endpoint =
        session?.user?.role === "STUDENT"
          ? "/api/events/hub/available"
          : "/api/events";

      const res = await fetch(endpoint, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        const rawEvents = data.events || data || [];
        const loadedEvents = rawEvents.map((event) => ({
          ...event,
          participationStatus: event.participationStatus || event.userStatus || null,
          isParticipating:
            event.isParticipating || Boolean(event.participationStatus || event.userStatus),
          deadline: event.deadline || event.registrationDeadline || null,
          capacity:
            event.capacity === undefined ? event.maxParticipants : event.capacity,
        }));
        setEvents(
          loadedEvents.filter((event) => {
            const scopeMatch = eventScope ? event.eventScope === eventScope : true;
            if (!scopeMatch) return false;

            if (completedView) {
              const hasSchoolParticipation =
                Boolean(event.hasSchoolParticipation) ||
                Number(event.myParticipation?.studentCount || 0) > 0;
              return hasSchoolParticipation && Boolean(event.finalOutcomeReady);
            }

            if (lifecycleFilter === "ACTIVE" && event.finalOutcomeReady) {
              return false;
            }

            if (
              lifecycleFilter &&
              lifecycleFilter !== "ACTIVE" &&
              String(event.lifecycleStatus || "ACTIVE").toUpperCase() !== lifecycleFilter
            ) {
              return false;
            }

            return true;
          })
        );
      }
    } catch (error) {
      console.error("Error fetching events:", error);
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [completedView, eventScope, lifecycleFilter, session?.user?.role]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents, refreshKey]);

  useRealtimeChannel(
    "events",
    useCallback(
      (message) => {
        const payload = message?.payload || {};
        if (eventScope && payload.eventScope && payload.eventScope !== eventScope) {
          return;
        }
        void fetchEvents({ silent: true });
      },
      [eventScope, fetchEvents]
    )
  );

  const isRegistrationClosed = (event) => {
    if (typeof event.registrationLocked === "boolean") {
      return event.registrationLocked;
    }
    const deadline = event.registrationDeadline || event.deadline;
    const lifecycleStatus = String(event.lifecycleStatus || "ACTIVE").toUpperCase();
    return (
      ["COMPLETED", "ARCHIVED"].includes(lifecycleStatus) ||
      Boolean(deadline && isDatePast(deadline, { endOfDay: true }))
    );
  };
  const getRegisteredStudentCount = (event) =>
    isTeamEventLike(event)
      ? event.myParticipation?.teamCount || 0
      : event.myParticipation?.studentCount ||
        event.myParticipation?.students?.length ||
        0;
  const getRegisteredSummary = (event) => {
    if (isTeamEventLike(event)) {
      const teamCount =
        Number(event.myParticipation?.teamCount ?? event.teamCount ?? 0) || 0;
      const memberCount =
        Number(
          event.myParticipation?.studentCount ??
            event.memberCount ??
            event.studentCount ??
            0
        ) || 0;
      return `${teamCount} ${teamCount === 1 ? "team" : "teams"}${
        memberCount
          ? `, ${memberCount} ${memberCount === 1 ? "student" : "students"}`
          : ""
      } registered`;
    }

    const studentCount = getRegisteredStudentCount(event);
    return `${studentCount} ${
      studentCount === 1 ? "student" : "students"
    } registered`;
  };

  const handleWithdraw = async (eventId) => {
    const event = events.find((item) => item._id === eventId);
    if (event && isRegistrationClosed(event)) {
      setFeedback({
        type: "warning",
        title: "Registration is locked",
        message: "Registration is closed, so this team can no longer be withdrawn.",
      });
      return;
    }

    try {
      setFeedback(null);
      const res = await fetch(`/api/events/${eventId}/participate`, {
        method: "DELETE",
      });

      if (res.ok) {
        setFeedback({
          type: "success",
          title: "Registration withdrawn",
          message: "Your school registration was withdrawn from this event.",
        });
        setWithdrawTarget(null);
        fetchEvents();
      } else {
        const data = await res.json().catch(() => ({}));
        setFeedback({
          type: "error",
          title: "Withdraw failed",
          message: data.error || "Failed to withdraw",
        });
      }
    } catch (error) {
      console.error("Error withdrawing:", error);
      setFeedback({
        type: "error",
        title: "Withdraw failed",
        message: "An error occurred.",
      });
    } finally {
      setWithdrawTarget(null);
    }
  };

  const filteredEvents = events.filter((event) => {
    const matchesSearch = event.title
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const schoolApprovedEvent =
      isSchoolView &&
      event.eventScope === "PLATFORM" &&
      event.schoolInvitationStatus === "APPROVED";

    if (filterStatus === "all") return matchesSearch;
    if (filterStatus === "completed") return matchesSearch;
    if (filterStatus === "participated")
      return matchesSearch && (event.participationStatus || schoolApprovedEvent);
    if (filterStatus === "pending")
      return matchesSearch && event.participationStatus === "PENDING";
    if (filterStatus === "approved")
      return (
        matchesSearch &&
        (event.participationStatus === "APPROVED" || schoolApprovedEvent)
      );
    if (filterStatus === "rejected")
      return matchesSearch && event.participationStatus === "REJECTED";

    return matchesSearch;
  });

  const getStatusBadge = (status) => {
    if (!status) return null;
    const styles = {
      PENDING: "bg-[#fff7e6] text-[#7a4d00] border-[#f4d28a]",
      APPROVED: "bg-[#e8f8ef] text-[#17643a] border-[#9ed8b5]",
      REJECTED: "bg-rose-50 text-rose-800 border-rose-200",
      COMPLETED: "bg-[#eaf2ff] text-[#0a2f66] border-[#bfd7f7]",
    };
    const icons = {
      PENDING: <FaClock2 className="inline mr-2" />,
      APPROVED: <FaCheckCircle className="inline mr-2" />,
      REJECTED: <FaTimesCircle className="inline mr-2" />,
      COMPLETED: <FaCheckCircle className="inline mr-2" />,
    };
    return (
      <span
        className={`inline-flex min-h-8 items-center rounded-full border px-3 text-xs font-black ${styles[status]}`}
      >
        {icons[status]}
        {status}
      </span>
    );
  };

  const getCapacityColor = (current, max) => {
    if (!max) return "text-[#27344a]";
    const percentage = (current / max) * 100;
    if (percentage >= 90) return "text-rose-700";
    if (percentage >= 70) return "text-amber-700";
    return "text-emerald-700";
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-[#dbe5f4] bg-white p-4">
        <div className="max-w-6xl mx-auto">
          <LoadingState
            title="Loading events"
            message="Preparing event invitations, registrations, and progress."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#d8e0f0] bg-white p-4 shadow-[0_10px_28px_rgba(10,47,102,0.06)]">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-5">
          <div className="mb-2 flex items-center gap-3">
            <FaCalendarAlt className="text-xl text-[#4326e8]" />
            <h1 className="text-2xl font-black text-[#001233] md:text-[26px]">{title}</h1>
          </div>
          <p className="text-sm font-medium text-[#344f77]">{description}</p>
        </div>

        {feedback && (
          <div className="mb-6">
            <AlertBanner
              type={feedback.type}
              title={feedback.title}
              message={feedback.message}
            />
          </div>
        )}

        {/* Search & Filter */}
        <div className="mb-5 space-y-3">
          {/* Search Bar */}
          <div className="flex min-h-11 items-center gap-3 rounded-lg border border-[#d8e0f0] bg-[#f8fbff] px-3 transition focus-within:border-[#4326e8] focus-within:bg-white focus-within:ring-4 focus-within:ring-[#4326e8]/10">
            <FaSearch className="text-[#52657d]" />
            <input
              type="text"
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent text-sm font-semibold text-[#17120a] outline-none placeholder:text-[#75869b]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="text-[#52657d] hover:text-[#0a2f66]"
              >
                <FaTimes />
              </button>
            )}
          </div>

          {showFilters && (
            <div className="flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:pb-0">
              {filters.map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => setFilterStatus(filter.id)}
                  className={`min-h-10 shrink-0 rounded-lg px-4 text-sm font-bold transition-all ${
                    filterStatus === filter.id
                      ? "bg-[#4326e8] text-white shadow-[0_10px_20px_rgba(67,38,232,0.18)]"
                      : "border border-[#d8e0f0] bg-white text-[#3116be] hover:border-[#4326e8] hover:bg-[#f4f1ff]"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Events List */}
        <div className="space-y-3">
          {filteredEvents.length === 0 ? (
            <EmptyState
              icon={FaCalendarAlt}
              title={
                filterStatus === "participated"
                  ? "No registered events yet"
                  : eventScope === "PLATFORM"
                  ? "No platform competitions available"
                  : eventScope === "SCHOOL"
                  ? "No school events available"
                  : "No events found"
              }
              description={
                searchQuery
                  ? "Clear the search or adjust filters to see more events."
                  : filterStatus === "participated"
                  ? "Events you join or get registered for will appear here."
                  : "Check again after your school or the platform publishes an event."
              }
            />
          ) : (
            filteredEvents.map((event) => (
              (() => {
                const stage = getEventStage(event);
                const isTeamEvent = isTeamEventLike(event);
                const showSchoolMetric = event.eventScope === "PLATFORM";
                const isCompletedEvent = Boolean(event.finalOutcomeReady);
                const registrationLocked = isRegistrationClosed(event);
                const needsSchoolApproval =
                  isSchoolView &&
                  event.eventScope === "PLATFORM" &&
                  event.schoolInvitationStatus !== "APPROVED" &&
                  !event.participationStatus;
                const useManagementPage =
                  isSchoolView && event.eventScope === "PLATFORM";
                const managementTab = completedView
                  ? "results"
                  : event.participationStatus
                  ? "overview"
                  : "registrations";
                const managementHref = `/school/events/${event._id}/manage?tab=${managementTab}`;
                return (
              <div
                key={event._id}
                className="event-hub-card overflow-hidden rounded-xl border border-[#d8e0f0] bg-white shadow-sm transition-all hover:border-[#b9c9eb] hover:shadow-[0_14px_30px_rgba(10,47,102,0.08)]"
              >
                {/* Event Card - Clickable Header */}
                <div
                  onClick={() => {
                    if (useManagementPage) {
                      return;
                    }
                    setExpandedEventId(
                      expandedEventId === event._id ? null : event._id
                    );
                  }}
                  className="w-full cursor-pointer p-4 text-left transition-colors hover:bg-[#fbfcff]"
                  role="button"
                  tabIndex={0}
                >
                  <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
                    {/* Left: Event Info */}
                    <div className="min-w-0">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <h3 className="mr-1 min-w-0 text-xl font-bold leading-tight text-[#001233] md:text-[22px]">
                          {event.title}
                        </h3>
                        <span
                          className={`inline-flex min-h-7 items-center rounded-full border px-2.5 text-[11px] font-bold ${
                            event.eventScope === "PLATFORM"
                              ? "border-[#d6ceff] bg-[#f4f1ff] text-[#4326e8]"
                              : "border-[#bfd7f7] bg-[#f8fbff] text-[#0a2f66]"
                          }`}
                        >
                          {event.eventScope === "PLATFORM"
                            ? "Platform Competition"
                            : "Internal Event"}
                        </span>
                        {event.participationStatus &&
                          getStatusBadge(
                            isCompletedEvent && completedView
                              ? "COMPLETED"
                              : event.participationStatus
                          )}
                        {needsSchoolApproval && (
                          <span className="inline-flex min-h-7 items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 text-[11px] font-bold text-amber-800">
                            School approval needed
                          </span>
                        )}
                        {event.participationStatus && (
                          <span className="inline-flex min-h-7 items-center rounded-full border border-[#d8e0f0] bg-[#f8fbff] px-2.5 text-[11px] font-bold text-[#27344a]">
                            {getRegisteredSummary(event)}
                          </span>
                        )}
                      </div>

                      <p className="mb-3 line-clamp-1 max-w-3xl text-sm leading-6 text-[#1e293b]">
                        {event.description}
                      </p>

                      {event.latestEventNotice && (
                        <div className="mb-3">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenNoticeEventId((current) =>
                                current === event._id ? null : event._id
                              );
                            }}
                            className="inline-flex items-center gap-2 rounded-full border border-[#bdefff] bg-[#e8fbff] px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-[#07576b] transition hover:bg-[#d8f6ff]"
                          >
                            <FaBell />
                            {event.eventNoticeCount > 1
                              ? `${event.eventNoticeCount} Notices`
                              : "1 Notice"}
                          </button>
                          {openNoticeEventId === event._id && (
                            <div className="mt-3 rounded-xl border border-[#bdefff] bg-[#e8fbff] px-4 py-3">
                              <p className="text-sm font-semibold text-[#17120a]">
                                {event.latestEventNotice.title}
                              </p>
                              <p className="mt-1 line-clamp-3 text-sm text-[#344f77]">
                                {event.latestEventNotice.message}
                              </p>
                              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-[#52657d]">
                                {event.eventNoticeCount > 1 && (
                                  <span>
                                    {event.eventNoticeCount - 1} older notice
                                    {event.eventNoticeCount - 1 === 1 ? "" : "s"} available
                                  </span>
                                )}
                                <Link
                                  href={`/events/${event._id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="font-semibold text-[#0a2f66] underline underline-offset-2 hover:text-[#123f7d]"
                                >
                                  View all notices
                                </Link>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Clean Single-line Meta Info */}
                      <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs font-semibold text-[#334155]">
                        <span className="inline-flex items-center gap-1.5">
                          <FaCalendarAlt className="text-[#4326e8]" />
                          {new Date(event.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <FaMapMarkerAlt className="text-[#4326e8]" />
                          {String(event.eventMode || event.mode || "Online").replaceAll("_", " ")}
                        </span>
                        {event.participationStatus && (
                          <span className="inline-flex items-center gap-1.5">
                            <FaUsers className="text-[#4326e8]" />
                            {getRegisteredSummary(event)}
                          </span>
                        )}
                        <span className="event-stage-chip rounded-full bg-[#f1f5f9] px-2 py-0.5 text-[10px] font-bold text-[#475569]">
                          Stage: {stage.label}
                        </span>
                      </div>
                    </div>

                    {/* Right: Expand Button & Status */}
                    <div className="flex flex-col gap-3 xl:items-end">
                      {!useManagementPage && (
                        <button
                          type="button"
                          onClick={(eventClick) => {
                            eventClick.stopPropagation();
                            setExpandedEventId(
                              expandedEventId === event._id ? null : event._id
                            );
                          }}
                          className="event-expand-toggle inline-flex h-9 w-9 items-center justify-center self-end rounded-full text-[#4326e8] transition hover:bg-[#f4f1ff]"
                          aria-label={
                            expandedEventId === event._id
                              ? "Collapse event"
                              : "Expand event"
                          }
                        >
                          {expandedEventId === event._id ? (
                            <FaChevronUp />
                          ) : (
                            <FaChevronDown />
                          )}
                        </button>
                      )}

                      {event.participationStatus ? (
                        <div className="event-action-group flex w-full flex-wrap justify-end gap-2">
                          {event.visibility === "PUBLIC" && completedView && event.resultsPublished && (
                            <Link
                              href={`/events/${event._id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="rounded-lg border border-[#e2e8f0] bg-white px-3 py-2 text-sm font-bold text-[#4326e8] transition-colors hover:bg-[#f8fafc]"
                              title="View public overall result"
                            >
                              Open Result
                            </Link>
                          )}
                           {event.visibility === "PUBLIC" && !completedView && !useManagementPage && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDetailEvent(event);
                              }}
                              className="event-details-action inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#e2e8f0] bg-white px-3 text-sm font-bold text-[#3116be] transition hover:border-[#4326e8] hover:bg-[#f4f1ff]"
                              title="View event details"
                            >
                              <FaEye />
                              View Details
                            </button>
                          )}
                          {isSchoolView && !completedView && (
                            <>
                              <button
                                disabled={registrationLocked}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setWithdrawTarget(event);
                                }}
                                className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-rose-300 bg-rose-50 px-3 text-sm font-bold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-[#52657d]"
                                title={
                                  registrationLocked
                                    ? "Registration closed"
                                    : "Withdraw Participation"
                                }
                              >
                                <FaTrash />
                                Withdraw
                              </button>
                              <Link
                                href={useManagementPage ? managementHref : "#"}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!useManagementPage) {
                                    e.preventDefault();
                                    setExpandedEventId(
                                      expandedEventId === event._id
                                        ? null
                                        : event._id
                                    );
                                  }
                                }}
                                className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#4326e8] px-3 text-sm font-bold text-white shadow-md transition hover:bg-[#3217d3]"
                                title={
                                  registrationLocked
                                    ? `Track rounds and ${isTeamEvent ? "group" : "participant"} outcome`
                                    : `Manage ${isTeamEvent ? "group" : "participant"} registration`
                                }
                              >
                                <FaEdit />
                                {useManagementPage
                                  ? "Continue Management"
                                  : registrationLocked
                                  ? "Track Rounds"
                                  : isTeamEvent
                                  ? "Manage Groups"
                                  : "Manage Participants"}
                              </Link>
                            </>
                          )}
                          {completedView && (
                            <Link
                              href={useManagementPage ? managementHref : "#"}
                              onClick={(e) => {
                                  e.stopPropagation();
                                  if (!useManagementPage) {
                                    e.preventDefault();
                                    setExpandedEventId(
                                      expandedEventId === event._id ? null : event._id
                                    );
                                  }
                                }}
                                className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#4326e8] px-3 text-sm font-bold text-white shadow-md transition hover:bg-[#3217d3]"
                                title="View school result and certificates"
                              >
                                <FaEdit />
                                {useManagementPage
                                  ? "Continue Management"
                                  : "View Results & Certificates"}
                              </Link>
                            )}
                            {isStudentView && event.visibility === "PUBLIC" && event.finalOutcomeReady && (
                              <Link
                                href={`/events/${event._id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex min-h-10 items-center rounded-lg bg-[#4326e8] px-3 text-sm font-bold text-white shadow-md transition hover:bg-[#3217d3]"
                                title="View published result"
                              >
                                View Result
                              </Link>
                            )}
                        </div>
                      ) : (
                        <div className="event-action-group flex w-full flex-wrap justify-end gap-2">
                          {event.visibility === "PUBLIC" && !useManagementPage && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDetailEvent(event);
                              }}
                              className="event-details-action inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#e2e8f0] bg-white px-3 text-sm font-bold text-[#4326e8] transition hover:border-[#cfc4ff] hover:bg-[#f8f6ff]"
                            >
                              <FaEye />
                              View Details
                            </button>
                          )}
                          {registrationLocked || needsSchoolApproval ? (
                            <button
                              type="button"
                              disabled
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex min-h-10 cursor-not-allowed items-center rounded-lg bg-slate-100 px-3 text-sm font-bold text-[#52657d] transition whitespace-nowrap"
                            >
                              {needsSchoolApproval
                                ? "Approve First"
                                : "Registration Locked"}
                            </button>
                          ) : (
                            <Link
                              href={useManagementPage ? managementHref : "#"}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!useManagementPage) {
                                  e.preventDefault();
                                  setExpandedEventId(event._id);
                                }
                              }}
                              className={`inline-flex min-h-10 items-center rounded-lg px-3 text-sm font-bold transition whitespace-nowrap ${
                                registrationLocked || needsSchoolApproval
                                  ? "cursor-not-allowed bg-slate-100 text-[#52657d]"
                                  : "cursor-pointer bg-[#4326e8] text-white shadow-md hover:bg-[#3217d3]"
                              }`}
                            >
                              {isStudentView
                                ? "View Event"
                                : isTeamEvent
                                ? "Register Groups"
                                : "Register Participants"}
                            </Link>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Section - Participation Form */}
                {expandedEventId === event._id && !needsSchoolApproval && !useManagementPage && (
                  <div className="event-expanded-panel space-y-4 border-t border-[#e2e8f0] bg-[#f8fafc] p-5">
                    {/* Stage Banner */}
                    <div className={`event-stage-banner max-w-3xl rounded-lg border px-3 py-2.5 text-sm ${getStageClasses(stage.tone)}`}>
                      <div className="font-bold text-[#1e293b]">{stage.label}</div>
                      <div className="text-xs text-[#334155] opacity-90">{stage.nextAction}</div>
                    </div>

                    {/* Event Details Grid */}
                    <div className={`grid grid-cols-1 gap-2 sm:grid-cols-2 ${showSchoolMetric ? "md:grid-cols-4" : "md:grid-cols-3"}`}>
                      {/* Date */}
                      <div className="event-metric-pill flex items-center gap-3 rounded-lg border border-[#eef2f8] bg-white px-3 py-2">
                        <FaCalendarAlt className="text-[#4326e8]" />
                        <div>
                          <p className="text-[10px] font-bold uppercase text-[#475569]">Date</p>
                          <p className="text-sm font-bold text-[#1e293b]">{new Date(event.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                        </div>
                      </div>
                      {/* Deadline */}
                      <div className="event-metric-pill flex items-center gap-3 rounded-lg border border-[#eef2f8] bg-white px-3 py-2">
                        <FaClock className="text-[#4326e8]" />
                        <div>
                          <p className="text-[10px] font-bold uppercase text-[#475569]">Deadline</p>
                          <p className={`text-sm font-bold ${event.deadline && isDatePast(event.deadline, { endOfDay: true }) ? "text-rose-700" : "text-emerald-700"}`}>
                            {event.deadline ? new Date(event.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "No deadline"}
                          </p>
                        </div>
                      </div>
                      {/* Capacity */}
                      <div className="event-metric-pill flex items-center gap-3 rounded-lg border border-[#eef2f8] bg-white px-3 py-2">
                        <FaUsers className="text-[#4326e8]" />
                        <div>
                          <p className="text-[10px] font-bold uppercase text-[#475569]">{isTeamEvent ? "Team Capacity" : "Capacity"}</p>
                          <p className={`text-sm font-bold ${getCapacityColor(event.enrolled || 0, event.capacity)}`}>
                            {event.capacity ? `${event.enrolled || 0}/${event.capacity}` : `${event.enrolled || 0}/Unlimited`}
                          </p>
                        </div>
                      </div>
                      {/* Schools */}
                      {showSchoolMetric && (
                        <div className="event-metric-pill flex items-center gap-3 rounded-lg border border-[#eef2f8] bg-white px-3 py-2">
                          <FaMapMarkerAlt className="text-[#4326e8]" />
                          <div>
                            <p className="text-[10px] font-bold uppercase text-[#475569]">Schools</p>
                            <p className="text-sm font-bold text-[#1e293b]">{event.schoolCount || 0} schools</p>
                          </div>
                        </div>
                      )}
                    </div>
                    {!completedView && !registrationLocked && (
                      <div className="rounded-xl border border-[#d8e0f0] bg-white p-4">
                        <h4 className="mb-3 text-lg font-black text-[#001233]">
                          {isStudentView
                            ? event.participationStatus
                              ? "Registration Status"
                              : "School Registration"
                            : event.participationStatus
                            ? isTeamEvent
                              ? "Group Registration"
                              : "Participant Registration"
                            : isTeamEvent
                            ? "Register Groups"
                            : "Register Participants"}
                        </h4>
                        {isStudentView ? (
                          <div className="space-y-3 rounded-xl border border-[#d7cdbb] bg-[#f8fbff] p-4 text-sm text-[#27344a]">
                            <p className="font-semibold text-[#17120a]">
                              Registration is managed by your school.
                            </p>
                            <p>
                              Teachers or school admins collect student names and submit the final registration for this event.
                            </p>
                            <p>
                              You can still follow event notices, selected status, rounds, results, and certificates from your dashboard.
                            </p>
                          </div>
                        ) : (
                          <EventParticipationForm
                            event={event}
                            isEditing={!isStudentView && !!event.participationStatus}
                            onSuccess={() => {
                              fetchEvents();
                              setExpandedEventId(null);
                            }}
                          />
                        )}
                      </div>
                    )}

                    {event.participationStatus && !completedView && isSchoolView && (
                      <>
                        {registrationLocked && (
                          <div className="rounded-xl border border-[#bfd7f7] bg-[#eaf2ff] p-4">
                            <h4 className="text-lg font-semibold text-[#17120a]">
                              {event.finalOutcomeReady
                                ? "Competition Outcome Ready"
                                : isTeamEvent
                                ? "Group Registration Locked"
                                : "Participant Registration Locked"}
                            </h4>
                            <p className="mt-2 text-sm text-[#344f77]">
                              {event.finalOutcomeReady
                                ? "This event has moved into final-outcome mode. Use this area to review your school's result summary, public visibility, and certificates."
                                : "Registration is closed for this competition. Your team is now in tracking mode, so this area focuses on rounds, results, and certificates instead of editing the roster."}
                            </p>
                            <div className="mt-3 inline-flex rounded-full border border-[#d7cdbb] bg-white px-3 py-1 text-xs font-semibold text-[#0a2f66]">
                              Registered{" "}
                              {isTeamEventLike(event)
                                ? "teams"
                                : "team"}: {getRegisteredStudentCount(event)}{" "}
                              {isTeamEventLike(event)
                                ? getRegisteredStudentCount(event) === 1
                                  ? "entry"
                                  : "entries"
                                : getRegisteredStudentCount(event) === 1
                                ? "student"
                                : "students"}
                            </div>
                          </div>
                        )}
                        <div>
                          <h4 className="mb-3 text-lg font-semibold text-[#17120a]">
                            {event.finalOutcomeReady
                              ? "School Results & Certificates"
                              : registrationLocked
                              ? "Rounds & Competition Progress"
                              : "Competition Rounds"}
                          </h4>
                          {!event.finalOutcomeReady && <SchoolRoundPanel eventId={event._id} />}
                        </div>
                        <EventCertificatesPanel eventId={event._id} />
                      </>
                    )}

                    {event.participationStatus && completedView && isSchoolView && (
                      <EventCertificatesPanel eventId={event._id} />
                    )}

                    {isStudentView && event.participationStatus && (
                      <div className="event-student-status-panel rounded-xl border border-[#d7cdbb] bg-white p-4">
                        <h4 className="mb-3 text-lg font-semibold text-[#17120a]">
                          Your Event Status
                        </h4>
                        <div className={`event-stage-banner rounded-xl border px-4 py-3 text-sm ${getStageClasses(stage.tone)}`}>
                          <div className="font-semibold">{stage.label}</div>
                          <div className="mt-1 text-xs opacity-90">{stage.nextAction}</div>
                        </div>
                        <div className="mt-4 grid gap-3 md:grid-cols-3">
                          <div className="event-status-tag rounded-lg border border-[#d7cdbb] bg-[#f8fbff] px-4 py-3">
                            <div className="text-xs uppercase tracking-wide text-[#52657d]">
                              Registration
                            </div>
                            <div className="mt-1 text-sm font-semibold text-[#17120a]">
                              {event.participationStatus}
                            </div>
                          </div>
                          <div className="event-status-tag rounded-lg border border-[#d7cdbb] bg-[#f8fbff] px-4 py-3">
                            <div className="text-xs uppercase tracking-wide text-[#52657d]">
                              Event Mode
                            </div>
                            <div className="mt-1 text-sm font-semibold text-[#17120a]">
                              {event.schoolViewMode === "results"
                                ? "Final Outcome"
                                : event.schoolViewMode === "tracking"
                                ? "In Progress"
                                : "Registered"}
                            </div>
                          </div>
                          <div className="event-status-tag rounded-lg border border-[#d7cdbb] bg-[#f8fbff] px-4 py-3">
                            <div className="text-xs uppercase tracking-wide text-[#52657d]">
                              Public Result
                            </div>
                            <div className="mt-1 text-sm font-semibold text-[#17120a]">
                              {event.isPublicResultAvailable ? "Available" : "Not public yet"}
                            </div>
                          </div>
                        </div>
                        {event.visibility === "PUBLIC" && (
                          <div className="mt-4">
                            <button
                              type="button"
                              onClick={() => setDetailEvent(event)}
                              className="event-status-detail-button inline-flex items-center gap-2 rounded-lg border border-[#d7cdbb] bg-white px-3 py-2 text-sm font-semibold text-[#0a2f66] hover:bg-[#eaf2ff]"
                            >
                              View Details
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
                );
              })()
            ))
          )}
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(withdrawTarget)}
        title="Withdraw from this event?"
        message="This will remove the registered students or teams for your school while registration is still open."
        confirmLabel="Withdraw registration"
        tone="danger"
        onClose={() => setWithdrawTarget(null)}
        onConfirm={() => {
          if (withdrawTarget?._id) handleWithdraw(withdrawTarget._id);
        }}
      />
      <EventDetailsModal
        event={detailEvent}
        onClose={() => setDetailEvent(null)}
      />
    </div>
  );
}
