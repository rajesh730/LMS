import { getEventWorkflowStatus } from "@/lib/eventWorkflow";

export function getEventLifecycleState(event) {
  return String(event?.lifecycleStatus || "ACTIVE").toUpperCase();
}

export function isTerminalEvent(event) {
  return ["ARCHIVED", "CANCELLED"].includes(getEventLifecycleState(event));
}

export function isCompletedEvent(event) {
  const workflow = getEventWorkflowStatus(event);
  return Boolean(
    event?.finalOutcomeReady ||
      event?.resultsPublished ||
      ["RESULTS_PUBLISHED", "COMPLETED"].includes(workflow) ||
      getEventLifecycleState(event) === "COMPLETED"
  );
}

export function isRegistrationOpenEvent(event) {
  return (
    !isTerminalEvent(event) &&
    !isCompletedEvent(event) &&
    getEventWorkflowStatus(event) === "OPEN_FOR_REGISTRATION"
  );
}

export function isLiveEvent(event) {
  return (
    getEventLifecycleState(event) === "ACTIVE" &&
    String(event?.status || "APPROVED").toUpperCase() === "APPROVED" &&
    !isCompletedEvent(event) &&
    ["REGISTRATION_CLOSED", "ROUND_ACTIVE", "RESULTS_DRAFT"].includes(
      getEventWorkflowStatus(event)
    )
  );
}

export function matchesEventListFilter(event, filter, { isMine } = {}) {
  switch (filter) {
    case "LIVE":
      return isLiveEvent(event);
    case "REGISTRATION":
      return isRegistrationOpenEvent(event);
    case "MINE":
      return Boolean(isMine);
    case "COMPLETED":
      return !isTerminalEvent(event) && isCompletedEvent(event);
    case "ARCHIVED":
      return isTerminalEvent(event);
    case "ALL":
    default:
      return !isTerminalEvent(event);
  }
}

export function matchesEventFacets(
  event,
  { search = "", type = "", grade = "", visibility = "" } = {}
) {
  const needle = search.trim().toLowerCase();
  return (
    (!needle ||
      String(event?.title || "").toLowerCase().includes(needle) ||
      String(event?.description || "").toLowerCase().includes(needle)) &&
    (!type || event?.eventType === type) &&
    (!grade || (event?.eligibleGrades || []).includes(grade)) &&
    (!visibility || event?.visibility === visibility)
  );
}
