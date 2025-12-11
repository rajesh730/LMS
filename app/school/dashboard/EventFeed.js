"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  FaUsers,
  FaUser,
  FaUserGraduate,
  FaClock,
  FaCheckCircle,
  FaTimesCircle,
  FaCalendarAlt,
  FaEye,
  FaEdit,
  FaTrash,
} from "react-icons/fa";
import EventDetailModal from "./EventDetailModal";
import StudentSelector from "@/components/dashboard/StudentSelector";

export default function EventFeed() {
  const { data: session } = useSession();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all"); // 'all' or 'participated'
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);

  // Form State
  const [participationForm, setParticipationForm] = useState({
    contactPerson: "",
    contactPhone: "",
    expectedStudents: "",
    notes: "",
    students: [],
  });
  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchEvents = async () => {
    try {
      const res = await fetch("/api/events", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events);
      }
    } catch (error) {
      console.error("Failed to fetch events", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  // Filter events based on active tab
  const filteredEvents = events.filter((event) => {
    if (activeTab === "participated") {
      return event.isParticipating;
    }
    return true;
  });

  const participatedCount = events.filter((e) => e.isParticipating).length;

  const handleViewDetails = (event) => {
    setSelectedEvent(event);
    setShowDetailModal(true);
  };

  const handleTakePart = (event) => {
    setSelectedEvent(event);
    setIsEditing(false);
    setParticipationForm({
      contactPerson: session?.user?.name || "",
      contactPhone: "",
      expectedStudents: "",
      notes: "",
      students: [],
    });
    setShowDetailModal(false);
    setShowJoinModal(true);
  };

  const handleEditParticipation = (event) => {
    setSelectedEvent(event);
    setIsEditing(true);
    const myPart = event.myParticipation || {};
    setParticipationForm({
      contactPerson: myPart.contactPerson || "",
      contactPhone: myPart.contactPhone || "",
      expectedStudents: myPart.expectedStudents || "",
      notes: myPart.notes || "",
      students:
        myPart.students?.map((s) =>
          s && typeof s === "object" && s._id ? s._id : s
        ) || [],
    });
    setShowDetailModal(false);
    setShowJoinModal(true);
  };

  const submitParticipation = async (e) => {
    e.preventDefault();
    if (!selectedEvent) return;

    setSubmitting(true);
    try {
      const method = isEditing ? "PUT" : "POST";
      const res = await fetch(`/api/events/${selectedEvent._id}/participate`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactPerson: participationForm.contactPerson,
          contactPhone: participationForm.contactPhone,
          expectedStudents:
            participationForm.students.length > 0
              ? participationForm.students.length
              : participationForm.expectedStudents
              ? parseInt(participationForm.expectedStudents)
              : 0,
          notes: participationForm.notes,
          students: participationForm.students,
        }),
      });

      if (res.ok) {
        setShowJoinModal(false);
        fetchEvents();
        // alert(isEditing ? 'Participation updated!' : 'Successfully joined event!');
      } else {
        const data = await res.json();
        alert(data.message || "Failed to submit");
      }
    } catch (error) {
      console.error("Failed to join event", error);
      alert("Failed to submit participation");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLeaveEvent = async (eventId) => {
    if (!confirm("Are you sure you want to leave this event?")) return;

    try {
      const res = await fetch(`/api/events/${eventId}/participate`, {
        method: "DELETE",
      });

      if (res.ok) {
        setShowDetailModal(false);
        fetchEvents();
      } else {
        const data = await res.json();
        alert(data.message || "Failed to leave event");
      }
    } catch (error) {
      console.error("Failed to leave event", error);
    }
  };

  const isDeadlinePassed = (deadline) => {
    if (!deadline) return false;
    return new Date() > new Date(deadline);
  };

  const isFull = (event) => {
    if (!event.maxParticipants) return false;
    return (event.participantCount || 0) >= event.maxParticipants;
  };

  if (loading) {
    return <div className="text-slate-400">Loading events...</div>;
  }

  return (
    <>
      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setActiveTab("all")}
          className={`px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 ${
            activeTab === "all"
              ? "bg-emerald-600 text-white"
              : "bg-slate-700 text-slate-300 hover:bg-slate-600"
          }`}
        >
          <FaCalendarAlt /> All Events
        </button>
        <button
          onClick={() => setActiveTab("participated")}
          className={`px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 ${
            activeTab === "participated"
              ? "bg-emerald-600 text-white"
              : "bg-slate-700 text-slate-300 hover:bg-slate-600"
          }`}
        >
          <FaCheckCircle /> My Participated
          {participatedCount > 0 && (
            <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
              {participatedCount}
            </span>
          )}
        </button>
      </div>

      {/* Events List */}
      {filteredEvents.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-slate-400">
            {activeTab === "participated"
              ? "You haven't participated in any events yet."
              : "No upcoming events."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredEvents.map((event) => {
            let cardStyle = "bg-slate-800/50 border-slate-700";
            if (event.isParticipating) {
              if (event.participationStatus === "APPROVED")
                cardStyle = "bg-emerald-900/20 border-emerald-700/50";
              else if (event.participationStatus === "PENDING")
                cardStyle = "bg-yellow-900/20 border-yellow-700/50";
              else if (event.participationStatus === "REJECTED")
                cardStyle = "bg-red-900/20 border-red-700/50";
            }

            return (
              <div
                key={event._id}
                className={`p-4 rounded-xl border transition hover:border-slate-500 ${cardStyle}`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <h4 className="text-lg font-semibold text-white">
                        {event.title}
                      </h4>
                      {event.isParticipating && (
                        <>
                          {event.participationStatus === "APPROVED" && (
                            <span className="text-xs bg-emerald-600 text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                              <FaCheckCircle /> Approved
                            </span>
                          )}
                          {event.participationStatus === "PENDING" && (
                            <span className="text-xs bg-yellow-600 text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                              <FaClock /> Pending
                            </span>
                          )}
                          {event.participationStatus === "REJECTED" && (
                            <span className="text-xs bg-red-600 text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                              <FaTimesCircle /> Rejected
                            </span>
                          )}
                        </>
                      )}
                      {isFull(event) && !event.isParticipating && (
                        <span className="text-xs bg-red-600 text-white px-2 py-0.5 rounded-full">
                          Full
                        </span>
                      )}
                      {isDeadlinePassed(event.registrationDeadline) &&
                        !event.isParticipating && (
                          <span className="text-xs bg-slate-600 text-slate-300 px-2 py-0.5 rounded-full">
                            Closed
                          </span>
                        )}
                    </div>

                    <div className="flex flex-wrap gap-4 text-sm text-slate-400">
                      <span className="flex items-center gap-1">
                        <FaCalendarAlt className="text-emerald-400" />
                        {new Date(event.date).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <FaUsers className="text-blue-400" />
                        {event.participantCount || 0}{" "}
                        {event.maxParticipants
                          ? `/ ${event.maxParticipants}`
                          : ""}{" "}
                        schools
                      </span>
                      {event.registrationDeadline && (
                        <span
                          className={`flex items-center gap-1 ${
                            isDeadlinePassed(event.registrationDeadline)
                              ? "text-red-400"
                              : "text-yellow-400"
                          }`}
                        >
                          <FaClock />
                          Deadline:{" "}
                          {new Date(
                            event.registrationDeadline
                          ).toLocaleDateString()}
                        </span>
                      )}
                      {event.maxParticipantsPerSchool && (
                        <span className="flex items-center gap-1 text-slate-400">
                          <FaUser className="text-slate-500" />
                          Max {event.maxParticipantsPerSchool}/School
                        </span>
                      )}
                      {event.eligibleGrades &&
                        event.eligibleGrades.length > 0 && (
                          <span className="flex items-center gap-1 text-slate-400">
                            <FaUserGraduate className="text-slate-500" />
                            {event.eligibleGrades.length > 3
                              ? `${event.eligibleGrades.length} Grades`
                              : event.eligibleGrades.join(", ")}
                          </span>
                        )}
                    </div>

                    <p className="text-slate-400 text-sm mt-2 line-clamp-2">
                      {event.description}
                    </p>
                  </div>

                  <div className="flex flex-col gap-2 ml-4">
                    <button
                      onClick={() => handleViewDetails(event)}
                      className="text-xs bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded flex items-center gap-1 transition"
                    >
                      <FaEye /> Details
                    </button>
                    {session?.user?.role === "SCHOOL_ADMIN" &&
                      (event.isParticipating ? (
                        <>
                          <button
                            onClick={() => handleEditParticipation(event)}
                            className="text-xs bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white px-3 py-1.5 rounded flex items-center gap-1 transition"
                          >
                            <FaEdit /> Manage Team
                          </button>
                          <button
                            onClick={() => handleLeaveEvent(event._id)}
                            className="text-xs bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white px-3 py-1.5 rounded flex items-center gap-1 transition"
                          >
                            <FaTrash /> Leave
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleTakePart(event)}
                          disabled={
                            isDeadlinePassed(event.registrationDeadline) ||
                            isFull(event)
                          }
                          className={`text-xs px-3 py-1.5 rounded flex items-center gap-1 transition ${
                            isDeadlinePassed(event.registrationDeadline) ||
                            isFull(event)
                              ? "bg-slate-700 text-slate-500 cursor-not-allowed"
                              : "bg-emerald-600 hover:bg-emerald-500 text-white"
                          }`}
                        >
                          Take Part
                        </button>
                      ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Event Detail Modal */}
      {showDetailModal && selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          isParticipating={selectedEvent.isParticipating}
          currentParticipation={selectedEvent.myParticipation}
          onClose={() => setShowDetailModal(false)}
          onJoin={() => handleTakePart(selectedEvent)}
          onLeave={() => handleLeaveEvent(selectedEvent._id)}
        />
      )}

      {/* Join/Edit Event Modal */}
      {showJoinModal && selectedEvent && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl w-full max-w-4xl border border-slate-700 flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-700">
              <h3 className="text-xl font-bold text-white">
                {isEditing ? "Manage Participation" : "Join Event"}:{" "}
                {selectedEvent.title}
              </h3>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar">
              <form
                id="participation-form"
                onSubmit={submitParticipation}
                className="space-y-6"
              >
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="text-emerald-400 font-medium text-sm border-b border-slate-700 pb-2">
                      Contact Details
                    </h4>
                    <div>
                      <label className="block text-slate-300 mb-1 text-sm">
                        Contact Person *
                      </label>
                      <input
                        type="text"
                        value={participationForm.contactPerson}
                        onChange={(e) =>
                          setParticipationForm({
                            ...participationForm,
                            contactPerson: e.target.value,
                          })
                        }
                        className="w-full bg-slate-900 text-white rounded p-2 border border-slate-700 focus:border-emerald-500 outline-none"
                        placeholder="Name"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 mb-1 text-sm">
                        Contact Phone *
                      </label>
                      <input
                        type="tel"
                        value={participationForm.contactPhone}
                        onChange={(e) =>
                          setParticipationForm({
                            ...participationForm,
                            contactPhone: e.target.value,
                          })
                        }
                        className="w-full bg-slate-900 text-white rounded p-2 border border-slate-700 focus:border-emerald-500 outline-none"
                        placeholder="Phone"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 mb-1 text-sm">
                        Notes
                      </label>
                      <textarea
                        value={participationForm.notes}
                        onChange={(e) =>
                          setParticipationForm({
                            ...participationForm,
                            notes: e.target.value,
                          })
                        }
                        className="w-full bg-slate-900 text-white rounded p-2 border border-slate-700 focus:border-emerald-500 outline-none h-24"
                        placeholder="Any questions or notes..."
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center border-b border-slate-700 pb-2">
                      <h4 className="text-emerald-400 font-medium text-sm">
                        Select Team
                      </h4>
                      <div className="text-xs text-slate-400">
                        {participationForm.students.length} students selected
                      </div>
                    </div>

                    <StudentSelector
                      selectedIds={participationForm.students}
                      onChange={(ids) =>
                        setParticipationForm({
                          ...participationForm,
                          students: ids,
                        })
                      }
                    />
                  </div>
                </div>
              </form>
            </div>

            <div className="p-6 border-t border-slate-700 flex justify-end gap-3 bg-slate-800 rounded-b-xl">
              <button
                type="button"
                onClick={() => setShowJoinModal(false)}
                className="px-4 py-2 text-slate-400 hover:text-white transition font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="participation-form"
                disabled={submitting}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded-lg font-bold transition disabled:opacity-50 flex items-center gap-2"
              >
                {submitting
                  ? isEditing
                    ? "Updating..."
                    : "Joining..."
                  : isEditing
                  ? "Update Team"
                  : "Confirm Participation"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
