import connectDB from "../../../../../lib/db";
import User from "../../../../../models/User";
import SchoolConfig from "../../../../../models/SchoolConfig";
import { successResponse, errorResponse } from "../../../../../lib/apiResponse";
import { buildGradeLabels } from "../../../../../lib/schoolGrades";
import {
  getSessionSchoolId,
  requireApiSession,
  sameId,
} from "../../../../../lib/authz";

export async function GET(req, { params }) {
  try {
    const { session, error } = await requireApiSession(["SCHOOL_ADMIN"]);
    if (error) return error;

    await connectDB();
    const { id } = await params;
    const schoolId = getSessionSchoolId(session);

    if (!sameId(id, schoolId)) {
      return errorResponse(403, "Forbidden", "FORBIDDEN");
    }

    const school = await User.findById(id).select("schoolConfig educationLevels");

    if (!school) {
      return errorResponse(404, "School not found");
    }

    const grades = buildGradeLabels(school.schoolConfig);
    let schoolConfigDoc = await SchoolConfig.findOne({ school: id });

    if (!schoolConfigDoc) {
      schoolConfigDoc = await SchoolConfig.create({ school: id, grades });
    } else if (JSON.stringify(schoolConfigDoc.grades || []) !== JSON.stringify(grades)) {
      schoolConfigDoc.grades = grades;
      await schoolConfigDoc.save();
    }

    return successResponse(200, "School config fetched", {
      grades,
      config: schoolConfigDoc,
    });
  } catch (error) {
    console.error("Error fetching school config:", error);
    return errorResponse(500, "Internal server error");
  }
}
