import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { publishRealtimeEvent } from "@/lib/realtimeBus";

const STATIC_CHANNELS = new Set([
  "admin-diagnostics",
  "public-feed",
  "student-notifications",
  "school-notifications",
]);

function normalizeChannel(body = {}) {
  const requestedChannel = String(body.channel || "admin-diagnostics").trim();
  const eventId = String(body.eventId || "").trim();

  if (STATIC_CHANNELS.has(requestedChannel)) {
    return requestedChannel;
  }

  if (requestedChannel === "event-notices" && eventId) {
    return `event-${eventId}-notices`;
  }

  return "";
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await request?.json?.().catch(() => ({}));
    const channel = normalizeChannel(body);

    if (!channel) {
      return NextResponse.json(
        { message: "Unsupported diagnostics channel" },
        { status: 400 }
      );
    }

    const payload = {
      kind: "diagnostic-ping",
      channel,
      initiatedBy: session.user.email || session.user.id,
      sentAt: new Date().toISOString(),
    };

    publishRealtimeEvent(channel, payload);

    return NextResponse.json({
      message: "Ping sent",
      channel,
      payload,
    });
  } catch (error) {
    console.error("POST /api/admin/diagnostics/ping error:", error);
    return NextResponse.json(
      { message: "Failed to publish diagnostics ping" },
      { status: 500 }
    );
  }
}
