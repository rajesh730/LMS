import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import SchoolMagazineArticle from "@/models/SchoolMagazineArticle";
import Student from "@/models/Student";
import UserSurfaceSeenState from "@/models/UserSurfaceSeenState";
import "@/models/MagazineIssue";
import { buildMagazineLifecycle } from "@/lib/lifecycle";
import { serializeMagazineIssue } from "@/lib/magazineIssues";
import { buildPagination, escapeRegex, parsePagination } from "@/lib/pagination";
import { getEquivalentGradeValues } from "@/lib/schoolGrades";

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "SCHOOL_ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const status = String(searchParams.get("status") || "ALL").toUpperCase();
    const search = String(searchParams.get("search") || "").trim();
    const grade = String(searchParams.get("grade") || "ALL").trim();
    const { page, limit, skip } = parsePagination(searchParams, {
      limit: 20,
      maxLimit: 100,
    });

    const query = { school: session.user.id, isDeleted: { $ne: true } };
    if (status === "POSTED") {
      query.status = { $in: ["SUBMITTED", "APPROVED"] };
    } else if (status !== "ALL") {
      query.status = status;
    }
    if (search) {
      const safeSearch = escapeRegex(search);
      query.$or = [
        { title: { $regex: safeSearch, $options: "i" } },
        { content: { $regex: safeSearch, $options: "i" } },
      ];
    }
    if (grade && grade.toUpperCase() !== "ALL") {
      const gradeValues = getEquivalentGradeValues(grade);
      const studentIds = await Student.find({
        school: session.user.id,
        isDeleted: { $ne: true },
        grade: { $in: gradeValues },
      }).distinct("_id");
      query.authorStudent = { $in: studentIds };
    }

    // "New" = posted since the school last opened the wall (Instagram-style).
    const wallSeenState = await UserSurfaceSeenState.findOne({
      user: session.user.id,
      surface: "school.schoolWall",
    })
      .select("seenAt")
      .lean();
    const wallSeenAt = wallSeenState?.seenAt ? new Date(wallSeenState.seenAt) : null;

    const [totalSubmissions, submissions, newCount] = await Promise.all([
      SchoolMagazineArticle.countDocuments(query),
      SchoolMagazineArticle.find(query)
        .populate("authorStudent", "name grade rollNumber")
        .populate("magazineIssue")
        .sort({
          status: status === "SUBMITTED" ? 1 : -1,
          submittedAt: -1,
          updatedAt: -1,
        })
        .skip(skip)
        .limit(limit)
        .lean(),
      wallSeenAt
        ? SchoolMagazineArticle.countDocuments({
            ...query,
            submittedAt: { $gt: wallSeenAt },
          })
        : Promise.resolve(0),
    ]);
    const pagination = buildPagination({
      page,
      limit,
      total: totalSubmissions,
    });

    const isNewArticle = (article) =>
      Boolean(
        wallSeenAt &&
          article.submittedAt &&
          new Date(article.submittedAt) > wallSeenAt
      );

    return NextResponse.json({
      submissions: submissions.map((article) => ({
        id: String(article._id),
        title: article.title,
        content: article.content,
        category: article.category,
        submissionSource: article.submissionSource || "FREE_WRITE",
        status: article.status,
        isNew: isNewArticle(article),
        // Per-post unread: a wall post the school has not opened/read yet.
        isUnread: article.status !== "DRAFT" && !article.schoolReadAt,
        schoolReadAt: article.schoolReadAt || null,
        showOnSchoolWall:
          article.status !== "DRAFT" && article.showOnSchoolWall !== false,
        isPublished: Boolean(article.isPublished),
        isMagazinePublished: Boolean(article.isMagazinePublished),
        isGlobalWallPublished: Boolean(article.isGlobalWallPublished),
        magazineIssue: serializeMagazineIssue(article.magazineIssue),
        magazineIssueAssignedAt: article.magazineIssueAssignedAt,
        submittedAt: article.submittedAt,
        firstSubmittedAt: article.firstSubmittedAt,
        lastResubmittedAt: article.lastResubmittedAt,
        reviewedAt: article.reviewedAt,
        updatedAt: article.updatedAt,
        lifecycle: buildMagazineLifecycle(article),
        authorStudent: article.authorStudent
          ? {
              id: String(article.authorStudent._id),
              name: article.authorStudent.name,
              grade: article.authorStudent.grade,
              rollNumber: article.authorStudent.rollNumber,
            }
          : null,
      })),
      pagination: {
        ...pagination,
        totalSubmissions,
      },
      newCount,
    });
  } catch (error) {
    console.error("GET /api/school/magazine-submissions error:", error);
    return NextResponse.json(
      { message: "Failed to load school wall posts" },
      { status: 500 }
    );
  }
}
