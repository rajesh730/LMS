import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import { getWorkIndicatorsCached } from "@/lib/workIndicators";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const indicators = await getWorkIndicatorsCached(session);

    return NextResponse.json({
      role: session.user.role,
      indicators,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("GET /api/me/work-indicators error:", error);
    return NextResponse.json(
      { message: "Failed to load work indicators" },
      { status: 500 }
    );
  }
}
