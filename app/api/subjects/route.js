import connectDB from "@/lib/db";
import Subject from "@/models/Subject";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

/**
 * GET /api/subjects
 * Get all visible subjects for current user
 * 
 * SUPER_ADMIN: sees all subjects (global + all schools' custom)
 * SCHOOL_ADMIN: sees global subjects + own custom subjects
 */
export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return errorResponse(401, "Unauthorized");
    }

    await connectDB();

    let query = {};

    if (session.user.role === "SUPER_ADMIN") {
      // SUPER_ADMIN sees all subjects (active and inactive)
      // No additional filter
    } else if (session.user.role === "SCHOOL_ADMIN") {
      // SCHOOL_ADMIN sees: global subjects + own custom subjects (active and inactive)
      query = {
        $or: [
          { subjectType: "GLOBAL" },
          { school: session.user.id },
        ],
      };
    } else {
      return errorResponse(403, "Forbidden - Admin access required");
    }

    const subjects = await Subject.find(query)
      .select("name code academicType subjectType school status description color icon")
      .sort({ name: 1 });

    // Format response
    const formattedSubjects = subjects.map(subject => ({
      _id: subject._id,
      name: subject.name,
      code: subject.code,
      academicType: subject.academicType,
      subjectType: subject.subjectType,
      school: subject.school,
      status: subject.status,
      description: subject.description,
      color: subject.color,
      icon: subject.icon,
    }));

    return successResponse(200, "Subjects fetched successfully", {
      subjects: formattedSubjects,
      total: formattedSubjects.length,
    });
  } catch (error) {
    console.error("Error fetching subjects:", error);
    return errorResponse(500, error.message || "Failed to fetch subjects");
  }
}

/**
 * POST /api/subjects
 * Create a subject
 * 
 * SUPER_ADMIN: can create global subjects
 * SCHOOL_ADMIN: can create school-specific custom subjects
 */
export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !["SUPER_ADMIN", "SCHOOL_ADMIN"].includes(session.user.role)) {
      return errorResponse(403, "Forbidden - Admin access required");
    }

    const {
      name,
      code,
      description,
      subjectType,
      academicType,
      color,
      icon,
      syllabus,
    } = await req.json();

    // Validation
    if (!name || !code) {
      return errorResponse(400, "Name and code are required");
    }

    if (!["GLOBAL", "SCHOOL_CUSTOM"].includes(subjectType)) {
      return errorResponse(400, "Invalid subject type");
    }

    // Only SUPER_ADMIN can create global subjects
    if (subjectType === "GLOBAL" && session.user.role !== "SUPER_ADMIN") {
      return errorResponse(403, "Only SUPER_ADMIN can create global subjects");
    }

    await connectDB();

    // Check for duplicate code
    const school = subjectType === "GLOBAL" ? null : session.user.id;
    const existingSubject = await Subject.findOne({ code: code.toUpperCase(), school });

    if (existingSubject) {
      return errorResponse(409, `Subject with code '${code}' already exists`);
    }

    // Create subject
    const newSubject = new Subject({
      name,
      code: code.toUpperCase(),
      description,
      subjectType,
      school,
      academicType,
      color,
      icon,
      syllabus,
      createdBy: session.user.id,
      status: "ACTIVE",
    });

    await newSubject.save();

    return successResponse(201, "Subject created successfully", {
      subject: newSubject,
    });
  } catch (error) {
    console.error("Error creating subject:", error);
    return errorResponse(500, error.message || "Failed to create subject");
  }
}
