import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import ParticipationRequest from "@/models/ParticipationRequest";
import Student from "@/models/Student";
import Event from "@/models/Event";
import {
  successResponse,
  errorResponse,
  unauthorizedError,
  validationError,
  notFoundError,
  internalServerError,
} from "@/lib/apiResponse";

// GET: Fetch all participation requests for admin
export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);
    if (
      !session ||
      !["SCHOOL_ADMIN", "SUPER_ADMIN"].includes(session.user.role)
    ) {
      return unauthorizedError();
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status"); // PENDING, APPROVED, REJECTED
    const eventId = searchParams.get("event");

    let query = {};
    // If School Admin, restrict to their school
    if (session.user.role === "SCHOOL_ADMIN") {
      query.school = session.user.id;
    }
    // If Super Admin, they can see all, or we could add a school filter param later

    if (status) query.status = status;
    if (eventId) query.event = eventId;

    const requests = await ParticipationRequest.find(query)
      .populate("student", "name email rollNumber grade")
      .populate("event", "title date")
      .populate("approvedBy", "name")
      .sort({ status: 1, requestedAt: -1 })
      .lean();

    // Filter out requests with deleted events (where event is null)
    const filteredRequests = requests.filter((req) => req.event !== null);

    // Log if there are orphaned requests (should be rare if cascade delete works)
    const orphanedCount = requests.length - filteredRequests.length;
    if (orphanedCount > 0) {
      console.log(
        `[PARTICIPATION-REQUESTS] Found ${orphanedCount} orphaned requests (deleted events)`
      );
    }

    return successResponse(200, "Requests fetched", filteredRequests);
  } catch (error) {
    console.error("GET Requests Error:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    return internalServerError(error.message || "Internal server error");
  }
}

// PATCH: Approve or reject participation request
export async function PATCH(req) {
  try {
    const session = await getServerSession(authOptions);
    if (
      !session ||
      !["SCHOOL_ADMIN", "SUPER_ADMIN"].includes(session.user.role)
    ) {
      return unauthorizedError();
    }

    await connectDB();

    let body;
    try {
      body = await req.json();
    } catch (e) {
      return validationError("Invalid JSON format");
    }

    const { requestId, action, rejectionReason, notes, forceEnroll } = body;

    if (!requestId || !action || !["APPROVE", "REJECT"].includes(action)) {
      return validationError("Invalid request parameters");
    }

    const request = await ParticipationRequest.findById(requestId)
      .populate("student")
      .populate("event");
    if (!request) {
      return notFoundError("Participation request");
    }

    // Verify ownership (only for School Admin)
    if (
      session.user.role === "SCHOOL_ADMIN" &&
      request.school.toString() !== session.user.id
    ) {
      return unauthorizedError();
    }

    if (request.status !== "PENDING") {
      return validationError(
        `Cannot change status of a ${request.status.toLowerCase()} request`
      );
    }

    if (action === "APPROVE") {
      // ===== VALIDATION 1: Grade Eligibility =====
      const validationErrors = [];

      if (
        request.event.eligibleGrades &&
        request.event.eligibleGrades.length > 0
      ) {
        if (!request.event.eligibleGrades.includes(request.student.grade)) {
          validationErrors.push(
            `Student grade "${
              request.student.grade
            }" is not eligible. Required: ${request.event.eligibleGrades.join(
              ", "
            )}`
          );
        }
      }

      // ===== VALIDATION 2: Max Participants Per School =====
      if (request.event.maxParticipantsPerSchool) {
        // Count other approved requests from this school (NOT including this one)
        const otherApprovedCount = await ParticipationRequest.countDocuments({
          event: request.event._id,
          school: request.school,
          status: "APPROVED",
          _id: { $ne: request._id }, // Exclude THIS request
        });

        // Count already enrolled students from this school in participants.students
        const enrolledStudents =
          request.event.participants?.find(
            (p) => p.school?.toString() === request.school.toString()
          )?.students?.length || 0;

        // Total cannot exceed limit
        if (
          otherApprovedCount + enrolledStudents >=
          request.event.maxParticipantsPerSchool
        ) {
          validationErrors.push(
            `School has reached max limit (${request.event.maxParticipantsPerSchool}) for this event`
          );
        }
      }

      // ===== VALIDATION 3: Global Max Participants =====
      if (request.event.maxParticipants) {
        // Count other approved requests (NOT this one)
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

      // If validations failed and NOT force enrolling, reject
      if (validationErrors.length > 0 && !forceEnroll) {
        return validationError(
          `Cannot approve: ${validationErrors.join(" | ")}`
        );
      }

      // Approval successful (with or without override)
      request.status = "APPROVED";
      request.approvedAt = new Date();
      request.approvedBy = session.user.id;
      if (notes) request.notes = notes;
      if (forceEnroll && validationErrors.length > 0) {
        request.forceEnrolled = true;
        request.validationErrors = validationErrors;
      }
    } else if (action === "REJECT") {
      request.status = "REJECTED";
      request.rejectedAt = new Date();
      request.rejectionReason = rejectionReason || "Rejected by admin";
      if (notes) request.notes = notes;
    }

    await request.save();

    const updatedRequest = await ParticipationRequest.findById(request._id)
      .populate("student", "name email")
      .populate("event", "title")
      .lean();

    return successResponse(
      200,
      `Request ${action.toLowerCase()}ed successfully`,
      updatedRequest
    );
  } catch (error) {
    console.error("PATCH Request Error:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    return internalServerError(error.message || "Internal server error");
  }
}

// DELETE: Admin cancels a participation request
export async function DELETE(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "SCHOOL_ADMIN") {
      return unauthorizedError();
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const requestId = searchParams.get("id");

    if (!requestId) {
      return validationError("Request ID is required");
    }

    const request = await ParticipationRequest.findById(requestId);
    if (!request) {
      return notFoundError("Participation request");
    }

    if (request.school.toString() !== session.user.id) {
      return unauthorizedError();
    }

    await ParticipationRequest.deleteOne({ _id: requestId });

    return successResponse(200, "Request deleted", null);
  } catch (error) {
    console.error("DELETE Request Error:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    return internalServerError(error.message || "Internal server error");
  }
}
