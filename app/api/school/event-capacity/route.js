import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import Event from "@/models/Event";
import ParticipationRequest from "@/models/ParticipationRequest";

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "SCHOOL_ADMIN") {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    await connectDB();

    const events = await Event.find({
      $or: [
        { school: session.user.id },
        { school: null }, // Global events
      ],
    })
      .sort({ date: -1 })
      .lean();

    const eventIds = events.map((event) => event._id);
    const requests = await ParticipationRequest.find({
      event: { $in: eventIds },
      status: { $in: ["APPROVED", "ENROLLED"] },
    })
      .populate("school", "schoolName")
      .select("event school student status")
      .lean();
    const requestsByEvent = new Map();
    for (const request of requests) {
      const eventId = String(request.event || "");
      if (!eventId) continue;
      if (!requestsByEvent.has(eventId)) requestsByEvent.set(eventId, []);
      requestsByEvent.get(eventId).push(request);
    }

    const eventsWithCapacity = events.map((event) => {
      const eventRequests = requestsByEvent.get(String(event._id)) || [];
      const totalEnrolled = eventRequests.length;
      const schoolMap = new Map();
      for (const request of eventRequests) {
        const schoolId = String(request.school?._id || request.school || "");
        if (!schoolId) continue;
        const current = schoolMap.get(schoolId) || {
          schoolId,
          schoolName: request.school?.schoolName || "Unknown School",
          enrolled: 0,
        };
        current.enrolled += 1;
        schoolMap.set(schoolId, current);
      }
      const schoolCapacity = Array.from(schoolMap.values());

      return {
        _id: event._id,
        title: event.title,
        date: event.date,
        description: event.description,
        eligibleGrades: event.eligibleGrades,
        maxParticipants: event.maxParticipants,
        maxParticipantsPerSchool: event.maxParticipantsPerSchool,
        totalEnrolled,
        schoolCapacity,
      };
    });

    return NextResponse.json(
      {
        success: true,
        message: "Event capacity data fetched",
        data: eventsWithCapacity,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("GET /api/school/event-capacity error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
