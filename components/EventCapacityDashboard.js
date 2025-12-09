"use client";

import { useState, useEffect } from "react";
import { FaChartBar, FaUsers, FaCalendarAlt } from "react-icons/fa";

export default function EventCapacityDashboard() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchEventCapacity();
  }, []);

  const fetchEventCapacity = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/school/event-capacity");
      if (res.ok) {
        const data = await res.json();
        setEvents(Array.isArray(data.data) ? data.data : []);
      } else {
        const error = await res.json();
        setMessage(`❌ ${error.message || "Failed to load capacity data"}`);
      }
    } catch (error) {
      console.error("Error fetching event capacity:", error);
      setMessage("❌ Network error");
    } finally {
      setLoading(false);
    }
  };

  const getProgressPercentage = (enrolled, max) => {
    if (!max) return 0;
    return Math.min(100, (enrolled / max) * 100);
  };

  const getProgressColor = (percentage) => {
    if (percentage < 50) return "bg-green-500";
    if (percentage < 80) return "bg-yellow-500";
    return "bg-red-500";
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <div className="animate-spin inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
        <p className="mt-3 text-gray-600">Loading capacity data...</p>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <FaCalendarAlt size={32} className="mx-auto text-gray-400 mb-3" />
        <p className="text-gray-600">No events found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {message && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {message}
        </div>
      )}

      <div className="grid gap-4">
        {events.map((event) => (
          <div
            key={event._id}
            className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {event.title}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Event Date: {new Date(event.date).toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* Global Capacity */}
            {event.maxParticipants && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <FaUsers className="text-blue-500" />
                    <span className="font-semibold text-gray-900">
                      Global Capacity
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-gray-700">
                    {event.totalEnrolled} / {event.maxParticipants} students
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-full transition-all ${getProgressColor(
                      getProgressPercentage(
                        event.totalEnrolled,
                        event.maxParticipants
                      )
                    )}`}
                    style={{
                      width: `${getProgressPercentage(
                        event.totalEnrolled,
                        event.maxParticipants
                      )}%`,
                    }}
                  ></div>
                </div>
                <p className="text-xs text-gray-600 mt-2">
                  {getProgressPercentage(
                    event.totalEnrolled,
                    event.maxParticipants
                  ).toFixed(0)}
                  % capacity used
                </p>
              </div>
            )}

            {/* Per-School Capacity */}
            {event.maxParticipantsPerSchool && event.schoolCapacity && (
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-900 text-sm">
                  Per-School Capacity
                </h4>
                {event.schoolCapacity.map((school, idx) => (
                  <div
                    key={`${event._id}-${school.schoolId}-${idx}`}
                    className="p-3 bg-gray-50 border border-gray-200 rounded"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-900">
                        {school.schoolName}
                      </span>
                      <span className="text-sm font-semibold text-gray-700">
                        {school.enrolled} / {event.maxParticipantsPerSchool}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full transition-all ${getProgressColor(
                          getProgressPercentage(
                            school.enrolled,
                            event.maxParticipantsPerSchool
                          )
                        )}`}
                        style={{
                          width: `${getProgressPercentage(
                            school.enrolled,
                            event.maxParticipantsPerSchool
                          )}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Eligible Grades */}
            {event.eligibleGrades && event.eligibleGrades.length > 0 && (
              <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded">
                <p className="text-xs font-semibold text-purple-900 mb-2">
                  Eligible Grades:
                </p>
                <div className="flex flex-wrap gap-2">
                  {event.eligibleGrades.map((grade) => (
                    <span
                      key={grade}
                      className="px-2 py-1 bg-purple-200 text-purple-900 rounded text-xs font-medium"
                    >
                      {grade}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
