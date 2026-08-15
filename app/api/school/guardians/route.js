import connectDB from "@/lib/db";
import GuardianInvitation, {
  generateInvitationCode,
  hashInvitationCode,
} from "@/models/GuardianInvitation";
import ParentStudentLink, {
  PARENT_RELATIONSHIP_TYPES,
  PARENT_ACCESS_LEVELS,
  applyAccessLevelDefaults,
} from "@/models/ParentStudentLink";
import Parent from "@/models/Parent";
import Student from "@/models/Student";
import { issueParentAccess } from "@/lib/parentCredentials";
import { normalizeParentId } from "@/lib/parentIdentity";
import {
  successResponse,
  errorResponse,
  validationError,
  internalServerError,
} from "@/lib/apiResponse";
import { requireApiSession, getSessionSchoolId, sameId } from "@/lib/authz";

export const dynamic = "force-dynamic";

const INVITATION_TTL_DAYS = 30;

/**
 * Keep exactly one primary guardian per student.
 *
 * A student can have any number of guardians — mother, father, grandparent,
 * legal guardian — but only one is the school's first point of contact. Without
 * this, promoting a second guardian left two "Primary" badges on the row and no
 * way to tell who to ring first.
 *
 * Deliberately a no-op when the caller did not ask for primary: adding a second
 * guardian must never silently strip the first one's status.
 */
async function demoteOtherPrimaries(studentId, keepLinkId, requested) {
  if (requested !== true) return;

  await ParentStudentLink.updateMany(
    {
      student: studentId,
      _id: { $ne: keepLinkId },
      isPrimaryGuardian: true,
    },
    { $set: { isPrimaryGuardian: false } }
  );
}

/**
 * School-side guardian management (§19, §20, §27).
 *
 * The school is the authorisation source for every parent↔student link. This
 * route is what makes that true in practice: guardians are invited here, their
 * permissions are set here, and access is revoked here. Nothing in the parent
 * app can create or widen a link.
 *
 * Only SCHOOL_ADMIN and SUPER_ADMIN may use it — deliberately not TEACHER, since
 * granting a guardian access to a child's record is an administrative decision
 * with safeguarding consequences, not a classroom one.
 */

/** List guardians and outstanding invitations for one student. */
export async function GET(request) {
  try {
    const { session, error } = await requireApiSession([
      "SCHOOL_ADMIN",
      "SUPER_ADMIN",
    ]);
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("studentId");
    if (!studentId) return validationError("studentId is required");

    await connectDB();

    const schoolId = getSessionSchoolId(session);
    const student = await Student.findOne({
      _id: studentId,
      isDeleted: { $ne: true },
    })
      .select("name grade school")
      .lean();

    if (!student) return errorResponse(404, "Student not found", "NOT_FOUND");

    // A school admin may only manage guardians of its own students.
    if (
      session.user.role !== "SUPER_ADMIN" &&
      !sameId(schoolId, student.school)
    ) {
      return errorResponse(403, "Forbidden", "FORBIDDEN");
    }

    const [links, invitations] = await Promise.all([
      ParentStudentLink.find({ student: studentId })
        .sort({ isPrimaryGuardian: -1, createdAt: 1 })
        .populate("parent", "name email phone status lastLoginAt")
        .lean(),
      GuardianInvitation.find({ student: studentId, status: "PENDING" })
        .sort({ createdAt: -1 })
        .select("guardianName email phone codeHint relationshipType accessLevel expiresAt createdAt")
        .lean(),
    ]);

    return successResponse(200, "Guardians loaded", {
      student: {
        id: String(student._id),
        name: student.name,
        grade: student.grade || "",
      },
      guardians: links.map((link) => ({
        id: String(link._id),
        parentId: link.parent ? String(link.parent._id) : null,
        name: link.parent?.name || "",
        email: link.parent?.email || "",
        phone: link.parent?.phone || "",
        relationshipType: link.relationshipType,
        accessLevel: link.accessLevel,
        isPrimaryGuardian: Boolean(link.isPrimaryGuardian),
        status: link.status,
        permissions: {
          canViewPortfolio: link.canViewPortfolio,
          canReceiveNotices: link.canReceiveNotices,
          canRegisterEvents: link.canRegisterEvents,
          canGiveConsent: link.canGiveConsent,
          canMessageSchool: link.canMessageSchool,
        },
        activatedAt: link.activatedAt,
        revokedAt: link.revokedAt,
        lastLoginAt: link.parent?.lastLoginAt || null,
      })),
      pendingInvitations: invitations.map((invitation) => ({
        id: String(invitation._id),
        guardianName: invitation.guardianName,
        email: invitation.email,
        phone: invitation.phone,
        // Last 4 characters only — enough to tell two outstanding invitations
        // apart, not enough to replay one.
        codeHint: invitation.codeHint,
        relationshipType: invitation.relationshipType,
        accessLevel: invitation.accessLevel,
        expiresAt: invitation.expiresAt,
        createdAt: invitation.createdAt,
      })),
    });
  } catch (err) {
    console.error("GET /api/school/guardians error:", err);
    return internalServerError("Failed to load guardians");
  }
}

