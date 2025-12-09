"use client";

import { useState, useEffect } from "react";
import {
  FaCalendarAlt,
  FaClock,
  FaUsers,
  FaCheckCircle,
  FaArrowRight,
  FaHourglass,
  FaTimes,
} from "react-icons/fa";
import CapacityIndicator from "./CapacityIndicator";
import SchoolCapacityBreakdown from "./SchoolCapacityBreakdown";

export default function StudentEventManager() {
  const [events, setEvents] = useState([]);
  const [requestedEvents, setRequestedEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("available"); // 'available' or 'requested'
  const [requesting, setRequesting] = useState({});
  const [message, setMessage] = useState("");
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      // Try new endpoint first
      const res = await fetch("/api/student/eligible-events");

      if (res.ok) {
        const data = await res.json();
        const eventsList = Array.isArray(data.data) ? data.data : [];

        // Separate requested and available events
        const requested = eventsList.filter(
          (e) => e.studentRequest && e.studentRequest.status !== "REJECTED"
        );
        const available = eventsList.filter(
          (e) => !e.studentRequest || e.studentRequest.status === "REJECTED"
        );

        setEvents(available);
        setRequestedEvents(requested);
      } else if (
        res.status === 404 ||
        res.status === 400 ||
        res.status === 401
      ) {
        // Fallback to old endpoint if new one fails
        console.warn(
          "Eligible-events endpoint failed, falling back to /api/events"
        );
        const fallbackRes = await fetch("/api/events");
        if (fallbackRes.ok) {
          const data = await fallbackRes.json();
          const eventsList = Array.isArray(data) ? data : data.events || [];

          // Fetch participation status for each event
          const eventsWithStatus = await Promise.all(
            eventsList.map(async (event) => {
              try {
                const statusRes = await fetch(
                  `/api/events/${event._id}/participate`
                );
                if (statusRes.ok) {
                  const response = await statusRes.json();
                  return {
                    ...event,
                    studentRequest: response.data
                      ? {
                          status: response.data.status,
                          requestId: response.data._id,
                        }
                      : null,
                  };
                }
                return { ...event, studentRequest: null };
              } catch (error) {
                return { ...event, studentRequest: null };
              }
            })
          );

          const requested = eventsWithStatus.filter(
            (e) => e.studentRequest && e.studentRequest.status !== "REJECTED"
          );
          const available = eventsWithStatus.filter(
            (e) => !e.studentRequest || e.studentRequest.status === "REJECTED"
          );

          setEvents(available);
          setRequestedEvents(requested);
          setMessage(
            "ℹ️ Using standard event list (some features unavailable)"
          );
        } else {
          const error = await fallbackRes.json().catch(() => ({}));
          console.error("Fallback error fetching events:", error);
          setMessage("❌ Failed to load events");
        }
      } else {
        const error = await res.json().catch(() => ({}));
        console.error("Error fetching events:", error);
        setMessage("❌ Failed to load events");
      }
    } catch (error) {
      console.error("Error fetching events:", error);
      setMessage("❌ Network error loading events");
    } finally {
      setLoading(false);
    }
  };

  const handleRequestParticipation = async (eventId) => {
    setRequesting((prev) => ({ ...prev, [eventId]: true }));
    setMessage("");

    try {
      const res = await fetch(`/api/events/${eventId}/participate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage("✅ Request submitted! School admin will review it soon.");
        setShowModal(false);
        // Move event to requested
        const event = events.find((e) => e._id === eventId);
        setEvents(events.filter((e) => e._id !== eventId));
        setRequestedEvents([
          ...requestedEvents,
          {
            ...event,
            studentRequest: {
              status: "PENDING",
              requestId: data.data?._id,
              requestedAt: new Date(),
            },
          },
        ]);
        setTimeout(() => setMessage(""), 4000);
      } else {
        setMessage(`❌ ${data.message || "Failed to submit request"}`);
      }
    } catch (error) {
      console.error("Error submitting request:", error);
      setMessage("❌ Network error submitting request");
    } finally {
      setRequesting((prev) => ({ ...prev, [eventId]: false }));
    }
  };

  const handleWithdrawRequest = async (eventId) => {
    if (
      !window.confirm(
        "Are you sure you want to withdraw your participation request?"
      )
    )
      return;

    setRequesting((prev) => ({ ...prev, [eventId]: true }));
    setMessage("");

    try {
      const res = await fetch(`/api/events/${eventId}/participate`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();

      if (res.ok) {
        setMessage("✅ Request withdrawn");
        const event = requestedEvents.find((e) => e._id === eventId);
        setRequestedEvents(requestedEvents.filter((e) => e._id !== eventId));
        setEvents([...events, { ...event, studentRequest: null }]);
        setTimeout(() => setMessage(""), 3000);
      } else {
        setMessage(`❌ ${data.message || "Failed to withdraw request"}`);
      }
    } catch (error) {
      console.error("Error withdrawing request:", error);
      setMessage("❌ Failed to withdraw request");
    } finally {
      setRequesting((prev) => ({ ...prev, [eventId]: false }));
    }
  };

  const isEventPassed = (eventDate) => new Date(eventDate) < new Date();

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const EventCard = ({ event, status = null }) => (
    <div
      className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 hover:border-blue-500/50 transition cursor-pointer"
      onClick={() => {
        setSelectedEvent(event);
        setShowModal(true);
      }}
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-bold text-white mb-1">{event.title}</h3>
          <p className="text-slate-400 text-sm line-clamp-2">
            {event.description}
          </p>
        </div>
        {status && (
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 whitespace-nowrap ml-2 ${
              status === "PENDING"
                ? "bg-yellow-500/10 text-yellow-400"
                : status === "APPROVED"
                ? "bg-emerald-500/10 text-emerald-400"
                : status === "ENROLLED"
                ? "bg-green-500/10 text-green-400"
                : "bg-red-500/10 text-red-400"
            }`}
          >
            {status === "PENDING" && <FaHourglass />}
            {status === "APPROVED" && <FaCheckCircle />}
            {status && status.charAt(0).toUpperCase() + status.slice(1)}
          </span>
        )}
      </div>

      <div className="space-y-3 mb-6">
        <div className="space-y-2 text-slate-400 text-sm">
          <div className="flex items-center gap-2">
            <FaCalendarAlt className="text-blue-400" />
            {formatDate(event.date)}
          </div>
          <div className="flex items-center gap-2">
            <FaClock className="text-purple-400" />
            {formatTime(event.date)}
          </div>

          {event.eligibleGrades && event.eligibleGrades.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-slate-500">Grades:</span>
              <span className="text-blue-400">
                {event.eligibleGrades.join(", ")}
              </span>
            </div>
          )}
        </div>

        {/* Capacity Indicator */}
        {event.maxParticipants && (
          <div className="pt-3 border-t border-slate-700">
            <CapacityIndicator
              enrolled={event.totalEnrolled}
              maxCapacity={event.maxParticipants}
              showPercentage={true}
              size="sm"
              status={event.enrollmentStatus}
            />
          </div>
        )}
      </div>

      <div className="pt-4 border-t border-slate-800 flex gap-3">
        {status ? (
          <>
            {status === "PENDING" && !isEventPassed(event.date) && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleWithdrawRequest(event._id);
                }}
                disabled={requesting[event._id]}
                className="flex-1 bg-red-600/20 hover:bg-red-600/30 disabled:bg-slate-600 text-red-400 px-4 py-2 rounded font-medium transition"
              >
                {requesting[event._id] ? "Withdrawing..." : "Withdraw"}
              </button>
            )}
            {(status === "APPROVED" || status === "ENROLLED") &&
              !isEventPassed(event.date) && (
                <button
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 bg-emerald-600/20 text-emerald-400 px-4 py-2 rounded font-medium text-sm"
                >
                  {status === "ENROLLED" ? "✓ Enrolled" : "✓ Approved"}
                </button>
              )}
            {isEventPassed(event.date) && (
              <span className="flex-1 text-center text-slate-400 px-4 py-2 font-medium text-sm">
                Event Passed
              </span>
            )}
          </>
        ) : (
          <>
            {isEventPassed(event.date) ? (
              <span className="flex-1 text-center text-slate-400 px-4 py-2 font-medium text-sm">
                Event Passed
              </span>
            ) : event.deadlinePassed ? (
              <span className="flex-1 text-center text-red-400 px-4 py-2 font-medium text-sm">
                Registration Closed
              </span>
            ) : event.enrollmentStatus === "full" ? (
              <span className="flex-1 text-center text-red-400 px-4 py-2 font-medium text-sm">
                Event Full
              </span>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRequestParticipation(event._id);
                }}
                disabled={requesting[event._id]}
                className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 text-white px-4 py-2 rounded font-medium transition flex items-center justify-center gap-2 text-sm"
              >
                {requesting[event._id] ? (
                  "Submitting..."
                ) : (
                  <>
                    Request <FaArrowRight className="text-sm" />
                  </>
                )}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );

  // Event Details Modal
  const EventModal = ({ event, onClose }) => {
    if (!event) return null;
    const status = event.studentRequest?.status;

    return (
      <div
        className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
        onClick={onClose}
      >
        <div
          className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold">{event.title}</h2>
              <p className="text-blue-100 mt-1">{event.description}</p>
            </div>
            <button
              onClick={onClose}
              className="text-blue-100 hover:text-white"
            >
              <FaTimes size={24} />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-gray-600 text-sm font-medium">Date</p>
                <p className="text-gray-900 font-semibold">
                  {formatDate(event.date)}
                </p>
                <p className="text-gray-600 text-sm">
                  {formatTime(event.date)}
                </p>
              </div>
              <div>
                <p className="text-gray-600 text-sm font-medium">
                  Eligible Grades
                </p>
                <p className="text-gray-900 font-semibold">
                  {event.eligibleGrades && event.eligibleGrades.length > 0
                    ? event.eligibleGrades.join(", ")
                    : "All Grades"}
                </p>
              </div>
            </div>

            {/* Deadline */}
            {event.registrationDeadline && (
              <div
                className={`p-4 rounded-lg ${
                  event.deadlinePassed
                    ? "bg-red-50 border border-red-200"
                    : "bg-blue-50 border border-blue-200"
                }`}
              >
                <p
                  className={`text-sm font-medium ${
                    event.deadlinePassed ? "text-red-700" : "text-blue-700"
                  }`}
                >
                  {event.deadlinePassed
                    ? "❌ Registration Closed"
                    : "📅 Registration Deadline"}
                </p>
                <p
                  className={`text-sm ${
                    event.deadlinePassed ? "text-red-600" : "text-blue-600"
                  }`}
                >
                  {new Date(event.registrationDeadline).toLocaleDateString(
                    "en-US",
                    {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    }
                  )}
                </p>
              </div>
            )}

            {/* Global Capacity */}
            {event.maxParticipants && (
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900">Global Capacity</h3>
                <CapacityIndicator
                  enrolled={event.totalEnrolled}
                  maxCapacity={event.maxParticipants}
                  showPercentage={true}
                  size="md"
                  status={event.enrollmentStatus}
                />
              </div>
            )}

            {/* Per-School Breakdown */}
            {event.maxParticipantsPerSchool && event.schoolCapacity && (
              <div className="space-y-3">
                <SchoolCapacityBreakdown
                  schoolCapacity={event.schoolCapacity}
                  maxPerSchool={event.maxParticipantsPerSchool}
                />
              </div>
            )}

            {/* Student Status */}
            {status && (
              <div
                className={`p-4 rounded-lg border ${
                  status === "PENDING"
                    ? "bg-yellow-50 border-yellow-200"
                    : status === "APPROVED"
                    ? "bg-blue-50 border-blue-200"
                    : status === "ENROLLED"
                    ? "bg-green-50 border-green-200"
                    : "bg-red-50 border-red-200"
                }`}
              >
                <p
                  className={`font-medium text-sm ${
                    status === "PENDING"
                      ? "text-yellow-700"
                      : status === "APPROVED"
                      ? "text-blue-700"
                      : status === "ENROLLED"
                      ? "text-green-700"
                      : "text-red-700"
                  }`}
                >
                  {status === "PENDING" && "⏳ Your request is pending review"}
                  {status === "APPROVED" &&
                    "✅ Your request has been approved by the school admin"}
                  {status === "ENROLLED" &&
                    "🎉 You have been enrolled in this event"}
                  {status === "REJECTED" && "❌ Your request has been rejected"}
                </p>
                {event.studentRequest?.rejectionReason && (
                  <p className="text-sm text-red-600 mt-2">
                    Reason: {event.studentRequest.rejectionReason}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="sticky bottom-0 bg-gray-50 border-t p-6 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 font-medium border border-gray-300 rounded-lg hover:bg-gray-100 transition"
            >
              Close
            </button>
            {!status &&
              !isEventPassed(event.date) &&
              !event.deadlinePassed &&
              event.enrollmentStatus !== "full" && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRequestParticipation(event._id);
                    onClose();
                  }}
                  disabled={requesting[event._id]}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400"
                >
                  {requesting[event._id]
                    ? "Submitting..."
                    : "Request to Participate"}
                </button>
              )}
            {status === "PENDING" && !isEventPassed(event.date) && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleWithdrawRequest(event._id);
                  onClose();
                }}
                disabled={requesting[event._id]}
                className="flex-1 px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition disabled:bg-gray-400"
              >
                {requesting[event._id] ? "Withdrawing..." : "Withdraw Request"}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800">
        <h3 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
          <FaCalendarAlt className="text-blue-400" /> Events & Activities
        </h3>
        <p className="text-slate-400">
          Discover and request to participate in school events. School admin
          will review your requests.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-slate-800">
        <button
          onClick={() => setActiveTab("available")}
          className={`px-6 py-3 font-semibold border-b-2 transition ${
            activeTab === "available"
              ? "border-blue-500 text-blue-400"
              : "border-transparent text-slate-400 hover:text-slate-300"
          }`}
        >
          Available Events ({events.length})
        </button>
        <button
          onClick={() => setActiveTab("requested")}
          className={`px-6 py-3 font-semibold border-b-2 transition ${
            activeTab === "requested"
              ? "border-emerald-500 text-emerald-400"
              : "border-transparent text-slate-400 hover:text-slate-300"
          }`}
        >
          My Requests ({requestedEvents.length})
        </button>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`p-4 rounded-lg ${
            message.includes("✅")
              ? "bg-emerald-500/10 text-emerald-400"
              : "bg-red-500/10 text-red-400"
          }`}
        >
          {message}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">
          Loading events...
        </div>
      ) : (
        <>
          {activeTab === "available" && (
            <>
              {events.length === 0 ? (
                <div className="bg-slate-900/50 p-12 rounded-xl border border-slate-800 border-dashed text-center">
                  <FaCalendarAlt className="text-4xl text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400 text-lg">
                    No available events at the moment
                  </p>
                  <p className="text-slate-500 text-sm mt-2">
                    Check back later for new opportunities!
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {events.map((event) => (
                    <EventCard key={event._id} event={event} />
                  ))}
                </div>
              )}
            </>
          )}

          {activeTab === "requested" && (
            <>
              {requestedEvents.length === 0 ? (
                <div className="bg-slate-900/50 p-12 rounded-xl border border-slate-800 border-dashed text-center">
                  <FaCheckCircle className="text-4xl text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400 text-lg">
                    No participation requests yet
                  </p>
                  <p className="text-slate-500 text-sm mt-2">
                    Request to participate in events from the Available Events
                    tab
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {requestedEvents.map((event) => (
                    <EventCard
                      key={event._id}
                      event={event}
                      status={event.studentRequest?.status}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Event Details Modal */}
      {showModal && (
        <EventModal event={selectedEvent} onClose={() => setShowModal(false)} />
      )}
    </div>
  );
}
