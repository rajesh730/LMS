"use client";

import { FaCalendarAlt, FaClock, FaUsers, FaTasks } from "react-icons/fa";
import { getEventStage, getStageClasses } from "@/lib/eventUiStatus";

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
  const stage = getEventStage(event, { capacityInfo });

  return (
    <div className="bg-gradient-to-r from-[#0a2f66] via-[#1150a1] to-[#2f7fdb] text-white p-6 md:p-10">
      <div className="max-w-7xl mx-auto">
        {/* Title & Description */}
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">{event.title}</h1>
            <p className="text-[#dce9ff]">{event.description}</p>
          </div>
          <div
            className={`min-w-64 rounded-2xl border px-4 py-3 shadow-sm ${getStageClasses(
              stage.tone
            )}`}
          >
            <p className="text-xs font-bold uppercase tracking-wide">
              Current Stage
            </p>
            <p className="mt-1 text-lg font-bold">{stage.label}</p>
            <p className="mt-1 text-xs opacity-90">{stage.nextAction}</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Date */}
          <div className="rounded-lg border border-white/10 bg-white/10 backdrop-blur p-4">
            <div className="flex items-center gap-2 mb-2">
              <FaCalendarAlt className="text-[#ffe09a]" />
              <span className="text-sm opacity-90">Event Date</span>
            </div>
            <p className="text-lg font-semibold">{formatDate(event.date)}</p>
          </div>

          {/* Deadline */}
          <div className="rounded-lg border border-white/10 bg-white/10 backdrop-blur p-4">
            <div className="flex items-center gap-2 mb-2">
              <FaClock className="text-[#ffcf57]" />
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
          <div className="rounded-lg border border-white/10 bg-white/10 backdrop-blur p-4">
            <div className="flex items-center gap-2 mb-2">
              <FaUsers className="text-[#b6d6ff]" />
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
          <div className="rounded-lg border border-white/10 bg-white/10 backdrop-blur p-4">
            <div className="flex items-center gap-2 mb-2">
              <FaTasks className="text-[#ffcf57]" />
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
                    ? "bg-[#ffb21c]"
                    : capacityInfo.percentage >= 80
                    ? "bg-[#ffd56f]"
                    : "bg-[#7fb4ff]"
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
