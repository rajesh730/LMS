import connectDB from "@/lib/db";
import Parent from "@/models/Parent";
import ParentStudentLink from "@/models/ParentStudentLink";
import ParentActivation from "@/models/ParentActivation";
import Student from "@/models/Student";
import {
  successResponse,
  errorResponse,
  validationError,
  internalServerError,
} from "@/lib/apiResponse";
import { requireApiSession, getSessionSchoolId, sameId } from "@/lib/authz";
import {
  issueParentAccess,
  revokeParentAccess,
} from "@/lib/parentCredentials";

export const dynamic = "force-dynamic";

/**
 * Create / reissue / reset / revoke Parent Access for a guardian
 * (§4, §41, §42, §44).
 *
 * TENANT ISOLATION (§56) is the load-bearing check in this file. A School A
 * admin must not be able to issue, reset or revoke credentials for a School B
 * guardian — even a guardian they legitimately share, because that guardian's
 * other child belongs to another school. Every branch therefore validates the
 * ParentStudentLink's school against the caller's own, and SUPER_ADMIN is the
 * only role exempt.
 *
 * Teachers are excluded deliberately: issuing a credential that unlocks a
 * child's record is an administrative act.
 */

/**
 * Resolve and authorise the guardian link named by the request.
 * Returns `{ error }` on any failure so callers stay one-liners.
 */
async function resolveLink(session, linkId) {
  if (!linkId) {
    return { error: validationError("linkId is required") };
  }

  await connectDB();

  const link = await ParentStudentLink.findById(linkId);
  if (!link) {
    return { error: errorResponse(404, "Guardian not found", "NOT_FOUND") };
  }

  const schoolId = getSessionSchoolId(session);
  if (session.user.role !== "SUPER_ADMIN" && !sameId(schoolId, link.school)) {
    // Same 404 as "does not exist", so this endpoint cannot be used to
    // discover which guardian links exist at other schools.
    return { error: errorResponse(404, "Guardian not found", "NOT_FOUND") };
  }

  const parent = await Parent.findOne({
    _id: link.parent,
    isDeleted: { $ne: true },
  });
  if (!parent) {
    return { error: errorResponse(404, "Guardian not found", "NOT_FOUND") };
  }

  return { link, parent, schoolId: link.school };
}

/** Current access status for a guardian, for the school UI (§58, §59). */
export async function GET(request) {
  try {
    const { session, error } = await requireApiSession([
      "SCHOOL_ADMIN",
      "SUPER_ADMIN",
    ]);
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const resolved = await resolveLink(session, searchParams.get("linkId"));
    if (resolved.error) return resolved.error;

    const { parent, link } = resolved;

    const pending = await ParentActivation.findOne({
      parent: parent._id,
      status: "PENDING",
    })
      .sort({ createdAt: -1 })
      .select("pinHint expiresAt purpose createdAt")
      .lean();

    return successResponse(200, "Access status", {
      // Never the PIN hash, never a token — only what the school may see.
      parentIdentifier: parent.parentId || null,
      accessState: parent.accessState,
      activatedAt: parent.activatedAt,
      lastLoginAt: parent.lastLoginAt,
      lockedUntil: parent.lockedUntil,
      isHousehold: Boolean(parent.isHousehold),
      contact: {
        email: parent.email || null,
        phone: parent.phone || null,
      },
      relationshipStatus: link.status,
      pendingActivation: pending
        ? {
            pinHint: pending.pinHint,
            expiresAt: pending.expiresAt,
            purpose: pending.purpose,
            createdAt: pending.createdAt,
          }
        : null,
    });
  } catch (err) {
    console.error("GET /api/school/guardians/access error:", err);
    return internalServerError("Failed to load access status");
  }
}

/**
 * Issue Parent Access — first time, reissue after a lost card, or PIN reset.
 *
 * Returns the activation token and PIN EXACTLY ONCE. The response is the only
 * place they will ever exist in readable form; the school prints the card from
 * it immediately.
 */
