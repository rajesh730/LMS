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
// go, and each card costs a bcrypt hash plus two writes.
const MAX_CARDS_PER_RUN = 300;

/**
 * Issue Parent Access Cards in bulk — a whole grade, or selected students.
 *
 * This is how a school onboards a class at once: generate, print, hand out at
 * the gate. Without it, connecting 400 families means 400 individual clicks.
 *
 * ⚠️ **Issuing a card invalidates that guardian's previous card** (see
 * `issueParentAccess`). That is correct for a lost card but destructive if run
 * casually over a class where half the parents are already connected — so
 * guardians who have **already activated are skipped by default**. Reprinting
 * for them needs `includeActivated`, which the UI asks about explicitly.
 *
 * The plaintext PINs and tokens exist ONLY in this response. They are hashed at
 * rest and can never be re-read, so the client must render them to a print view
 * immediately. Reloading that view will not bring them back — by design.
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

    // Sequential: each card is a bcrypt hash plus writes, and a burst of 300
    // in parallel would exhaust the small serverless connection pool.
    for (const candidate of candidates) {
      try {
        const parent = await Parent.findById(candidate.parentId);
        if (!parent) continue;

        const issued = await issueParentAccess({
          parent,
          schoolId,
          studentId: candidate.studentId,
          issuedBy: session.user.id,
          purpose: parent.accessState === "NOT_CREATED" ? "INITIAL" : "REISSUE",
        });

        cards.push({
          studentName: candidate.studentName,
          studentGrade: candidate.studentGrade,
          guardianName: candidate.guardianName,
          relationshipLabel: candidate.relationshipLabel,
          parentIdentifier: issued.parentIdentifier,
          // Shown once, rendered straight to print, never stored.
          activationPin: issued.activationPin,
          activationToken: issued.activationToken,
          expiresAt: issued.expiresAt,
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
        // Reprinting for a connected guardian would kill the PIN they are
        // already using, so these are excluded unless explicitly requested.
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
