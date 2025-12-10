import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/db";
import Student from "@/models/Student";
import ParticipationRequest from "@/models/ParticipationRequest";

/**
 * GET /api/events/hub/past
 * Returns student's past/attended events
 * Only events with date in the past and status ENROLLED or APPROVED
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

    const now = new Date();

    // Get past events where student participated
    const requests = await ParticipationRequest.find({
      student: student._id,
      status: { $in: ["ENROLLED", "APPROVED"] },
    })
      .populate({
        path: "event",
        match: { date: { $lt: now } }, // Only past events
        select:
          "title description date createdBy maxParticipants participants",
        populate: {
          path: "createdBy",
          select: "name email",
        },
      })
      .sort({ requestedAt: -1 })
      .lean();

    // Filter out requests where event is null (didn't match the date filter)
    const pastEvents = requests
      .filter((r) => r.event !== null)
      .map((request) => ({
        id: request._id,
        eventId: request.event._id,
        eventTitle: request.event.title,
        eventDescription: request.event.description,
        eventDate: request.event.date,
        status: request.status,
        enrolledAt: request.enrollmentConfirmedAt || request.approvedAt,
        createdBy: request.event.createdBy,
        participantCount: request.event.participants.length,
      }));

    return NextResponse.json(
      {
        events: pastEvents,
        total: pastEvents.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching past events:", error);
    return NextResponse.json(
      { message: "Internal server error", error: error.message },
      { status: 500 }
    );
  }
}
