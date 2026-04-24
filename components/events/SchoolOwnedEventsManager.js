"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  FaArchive,
  FaCalendarAlt,
  FaCheckCircle,
  FaChevronDown,
  FaChevronUp,
  FaEdit,
  FaGlobe,
  FaHistory,
  FaLock,
  FaUsers,
} from "react-icons/fa";
import { useSession } from "next-auth/react";
import EventEditorForm from "./EventEditorForm";
import EventParticipationForm from "./EventParticipationForm";

function formatVisibility(value) {
  return String(value || "PRIVATE").replaceAll("_", " ");
}

function formatType(value) {
  return String(value || "EVENT").replaceAll("_", " ");
}

export default function SchoolOwnedEventsManager({
  groups = [],
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
        return (
          event.eventScope === "SCHOOL" &&
          event.school &&
          String(event.school) === String(schoolId)
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
          <h2 className="text-xl font-semibold text-white">School Event Control</h2>
          <p className="text-sm text-slate-400 mt-1">
            Manage active events, close registration, review history, and keep public visibility under school control.
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
        <div className="text-slate-400">Loading school events...</div>
      ) : filteredEvents.length === 0 ? (
        <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-6 text-slate-400">
          No {activeFilter.toLowerCase()} school events yet.
        </div>
      ) : (
        <div className="space-y-4">
          {filteredEvents.map((event) => {
            const isExpanded = expandedId === event._id;
            const mentorNames = (event.assignedMentors || []).map(
              (mentor) => mentor.name
            );

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
                          {formatVisibility(event.visibility)}
                        </span>
                        {event.publicHighlightsEnabled ? (
                          <span className="px-2.5 py-1 rounded-full text-xs bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                            Public Highlights On
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-xs bg-slate-800 text-slate-400 border border-slate-700">
                            Public Highlights Off
                          </span>
                        )}
                      </div>

                      <p className="text-sm text-slate-400 max-w-3xl">{event.description}</p>

                      <div className="flex flex-wrap gap-4 text-sm text-slate-300">
                        <span className="inline-flex items-center gap-2">
                          <FaCalendarAlt className="text-blue-400" />
                          {new Date(event.date).toLocaleDateString()}
                        </span>
                        <span className="inline-flex items-center gap-2">
                          <FaUsers className="text-emerald-400" />
                          {event.studentCount || 0} student registrations
                        </span>
                        <span className="inline-flex items-center gap-2">
                          {event.visibility === "PUBLIC" ? (
                            <FaGlobe className="text-yellow-400" />
                          ) : (
                            <FaLock className="text-slate-400" />
                          )}
                          {mentorNames.length} mentors assigned
                        </span>
                      </div>

                      {mentorNames.length > 0 && (
                        <p className="text-xs text-slate-500">
                          Mentors: {mentorNames.join(", ")}
                        </p>
                      )}
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
                        onClick={() => setExpandedId(isExpanded ? null : event._id)}
                        className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 text-sm transition inline-flex items-center gap-2"
                      >
                        {isExpanded ? <FaChevronUp /> : <FaChevronDown />}
                        Manage Students
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
                groups={groups}
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
