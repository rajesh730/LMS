import connectDB from "@/lib/db";
import GradeSubject from "@/models/GradeSubject";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

/**
 * GET /api/grades/[grade]/subjects/[id]
 * Get a specific grade-subject assignment
 */
export async function GET(req, { params }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "SCHOOL_ADMIN") {
      return errorResponse(403, "Forbidden - School Admin access required");
    }

    const { grade, id } = await params;

    await connectDB();

    const gradeSubject = await GradeSubject.findById(id)
      .populate("subject")
      .populate("assignedTeacher", "name email subject");

    if (!gradeSubject) {
      return errorResponse(404, "Grade-subject assignment not found");
    }

    // Verify ownership
    if (gradeSubject.school?.toString() !== session.user.id) {
      return errorResponse(403, "You cannot access this assignment");
    }

    return successResponse(200, "Grade-subject fetched successfully", {
      gradeSubject,
    });
  } catch (error) {
    console.error("Error fetching grade-subject:", error);
    return errorResponse(500, error.message || "Failed to fetch grade-subject");
  }
}

/**
 * PUT /api/grades/[grade]/subjects/[id]
 * Update grading parameters and teacher assignment
 */
export async function PUT(req, { params }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "SCHOOL_ADMIN") {
      return errorResponse(403, "Forbidden - School Admin access required");
    }

    const { grade, id } = await params;
    const updateData = await req.json();

    // Don't allow changing subject, grade, or school
    delete updateData.subject;
    delete updateData.grade;
    delete updateData.school;

    // Validate grading parameters if provided
    if (updateData.fullMarks && updateData.passMarks) {
      if (updateData.passMarks > updateData.fullMarks) {
        return errorResponse(400, "Pass marks cannot exceed full marks");
      }
    }

    await connectDB();

    const gradeSubject = await GradeSubject.findById(id);

    if (!gradeSubject) {
      return errorResponse(404, "Grade-subject assignment not found");
    }

    // Verify ownership
    if (gradeSubject.school?.toString() !== session.user.id) {
      return errorResponse(403, "You cannot modify this assignment");
    }

    updateData.updatedBy = session.user.id;

    const updated = await GradeSubject.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    })
      .populate("subject")
      .populate("assignedTeacher", "name email subject");

    return successResponse(200, "Grade-subject updated successfully", {
      gradeSubject: updated,
    });
  } catch (error) {
    console.error("Error updating grade-subject:", error);
    return errorResponse(500, error.message || "Failed to update grade-subject");
  }
}

/**
 * PATCH /api/grades/[grade]/subjects/[id]/status
 * Deactivate/Activate a subject for a grade (soft delete)
 */
export async function PATCH(req, { params }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "SCHOOL_ADMIN") {
      return errorResponse(403, "Forbidden - School Admin access required");
    }

    const { grade, id } = await params;
    const { status } = await req.json();

    if (!["ACTIVE", "INACTIVE"].includes(status)) {
      return errorResponse(400, "Invalid status");
    }

    await connectDB();

    const gradeSubject = await GradeSubject.findById(id);

    if (!gradeSubject) {
      return errorResponse(404, "Grade-subject assignment not found");
    }

    // Verify ownership
    if (gradeSubject.school?.toString() !== session.user.id) {
      return errorResponse(403, "You cannot modify this assignment");
    }

    gradeSubject.status = status;
    gradeSubject.updatedBy = session.user.id;
    await gradeSubject.save();

    await gradeSubject.populate("subject");
    await gradeSubject.populate("assignedTeacher", "name email subject");

    return successResponse(200, `Subject ${status.toLowerCase()} for grade successfully`, {
      gradeSubject,
    });
  } catch (error) {
    console.error("Error updating grade-subject status:", error);
    return errorResponse(500, error.message || "Failed to update grade-subject");
  }
}
