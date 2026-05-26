"use client";

import {
  FaCalendarAlt,
  FaCertificate,
  FaClipboardCheck,
  FaClock,
  FaFlagCheckered,
  FaUsers,
} from "react-icons/fa";
import {
  formatShortDate,
  getEventStage,
  getStageClasses,
  isDatePast,
} from "@/lib/eventUiStatus";

function MetricCard({ icon: Icon, label, value, detail }) {
  return (
    <div className="rounded-lg border border-[#d7cdbb] bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2 text-[#52657d]">
        <Icon className="text-red-600" />
        <span className="text-xs font-semibold uppercase tracking-normal">
          {label}
        </span>
      </div>
      <div className="text-2xl font-bold text-[#17120a]">{value}</div>
      {detail && <p className="mt-1 text-sm text-[#52657d]">{detail}</p>}
    </div>
  );
}

export default function EventOverviewTab({
  event,
  capacityInfo,
  requests,
  setActiveTab,
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
  const pendingCount = countRequestUnits(requests.PENDING || []);
  const approvedCount = countRequestUnits(requests.APPROVED || []);
  const enrolledCount = countRequestUnits(requests.ENROLLED || []);
  const rejectedCount = countRequestUnits(requests.REJECTED || []);
  const registrationClosed = isDatePast(event.registrationDeadline);

  const actions = [
    {
      label:
        pendingCount > 0
          ? `Review pending ${isTeamEvent ? "teams" : "participants"}`
          : `Open ${isTeamEvent ? "teams" : "participants"}`,
      target: "manage",
      detail:
        pendingCount > 0
          ? `${pendingCount} request${pendingCount === 1 ? "" : "s"} waiting`
          : `View approved, rejected, and enrolled ${isTeamEvent ? "teams" : "students"}`,
    },
    {
      label: "Manage rounds",
      target: "rounds",
      detail: registrationClosed
        ? "Registration is closed, rounds can begin"
        : "Prepare round schedule before registration closes",
    },
    {
      label: "Results & certificates",
      target: "results",
      detail: event.resultsPublished
        ? "Results are already published"
        : "Publish winners after final selection",
    },
  ];

  return (
    <div className="space-y-6">
      <div className={`rounded-lg border p-5 ${getStageClasses(stage.tone)}`}>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-normal">
              Current Stage
            </p>
            <h2 className="mt-1 text-2xl font-bold">{stage.label}</h2>
            <p className="mt-2 text-sm opacity-90">{stage.nextAction}</p>
          </div>
        <div className="rounded-lg border border-current/20 bg-white/70 px-4 py-3 text-sm">
            Deadline: {formatShortDate(event.registrationDeadline)}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard
          icon={FaUsers}
          label={isTeamEvent ? "Registered Teams" : "Registered Students"}
          value={capacityInfo.filled || event.studentCount || 0}
          detail={
            capacityInfo.total
              ? `${capacityInfo.total} total ${isTeamEvent ? "team" : "student"} capacity`
              : "No total cap"
          }
        />
        <MetricCard
          icon={FaClipboardCheck}
          label="Pending"
          value={pendingCount}
          detail="requests needing decision"
        />
        <MetricCard
          icon={FaFlagCheckered}
          label="Accepted"
          value={approvedCount + enrolledCount}
          detail={`${rejectedCount} rejected`}
        />
        <MetricCard
          icon={FaCertificate}
          label="Results"
          value={event.resultsPublished ? "Published" : "Draft"}
          detail="certificates live after publishing"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-lg border border-[#d7cdbb] bg-white p-5 lg:col-span-2 shadow-sm">
          <h3 className="mb-4 text-lg font-bold text-[#17120a]">
            Event Timeline
          </h3>
          <div className="grid gap-3 md:grid-cols-3">
            {[
              {
                label: "Registration",
                date: event.registrationDeadline,
                icon: FaClock,
                state: registrationClosed ? "Closed" : "Open",
              },
              {
                label: "Event Date",
                date: event.date,
                icon: FaCalendarAlt,
                state: isDatePast(event.date) ? "Passed" : "Upcoming",
              },
              {
                label: "Results",
                date: null,
                icon: FaCertificate,
                state: event.resultsPublished ? "Published" : "Pending",
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className="rounded-lg border border-[#d7cdbb] bg-[#f8fbff] p-4"
                >
                  <div className="mb-3 flex items-center gap-2 text-[#52657d]">
                    <Icon className="text-red-600" />
                    <span className="font-semibold">{item.label}</span>
                  </div>
                  <p className="text-lg font-bold text-[#17120a]">
                    {item.state}
                  </p>
                  <p className="text-sm text-[#52657d]">
                    {item.date ? formatShortDate(item.date) : "After final round"}
                  </p>
                </div>
              );
            })}
          </div>

          {(capacityInfo.total || event.maxParticipantsPerSchool) && (
            <div className="mt-8 rounded-lg border border-[#d7cdbb] bg-[#f8fbff] p-5">
              <h4 className="mb-3 font-bold text-[#17120a]">Limits & Capacity</h4>
              {capacityInfo.total && (
                <div className="mb-4">
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="font-semibold text-[#52657d]">
                      Total {isTeamEvent ? "Team" : "Student"} Capacity
                    </span>
                    <span className="font-bold text-[#17120a]">{capacityInfo.filled} / {capacityInfo.total}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-red-100">
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
                  <p className="mt-1 text-xs text-[#52657d]">{capacityInfo.percentage}% filled</p>
                </div>
              )}
              {event.maxParticipantsPerSchool && (
                <div>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="font-semibold text-[#52657d]">
                      Max {isTeamEvent ? "Teams" : "Students"} Per School
                    </span>
                    <span className="font-bold text-[#17120a]">{event.maxParticipantsPerSchool}</span>
                  </div>
                </div>
              )}
              {isTeamEvent && event.maxTeamSize && (
                <div className="mt-4 border-t border-[#d7cdbb] pt-4">
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="font-semibold text-[#52657d]">Members Per Team</span>
                    <span className="font-bold text-[#17120a]">
                      {event.minTeamSize || 1} - {event.maxTeamSize}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="rounded-lg border border-[#d7cdbb] bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-lg font-bold text-[#17120a]">
            Next Actions
          </h3>
          <div className="space-y-3">
            {actions.map((action) => (
              <button
                key={action.target}
                type="button"
                onClick={() => setActiveTab(action.target)}
                className="w-full rounded-lg border border-[#d7cdbb] bg-[#f8fbff] p-4 text-left transition hover:border-red-200 hover:bg-red-50/40"
              >
                <p className="font-semibold text-[#17120a]">{action.label}</p>
                <p className="mt-1 text-sm text-[#52657d]">{action.detail}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
