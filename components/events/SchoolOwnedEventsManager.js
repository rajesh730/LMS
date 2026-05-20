"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  FaArchive,
  FaBell,
  FaCalendarAlt,
  FaCheckCircle,
  FaChevronDown,
  FaChevronUp,
  FaEdit,
  FaHistory,
  FaCog,
  FaUsers,
} from "react-icons/fa";
import { useSession } from "next-auth/react";
import EventEditorForm from "./EventEditorForm";
import EventParticipationForm from "./EventParticipationForm";
import EmptyState from "@/components/EmptyState";
import LoadingState from "@/components/ui/LoadingState";
import { getEventStage, getStageClasses, isDatePast } from "@/lib/eventUiStatus";
import { isTeamEventLike } from "@/lib/eventParticipationFormat";

function formatType(value) {
  return String(value || "EVENT").replaceAll("_", " ");
}

export default function SchoolOwnedEventsManager({
  teachers = [],
  refreshKey = 0,
  onChanged,
}) {
  const { data: session } = useSession();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("ACTIVE");
  const [expandedId, setExpandedId] = useState(null);
  const [editingEvent, setEditingEvent] = useState(null);
  const [statusMessage, setStatusMessage] = useState("");

  const loadEvents = useCallback(async () => {
    try {
      setLoading(true);
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
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id, session?.user?.schoolId]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents, refreshKey]);

  const filteredEvents = useMemo(() => {
    return events.filter(
      (event) => (event.lifecycleStatus || "ACTIVE") === activeFilter
    );
  }, [events, activeFilter]);

  const handleStatusChange = async (eventId, lifecycleStatus) => {
    try {
      const res = await fetch(`/api/events/${eventId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lifecycleStatus }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.message || "Failed to update event status");
        return;
      }

      setStatusMessage(`Event moved to ${lifecycleStatus.toLowerCase()}.`);
      await loadEvents();
      onChanged?.();
    } catch (error) {
      console.error("Failed to update school event status", error);
      alert("Failed to update event status");
    }
  };

  const handleArchive = async (eventId) => {
    if (
      !confirm(
        "Archive this event? It will move to history and disappear from active student discovery."
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/events/${eventId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.message || "Failed to archive event");
        return;
      }

      setStatusMessage("Event archived.");
      await loadEvents();
      onChanged?.();
    } catch (error) {
      console.error("Failed to archive event", error);
      alert("Failed to archive event");
    }
  };

  return (
    <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-white">My School Events</h2>
          <p className="text-sm text-slate-400 mt-1">
            Manage school-created events, student registration, rounds, results, and certificates.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {["ACTIVE", "COMPLETED", "ARCHIVED"].map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setActiveFilter(status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                activeFilter === status
                  ? "bg-blue-600 text-white"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              {status === "ACTIVE"
                ? "Active"
                : status === "COMPLETED"
                ? "Completed"
                : "Archived"}
            </button>
          ))}
        </div>
      </div>

      {statusMessage && <p className="text-sm text-emerald-300">{statusMessage}</p>}

      {loading ? (
        <LoadingState
          title="Loading school events"
          message="Preparing your school-created events and registration status."
        />
      ) : filteredEvents.length === 0 ? (
        <EmptyState
          icon={FaCalendarAlt}
          title={`No ${activeFilter.toLowerCase()} school events yet`}
          description={
            activeFilter === "ACTIVE"
              ? "Create a school event to start registration, rounds, results, and certificates."
              : activeFilter === "COMPLETED"
              ? "Completed events will appear here after you close them."
              : "Archived events will appear here and can be restored if needed."
          }
        />
      ) : (
        <div className="space-y-4">
          {filteredEvents.map((event) => {
            const isExpanded = expandedId === event._id;
            const isTeamEvent = isTeamEventLike(event);
            const stage = getEventStage(event);
            const eventState = String(event.lifecycleStatus || "ACTIVE").toUpperCase();
            const registrationDeadline = event.registrationDeadline || event.deadline;
            const registrationClosed = Boolean(
              registrationDeadline &&
                isDatePast(registrationDeadline, { endOfDay: true })
            );
            const canQuickRegister =
              eventState === "ACTIVE" && !registrationClosed;

            return (
              <div
                key={event._id}
                className="rounded-2xl border border-slate-800 bg-slate-950/60 overflow-hidden"
              >
                <div className="p-5">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-lg font-semibold text-white">{event.title}</h3>
                        <span className="px-2.5 py-1 rounded-full text-xs bg-slate-800 text-slate-300 border border-slate-700">
                          {formatType(event.eventType)}
                        </span>
                        <span className="px-2.5 py-1 rounded-full text-xs bg-slate-800 text-slate-300 border border-slate-700">
                          {isTeamEvent ? "Group event" : "Individual event"}
                        </span>
                        <span className="px-2.5 py-1 rounded-full text-xs bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                          Visible to school students
                        </span>
                      </div>

                      <p className="text-sm text-slate-400 max-w-3xl">{event.description}</p>

                      <div
                        className={`max-w-3xl rounded-xl border px-3 py-2 text-sm ${getStageClasses(
                          stage.tone
                        )}`}
                      >
                        <div className="font-semibold">{stage.label}</div>
                        <div className="text-xs opacity-90">
                          {stage.nextAction}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-4 text-sm text-slate-300">
                        <span className="inline-flex items-center gap-2">
                          <FaCalendarAlt className="text-blue-400" />
                          {new Date(event.date).toLocaleDateString()}
                        </span>
                        <span className="inline-flex items-center gap-2">
                          <FaUsers className="text-emerald-400" />
                          {isTeamEvent
                            ? `${event.teamCount || 0} team registrations`
                            : `${event.studentCount || 0} student registrations`}
                        </span>
                        {registrationDeadline && (
                          <span>
                            Registration closes{" "}
                            {new Date(registrationDeadline).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 lg:justify-end">
                      {event.visibility === "PUBLIC" && (
                        <Link
                          href={`/events/${event._id}`}
                          className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 text-sm transition"
                        >
                          View Public Page
                        </Link>
                      )}
                      <Link
                        href={`/school/events/${event._id}/manage`}
                        className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm transition inline-flex items-center gap-2"
                      >
                        <FaCog />
                        Manage Event
                      </Link>
                      <Link
                        href={`/school/events/${event._id}/manage?tab=notices`}
                        className="px-3 py-2 rounded-lg bg-[#0a2f66] hover:bg-[#1150a1] text-white text-sm transition inline-flex items-center gap-2"
                      >
                        <FaBell />
                        Notices
                      </Link>
                      <button
                        type="button"
                        onClick={() => setEditingEvent(event)}
                        className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm transition inline-flex items-center gap-2"
                      >
                        <FaEdit />
                        Edit
                      </button>
                      {(event.lifecycleStatus || "ACTIVE") === "ACTIVE" && (
                        <button
                          type="button"
                          onClick={() =>
                            handleStatusChange(event._id, "COMPLETED")
                          }
                          className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm transition inline-flex items-center gap-2"
                        >
                          <FaCheckCircle />
                          Close Event
                        </button>
                      )}
                      {(event.lifecycleStatus || "ACTIVE") !== "ARCHIVED" ? (
                        <button
                          type="button"
                          onClick={() => handleArchive(event._id)}
                          className="px-3 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-sm transition inline-flex items-center gap-2"
                        >
                          <FaArchive />
                          Archive
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleStatusChange(event._id, "ACTIVE")}
                          className="px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm transition inline-flex items-center gap-2"
                        >
                          <FaHistory />
                          Restore
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={!canQuickRegister}
                        onClick={() => setExpandedId(isExpanded ? null : event._id)}
                        className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 text-sm transition inline-flex items-center gap-2 disabled:cursor-not-allowed disabled:bg-slate-800/50 disabled:text-slate-500"
                        title={
                          canQuickRegister
                            ? isTeamEvent
                              ? "Quickly add or update registered teams"
                              : "Quickly add or update registered students"
                            : "Registration is locked for this event"
                        }
                      >
                        {isExpanded ? <FaChevronUp /> : <FaChevronDown />}
                        {canQuickRegister
                          ? isTeamEvent
                            ? "Quick Team Registration"
                            : "Quick Student Registration"
                          : "Registration Locked"}
                      </button>
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-slate-800 p-5 bg-slate-900/60">
                    <EventParticipationForm
                      event={event}
                      isEditing
                      onSuccess={async () => {
                        await loadEvents();
                        onChanged?.();
                      }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {editingEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-900 rounded-2xl shadow-2xl border border-slate-700">
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
    </div>
  );
}
