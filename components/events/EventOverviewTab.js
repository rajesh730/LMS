"use client";

import {
  FaCalendarAlt,
  FaEye,
  FaSchool,
  FaTrophy,
} from "react-icons/fa";
import {
  formatShortDate,
  getEventStage,
  isDatePast,
} from "@/lib/eventUiStatus";
import {
  formatEventWorkflowStatus,
  getEventWorkflowStatus,
} from "@/lib/eventWorkflow";

export default function EventOverviewTab({
  event,
  capacityInfo,
  requests,
}) {
  const isTeamEvent =
    String(event?.participationFormat || "INDIVIDUAL").toUpperCase() === "TEAM";
  const countRequestUnits = (items = []) => {
    if (!isTeamEvent) return items.length;
    return new Set(
      items.map(
        (item) =>
          `${String(item.school?._id || item.school || "")}::${String(
            item.teamName || ""
          )
            .trim()
            .toLowerCase() || "default-team"}`
      )
    ).size;
  };
  const stage = getEventStage(event, { capacityInfo, requests });
  const workflowStatus = getEventWorkflowStatus(event);
  const pendingCount = countRequestUnits(requests.PENDING || []);
  const registrationClosed = isDatePast(event.registrationDeadline);
  const stageTone =
    stage.tone === "emerald" || event.resultsPublished
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : stage.tone === "amber"
      ? "border-amber-200 bg-amber-50 text-amber-900"
      : stage.tone === "rose"
      ? "border-rose-200 bg-rose-50 text-rose-800"
      : "border-blue-100 bg-blue-50 text-[#0a2f66]";
  const timeline = [
    ["Open For Registration", event.createdAt || event.date, !["DRAFT"].includes(workflowStatus)],
    ["Registration Closed", event.registrationDeadline, !["DRAFT", "OPEN_FOR_REGISTRATION"].includes(workflowStatus)],
    ["Round Active", event.date, ["ROUND_ACTIVE", "RESULTS_DRAFT", "RESULTS_PUBLISHED", "COMPLETED"].includes(workflowStatus)],
    ["Results Draft", null, ["RESULTS_DRAFT", "RESULTS_PUBLISHED", "COMPLETED"].includes(workflowStatus)],
    ["Results Published", null, ["RESULTS_PUBLISHED", "COMPLETED"].includes(workflowStatus)],
    ["Completed", null, workflowStatus === "COMPLETED"],
  ];
  const detailItems = [
    ["Organized By", event.school?.schoolName || event.school?.name || "Orbit English School", FaSchool],
    ["Event Type", String(event.eventType || "Competition").replaceAll("_", " "), FaTrophy],
    [
      "Visibility",
      event.eligibleGrades?.length
        ? `Visible to ${event.eligibleGrades.join(" - ")}`
        : "Visible to all grades",
      FaEye,
    ],
    ["Created On", formatShortDate(event.createdAt || event.date), FaCalendarAlt],
  ];

  return (
    <div className="space-y-5">
      <div className={`rounded-xl border p-5 ${stageTone}`}>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-normal">
              Current Stage
            </p>
            <h2 className="mt-1 text-xl font-black">{stage.label}</h2>
            <p className="mt-1 text-xs font-black uppercase opacity-80">
              Workflow: {formatEventWorkflowStatus(workflowStatus)}
            </p>
            <p className="mt-2 text-sm opacity-90">{stage.nextAction}</p>
          </div>
          <div className="rounded-lg border border-current/20 bg-white/70 px-4 py-3 text-sm font-black">
            Deadline: {formatShortDate(event.registrationDeadline)}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-[#e1e7f2] bg-white p-5 shadow-sm">
        <div className="grid gap-5 lg:grid-cols-2">
          <div>
            <h3 className="mb-4 text-sm font-black text-[#17120a]">Event Details</h3>
            <div className="space-y-4">
              {detailItems.map(([label, value, Icon]) => (
                <div key={label} className="flex gap-3 text-sm">
                  <Icon className="mt-1 shrink-0 text-purple-700" />
                  <div>
                    <p className="font-black text-[#52657d]">{label}</p>
                    <p className="font-bold text-[#17120a]">{value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-[#e1e7f2] pt-5 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
            <h3 className="mb-4 text-sm font-black text-[#17120a]">Timeline</h3>
            <div className="space-y-4">
              {timeline.map(([label, date, complete]) => (
                <div key={label} className="flex items-start gap-3 text-sm">
                  <span
                    className={`mt-1 h-3 w-3 rounded-full ${
                      complete ? "bg-emerald-600" : "bg-[#c8d4e6]"
                    }`}
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-4">
                      <p className="font-black text-[#17120a]">{label}</p>
                      <p className="text-xs font-bold text-[#75869b]">
                        {date ? formatShortDate(date) : "Pending"}
                      </p>
                    </div>
                    {label === "Registration Closed" && (
                      <p className="mt-1 text-xs text-[#52657d]">
                        {registrationClosed ? "Closed" : "Still accepting entries"}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <p className="text-xs font-bold text-[#52657d]">
        {pendingCount} pending request{pendingCount === 1 ? "" : "s"} need review.
        Registered {isTeamEvent ? "teams" : "students"}: {capacityInfo.filled || 0}
        {capacityInfo.total ? `/${capacityInfo.total}` : ""}.
      </p>
    </div>
  );
}
