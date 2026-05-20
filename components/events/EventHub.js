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
      alert("Registration is closed, so this team can no longer be withdrawn.");
      return;
    }

    if (
      !confirm(
        "Are you sure you want to withdraw from this event? This will remove all students."
      )
    )
      return;

    try {
      const res = await fetch(`/api/events/${eventId}/participate`, {
        method: "DELETE",
      });

      if (res.ok) {
        alert("Successfully withdrawn from event");
        fetchEvents();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to withdraw");
      }
    } catch (error) {
      console.error("Error withdrawing:", error);
      alert("An error occurred");
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
      PENDING: "bg-yellow-900/40 text-yellow-200 border-yellow-700",
      APPROVED: "bg-green-900/40 text-green-200 border-green-700",
      REJECTED: "bg-red-900/40 text-red-200 border-red-700",
      COMPLETED: "bg-blue-900/40 text-blue-200 border-blue-700",
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
    if (!max) return "text-slate-300";
    const percentage = (current / max) * 100;
    if (percentage >= 90) return "text-red-400";
    if (percentage >= 70) return "text-yellow-400";
    return "text-green-400";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-6">
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <FaCalendarAlt className="text-3xl text-emerald-400" />
            <h1 className="text-4xl font-bold text-white">{title}</h1>
          </div>
          <p className="text-slate-400">{description}</p>
        </div>

        {/* Search & Filter */}
        <div className="mb-8 space-y-4">
          {/* Search Bar */}
          <div className="flex items-center gap-3 bg-slate-800/50 rounded-lg px-4 py-3 border border-slate-700">
            <FaSearch className="text-slate-500" />
            <input
              type="text"
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent outline-none text-white placeholder-slate-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="text-slate-500 hover:text-slate-300"
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
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
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
                className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden transition-all hover:border-slate-600"
              >
                {/* Event Card - Clickable Header */}
                <div
                  onClick={() =>
                    setExpandedEventId(
                      expandedEventId === event._id ? null : event._id
                    )
                  }
                  className="w-full text-left p-6 hover:bg-slate-800/80 transition-colors cursor-pointer"
                  role="button"
                  tabIndex={0}
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Left: Event Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-2xl font-bold text-white">
                          {event.title}
                        </h3>
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-bold ${
                            event.eventScope === "PLATFORM"
                              ? "border-purple-500/30 bg-purple-500/10 text-purple-200"
                              : "border-blue-500/30 bg-blue-500/10 text-blue-200"
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
                          <span className="rounded-full border border-slate-600 px-3 py-1 text-sm text-slate-300">
                            {getRegisteredStudentCount(event)}{" "}
                            {isTeamEventLike(event)
                              ? "teams registered"
                              : "students registered"}
                          </span>
                        )}
                      </div>

                      <p className="text-slate-400 mb-4 line-clamp-2">
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
                            className="inline-flex items-center gap-2 rounded-full border border-sky-500/25 bg-sky-500/10 px-3 py-2 text-xs font-bold uppercase tracking-wide text-sky-200 transition hover:bg-sky-500/20"
                          >
                            <FaBell />
                            {event.eventNoticeCount > 1
                              ? `${event.eventNoticeCount} Notices`
                              : "1 Notice"}
                          </button>
                          {openNoticeEventId === event._id && (
                            <div className="mt-3 rounded-xl border border-sky-500/25 bg-sky-500/10 px-4 py-3">
                              <p className="text-sm font-semibold text-white">
                                {event.latestEventNotice.title}
                              </p>
                              <p className="mt-1 line-clamp-3 text-sm text-sky-100/85">
                                {event.latestEventNotice.message}
                              </p>
                              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-sky-100/80">
                                {event.eventNoticeCount > 1 && (
                                  <span>
                                    {event.eventNoticeCount - 1} older notice
                                    {event.eventNoticeCount - 1 === 1 ? "" : "s"} available
                                  </span>
                                )}
                                <Link
                                  href={`/events/${event._id}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="font-semibold text-white underline underline-offset-2 hover:text-sky-100"
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
                          <FaCalendarAlt className="text-slate-500" />
                          <div>
                            <p className="text-slate-500 text-xs uppercase">
                              Date
                            </p>
                            <p className="text-white font-medium">
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
                          <FaClock className="text-slate-500" />
                          <div>
                            <p className="text-slate-500 text-xs uppercase">
                              Deadline
                            </p>
                            <p
                              className={`font-medium ${
                                event.deadline &&
                                isDatePast(event.deadline, { endOfDay: true })
                                  ? "text-red-400"
                                  : "text-emerald-400"
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
                          <FaUsers className="text-slate-500" />
                          <div>
                            <p className="text-slate-500 text-xs uppercase">
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
                          <FaMapMarkerAlt className="text-slate-500" />
                          <div>
                            <p className="text-slate-500 text-xs uppercase">
                              Schools
                            </p>
                            <p className="text-white font-medium">
                              {event.schoolCount || 0} schools
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right: Expand Button & Status */}
                    <div className="flex flex-col items-end gap-3">
                      <div className="text-3xl text-slate-600 hover:text-slate-400 transition-colors">
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
                              className="bg-slate-700 hover:bg-slate-600 text-slate-100 px-3 py-2 rounded-lg transition-colors"
                              title="View public overall result"
                            >
                              Open Public Result
                            </Link>
                          )}
                          {event.visibility === "PUBLIC" && !completedView && (
                            <Link
                              href={`/events/${event._id}`}
                              onClick={(e) => e.stopPropagation()}
                              className="bg-slate-700 hover:bg-slate-600 text-slate-100 px-3 py-2 rounded-lg transition-colors"
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
                                  handleWithdraw(event._id);
                                }}
                                className="inline-flex items-center gap-2 bg-red-600/20 hover:bg-red-600/40 text-red-400 px-3 py-2 rounded-lg transition-colors disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-500"
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
                                className="inline-flex items-center gap-2 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 px-3 py-2 rounded-lg transition-colors"
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
                              className="inline-flex items-center gap-2 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 px-3 py-2 rounded-lg transition-colors"
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
                              className="bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 px-3 py-2 rounded-lg transition-colors"
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
                              className="bg-slate-700 hover:bg-slate-600 text-slate-100 px-3 py-2 rounded-lg transition-colors"
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
                                ? "bg-slate-700 text-slate-500 cursor-not-allowed"
                                : "bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
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
                  <div className="space-y-6 border-t border-slate-700 bg-slate-900/50 p-6">
                    {!completedView && !registrationLocked && (
                      <div className="rounded-xl border border-slate-700 bg-slate-950/40 p-4">
                        <h4 className="mb-3 text-lg font-semibold text-white">
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
                          <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/80 p-4 text-sm text-slate-300">
                            <p className="font-semibold text-white">
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
                          <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-4">
                            <h4 className="text-lg font-semibold text-white">
                              {event.finalOutcomeReady
                                ? "Competition Outcome Ready"
                                : isTeamEvent
                                ? "Group Registration Locked"
                                : "Participant Registration Locked"}
                            </h4>
                            <p className="mt-2 text-sm text-blue-100/85">
                              {event.finalOutcomeReady
                                ? "This event has moved into final-outcome mode. Use this area to review your school's result summary, public visibility, and certificates."
                                : "Registration is closed for this competition. Your team is now in tracking mode, so this area focuses on rounds, results, and certificates instead of editing the roster."}
                            </p>
                            <div className="mt-3 inline-flex rounded-full border border-slate-700 bg-slate-950/70 px-3 py-1 text-xs font-semibold text-slate-200">
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
                          <h4 className="mb-3 text-lg font-semibold text-white">
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
                      <div className="rounded-xl border border-slate-700 bg-slate-950/40 p-4">
                        <h4 className="mb-3 text-lg font-semibold text-white">
                          Your Event Status
                        </h4>
                        <div className={`rounded-xl border px-4 py-3 text-sm ${getStageClasses(stage.tone)}`}>
                          <div className="font-semibold">{stage.label}</div>
                          <div className="mt-1 text-xs opacity-90">{stage.nextAction}</div>
                        </div>
                        <div className="mt-4 grid gap-3 md:grid-cols-3">
                          <div className="rounded-lg border border-slate-700 bg-slate-900/80 px-4 py-3">
                            <div className="text-xs uppercase tracking-wide text-slate-500">
                              Registration
                            </div>
                            <div className="mt-1 text-sm font-semibold text-white">
                              {event.participationStatus}
                            </div>
                          </div>
                          <div className="rounded-lg border border-slate-700 bg-slate-900/80 px-4 py-3">
                            <div className="text-xs uppercase tracking-wide text-slate-500">
                              Event Mode
                            </div>
                            <div className="mt-1 text-sm font-semibold text-white">
                              {event.schoolViewMode === "results"
                                ? "Final Outcome"
                                : event.schoolViewMode === "tracking"
                                ? "In Progress"
                                : "Registered"}
                            </div>
                          </div>
                          <div className="rounded-lg border border-slate-700 bg-slate-900/80 px-4 py-3">
                            <div className="text-xs uppercase tracking-wide text-slate-500">
                              Public Result
                            </div>
                            <div className="mt-1 text-sm font-semibold text-white">
                              {event.isPublicResultAvailable ? "Available" : "Not public yet"}
                            </div>
                          </div>
                        </div>
                        {event.visibility === "PUBLIC" && (
                          <div className="mt-4">
                            <Link
                              href={`/events/${event._id}`}
                              className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-100 hover:bg-slate-700"
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
    </div>
  );
}
