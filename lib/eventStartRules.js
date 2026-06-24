import { isAfterEndOfDay, isBeforeToday } from "@/lib/eventDates";
import { isTeamEventLike } from "@/lib/eventParticipationFormat";
import { getEventWorkflowStatus } from "@/lib/eventWorkflow";

export const MIN_EVENT_START_ENTRIES = 2;

export function getEventStartEntryCount(event, requests = []) {
  const activeRequests = (requests || []).filter((request) =>
    ["APPROVED", "ENROLLED"].includes(String(request.status || "").toUpperCase())
  );

  if (!isTeamEventLike(event)) return activeRequests.length;

  const teamKeys = new Set(
    activeRequests.map((request) => {
      const schoolId = String(request.school?._id || request.school || "");
      const teamName = String(request.teamName || "").trim().toLowerCase();
      return `${schoolId}::${teamName || "default-team"}`;
    })
  );
  return teamKeys.size;
}

export function getEventStartState(event, requests = [], now = new Date()) {
  const lifecycleStatus = String(event?.lifecycleStatus || "ACTIVE").toUpperCase();
  const workflowStatus = getEventWorkflowStatus(event);
  const entryCount = getEventStartEntryCount(event, requests);
  const unitLabel = isTeamEventLike(event) ? "teams" : "participants";

  if (["ARCHIVED", "CANCELLED", "COMPLETED"].includes(lifecycleStatus)) {
    return {
      canStart: false,
      entryCount,
      unitLabel,
      reason: "This event is not active.",
    };
  }

  if (event?.resultsPublished) {
    return {
      canStart: false,
      entryCount,
      unitLabel,
      reason: "Results are already published.",
    };
  }

  if (["ROUND_ACTIVE", "RESULTS_DRAFT", "RESULTS_PUBLISHED"].includes(workflowStatus)) {
    return {
      canStart: false,
      entryCount,
      unitLabel,
      reason: "This event has already started.",
    };
  }

  if (!event?.date || isBeforeToday(event.date, now)) {
    return {
      canStart: false,
      entryCount,
      unitLabel,
      reason: "Set a valid event date before starting.",
    };
  }

  if (new Date(event.date) > now) {
    return {
      canStart: false,
      entryCount,
      unitLabel,
      reason: "You can start the event on or after the event date.",
    };
  }

  if (!event?.registrationDeadline || !isAfterEndOfDay(event.registrationDeadline, now)) {
    return {
      canStart: false,
      entryCount,
      unitLabel,
      reason: "Registration deadline must pass before starting.",
    };
  }

  if (entryCount < MIN_EVENT_START_ENTRIES) {
    return {
      canStart: false,
      entryCount,
      unitLabel,
      reason: `At least ${MIN_EVENT_START_ENTRIES} ${unitLabel} are required to start.`,
    };
  }

  return {
    canStart: true,
    entryCount,
    unitLabel,
    reason: "",
  };
}
