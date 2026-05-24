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
import AlertBanner from "@/components/ui/AlertBanner";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
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
  const [feedback, setFeedback] = useState(null);
  const [archiveTarget, setArchiveTarget] = useState(null);

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
      setFeedback({
        type: "error",
        title: "School events could not be loaded",
        message: "Please retry or check the server connection.",
      });
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

  return (
    <div className="space-y-6 rounded-2xl border border-[#d7cdbb] bg-white p-6 shadow-[0_14px_36px_rgba(10,47,102,0.06)]">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-[#17120a]">My School Events</h2>
          <p className="mt-1 text-sm text-[#344f77]">
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
                  ? "bg-[#0a2f66] text-white"
                  : "border border-[#d7cdbb] bg-white text-[#0a2f66] hover:bg-[#eaf2ff]"
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

      {feedback ? (
        <AlertBanner
          type={feedback.type}
          title={feedback.title}
          message={feedback.message}
        />
      ) : (
        statusMessage && <p className="text-sm font-semibold text-[#17643a]">{statusMessage}</p>
      )}

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
                className="overflow-hidden rounded-2xl border border-[#d7cdbb] bg-white shadow-[0_10px_26px_rgba(10,47,102,0.06)]"
              >
                <div className="p-5">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-lg font-semibold text-[#17120a]">{event.title}</h3>
                        <span className="rounded-full border border-[#d7cdbb] bg-white px-2.5 py-1 text-xs font-semibold text-[#0a2f66]">
                          {formatType(event.eventType)}
                        </span>
                        <span className="rounded-full border border-[#d7cdbb] bg-white px-2.5 py-1 text-xs font-semibold text-[#0a2f66]">
                          {isTeamEvent ? "Group event" : "Individual event"}
                        </span>
                        <span className="rounded-full border border-[#bfd7f7] bg-[#eaf2ff] px-2.5 py-1 text-xs font-semibold text-[#0a2f66]">
                          Visible to school students
                        </span>
                      </div>

                      <p className="max-w-3xl text-sm text-[#344f77]">{event.description}</p>

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

                      <div className="flex flex-wrap gap-4 text-sm text-[#27344a]">
                        <span className="inline-flex items-center gap-2">
                          <FaCalendarAlt className="text-[#0a2f66]" />
                          {new Date(event.date).toLocaleDateString()}
                        </span>
                        <span className="inline-flex items-center gap-2">
                          <FaUsers className="text-[#0a2f66]" />
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
                          className="rounded-lg border border-[#d7cdbb] bg-white px-3 py-2 text-sm font-semibold text-[#0a2f66] transition hover:bg-[#eaf2ff]"
                        >
                          View Public Page
                        </Link>
                      )}
                      <Link
                        href={`/school/events/${event._id}/manage`}
                        className="inline-flex items-center gap-2 rounded-lg bg-[#0a2f66] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#123f7d]"
                      >
                        <FaCog />
                        Manage Event
                      </Link>
                      <Link
                        href={`/school/events/${event._id}/manage?tab=notices`}
                        className="inline-flex items-center gap-2 rounded-lg bg-[#0a2f66] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#123f7d]"
                      >
                        <FaBell />
                        Notices
                      </Link>
                      <button
                        type="button"
                        onClick={() => setEditingEvent(event)}
                        className="inline-flex items-center gap-2 rounded-lg bg-[#0a2f66] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#123f7d]"
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
                          className="inline-flex items-center gap-2 rounded-lg bg-[#0a2f66] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#123f7d]"
                        >
                          <FaCheckCircle />
                          Close Event
                        </button>
                      )}
                      {(event.lifecycleStatus || "ACTIVE") !== "ARCHIVED" ? (
                        <button
                          type="button"
                          onClick={() => setArchiveTarget(event)}
                          className="inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-800 transition hover:bg-rose-100"
                        >
                          <FaArchive />
                          Archive
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleStatusChange(event._id, "ACTIVE")}
                          className="inline-flex items-center gap-2 rounded-lg border border-[#bfd7f7] bg-[#eaf2ff] px-3 py-2 text-sm font-semibold text-[#0a2f66] transition hover:bg-[#dbeaff]"
                        >
                          <FaHistory />
                          Restore
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={!canQuickRegister}
                        onClick={() => setExpandedId(isExpanded ? null : event._id)}
                        className="inline-flex items-center gap-2 rounded-lg border border-[#d7cdbb] bg-white px-3 py-2 text-sm font-semibold text-[#0a2f66] transition hover:bg-[#eaf2ff] disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-[#52657d]"
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
                  <div className="border-t border-[#d7cdbb] bg-[#f8fbff] p-5">
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
