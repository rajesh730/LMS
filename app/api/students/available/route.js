import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/db";
import Student from "@/models/Student";
import ParticipationRequest from "@/models/ParticipationRequest";

/**
 * GET /api/students/available
 * Get available students for adding to an event
 * Excludes students already enrolled in the event
 */
export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get("eventId");

    if (!eventId) {
      return NextResponse.json(
        { message: "eventId is required" },
        { status: 400 }
      );
    }

    // Get students already in this event
    const enrolledRequests = await ParticipationRequest.find({
      event: eventId,
      status: { $in: ["APPROVED", "ENROLLED"] },
    }).select("student");

    const enrolledStudentIds = enrolledRequests.map((r) => r.student);

    // Get all available students
    const students = await Student.find({
      _id: { $nin: enrolledStudentIds },
      status: "ACTIVE",
    })
      .select("name email grade")
      .sort({ name: 1 })
      .lean();

    // Extract unique grades from students
    const uniqueGrades = [
      ...new Set(students.map((s) => s.grade).filter(Boolean)),
    ];

    return NextResponse.json(
      {
        students: students.map((s) => ({
          _id: s._id,
          name: s.name,
          email: s.email,
          grade: s.grade,
        })),
        grades: uniqueGrades,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching available students:", error);
    return NextResponse.json(
      { message: "Internal server error", error: error.message },
      { status: 500 }
    );
  }
}
