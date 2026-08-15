import connectDB from "@/lib/db";
import Student from "@/models/Student";
import Parent from "@/models/Parent";
import ParentStudentLink, {
  applyAccessLevelDefaults,
  PARENT_RELATIONSHIP_TYPES,
} from "@/models/ParentStudentLink";
import AuditLog from "@/models/AuditLog";
import {
  successResponse,
  validationError,
  internalServerError,
} from "@/lib/apiResponse";
import { requireApiSession, getSessionSchoolId } from "@/lib/authz";
import { getEquivalentGradeValues } from "@/lib/schoolGrades";
import {
  isMeaningfulValue,
  hasImportableParentData,
} from "@/lib/guardianRoster";

export const dynamic = "force-dynamic";

/**
 * Convert parent details captured at student registration into real guardians.
 *
 * This is the bridge that was missing. Student registration has always
 * collected `parentName` / `parentContactNumber` / `parentEmail` /
 * `guardianRelationship` as flat strings on the Student document. Useful for a
 * paper register, invisible to the Parent App — no `Parent` account, no
 * `ParentStudentLink`, no access.
 *
 * GET  — dry run. Shows exactly what WOULD be created, changing nothing.
 * POST — performs the import.
 *
 * Deliberately does NOT issue Parent Access Cards. Importing creates the
 * guardian relationship; printing a card is a separate, deliberate act per
 * guardian, because a card is a credential and bulk-minting hundreds of them
 * into a school office is not something to do implicitly.
 */

/** Registration only records one relationship, and it maps 1:1 to our enum. */
function normalizeRelationship(value) {
  const candidate = String(value || "").toUpperCase();
  return PARENT_RELATIONSHIP_TYPES.includes(candidate) ? candidate : "OTHER";
}

async function loadCandidates({ schoolId, studentIds, grade }) {
  const query = {
    school: schoolId,
    isDeleted: { $ne: true },
    status: { $ne: "INACTIVE" },
  };

  if (Array.isArray(studentIds) && studentIds.length > 0) {
    query._id = { $in: studentIds };
  } else if (grade) {
    query.grade = { $in: getEquivalentGradeValues(grade) };
  }

  const students = await Student.find(query)
    .select("name grade rollNumber parentName parentEmail parentContactNumber guardianRelationship")
    .lean();

  const importable = students.filter(hasImportableParentData);
  if (importable.length === 0) return { students: importable, existing: [] };

  // Students that already have a guardian are skipped — importing again would
  // create a duplicate account for the same person.
  const existing = await ParentStudentLink.find({
    student: { $in: importable.map((s) => s._id) },
  })
    .select("student")
    .lean();

  return { students: importable, existing };
}

/** Dry run — what would this import do? */
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

    const { students, existing } = await loadCandidates({ schoolId, grade });
    const alreadyLinked = new Set(existing.map((e) => String(e.student)));

    const pending = students.filter((s) => !alreadyLinked.has(String(s._id)));

    return successResponse(200, "Import preview", {
      willCreate: pending.length,
      alreadyLinked: students.length - pending.length,
      preview: pending.slice(0, 25).map((student) => ({
        studentId: String(student._id),
        studentName: student.name,
        grade: student.grade || "",
        guardianName: String(student.parentName).trim(),
        relationshipType: normalizeRelationship(student.guardianRelationship),
        phone: isMeaningfulValue(student.parentContactNumber)
          ? String(student.parentContactNumber).trim()
          : "",
        email: isMeaningfulValue(student.parentEmail)
          ? String(student.parentEmail).trim()
          : "",
      })),
    });
  } catch (err) {
    console.error("GET /api/school/guardians/import error:", err);
    return internalServerError("Failed to preview the import");
  }
}

/** Run the import. */
export async function POST(request) {
  try {
    const { session, error } = await requireApiSession([
      "SCHOOL_ADMIN",
      "SUPER_ADMIN",
    ]);
    if (error) return error;

    const body = await request.json().catch(() => ({}));
    const studentIds = Array.isArray(body.studentIds) ? body.studentIds : null;
    const grade = body.grade || "";

    if (!studentIds && !grade && body.scope !== "ALL") {
      // Requiring an explicit scope stops an accidental school-wide import.
      return validationError(
        "Choose students, a grade, or confirm a school-wide import"
      );
    }

    await connectDB();

    const schoolId = getSessionSchoolId(session);
    const { students, existing } = await loadCandidates({
      schoolId,
      studentIds,
      grade,
    });

    const alreadyLinked = new Set(existing.map((e) => String(e.student)));
    const pending = students.filter((s) => !alreadyLinked.has(String(s._id)));

    if (pending.length === 0) {
      return successResponse(200, "Nothing to import", {
        created: 0,
        skipped: students.length,
      });
    }

    // Default permissions for an imported guardian: they can see the child and
    // receive notices, but cannot consent or register until the school
    // deliberately grants it. Importing is a data migration, not a decision
    // about who may act on a child's behalf (§20).
    const preset = applyAccessLevelDefaults({ accessLevel: "VIEW_AND_NOTICES" });

    let created = 0;
    const failures = [];

    for (const student of pending) {
      try {
        const email = isMeaningfulValue(student.parentEmail)
          ? String(student.parentEmail).trim().toLowerCase()
          : "";
        const phone = isMeaningfulValue(student.parentContactNumber)
          ? String(student.parentContactNumber).trim()
          : "";

        // Reuse an existing guardian account when the email or phone already
        // identifies one — siblings share a parent, and creating a second
        // account would split their children across two logins.
        let parent = null;
        if (email || phone) {
          parent = await Parent.findOne({
            $or: [
              ...(email ? [{ email }] : []),
              ...(phone ? [{ phone }] : []),
            ],
            isDeleted: { $ne: true },
          });
        }

        if (!parent) {
          parent = await Parent.create({
            name: String(student.parentName).trim(),
            // Both optional — a guardian with neither is valid.
            email: email || undefined,
            phone: phone || undefined,
            status: "ACTIVE",
            // No card issued yet; the school prints one per guardian when ready.
            accessState: "NOT_CREATED",
          });
        }

        await ParentStudentLink.create({
          parent: parent._id,
          student: student._id,
          school: schoolId,
          relationshipType: normalizeRelationship(student.guardianRelationship),
          accessLevel: "VIEW_AND_NOTICES",
          canViewPortfolio: preset.canViewPortfolio,
          canReceiveNotices: preset.canReceiveNotices,
          canRegisterEvents: preset.canRegisterEvents,
          canGiveConsent: preset.canGiveConsent,
          canMessageSchool: preset.canMessageSchool,
          isPrimaryGuardian: true,
          invitedBy: session.user.id,
          status: "ACTIVE",
          activatedAt: new Date(),
        });

        created += 1;
      } catch (err) {
        // A duplicate-key collision means another request linked this pair
        // first — not a failure worth surfacing.
        if (err?.code !== 11000) {
          failures.push({ studentName: student.name, reason: err.message });
        }
      }
    }

    await AuditLog.create({
      entityType: "GuardianImport",
      entityId: schoolId,
      action: "GUARDIANS_IMPORTED_FROM_REGISTRATION",
      performedBy: session.user.id,
      role: session.user.role,
      reason: grade ? `Grade ${grade}` : studentIds ? "Selected students" : "All students",
      after: { created, skipped: students.length - pending.length, failed: failures.length },
    }).catch(() => {});

    return successResponse(200, "Import complete", {
      created,
      skipped: students.length - pending.length,
      failures,
    });
  } catch (err) {
    console.error("POST /api/school/guardians/import error:", err);
    return internalServerError("Failed to import guardians");
  }
}