/**
 * Add a guardian to a student.
 *
 * Two modes, selected by `mode`:
 *
 *  - **`DIRECT` (default, §4/§57 Phase 2).** The school creates the guardian
 *    outright — `Parent` + ACTIVE `ParentStudentLink` — and Parent Access is
 *    issued straight away. **No phone, no email and no password are required**
 *    (§3): identity is the Parent ID printed on the card, contact details are
 *    a separate, optional concern. This is now the primary path.
 *
 *  - **`INVITATION` (legacy, §57 Phase 3).** The original flow: an 8-character
 *    code the guardian redeems after self-registering. Kept working so schools
 *    mid-rollout and codes already handed out are not stranded. Slated for
 *    deprecation after usage review, not deleted now.
 *
 * `existingParentIdentifier` covers §17: connecting a guardian who already has
 * a Pravyo Parent ID to an additional child, rather than creating a duplicate
 * guardian account.
 */
export async function POST(request) {
  try {
    const { session, error } = await requireApiSession([
      "SCHOOL_ADMIN",
      "SUPER_ADMIN",
    ]);
    if (error) return error;

    const body = await request.json().catch(() => ({}));
    const studentId = String(body.studentId || "").trim();

    if (!studentId) return validationError("studentId is required");

    // Both optional — a guardian with neither is entirely valid (§3, §21).
    const email = String(body.email || "").trim().toLowerCase();
    const phone = String(body.phone || "").trim();

    await connectDB();

    const schoolId = getSessionSchoolId(session);
    const student = await Student.findOne({
      _id: studentId,
      isDeleted: { $ne: true },
    })
      .select("name school")
      .lean();

    if (!student) return errorResponse(404, "Student not found", "NOT_FOUND");
    if (
      session.user.role !== "SUPER_ADMIN" &&
      !sameId(schoolId, student.school)
    ) {
      return errorResponse(403, "Forbidden", "FORBIDDEN");
    }

    const relationshipType = PARENT_RELATIONSHIP_TYPES.includes(
      body.relationshipType
    )
      ? body.relationshipType
      : "OTHER";

    const accessLevel = PARENT_ACCESS_LEVELS.includes(body.accessLevel)
      ? body.accessLevel
      : "VIEW_AND_NOTICES";

    // Start from the access-level preset, then let explicit booleans override —
    // shared-custody arrangements need "view + notices, but ALSO consent".
    const preset = applyAccessLevelDefaults({ accessLevel });
    const permissions = {
      canViewPortfolio:
        typeof body.canViewPortfolio === "boolean"
          ? body.canViewPortfolio
          : preset.canViewPortfolio,
      canReceiveNotices:
        typeof body.canReceiveNotices === "boolean"
          ? body.canReceiveNotices
          : preset.canReceiveNotices,
      canRegisterEvents:
        typeof body.canRegisterEvents === "boolean"
          ? body.canRegisterEvents
          : preset.canRegisterEvents,
      canGiveConsent:
        typeof body.canGiveConsent === "boolean"
          ? body.canGiveConsent
          : preset.canGiveConsent,
      canMessageSchool:
        typeof body.canMessageSchool === "boolean"
          ? body.canMessageSchool
          : preset.canMessageSchool,
    };

    const guardianName = String(body.guardianName || "").trim();
    const mode = body.mode === "INVITATION" ? "INVITATION" : "DIRECT";

    // ---- DIRECT: create the guardian and issue a Parent Access Card --------
    if (mode === "DIRECT") {
      if (!guardianName && !body.existingParentIdentifier) {
        return validationError("Guardian name is required");
      }

      let parent;

      if (body.existingParentIdentifier) {
        // §17 — connect an existing guardian to another child. Matching on the
        // Parent ID alone is NOT enough to grant access: the school still has
        // to select the student and take this deliberate action, and it is
        // audited. That is what stops a known Parent ID being used to attach
        // arbitrary children.
        const parentIdentifier = normalizeParentId(body.existingParentIdentifier);
        if (!parentIdentifier) {
          return validationError("That Parent ID is not valid");
        }

        parent = await Parent.findOne({
          parentId: parentIdentifier,
          isDeleted: { $ne: true },
        });

        if (!parent) {
          return errorResponse(
            404,
            "No guardian found with that Parent ID",
            "NOT_FOUND"
          );
        }
      } else {
        // A brand-new guardian. No password: this account authenticates with
        // the Parent ID + PIN from the printed card.
        parent = await Parent.create({
          name: guardianName,
          email: email || undefined,
          phone: phone || undefined,
          status: "ACTIVE",
          accessState: "NOT_CREATED",
          isHousehold: Boolean(body.isHousehold),
          householdName: String(body.householdName || "").trim(),
        });
      }

      // Household accounts cannot evidence WHICH guardian decided, so consent
      // is withheld unless the school explicitly overrides it (§20).
      const effectivePermissions = { ...permissions };
      if (parent.isHousehold && body.canGiveConsent !== true) {
        effectivePermissions.canGiveConsent = false;
      }

      const existingLink = await ParentStudentLink.findOne({
        parent: parent._id,
        student: studentId,
      });

      let link;
      if (existingLink) {
        Object.assign(existingLink, {
          school: student.school,
          relationshipType,
          accessLevel,
          ...effectivePermissions,
          isPrimaryGuardian: Boolean(body.isPrimaryGuardian),
          status: "ACTIVE",
          activatedAt: new Date(),
          revokedAt: null,
          revokedBy: null,
          revokedReason: "",
        });
        link = await existingLink.save();
      } else {
        link = await ParentStudentLink.create({
          parent: parent._id,
          student: studentId,
          school: student.school,
          relationshipType,
          accessLevel,
          ...effectivePermissions,
          isPrimaryGuardian: Boolean(body.isPrimaryGuardian),
          invitedBy: session.user.id,
          // The school established this relationship in person, so it is
          // active immediately — there is no code for the parent to redeem.
          status: "ACTIVE",
          activatedAt: new Date(),
        });
      }

      // A student has one primary guardian. Naming a new one demotes the old,
      // otherwise the roster shows two "Primary" badges and nothing decides
      // which guardian the school should contact first.
      await demoteOtherPrimaries(studentId, link._id, body.isPrimaryGuardian);

      // An existing, already-activated guardian gaining a second child does
      // NOT need a new card — their Parent ID and PIN already work, and
      // reissuing would invalidate the PIN they are using.
      const needsCard = parent.accessState !== "ACTIVATED";

      const issued = needsCard
        ? await issueParentAccess({
            parent,
            schoolId: student.school,
            studentId,
            issuedBy: session.user.id,
            purpose: parent.accessState === "NOT_CREATED" ? "INITIAL" : "REISSUE",
          })
        : null;

      return successResponse(201, "Guardian added", {
        mode: "DIRECT",
        linkId: String(link._id),
        parentIdentifier: parent.parentId,
        guardianName: parent.name,
        student: { id: String(student._id), name: student.name },
        // Present only when a card was issued; shown exactly once.
        card: issued
          ? {
              activationPin: issued.activationPin,
              activationToken: issued.activationToken,
              activationId: issued.activationId,
              expiresAt: issued.expiresAt,
            }
          : null,
        alreadyActivated: !needsCard,
      });
    }

    // ---- INVITATION: the legacy code flow, retained (§57) -------------------
    const code = generateInvitationCode(8);

    const invitation = await GuardianInvitation.create({
      student: studentId,
      school: student.school,
      codeHash: hashInvitationCode(code),
      codeHint: code.slice(-4),
      guardianName,
      email,
      phone,
      relationshipType,
      accessLevel,
      permissions,
      isPrimaryGuardian: Boolean(body.isPrimaryGuardian),
      expiresAt: new Date(
        Date.now() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000
      ),
      createdBy: session.user.id,
    });

    return successResponse(201, "Invitation created", {
      invitationId: String(invitation._id),
      // Shown once. Delivery (email/SMS) is left to the school for now — see
      // §21; the infrastructure for parent SMS does not exist yet.
      code,
      expiresAt: invitation.expiresAt,
      student: { id: String(student._id), name: student.name },
    });
  } catch (err) {
    console.error("POST /api/school/guardians error:", err);
    return internalServerError("Failed to create invitation");
  }
}

