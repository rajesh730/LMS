import connectDB from "@/lib/db";
import SchoolConfig from "@/models/SchoolConfig";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "SCHOOL_ADMIN") {
      return errorResponse(401, "Unauthorized - School Admin access required");
    }

    const schoolId = session.user.id;

    await connectDB();

    // Fetch school config with grades
    const schoolConfig = await SchoolConfig.findOne({ school: schoolId });

    if (!schoolConfig) {
      return successResponse(200, "No grades configured", {
        grades: [],
      });
    }

    return successResponse(200, "Grades fetched successfully", {
      grades: schoolConfig.grades || [],
      teacherRoles: schoolConfig.teacherRoles || [],
      subjects: schoolConfig.subjects || [],
    });
  } catch (error) {
    console.error("Error fetching grades:", error);
    return errorResponse(500, error.message || "Failed to fetch grades");
  }
}
