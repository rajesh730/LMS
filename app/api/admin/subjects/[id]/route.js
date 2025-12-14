import connectDB from "@/lib/db";
import Subject from "@/models/Subject";
import FacultySubject from "@/models/FacultySubject";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

/**
 * GET /api/admin/subjects/[id]
 * Get single subject with its faculty mappings
 */
export async function GET(req, { params }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "SCHOOL_ADMIN") {
      return errorResponse(403, "Forbidden - School Admin access required");
    }

    const { id } = params;

    await connectDB();

    // Get subject
    const subject = await Subject.findById(id);

    if (!subject) {
      return errorResponse(404, "Subject not found");
    }

    // Check authorization (global or own custom)
    if (
      subject.subjectType === "SCHOOL_CUSTOM" &&
      subject.school.toString() !== session.user.id
    ) {
      return errorResponse(403, "You don't have permission to view this subject");
    }

    // Get faculty mappings
    const mappings = await FacultySubject.find({
      school: session.user.id,
      subject: id,
      status: "ACTIVE",
    });

    return successResponse(200, "Subject fetched successfully", {
      subject,
      faculties: mappings.map(m => m.faculty),
      mappingCount: mappings.length,
    });
  } catch (error) {
    console.error("Error fetching subject:", error);
    return errorResponse(500, error.message || "Failed to fetch subject");
  }
}

/**
 * PUT /api/admin/subjects/[id]
 * Edit subject details (only custom subjects)
 */
export async function PUT(req, { params }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "SCHOOL_ADMIN") {
      return errorResponse(403, "Forbidden - School Admin access required");
    }

    const { id } = params;
    const { name, description, code } = await req.json();

    await connectDB();

    const subject = await Subject.findById(id);

    if (!subject) {
      return errorResponse(404, "Subject not found");
    }

    // Can only edit custom subjects, not global
    if (subject.subjectType === "GLOBAL") {
      return errorResponse(403, "Cannot edit global subjects");
    }

    // Check authorization
    if (subject.school.toString() !== session.user.id) {
      return errorResponse(403, "You don't have permission to edit this subject");
    }

    // Update allowed fields
    if (name) subject.name = name;
    if (code) subject.code = code.toUpperCase();
    if (description !== undefined) subject.description = description;

    await subject.save();

    return successResponse(200, "Subject updated successfully", { subject });
  } catch (error) {
    console.error("Error updating subject:", error);
    return errorResponse(500, error.message || "Failed to update subject");
  }
}

/**
 * DELETE /api/admin/subjects/[id]
 * Delete subject and its mappings (only custom subjects)
 */
export async function DELETE(req, { params }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "SCHOOL_ADMIN") {
      return errorResponse(403, "Forbidden - School Admin access required");
    }

    const { id } = params;

    await connectDB();

    const subject = await Subject.findById(id);

    if (!subject) {
      return errorResponse(404, "Subject not found");
    }

    // Can only delete custom subjects, not global
    if (subject.subjectType === "GLOBAL") {
      return errorResponse(403, "Cannot delete global subjects");
    }

    // Check authorization
    if (subject.school.toString() !== session.user.id) {
      return errorResponse(403, "You don't have permission to delete this subject");
    }

    // Delete all mappings first
    await FacultySubject.deleteMany({ subject: id });

    // Delete subject
    await Subject.findByIdAndDelete(id);

    return successResponse(200, "Subject and mappings deleted successfully", { id });
  } catch (error) {
    console.error("Error deleting subject:", error);
    return errorResponse(500, error.message || "Failed to delete subject");
  }
}
