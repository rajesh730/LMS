import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import SchoolMagazineArticle from "@/models/SchoolMagazineArticle";
import Student from "@/models/Student";
import "@/models/MagazineIssue";
import { buildMagazineLifecycle } from "@/lib/lifecycle";
import { serializeMagazineIssue } from "@/lib/magazineIssues";
import { getEquivalentGradeValues } from "@/lib/schoolGrades";

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "SCHOOL_ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const view = String(searchParams.get("view") || "published").toLowerCase();
    const grade = String(searchParams.get("grade") || "ALL").trim();

    const query = { school: session.user.id, isDeleted: { $ne: true } };
    if (view === "approved") {
      query.status = { $in: ["SUBMITTED", "APPROVED"] };
    } else if (view === "magazine") {
      query.isMagazinePublished = true;
    } else {
      query.isPublished = true;
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

    const articles = await SchoolMagazineArticle.find(query)
      .populate("authorStudent", "name grade rollNumber")
      .populate("reviewedBy", "name schoolName email")
      .populate("magazineIssue")
      .sort({
        publishedAt: -1,
        reviewedAt: -1,
        updatedAt: -1,
      })
      .lean();

    return NextResponse.json({
      articles: articles.map((article) => ({
        id: String(article._id),
        title: article.title,
        content: article.content,
        category: article.category,
        submissionSource: article.submissionSource || "FREE_WRITE",
        status: article.status,
        showOnSchoolWall:
          article.status !== "DRAFT" && article.showOnSchoolWall !== false,
        isPublished: Boolean(article.isPublished),
        isMagazinePublished: Boolean(article.isMagazinePublished),
        isGlobalWallPublished: Boolean(article.isGlobalWallPublished),
        magazineIssue: serializeMagazineIssue(article.magazineIssue),
        magazineIssueAssignedAt: article.magazineIssueAssignedAt,
        publishedAt: article.publishedAt,
        magazinePublishedAt: article.magazinePublishedAt,
        submittedAt: article.submittedAt,
        reviewedAt: article.reviewedAt,
        createdAt: article.createdAt,
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
    });
  } catch (error) {
    console.error("GET /api/school/magazine error:", error);
    return NextResponse.json(
      { message: "Failed to load school magazine" },
      { status: 500 }
    );
  }
}
