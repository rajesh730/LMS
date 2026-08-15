import connectDB from "@/lib/db";
import Student from "@/models/Student";
import User from "@/models/User";
import Notice from "@/models/Notice";
import {
  successResponse,
  errorResponse,
  internalServerError,
} from "@/lib/apiResponse";
import { requireApiSession, getSessionSchoolId, sameId } from "@/lib/authz";
import { buildStudentJourney } from "@/lib/parentJourney";
import { getEquivalentGradeValues } from "@/lib/schoolGrades";

export const dynamic = "force-dynamic";

/**
 * Data for the printable Parent Summary (§23).
 *
 * A one-page paper snapshot for families without regular device access — what
 * the child has been doing this term, plus anything that needs the guardian's
 * attention.
 *
 * §23 warns against putting private information on a printed page, which
 * matters more here than on screen: a printed sheet gets carried home in a bag,
 * left on a desk, and read by whoever picks it up. So this deliberately
 * contains only what already appears on the child's own portfolio — no contact
 * details, no Parent ID, no PIN, no other guardian's information, and nothing
 * internal to the school.
 */
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const { session, error } = await requireApiSession([
      "SCHOOL_ADMIN",
      "SUPER_ADMIN",
      "TEACHER",
    ]);
    if (error) return error;

    await connectDB();

    const student = await Student.findOne({
      _id: id,
      isDeleted: { $ne: true },
    })
      .select("name grade school status enrollments")
      .lean();

    if (!student) return errorResponse(404, "Student not found", "NOT_FOUND");

    const schoolId = getSessionSchoolId(session);
    if (
      session.user.role !== "SUPER_ADMIN" &&
      !sameId(schoolId, student.school)
    ) {
      return errorResponse(404, "Student not found", "NOT_FOUND");
    }

    const [journey, school] = await Promise.all([
      buildStudentJourney(student._id),
      User.findById(student.school).select("schoolName name").lean(),
    ]);

    // "This term" — the current academic session where one is recorded, else
    // the last six months. Counting a child's whole history would make every
    // summary look the same year after year.
    const currentEnrollment = (student.enrollments || []).find(
      (entry) => entry.status === "CURRENT"
    );
    const since =
      currentEnrollment?.startedAt ||
      new Date(Date.now() - 182 * 24 * 60 * 60 * 1000);

    const recent = (journey?.entries || []).filter(
      (entry) => entry.date && new Date(entry.date) >= new Date(since)
    );

    const counts = {
      achievements: recent.filter((e) => e.type === "ACHIEVEMENT").length,
      writings: recent.filter((e) => e.type === "WRITING").length,
      research: recent.filter((e) => e.type === "RESEARCH").length,
      events: recent.filter((e) => e.type === "EVENT").length,
    };

    // The one notice most worth reprinting: current, parent-facing, and either
    // urgent or awaiting an action.
    const importantNotice = await Notice.findOne({
      school: student.school,
      isDeleted: { $ne: true },
      isActive: true,
      status: "PUBLISHED",
      "targetAudience.parents": true,
      $and: [
        {
          $or: [
            { grades: { $size: 0 } },
            { grades: { $exists: false } },
            { grades: { $in: getEquivalentGradeValues(student.grade) } },
          ],
        },
        {
          $or: [
            { expiryDate: null },
            { expiryDate: { $exists: false } },
            { expiryDate: { $gt: new Date() } },
          ],
        },
        {
          $or: [
            { priority: "URGENT" },
            { type: "URGENT" },
            { requiresConsent: true },
            { requiresAcknowledgement: true },
          ],
        },
      ],
    })
      .sort({ publishedAt: -1 })
      .select("title content publishedAt actionDeadline requiresConsent")
      .lean();

    return successResponse(200, "Summary", {
      child: {
        name: student.name,
        grade: student.grade || "",
        schoolName: school?.schoolName || school?.name || "School",
        status: student.status,
      },
      periodStart: since,
      counts,
      recentAchievement:
        recent.find((entry) => entry.type === "ACHIEVEMENT") || null,
      recentWritings: recent
        .filter((e) => e.type === "WRITING" || e.type === "RESEARCH")
        .slice(0, 3)
        .map((e) => ({ title: e.title, date: e.date })),
      importantNotice: importantNotice
        ? {
            title: importantNotice.title,
            preview: String(importantNotice.content || "").slice(0, 220),
            publishedAt: importantNotice.publishedAt,
            actionDeadline: importantNotice.actionDeadline || null,
            requiresConsent: Boolean(importantNotice.requiresConsent),
          }
        : null,
    });
  } catch (err) {
    console.error("GET /api/school/students/[id]/summary error:", err);
    return internalServerError("Failed to build summary");
  }
}
