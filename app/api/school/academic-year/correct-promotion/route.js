import mongoose from "mongoose";
import connectDB from "@/lib/db";
import Student from "@/models/Student";
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
} from "@/lib/studentEnrollment";
import { planPromotionReversal } from "@/lib/promotionCorrection";

// Reverse a mistaken promotion for a single student. The school year stays
// advanced; the student is put back into their previous grade as a repeater and
// the closed year's summary counters are corrected — all atomically.
export async function POST(req) {
  try {
    const { session, error } = await requireApiSession(["SCHOOL_ADMIN"]);
    if (error) return error;

    const schoolId = getSessionSchoolId(session);
    if (!schoolId) return errorResponse(403, "Forbidden", "FORBIDDEN");

    const body = await req.json().catch(() => ({}));
    const studentId = String(body.studentId || "").trim();
    if (!studentId) return errorResponse(400, "studentId is required.");

    await connectDB();

    const student = await Student.findOne({
      _id: studentId,
      school: schoolId,
      isDeleted: { $ne: true },
    });
    if (!student) return errorResponse(404, "Student not found at your school.");

    const activeYear = await ensureActiveAcademicYear(schoolId);
    if (!activeYear) return errorResponse(404, "Active academic year not found.");

    const schoolStr = String(schoolId);
    const schoolEnrollments = (student.enrollments || []).filter(
      (entry) => String(entry.school) === schoolStr
    );

    const plan = planPromotionReversal({
      schoolEnrollments,
      studentStatus: student.status,
      activeYearStart: activeYear.yearStart,
    });
    if (plan.error) return errorResponse(400, plan.error);

    // Putting the student back into revertGrade must not collide with a roll
    // number already in use there.
    const rollClash = await Student.findOne({
      school: schoolId,
      grade: plan.revertGrade,
      rollNumber: student.rollNumber,
      isDeleted: { $ne: true },
      status: { $nin: ["ALUMNI", "GRADUATED", "INACTIVE"] },
      _id: { $ne: student._id },
    }).select("_id");
    if (rollClash) {
      return errorResponse(
        409,
        `Roll number ${student.rollNumber} is already used in ${plan.revertGrade}. Adjust it before correcting.`
      );
    }

    const now = new Date();
    const counterField = plan.type === "GRADUATED" ? "graduated" : "promoted";

    if (plan.type === "PROMOTED") {
      const currentEntry = student.enrollments.find(
        (e) =>
          String(e.school) === schoolStr &&
          e.status === "CURRENT" &&
          e.academicYearStart === activeYear.yearStart
      );
      const priorEntry = student.enrollments.find(
        (e) =>
          String(e.school) === schoolStr &&
          e.status === "PROMOTED" &&
          e.academicYearStart === plan.closedYearStart
      );
      if (currentEntry) currentEntry.grade = plan.revertGrade;
      if (priorEntry) priorEntry.status = "RETAINED";
      student.grade = plan.revertGrade;
    } else {
      // GRADUATED → un-graduate: the grad entry becomes RETAINED and a fresh
      // CURRENT entry opens for the active year in the same (top) grade.
      const gradEntry = student.enrollments.find(
        (e) =>
          String(e.school) === schoolStr &&
          e.status === "GRADUATED" &&
          e.academicYearStart === plan.closedYearStart
      );
      if (gradEntry) gradEntry.status = "RETAINED";
      student.enrollments.push(
        makeEnrollmentEntry({
          school: schoolId,
          schoolName:
            session.user.schoolName || session.user.name || "",
          grade: plan.revertGrade,
          rollNumber: student.rollNumber,
          academicYear: activeYear,
        })
      );
      student.grade = plan.revertGrade;
      student.status = "ACTIVE";
      student.statusChangedAt = now;
      student.statusChangedBy = session.user.id;
      student.statusReason = "Promotion corrected — retained instead of graduated";
    }

    const dbSession = await mongoose.startSession();
    try {
      await dbSession.withTransaction(async () => {
        await student.save({ session: dbSession });
        await AcademicYear.updateOne(
          { school: schoolId, yearStart: plan.closedYearStart },
          { $inc: { [`summary.${counterField}`]: -1, "summary.retained": 1 } },
          { session: dbSession }
        );
      });
    } finally {
      await dbSession.endSession();
    }

    return successResponse(200, "Promotion corrected. The student now repeats.", {
      studentId: String(student._id),
      grade: plan.revertGrade,
      type: plan.type,
    });
  } catch (err) {
    if (err?.code === 11000) {
      return errorResponse(
        409,
        "A roll number conflict blocked the correction. Adjust and retry."
      );
    }
    console.error("POST /api/school/academic-year/correct-promotion error:", err);
    return internalServerError("Failed to correct the promotion");
  }
}
