import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import PlatformChallengeSubmission from "@/models/PlatformChallengeSubmission";
import { buildChallengeSubmissionLifecycle } from "@/lib/lifecycle";
import { buildPagination, escapeRegex, parsePagination } from "@/lib/pagination";
import "@/models/PlatformChallenge";
import "@/models/Student";

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "SCHOOL_ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const { searchParams } = new URL(request.url);
    const search = String(searchParams.get("search") || "").trim();
    const { page, limit, skip } = parsePagination(searchParams, {
      limit: 20,
      maxLimit: 100,
    });

    const schoolIds = [session.user.id, session.user.schoolId]
      .filter(Boolean)
      .map(String);

    const query = {
      school: { $in: schoolIds },
      status: "SELECTED",
      isPublic: true,
    };
    if (search) {
      const safeSearch = escapeRegex(search);
      query.$or = [
        { title: { $regex: safeSearch, $options: "i" } },
        { content: { $regex: safeSearch, $options: "i" } },
      ];
    }

    const [totalSubmissions, submissions] = await Promise.all([
      PlatformChallengeSubmission.countDocuments(query),
      PlatformChallengeSubmission.find(query)
        .populate("challenge", "title")
        .populate("student", "name grade rollNumber")
        .populate("reviewedBy", "name schoolName email")
        .sort({ publishedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);
    const pagination = buildPagination({
      page,
      limit,
      total: totalSubmissions,
    });

    return NextResponse.json({
      submissions: submissions.map((submission) => ({
        id: String(submission._id),
        title: submission.title,
        content: submission.content,
        category: submission.category,
        publishedAt: submission.publishedAt,
        addedToSchoolMagazine: Boolean(submission.addedToSchoolMagazine),
        lifecycle: buildChallengeSubmissionLifecycle(submission),
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
      pagination: {
        ...pagination,
        totalSubmissions,
      },
    });
  } catch (error) {
    console.error("GET /api/school/challenge-winners error:", error);
    return NextResponse.json(
      { message: "Failed to load challenge winners" },
      { status: 500 }
    );
  }
}