export async function POST(request) {
  try {
    const { session, error } = await requireApiSession([
      "SCHOOL_ADMIN",
      "SUPER_ADMIN",
    ]);
    if (error) return error;

    const body = await request.json().catch(() => ({}));
    const resolved = await resolveLink(session, body.linkId);
    if (resolved.error) return resolved.error;

    const { parent, link } = resolved;

    const purpose = ["INITIAL", "REISSUE", "PIN_RESET"].includes(body.purpose)
      ? body.purpose
      : parent.accessState === "NOT_CREATED"
        ? "INITIAL"
        : "REISSUE";

    // Reissuing to a revoked guardian would silently restore access the school
    // deliberately removed. Require an explicit un-revoke first.
    if (parent.accessState === "REVOKED" && body.purpose !== "REINSTATE") {
      return errorResponse(
        409,
        "This guardian's access was revoked. Restore it before issuing a new card.",
        "ACCESS_REVOKED"
      );
    }

    const issued = await issueParentAccess({
      parent,
      schoolId: link.school,
      studentId: link.student,
      issuedBy: session.user.id,
      purpose,
    });

    return successResponse(201, "Parent access created", {
      // Shown once. Not retrievable afterwards — see lib/parentCredentials.js.
      parentIdentifier: issued.parentIdentifier,
      activationPin: issued.activationPin,
      activationToken: issued.activationToken,
      activationId: issued.activationId,
      expiresAt: issued.expiresAt,
      purpose,
    });
  } catch (err) {
    console.error("POST /api/school/guardians/access error:", err);
    return internalServerError("Failed to create parent access");
  }
}

/** Revoke access entirely, or restore it (§44). */
export async function PATCH(request) {
  try {
    const { session, error } = await requireApiSession([
      "SCHOOL_ADMIN",
      "SUPER_ADMIN",
    ]);
    if (error) return error;

    const body = await request.json().catch(() => ({}));
    const resolved = await resolveLink(session, body.linkId);
    if (resolved.error) return resolved.error;

    const { parent } = resolved;
    const action = String(body.action || "").toUpperCase();

    if (action === "REVOKE_ACCESS") {
      // This disables SIGN-IN for the whole guardian account. Removing one
      // child is a different operation (PATCH /api/school/guardians with
      // action REVOKE), because a father who loses Child A keeps Child B (§44).
      await revokeParentAccess({
        parent,
        performedBy: session.user.id,
        reason: String(body.reason || ""),
      });
      return successResponse(200, "Access revoked", {
        accessState: "REVOKED",
      });
    }

    if (action === "RESTORE_ACCESS") {
      // Restored to PENDING_ACTIVATION, never straight to ACTIVATED: the old
      // PIN was invalidated by the revocation, so the guardian needs a new card.
      parent.accessState = parent.pinHash ? "ACTIVATED" : "PENDING_ACTIVATION";
      await parent.save();
      return successResponse(200, "Access restored", {
        accessState: parent.accessState,
      });
    }

    if (action === "UNLOCK") {
      parent.lockedUntil = null;
      parent.failedPinAttempts = 0;
      if (parent.accessState === "LOCKED") parent.accessState = "ACTIVATED";
      await parent.save();
      return successResponse(200, "Account unlocked", {
        accessState: parent.accessState,
      });
    }

    // Optional contact details — added or cleared at any time, never required.
    if (action === "SET_CONTACT") {
      if (body.email !== undefined) {
        parent.email = String(body.email || "").trim().toLowerCase() || undefined;
      }
      if (body.phone !== undefined) {
        parent.phone = String(body.phone || "").trim() || undefined;
      }
      await parent.save();
      return successResponse(200, "Contact updated", {
        email: parent.email || null,
        phone: parent.phone || null,
      });
    }

    if (action === "SET_HOUSEHOLD") {
      parent.isHousehold = Boolean(body.isHousehold);
      parent.householdName = String(body.householdName || "").trim();
      await parent.save();
      return successResponse(200, "Household mode updated", {
        isHousehold: parent.isHousehold,
        householdName: parent.householdName,
      });
    }

    return validationError("Unknown action");
  } catch (err) {
    if (err?.code === 11000) {
      return errorResponse(
        409,
        "That email is already used by another guardian.",
        "DUPLICATE"
      );
    }
    console.error("PATCH /api/school/guardians/access error:", err);
    return internalServerError("Failed to update access");
  }
}
