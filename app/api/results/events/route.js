import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import Event from "@/models/Event";
import ParticipationRequest from "@/models/ParticipationRequest";
import Achievement from "@/models/Achievement";

export const dynamic = "force-dynamic";

function buildQuery(session) {
  if (session.user.role === "SUPER_ADMIN") {
    return { eventScope: "PLATFORM" };
  }

  if (session.user.role === "SCHOOL_ADMIN") {
    return { school: session.user.id };
  }

  return null;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["SUPER_ADMIN", "SCHOOL_ADMIN"].includes(session.user.role)) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    await connectDB();

    const baseQuery = buildQuery(session);
    if (!baseQuery) {
      return NextResponse.json(
        { success: false, message: "Forbidden" },
        { status: 403 }
      );
    }

    const events = await Event.find({
      ...baseQuery,
      status: "APPROVED",
      lifecycleStatus: { $ne: "ARCHIVED" },
    })
      .sort({ date: -1 })
      .select("title date eventType eventScope school visibility lifecycleStatus resultsPublished")
      .populate("school", "schoolName")
      .lean();

    const eventIds = events.map((event) => event._id);

    const [participantCounts, winnerCounts] = await Promise.all([
      ParticipationRequest.aggregate([
        {
          $match: {
            event: { $in: eventIds },
            status: { $in: ["PENDING", "APPROVED", "ENROLLED"] },
          },
        },
        { $group: { _id: "$event", count: { $sum: 1 } } },
      ]),
      Achievement.aggregate([
        { $match: { event: { $in: eventIds } } },
        { $group: { _id: "$event", count: { $sum: 1 } } },
      ]),
    ]);

    const participantMap = new Map(
      participantCounts.map((item) => [String(item._id), item.count])
    );
    const winnerMap = new Map(
      winnerCounts.map((item) => [String(item._id), item.count])
    );

    const data = events.map((event) => ({
      ...event,
      participantCount: participantMap.get(String(event._id)) || 0,
      winnerCount: winnerMap.get(String(event._id)) || 0,
    }));

    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (error) {
    console.error("Results events GET error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to load results events" },
      { status: 500 }
    );
  }
}
