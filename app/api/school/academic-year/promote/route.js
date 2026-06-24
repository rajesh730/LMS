import connectDB from "@/lib/db";
import Student from "@/models/Student";
import SchoolConfig from "@/models/SchoolConfig";
import AcademicYear from "@/models/AcademicYear";
import {
  successResponse,
  errorResponse,
  internalServerError,
} from "@/lib/apiResponse";
import { requireApiSession, getSessionSchoolId } from "@/lib/authz";
import {
  ensureActiveAcademicYear,
  makeEnrollmentEntry,
  closeCurrentEnrollments,
} from "@/lib/studentEnrollment";
import {
  getOrderedGrades,
  getGradeNumber,
  getNextGrade,
  nextAcademicYear,
} from "@/lib/academicYear";

async function resolveOrderedGrades(schoolId) {
  const [config, distinctGrades] = await Promise.all([
    SchoolConfig.findOne({ school: schoolId }).select("grades").lean(),
    Student.distinct("grade", {
      school: schoolId,
      isDeleted: { $ne: true },
      status: { $in: ["ACTIVE", "SUSPENDED"] },
    }),
  ]);
  return getOrderedGrades([...(config?.grades || []), ...(distinctGrades || [])]);
}

// GET — preview the rollover: who promotes, who graduates, and the next year.
export async function GET() {
  try {
    const { session, error } = await requireApiSession(["SCHOOL_ADMIN"]);
    if (error) return error;

    const schoolId = getSessionSchoolId(session);
    if (!schoolId) return errorResponse(403, "Forbidden", "FORBIDDEN");

    await connectDB();

    const current = await ensureActiveAcademicYear(schoolId);
    const orderedGrades = await resolveOrderedGrades(schoolId);

    const students = await Student.find({
      school: schoolId,
      status: "ACTIVE",
      isDeleted: { $ne: true },
    })
      .select("name grade rollNumber")
      .sort({ grade: 1, rollNumber: 1 })
      .lean();

    const grades = orderedGrades.map((grade) => {
      const nextGrade = getNextGrade(grade, orderedGrades);
      const gradeStudents = students
        .filter((s) => getGradeNumber(s.grade) === getGradeNumber(grade))
        .map((s) => ({
          id: String(s._id),
          name: s.name,
          grade: s.grade,
          rollNumber: s.rollNumber,
        }));
      return {
        grade,
        nextGrade, // null = graduates out of the school
        graduates: nextGrade === null,
        students: gradeStudents,
        count: gradeStudents.length,
      };
    });

    return successResponse(200, "Promotion preview", {
      current,
      nextYear: nextAcademicYear({
        yearStart: current.yearStart,
        calendar: current.calendar,
      }),
      orderedGrades,
      grades,
      totalStudents: students.length,
    });
  } catch (err) {
    console.error("GET /api/school/academic-year/promote error:", err);
    return internalServerError("Failed to build promotion preview");
  }
}

// POST — commit the rollover. Body: { retainStudentIds: string[], confirm: true }
// Students not in retainStudentIds promote to the next grade; those in the top
// grade graduate (status ALUMNI). Retained students stay in the same grade for
// the new session.
export async function POST(req) {
  try {
    const { session, error } = await requireApiSession(["SCHOOL_ADMIN"]);
    if (error) return error;

    const schoolId = getSessionSchoolId(session);
    if (!schoolId) return errorResponse(403, "Forbidden", "FORBIDDEN");

    const body = await req.json().catch(() => ({}));
    if (!body.confirm) {
      return errorResponse(400, "Please confirm the promotion before running it.");
    }
    const retainSet = new Set(
      (Array.isArray(body.retainStudentIds) ? body.retainStudentIds : []).map(
        String
      )
    );

    await connectDB();

    const current = await ensureActiveAcademicYear(schoolId);
    if (!current) return errorResponse(404, "Active academic year not found");

    const orderedGrades = await resolveOrderedGrades(schoolId);
    const nextYear = nextAcademicYear({
      yearStart: current.yearStart,
      calendar: current.calendar,
    });
    const schoolNameSnapshot =
      session.user.schoolName || session.user.name || "";

    // Process highest grade first so target grades are vacated before incoming
    // students arrive (avoids roll-number collisions in the common case). Sort
    // numerically in JS — a Mongo string sort would place "Grade 9" after
    // "Grade 10".
    const students = await Student.find({
      school: schoolId,
      status: "ACTIVE",
      isDeleted: { $ne: true },
    });
    students.sort(
      (a, b) => (getGradeNumber(b.grade) ?? 0) - (getGradeNumber(a.grade) ?? 0)
    );

    const summary = { promoted: 0, retained: 0, graduated: 0 };
    const failures = [];

    for (const student of students) {
      try {
        const isRetained = retainSet.has(String(student._id));
        const nextGrade = getNextGrade(student.grade, orderedGrades);

        if (isRetained) {
          closeCurrentEnrollments(student, "RETAINED");
          student.enrollments.push(
            makeEnrollmentEntry({
              school: schoolId,
              schoolName: schoolNameSnapshot,
              grade: student.grade,
              rollNumber: student.rollNumber,
              academicYear: nextYear,
            })
          );
          summary.retained += 1;
        } else if (nextGrade === null) {
          // Top grade → graduate / alumni. They leave the active roster.
          closeCurrentEnrollments(student, "GRADUATED");
          student.status = "ALUMNI";
          student.statusChangedAt = new Date();
          student.statusChangedBy = session.user.id;
          student.statusReason = `Graduated (${current.year})`;
          summary.graduated += 1;
        } else {
          closeCurrentEnrollments(student, "PROMOTED");
          student.grade = nextGrade;
          student.enrollments.push(
            makeEnrollmentEntry({
              school: schoolId,
              schoolName: schoolNameSnapshot,
              grade: nextGrade,
              rollNumber: student.rollNumber,
              academicYear: nextYear,
            })
          );
          summary.promoted += 1;
        }

        await student.save();
      } catch (studentError) {
        failures.push({
          id: String(student._id),
          name: student.name,
          grade: student.grade,
          rollNumber: student.rollNumber,
          reason:
            studentError?.code === 11000
              ? "Roll number conflict in the next grade — adjust the roll number and retry."
              : "Could not promote this student.",
        });
      }
    }

    // Close the current session (record the summary) and open the next.
    await AcademicYear.updateOne(
      { _id: current._id },
      {
        $set: {
          status: "CLOSED",
          closedAt: new Date(),
          closedBy: session.user.id,
          "summary.promoted": summary.promoted,
          "summary.retained": summary.retained,
          "summary.graduated": summary.graduated,
        },
      }
    );

    await AcademicYear.updateOne(
      { school: schoolId, yearStart: nextYear.yearStart },
      {
        $setOnInsert: {
          school: schoolId,
          year: nextYear.year,
          yearStart: nextYear.yearStart,
          calendar: nextYear.calendar,
          status: "ACTIVE",
          startedAt: new Date(),
        },
      },
      { upsert: true }
    );

    return successResponse(
      200,
      `Promoted to ${nextYear.year}. ${summary.promoted} promoted, ${summary.retained} retained, ${summary.graduated} graduated.`,
      { summary, failures, nextYear }
    );
  } catch (err) {
    console.error("POST /api/school/academic-year/promote error:", err);
    return internalServerError("Failed to run promotion");
  }
}
