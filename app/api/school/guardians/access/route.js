import connectDB from "@/lib/db";
import Parent from "@/models/Parent";
import ParentStudentLink from "@/models/ParentStudentLink";
import User from "@/models/User";
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

    return successResponse(200, "Access status", {
      // The Parent ID is now the guardian's credential, so this response is
      // staff-only by definition — `requireApiSession` above is what keeps it
      // that way. It is still shown, because school staff are the ones who
      // read it back to a guardian who has mislaid their card.
      parentIdentifier: parent.parentId || null,
      accessState: parent.accessState,
      activatedAt: parent.activatedAt,
      lastLoginAt: parent.lastLoginAt,
      isHousehold: Boolean(parent.isHousehold),
      contact: {
        email: parent.email || null,
        phone: parent.phone || null,
      },
      relationshipStatus: link.status,
    });
  } catch (err) {
    console.error("GET /api/school/guardians/access error:", err);
    return internalServerError("Failed to load access status");
  }
}

/**
 * Issue Parent Access — a first card, or a replacement for a lost one.
 *
 * `REISSUE` **rotates the Parent ID**, because the ID is the credential: a
 * replacement card that carried the same ID would leave the lost card working.
 * That is why the school UI words it as "New card — the old card stops
 * working" and why an already-connected guardian is never reissued by accident.
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

    const purpose = ["INITIAL", "REISSUE"].includes(body.purpose)
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

    const school = await User.findById(link.school)
      .select("schoolName name")
      .lean();

    return successResponse(201, "Parent access created", {
      schoolName: school?.schoolName || school?.name || "Your school",
      parentIdentifier: issued.parentIdentifier,
      // True when the guardian's previous card was invalidated by this call.
      rotated: issued.rotated,
      linkId: String(link._id),
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
      // A guardian who had already connected goes back to ACTIVATED and their
      // existing card works again — revocation suspends access, it does not
      // rotate the Parent ID (see `revokeParentAccess`). One who never got that
      // far returns to waiting-to-connect.
      parent.accessState = parent.activatedAt ? "ACTIVATED" : "PENDING_ACTIVATION";
      await parent.save();
      return successResponse(200, "Access restored", {
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
