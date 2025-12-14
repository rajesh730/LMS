import connectDB from "@/lib/db";
import FacultySubject from "@/models/FacultySubject";
import Subject from "@/models/Subject";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

/**
 * GET /api/admin/faculties/[faculty]/subjects
 * Get all subjects mapped to a specific faculty
 */
export async function GET(req, { params }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "SCHOOL_ADMIN") {
      return errorResponse(403, "Forbidden - School Admin access required");
    }

    const { faculty } = params;

    await connectDB();

    // Get all mappings for this faculty
    const mappings = await FacultySubject.find({
      school: session.user.id,
      faculty,
      status: "ACTIVE",
    }).populate("subject");

    const subjects = mappings.map(m => m.subject);

    return successResponse(200, `Subjects for ${faculty} faculty fetched`, {
      faculty,
      subjects,
      total: subjects.length,
    });
  } catch (error) {
    console.error("Error fetching faculty subjects:", error);
    return errorResponse(500, error.message || "Failed to fetch subjects");
  }
}

/**
 * POST /api/admin/faculties/[faculty]/subjects
 * Add a subject to a faculty (create mapping)
 * 
 * Request:
 * {
 *   subjectId: "ObjectId"
 * }
 */
export async function POST(req, { params }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "SCHOOL_ADMIN") {
      return errorResponse(403, "Forbidden - School Admin access required");
    }

    const { faculty } = params;
    const { subjectId } = await req.json();

    if (!subjectId) {
      return errorResponse(400, "Subject ID is required");
    }

    await connectDB();

    // Verify subject exists and belongs to school or is global
    const subject = await Subject.findById(subjectId);

    if (!subject) {
      return errorResponse(404, "Subject not found");
    }

    if (
      subject.subjectType === "SCHOOL_CUSTOM" &&
      subject.school.toString() !== session.user.id
    ) {
      return errorResponse(403, "You don't have access to this subject");
    }

    // Check if already mapped
    const existing = await FacultySubject.findOne({
      school: session.user.id,
      faculty,
      subject: subjectId,
    });

    if (existing) {
      return errorResponse(409, "Subject already mapped to this faculty");
    }

    // Create mapping
    const mapping = await FacultySubject.create({
      school: session.user.id,
      faculty,
      subject: subjectId,
      addedBy: session.user.id,
    });

    return successResponse(201, "Subject added to faculty successfully", {
      mapping: { ...mapping.toObject(), subject },
    });
  } catch (error) {
    console.error("Error adding subject to faculty:", error);
    return errorResponse(500, error.message || "Failed to add subject");
  }
}

/**
 * DELETE /api/admin/faculties/[faculty]/subjects/[subjectId]
 * Remove a subject from a faculty
 */
export async function DELETE(req, { params }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "SCHOOL_ADMIN") {
      return errorResponse(403, "Forbidden - School Admin access required");
    }

    const { faculty, subjectId } = params;

    await connectDB();

    // Find and delete mapping
    const mapping = await FacultySubject.findOneAndDelete({
      school: session.user.id,
      faculty,
      subject: subjectId,
    });

    if (!mapping) {
      return errorResponse(404, "Subject mapping not found");
    }

    return successResponse(200, "Subject removed from faculty successfully", {
      faculty,
      subjectId,
    });
  } catch (error) {
    console.error("Error removing subject from faculty:", error);
    return errorResponse(500, error.message || "Failed to remove subject");
  }
}
