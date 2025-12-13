import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import User from "@/models/User";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";

export async function GET() {
  try {
    await connectDB();

    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the school user data with education configuration
    const schoolUser = await User.findOne({
      email: session.user.email,
      role: "SCHOOL_ADMIN",
    }).select("educationLevels schoolConfig schoolName");

    if (!schoolUser) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    return NextResponse.json({
      educationLevels: schoolUser.educationLevels || {},
      schoolConfig: schoolUser.schoolConfig || {},
      schoolName: schoolUser.schoolName,
    });
  } catch (error) {
    console.error("Error fetching education config:", error);
    return NextResponse.json(
      { error: "Failed to fetch education configuration" },
      { status: 500 }
    );
  }
}