/**
 * Update a guardian's permissions, or revoke their access entirely (§20).
 *
 * Revocation is immediate: lib/parentAccess.js only ever matches ACTIVE links,
 * so the guardian loses the child from their switcher on their next request.
 */
export async function PATCH(request) {
  try {
    const { session, error } = await requireApiSession([
      "SCHOOL_ADMIN",
      "SUPER_ADMIN",
    ]);
    if (error) return error;

    const body = await request.json().catch(() => ({}));
    const linkId = String(body.linkId || "").trim();
    if (!linkId) return validationError("linkId is required");

    await connectDB();

    const link = await ParentStudentLink.findById(linkId);
    if (!link) return errorResponse(404, "Guardian link not found", "NOT_FOUND");

    const schoolId = getSessionSchoolId(session);
    if (session.user.role !== "SUPER_ADMIN" && !sameId(schoolId, link.school)) {
      return errorResponse(403, "Forbidden", "FORBIDDEN");
    }

    if (body.action === "REVOKE") {
      link.status = "REVOKED";
      link.revokedAt = new Date();
      link.revokedBy = session.user.id;
      link.revokedReason = String(body.reason || "").trim();
      await link.save();

      return successResponse(200, "Access revoked", { id: String(link._id) });
    }

    if (body.action === "REACTIVATE") {
      link.status = "ACTIVE";
      link.activatedAt = new Date();
      link.revokedAt = null;
      link.revokedBy = null;
      link.revokedReason = "";
      await link.save();

      return successResponse(200, "Access restored", { id: String(link._id) });
    }

    if (PARENT_ACCESS_LEVELS.includes(body.accessLevel)) {
      link.accessLevel = body.accessLevel;
      applyAccessLevelDefaults(link);
    }
    if (PARENT_RELATIONSHIP_TYPES.includes(body.relationshipType)) {
      link.relationshipType = body.relationshipType;
    }

    // Explicit booleans win over the preset applied above.
    [
      "canViewPortfolio",
      "canReceiveNotices",
      "canRegisterEvents",
      "canGiveConsent",
      "canMessageSchool",
    ].forEach((key) => {
      if (typeof body[key] === "boolean") link[key] = body[key];
    });

    if (typeof body.isPrimaryGuardian === "boolean") {
      link.isPrimaryGuardian = body.isPrimaryGuardian;
    }

    await link.save();

    // Promoting this guardian demotes whoever held it before.
    await demoteOtherPrimaries(link.student, link._id, body.isPrimaryGuardian);

    return successResponse(200, "Guardian updated", { id: String(link._id) });
  } catch (err) {
    console.error("PATCH /api/school/guardians error:", err);
    return internalServerError("Failed to update guardian");
  }
}
