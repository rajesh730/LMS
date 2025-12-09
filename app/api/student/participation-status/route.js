import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import Student from "@/models/Student";
import ParticipationRequest from "@/models/ParticipationRequest";

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "STUDENT") {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    await connectDB();

    // Get student by email
    const student = await Student.findOne({ email: session.user.email });
    if (!student) {
      return NextResponse.json(
        { success: false, message: "Student not found" },
        { status: 404 }
      );
    }

    // Get all participation requests for this student
    const requests = await ParticipationRequest.find({
      student: student._id,
    })
      .populate(
        "event",
        "title description date eligibleGrades maxParticipants"
      )
      .populate("school", "schoolName")
      .sort({ requestedAt: -1 })
      .lean();

    return NextResponse.json(
      {
        success: true,
        message: "Participation status fetched",
        data: requests,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("GET /api/student/participation-status error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
