import connectDB from "@/lib/db";
import Subject from "@/models/Subject";
import FacultySubject from "@/models/FacultySubject";
import GradeSubject from "@/models/GradeSubject";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { getToken } from 'next-auth/jwt';

/**
 * GET /api/admin/subjects/[id]
 * Get single subject with its faculty mappings
 */
export async function GET(req, { params }) {
  try {
    const token = await getToken({ req });
    if (!token) return errorResponse(401, "Unauthorized");

    const { id } = await params;
    await connectDB();

    const subject = await Subject.findById(id);
    if (!subject) return errorResponse(404, "Subject not found");

    // Authorization Check
    if (token.role === "SCHOOL_ADMIN") {
        if (subject.subjectType === "SCHOOL_CUSTOM" && subject.school.toString() !== token.id) {
            return errorResponse(403, "You don't have permission to view this subject");
        }
    } else if (token.role !== "SUPER_ADMIN") {
        return errorResponse(403, "Forbidden");
    }

    // Get faculty mappings
    const mappings = await FacultySubject.find({
      school: token.id,
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
 * Edit subject details or Restore
 */
export async function PUT(req, { params }) {
  try {
    const token = await getToken({ req });
    if (!token) return errorResponse(401, "Unauthorized");

    const { id } = await params;
    const { name, description, code, status, academicType, educationLevel, grades, applicableFaculties, year, semester } = await req.json();

    await connectDB();

    const subject = await Subject.findById(id);
    if (!subject) return errorResponse(404, "Subject not found");

    // SUPER ADMIN LOGIC
    if (token.role === "SUPER_ADMIN") {
        if (status) subject.status = status;
        if (name) subject.name = name;
        if (code) subject.code = code;
        if (description !== undefined) subject.description = description;
        if (academicType) subject.academicType = academicType;
        if (educationLevel) subject.educationLevel = educationLevel;
        if (grades) subject.grades = grades;
        if (applicableFaculties) subject.applicableFaculties = applicableFaculties;
        if (year !== undefined) subject.year = year;
        if (semester !== undefined) subject.semester = semester;
        
        await subject.save();
        return successResponse(200, "Subject updated successfully", { subject });
    }

    // SCHOOL ADMIN LOGIC
    if (token.role === "SCHOOL_ADMIN") {
        if (subject.subjectType === "GLOBAL") {
            return errorResponse(403, "Cannot edit global subjects");
        }
        if (subject.school.toString() !== token.id) {
            return errorResponse(403, "You don't have permission to edit this subject");
        }
        if (name) subject.name = name;
        if (code) subject.code = code.toUpperCase();
        if (description !== undefined) subject.description = description;

        await subject.save();
        return successResponse(200, "Subject updated successfully", { subject });
    }

    return errorResponse(403, "Forbidden");
  } catch (error) {
    console.error("Error updating subject:", error);
    return errorResponse(500, error.message || "Failed to update subject");
  }
}

/**
 * DELETE /api/admin/subjects/[id]
 * Soft delete (Archive) or Hard delete
 */
export async function DELETE(req, { params }) {
  try {
    const token = await getToken({ req });
    if (!token) return errorResponse(401, "Unauthorized");

    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const permanent = searchParams.get('permanent') === 'true';

    await connectDB();

    const subject = await Subject.findById(id);
    if (!subject) return errorResponse(404, "Subject not found");

    // SUPER ADMIN LOGIC
    if (token.role === "SUPER_ADMIN") {
        if (permanent) {
            // Hard Delete
            await FacultySubject.deleteMany({ subject: id });
            await GradeSubject.deleteMany({ subject: id });
            await Subject.findByIdAndDelete(id);
            return successResponse(200, "Subject permanently deleted");
        } else {
            // Soft Delete
            subject.status = 'INACTIVE';
            await subject.save();
            return successResponse(200, "Subject archived");
        }
    }

    // SCHOOL ADMIN LOGIC
    if (token.role === "SCHOOL_ADMIN") {
        if (subject.subjectType === "GLOBAL") {
            return errorResponse(403, "Cannot delete global subjects");
        }
        if (subject.school.toString() !== token.id) {
            return errorResponse(403, "You don't have permission to delete this subject");
        }
        
        // School admins can only soft delete their own subjects
        subject.status = 'INACTIVE';
        await subject.save();
        return successResponse(200, "Subject deleted successfully");
    }

    return errorResponse(403, "Forbidden");
  } catch (error) {
    console.error("Error deleting subject:", error);
    return errorResponse(500, error.message || "Failed to delete subject");
  }
}
