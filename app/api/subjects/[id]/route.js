import connectDB from "@/lib/db";
import Subject from "@/models/Subject";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

/**
 * GET /api/subjects/[id]
 * Get a specific subject
 */
export async function GET(req, { params }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return errorResponse(401, "Unauthorized");
    }

    const { id } = await params;

    await connectDB();

    const subject = await Subject.findById(id).populate("school", "schoolName");

    if (!subject) {
      return errorResponse(404, "Subject not found");
    }

    // Check visibility
    if (session.user.role === "SCHOOL_ADMIN") {
      if (
        subject.subjectType === "SCHOOL_CUSTOM" &&
        subject.school?.toString() !== session.user.id
      ) {
        return errorResponse(403, "You cannot access this subject");
      }
    }

    return successResponse(200, "Subject fetched successfully", { subject });
  } catch (error) {
    console.error("Error fetching subject:", error);
    return errorResponse(500, error.message || "Failed to fetch subject");
  }
}

/**
 * PUT /api/subjects/[id]
 * Update a subject
 */
export async function PUT(req, { params }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !["SUPER_ADMIN", "SCHOOL_ADMIN"].includes(session.user.role)) {
      return errorResponse(403, "Forbidden - Admin access required");
    }

    const { id } = await params;
    const updateData = await req.json();

    await connectDB();

    const subject = await Subject.findById(id);

    if (!subject) {
      return errorResponse(404, "Subject not found");
    }

    // Permission check
    if (session.user.role === "SCHOOL_ADMIN") {
      if (
        subject.subjectType === "GLOBAL" ||
        subject.school?.toString() !== session.user.id
      ) {
        return errorResponse(403, "You cannot modify this subject");
      }
    }

    // Don't allow changing subject type or school
    delete updateData.subjectType;
    delete updateData.school;

    // Check for code conflict if code is being changed
    if (updateData.code && updateData.code !== subject.code) {
      const existing = await Subject.findOne({
        code: updateData.code.toUpperCase(),
        school: subject.school,
        _id: { $ne: id },
      });

      if (existing) {
        return errorResponse(409, "Subject code already exists");
      }

      updateData.code = updateData.code.toUpperCase();
    }

    updateData.updatedBy = session.user.id;

    const updatedSubject = await Subject.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    return successResponse(200, "Subject updated successfully", {
      subject: updatedSubject,
    });
  } catch (error) {
    console.error("Error updating subject:", error);
    return errorResponse(500, error.message || "Failed to update subject");
  }
}

/**
 * PATCH /api/subjects/[id]/status
 * Deactivate/Activate a subject
 */
export async function PATCH(req, { params }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !["SUPER_ADMIN", "SCHOOL_ADMIN"].includes(session.user.role)) {
      return errorResponse(403, "Forbidden - Admin access required");
    }

    const { id } = await params;
    const { status } = await req.json();

    if (!["ACTIVE", "INACTIVE"].includes(status)) {
      return errorResponse(400, "Invalid status");
    }

    await connectDB();

    const subject = await Subject.findById(id);

    if (!subject) {
      return errorResponse(404, "Subject not found");
    }

    // Permission check
    if (session.user.role === "SCHOOL_ADMIN") {
      if (subject.school?.toString() !== session.user.id) {
        return errorResponse(403, "You cannot modify this subject");
      }
    }

    subject.status = status;
    subject.updatedBy = session.user.id;
    await subject.save();

    return successResponse(200, `Subject ${status.toLowerCase()} successfully`, {
      subject,
    });
  } catch (error) {
    console.error("Error updating subject status:", error);
    return errorResponse(500, error.message || "Failed to update subject");
  }
}
