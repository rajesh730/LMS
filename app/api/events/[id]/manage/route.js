import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/db";
import Event from "@/models/Event";
import ParticipationRequest from "@/models/ParticipationRequest";
import Student from "@/models/Student";

/**
 * GET /api/events/[id]/manage
 * Get complete event with all participation requests for management
 * Only event creator or admin can access
 */
export async function GET(req, { params }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const { id: eventId } = params;

    // Get event
    const event = await Event.findById(eventId).populate(
      "createdBy",
      "name email"
    );

    if (!event) {
      return NextResponse.json({ message: "Event not found" }, { status: 404 });
    }

    // Check authorization
    if (
      event.createdBy._id.toString() !== session.user.id &&
      !["SCHOOL_ADMIN", "SUPER_ADMIN"].includes(session.user.role)
    ) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    // Get all participation requests
    const requests = await ParticipationRequest.find({
      event: eventId,
    })
      .populate("student", "name email grade")
      .populate("school", "name")
      .lean();

    // Organize requests by status
    const organized = {
      PENDING: [],
      APPROVED: [],
      REJECTED: [],
      WITHDRAWN: [],
    };

    requests.forEach((req) => {
      organized[req.status]?.push(req);
    });

    // Calculate capacity info
    const capacityInfo = {
      total: event.maxParticipants || null,
      filled: event.participants.reduce(
        (sum, p) => sum + (p.students ? p.students.length : 0),
        0
      ),
      pending: organized.PENDING.length,
      approved: organized.APPROVED.length,
      rejected: organized.REJECTED.length,
    };

    if (capacityInfo.total) {
      capacityInfo.available = Math.max(
        0,
        capacityInfo.total - capacityInfo.filled
      );
      capacityInfo.percentage = Math.round(
        (capacityInfo.filled / capacityInfo.total) * 100
      );
    }

    // Get per-school breakdown
    const perSchoolBreakdown = event.participants.map((p) => ({
      school: p.school,
      count: p.students ? p.students.length : 0,
      limit: event.maxParticipantsPerSchool || null,
      percentage: event.maxParticipantsPerSchool
        ? Math.round(
            ((p.students ? p.students.length : 0) /
              event.maxParticipantsPerSchool) *
              100
          )
        : null,
    }));

    return NextResponse.json(
      {
        event: {
          id: event._id,
          title: event.title,
          description: event.description,
          date: event.date,
          registrationDeadline: event.registrationDeadline,
          createdBy: event.createdBy,
          status: event.status,
          eligibleGrades: event.eligibleGrades,
          maxParticipants: event.maxParticipants,
          maxParticipantsPerSchool: event.maxParticipantsPerSchool,
        },
        requests: {
          PENDING: organized.PENDING,
          APPROVED: organized.APPROVED,
          REJECTED: organized.REJECTED,
          WITHDRAWN: organized.WITHDRAWN,
        },
        capacityInfo,
        perSchoolBreakdown,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching event management data:", error);
    return NextResponse.json(
      { message: "Internal server error", error: error.message },
      { status: 500 }
    );
  }
}
