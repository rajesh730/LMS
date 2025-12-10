"use client";

import { useEffect, useState } from "react";
import {
  FaCalendarAlt,
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
} from "react-icons/fa";
import EventParticipationForm from "./EventParticipationForm";
import { useSession } from "next-auth/react";

export default function EventHub() {
  const { data: session } = useSession();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedEventId, setExpandedEventId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all"); // all, participated, pending, approved, rejected

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
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
        setEvents(data.events || data || []);
      }
    } catch (error) {
      console.error("Error fetching events:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredEvents = events.filter((event) => {
    const matchesSearch = event.title
      .toLowerCase()
      .includes(searchQuery.toLowerCase());

    if (filterStatus === "all") return matchesSearch;
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
    };
    const icons = {
      PENDING: <FaClock2 className="inline mr-2" />,
      APPROVED: <FaCheckCircle className="inline mr-2" />,
      REJECTED: <FaTimesCircle className="inline mr-2" />,
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
    const percentage = (current / max) * 100;
    if (percentage >= 90) return "text-red-400";
    if (percentage >= 70) return "text-yellow-400";
    return "text-green-400";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center text-slate-400">Loading events...</div>
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
            <h1 className="text-4xl font-bold text-white">Upcoming Events</h1>
          </div>
          <p className="text-slate-400">
            Explore and participate in upcoming school events
          </p>
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
            {[
              { id: "all", label: "All Events" },
              { id: "pending", label: "Pending Requests" },
              { id: "approved", label: "My Events" },
              { id: "rejected", label: "Declined" },
            ].map((filter) => (
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
            <div className="bg-slate-800/50 rounded-xl p-12 text-center border border-slate-700">
              <FaCalendarAlt className="text-4xl text-slate-600 mb-4 mx-auto" />
              <p className="text-slate-400 text-lg">No events found</p>
              <p className="text-slate-500 text-sm mt-2">
                Try adjusting your search or filters
              </p>
            </div>
          ) : (
            filteredEvents.map((event) => (
              <div
                key={event._id}
                className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden transition-all hover:border-slate-600"
              >
                {/* Event Card - Clickable Header */}
                <button
                  onClick={() =>
                    setExpandedEventId(
                      expandedEventId === event._id ? null : event._id
                    )
                  }
                  className="w-full text-left p-6 hover:bg-slate-800/80 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Left: Event Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-2xl font-bold text-white">
                          {event.title}
                        </h3>
                        {event.participationStatus &&
                          getStatusBadge(event.participationStatus)}
                      </div>

                      <p className="text-slate-400 mb-4 line-clamp-2">
                        {event.description}
                      </p>

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
                                new Date(event.deadline) < new Date()
                                  ? "text-red-400"
                                  : "text-emerald-400"
                              }`}
                            >
                              {new Date(event.deadline).toLocaleDateString(
                                "en-US",
                                {
                                  month: "short",
                                  day: "numeric",
                                }
                              )}
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
                              {event.enrolled || 0}/{event.capacity}
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

                      {!event.participationStatus && (
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedEventId(event._id);
                          }}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap cursor-pointer"
                        >
                          {session?.user?.role === "STUDENT"
                            ? "Join Event"
                            : "Manage Participants"}
                        </div>
                      )}
                    </div>
                  </div>
                </button>

                {/* Expanded Section - Participation Form */}
                {expandedEventId === event._id && (
                  <div className="border-t border-slate-700 bg-slate-900/50 p-6">
                    <EventParticipationForm
                      event={event}
                      onSuccess={() => {
                        fetchEvents();
                        setExpandedEventId(null);
                      }}
                    />
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
