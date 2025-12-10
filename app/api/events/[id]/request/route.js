import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/db";
import Event from "@/models/Event";
import Student from "@/models/Student";
import ParticipationRequest from "@/models/ParticipationRequest";

/**
 * POST /api/events/[id]/request
 * Student requests to participate in an event
 * Includes all validations inline:
 * - Student eligibility (grade)
 * - Event capacity (global & per-school)
 * - Registration deadline
 * - No duplicate requests
 */
export async function POST(req, { params }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "STUDENT") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const { id: eventId } = params;

    // ===== VALIDATION 1: Event exists and is approved =====
    const event = await Event.findById(eventId);

    if (!event) {
      return NextResponse.json({ message: "Event not found" }, { status: 404 });
    }

    if (event.status !== "APPROVED") {
      return NextResponse.json(
        { message: "Event is not available for participation" },
        { status: 400 }
      );
    }

    // ===== VALIDATION 2: Get student =====
    const student = await Student.findOne({ userId: session.user.id }).populate(
      "school"
    );

    if (!student) {
      return NextResponse.json(
        { message: "Student profile not found" },
        { status: 404 }
      );
    }

    // ===== VALIDATION 3: Check grade eligibility =====
    if (event.eligibleGrades.length > 0) {
      if (!event.eligibleGrades.includes(student.grade)) {
        return NextResponse.json(
          {
            message: `Your grade (${student.grade}) is not eligible for this event`,
            code: "GRADE_INELIGIBLE",
          },
          { status: 400 }
        );
      }
    }

    // ===== VALIDATION 4: Check registration deadline =====
    const now = new Date();
    if (event.registrationDeadline && event.registrationDeadline < now) {
      return NextResponse.json(
        {
          message: "Registration deadline has passed",
          code: "DEADLINE_PASSED",
        },
        { status: 400 }
      );
    }

    // ===== VALIDATION 5: Check global capacity =====
    if (event.maxParticipants) {
      const currentEnrolled = event.participants.reduce(
        (sum, p) => sum + (p.students ? p.students.length : 0),
        0
      );

      if (currentEnrolled >= event.maxParticipants) {
        return NextResponse.json(
          {
            message: "Event is at full capacity",
            code: "CAPACITY_FULL",
          },
          { status: 400 }
        );
      }
    }

    // ===== VALIDATION 6: Check per-school capacity =====
    if (event.maxParticipantsPerSchool) {
      const schoolParticipant = event.participants.find(
        (p) => p.school.toString() === student.school._id.toString()
      );

      const schoolCount = schoolParticipant
        ? schoolParticipant.students.length
        : 0;

      if (schoolCount >= event.maxParticipantsPerSchool) {
        return NextResponse.json(
          {
            message: `Your school has reached the participation limit (${event.maxParticipantsPerSchool})`,
            code: "SCHOOL_CAPACITY_FULL",
          },
          { status: 400 }
        );
      }
    }

    // ===== VALIDATION 7: Check for existing request =====
    const existingRequest = await ParticipationRequest.findOne({
      student: student._id,
      event: eventId,
    });

    if (existingRequest) {
      if (existingRequest.status === "WITHDRAWN") {
        // Allow re-request after withdrawal
        return NextResponse.json(
          {
            message:
              "You already withdrew from this event. Contact admin to rejoin.",
            code: "ALREADY_WITHDRAWN",
          },
          { status: 400 }
        );
      } else {
        return NextResponse.json(
          {
            message: `You already have a ${existingRequest.status.toLowerCase()} request for this event`,
            code: "DUPLICATE_REQUEST",
            existingStatus: existingRequest.status,
          },
          { status: 400 }
        );
      }
    }

    // ===== CREATE PARTICIPATION REQUEST =====
    const request = new ParticipationRequest({
      student: student._id,
      event: eventId,
      school: student.school._id,
      status:
        session.user.role === "SUPER_ADMIN" ||
        event.createdBy.toString() === session.user.id
          ? "APPROVED"
          : "PENDING",
      requestedAt: now,
    });

    // If auto-approved, set the approval details
    if (request.status === "APPROVED") {
      request.approvedAt = now;
      request.approvedBy = session.user.id;
      request.enrollmentConfirmedAt = now;
    }

    await request.save();

    // ===== AUTO-ADD TO EVENT IF APPROVED =====
    if (request.status === "APPROVED" || request.status === "ENROLLED") {
      const schoolParticipant = event.participants.find(
        (p) => p.school.toString() === student.school._id.toString()
      );

      if (schoolParticipant) {
        if (!schoolParticipant.students.includes(student._id)) {
          schoolParticipant.students.push(student._id);
        }
      } else {
        event.participants.push({
          school: student.school._id,
          students: [student._id],
          joinedAt: now,
        });
      }

      await event.save();
    }

    return NextResponse.json(
      {
        message:
          request.status === "PENDING"
            ? "Request submitted successfully. Awaiting admin approval."
            : "You are enrolled in the event!",
        request: {
          id: request._id,
          status: request.status,
          eventId: event._id,
          eventTitle: event.title,
          requestedAt: request.requestedAt,
          approvedAt: request.approvedAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error requesting event participation:", error);
    return NextResponse.json(
      { message: "Internal server error", error: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/events/[id]/request
 * Get participation request status for current student
 */
export async function GET(req, { params }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "STUDENT") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const { id: eventId } = params;

    const student = await Student.findOne({ userId: session.user.id });

    if (!student) {
      return NextResponse.json(
        { message: "Student profile not found" },
        { status: 404 }
      );
    }

    const request = await ParticipationRequest.findOne({
      student: student._id,
      event: eventId,
    });

    if (!request) {
      return NextResponse.json(
        { status: null, message: "No request found" },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        status: request.status,
        requestedAt: request.requestedAt,
        approvedAt: request.approvedAt,
        rejectionReason: request.rejectionReason,
        requestId: request._id,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching request status:", error);
    return NextResponse.json(
      { message: "Internal server error", error: error.message },
      { status: 500 }
    );
  }
}
