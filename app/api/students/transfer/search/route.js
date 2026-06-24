import connectDB from "@/lib/db";
import Student from "@/models/Student";
import User from "@/models/User";
import StudentTransfer from "@/models/StudentTransfer";
import {
  successResponse,
  errorResponse,
  internalServerError,
} from "@/lib/apiResponse";
import { requireApiSession, getSessionSchoolId } from "@/lib/authz";

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

// POST { platformStudentId, dateOfBirth } — verify a student exists elsewhere and
// can be claimed into this school. DOB must match to prevent blind lookups.
export async function POST(req) {
  try {
    const { session, error } = await requireApiSession(["SCHOOL_ADMIN"]);
    if (error) return error;

    const schoolId = getSessionSchoolId(session);
    if (!schoolId) return errorResponse(403, "Forbidden", "FORBIDDEN");

    const body = await req.json().catch(() => ({}));
    const platformStudentId = String(body.platformStudentId || "").trim();
    const dateOfBirth = body.dateOfBirth;

    if (!platformStudentId || !dateOfBirth) {
      return errorResponse(400, "Enter the platform student ID and date of birth.");
    }

    await connectDB();

    const student = await Student.findOne({
      platformStudentId,
      isDeleted: { $ne: true },
    })
      .select("name grade school dateOfBirth platformStudentId status")
      .populate("school", "schoolName name")
      .lean();

    // Identical error whether not found or DOB mismatch, so the ID can't be
    // probed without also knowing the DOB.
    if (!student || !sameDay(student.dateOfBirth, dateOfBirth)) {
      return errorResponse(
        404,
        "No student matches that platform ID and date of birth."
      );
    }

    if (String(student.school?._id || student.school || "") === String(schoolId)) {
      return errorResponse(
        400,
        "This student is already enrolled at your school."
      );
    }

    const pending = await StudentTransfer.findOne({
      student: student._id,
      status: "PENDING",
    }).select("toSchool");
    if (pending) {
      return errorResponse(
        409,
        "There is already a pending transfer request for this student."
      );
    }

    return successResponse(200, "Student found", {
      student: {
        id: String(student._id),
        name: student.name,
        grade: student.grade,
        platformStudentId: student.platformStudentId,
        currentSchoolName:
          student.school?.schoolName || student.school?.name || "Another school",
        status: student.status,
      },
    });
  } catch (err) {
    console.error("POST /api/students/transfer/search error:", err);
    return internalServerError("Failed to look up student");
  }
}
