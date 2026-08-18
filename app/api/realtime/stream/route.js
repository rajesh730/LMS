import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/authz";
import { subscribeRealtimeEvent } from "@/lib/realtimeBus";
import {
  isMessagingChannel,
  canAccessChannel,
} from "@/lib/messagingChannels";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Private channels carry per-school / per-student / admin change signals. They
// must not be open to anonymous subscribers (metadata disclosure). Public
// channels (the public feed + event-notice channels used on logged-out pages)
// stay open so live updates keep working for visitors.
const LOGIN_REQUIRED_CHANNELS = new Set([
  "school-notifications",
  "student-notifications",
  "work-indicators",
]);
const ADMIN_ONLY_CHANNELS = new Set(["admin-diagnostics"]);

function filterAllowedChannels(channels, session) {
  const isLoggedIn = Boolean(session?.user?.id);
  const isAdmin = session?.user?.role === "SUPER_ADMIN";
  return channels.filter((channel) => {
    if (ADMIN_ONLY_CHANNELS.has(channel)) return isAdmin;
    if (LOGIN_REQUIRED_CHANNELS.has(channel)) return isLoggedIn;
    // Private messaging channels are OWNERSHIP-scoped and must be checked
    // before the permissive default below. They carry one family's
    // conversation with the school, so "unknown channel = public" would let a
    // stranger tail it by guessing an id.
    if (isMessagingChannel(channel)) return canAccessChannel(channel, session);
    return true;
  });
}

function formatSseEvent(event) {
  return `data: ${JSON.stringify(event)}\n\n`;
}

function formatSseRetry(ms) {
  return `retry: ${ms}\n\n`;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const channels = Array.from(
    new Set(
      (searchParams.get("channels") || "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean)
    )
  );

  if (channels.length === 0) {
    return NextResponse.json(
      { message: "At least one channel is required." },
      { status: 400 }
    );
  }

  // Drop any private/admin channels the caller isn't authorized for; keep public
  // ones. If nothing remains accessible, reject.
  const { session, error: authError } = await requireApiSession();
  if (authError) return authError;
  const allowedChannels = filterAllowedChannels(channels, session);
  if (allowedChannels.length === 0) {
    return NextResponse.json(
      { message: "No accessible channels for this session." },
      { status: 401 }
    );
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      let closed = false;
      let closeStream = () => {};

      const safeEnqueue = (message) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(message));
        } catch (error) {
          closeStream(error);
        }
      };

      safeEnqueue(formatSseRetry(3000));
      safeEnqueue(
        formatSseEvent({
          channel: "system",
          payload: { connected: true },
          timestamp: new Date().toISOString(),
        })
      );

      const unsubscribers = allowedChannels.map((channel) =>
        subscribeRealtimeEvent(channel, (event) => {
          safeEnqueue(formatSseEvent(event));
        })
      );

      const pingId = setInterval(() => {
        safeEnqueue(
          formatSseEvent({
            channel: "ping",
            payload: {},
            timestamp: new Date().toISOString(),
          })
        );
      }, 20000);

      closeStream = () => {
        if (closed) return;
        closed = true;
        clearInterval(pingId);
        unsubscribers.forEach((unsubscribe) => unsubscribe());
        try {
          controller.close();
        } catch (error) {
          console.error("Error closing realtime stream:", error);
        }
      };

      request.signal.addEventListener("abort", closeStream, { once: true });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
