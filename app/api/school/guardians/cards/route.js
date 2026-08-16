import connectDB from "@/lib/db";
import Student from "@/models/Student";
import Parent from "@/models/Parent";
import ParentStudentLink from "@/models/ParentStudentLink";
import User from "@/models/User";
import AuditLog from "@/models/AuditLog";
import {
  successResponse,
  errorResponse,
  validationError,
  internalServerError,
} from "@/lib/apiResponse";
import { requireApiSession, getSessionSchoolId } from "@/lib/authz";
import { getEquivalentGradeValues } from "@/lib/schoolGrades";
import { issueParentAccess } from "@/lib/parentCredentials";

export const dynamic = "force-dynamic";

// A print run has to stay something a school office can actually handle in one
// go, and each card costs a database write.
const MAX_CARDS_PER_RUN = 300;

/**
 * Issue Parent Access Cards in bulk — a whole grade, or selected students.
 *
 * This is how a school onboards a class at once: generate, print, hand out at
 * the gate. Without it, connecting 400 families means 400 individual clicks.
 *
 * **A bulk run is non-destructive.** It only ever allocates a Parent ID to a
 * guardian who has none; it never rotates one that already exists. So a jammed
 * printer, a second run over an overlapping grade, or a reprint for a family
 * that mislaid the sheet all cost nothing — the same card comes out again.
 *
 * That is a change from the previous design, where every run minted a fresh
 * one-time PIN and silently killed the last card. Rotating an ID is now a
 * single, deliberate, per-guardian action ("New card") because it is the one
 * thing that locks a guardian out.
 *
 * Guardians who have already signed in are still skipped by default — printing
 * paper for a family that does not need it is waste, not danger — and
 * `includeActivated` brings them back in for a genuine reprint.
 */

/** Preview: how many cards would this run produce? */
export async function GET(request) {
  try {
    const { session, error } = await requireApiSession([
      "SCHOOL_ADMIN",
      "SUPER_ADMIN",
    ]);
    if (error) return error;

    await connectDB();

    const { searchParams } = new URL(request.url);
    const schoolId = getSessionSchoolId(session);
    const grade = searchParams.get("grade") || "";

    const candidates = await collectCandidates({ schoolId, grade });

    return successResponse(200, "Card run preview", {
      grade: grade || "All grades",
      total: candidates.length,
      needCard: candidates.filter((c) => !c.alreadyActivated).length,
      alreadyActivated: candidates.filter((c) => c.alreadyActivated).length,
      cap: MAX_CARDS_PER_RUN,
    });
  } catch (err) {
    console.error("GET /api/school/guardians/cards error:", err);
    return internalServerError("Failed to preview the card run");
  }
}

