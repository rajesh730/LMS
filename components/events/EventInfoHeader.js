"use client";

import { FaCalendarAlt, FaClock, FaUsers, FaTasks } from "react-icons/fa";

export default function EventInfoHeader({ event, capacityInfo }) {
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const daysUntilDeadline = event.registrationDeadline
    ? Math.ceil(
        (new Date(event.registrationDeadline) - new Date()) /
          (1000 * 60 * 60 * 24)
      )
    : null;

  return (
    <div className="bg-gradient-to-r from-emerald-600 to-teal-500 text-white p-6 md:p-10">
      <div className="max-w-7xl mx-auto">
        {/* Title & Description */}
        <h1 className="text-4xl font-bold mb-2">{event.title}</h1>
        <p className="text-emerald-50 mb-6">{event.description}</p>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Date */}
          <div className="bg-white/10 backdrop-blur rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <FaCalendarAlt className="text-emerald-200" />
              <span className="text-sm opacity-90">Event Date</span>
            </div>
            <p className="text-lg font-semibold">{formatDate(event.date)}</p>
          </div>

          {/* Deadline */}
          <div className="bg-white/10 backdrop-blur rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <FaClock className="text-yellow-300" />
              <span className="text-sm opacity-90">Deadline</span>
            </div>
            <p className="text-lg font-semibold">
              {event.registrationDeadline
                ? formatDate(event.registrationDeadline)
                : "No deadline"}
            </p>
            {daysUntilDeadline !== null && daysUntilDeadline > 0 && (
              <p className="text-xs opacity-75 mt-1">
                {daysUntilDeadline} days left
              </p>
            )}
          </div>

          {/* Capacity */}
          <div className="bg-white/10 backdrop-blur rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <FaUsers className="text-blue-300" />
              <span className="text-sm opacity-90">Enrolled</span>
            </div>
            <p className="text-lg font-semibold">
              {capacityInfo.filled}
              {capacityInfo.total ? `/${capacityInfo.total}` : ""}
            </p>
            {capacityInfo.percentage && (
              <p className="text-xs opacity-75 mt-1">
                {capacityInfo.percentage}% full
              </p>
            )}
          </div>

          {/* Pending Requests */}
          <div className="bg-white/10 backdrop-blur rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <FaTasks className="text-purple-300" />
              <span className="text-sm opacity-90">Pending</span>
            </div>
            <p className="text-lg font-semibold">{capacityInfo.pending}</p>
            <p className="text-xs opacity-75 mt-1">requests to approve</p>
          </div>
        </div>

        {/* Capacity Bar */}
        {capacityInfo.total && (
          <div className="mt-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Capacity Status</span>
              <span className="text-sm opacity-90">
                {capacityInfo.filled}/{capacityInfo.total}
              </span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-3 overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  capacityInfo.percentage >= 100
                    ? "bg-red-400"
                    : capacityInfo.percentage >= 80
                    ? "bg-yellow-400"
                    : "bg-green-400"
                }`}
                style={{ width: `${Math.min(capacityInfo.percentage, 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
