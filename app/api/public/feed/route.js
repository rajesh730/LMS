import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getPublicFeedItems } from "@/lib/publicFeed";
import { PUBLIC_FEED_VIEWER_COOKIE } from "@/lib/publicFeedViewer";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get("limit") || 8);
    const cursor = searchParams.get("cursor") || null;
    const type = searchParams.get("type") || "all";
    const types = type === "pulse" ? ["pulse"] : ["pulse", "result", "event"];
    const viewerId = (await cookies()).get(PUBLIC_FEED_VIEWER_COOKIE)?.value || "";

    const feed = await getPublicFeedItems({ limit, cursor, types, viewerId });

    return NextResponse.json(feed);
  } catch (error) {
    console.error("GET /api/public/feed error:", error);
    return NextResponse.json(
      { message: "Failed to load public feed" },
      { status: 500 }
    );
  }
}
