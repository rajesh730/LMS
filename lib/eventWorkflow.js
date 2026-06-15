export const EVENT_WORKFLOW_STATUSES = [
  "DRAFT",
  "OPEN_FOR_REGISTRATION",
  "REGISTRATION_CLOSED",
  "ROUND_ACTIVE",
  "RESULTS_DRAFT",
  "RESULTS_PUBLISHED",
  "COMPLETED",
  "ARCHIVED",
];

export function normalizeEventWorkflowStatus(value) {
  return EVENT_WORKFLOW_STATUSES.includes(value) ? value : "DRAFT";
}

export function getRegistrationWorkflowStatus(event) {
  if (!event || event.status !== "APPROVED") return "DRAFT";
  if (
    event.registrationDeadline &&
    new Date(event.registrationDeadline).getTime() < Date.now()
  ) {
    return "REGISTRATION_CLOSED";
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
  return String(value || "DRAFT")
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
