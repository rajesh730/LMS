import connectDB from "@/lib/db";
import SchoolConfig from "@/models/SchoolConfig";
import User from "@/models/User";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { buildGradeLabels } from "@/lib/schoolGrades";

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "SCHOOL_ADMIN") {
      return errorResponse(401, "Unauthorized - School Admin access required");
    }

    const schoolId = session.user.id;

    await connectDB();

    const [school, schoolConfig] = await Promise.all([
      User.findById(schoolId).select("schoolConfig"),
      SchoolConfig.findOne({ school: schoolId }),
    ]);

    const grades = buildGradeLabels(school?.schoolConfig);

    if (
      schoolConfig &&
      JSON.stringify(schoolConfig.grades || []) !== JSON.stringify(grades)
    ) {
      schoolConfig.grades = grades;
      await schoolConfig.save();
    }

    return successResponse(200, "Grades fetched successfully", {
      grades,
      teacherRoles: schoolConfig?.teacherRoles || [],
    });
  } catch (error) {
    console.error("Error fetching grades:", error);
    return errorResponse(500, error.message || "Failed to fetch grades");
  }
}
