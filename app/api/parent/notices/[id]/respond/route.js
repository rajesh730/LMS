import connectDB from "@/lib/db";
import Notice from "@/models/Notice";
import {
  successResponse,
  errorResponse,
  validationError,
  internalServerError,
} from "@/lib/apiResponse";
import { requireParentChild } from "@/lib/parentAccess";
import {
  buildNoticeQuery,
  recordAcknowledgement,
  recordConsent,
} from "@/lib/parentNotices";
import { notifyGuardians } from "@/lib/parentNotifications";

export const dynamic = "force-dynamic";

/**
 * Acknowledge ("I Understand") or answer a consent question (YES/NO) — §11.
 *
 * Consent requires the `canGiveConsent` permission. Acknowledgement does not:
 * confirming you have read something is not acting on the child's behalf, and
 * a school needs to know which guardians have seen an important notice
 * regardless of who holds decision rights (§20).
 */
export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    const action = String(body.action || "").toUpperCase();
    if (!["ACKNOWLEDGE", "CONSENT"].includes(action)) {
      return validationError("action must be ACKNOWLEDGE or CONSENT");
    }

    // Consent is gated; acknowledgement is not. Resolving the permission here
    // keeps the single-gate rule intact — see lib/parentAccess.js.
    const requiredPermission = action === "CONSENT" ? "canGiveConsent" : null;

    const { parent, student, link, context, error } = await requireParentChild(
      body.studentId,
      requiredPermission
    );
    if (error) return error;

    await connectDB();

    const notice = await Notice.findOne({
      _id: id,
      ...buildNoticeQuery(student),
    })
      .select("title requiresAcknowledgement requiresConsent")
      .lean();

    if (!notice) {
      return errorResponse(404, "Notice not found", "NOT_FOUND");
    }

    if (action === "ACKNOWLEDGE") {
      if (!notice.requiresAcknowledgement) {
        return validationError("This notice does not require acknowledgement");
      }

      const receipt = await recordAcknowledgement({
        noticeId: notice._id,
        parentId: parent._id,
        student,
      });

      return successResponse(200, "Acknowledged", {
        acknowledgedAt: receipt?.acknowledgedAt || null,
      });
    }

    if (!notice.requiresConsent) {
      return validationError("This notice does not ask for permission");
    }

    const decision = String(body.decision || "").toUpperCase();
    if (!["YES", "NO"].includes(decision)) {
      return validationError("decision must be YES or NO");
    }

    const receipt = await recordConsent({
      noticeId: notice._id,
      parentId: parent._id,
      student,
      decision,
      link,
      parent,
    });

    // Tell the OTHER guardians a decision was made, so two guardians do not
    // both answer the same permission slip without knowing (§19, §20).
    // Fire-and-forget: a notification failure must not fail the consent.
    await notifyGuardians({
      studentId: student._id,
      category: "CONSENT",
      priority: "INFO",
      title: `Permission answered for ${student.name}`,
      message: `${parent.name} answered ${decision} to "${notice.title}".`,
      href: `/parent/notices/${notice._id}`,
      metadata: { noticeId: String(notice._id) },
      excludeParentId: parent._id,
    }).catch((err) =>
      console.error("[parent consent] guardian notify failed:", err.message)
    );

    return successResponse(200, "Response recorded", {
      decision: receipt?.consentDecision || decision,
      decidedAt: receipt?.consentDecidedAt || null,
      child: { id: context.studentId, name: student.name },
    });
  } catch (err) {
    console.error("POST /api/parent/notices/[id]/respond error:", err);
    return internalServerError("Failed to record your response");
  }
}
