import connectDB from "@/lib/db";
import Subject from "@/models/Subject";
import GradeSubject from "@/models/GradeSubject";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { getToken } from 'next-auth/jwt';

/**
 * GET /api/admin/subjects/[id]
 * Get single subject
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

    return successResponse(200, "Subject fetched successfully", {
      subject,
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
    const { name, description, code, status, academicType, educationLevel, grades } = await req.json();

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
        if (grades) {
            const mapping = {
                '1': 'Grade 1', 'one': 'Grade 1', 'first': 'Grade 1', 'class 1': 'Grade 1',
                '2': 'Grade 2', 'two': 'Grade 2', 'second': 'Grade 2', 'class 2': 'Grade 2',
                '3': 'Grade 3', 'three': 'Grade 3', 'third': 'Grade 3', 'class 3': 'Grade 3',
                '4': 'Grade 4', 'four': 'Grade 4', 'fourth': 'Grade 4', 'class 4': 'Grade 4',
                '5': 'Grade 5', 'five': 'Grade 5', 'fifth': 'Grade 5', 'class 5': 'Grade 5',
                '6': 'Grade 6', 'six': 'Grade 6', 'sixth': 'Grade 6', 'class 6': 'Grade 6',
                '7': 'Grade 7', 'seven': 'Grade 7', 'seventh': 'Grade 7', 'class 7': 'Grade 7',
                '8': 'Grade 8', 'eight': 'Grade 8', 'eighth': 'Grade 8', 'class 8': 'Grade 8',
                '9': 'Grade 9', 'nine': 'Grade 9', 'ninth': 'Grade 9', 'class 9': 'Grade 9',
                '10': 'Grade 10', 'ten': 'Grade 10', 'tenth': 'Grade 10', 'class 10': 'Grade 10',
            };
            subject.grades = [...new Set(grades.map(g => {
                const key = g.toString().toLowerCase().replace(/\s+/g, ' ').trim();
                
                // Check for G+Number pattern (e.g. G1, G10)
                const gMatch = key.match(/^g(\d+)$/);
                if (gMatch) return `Grade ${gMatch[1]}`;

                return mapping[key] || g;
            }))];
        }
        
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