/** Generate the cards. */
export async function POST(request) {
  try {
    const { session, error } = await requireApiSession([
      "SCHOOL_ADMIN",
      "SUPER_ADMIN",
    ]);
    if (error) return error;

    const body = await request.json().catch(() => ({}));
    const grade = body.grade || "";
    const studentIds = Array.isArray(body.studentIds) ? body.studentIds : null;
    const includeActivated = body.includeActivated === true;

    if (!grade && !studentIds && body.scope !== "ALL") {
      // An explicit scope stops a whole school being reissued by accident.
      return validationError("Choose a grade, some students, or confirm all");
    }

    await connectDB();

    const schoolId = getSessionSchoolId(session);
    const school = await User.findById(schoolId)
      .select("schoolName name")
      .lean();

    let candidates = await collectCandidates({ schoolId, grade, studentIds });

    if (!includeActivated) {
      candidates = candidates.filter((c) => !c.alreadyActivated);
    }

    if (candidates.length === 0) {
      return successResponse(200, "Nothing to print", { cards: [] });
    }

    if (candidates.length > MAX_CARDS_PER_RUN) {
      return errorResponse(
        400,
        `That would print ${candidates.length} cards. Please do it one grade at a time (maximum ${MAX_CARDS_PER_RUN}).`,
        "TOO_MANY"
      );
    }

    const cards = [];
    const failures = [];

    // Sequential: a burst of 300 writes in parallel would exhaust the small
    // serverless connection pool.
    for (const candidate of candidates) {
      try {
        const parent = await Parent.findById(candidate.parentId);
        if (!parent) continue;

        // Always INITIAL. Never REISSUE from a bulk run — see the note above.
        const issued = await issueParentAccess({
          parent,
          schoolId,
          studentId: candidate.studentId,
          issuedBy: session.user.id,
          purpose: "INITIAL",
        });

        cards.push({
          studentName: candidate.studentName,
          studentGrade: candidate.studentGrade,
          guardianName: candidate.guardianName,
          relationshipLabel: candidate.relationshipLabel,
          parentIdentifier: issued.parentIdentifier,
        });
      } catch (err) {
        failures.push({
          studentName: candidate.studentName,
          reason: err.message,
        });
      }
    }

    await AuditLog.create({
      entityType: "ParentAccessBulk",
      entityId: schoolId,
      action: "PARENT_ACCESS_CARDS_BULK_ISSUED",
      performedBy: session.user.id,
      role: session.user.role,
      reason: grade ? `Grade: ${grade}` : studentIds ? "Selected students" : "All students",
      after: { issued: cards.length, failed: failures.length, includeActivated },
    }).catch(() => {});

    return successResponse(200, "Cards ready", {
      schoolName: school?.schoolName || school?.name || "School",
      cards,
      failures,
    });
  } catch (err) {
    console.error("POST /api/school/guardians/cards error:", err);
    return internalServerError("Failed to generate cards");
  }
}

/**
 * Every guardian who could receive a card for this selection.
 *
 * Three bulk queries regardless of class size — students, their ACTIVE links,
 * then the parents behind those links.
 */
async function collectCandidates({ schoolId, grade, studentIds = null }) {
  const studentQuery = {
    school: schoolId,
    isDeleted: { $ne: true },
    status: { $ne: "INACTIVE" },
  };

  if (Array.isArray(studentIds) && studentIds.length > 0) {
    studentQuery._id = { $in: studentIds };
  } else if (grade) {
    // "9" / "Grade 9" / "Class 9" all occur in production data.
    studentQuery.grade = { $in: getEquivalentGradeValues(grade) };
  }

  const students = await Student.find(studentQuery)
    .sort({ grade: 1, rollNumber: 1, name: 1 })
    .select("name grade")
    .lean();

  if (students.length === 0) return [];

  const links = await ParentStudentLink.find({
    student: { $in: students.map((s) => s._id) },
    status: "ACTIVE",
  })
    .select("parent student relationshipType isPrimaryGuardian")
    .lean();

  if (links.length === 0) return [];

  const parents = await Parent.find({
    _id: { $in: Array.from(new Set(links.map((l) => String(l.parent)))) },
    isDeleted: { $ne: true },
    status: "ACTIVE",
  })
    .select("name accessState isHousehold householdName")
    .lean();

  const parentById = new Map(parents.map((p) => [String(p._id), p]));
  const studentById = new Map(students.map((s) => [String(s._id), s]));

  return links
    .map((link) => {
      const parent = parentById.get(String(link.parent));
      const student = studentById.get(String(link.student));
      if (!parent || !student) return null;

      return {
        parentId: String(parent._id),
        studentId: String(student._id),
        studentName: student.name,
        studentGrade: student.grade || "",
        guardianName: parent.isHousehold
          ? parent.householdName || parent.name
          : parent.name,
        relationshipLabel: String(link.relationshipType || "Guardian")
          .replaceAll("_", " ")
          .toLowerCase()
          .replace(/\b\w/g, (char) => char.toUpperCase()),
        // Excluded by default to save paper, not for safety: a reprint is
        // harmless now that the card carries only the Parent ID.
        alreadyActivated: parent.accessState === "ACTIVATED",
        isPrimaryGuardian: Boolean(link.isPrimaryGuardian),
      };
    })
    .filter(Boolean)
    .sort(
      (a, b) =>
        a.studentGrade.localeCompare(b.studentGrade) ||
        a.studentName.localeCompare(b.studentName)
    );
}
