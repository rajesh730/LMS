import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/db";
import MagazineIssue from "@/models/MagazineIssue";
import SchoolMagazineArticle from "@/models/SchoolMagazineArticle";
import { serializeMagazineIssue } from "@/lib/magazineIssues";
import { serializeAuthoredEra } from "@/lib/writingProvenance";
import "@/models/Student";

function serializeArticle(article) {
  return {
    id: String(article._id),
    title: article.title,
    content: article.content,
    category: article.category,
    publishedAt:
      article.publishedAt || article.magazinePublishedAt || article.updatedAt,
    ...serializeAuthoredEra(article),
    magazineIssue: serializeMagazineIssue(article.magazineIssue),
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

export async function GET(_request, props) {
  try {
    const params = await props.params;
    if (
      !mongoose.Types.ObjectId.isValid(params.id) ||
      !mongoose.Types.ObjectId.isValid(params.articleId)
    ) {
      return NextResponse.json(
        { message: "Magazine article not found" },
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
        { message: "Magazine article not found" },
        { status: 404 }
      );
    }

    const [article, relatedArticles] = await Promise.all([
      SchoolMagazineArticle.findOne({
        _id: params.articleId,
        school: issue.school,
        magazineIssue: issue._id,
        isMagazinePublished: true,
        isDeleted: { $ne: true },
      })
        .populate("authorStudent", "name grade rollNumber")
        .populate("magazineIssue")
        .lean(),
      SchoolMagazineArticle.find({
        _id: { $ne: params.articleId },
        school: issue.school,
        magazineIssue: issue._id,
        isMagazinePublished: true,
        isDeleted: { $ne: true },
      })
        .populate("authorStudent", "name grade rollNumber")
        .populate("magazineIssue")
        .sort({ magazinePublishedAt: 1, publishedAt: 1, updatedAt: 1 })
        .limit(3)
        .lean(),
    ]);

    if (!article) {
      return NextResponse.json(
        { message: "Magazine article not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      article: serializeArticle(article),
      relatedArticles: relatedArticles.map(serializeArticle),
      student: null,
    });
  } catch (error) {
    console.error("GET /api/public/magazines/[id]/articles/[articleId] error:", error);
    return NextResponse.json(
      { message: "Failed to load magazine article" },
      { status: 500 }
    );
  }
}
