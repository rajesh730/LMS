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
    <div className="border-b border-[#d7cdbb] bg-white px-5 py-6 text-[#27344a] shadow-[0_8px_24px_rgba(10,47,102,0.05)] md:px-8 md:py-7">
      <div className="max-w-7xl mx-auto">
        {/* Title & Description */}
        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <h1 className="mb-1 text-3xl font-bold leading-tight text-[#17120a] md:text-4xl">{event.title}</h1>
            <p className="max-w-3xl text-sm leading-6 text-[#52657d] md:text-base">{event.description}</p>
          </div>
          <div
            className={`w-full rounded-lg border px-4 py-3 shadow-sm lg:w-[320px] ${getStageClasses(
              stage.tone
            )}`}
          >
            <p className="text-[11px] font-bold uppercase tracking-normal">
              Current Stage
            </p>
            <p className="mt-1 text-lg font-bold">{stage.label}</p>
            <p className="mt-1 text-xs opacity-90">{stage.nextAction}</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {/* Date */}
          <div className="rounded-lg border border-[#d7cdbb] bg-[#f8fbff] p-4">
            <div className="flex items-center gap-2 mb-2 text-[#52657d]">
              <FaCalendarAlt className="text-red-600" />
              <span className="text-sm">Event Date</span>
            </div>
            <p className="text-lg font-semibold text-[#17120a]">{formatDate(event.date)}</p>
          </div>

          {/* Deadline */}
          <div className="rounded-lg border border-[#d7cdbb] bg-[#f8fbff] p-4">
            <div className="flex items-center gap-2 mb-2 text-[#52657d]">
              <FaClock className="text-red-600" />
              <span className="text-sm">Deadline</span>
            </div>
            <p className="text-lg font-semibold text-[#17120a]">
              {event.registrationDeadline
                ? formatDate(event.registrationDeadline)
                : "No deadline"}
            </p>
            {daysUntilDeadline !== null && daysUntilDeadline > 0 && (
              <p className="mt-1 text-xs text-[#52657d]">
                {daysUntilDeadline} days left
              </p>
            )}
          </div>

          {/* Capacity */}
          <div className="rounded-lg border border-[#d7cdbb] bg-[#f8fbff] p-4">
            <div className="flex items-center gap-2 mb-2 text-[#52657d]">
              <FaUsers className="text-red-600" />
              <span className="text-sm">Enrolled</span>
            </div>
            <p className="text-lg font-semibold text-[#17120a]">
              {capacityInfo.filled}
              {capacityInfo.total ? `/${capacityInfo.total}` : ""}
            </p>
            {capacityInfo.percentage && (
              <p className="mt-1 text-xs text-[#52657d]">
                {capacityInfo.percentage}% full
              </p>
            )}
          </div>

          {/* Pending Requests */}
          <div className="rounded-lg border border-[#d7cdbb] bg-[#f8fbff] p-4">
            <div className="flex items-center gap-2 mb-2 text-[#52657d]">
              <FaTasks className="text-red-600" />
              <span className="text-sm">Pending</span>
            </div>
            <p className="text-lg font-semibold text-[#17120a]">{capacityInfo.pending}</p>
            <p className="mt-1 text-xs text-[#52657d]">requests to approve</p>
          </div>
        </div>

        {/* Capacity Bar */}
        {capacityInfo.total && (
          <div className="mt-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-[#17120a]">Capacity Status</span>
              <span className="text-sm text-[#344f77]">
                {capacityInfo.filled}/{capacityInfo.total}
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-red-100">
              <div
                className={`h-full transition-all duration-300 ${
                  capacityInfo.percentage >= 100
                    ? "bg-red-600"
                    : capacityInfo.percentage >= 80
                    ? "bg-red-500"
                    : "bg-red-400"
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
