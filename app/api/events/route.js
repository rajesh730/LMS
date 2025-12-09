import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import Event from "@/models/Event";
import Group from "@/models/Group";
import Student from "@/models/Student";

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);

    if (
      !session ||
      !["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER"].includes(session.user.role)
    ) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const {
      title,
      description,
      date,
      targetGroup,
      registrationDeadline,
      maxParticipants,
      maxParticipantsPerSchool,
      eligibleGrades,
    } = await req.json();

    if (!title || !description || !date) {
      return NextResponse.json(
        { message: "All fields are required" },
        { status: 400 }
      );
    }

    await connectDB();

    const status = session.user.role === "TEACHER" ? "PENDING" : "APPROVED";

    // For non-super-admin, tag the school for scoping
    const school = ["SCHOOL_ADMIN", "TEACHER"].includes(session.user.role)
      ? session.user.schoolId || null
      : null;

    const newEvent = await Event.create({
      title,
      description,
      date,
      createdBy: session.user.id,
      targetGroup: targetGroup || null,
      school,
      registrationDeadline: registrationDeadline || null,
      maxParticipants: maxParticipants || null,
      maxParticipantsPerSchool: maxParticipantsPerSchool || null,
      eligibleGrades: eligibleGrades || [],
      status,
    });

    return NextResponse.json(
      { message: "Event created successfully", event: newEvent },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create Event Error:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Block unsubscribed schools
    if (
      session.user.role === "SCHOOL_ADMIN" &&
      session.user.status === "UNSUBSCRIBED"
    ) {
      return NextResponse.json(
        { message: "Subscription inactive" },
        { status: 403 }
      );
    }

    await connectDB();

    let query = {};

    if (
      session.user.role === "SCHOOL_ADMIN" ||
      session.user.role === "TEACHER"
    ) {
      // Find groups this school belongs to (if applicable) - For now assuming Teachers belong to same context
      // Ideally we need to filter by School. But Event model doesn't have School.
      // We are relying on 'targetGroup' which is Global or Group-based.
      // If we want to support School-specific events without Groups, we need 'school' field in Event.
      // For now, let's keep existing logic but add Status filter.

      const mongoose = (await import("mongoose")).default;

      // Resolve schoolId from session (SCHOOL_ADMIN uses own id; TEACHER was hydrated in auth callbacks)
      const schoolObjectId = session.user.schoolId
        ? new mongoose.Types.ObjectId(session.user.schoolId)
        : null;

      let groupIds = [];
      if (schoolObjectId) {
        const schoolGroups = await Group.find({
          schools: schoolObjectId,
        }).select("_id");
        groupIds = schoolGroups.map((g) => g._id);
      }

      // Base query: Global events OR Targeted events OR same-school events
      const orConditions = [{ targetGroup: null }];
      if (schoolObjectId) {
        orConditions.push({ school: schoolObjectId });
      }
      if (groupIds.length > 0) {
        orConditions.push({ targetGroup: { $in: groupIds } });
      }

      query = { $or: orConditions };

      // Status Filter:
      // SCHOOL_ADMIN sees all; TEACHER sees approved (or their own pending?)
      if (session.user.role === "TEACHER") {
        // Allow teachers to see approved events plus their own (even if pending)
        query = {
          $and: [
            { $or: orConditions },
            {
              $or: [{ status: "APPROVED" }, { createdBy: session.user.id }],
            },
          ],
        };
      }
    }

    // If Super Admin, query remains {} (fetch all)

    let events;
    try {
      // For admin, populate participant school details
      if (session.user.role === "SUPER_ADMIN") {
        events = await Event.find(query)
          .sort({ date: 1 })
          .populate("targetGroup", "name")
          .populate(
            "participants.school",
            "schoolName email principalName principalPhone"
          )
          .populate("participants.students", "name grade")
          .lean();
      } else {
        // For schools/teachers, just get basic data
        events = await Event.find(query)
          .sort({ date: 1 })
          .populate("targetGroup", "name")
          .lean();
      }
    } catch (queryError) {
      console.error("Query Error:", queryError.message);
      throw queryError;
    }

    // Add isParticipating flag and participantCount
    const eventsWithParticipation = events.map((event) => {
      const eventObj = { ...event };
      eventObj.participantCount = event.participants?.length || 0;

      if (session.user.role === "SCHOOL_ADMIN") {
        // Find current user's participation
        const myParticipation = event.participants?.find(
          (p) => p.school?.toString() === session.user.id
        );
        eventObj.isParticipating = !!myParticipation;
        // Include participation details for the detail modal
        if (myParticipation) {
          eventObj.myParticipation = myParticipation;
        }
      }

      return eventObj;
    });

    return NextResponse.json(
      { events: eventsWithParticipation },
      { status: 200 }
    );
  } catch (error) {
    console.error("Fetch Events Error:", error.message);
    console.error("Stack:", error.stack);
    return NextResponse.json(
      { message: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}
