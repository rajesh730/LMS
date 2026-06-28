"use client";

import {
  FaCalendarAlt,
  FaCheckCircle,
  FaClock,
  FaListUl,
  FaMusic,
  FaUsers,
} from "react-icons/fa";
import { getEventStage } from "@/lib/eventUiStatus";
import {
  formatEventWorkflowStatus,
  getEventNextActionLabel,
  getEventWorkflowStatus,
} from "@/lib/eventWorkflow";
import useCalendarPreference from "@/lib/useCalendarPreference";
import { formatDate as formatCalendarDate } from "@/lib/nepaliDate";

export default function EventInfoHeader({ event, capacityInfo }) {
  const { calendar } = useCalendarPreference();
  const formatDate = (date) =>
    date ? formatCalendarDate(date, calendar) : "No deadline";
  const formatTime = (date) =>
    date
      ? new Date(date).toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        })
      : "";
  const formatWeekday = (date) =>
    date
      ? new Date(date).toLocaleDateString("en-US", { weekday: "long" })
      : "";

  const daysUntilDeadline = event.registrationDeadline
    ? Math.ceil(
        (new Date(event.registrationDeadline) - new Date()) /
          (1000 * 60 * 60 * 24)
      )
    : null;
  const stage = getEventStage(event, { capacityInfo });
  const workflowStatus = getEventWorkflowStatus(event);
  const nextAction = getEventNextActionLabel(event);
  const capacityPercent = Math.min(capacityInfo.percentage || 0, 100);
  const stageTone =
    stage.tone === "emerald" || event.resultsPublished
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : stage.tone === "amber"
      ? "border-amber-200 bg-amber-50 text-amber-900"
      : stage.tone === "rose"
      ? "border-rose-200 bg-rose-50 text-rose-800"
      : "border-blue-100 bg-blue-50 text-[#0a2f66]";

  return (
    <div className="border-b border-[#e1e7f2] bg-white px-5 py-5 text-[#27344a] shadow-[0_8px_24px_rgba(10,47,102,0.04)] md:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-2xl text-purple-700">
              <FaMusic />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-black leading-tight text-[#17120a] md:text-3xl">
                  {event.title}
                </h1>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-black uppercase text-emerald-700">
                  {formatEventWorkflowStatus(workflowStatus)}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="rounded-full bg-purple-50 px-2.5 py-1 text-[10px] font-black uppercase text-purple-700">
                  {String(event.eventType || "EVENT").replaceAll("_", " ")}
                </span>
                <span className="rounded-full bg-[#f4f8fd] px-2.5 py-1 text-[10px] font-black uppercase text-[#52657d]">
                  {String(event.participationFormat || "INDIVIDUAL").toLowerCase()} event
                </span>
                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-black uppercase text-[#0a2f66]">
                  {event.eligibleGrades?.length
                    ? `Visible to ${event.eligibleGrades.join(" - ")}`
                    : "Visible to all grades"}
                </span>
              </div>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-[#52657d]">
                {event.description}
              </p>
            </div>
          </div>
          <div
            className={`w-full rounded-xl border px-4 py-3 shadow-sm lg:w-[320px] ${stageTone}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-black uppercase tracking-normal">
              Event Status
            </p>
                <p className="mt-1 text-lg font-black">{stage.label}</p>
                <p className="mt-1 text-xs opacity-90">{nextAction}</p>
              </div>
              <FaCheckCircle className="mt-1 shrink-0 text-lg" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-xl border border-[#e1e7f2] bg-white p-4 shadow-sm">
            <div className="mb-2 flex items-center gap-3 text-[#52657d]">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-50 text-purple-700">
                <FaCalendarAlt />
              </span>
              <span className="text-xs font-black">Event Date</span>
            </div>
            <p className="text-base font-black text-[#17120a]">
              {formatDate(event.date)}
            </p>
            <p className="mt-1 text-xs text-[#52657d]">{formatWeekday(event.date)}</p>
          </div>

          <div className="rounded-xl border border-[#e1e7f2] bg-white p-4 shadow-sm">
            <div className="mb-2 flex items-center gap-3 text-[#52657d]">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
                <FaClock />
              </span>
              <span className="text-xs font-black">Deadline</span>
            </div>
            <p className="text-base font-black text-[#17120a]">
              {formatDate(event.registrationDeadline)}
            </p>
            <p className="mt-1 text-xs text-[#52657d]">
              {event.registrationDeadline
                ? daysUntilDeadline > 0
                  ? `${daysUntilDeadline} days left`
                  : formatTime(event.registrationDeadline)
                : "Registration stays open"}
            </p>
          </div>

          <div className="rounded-xl border border-[#e1e7f2] bg-white p-4 shadow-sm">
            <div className="mb-2 flex items-center gap-3 text-[#52657d]">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                <FaUsers />
              </span>
              <span className="text-xs font-black">Enrolled</span>
            </div>
            <p className="text-base font-black text-[#17120a]">
              {capacityInfo.filled}
              {capacityInfo.total ? `/${capacityInfo.total}` : ""}
            </p>
            <p className="mt-1 text-xs text-emerald-700">
              {capacityInfo.percentage || 0}% full
            </p>
          </div>

          <div className="rounded-xl border border-[#e1e7f2] bg-white p-4 shadow-sm">
            <div className="mb-2 flex items-center gap-3 text-[#52657d]">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
                <FaListUl />
              </span>
              <span className="text-xs font-black">Pending Requests</span>
            </div>
            <p className="text-base font-black text-[#17120a]">{capacityInfo.pending}</p>
            <p className="mt-1 text-xs text-[#52657d]">requests to approve</p>
          </div>
        </div>

        {capacityInfo.total && (
          <div className="mt-4 rounded-xl border border-[#e1e7f2] bg-white p-3 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-black text-[#17120a]">Capacity Status</span>
              <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-black text-rose-700">
                {capacityInfo.filled}/{capacityInfo.total} students
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-rose-100">
              <div
                className="h-full rounded-full bg-rose-500 transition-all duration-300"
                style={{ width: `${capacityPercent}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
