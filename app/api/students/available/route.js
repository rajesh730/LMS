import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/db";
import Student from "@/models/Student";
import ParticipationRequest from "@/models/ParticipationRequest";
import Classroom from "@/models/Classroom";

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
      .populate("classroom", "name")
      .select("name email grade classroom")
      .sort({ name: 1 })
      .lean();

    // Get unique classrooms for filter
    const classrooms = await Classroom.find()
      .select("name")
      .sort({ name: 1 })
      .lean();

    const classes = classrooms.map((c) => c.name);

    return NextResponse.json(
      {
        students: students.map((s) => ({
          _id: s._id,
          name: s.name,
          email: s.email,
          grade: s.grade,
          classroom: s.classroom,
        })),
        classes,
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
