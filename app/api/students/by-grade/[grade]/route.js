import connectDB from "@/lib/db";
import Student from "@/models/Student";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET(req, { params }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "SCHOOL_ADMIN") {
      return errorResponse(401, "Unauthorized - School Admin access required");
    }

    const schoolId = session.user.id;
    const { grade } = await params;

    if (!grade) {
      return errorResponse(400, "Grade parameter is required");
    }

    await connectDB();

    // Fetch all students for this school and grade
    const students = await Student.find({
      school: schoolId,
      grade: grade,
      status: "ACTIVE",
    })
      .select(
        "firstName lastName name rollNumber email phone parentName parentEmail parentContactNumber status"
      )
      .sort({ rollNumber: 1 });

    return successResponse(200, "Students fetched successfully", {
      grade: grade,
      totalStudents: students.length,
      students: students,
    });
  } catch (error) {
    console.error("Error fetching students by grade:", error);
    return errorResponse(500, error.message || "Failed to fetch students");
  }
}
