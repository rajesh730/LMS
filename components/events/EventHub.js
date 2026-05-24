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
} from "react-icons/fa";
import EventParticipationForm from "./EventParticipationForm";
import { useSession } from "next-auth/react";
import SchoolRoundPanel from "@/app/school/dashboard/SchoolRoundPanel";
import EventCertificatesPanel from "./EventCertificatesPanel";
import EmptyState from "@/components/EmptyState";
import LoadingState from "@/components/ui/LoadingState";
import AlertBanner from "@/components/ui/AlertBanner";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { getEventStage, getStageClasses, isDatePast } from "@/lib/eventUiStatus";
import { isTeamEventLike } from "@/lib/eventParticipationFormat";

export default function EventHub({
  refreshKey = 0,
  eventScope = null,
  title = "Upcoming Events",
  description = "Explore and participate in upcoming school events",
  defaultFilter = "all",
  lifecycleFilter = null,
  completedView = false,
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

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      // Use different endpoint based on user role
      const endpoint =
        session?.user?.role === "STUDENT"
          ? "/api/events/hub/available"
          : "/api/events";

      const res = await fetch(endpoint);
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
      setLoading(false);
    }
  }, [completedView, eventScope, lifecycleFilter, session?.user?.role]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents, refreshKey]);

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

    if (filterStatus === "all") return matchesSearch;
    if (filterStatus === "completed") return matchesSearch;
    if (filterStatus === "participated")
      return matchesSearch && event.participationStatus;
    if (filterStatus === "pending")
      return matchesSearch && event.participationStatus === "PENDING";
    if (filterStatus === "approved")
      return matchesSearch && event.participationStatus === "APPROVED";
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
        className={`px-3 py-1 rounded-full text-sm border ${styles[status]}`}
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
      <div className="rounded-2xl border border-[#d7cdbb] bg-white p-6">
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
    <div className="rounded-2xl border border-[#d7cdbb] bg-white p-6 shadow-[0_14px_36px_rgba(10,47,102,0.06)]">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <FaCalendarAlt className="text-3xl text-[#0a2f66]" />
            <h1 className="text-4xl font-bold text-[#17120a]">{title}</h1>
          </div>
          <p className="text-[#344f77]">{description}</p>
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
        <div className="mb-8 space-y-4">
          {/* Search Bar */}
          <div className="flex items-center gap-3 rounded-lg border border-[#d7cdbb] bg-[#f8fbff] px-4 py-3">
            <FaSearch className="text-[#52657d]" />
            <input
              type="text"
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent text-[#17120a] outline-none placeholder:text-[#75869b]"
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

          {/* Filter Tabs */}
          <div className="flex flex-wrap gap-3">
            {filters.map((filter) => (
              <button
                key={filter.id}
                onClick={() => setFilterStatus(filter.id)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  filterStatus === filter.id
                    ? "bg-[#0a2f66] text-white"
                    : "border border-[#d7cdbb] bg-white text-[#0a2f66] hover:bg-[#eaf2ff]"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {/* Events List */}
        <div className="space-y-4">
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
                const isCompletedEvent = Boolean(event.finalOutcomeReady);
                const registrationLocked = isRegistrationClosed(event);
                const needsSchoolApproval =
                  isSchoolView &&
                  event.eventScope === "PLATFORM" &&
                  event.schoolInvitationStatus !== "APPROVED" &&
                  !event.participationStatus;
                return (
              <div
                key={event._id}
                className="overflow-hidden rounded-xl border border-[#d7cdbb] bg-white transition-all hover:border-[#bfd7f7] hover:shadow-[0_10px_26px_rgba(10,47,102,0.06)]"
              >
                {/* Event Card - Clickable Header */}
                <div
                  onClick={() =>
                    setExpandedEventId(
                      expandedEventId === event._id ? null : event._id
                    )
                  }
                  className="w-full cursor-pointer p-6 text-left transition-colors hover:bg-[#f8fbff]"
                  role="button"
                  tabIndex={0}
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Left: Event Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-2xl font-bold text-[#17120a]">
                          {event.title}
                        </h3>
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-bold ${
                            event.eventScope === "PLATFORM"
                              ? "border-[#bfd7f7] bg-[#eaf2ff] text-[#0a2f66]"
                              : "border-[#bfd7f7] bg-white text-[#0a2f66]"
                          }`}
                        >
                          {event.eventScope === "PLATFORM"
                            ? "Platform Competition"
                            : "School Event"}
                        </span>
                        {event.participationStatus &&
                          getStatusBadge(
                            isCompletedEvent && completedView
                              ? "COMPLETED"
                              : event.participationStatus
                          )}
                        {needsSchoolApproval && (
                          <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-200">
                            School approval needed
                          </span>
                        )}
                        {event.participationStatus && (
                          <span className="rounded-full border border-[#d7cdbb] px-3 py-1 text-sm text-[#27344a]">
                            {getRegisteredStudentCount(event)}{" "}
                            {isTeamEventLike(event)
                              ? "teams registered"
                              : "students registered"}
                          </span>
                        )}
                      </div>

                      <p className="mb-4 line-clamp-2 text-[#344f77]">
                        {event.description}
                      </p>

                      {event.latestEventNotice && (
                        <div className="mb-4">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenNoticeEventId((current) =>
                                current === event._id ? null : event._id
                              );
                            }}
                            className="inline-flex items-center gap-2 rounded-full border border-[#bdefff] bg-[#e8fbff] px-3 py-2 text-xs font-bold uppercase tracking-wide text-[#07576b] transition hover:bg-[#d8f6ff]"
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

                      <div
                        className={`mb-4 rounded-xl border px-3 py-2 text-sm ${getStageClasses(
                          stage.tone
                        )}`}
                      >
                        <div className="font-semibold">{stage.label}</div>
                        <div className="text-xs opacity-90">
                          {stage.nextAction}
                        </div>
                      </div>

                      {/* Event Details Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {/* Date */}
                        <div className="flex items-center gap-2">
                          <FaCalendarAlt className="text-[#52657d]" />
                          <div>
                            <p className="text-xs uppercase text-[#52657d]">
                              Date
                            </p>
                            <p className="font-medium text-[#17120a]">
                              {new Date(event.date).toLocaleDateString(
                                "en-US",
                                {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                }
                              )}
                            </p>
                          </div>
                        </div>

                        {/* Deadline */}
                        <div className="flex items-center gap-2">
                          <FaClock className="text-[#52657d]" />
                          <div>
                            <p className="text-xs uppercase text-[#52657d]">
                              Deadline
                            </p>
                            <p
                              className={`font-medium ${
                                event.deadline &&
                                isDatePast(event.deadline, { endOfDay: true })
                                  ? "text-rose-700"
                                  : "text-emerald-700"
                              }`}
                            >
                              {event.deadline
                                ? new Date(event.deadline).toLocaleDateString(
                                    "en-US",
                                    {
                                      month: "short",
                                      day: "numeric",
                                    }
                                  )
                                : "No deadline"}
                            </p>
                          </div>
                        </div>

                        {/* Capacity */}
                        <div className="flex items-center gap-2">
                          <FaUsers className="text-[#52657d]" />
                          <div>
                            <p className="text-xs uppercase text-[#52657d]">
                              Capacity
                            </p>
                            <p
                              className={`font-medium ${getCapacityColor(
                                event.enrolled || 0,
                                event.capacity
                              )}`}
                            >
                              {event.capacity
                                ? `${event.enrolled || 0}/${event.capacity}`
                                : `${event.enrolled || 0}/Unlimited`}
                            </p>
                          </div>
                        </div>

                        {/* Schools */}
                        <div className="flex items-center gap-2">
                          <FaMapMarkerAlt className="text-[#52657d]" />
                          <div>
                            <p className="text-xs uppercase text-[#52657d]">
                              Schools
                            </p>
                            <p className="font-medium text-[#17120a]">
                              {event.schoolCount || 0} schools
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right: Expand Button & Status */}
                    <div className="flex flex-col items-end gap-3">
                      <div className="text-3xl text-[#52657d] transition-colors hover:text-[#0a2f66]">
                        {expandedEventId === event._id ? (
                          <FaChevronUp />
                        ) : (
                          <FaChevronDown />
                        )}
                      </div>

                      {event.participationStatus ? (
                        <div className="flex gap-2">
                          {event.visibility === "PUBLIC" && completedView && event.resultsPublished && (
                            <Link
                              href={`/events/${event._id}`}
                              onClick={(e) => e.stopPropagation()}
                              className="rounded-lg border border-[#d7cdbb] bg-white px-3 py-2 font-semibold text-[#0a2f66] transition-colors hover:bg-[#eaf2ff]"
                              title="View public overall result"
                            >
                              Open Public Result
                            </Link>
                          )}
                          {event.visibility === "PUBLIC" && !completedView && (
                            <Link
                              href={`/events/${event._id}`}
                              onClick={(e) => e.stopPropagation()}
                              className="rounded-lg border border-[#d7cdbb] bg-white px-3 py-2 font-semibold text-[#0a2f66] transition-colors hover:bg-[#eaf2ff]"
                              title="View public event page"
                            >
                              Open Public Event
                            </Link>
                          )}
                          {isSchoolView && !completedView && (
                            <>
                              <button
                                disabled={registrationLocked}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setWithdrawTarget(event);
                                }}
                                className="inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 font-semibold text-rose-800 transition-colors hover:bg-rose-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-[#52657d]"
                                title={
                                  registrationLocked
                                    ? "Registration closed"
                                    : "Withdraw Participation"
                                }
                              >
                                <FaTrash />
                                Withdraw
                              </button>
                              <button
                                disabled={false}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedEventId(
                                    expandedEventId === event._id
                                      ? null
                                      : event._id
                                  );
                                }}
                                className="inline-flex items-center gap-2 rounded-lg bg-[#0a2f66] px-3 py-2 font-semibold text-white transition-colors hover:bg-[#123f7d]"
                                title={
                                  registrationLocked
                                    ? `Track rounds and ${isTeamEvent ? "group" : "participant"} outcome`
                                    : `Manage ${isTeamEvent ? "group" : "participant"} registration`
                                }
                              >
                                <FaEdit />
                                {registrationLocked
                                  ? "Track Rounds"
                                  : isTeamEvent
                                  ? "Manage Groups"
                                  : "Manage Participants"}
                              </button>
                            </>
                          )}
                          {completedView && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedEventId(
                                  expandedEventId === event._id ? null : event._id
                                );
                              }}
                              className="inline-flex items-center gap-2 rounded-lg bg-[#0a2f66] px-3 py-2 font-semibold text-white transition-colors hover:bg-[#123f7d]"
                              title="View school result and certificates"
                            >
                              <FaEdit />
                              View Results & Certificates
                            </button>
                          )}
                          {isStudentView && event.visibility === "PUBLIC" && event.finalOutcomeReady && (
                            <Link
                              href={`/events/${event._id}`}
                              onClick={(e) => e.stopPropagation()}
                              className="rounded-lg bg-[#0a2f66] px-3 py-2 font-semibold text-white transition-colors hover:bg-[#123f7d]"
                              title="View published result"
                            >
                              View Result
                            </Link>
                          )}
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          {event.visibility === "PUBLIC" && (
                            <Link
                              href={`/events/${event._id}`}
                              onClick={(e) => e.stopPropagation()}
                              className="rounded-lg border border-[#d7cdbb] bg-white px-3 py-2 font-semibold text-[#0a2f66] transition-colors hover:bg-[#eaf2ff]"
                            >
                              Open Public Event
                            </Link>
                          )}
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              if (registrationLocked || needsSchoolApproval) return;
                              setExpandedEventId(event._id);
                            }}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                              registrationLocked || needsSchoolApproval
                                ? "cursor-not-allowed bg-slate-100 text-[#52657d]"
                                : "cursor-pointer bg-[#0a2f66] text-white hover:bg-[#123f7d]"
                            }`}
                          >
                            {needsSchoolApproval
                              ? "Approve First"
                              : registrationLocked
                              ? "Registration Locked"
                              : isStudentView
                              ? "View Event"
                              : isTeamEvent
                              ? "Register Groups"
                              : "Register Participants"}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Section - Participation Form */}
                {expandedEventId === event._id && !needsSchoolApproval && (
                  <div className="space-y-6 border-t border-[#d7cdbb] bg-[#f8fbff] p-6">
                    {!completedView && !registrationLocked && (
                      <div className="rounded-xl border border-[#d7cdbb] bg-white p-4">
                        <h4 className="mb-3 text-lg font-semibold text-[#17120a]">
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
                      <div className="rounded-xl border border-[#d7cdbb] bg-white p-4">
                        <h4 className="mb-3 text-lg font-semibold text-[#17120a]">
                          Your Event Status
                        </h4>
                        <div className={`rounded-xl border px-4 py-3 text-sm ${getStageClasses(stage.tone)}`}>
                          <div className="font-semibold">{stage.label}</div>
                          <div className="mt-1 text-xs opacity-90">{stage.nextAction}</div>
                        </div>
                        <div className="mt-4 grid gap-3 md:grid-cols-3">
                          <div className="rounded-lg border border-[#d7cdbb] bg-[#f8fbff] px-4 py-3">
                            <div className="text-xs uppercase tracking-wide text-[#52657d]">
                              Registration
                            </div>
                            <div className="mt-1 text-sm font-semibold text-[#17120a]">
                              {event.participationStatus}
                            </div>
                          </div>
                          <div className="rounded-lg border border-[#d7cdbb] bg-[#f8fbff] px-4 py-3">
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
                          <div className="rounded-lg border border-[#d7cdbb] bg-[#f8fbff] px-4 py-3">
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
                            <Link
                              href={`/events/${event._id}`}
                              className="inline-flex items-center gap-2 rounded-lg border border-[#d7cdbb] bg-white px-3 py-2 text-sm font-semibold text-[#0a2f66] hover:bg-[#eaf2ff]"
                            >
                              Open Public Event
                            </Link>
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
    </div>
  );
}
