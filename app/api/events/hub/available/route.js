import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/db";
import Event from "@/models/Event";
import EventSchoolInvitation from "@/models/EventSchoolInvitation";
import Student from "@/models/Student";
import ParticipationRequest from "@/models/ParticipationRequest";
import EventNotice from "@/models/EventNotice";
import { isAfterEndOfDay, startOfToday } from "@/lib/eventDates";
import { buildEventPresentationState } from "@/lib/eventPresentation";
import { isTeamEventLike } from "@/lib/eventParticipationFormat";

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
      isDeleted: { $ne: true },
      status: "ACTIVE",
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
    const requestedEventIds = await ParticipationRequest.find({
      student: student._id,
    }).distinct("event");

    const activeUpcomingEvent = {
      lifecycleStatus: "ACTIVE",
      date: { $gte: startOfToday() },
    };
    // Students can discover every active event their school can access.
    // eligibleGrades is enforced only when the school registers students.
    const baseQuery = {
      ...searchQuery,
      status: "APPROVED",
      $or: [
        { _id: { $in: requestedEventIds } },
        {
          ...activeUpcomingEvent,
          eventScope: "SCHOOL",
          school: student.school,
        },
        {
          ...activeUpcomingEvent,
          eventScope: "PLATFORM",
          _id: { $in: approvedPlatformEventIds },
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

    // Get participation requests for this student, aggregate counts, and latest event notices.
    const [requests, allEventRequests, eventNotices] = await Promise.all([
      ParticipationRequest.find({
        student: student._id,
        event: { $in: events.map((e) => e._id) },
      }),
      ParticipationRequest.find({
        event: { $in: events.map((e) => e._id) },
        status: { $in: ["PENDING", "APPROVED", "ENROLLED"] },
      })
        .select("event school status teamName student")
        .lean(),
      EventNotice.find({
        event: { $in: events.map((e) => e._id) },
        round: null,
        status: "PUBLISHED",
        visibility: "PUBLIC",
        isDeleted: { $ne: true },
      })
        .select("event title message type publishedAt createdAt")
        .sort({ publishedAt: -1, createdAt: -1 })
        .lean(),
    ]);

    const requestMap = new Map();
    requests.forEach((req) => {
      requestMap.set(req.event.toString(), req);
    });
    const requestsByEvent = groupRequestsByEvent(allEventRequests);
    const latestNoticeByEvent = new Map();
    const noticeCountByEvent = new Map();
    eventNotices.forEach((notice) => {
      const key = String(notice.event || "");
      if (!key) return;
      noticeCountByEvent.set(key, (noticeCountByEvent.get(key) || 0) + 1);
      if (!latestNoticeByEvent.has(key)) {
        latestNoticeByEvent.set(key, notice);
      }
    });

    // Enhance events with participation status
    const enrichedEvents = events.map((event) => {
      const request = requestMap.get(event._id.toString());
      const latestNotice = latestNoticeByEvent.get(event._id.toString());
      const eventRequests = requestsByEvent.get(String(event._id)) || [];
      const participationCounts = getParticipationCounts(event, eventRequests);
      const schoolRequests = eventRequests.filter(
        (item) => String(item.school?._id || item.school || "") === String(student.school || "")
      );
      const schoolParticipationCounts = getParticipationCounts(event, schoolRequests);
      const presentedEvent = {
        ...event,
        userStatus: request ? request.status : null,
        participationStatus: request ? request.status : null,
        isParticipating: Boolean(request),
        deadline: event.registrationDeadline,
        capacity: event.maxParticipants,
        enrolled: participationCounts.capacityUnits,
        studentCount: participationCounts.studentCount,
        memberCount: participationCounts.studentCount,
        teamCount: participationCounts.teamCount,
        schoolCount: participationCounts.schoolCount,
        studentCapacityCount: participationCounts.capacityUnits,
        myParticipation: request
          ? {
              studentCount: schoolParticipationCounts.studentCount,
              teamCount: schoolParticipationCounts.teamCount,
            }
          : null,
      };

      return {
        ...presentedEvent,
        canRequest: false,
        registrationSupportMode: "SCHOOL_MANAGED",
        capacityInfo: getCapacityInfo(event, eventRequests),
        daysUntilDeadline: event.registrationDeadline
          ? Math.ceil(
              (event.registrationDeadline - new Date()) / (1000 * 60 * 60 * 24)
            )
          : null,
        eventStatus: getEventStatus(event, eventRequests),
        latestEventNotice: latestNotice
          ? {
              _id: latestNotice._id,
              title: latestNotice.title,
              message: latestNotice.message,
              type: latestNotice.type,
              publishedAt: latestNotice.publishedAt || latestNotice.createdAt,
            }
          : null,
        eventNoticeCount: latestNotice
          ? noticeCountByEvent.get(event._id.toString()) || 1
          : 0,
        ...buildEventPresentationState(presentedEvent, {
          participationStatus: request ? request.status : null,
          studentCount: request ? schoolParticipationCounts.studentCount : 0,
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

function groupRequestsByEvent(requests = []) {
  const grouped = new Map();
  requests.forEach((request) => {
    const eventId = String(request.event || "");
    if (!eventId) return;
    grouped.set(eventId, [...(grouped.get(eventId) || []), request]);
  });
  return grouped;
}

function buildTeamKey(request) {
  return `${String(request.school?._id || request.school || "")}::${String(
    request.teamName || ""
  )
    .trim()
    .toLowerCase() || "default-team"}`;
}

function getParticipationCounts(event, requests = []) {
  const schoolIds = new Set(
    requests
      .map((request) => String(request.school?._id || request.school || ""))
      .filter(Boolean)
  );
  const teamCount = isTeamEventLike(event)
    ? new Set(requests.map(buildTeamKey)).size
    : 0;
  const studentCount = requests.length;

  return {
    schoolCount: schoolIds.size,
    studentCount,
    teamCount,
    capacityUnits: isTeamEventLike(event) ? teamCount : studentCount,
  };
}

function getCapacityInfo(event, requests = []) {
  const filled = getParticipationCounts(event, requests).capacityUnits;

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

function getEventStatus(event, requests = []) {
  const lifecycleStatus = String(event.lifecycleStatus || "").toUpperCase();
  if (["COMPLETED", "ARCHIVED", "CANCELLED"].includes(lifecycleStatus)) {
    return lifecycleStatus;
  }

  const now = new Date();
  const filled = getParticipationCounts(event, requests).capacityUnits;

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
