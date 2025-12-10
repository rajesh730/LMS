import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/db";
import Event from "@/models/Event";
import Student from "@/models/Student";
import ParticipationRequest from "@/models/ParticipationRequest";

/**
 * GET /api/events/hub/available
 * Returns only ELIGIBLE events for the logged-in student
 * Includes their participation status on each event
 */
export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "STUDENT") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    // Get student info
    const student = await Student.findOne({ userId: session.user.id });

    if (!student) {
      return NextResponse.json(
        { message: "Student profile not found" },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const sort = searchParams.get("sort") || "date";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = 12;
    const skip = (page - 1) * limit;

    // Build search query
    const searchQuery = search
      ? {
          $or: [
            { title: { $regex: search, $options: "i" } },
            { description: { $regex: search, $options: "i" } },
          ],
        }
      : {};

    // Find eligible events
    const baseQuery = {
      ...searchQuery,
      status: "APPROVED",
      date: { $gt: new Date() }, // Only future events
      $or: [
        { eligibleGrades: { $size: 0 } }, // No grade restrictions
        { eligibleGrades: student.grade },
      ],
    };

    const events = await Event.find(baseQuery)
      .sort({ [sort]: sort === "date" ? 1 : -1 })
      .skip(skip)
      .limit(limit)
      .populate("createdBy", "name email")
      .lean();

    const total = await Event.countDocuments(baseQuery);

    // Get participation requests for this student
    const requests = await ParticipationRequest.find({
      student: student._id,
      event: { $in: events.map((e) => e._id) },
    });

    const requestMap = new Map();
    requests.forEach((req) => {
      requestMap.set(req.event.toString(), req);
    });

    // Enhance events with participation status
    const enrichedEvents = events.map((event) => {
      const request = requestMap.get(event._id.toString());
      const now = new Date();
      const isDeadlinePassed =
        event.registrationDeadline && event.registrationDeadline < now;
      const isFull =
        event.maxParticipants &&
        event.participants.length >= event.maxParticipants;

      return {
        ...event,
        userStatus: request ? request.status : null,
        canRequest: !request && !isDeadlinePassed && !isFull,
        capacityInfo: getCapacityInfo(event),
        daysUntilDeadline: event.registrationDeadline
          ? Math.ceil(
              (event.registrationDeadline - now) / (1000 * 60 * 60 * 24)
            )
          : null,
        eventStatus: getEventStatus(event),
      };
    });

    return NextResponse.json(
      {
        events: enrichedEvents,
        pagination: {
          current: page,
          total: Math.ceil(total / limit),
          hasMore: skip + limit < total,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching available events:", error);
    return NextResponse.json(
      { message: "Internal server error", error: error.message },
      { status: 500 }
    );
  }
}

function getCapacityInfo(event) {
  if (!event.maxParticipants) {
    return {
      unlimited: true,
      total: null,
      filled: event.participants.length,
      available: null,
      percentage: 0,
    };
  }

  const filled = event.participants.length;
  const total = event.maxParticipants;
  const available = Math.max(0, total - filled);
  const percentage = Math.round((filled / total) * 100);

  return {
    unlimited: false,
    total,
    filled,
    available,
    percentage,
  };
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

  if (
    event.maxParticipants &&
    event.participants.length > event.maxParticipants * 0.8
  ) {
    return "FILLING";
  }

  return "OPEN";
}
