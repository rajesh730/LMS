import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import Student from "@/models/Student";
import Event from "@/models/Event";
import ParticipationRequest from "@/models/ParticipationRequest";
import {
  successResponse,
  errorResponse,
  internalServerError,
} from "@/lib/apiResponse";

export async function POST(req, { params }) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return errorResponse(401, "Unauthorized: Please log in");
    }

    if (session.user.role !== "STUDENT") {
      return errorResponse(403, "Only students can request participation");
    }

    const { id: eventId } = await params;

    // Fetch student by email from session
    const student = await Student.findOne({ email: session.user.email });
    if (!student) {
      return errorResponse(404, "Student not found");
    }

    // Validate event exists
    const event = await Event.findById(eventId);
    if (!event) {
      return errorResponse(404, "Event not found");
    }

    // ===== VALIDATION 0: Check Registration Deadline =====
    if (event.registrationDeadline) {
      const now = new Date();
      const deadline = new Date(event.registrationDeadline);
      if (now > deadline) {
        return errorResponse(
          400,
          `Registration deadline has passed (${deadline.toLocaleDateString()})`
        );
      }
    }

    // Get school from student's record (students belong to schools)
    const schoolId = student.school || session.user.schoolId;
    if (!schoolId) {
      return errorResponse(400, "Student school information not found");
    }

    // ===== VALIDATION 1: Check Grade Eligibility =====
    if (event.eligibleGrades && event.eligibleGrades.length > 0) {
      if (!event.eligibleGrades.includes(student.grade)) {
        return errorResponse(
          400,
          `Student grade "${
            student.grade
          }" is not eligible for this event. Eligible grades: ${event.eligibleGrades.join(
            ", "
          )}`
        );
      }
    }

    // ===== VALIDATION 2: Check Max Participants Per School =====
    if (event.maxParticipantsPerSchool) {
      const approvedCount = await ParticipationRequest.countDocuments({
        event: eventId,
        school: schoolId,
        status: "APPROVED",
      });

      if (approvedCount >= event.maxParticipantsPerSchool) {
        return errorResponse(
          400,
          `This school has reached the maximum participant limit (${event.maxParticipantsPerSchool}) for this event`
        );
      }
    }

    // ===== VALIDATION 3: Check Global Max Participants =====
    if (event.maxParticipants) {
      const totalApproved = await ParticipationRequest.countDocuments({
        event: eventId,
        status: "APPROVED",
      });

      if (totalApproved >= event.maxParticipants) {
        return errorResponse(
          400,
          `This event has reached the maximum participant limit (${event.maxParticipants})`
        );
      }
    }

    // Check if request already exists
    const existingRequest = await ParticipationRequest.findOne({
      student: student._id,
      event: eventId,
      school: schoolId,
    });

    if (existingRequest) {
      return errorResponse(
        400,
        `You already have a ${existingRequest.status} request for this event`
      );
    }

    // Create participation request
    const request = new ParticipationRequest({
      student: student._id,
      event: eventId,
      school: schoolId,
      status: "PENDING",
    });

    await request.save();

    // Fetch populated data after save
    const populatedRequest = await ParticipationRequest.findById(request._id)
      .populate("student", "name enrollmentNumber")
      .populate("event", "title description")
      .lean();

    return successResponse(
      200,
      "Participation request created",
      populatedRequest
    );
  } catch (error) {
    console.error("POST /api/events/[id]/participate error:", error);
    return internalServerError("Internal server error");
  }
}

export async function GET(req, { params }) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return errorResponse(401, "Unauthorized: Please log in");
    }

    if (session.user.role !== "STUDENT") {
      return errorResponse(403, "Only students can check participation status");
    }

    const { id: eventId } = await params;

    // Fetch student by email from session
    const student = await Student.findOne({ email: session.user.email });
    if (!student) {
      return errorResponse(404, "Student not found");
    }

    // Check participation status
    const request = await ParticipationRequest.findOne({
      student: student._id,
      event: eventId,
      school: session.user.schoolId,
    })
      .populate("event", "title description")
      .lean();

    if (!request) {
      return successResponse(200, "No participation request found", null);
    }

    return successResponse(200, "Participation request found", request);
  } catch (error) {
    console.error("GET /api/events/[id]/participate error:", error);
    return internalServerError("Internal server error");
  }
}

export async function DELETE(req, { params }) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return errorResponse(401, "Unauthorized: Please log in");
    }

    if (session.user.role !== "STUDENT") {
      return errorResponse(403, "Only students can withdraw requests");
    }

    const { id: eventId } = await params;

    // Fetch student by email (consistent with POST/GET)
    const student = await Student.findOne({ email: session.user.email });
    if (!student) {
      return errorResponse(404, "Student not found");
    }

    // Get school from student's record
    const schoolId = student.school || session.user.schoolId;
    if (!schoolId) {
      return errorResponse(400, "Student school information not found");
    }

    // Find and delete request (only if PENDING)
    const request = await ParticipationRequest.findOne({
      student: student._id,
      event: eventId,
      school: schoolId,
      status: "PENDING",
    });

    if (!request) {
      return errorResponse(404, "No pending request found to withdraw");
    }

    await ParticipationRequest.deleteOne({ _id: request._id });

    return successResponse(200, "Participation request withdrawn", null);
  } catch (error) {
    console.error("DELETE /api/events/[id]/participate error:", error);
    return internalServerError("Internal server error");
  }
}
