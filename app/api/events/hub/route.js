import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/db";
import Event from "@/models/Event";
import Student from "@/models/Student";
import User from "@/models/User";

/**
 * GET /api/events/hub
 * Main hub API - returns events based on user role
 * For students: eligible events + their participation status
 * For admins: events they created/can manage
 * For teachers: events they created
 */
export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    await dbConnect();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const sort = searchParams.get("sort") || "date";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = 12;
    const skip = (page - 1) * limit;

    const searchQuery = search
      ? {
          $or: [
            { title: { $regex: search, $options: "i" } },
            { description: { $regex: search, $options: "i" } },
          ],
        }
      : {};

    let response = {};

    if (session.user.role === "STUDENT") {
      // Get student info for grade eligibility
      const student = await Student.findOne({ userId: session.user.id });

      if (!student) {
        return NextResponse.json(
          { message: "Student profile not found" },
          { status: 404 }
        );
      }

      // Find eligible events
      const baseQuery = {
        ...searchQuery,
        status: "APPROVED",
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

      response = {
        events: events.map((event) => ({
          ...event,
          status: getEventStatus(event),
          capacityInfo: getCapacityInfo(event),
          eligible: true,
        })),
        pagination: {
          current: page,
          total: Math.ceil(total / limit),
          hasMore: skip + limit < total,
        },
      };
    } else if (
      session.user.role === "SCHOOL_ADMIN" ||
      session.user.role === "SUPER_ADMIN"
    ) {
      // Get school ID for filtering
      const user = await User.findById(session.user.id);
      const schoolFilter =
        session.user.role === "SCHOOL_ADMIN"
          ? { school: user._id }
          : {}; // SUPER_ADMIN sees all

      const events = await Event.find({
        ...searchQuery,
        ...schoolFilter,
      })
        .sort({ [sort]: sort === "date" ? 1 : -1 })
        .skip(skip)
        .limit(limit)
        .populate("createdBy", "name email")
        .populate("school", "name")
        .lean();

      const total = await Event.countDocuments({
        ...searchQuery,
        ...schoolFilter,
      });

      response = {
        events: events.map((event) => ({
          ...event,
          status: getEventStatus(event),
          capacityInfo: getCapacityInfo(event),
        })),
        pagination: {
          current: page,
          total: Math.ceil(total / limit),
          hasMore: skip + limit < total,
        },
      };
    } else if (session.user.role === "TEACHER") {
      // Teachers see all events + their created events
      const events = await Event.find(searchQuery)
        .sort({ [sort]: sort === "date" ? 1 : -1 })
        .skip(skip)
        .limit(limit)
        .populate("createdBy", "name email")
        .lean();

      const total = await Event.countDocuments(searchQuery);

      response = {
        events: events.map((event) => ({
          ...event,
          status: getEventStatus(event),
          capacityInfo: getCapacityInfo(event),
          isCreator: event.createdBy._id.toString() === session.user.id,
        })),
        pagination: {
          current: page,
          total: Math.ceil(total / limit),
          hasMore: skip + limit < total,
        },
      };
    }

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("Error in hub API:", error);
    return NextResponse.json(
      { message: "Internal server error", error: error.message },
      { status: 500 }
    );
  }
}

/**
 * Determine event status based on dates and capacity
 */
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

/**
 * Calculate capacity info for display
 */
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
