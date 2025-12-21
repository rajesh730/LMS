import connectDB from "@/lib/db";
import User from "@/models/User";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

/**
 * GET /api/admin/school-config
 * Get school's configuration
 */
export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "SCHOOL_ADMIN") {
      return errorResponse(403, "Forbidden - School Admin access required");
    }

    await connectDB();

    const school = await User.findById(session.user.id).select("schoolConfig");

    if (!school) {
      return errorResponse(404, "School not found");
    }

    // Detect education levels available
    const educationLevels = {
      school: true,
    };

    return successResponse(200, "School config fetched successfully", {
      educationLevels,
      schoolConfig: school.schoolConfig,
    });
  } catch (error) {
    console.error("Error fetching school config:", error);
    return errorResponse(500, error.message || "Failed to fetch school config");
  }
}
