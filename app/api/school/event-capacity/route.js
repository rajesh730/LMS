import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import Event from "@/models/Event";
import User from "@/models/User";
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

    // Get all events for this school (or global events)
    const events = await Event.find({
      $or: [
        { school: session.user.id },
        { school: null }, // Global events
      ],
    })
      .populate("participants.school", "schoolName")
      .sort({ date: -1 })
      .lean();

    // Calculate capacity for each event
    const eventsWithCapacity = events.map((event) => {
      // Calculate total enrolled students
      const totalEnrolled =
        event.participants?.reduce(
          (sum, p) => sum + (p.students?.length || 0),
          0
        ) || 0;

      // Calculate per-school capacity
      const schoolCapacity =
        event.participants?.map((p) => ({
          schoolId: p.school?._id?.toString() || p.school?.toString(),
          schoolName: p.school?.schoolName || "Unknown School",
          enrolled: p.students?.length || 0,
        })) || [];

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
