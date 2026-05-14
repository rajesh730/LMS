import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/db";
import Event from "@/models/Event";
import EventSchoolInvitation from "@/models/EventSchoolInvitation";
import Student from "@/models/Student";
import ParticipationRequest from "@/models/ParticipationRequest";
import { isAfterEndOfDay, startOfToday } from "@/lib/eventDates";
import { getEquivalentGradeValues } from "@/lib/schoolGrades";
import { buildEventPresentationState } from "@/lib/eventPresentation";

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

    const approvedPlatformEventIds = student.school
      ? await EventSchoolInvitation.find({
          school: student.school,
          status: "APPROVED",
        }).distinct("event")
      : [];
    const eligibleGradeValues = getEquivalentGradeValues(student.grade);
    const requestedEventIds = await ParticipationRequest.find({
      student: student._id,
    }).distinct("event");

    // Find eligible events. Already registered events stay visible for tracking
    // and history, even after completion. Discovery remains limited to active
    // direct-registration events.
    const baseQuery = {
      ...searchQuery,
      status: "APPROVED",
      $and: [
        {
          $or: [
            { eligibleGrades: { $size: 0 } }, // No grade restrictions
            { eligibleGrades: { $in: eligibleGradeValues } },
          ],
        },
        {
          $or: [
            { _id: { $in: requestedEventIds } },
            {
              lifecycleStatus: "ACTIVE",
              date: { $gte: startOfToday() },
              $or: [
                {
                  registrationMode: "DIRECT",
                  eventScope: "SCHOOL",
                  school: student.school,
                },
                {
                  registrationMode: "DIRECT",
                  eventScope: "PLATFORM",
                  _id: { $in: approvedPlatformEventIds },
                },
              ],
            },
          ],
        },
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
      const isDeadlinePassed =
        event.registrationDeadline && isAfterEndOfDay(event.registrationDeadline);
      const isFull =
        event.maxParticipants &&
        getStudentEnrollmentCount(event) >= event.maxParticipants;
      const presentedEvent = {
        ...event,
        userStatus: request ? request.status : null,
        participationStatus: request ? request.status : null,
        isParticipating: Boolean(request),
        deadline: event.registrationDeadline,
        capacity: event.maxParticipants,
      };

      return {
        ...presentedEvent,
        canRequest:
          event.registrationMode === "DIRECT" &&
          !request &&
          !isDeadlinePassed &&
          !isFull,
        capacityInfo: getCapacityInfo(event),
        daysUntilDeadline: event.registrationDeadline
          ? Math.ceil(
              (event.registrationDeadline - new Date()) / (1000 * 60 * 60 * 24)
            )
          : null,
        eventStatus: getEventStatus(event),
        ...buildEventPresentationState(presentedEvent, {
          participationStatus: request ? request.status : null,
          studentCount: Boolean(request) ? 1 : 0,
        }),
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
  const filled = getStudentEnrollmentCount(event);

  if (!event.maxParticipants) {
    return {
      unlimited: true,
      total: null,
      filled,
      available: null,
      percentage: 0,
    };
  }

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
  const lifecycleStatus = String(event.lifecycleStatus || "").toUpperCase();
  if (["COMPLETED", "ARCHIVED", "CANCELLED"].includes(lifecycleStatus)) {
    return lifecycleStatus;
  }

  const now = new Date();
  const filled = getStudentEnrollmentCount(event);

  if (event.date < now) {
    return "ENDED";
  }

  if (
    event.registrationDeadline &&
    isAfterEndOfDay(event.registrationDeadline)
  ) {
    return "CLOSED";
  }

  if (
    event.maxParticipants &&
    filled >= event.maxParticipants
  ) {
    return "FULL";
  }

  if (
    event.maxParticipants &&
    filled > event.maxParticipants * 0.8
  ) {
    return "FILLING";
  }

  return "OPEN";
}

function getStudentEnrollmentCount(event) {
  return (event.participants || []).reduce(
    (total, participant) => total + (participant.students?.length || 0),
    0
  );
}
