import { NextResponse } from "next/server";
import { getPublicEventsHubData } from "@/lib/publicEventsHub";

export async function GET() {
  try {
    const data = await getPublicEventsHubData();
    return NextResponse.json(data);
  } catch (error) {
    console.error("GET /api/public/events-hub error:", error);
    return NextResponse.json(
      { message: "Failed to load public events" },
      { status: 500 }
    );
  }
}
