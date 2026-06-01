import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import UserSurfaceSeenState from "@/models/UserSurfaceSeenState";
import { publishWorkIndicatorsUpdate } from "@/lib/workIndicatorRealtime";

const ALLOWED_SURFACES = new Set([
  "student.magazine",
  "student.pratyoPulse",
  "student.events",
  "school.pratyoPulse",
]);

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    let body;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        { message: "Invalid JSON in request body" },
        { status: 400 }
      );
    }
    const surface = String(body.surface || "").trim();

    if (!ALLOWED_SURFACES.has(surface)) {
      return NextResponse.json(
        { message: "Unsupported indicator surface" },
        { status: 400 }
      );
    }

    await connectDB();
    const seenAt = new Date();
    await UserSurfaceSeenState.updateOne(
      { user: session.user.id, surface },
      {
        $set: {
          user: session.user.id,
          role: session.user.role,
          surface,
          seenAt,
        },
      },
      { upsert: true }
    );

    publishWorkIndicatorsUpdate("indicator-surface-seen", {
      userId: String(session.user.id),
      surface,
    });

    return NextResponse.json({
      surface,
      seenAt: seenAt.toISOString(),
    });
  } catch (error) {
    console.error("POST /api/me/work-indicators/seen error:", error);
    return NextResponse.json(
      { message: "Failed to update seen state" },
      { status: 500 }
    );
  }
}
