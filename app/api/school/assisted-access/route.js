import connectDB from "@/lib/db";
import Student from "@/models/Student";
import Parent from "@/models/Parent";
import ParentStudentLink from "@/models/ParentStudentLink";
import AuditLog from "@/models/AuditLog";
import {
  successResponse,
  errorResponse,
  validationError,
  internalServerError,
} from "@/lib/apiResponse";
import { requireApiSession, getSessionSchoolId, sameId } from "@/lib/authz";
import { buildStudentJourney } from "@/lib/parentJourney";

export const dynamic = "force-dynamic";

/**
 * School-Assisted Parent Access (§22, §55).
 *
 * For the guardian with no device at all who walks into the school office. A
 * staff member verifies them in person and shows them their child's Pravyo
 * record on a school screen.
 *
 * **This does NOT impersonate the guardian.** The staff member stays signed in
 * as themselves and a restricted, read-only projection is returned. Session
 * switching would create a far larger attack surface — a staff account able to
 * mint parent sessions — for exactly the same outcome.
 *
 * Every safeguard §55 demands is enforced here, in order:
 *   1. staff authentication            (requireApiSession)
 *   2. same-school validation          (tenant check below)
 *   3. explicit student selection      (studentId is required)
 *   4. guardian relationship validation (an ACTIVE link must exist)
 *   5. explicit assisted-access action  (this endpoint only)
 *   6. audit logging                    (written before the data is returned)
 *   7. restricted view                  (allow-listed fields only)
 *
 * There is deliberately NO "view any parent" entry point.
 */
export async function POST(request) {
  try {
    const { session, error } = await requireApiSession([
      "SCHOOL_ADMIN",
      "SUPER_ADMIN",
      "TEACHER",
    ]);
    if (error) return error;

    const body = await request.json().catch(() => ({}));
    const studentId = String(body.studentId || "").trim();
    const linkId = String(body.linkId || "").trim();
    const reason = String(body.reason || "").trim();

    if (!studentId || !linkId) {
      return validationError("Select a student and a guardian");
    }
    // A required reason makes the audit trail meaningful rather than a list of
    // timestamps, and makes casual browsing feel like what it is.
    if (!reason) {
      return validationError("Please record why you are opening this view");
    }

    await connectDB();

    const student = await Student.findOne({
      _id: studentId,
      isDeleted: { $ne: true },
    })
      .select("name grade school status enrollments photoUrl rollNumber")
      .lean();

    if (!student) return errorResponse(404, "Student not found", "NOT_FOUND");

    // (2) Same-school validation.
    const schoolId = getSessionSchoolId(session);
    if (
      session.user.role !== "SUPER_ADMIN" &&
      !sameId(schoolId, student.school)
    ) {
      return errorResponse(404, "Student not found", "NOT_FOUND");
    }

    // (4) The guardian must genuinely be this child's guardian.
    const link = await ParentStudentLink.findOne({
      _id: linkId,
      student: studentId,
      status: "ACTIVE",
    }).lean();

    if (!link) {
      return errorResponse(
        404,
        "That guardian is not linked to this student",
        "NOT_FOUND"
      );
    }

    if (
      session.user.role !== "SUPER_ADMIN" &&
      !sameId(schoolId, link.school)
    ) {
      return errorResponse(404, "Guardian not found", "NOT_FOUND");
    }

    const parent = await Parent.findById(link.parent)
      .select("name parentId isHousehold householdName")
      .lean();

    if (!parent) return errorResponse(404, "Guardian not found", "NOT_FOUND");

    // (6) Audit BEFORE returning anything, so a crash mid-response still leaves
    // a record that the view was opened.
    await AuditLog.create({
      entityType: "AssistedParentAccess",
      entityId: student._id,
      action: "ASSISTED_PARENT_VIEW_OPENED",
      performedBy: session.user.id,
      role: session.user.role,
      reason,
      after: {
        guardian: String(parent._id),
        guardianName: parent.name,
        student: String(student._id),
        studentName: student.name,
        school: String(student.school),
        openedAt: new Date(),
      },
    });

    // (7) Restricted view. The guardian's own permissions still apply — an
    // assisted session must not show more than that guardian could see at home.
    const journey = link.canViewPortfolio
      ? await buildStudentJourney(student._id)
      : null;

    return successResponse(200, "Assisted view opened", {
      guardian: {
        name: parent.isHousehold
          ? parent.householdName || parent.name
          : parent.name,
        relationshipType: link.relationshipType,
        parentIdentifier: parent.parentId || null,
      },
      child: {
        name: student.name,
        grade: student.grade || "",
        rollNumber: student.rollNumber || "",
        photoUrl: student.photoUrl || "",
        status: student.status,
      },
      permissions: {
        canViewPortfolio: link.canViewPortfolio,
        canReceiveNotices: link.canReceiveNotices,
      },
      // Portfolio content only. Explicitly ABSENT and never queried here:
      // another guardian's messages, teacher-only notes, disciplinary records,
      // administrative flags (§22).
      journey: journey
        ? {
            entries: journey.entries.slice(0, 40),
            counts: journey.counts,
            schools: journey.schools,
          }
        : null,
      // Assisted sessions are a single request/response, not a persistent
      // session — nothing to expire, nothing to steal.
      viewedBy: session.user.name || session.user.email,
      viewedAt: new Date(),
    });
  } catch (err) {
    console.error("POST /api/school/assisted-access error:", err);
    return internalServerError("Failed to open assisted view");
  }
}
