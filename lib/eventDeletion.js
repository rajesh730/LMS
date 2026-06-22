import { getEventWorkflowStatus } from "@/lib/eventWorkflow";

// A competition is "running" once rounds/results are in progress but results
// are not yet published. Running events must be Cancelled (which notifies
// everyone), never quietly Archived.
const RUNNING_WORKFLOW_STATUSES = ["ROUND_ACTIVE", "RESULTS_DRAFT"];

const TERMINAL_STATES = ["ARCHIVED", "CANCELLED"];

export function getEventLifecycleState(event) {
  return String(event?.lifecycleStatus || "ACTIVE").toUpperCase();
}

// Results published or the event marked completed both imply issued/locked
// outcomes (certificates, public results) that must never be destroyed.
export function isEventOutcomeLocked(event) {
  return Boolean(
    event?.resultsPublished || getEventLifecycleState(event) === "COMPLETED"
  );
}

export function isEventRunning(event) {
  return RUNNING_WORKFLOW_STATUSES.includes(getEventWorkflowStatus(event));
}

/**
 * Single source of truth for what removal actions are allowed on an event,
 * given its lifecycle stage and whether anyone is registered. Authorization
 * (who owns the event) is enforced separately by canManageEventRecord — this
 * only answers "is the event in a state where this action is safe?".
 *
 * Policy (confirmed product rules):
 *  - Archive: reversible hide. Allowed for ACTIVE/COMPLETED events that are not
 *    mid-competition. Running events must be Cancelled instead.
 *  - Cancel: stop an event that should not proceed. Notifies and withdraws
 *    registrations. Allowed while ACTIVE and results are not yet published.
 *  - Delete (permanent): only from a terminal Archived/Cancelled state, and
 *    never when results/certificates are published (protects student
 *    portfolios). Always a two-step flow: Archive/Cancel first, then Delete.
 *  - Restore: bring an Archived/Cancelled event back to ACTIVE.
 */
export function getEventDeletionPolicy(event, { hasActiveRegistrations = false } = {}) {
  const state = getEventLifecycleState(event);
  const outcomeLocked = isEventOutcomeLocked(event);
  const running = isEventRunning(event);
  const isTerminal = TERMINAL_STATES.includes(state);

  const canArchive = ["ACTIVE", "COMPLETED"].includes(state) && !running;
  const canCancel = state === "ACTIVE" && !event?.resultsPublished;
  const canDelete = isTerminal && !outcomeLocked;
  const canRestore = isTerminal;

  let archiveBlockedReason = "";
  if (!canArchive) {
    archiveBlockedReason = running
      ? "This event is running. Cancel it instead of archiving."
      : isTerminal
      ? "This event is already archived or cancelled."
      : "This event cannot be archived in its current state.";
  }

  let cancelBlockedReason = "";
  if (!canCancel) {
    cancelBlockedReason = event?.resultsPublished
      ? "Results are published, so this event can no longer be cancelled."
      : isTerminal
      ? "This event is already archived or cancelled."
      : "Only active events can be cancelled.";
  }

  let deleteBlockedReason = "";
  if (!canDelete) {
    deleteBlockedReason = !isTerminal
      ? "Archive or cancel this event before deleting it permanently."
      : outcomeLocked
      ? "Events with published results or issued certificates cannot be deleted."
      : "This event cannot be deleted.";
  }

  return {
    state,
    isTerminal,
    isRunning: running,
    isOutcomeLocked: outcomeLocked,
    hasActiveRegistrations,
    canArchive,
    canCancel,
    canDelete,
    canRestore,
    archiveBlockedReason,
    cancelBlockedReason,
    deleteBlockedReason,
    // Cancel is the right primary action (over Archive) whenever stopping the
    // event will actually affect people: registrations exist or it's running.
    cancelIsPrimary: canCancel && (hasActiveRegistrations || running),
  };
}
