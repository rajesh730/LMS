import { isAfterEndOfDay } from "./eventDates.js";

export const EVENT_WORKFLOW_STATUSES = [
  "DRAFT",
  "OPEN_FOR_REGISTRATION",
  "REGISTRATION_CLOSED",
  "ROUND_ACTIVE",
  "RESULTS_DRAFT",
  "RESULTS_PUBLISHED",
  "COMPLETED",
  "ARCHIVED",
  "CANCELLED",
];

export function normalizeEventWorkflowStatus(value) {
  return EVENT_WORKFLOW_STATUSES.includes(value) ? value : "DRAFT";
}

export function getRegistrationWorkflowStatus(event) {
  if (!event || event.status !== "APPROVED") return "DRAFT";
  if (event.registrationDeadline) {
    const deadline = new Date(event.registrationDeadline);
    if (Number.isNaN(deadline.getTime())) return "REGISTRATION_CLOSED";
    deadline.setHours(23, 59, 59, 999);
    if (deadline < new Date()) {
      return "REGISTRATION_CLOSED";
    }
  }
  return "OPEN_FOR_REGISTRATION";
}

export function canAcceptRegistrations(event) {
  const storedStatus = normalizeEventWorkflowStatus(event?.eventWorkflowStatus);
  const workflowStatus =
    storedStatus === "DRAFT" && event?.status === "APPROVED"
      ? getRegistrationWorkflowStatus(event)
      : storedStatus || getRegistrationWorkflowStatus(event);
  return ["OPEN_FOR_REGISTRATION"].includes(workflowStatus);
}

export function canManageRoundsForWorkflow(event) {
  const workflowStatus = normalizeEventWorkflowStatus(event?.eventWorkflowStatus);
  return ["REGISTRATION_CLOSED", "ROUND_ACTIVE", "RESULTS_DRAFT"].includes(
    workflowStatus
  );
}

export function getEventWorkflowStatus(event) {
  const storedStatus = normalizeEventWorkflowStatus(event?.eventWorkflowStatus);
  if (
    ["DRAFT", "OPEN_FOR_REGISTRATION", "REGISTRATION_CLOSED"].includes(
      storedStatus
    )
  ) {
    return getRegistrationWorkflowStatus(event);
  }
  return storedStatus;
}

export function formatEventWorkflowStatus(value) {
  const labels = {
    DRAFT: "Draft",
    OPEN_FOR_REGISTRATION: "Registration Open",
    REGISTRATION_CLOSED: "Registration Closed",
    ROUND_ACTIVE: "Rounds Running",
    RESULTS_DRAFT: "Results Review",
    RESULTS_PUBLISHED: "Results Published",
    COMPLETED: "Completed",
    ARCHIVED: "Archived",
    CANCELLED: "Cancelled",
  };
  return labels[String(value || "DRAFT").toUpperCase()] || "Draft";
}

// Workflow stages that mean the competition has moved past registration — once
// here, the participant list is frozen no matter how long the event runs.
const STARTED_WORKFLOW_STATUSES = [
  "ROUND_ACTIVE",
  "RESULTS_DRAFT",
  "RESULTS_PUBLISHED",
  "COMPLETED",
];

/**
 * Single source of truth for whether participants can still be added/changed.
 * Returns a human-readable reason when registration is locked, or "" when open.
 *
 * Registration is gated on lifecycle + workflow stage + the (optional)
 * registration deadline — deliberately NOT on the event `date`, so a
 * long-running event stays correct: it closes when the deadline passes or the
 * competition starts (whichever comes first), not when the event day arrives.
 */
export function getRegistrationLockMessage(event, action = "change participation") {
  const lifecycleStatus = String(event?.lifecycleStatus || "ACTIVE").toUpperCase();

  if (lifecycleStatus === "ARCHIVED") {
    return "This event is archived. Registration changes are locked.";
  }
  if (lifecycleStatus === "CANCELLED") {
    return "This event has been cancelled. Registration is closed.";
  }
  if (lifecycleStatus === "COMPLETED") {
    return "This event is completed. Registration changes are locked.";
  }

  if (event?.resultsPublished) {
    return `Cannot ${action}. Results are published, so the participant list is locked.`;
  }

  const resolvedStatus = getEventWorkflowStatus(event);

  if (STARTED_WORKFLOW_STATUSES.includes(resolvedStatus)) {
    return `Cannot ${action}. The competition has already started, so the participant list is locked.`;
  }

  if (event?.registrationDeadline && isAfterEndOfDay(event.registrationDeadline)) {
    return `Cannot ${action}. The registration deadline (${new Date(
      event.registrationDeadline
    ).toLocaleDateString()}) has passed.`;
  }

  if (!canAcceptRegistrations(event)) {
    return `Cannot ${action}. This event is not open for registration.`;
  }

  return "";
}

export function isRegistrationOpen(event) {
  return getRegistrationLockMessage(event) === "";
}

export function getEventNextActionLabel(event) {
  const workflowStatus = getEventWorkflowStatus(event);
  const actions = {
    DRAFT: "Publish when setup is complete",
    OPEN_FOR_REGISTRATION: "Review registrations",
    REGISTRATION_CLOSED: "Start or manage rounds",
    ROUND_ACTIVE: "Manage round progress",
    RESULTS_DRAFT: "Review and publish results",
    RESULTS_PUBLISHED: "Issue certificates or complete event",
    COMPLETED: "View results and certificates",
    ARCHIVED: "Restore or keep in history",
    CANCELLED: "Cancelled — restore or delete",
  };
  return actions[workflowStatus] || "Review event";
}
