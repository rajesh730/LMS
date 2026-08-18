import connectDB from "@/lib/db";
import Student from "@/models/Student";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { requireApiSession } from "@/lib/authz";
import { escapeRegex } from "@/lib/pagination";

export async function GET(req, { params }) {
  try {
    const { session, error: authError } = await requireApiSession();
    if (authError) return authError;

    if (!session || session.user.role !== "SCHOOL_ADMIN") {
      return errorResponse(401, "Unauthorized - School Admin access required");
    }

    const schoolId = session.user.id;
    const { grade } = await params;

    if (!grade) {
      return errorResponse(400, "Grade parameter is required");
    }

    await connectDB();

    // Construct a flexible query to handle "Grade 9" vs "9" mismatches
    let gradeQuery = grade;
    
    // Decode the grade parameter just in case
    const decodedGrade = decodeURIComponent(grade);
    
    // If grade is "Grade 9", also look for "9"
    // If grade is "9", also look for "Grade 9"
    const numericPart = decodedGrade.replace(/\D/g, '');
    
    if (numericPart) {
        // We have a number, so we can construct variations
        const variations = [
            decodedGrade, // The original param
            numericPart, // Just the number "9"
            `Grade ${numericPart}`, // "Grade 9"
            `Class ${numericPart}` // "Class 9"
        ];
        // Remove duplicates
        const uniqueVariations = [...new Set(variations)];
        gradeQuery = { $in: uniqueVariations };
    } else {
        // If no number found, use the decoded grade
        gradeQuery = decodedGrade;
    }

    // Use regex for case-insensitive matching as a fallback if exact match fails
    // This mimics the logic in the main students API which seems to work
    const query = {
        school: schoolId,
        status: "ACTIVE",
        isDeleted: { $ne: true },
        $or: [
            { grade: gradeQuery },
            // Also try regex matching for "Grade X" vs "grade x". The param is a
            // user-supplied URL segment, so escape it — an unescaped "(" would
            // throw a SyntaxError and 500 the route.
            { grade: { $regex: new RegExp(`^${escapeRegex(decodedGrade)}$`, 'i') } },
            { grade: { $regex: new RegExp(`^Grade ${numericPart}$`, 'i') } }
        ]
    };

    // Fetch all students for this school and grade
    const students = await Student.find(query)
      .select(
        "firstName lastName name rollNumber email phone parentName parentEmail parentContactNumber status grade"
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
