import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/db";
import Student from "@/models/Student";
import ParticipationRequest from "@/models/ParticipationRequest";
import Event from "@/models/Event";

/**
 * GET /api/events/hub/my-requests
 * Returns student's all participation requests organized by status
 * Includes event details for each request
 */
export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "STUDENT") {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    await dbConnect();

    // Get student
    const student = await Student.findOne({ userId: session.user.id });

    if (!student) {
      return NextResponse.json(
        { message: "Student profile not found" },
        { status: 404 }
      );
    }

    // Get all requests for this student
    const requests = await ParticipationRequest.find({
      student: student._id,
    })
      .populate({
        path: "event",
        select: "title description date registrationDeadline maxParticipants participants createdBy",
        populate: {
          path: "createdBy",
          select: "name email",
        },
      })
      .sort({ requestedAt: -1 })
      .lean();

    // Organize by status
    const organized = {
      PENDING: [],
      APPROVED: [],
      ENROLLED: [],
      REJECTED: [],
      WITHDRAWN: [],
    };

    requests.forEach((request) => {
      organized[request.status].push({
        id: request._id,
        eventId: request.event._id,
        eventTitle: request.event.title,
        eventDate: request.event.date,
        eventStatus: getEventStatus(request.event),
        status: request.status,
        requestedAt: request.requestedAt,
        approvedAt: request.approvedAt,
        rejectionReason: request.rejectionReason,
        rejectedAt: request.rejectedAt,
        notes: request.notes,
        event: request.event,
      });
    });

    return NextResponse.json(
      {
        PENDING: organized.PENDING,
        APPROVED: organized.APPROVED,
        ENROLLED: organized.ENROLLED,
        REJECTED: organized.REJECTED,
        WITHDRAWN: organized.WITHDRAWN,
        total: requests.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching my requests:", error);
    return NextResponse.json(
      { message: "Internal server error", error: error.message },
      { status: 500 }
    );
  }
}

function getEventStatus(event) {
  const now = new Date();

  if (event.date < now) {
    return "ENDED";
  }

  if (event.registrationDeadline && event.registrationDeadline < now) {
    return "CLOSED";
  }

  if (
    event.maxParticipants &&
    event.participants.length >= event.maxParticipants
  ) {
    return "FULL";
  }

  return "OPEN";
}
