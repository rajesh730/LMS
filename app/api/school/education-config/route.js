import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import User from "@/models/User";
import Teacher from "@/models/Teacher";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";

export async function GET() {
  try {
    await connectDB();

    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let schoolId = session.user.schoolId || session.user.id;

    if (session.user.role === "TEACHER" && !session.user.schoolId) {
      const teacher = await Teacher.findOne({
        _id: session.user.id,
        isDeleted: { $ne: true },
        status: { $ne: "INACTIVE" },
      }).select("school");
      schoolId = teacher?.school;
    }

    if (!schoolId) {
      return NextResponse.json(
        { error: "School context is required" },
        { status: 400 }
      );
    }

    const schoolUser = await User.findById(schoolId).select(
      "educationLevels schoolConfig schoolName role"
    );

    if (!schoolUser) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    if (schoolUser.role !== "SCHOOL_ADMIN") {
      return NextResponse.json(
        { error: "School configuration is only available for school accounts" },
        { status: 403 }
      );
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
