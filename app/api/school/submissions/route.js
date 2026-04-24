import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import TalentSubmission from "@/models/TalentSubmission";

export const dynamic = "force-dynamic";

function resolveSchoolId(session) {
  if (session.user.role === "SCHOOL_ADMIN") return session.user.id;
  if (session.user.role === "TEACHER") return session.user.schoolId;
  return null;
}

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["SCHOOL_ADMIN", "TEACHER"].includes(session.user.role)) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const schoolId = resolveSchoolId(session);
    if (!schoolId) {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const eventId = searchParams.get("eventId");

    const query = { school: schoolId };
    if (status) query.status = status;
    if (eventId) query.event = eventId;

    const submissions = await TalentSubmission.find(query)
      .sort({ updatedAt: -1 })
      .populate("event", "title date eventType visibility")
      .populate("student", "name grade")
      .lean();

    return NextResponse.json({ success: true, data: submissions }, { status: 200 });
  } catch (error) {
    console.error("School submissions GET error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch submissions" },
      { status: 500 }
    );
  }
}
