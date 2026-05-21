import { NextResponse } from "next/server";
import { getPublicFeedItems } from "@/lib/publicFeed";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get("limit") || 8);
    const cursor = searchParams.get("cursor") || null;
    const type = searchParams.get("type") || "all";
    const types = type === "pulse" ? ["pulse"] : ["pulse", "result", "event"];

    const feed = await getPublicFeedItems({ limit, cursor, types });

    return NextResponse.json(feed);
  } catch (error) {
    console.error("GET /api/public/feed error:", error);
    return NextResponse.json(
      { message: "Failed to load public feed" },
      { status: 500 }
    );
  }
}
