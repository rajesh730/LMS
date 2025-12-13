import connectDB from "../../../../../lib/db";
import User from "../../../../../models/User";
import { successResponse, errorResponse } from "../../../../../lib/apiResponse";

export async function GET(req, { params }) {
  try {
    await connectDB();
    const { id } = await params;

    const school = await User.findById(id).select("schoolConfig educationLevels");

    if (!school) {
      return errorResponse(404, "School not found");
    }

    // Generate grades array based on maxGrade
    const maxGrade = school.schoolConfig?.maxGrade || 10;
    const grades = Array.from({ length: maxGrade }, (_, i) => (i + 1).toString());

    return successResponse(200, "School config fetched", {
      grades,
      maxGrade,
      config: school.schoolConfig
    });
  } catch (error) {
    console.error("Error fetching school config:", error);
    return errorResponse(500, "Internal server error");
  }
}
