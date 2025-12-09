import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import ParticipationRequest from "@/models/ParticipationRequest";
import Event from "@/models/Event";
import Student from "@/models/Student";
import ActivityLog from "@/models/ActivityLog";
import {
  successResponse,
  errorResponse,
  unauthorizedError,
  validationError,
  notFoundError,
  internalServerError,
} from "@/lib/apiResponse";

/**
 * POST /api/participation-requests/[id]/enroll
 * Final enrollment after approval - verifies all credentials and adds student to event
 */
export async function POST(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "SCHOOL_ADMIN") {
      return unauthorizedError();
    }

    await connectDB();

    const { id: requestId } = await params;

    // Fetch the participation request
    const request = await ParticipationRequest.findById(requestId)
      .populate("student")
      .populate("event")
      .populate("school");

    if (!request) {
      return notFoundError("Participation request");
    }

    // Verify ownership
    if (request.school._id.toString() !== session.user.id) {
      return unauthorizedError();
    }

    // Check status - must be APPROVED
    if (request.status !== "APPROVED") {
      return validationError(
        `Cannot enroll a ${request.status.toLowerCase()} request. Request must be APPROVED first.`
      );
    }

    // ===== FINAL VALIDATIONS =====
    const validationErrors = [];

    // Validate grade
    if (
      request.event.eligibleGrades &&
      request.event.eligibleGrades.length > 0
    ) {
      if (!request.event.eligibleGrades.includes(request.student.grade)) {
        validationErrors.push(
          `Student grade "${request.student.grade}" not eligible`
        );
      }
    }

    // Validate max per school
    if (request.event.maxParticipantsPerSchool) {
      // Count OTHER approved requests (not this one)
      const otherApprovedCount = await ParticipationRequest.countDocuments({
        event: request.event._id,
        school: request.school._id,
        status: "APPROVED",
        _id: { $ne: request._id }, // Exclude THIS request
      });

      // Count enrolled students from this school in participants.students
      const enrolledStudents =
        request.event.participants?.find(
          (p) => p.school?.toString() === request.school._id.toString()
        )?.students?.length || 0;

      // Total: other approved + already enrolled = must be < max
      if (
        otherApprovedCount + enrolledStudents >=
        request.event.maxParticipantsPerSchool
      ) {
        validationErrors.push(
          `School has reached max limit (${request.event.maxParticipantsPerSchool})`
        );
      }
    }

    // Validate global max
    if (request.event.maxParticipants) {
      // Count other approved requests (not this one)
      const otherApprovedCount = await ParticipationRequest.countDocuments({
        event: request.event._id,
        status: "APPROVED",
        _id: { $ne: request._id },
      });

      // Count total enrolled students across all schools
      const totalEnrolledStudents =
        request.event.participants?.reduce(
          (sum, p) => sum + (p.students?.length || 0),
          0
        ) || 0;

      // Total cannot exceed limit
      if (
        otherApprovedCount + totalEnrolledStudents >=
        request.event.maxParticipants
      ) {
        validationErrors.push(
          `Event has reached global limit (${request.event.maxParticipants})`
        );
      }
    }

    // If validations failed and not force enrolled, reject enrollment
    if (validationErrors.length > 0 && !request.forceEnrolled) {
      return validationError(`Cannot enroll: ${validationErrors.join(" | ")}`);
    }

    // ===== ADD STUDENT TO EVENT PARTICIPANTS =====
    // Find or create school participation record
    let schoolParticipant = request.event.participants.find(
      (p) => p.school?.toString() === request.school._id.toString()
    );

    if (!schoolParticipant) {
      // Create new school participation
      schoolParticipant = {
        school: request.school._id,
        students: [],
        joinedAt: new Date(),
      };
      request.event.participants.push(schoolParticipant);
    }

    // Add student to school's students array if not already there
    if (
      !schoolParticipant.students.find(
        (s) => s.toString() === request.student._id.toString()
      )
    ) {
      schoolParticipant.students.push(request.student._id);
    }

    await request.event.save();

    // ===== LOG ACTIVITY =====
    await ActivityLog.create({
      school: request.school._id,
      action: "APPROVE",
      targetType: "ParticipationRequest",
      targetId: request._id,
      targetName: `${request.student.name} - ${request.event.title}`,
      performedBy: session.user.id,
      details: {
        reason: `Student enrolled in event${
          request.forceEnrolled ? " (force enrolled)" : ""
        }`,
        validationErrors:
          validationErrors?.length > 0 ? validationErrors : undefined,
      },
    });

    // ===== RETURN SUCCESS =====
    const enrolledRequest = await ParticipationRequest.findById(request._id)
      .populate("student", "name email grade")
      .populate("event", "title date")
      .lean();

    return successResponse(
      200,
      `Student "${request.student.name}" enrolled in event "${request.event.title}"`,
      enrolledRequest
    );
  } catch (error) {
    console.error("POST /api/participation-requests/[id]/enroll error:", error);
    return internalServerError(error.message || "Enrollment failed");
  }
}
