import connectDB from "@/lib/db";
import GradeSubject from "@/models/GradeSubject";
import Subject from "@/models/Subject";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

/**
 * GET /api/grades/[grade]/subjects
 * Get all subjects activated for a grade
 */
export async function GET(req, { params }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "SCHOOL_ADMIN") {
      return errorResponse(403, "Forbidden - School Admin access required");
    }

    const { grade } = await params;

    if (!grade) {
      return errorResponse(400, "Grade parameter is required");
    }

    await connectDB();

    const gradeSubjects = await GradeSubject.find({
      grade,
      school: session.user.id,
      status: "ACTIVE",
    })
      .populate("subject")
      .populate("assignedTeacher", "name email subject");

    return successResponse(200, "Grade subjects fetched successfully", {
      grade,
      subjects: gradeSubjects,
      total: gradeSubjects.length,
    });
  } catch (error) {
    console.error("Error fetching grade subjects:", error);
    return errorResponse(500, error.message || "Failed to fetch grade subjects");
  }
}

/**
 * POST /api/grades/[grade]/subjects
 * Activate a subject for a grade
 */
export async function POST(req, { params }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "SCHOOL_ADMIN") {
      return errorResponse(403, "Forbidden - School Admin access required");
    }

    const { grade } = await params;
    const {
      subjectId,
      isCompulsory,
      fullMarks,
      passMarks,
      creditHours,
      assignedTeacher,
      startDate,
      endDate,
      remarks,
    } = await req.json();

    // Validation
    if (!grade || !subjectId) {
      return errorResponse(400, "Grade and subject ID are required");
    }

    if (!fullMarks || !passMarks) {
      return errorResponse(400, "Full marks and pass marks are required");
    }

    if (passMarks > fullMarks) {
      return errorResponse(400, "Pass marks cannot exceed full marks");
    }

    await connectDB();

    // Verify subject exists and is accessible
    const subject = await Subject.findById(subjectId);

    if (!subject) {
      return errorResponse(404, "Subject not found");
    }

    // Check if subject is accessible to this school
    if (
      subject.subjectType === "SCHOOL_CUSTOM" &&
      subject.school?.toString() !== session.user.id
    ) {
      return errorResponse(403, "You cannot access this subject");
    }

    if (subject.status !== "ACTIVE") {
      return errorResponse(400, "Subject is not active");
    }

    // Check if already activated
    const existing = await GradeSubject.findOne({
      subject: subjectId,
      grade,
      school: session.user.id,
    });

    if (existing) {
      return errorResponse(409, "This subject is already activated for this grade");
    }

    // Create GradeSubject assignment
    const gradeSubject = new GradeSubject({
      subject: subjectId,
      grade,
      school: session.user.id,
      isCompulsory,
      fullMarks,
      passMarks,
      creditHours,
      assignedTeacher,
      startDate,
      endDate,
      remarks,
      createdBy: session.user.id,
      status: "ACTIVE",
    });

    await gradeSubject.save();
    await gradeSubject.populate("subject");
    await gradeSubject.populate("assignedTeacher", "name email subject");

    return successResponse(201, "Subject activated for grade successfully", {
      gradeSubject,
    });
  } catch (error) {
    console.error("Error activating subject for grade:", error);
    return errorResponse(500, error.message || "Failed to activate subject");
  }
}
