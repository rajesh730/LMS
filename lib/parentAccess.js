import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { errorResponse } from "@/lib/apiResponse";
import connectDB from "@/lib/db";
import Parent from "@/models/Parent";
import ParentStudentLink from "@/models/ParentStudentLink";
import Student from "@/models/Student";
import User from "@/models/User";

/**
 * The single authorisation gate for every parent-facing API (§28).
 *
 * The rule this file exists to enforce:
 *
 *     NEVER trust a studentId from the client.
 *
 * A parent request naming a child is a CLAIM. `requireParentChild` turns that
 * claim into a fact by walking:
 *
 *     session → Parent (active) → ParentStudentLink (ACTIVE) → Student → permission
 *
 * and returns the resolved student only if every step holds. Route handlers
 * must not query Student by a client-supplied id themselves; they should take
 * the `student` this module hands back.
 *
 * A second, quieter rule: the resolved child also determines the SCHOOL. Every
 * downstream query is scoped to `context.schoolId`, which comes from the
 * student record — never from the request — so a parent with children at two
 * schools can never see one school's data under the other child (§36).
 */

// The permission flags on ParentStudentLink, in the form callers name them.
export const PARENT_PERMISSIONS = [
  "canViewPortfolio",
  "canReceiveNotices",
  "canRegisterEvents",
  "canGiveConsent",
  "canMessageSchool",
];

/**
 * How long a SHARED-device session stays trusted (§12).
 *
 * Thirty minutes covers a normal sitting with the app while making an
 * abandoned phone in a shop or a neighbour's handset safe reasonably quickly.
 * Enforced HERE, server-side, so it cannot be bypassed by clearing storage or
 * editing a client flag.
 *
 * The guardian is sent back to sign in rather than challenged for a PIN —
 * there is no PIN any more, and re-entering a Parent ID is a smaller ask than
 * the challenge screen it replaces.
 */
export const SHARED_DEVICE_IDLE_MS = 30 * 60 * 1000;

/**
 * Resolve the signed-in guardian. Returns `{ error }` for anyone who is not an
 * active parent, so callers can `if (error) return error;` in one line.
 */
export async function requireParentSession() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || session.user.role !== "PARENT") {
    return {
      error: errorResponse(401, "Parent sign-in required", "UNAUTHORIZED"),
    };
  }

  await connectDB();

  const parent = await Parent.findOne({
    _id: session.user.id,
    isDeleted: { $ne: true },
    status: "ACTIVE",
  })
    .select("name email phone photoUrl preferences status authVersion")
    .lean();

  if (!parent) {
    // The token outlived the account (deleted or suspended by the school).
    return {
      error: errorResponse(401, "Parent account is not active", "UNAUTHORIZED"),
    };
  }

  // Access revoked by the school — the token may still be within its lifetime.
  if (parent.accessState === "REVOKED") {
    return {
      error: errorResponse(
        401,
        "Your access has been removed. Please contact your school.",
        "ACCESS_REVOKED"
      ),
    };
  }

  // Shared-device idle timeout. A distinct code so the app can say "your
  // session ended because this is a shared phone" rather than presenting what
  // looks like an unexplained sign-out.
  if (session.user.deviceMode === "SHARED") {
    const signedInAt = Number(session.user.signedInAt) || 0;
    if (!signedInAt || Date.now() - signedInAt > SHARED_DEVICE_IDLE_MS) {
      return {
        error: errorResponse(
          401,
          "You have been signed out because this is a shared phone. Please sign in again.",
          "SESSION_EXPIRED"
        ),
      };
    }
  }

  return { session, parent };
}

/**
 * Every ACTIVE link for this guardian, newest child first, with the student and
 * school resolved. This is what the child switcher renders, and it is also the
 * allow-list used to validate any studentId the client sends.
 *
 * Deliberately does NOT include PENDING or REVOKED links: a pending invitation
 * grants nothing, and a revoked one must disappear immediately.
 */
