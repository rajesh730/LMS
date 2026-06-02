import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import Notice from "@/models/Notice";
import EventNotice from "@/models/EventNotice";
import Event from "@/models/Event";
import { getRealtimeHealthSnapshot } from "@/lib/realtimeBus";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const [
      platformNoticeCount,
      studentNoticeCount,
      eventNoticeCount,
      publicEventCount,
    ] = await Promise.all([
      Notice.countDocuments({
        scope: "PLATFORM",
        status: "PUBLISHED",
        isActive: true,
        isDeleted: { $ne: true },
      }),
      Notice.countDocuments({
        scope: "SCHOOL",
        status: "PUBLISHED",
        isActive: true,
        isDeleted: { $ne: true },
        "targetAudience.students": true,
      }),
      EventNotice.countDocuments({
        status: "PUBLISHED",
        visibility: "PUBLIC",
        isDeleted: { $ne: true },
        round: null,
      }),
      Event.countDocuments({
        status: "APPROVED",
        visibility: "PUBLIC",
        lifecycleStatus: { $ne: "ARCHIVED" },
      }),
    ]);

    const realtimeHealth = getRealtimeHealthSnapshot();

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      database: {
        connected: true,
      },
      realtime: realtimeHealth,
      notifications: {
        platformNoticeCount,
        studentNoticeCount,
        eventNoticeCount,
      },
      publicEvents: {
        publicEventCount,
      },
    });
  } catch (error) {
    console.error("GET /api/admin/diagnostics error:", error);
    return NextResponse.json(
      { message: "Failed to load diagnostics" },
      { status: 500 }
    );
  }
}
