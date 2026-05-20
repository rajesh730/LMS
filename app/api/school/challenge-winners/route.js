import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import PlatformChallengeSubmission from "@/models/PlatformChallengeSubmission";
import "@/models/PlatformChallenge";
import "@/models/Student";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "SCHOOL_ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const schoolIds = [session.user.id, session.user.schoolId]
      .filter(Boolean)
      .map(String);

    const submissions = await PlatformChallengeSubmission.find({
      school: { $in: schoolIds },
      status: "SELECTED",
      isPublic: true,
    })
      .populate("challenge", "title")
      .populate("student", "name grade rollNumber")
      .sort({ publishedAt: -1, createdAt: -1 })
      .lean();

    return NextResponse.json({
      submissions: submissions.map((submission) => ({
        id: String(submission._id),
        title: submission.title,
        content: submission.content,
        category: submission.category,
        publishedAt: submission.publishedAt,
        addedToSchoolMagazine: Boolean(submission.addedToSchoolMagazine),
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
      })),
    });
  } catch (error) {
    console.error("GET /api/school/challenge-winners error:", error);
    return NextResponse.json(
      { message: "Failed to load challenge winners" },
      { status: 500 }
    );
  }
}
