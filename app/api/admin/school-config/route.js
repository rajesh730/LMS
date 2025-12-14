import connectDB from "@/lib/db";
import User from "@/models/User";
import Faculty from "@/models/Faculty";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

/**
 * GET /api/admin/school-config
 * Get school's faculties from Faculty model
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

    // Get unique faculties from Faculty model for this school
    let faculties = [];
    try {
      const facultyDocs = await Faculty.find(
        { school: session.user.id, status: "ACTIVE" },
        { name: 1 }
      ).distinct("name");
      
      if (facultyDocs && facultyDocs.length > 0) {
        faculties = facultyDocs;
      }
    } catch (err) {
      console.log("No faculties in database, will extract from config");
    }
    
    // If no faculties in database, extract from schoolConfig
    if (faculties.length === 0) {
      const configFaculties = [];

      // School level faculties
      if (school.schoolConfig?.schoolLevel?.faculties) {
        configFaculties.push(
          ...school.schoolConfig.schoolLevel.faculties
            .split(",")
            .map(f => f.trim())
            .filter(f => f.length > 0)
        );
      }

      // High School faculties
      if (school.schoolConfig?.highSchool?.faculties) {
        configFaculties.push(
          ...school.schoolConfig.highSchool.faculties
            .split(",")
            .map(f => f.trim())
            .filter(f => f.length > 0)
        );
      }

      // Bachelor faculties
      if (school.schoolConfig?.bachelor?.faculties) {
        configFaculties.push(
          ...school.schoolConfig.bachelor.faculties
            .split(",")
            .map(f => f.trim())
            .filter(f => f.length > 0)
        );
      }

      faculties = [...new Set(configFaculties)];
    }

    console.log("Final faculties list:", faculties);
    console.log("School config:", school.schoolConfig);

    // Detect education levels available
    const educationLevels = {
      school: !!school.schoolConfig?.schoolLevel,
      highSchool: !!school.schoolConfig?.highSchool,
      bachelor: !!school.schoolConfig?.bachelor,
    };

    return successResponse(200, "School config fetched successfully", {
      faculties,
      educationLevels,
      schoolConfig: school.schoolConfig,
    });
  } catch (error) {
    console.error("Error fetching school config:", error);
    return errorResponse(500, error.message || "Failed to fetch school config");
  }
}
