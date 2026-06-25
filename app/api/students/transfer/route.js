import connectDB from "@/lib/db";
import Student from "@/models/Student";
import StudentTransfer from "@/models/StudentTransfer";
import {
  successResponse,
  errorResponse,
  internalServerError,
} from "@/lib/apiResponse";
import { requireApiSession, getSessionSchoolId } from "@/lib/authz";
import { normalizeGradeValue } from "@/lib/schoolGrades";
import { ensureActiveAcademicYear } from "@/lib/studentEnrollment";

function sameDay(a, b) {
  if (!a || !b) return false;
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getUTCFullYear() === db.getUTCFullYear() &&
    da.getUTCMonth() === db.getUTCMonth() &&
    da.getUTCDate() === db.getUTCDate()
  );
}

export async function GET() {
  try {
    const { session, error } = await requireApiSession(["SCHOOL_ADMIN"]);
    if (error) return error;

    const schoolId = getSessionSchoolId(session);
    if (!schoolId) return errorResponse(403, "Forbidden", "FORBIDDEN");

    await connectDB();

    const [releaseRequests, releasedTransfers, admissionRequests, incoming, outgoing] =
      await Promise.all([
        StudentTransfer.find({ fromSchool: schoolId, status: "PENDING_RELEASE" })
          .sort({ createdAt: -1 })
          .limit(50)
          .populate("student", "name grade rollNumber platformStudentId")
          .populate("toSchool", "schoolName name")
          .lean(),
        StudentTransfer.find({
          fromSchool: schoolId,
          status: { $in: ["RELEASED", "PENDING_ADMISSION"] },
        })
          .sort({ releasedAt: -1, createdAt: -1 })
          .limit(50)
          .populate("student", "name grade rollNumber platformStudentId")
          .populate("toSchool", "schoolName name")
          .lean(),
        StudentTransfer.find({ toSchool: schoolId, status: "PENDING_ADMISSION" })
          .sort({ targetSelectedAt: -1, createdAt: -1 })
          .limit(50)
          .populate("student", "name grade rollNumber platformStudentId")
          .populate("fromSchool", "schoolName name")
          .lean(),
        StudentTransfer.find({ fromSchool: schoolId, status: "PENDING" })
          .sort({ createdAt: -1 })
          .limit(50)
          .populate("toSchool", "schoolName name")
          .lean(),
        StudentTransfer.find({ toSchool: schoolId, status: "PENDING" })
          .sort({ createdAt: -1 })
          .limit(50)
          .populate("fromSchool", "schoolName name")
          .lean(),
      ]);

    return successResponse(200, "Transfers loaded", {
      releaseRequests,
      releasedTransfers,
      admissionRequests,
      incoming,
      outgoing,
    });
  } catch (err) {
    console.error("GET /api/students/transfer error:", err);
    return internalServerError("Failed to load transfers");
  }
}

// Legacy school-initiated claim flow kept for compatibility. The new product
// flow is student-initiated through /api/student/transfer.
export async function POST(req) {
  try {
    const { session, error } = await requireApiSession(["SCHOOL_ADMIN"]);
    if (error) return error;

    const schoolId = getSessionSchoolId(session);
    if (!schoolId) return errorResponse(403, "Forbidden", "FORBIDDEN");

    const body = await req.json().catch(() => ({}));
    const platformStudentId = String(body.platformStudentId || "").trim();
    const dateOfBirth = body.dateOfBirth;
    const toGrade = normalizeGradeValue(body.toGrade);
    const toRollNumber = String(body.toRollNumber || "").trim();

    if (!platformStudentId || !dateOfBirth || !toGrade) {
      return errorResponse(
        400,
        "Platform student ID, date of birth, and target grade are required."
      );
    }

    await connectDB();

    const student = await Student.findOne({
      platformStudentId,
      isDeleted: { $ne: true },
    })
      .select("name grade school dateOfBirth")
      .populate("school", "schoolName name");

    if (!student || !sameDay(student.dateOfBirth, dateOfBirth)) {
      return errorResponse(
        404,
        "No student matches that platform ID and date of birth."
      );
    }

    const fromSchoolId = student.school?._id || student.school || null;
    if (String(fromSchoolId || "") === String(schoolId)) {
      return errorResponse(400, "This student is already at your school.");
    }

    const existingPending = await StudentTransfer.findOne({
      student: student._id,
      status: { $in: ["PENDING", "PENDING_RELEASE", "RELEASED", "PENDING_ADMISSION"] },
    }).select("_id");

    if (existingPending) {
      return errorResponse(
        409,
        "There is already a pending transfer request for this student."
      );
    }

    if (toRollNumber) {
      const clash = await Student.findOne({
        school: schoolId,
        grade: toGrade,
        rollNumber: toRollNumber,
        isDeleted: { $ne: true },
        status: { $nin: ["ALUMNI", "GRADUATED", "INACTIVE"] },
      }).select("_id");
      if (clash) {
        return errorResponse(
          409,
          `Roll number ${toRollNumber} is already used in ${toGrade}.`
        );
      }
    }

    const toYear = await ensureActiveAcademicYear(schoolId);

    const transfer = await StudentTransfer.create({
      student: student._id,
      platformStudentId,
      fromSchool: fromSchoolId,
      toSchool: schoolId,
      requestedBy: session.user.id,
      status: "PENDING",
      toGrade,
      toRollNumber,
      toAcademicYear: toYear?.year || "",
      toAcademicYearStart: toYear?.yearStart ?? null,
      studentNameSnapshot: student.name || "",
      fromSchoolNameSnapshot:
        student.school?.schoolName || student.school?.name || "",
      reason: String(body.reason || "").trim(),
    });

    return successResponse(
      201,
      "Transfer request sent to the student's current school for approval.",
      { transferId: String(transfer._id) }
    );
  } catch (err) {
    if (err?.code === 11000) {
      return errorResponse(
        409,
        "There is already a pending transfer request for this student."
      );
    }
    console.error("POST /api/students/transfer error:", err);
    return internalServerError("Failed to create transfer request");
  }
}
