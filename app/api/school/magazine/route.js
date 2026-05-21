import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import SchoolMagazineArticle from "@/models/SchoolMagazineArticle";
import { buildMagazineLifecycle } from "@/lib/lifecycle";

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "SCHOOL_ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const view = String(searchParams.get("view") || "published").toLowerCase();

    const query = { school: session.user.id, isDeleted: { $ne: true } };
    if (view === "approved") {
      query.status = "APPROVED";
    } else {
      query.isPublished = true;
    }

    const articles = await SchoolMagazineArticle.find(query)
      .populate("authorStudent", "name grade rollNumber")
      .populate("reviewedBy", "name schoolName email")
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
        challengeTitle: article.challengeTitle || "",
        status: article.status,
        isPublished: Boolean(article.isPublished),
        publishedAt: article.publishedAt,
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
    });
  } catch (error) {
    console.error("GET /api/school/magazine error:", error);
    return NextResponse.json(
      { message: "Failed to load school magazine" },
      { status: 500 }
    );
  }
}
