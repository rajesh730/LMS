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
export async function POST(_req, { params }) {
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

    return NextResponse.json(
      {
        message:
          "Student self-registration is disabled in phase 1. Please contact your teacher or school admin for registration.",
        code: "SCHOOL_MANAGED_REGISTRATION",
      },
      { status: 403 }
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

    const student = await Student.findOne({
      $or: [
        { _id: session.user.id },
        { userId: session.user.id },
        { email: session.user.email },
        { username: session.user.email },
      ],
    });

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
