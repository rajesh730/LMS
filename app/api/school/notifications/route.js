import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import { getSchoolNotificationPayload } from "@/lib/schoolNotifications";

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "SCHOOL_ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const { searchParams } = new URL(request.url);
    const requestedLimit = Number.parseInt(searchParams.get("limit") || "20", 10);
    const limit = Number.isFinite(requestedLimit)
      ? Math.max(1, Math.min(requestedLimit, 100))
      : 20;
    const payload = await getSchoolNotificationPayload(session, limit);

    return NextResponse.json({
      notifications: payload.notifications,
      unreadCount: payload.unreadCount,
    });
  } catch (error) {
    console.error("GET /api/school/notifications error:", error);
    return NextResponse.json(
      { message: "Failed to load notifications" },
      { status: 500 }
    );
  }
}
