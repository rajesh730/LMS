import connectDB from "@/lib/db";
import Subject from "@/models/Subject";
import FacultySubject from "@/models/FacultySubject";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

/**
 * GET /api/admin/subjects
 * Get all subjects (global + custom) for school admin
 * 
 * Response: List of subjects with details
 */
export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "SCHOOL_ADMIN") {
      return errorResponse(403, "Forbidden - School Admin access required");
    }

    await connectDB();

    // Get global + own custom subjects
    const subjects = await Subject.find({
      $or: [
        { subjectType: "GLOBAL" },
        { school: session.user.id },
      ],
      status: "ACTIVE",
    }).select("name code description subjectType school status color icon");

    return successResponse(200, "Subjects fetched successfully", {
      subjects,
      total: subjects.length,
    });
  } catch (error) {
    console.error("Error fetching subjects:", error);
    return errorResponse(500, error.message || "Failed to fetch subjects");
  }
}

/**
 * POST /api/admin/subjects
 * Create a new subject (match-or-create logic)
 * 
 * Request:
 * {
 *   name: "Math",
 *   code: "MATH101",
 *   description: "...",
 *   faculty: "Science" (which faculty to map)
 * }
 * 
 * Logic:
 * 1. Search for existing GLOBAL subject by name
 * 2. If found → Link to it
 * 3. If not found → Create SCHOOL_CUSTOM subject
 * 4. Map to faculty
 */
export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "SCHOOL_ADMIN") {
      return errorResponse(403, "Forbidden - School Admin access required");
    }

    const { name, code, description, faculty } = await req.json();

    // Validation
    if (!name || !code || !faculty) {
      return errorResponse(400, "Name, code, and faculty are required");
    }

    await connectDB();

    // Get school's faculties to validate
    const User = (await import("@/models/User")).default;
    const school = await User.findById(session.user.id);
    
    if (!school) {
      return errorResponse(404, "School not found");
    }

    // Check if faculty exists in school config
    const faculties = Object.keys(school.schoolConfig || {}).filter(
      key => key.endsWith("Faculties") && 
      school.schoolConfig[key]?.faculties
    );

    // Validate faculty exists in school
    let facultyFound = false;
    for (const key of faculties) {
      const facultyList = school.schoolConfig[key].faculties?.split(',')
        .map(f => f.trim());
      if (facultyList?.includes(faculty)) {
        facultyFound = true;
        break;
      }
    }

    if (!facultyFound) {
      return errorResponse(400, "Faculty not found in school configuration");
    }

    // Normalize name for matching
    const normalizedName = name.toLowerCase().trim();

    // Try to find existing GLOBAL subject
    let subject = await Subject.findOne({
      name: { $regex: `^${name}$`, $options: 'i' },
      subjectType: "GLOBAL",
      status: "ACTIVE",
    });

    // If not found, create SCHOOL_CUSTOM subject
    if (!subject) {
      subject = await Subject.create({
        name,
        code: code.toUpperCase(),
        description,
        subjectType: "SCHOOL_CUSTOM",
        school: session.user.id,
        status: "ACTIVE",
        createdBy: session.user.id,
      });
      console.log(`✓ Created custom subject: ${name}`);
    } else {
      console.log(`✓ Found existing global subject: ${name}`);
    }

    // Check if already mapped
    const existingMapping = await FacultySubject.findOne({
      school: session.user.id,
      faculty,
      subject: subject._id,
    });

    if (existingMapping) {
      return errorResponse(409, "Subject already mapped to this faculty");
    }

    // Create faculty-subject mapping
    const mapping = await FacultySubject.create({
      school: session.user.id,
      faculty,
      subject: subject._id,
      addedBy: session.user.id,
    });

    return successResponse(201, "Subject created/linked and mapped successfully", {
      subject,
      mapping,
      isNew: subject.school === session.user.id,
    });
  } catch (error) {
    console.error("Error creating subject:", error);
    return errorResponse(500, error.message || "Failed to create subject");
  }
}
