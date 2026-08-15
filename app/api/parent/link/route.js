import connectDB from "@/lib/db";
import GuardianInvitation, {
  hashInvitationCode,
  MAX_INVITATION_ATTEMPTS,
} from "@/models/GuardianInvitation";
import ParentStudentLink, {
  applyAccessLevelDefaults,
} from "@/models/ParentStudentLink";
import Student from "@/models/Student";
import {
  successResponse,
  errorResponse,
  validationError,
  internalServerError,
} from "@/lib/apiResponse";
import { requireParentSession } from "@/lib/parentAccess";
import { applyRateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

/**
 * Accept a guardian invitation code and activate the link (§27).
 *
 * This is the ONLY way a ParentStudentLink becomes ACTIVE from the parent side.
 * A parent can never search for a student and attach themselves (§26) — they
 * can only redeem a code the school generated for a specific student.
 *
 * Defences against code guessing, since a short code is inherently
 * brute-forceable:
 *   1. Per-IP rate limit, which bounds an anonymous grind.
 *   2. Per-ACCOUNT rate limit, which bounds an attacker who rotates IPs — they
 *      still need a signed-in parent account to reach this endpoint at all.
 *   3. Per-invitation attempt counter, which burns out a specific invitation
 *      that is being probed after it has been found.
 *   4. Codes are stored hashed, so a database leak is not directly replayable.
 *
 * The counter in (3) can only be incremented once an invitation has been
 * located, so the rate limits in (1) and (2) — not the counter — are what bound
 * blind guessing of codes that do not exist.
 */
export async function POST(request) {
  try {
    const { parent, error } = await requireParentSession();
    if (error) return error;

    const ip =
      String(request.headers.get("x-forwarded-for") || "")
        .split(",")[0]
        .trim() || "unknown";

    // Both limits must pass. The per-account limit is the one that matters:
    // reaching this endpoint requires a session, so an attacker cannot escape
    // it by changing IP.
    const [ipRate, accountRate] = await Promise.all([
      applyRateLimit({
        key: `parent-link-ip:${ip}`,
        windowMs: 10 * 60 * 1000,
        max: 10,
      }),
      applyRateLimit({
        key: `parent-link-account:${parent._id}`,
        windowMs: 60 * 60 * 1000,
        max: 15,
      }),
    ]);

    const limited = !ipRate.ok ? ipRate : !accountRate.ok ? accountRate : null;
    if (limited) {
      return errorResponse(
        429,
        `Too many attempts. Try again in ${limited.retryAfter}s.`,
        "RATE_LIMITED"
      );
    }

    const body = await request.json().catch(() => ({}));
    const code = String(body.code || "").trim().toUpperCase();

    if (!code) return validationError("Please enter your invitation code");

    await connectDB();

    const invitation = await GuardianInvitation.findOne({
      codeHash: hashInvitationCode(code),
      status: "PENDING",
    });

    // One generic message for every failure mode — wrong code, expired code,
    // already-used code. Distinguishing them would tell an attacker when they
    // had found a real code.
    const invalid = () =>
      errorResponse(
        400,
        "That code is not valid. Please check with your school.",
        "INVALID_INVITATION"
      );

    if (!invitation) return invalid();

    // From here on the code was correct, so any failure is charged against the
    // invitation itself. An invitation probed past the cap is dead and the
    // school must issue a new one.
    const burnAttempt = async () => {
      invitation.attemptCount = (invitation.attemptCount || 0) + 1;
      await invitation.save();
      return invalid();
    };

    if (invitation.attemptCount >= MAX_INVITATION_ATTEMPTS) {
      return invalid();
    }

    if (invitation.expiresAt && invitation.expiresAt < new Date()) {
      invitation.status = "EXPIRED";
      await invitation.save();
      return invalid();
    }

    const student = await Student.findOne({
      _id: invitation.student,
      isDeleted: { $ne: true },
    })
      .select("name grade school")
      .lean();

    if (!student) return burnAttempt();

    // Reuse the existing row for this parent+student pair if there is one — a
    // re-invitation after a revocation must reactivate, not collide with the
    // unique index.
    const existing = await ParentStudentLink.findOne({
      parent: parent._id,
      student: invitation.student,
    });

    const permissions = invitation.permissions || {};
    const linkFields = {
      parent: parent._id,
      student: invitation.student,
      school: invitation.school,
      relationshipType: invitation.relationshipType || "OTHER",
      accessLevel: invitation.accessLevel || "VIEW_AND_NOTICES",
      canViewPortfolio: permissions.canViewPortfolio ?? true,
      canReceiveNotices: permissions.canReceiveNotices ?? true,
      canRegisterEvents: permissions.canRegisterEvents ?? false,
      canGiveConsent: permissions.canGiveConsent ?? false,
      canMessageSchool: permissions.canMessageSchool ?? false,
      isPrimaryGuardian: Boolean(invitation.isPrimaryGuardian),
      invitedBy: invitation.createdBy,
      status: "ACTIVE",
      activatedAt: new Date(),
      revokedAt: null,
      revokedBy: null,
      revokedReason: "",
    };

    if (existing) {
      Object.assign(existing, linkFields);
      await existing.save();
    } else {
      await ParentStudentLink.create(linkFields);
    }

    invitation.status = "ACCEPTED";
    invitation.acceptedBy = parent._id;
    invitation.acceptedAt = new Date();
    await invitation.save();

    return successResponse(200, "Connected", {
      child: {
        studentId: String(student._id),
        name: student.name,
        grade: student.grade || "",
      },
    });
  } catch (err) {
    console.error("POST /api/parent/link error:", err);
    return internalServerError("Failed to connect to your child");
  }
}
