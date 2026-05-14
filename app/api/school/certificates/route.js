import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import Achievement from "@/models/Achievement";
import "@/models/Student";
import "@/models/Event";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "SCHOOL_ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const certificates = await Achievement.find({
      school: session.user.id,
      certificateIssuedAt: { $ne: null },
    })
      .populate("parentAchievement", "certificateRecipientName teamName recipientType")
      .populate("captainStudent", "name grade")
      .populate("student", "name grade")
      .populate("event", "title date eventType")
      .sort({ certificateIssuedAt: -1 })
      .lean();

    return NextResponse.json({ certificates }, { status: 200 });
  } catch (error) {
    console.error("School Certificates Error:", error);
    return NextResponse.json(
      { message: "Failed to load certificates" },
      { status: 500 }
    );
  }
}
