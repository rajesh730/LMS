import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/authz";
import dbConnect from "@/lib/db";
import Student from "@/models/Student";
import ParticipationRequest from "@/models/ParticipationRequest";
import "@/models/Event";
import { buildEventPresentationState } from "@/lib/eventPresentation";
import { buildStudentLookupForSession } from "@/lib/studentIdentity";

/**
 * GET /api/events/hub/past
 * Returns student's past/attended events
 * Only events with date in the past and status ENROLLED or APPROVED
 */
export async function GET(req) {
  try {
    const { session, error: authError } = await requireApiSession();
    if (authError) return authError;

    if (!session || session.user.role !== "STUDENT") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    // Student sessions use the Student document id, with fallbacks for legacy data.
    const student = await Student.findOne({
      ...buildStudentLookupForSession(session),
    });

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
        match: {
          $or: [
            { date: { $lt: now } },
            { lifecycleStatus: "COMPLETED" },
            { resultsPublished: true },
          ],
        },
        select:
          "title description date createdBy maxParticipants participants lifecycleStatus resultsPublished",
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
      .map((request) => {
        const presentation = buildEventPresentationState(request.event, {
          participationStatus: request.status,
          studentCount: 1,
        });

        return {
          id: request._id,
          eventId: request.event._id,
          eventTitle: request.event.title,
          eventDescription: request.event.description,
          eventDate: request.event.date,
          status: request.status,
          enrolledAt: request.enrollmentConfirmedAt || request.approvedAt,
          createdBy: request.event.createdBy,
          participantCount: getStudentEnrollmentCount(request.event),
          presentation,
        };
      });

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

function getStudentEnrollmentCount(event) {
  return (event.participants || []).reduce(
    (total, participant) => total + (participant.students?.length || 0),
    0
  );
}
