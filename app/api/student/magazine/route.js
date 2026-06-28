import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Student from "@/models/Student";
import MagazineIssue from "@/models/MagazineIssue";
import SchoolMagazineArticle from "@/models/SchoolMagazineArticle";
import { requireApiSession } from "@/lib/authz";
import { serializeMagazineIssue } from "@/lib/magazineIssues";

function studentLookup(session) {
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

export async function GET() {
  try {
    const { session, error } = await requireApiSession(["STUDENT"]);
    if (error) return error;

    await connectDB();
    const student = await Student.findOne(studentLookup(session))
      .select("_id school name grade rollNumber")
      .lean();

    if (!student) {
      return NextResponse.json(
        { message: "Student profile not found" },
        { status: 404 }
      );
    }

    const issues = await MagazineIssue.find({
      school: student.school,
      status: "PUBLISHED",
    })
      .sort({ publishedAt: -1, weekStart: -1 })
      .lean();
    const issueIds = issues.map((issue) => issue._id);

    const articles = issueIds.length
      ? await SchoolMagazineArticle.find({
          school: student.school,
          magazineIssue: { $in: issueIds },
          isMagazinePublished: true,
          isDeleted: { $ne: true },
        })
          .select("magazineIssue title category")
          .sort({ magazinePublishedAt: 1, publishedAt: 1 })
          .lean()
      : [];

    const articlesByIssue = new Map();
    for (const article of articles) {
      const key = String(article.magazineIssue);
      const group = articlesByIssue.get(key) || [];
      group.push(article);
      articlesByIssue.set(key, group);
    }

    return NextResponse.json({
      issues: issues
        .map((issue) => {
          const issueArticles = articlesByIssue.get(String(issue._id)) || [];
          return {
            ...serializeMagazineIssue(issue),
            articleCount: issueArticles.length,
            coverArticle: issueArticles[0]
              ? {
                  title: issueArticles[0].title,
                  category: issueArticles[0].category,
                }
              : null,
          };
        })
        .filter((issue) => issue.articleCount > 0),
      student: {
        id: String(student._id),
        name: student.name,
        grade: student.grade,
        rollNumber: student.rollNumber,
      },
    });
  } catch (error) {
    console.error("GET /api/student/magazine error:", error);
    return NextResponse.json(
      { message: "Failed to load school magazine" },
      { status: 500 }
    );
  }
}