export async function getParentChildren(parentId) {
  await connectDB();

  const links = await ParentStudentLink.find({
    parent: parentId,
    status: "ACTIVE",
  })
    .sort({ isPrimaryGuardian: -1, createdAt: 1 })
    .lean();

  if (links.length === 0) return [];

  const studentIds = links.map((link) => link.student);

  // Graduated and transferred children stay visible — history is not deleted
  // when a student leaves (§25). Only soft-deleted records drop out.
  const students = await Student.find({
    _id: { $in: studentIds },
    isDeleted: { $ne: true },
  })
    .select("name firstName lastName grade school status enrollments photoUrl")
    .lean();

  const studentById = new Map(students.map((s) => [String(s._id), s]));

  // Resolve every school named by a current enrolment in one query.
  const schoolIds = Array.from(
    new Set(students.map((s) => String(s.school)).filter(Boolean))
  );
  const schools = await User.find({ _id: { $in: schoolIds } })
    .select("schoolName name")
    .lean();
  const schoolById = new Map(
    schools.map((s) => [
      String(s._id),
      { id: String(s._id), name: s.schoolName || s.name || "School" },
    ])
  );

  return links
    .map((link) => {
      const student = studentById.get(String(link.student));
      if (!student) return null;

      const school = schoolById.get(String(student.school)) || {
        id: String(student.school || ""),
        name: "School",
      };

      return {
        linkId: String(link._id),
        studentId: String(student._id),
        name: student.name,
        grade: student.grade || "",
        photoUrl: student.photoUrl || "",
        status: student.status,
        school,
        relationshipType: link.relationshipType,
        accessLevel: link.accessLevel,
        isPrimaryGuardian: Boolean(link.isPrimaryGuardian),
        permissions: pickPermissions(link),
      };
    })
    .filter(Boolean);
}

function pickPermissions(link) {
  return PARENT_PERMISSIONS.reduce((acc, key) => {
    acc[key] = Boolean(link?.[key]);
    return acc;
  }, {});
}

/**
 * Authorise a guardian for one specific child, optionally requiring a
 * permission.
 *
 * @param {string}  studentId   The claim from the client. Validated, not trusted.
 * @param {string}  permission  One of PARENT_PERMISSIONS, or null for read access.
 *
 * Returns `{ error }` on any failure, or a context object carrying the
 * VERIFIED student, school and permissions. Handlers should use
 * `context.studentId` / `context.schoolId` for all downstream queries rather
 * than re-reading the request.
 *
 * Failure modes are deliberately indistinguishable to the caller: an
 * unauthorised student and a nonexistent student both return the same 403, so
 * this endpoint cannot be used to probe which student ids exist.
 */
export async function requireParentChild(studentId, permission = null) {
  const { session, parent, error } = await requireParentSession();
  if (error) return { error };

  const requestedId = String(studentId || "").trim();
  if (!requestedId) {
    return {
      error: errorResponse(400, "A child must be selected", "STUDENT_REQUIRED"),
    };
  }

  await connectDB();

  const link = await ParentStudentLink.findOne({
    parent: parent._id || session.user.id,
    student: requestedId,
    status: "ACTIVE",
  }).lean();

  if (!link) {
    return {
      error: errorResponse(
        403,
        "You do not have access to this student",
        "FORBIDDEN"
      ),
    };
  }

  const student = await Student.findOne({
    _id: requestedId,
    isDeleted: { $ne: true },
  })
    .select(
      "name firstName lastName grade rollNumber school status enrollments photoUrl platformStudentId"
    )
    .lean();

  if (!student) {
    // Same shape as the no-link case on purpose — see the note above.
    return {
      error: errorResponse(
        403,
        "You do not have access to this student",
        "FORBIDDEN"
      ),
    };
  }

  const permissions = pickPermissions(link);

  if (permission && !permissions[permission]) {
    return {
      error: errorResponse(
        403,
        PERMISSION_DENIED_MESSAGES[permission] ||
          "You do not have permission for this action",
        "PERMISSION_DENIED"
      ),
    };
  }

  const school = await User.findById(student.school)
    .select("schoolName name status")
    .lean();

  return {
    session,
    parent,
    link,
    student,
    permissions,
    context: {
      parentId: String(parent._id || session.user.id),
      studentId: String(student._id),
      // Always the student's CURRENT school, resolved server-side.
      schoolId: student.school ? String(student.school) : null,
      schoolName: school?.schoolName || school?.name || "School",
      permissions,
    },
  };
}

// Phrased for a parent, not an engineer — these surface directly in the app.
const PERMISSION_DENIED_MESSAGES = {
  canViewPortfolio:
    "The school has not given you access to this child's portfolio.",
  canReceiveNotices: "The school has not set you up to receive notices.",
  canRegisterEvents:
    "Only a guardian approved by the school can register this child for events.",
  canGiveConsent:
    "Only a guardian approved by the school can give permission for this child.",
  canMessageSchool:
    "The school has not enabled messaging for your account.",
};

/**
 * Pick which child a request is for when the client did not name one.
 *
 * Used by screens that open on "the last child I was looking at" — the child
 * switcher persists a selection client-side, but the server still validates it,
 * and falls back to the primary guardian's first child rather than erroring.
 */
export async function resolveDefaultChild(parentId, preferredStudentId = null) {
  const children = await getParentChildren(parentId);
  if (children.length === 0) return null;

  if (preferredStudentId) {
    const match = children.find(
      (child) => child.studentId === String(preferredStudentId)
    );
    if (match) return match;
  }

  return children[0];
}
