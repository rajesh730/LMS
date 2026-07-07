import { isAfterEndOfDay } from "@/lib/eventDates";
import { isTeamEventLike } from "@/lib/eventParticipationFormat";
import { normalizeEventWorkflowStatus } from "@/lib/eventWorkflow";

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

/**
 * Decides whether the organizer can flip an event from "registration" to "live"
 * (create Round 1). The rule:
 *   - Deadline set  → the event goes live AUTOMATICALLY when the deadline passes.
 *                     Before then the organizer waits; after then they can begin.
 *   - No deadline   → the organizer starts it MANUALLY with the "Go Live"
 *                     button whenever there are enough entries.
 * `mode` tells the UI which case applies so it can show the right control.
 */
export function getEventStartState(event, requests = [], now = new Date()) {
  const lifecycleStatus = String(event?.lifecycleStatus || "ACTIVE").toUpperCase();
  const storedStatus = normalizeEventWorkflowStatus(event?.eventWorkflowStatus);
  const entryCount = getEventStartEntryCount(event, requests);
  const unitLabel = isTeamEventLike(event) ? "teams" : "participants";
  const hasDeadline = Boolean(event?.registrationDeadline);
  const deadlinePassed =
    hasDeadline && isAfterEndOfDay(event.registrationDeadline, now);
  const base = { entryCount, unitLabel };

  if (["ARCHIVED", "CANCELLED", "COMPLETED"].includes(lifecycleStatus)) {
    return { ...base, canStart: false, mode: "LOCKED", reason: "This event is not active." };
  }

  if (event?.resultsPublished) {
    return { ...base, canStart: false, mode: "LOCKED", reason: "Results are already published." };
  }

  // Explicitly started (or already advanced past rounds) — nothing to start.
  if (["ROUND_ACTIVE", "RESULTS_DRAFT", "RESULTS_PUBLISHED", "COMPLETED"].includes(storedStatus)) {
    return { ...base, canStart: false, mode: "STARTED", reason: "This event has already started." };
  }

  if (entryCount < MIN_EVENT_START_ENTRIES) {
    return {
      ...base,
      canStart: false,
      mode: hasDeadline ? "AUTO" : "MANUAL",
      reason: `At least ${MIN_EVENT_START_ENTRIES} ${unitLabel} are required to start.`,
    };
  }

  // Deadline set but not reached yet → it will go live on its own; no manual start.
  if (hasDeadline && !deadlinePassed) {
    return {
      ...base,
      canStart: false,
      mode: "AUTO",
      reason: `This event goes live automatically when registration closes on ${new Date(
        event.registrationDeadline
      ).toLocaleDateString()}.`,
    };
  }

  // No deadline (manual start) OR the deadline has passed (begin Round 1 now).
  return {
    ...base,
    canStart: true,
    mode: hasDeadline ? "AUTO_READY" : "MANUAL",
    reason: "",
  };
}
