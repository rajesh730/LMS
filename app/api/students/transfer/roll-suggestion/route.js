import connectDB from "@/lib/db";
import Student from "@/models/Student";
import {
  successResponse,
  errorResponse,
  internalServerError,
} from "@/lib/apiResponse";
import { requireApiSession, getSessionSchoolId } from "@/lib/authz";
import { normalizeGradeValue } from "@/lib/schoolGrades";

// Helps a school assign a clash-free roll number when admitting a transfer
// student. Returns the next available number for the grade plus the set of
// roll numbers already in use, so the UI can suggest and warn live.
export async function GET(req) {
  try {
    const { session, error } = await requireApiSession(["SCHOOL_ADMIN"]);
    if (error) return error;

    const schoolId = getSessionSchoolId(session);
    if (!schoolId) return errorResponse(403, "Forbidden", "FORBIDDEN");

    const { searchParams } = new URL(req.url);
    const grade = normalizeGradeValue(searchParams.get("grade") || "");
    if (!grade) return errorResponse(400, "Grade is required.");

    await connectDB();

    const students = await Student.find({
      school: schoolId,
      grade,
      isDeleted: { $ne: true },
      status: { $nin: ["ALUMNI", "GRADUATED", "INACTIVE"] },
    })
      .select("rollNumber")
      .lean();

    const takenRollNumbers = students
      .map((student) => String(student.rollNumber || "").trim())
      .filter(Boolean);

    const takenSet = new Set(takenRollNumbers);
    const numericTaken = takenRollNumbers
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value > 0);

    let suggested = numericTaken.length > 0 ? Math.max(...numericTaken) + 1 : 1;
    while (takenSet.has(String(suggested))) {
      suggested += 1;
    }

    return successResponse(200, "Roll number suggestion ready", {
      grade,
      suggestedRollNumber: String(suggested),
      takenRollNumbers,
    });
  } catch (err) {
    console.error("GET /api/students/transfer/roll-suggestion error:", err);
    return internalServerError("Failed to suggest a roll number");
  }
}
