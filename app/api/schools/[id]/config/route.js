import connectDB from "../../../../../lib/db";
import User from "../../../../../models/User";
import SchoolConfig from "../../../../../models/SchoolConfig";
import { successResponse, errorResponse } from "../../../../../lib/apiResponse";

export async function GET(req, { params }) {
  try {
    await connectDB();
    const { id } = await params;

    // 1. Try to fetch from SchoolConfig collection first (Source of Truth)
    const schoolConfigDoc = await SchoolConfig.findOne({ school: id });
    
    if (schoolConfigDoc && schoolConfigDoc.grades && schoolConfigDoc.grades.length > 0) {
        return successResponse(200, "School config fetched from SchoolConfig", {
            grades: schoolConfigDoc.grades,
            config: schoolConfigDoc
        });
    }

    // 2. Fallback to User profile config
    const school = await User.findById(id).select("schoolConfig educationLevels");

    if (!school) {
      return errorResponse(404, "School not found");
    }

    let grades = [];
    
    // Check if grades are explicitly defined in schoolConfig
    if (school.schoolConfig?.grades && Array.isArray(school.schoolConfig.grades)) {
        grades = school.schoolConfig.grades;
    } else {
        // Handle nested structure: schoolConfig.schoolLevel.maxGrade
        let maxGrade = 10;
        let minGrade = 1;

        if (school.schoolConfig?.schoolLevel?.maxGrade) {
            maxGrade = parseInt(school.schoolConfig.schoolLevel.maxGrade);
            minGrade = parseInt(school.schoolConfig.schoolLevel.minGrade) || 1;
        } else if (school.schoolConfig?.maxGrade) {
            // Legacy/Flat structure support
            maxGrade = parseInt(school.schoolConfig.maxGrade);
        }

        // Generate grades array
        for (let i = minGrade; i <= maxGrade; i++) {
            grades.push(i.toString());
        }
    }

    return successResponse(200, "School config fetched from User profile", {
      grades,
      config: school.schoolConfig
    });
  } catch (error) {
    console.error("Error fetching school config:", error);
    return errorResponse(500, "Internal server error");
  }
}
