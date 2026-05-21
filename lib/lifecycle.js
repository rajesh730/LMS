import AuditLog from "@/models/AuditLog";

function toIsoDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function actorSummary(actor) {
  if (!actor) return null;
  if (typeof actor === "string") {
    return { id: actor, name: "System user" };
  }
  const id = actor._id || actor.id;
  return {
    id: id ? String(id) : "",
    name:
      actor.name ||
      actor.schoolName ||
      actor.organizationName ||
      actor.email ||
      "System user",
  };
}

function timelineItem({ label, status, at, actor, description }) {
  const when = toIsoDate(at);
  if (!when) return null;
  return {
    label,
    status,
    at: when,
    actor: actorSummary(actor),
    description: description || "",
  };
}

function cleanTimeline(items) {
  return items
    .filter(Boolean)
    .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
}

export function buildParticipationLifecycle(request = {}) {
  return cleanTimeline([
    timelineItem({
      label: request.teamName ? "Team registration submitted" : "Registration submitted",
      status: "PENDING",
      at: request.requestedAt || request.createdAt,
      description: request.teamName
        ? `Team: ${request.teamName}`
        : "Waiting for event approval.",
    }),
    timelineItem({
      label: "Registration approved",
      status: "APPROVED",
      at: request.approvedAt,
      actor: request.approvedBy,
      description: "Participant became eligible for the event flow.",
    }),
    timelineItem({
      label: "Added to competition",
      status: "ENROLLED",
      at: request.enrollmentConfirmedAt,
      actor: request.approvedBy,
      description: "Participant was added to the first active round.",
    }),
    timelineItem({
      label: "Registration rejected",
      status: "REJECTED",
      at: request.rejectedAt,
      actor: request.approvedBy,
      description: request.rejectionReason || "Registration was rejected.",
    }),
    timelineItem({
      label: "Last updated",
      status: request.status || "UPDATED",
      at: request.updatedAt,
      description: `Current status: ${request.status || "UNKNOWN"}`,
    }),
  ]);
}

export function buildInvitationLifecycle(invitation = {}) {
  const decisionLabel =
    invitation.status === "APPROVED"
      ? "Approved by school"
      : invitation.status === "DISAPPROVED"
      ? "Disapproved by school"
      : invitation.status === "WITHDRAWN"
      ? "Withdrawn"
      : "Decision pending";

  return cleanTimeline([
    timelineItem({
      label: "Invitation sent",
      status: "PENDING",
      at: invitation.notifiedAt || invitation.createdAt,
      description: "School was notified about this platform event.",
    }),
    timelineItem({
      label: "Seen by school",
      status: "READ",
      at: invitation.readAt,
      description: "The school opened this event notification.",
    }),
    timelineItem({
      label: decisionLabel,
      status: invitation.status,
      at: invitation.decisionAt,
      actor: invitation.decisionBy,
      description: invitation.reason || "School decision recorded.",
    }),
  ]);
}

export function buildMagazineLifecycle(article = {}) {
  return cleanTimeline([
    timelineItem({
      label: article.status === "DRAFT" ? "Draft saved" : "Submitted for review",
      status: article.status === "DRAFT" ? "DRAFT" : "SUBMITTED",
      at: article.submittedAt || article.createdAt,
      description:
        article.submissionSource === "PLATFORM_CHALLENGE"
          ? `Challenge response: ${article.challengeTitle || "Platform Challenge"}`
          : "Student writing entered the school review queue.",
    }),
    timelineItem({
      label:
        article.status === "REJECTED"
          ? "Sent back to student"
          : article.reviewedAt
          ? "Approved by school"
          : "Review pending",
      status: article.status,
      at: article.reviewedAt,
      actor: article.reviewedBy,
      description: article.reviewNote || "School review decision recorded.",
    }),
    timelineItem({
      label: "Published to school magazine",
      status: "PUBLISHED",
      at: article.publishedAt,
      description: "Visible to students in this school.",
    }),
    timelineItem({
      label: "Last updated",
      status: article.status || "UPDATED",
      at: article.updatedAt,
      description: `Current status: ${article.status || "UNKNOWN"}`,
    }),
  ]);
}

export function buildChallengeSubmissionLifecycle(submission = {}) {
  return cleanTimeline([
    timelineItem({
      label: "Challenge response submitted",
      status: "SUBMITTED",
      at: submission.createdAt,
      description: "Student response entered the platform review queue.",
    }),
    timelineItem({
      label:
        submission.status === "SELECTED"
          ? "Selected by platform"
          : submission.status === "REJECTED"
          ? "Sent back by platform"
          : "Review pending",
      status: submission.status,
      at: submission.reviewedAt,
      actor: submission.reviewedBy,
      description: submission.reviewNote || "Platform review decision recorded.",
    }),
    timelineItem({
      label: "Published on Pulse",
      status: "PUBLISHED",
      at: submission.publishedAt,
      actor: submission.reviewedBy,
      description: "Visible publicly with student and school credit.",
    }),
  ]);
}

export async function recordLifecycleAudit({
  entityType,
  entityId,
  action,
  session,
  reason = "",
  before = null,
  after = null,
}) {
  if (!entityType || !entityId || !action || !session?.user?.id) return null;

  try {
    return await AuditLog.create({
      entityType,
      entityId,
      action,
      performedBy: session.user.id,
      role: session.user.role || "",
      reason,
      before,
      after,
    });
  } catch (error) {
    console.error("Lifecycle audit failed:", error);
    return null;
  }
}
