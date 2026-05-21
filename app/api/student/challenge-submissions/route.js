import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import Student from "@/models/Student";
import PlatformChallenge from "@/models/PlatformChallenge";
import PlatformChallengeSubmission from "@/models/PlatformChallengeSubmission";

const VALID_CATEGORIES = ["ESSAY", "POEM", "REPORT", "OPINION", "STORY", "OTHER"];

function buildStudentLookup(session) {
  return {
    isDeleted: { $ne: true },
    status: "ACTIVE",
    $or: [
      { _id: session.user.id },
      { userId: session.user.id },
      { email: session.user.email },
      { username: session.user.email },
    ],
  };
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "STUDENT") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const student = await Student.findOne(buildStudentLookup(session))
      .select("_id school grade")
      .lean();

    if (!student) {
      return NextResponse.json(
        { message: "Student profile not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const challengeId = String(body.challengeId || "").trim();
    const title = String(body.title || "").trim();
    const content = String(body.content || "").trim();
    const category = String(body.category || "ESSAY").toUpperCase();

    if (!challengeId || !title || !content) {
      return NextResponse.json(
        { message: "Challenge, title, and response are required" },
        { status: 400 }
      );
    }

    if (!VALID_CATEGORIES.includes(category)) {
      return NextResponse.json(
        { message: "Invalid writing category" },
        { status: 400 }
      );
    }

    const now = new Date();
    const challenge = await PlatformChallenge.findOne({
      _id: challengeId,
      status: "PUBLISHED",
      isDeleted: { $ne: true },
      $or: [{ deadline: null }, { deadline: { $gte: now } }],
    }).lean();

    if (!challenge) {
      return NextResponse.json(
        { message: "This challenge is not available" },
        { status: 400 }
      );
    }

    const targetGrades = challenge.targetGrades || [];
    if (targetGrades.length > 0 && !targetGrades.includes(student.grade)) {
      return NextResponse.json(
        { message: "This challenge is not available for your grade" },
        { status: 403 }
      );
    }

    const existing = await PlatformChallengeSubmission.findOne({
      challenge: challenge._id,
      student: student._id,
    }).lean();

    if (existing) {
      return NextResponse.json(
        { message: "You already submitted a response for this challenge" },
        { status: 409 }
      );
    }

    const submission = await PlatformChallengeSubmission.create({
      challenge: challenge._id,
      student: student._id,
      school: student.school,
      title,
      content,
      category,
      status: "SUBMITTED",
    });

    return NextResponse.json(
      {
        message: "Challenge response submitted to platform review",
        submission,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/student/challenge-submissions error:", error);
    return NextResponse.json(
      { message: "Failed to submit challenge response" },
      { status: 500 }
    );
  }
}
