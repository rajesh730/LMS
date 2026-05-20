import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import PlatformChallengeSubmission from "@/models/PlatformChallengeSubmission";
import "@/models/PlatformChallenge";
import "@/models/Student";
import "@/models/User";

function serializeSubmission(submission) {
  return {
    id: String(submission._id),
    title: submission.title,
    content: submission.content,
    category: submission.category,
    status: submission.status,
    reviewNote: submission.reviewNote || "",
    isPublic: Boolean(submission.isPublic),
    publishedAt: submission.publishedAt,
    createdAt: submission.createdAt,
    challenge: submission.challenge
      ? {
          id: String(submission.challenge._id),
          title: submission.challenge.title,
        }
      : null,
    student: submission.student
      ? {
          id: String(submission.student._id),
          name: submission.student.name,
          grade: submission.student.grade,
          rollNumber: submission.student.rollNumber,
        }
      : null,
    school: submission.school
      ? {
          id: String(submission.school._id),
          name: submission.school.schoolName || submission.school.name,
        }
      : null,
  };
}

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const status = String(searchParams.get("status") || "ALL").toUpperCase();

    const query = {};
    if (status !== "ALL") {
      query.status = status;
    }

    const submissions = await PlatformChallengeSubmission.find(query)
      .populate("challenge", "title")
      .populate("student", "name grade rollNumber")
      .populate("school", "schoolName name")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      submissions: submissions.map(serializeSubmission),
    });
  } catch (error) {
    console.error("GET /api/admin/challenges/submissions error:", error);
    return NextResponse.json(
      { message: "Failed to load challenge submissions" },
      { status: 500 }
    );
  }
}
