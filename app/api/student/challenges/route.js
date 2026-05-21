import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import Student from "@/models/Student";
import PlatformChallenge from "@/models/PlatformChallenge";
import PlatformChallengeSubmission from "@/models/PlatformChallengeSubmission";

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

function gradeMatches(challenge, studentGrade) {
  const grades = challenge.targetGrades || [];
  return grades.length === 0 || grades.includes(studentGrade);
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "STUDENT") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const student = await Student.findOne(buildStudentLookup(session))
      .select("_id school name grade rollNumber")
      .lean();

    if (!student) {
      return NextResponse.json(
        { message: "Student profile not found" },
        { status: 404 }
      );
    }

    const now = new Date();
    const challenges = await PlatformChallenge.find({
      status: "PUBLISHED",
      isDeleted: { $ne: true },
      $or: [{ deadline: null }, { deadline: { $gte: now } }],
    })
      .sort({ deadline: 1, createdAt: -1 })
      .lean();

    const visibleChallenges = challenges.filter((challenge) =>
      gradeMatches(challenge, student.grade)
    );
    const challengeIds = visibleChallenges.map((challenge) => challenge._id);

    const responses = await PlatformChallengeSubmission.find({
      student: student._id,
      challenge: { $in: challengeIds },
    })
      .select("_id challenge title status updatedAt createdAt")
      .lean();

    const responsesByChallenge = new Map(
      responses.map((response) => [String(response.challenge), response])
    );

    return NextResponse.json({
      challenges: visibleChallenges.map((challenge) => {
        const response = responsesByChallenge.get(String(challenge._id));
        return {
          id: String(challenge._id),
          title: challenge.title,
          prompt: challenge.prompt,
          deadline: challenge.deadline,
          targetGrades: challenge.targetGrades || [],
          response: response
            ? {
                id: String(response._id),
                title: response.title,
                status: response.status,
                updatedAt: response.updatedAt,
                submittedAt: response.createdAt,
              }
            : null,
        };
      }),
    });
  } catch (error) {
    console.error("GET /api/student/challenges error:", error);
    return NextResponse.json(
      { message: "Failed to load student challenges" },
      { status: 500 }
    );
  }
}
