import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/db";
import MagazineIssue from "@/models/MagazineIssue";
import SchoolMagazineArticle from "@/models/SchoolMagazineArticle";
import { serializeMagazineIssue } from "@/lib/magazineIssues";

function serializeArticle(article) {
  return {
    id: String(article._id),
    title: article.title,
    content: article.content,
    category: article.category,
    publishedAt:
      article.publishedAt || article.magazinePublishedAt || article.updatedAt,
    authorStudent: article.authorStudent
      ? {
          id: String(article.authorStudent._id),
          name: article.authorStudent.name,
          grade: article.authorStudent.grade,
          rollNumber: article.authorStudent.rollNumber,
        }
      : null,
  };
}

function issueDate(issue) {
  return new Date(issue.publishedAt || issue.weekStart || issue.createdAt || 0);
}

function getMonthIssueTitle(issue, issuesInMonth) {
  const orderedIssues = [...issuesInMonth].sort(
    (a, b) => issueDate(a) - issueDate(b)
  );
  const issueNumber =
    orderedIssues.findIndex((item) => String(item._id) === String(issue._id)) +
    1;
  const monthName = issueDate(issue).toLocaleDateString("en-US", {
    month: "long",
  });
  return `${monthName} Magazine ${Math.max(1, issueNumber)}`;
}

export async function GET(_request, props) {
  try {
    const params = await props.params;
    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json(
        { message: "Magazine not found" },
        { status: 404 }
      );
    }

    await connectDB();

    const issue = await MagazineIssue.findOne({
      _id: params.id,
      status: "PUBLISHED",
      showOnHome: true,
    }).lean();

    if (!issue) {
      return NextResponse.json(
        { message: "Magazine not found" },
        { status: 404 }
      );
    }

    const [articles, issuesInMonth] = await Promise.all([
      SchoolMagazineArticle.find({
        school: issue.school,
        magazineIssue: issue._id,
        isMagazinePublished: true,
        isDeleted: { $ne: true },
      })
        .populate("authorStudent", "name grade rollNumber")
        .sort({ magazinePublishedAt: 1, publishedAt: 1, updatedAt: 1 })
        .lean(),
      MagazineIssue.find({
        school: issue.school,
        month: issue.month,
        year: issue.year,
        status: "PUBLISHED",
        showOnHome: true,
      }).lean(),
    ]);

    if (articles.length === 0) {
      return NextResponse.json(
        { message: "This magazine has no published writing yet" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      issue: {
        ...serializeMagazineIssue(issue),
        title: getMonthIssueTitle(issue, issuesInMonth),
        schoolId: String(issue.school),
      },
      articles: articles.map(serializeArticle),
    });
  } catch (error) {
    console.error("GET /api/public/magazines/[id] error:", error);
    return NextResponse.json(
      { message: "Failed to load magazine" },
      { status: 500 }
    );
  }
}
