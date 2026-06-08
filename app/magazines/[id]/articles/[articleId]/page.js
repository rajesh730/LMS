import mongoose from "mongoose";
import { notFound } from "next/navigation";
import connectDB from "@/lib/db";
import MagazineIssue from "@/models/MagazineIssue";
import SchoolMagazineArticle from "@/models/SchoolMagazineArticle";
import SchoolShowcaseProfile from "@/models/SchoolShowcaseProfile";
import PublicSiteNav from "@/components/public/PublicSiteNav";
import PublicWritingReader from "@/components/public/PublicWritingReader";
import "@/models/Student";
import "@/models/User";

export const dynamic = "force-dynamic";

function serializeArticle(article, schoolProfile = null) {
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
    school: article.school
      ? {
          id: String(article.school._id),
          schoolName: article.school.schoolName,
          schoolLocation: article.school.schoolLocation,
          profile: schoolProfile
            ? {
                coverImageUrl: schoolProfile.coverImageUrl || "",
              }
            : null,
        }
      : null,
  };
}

async function getMagazineArticleData(issueId, articleId) {
  if (
    !mongoose.Types.ObjectId.isValid(issueId) ||
    !mongoose.Types.ObjectId.isValid(articleId)
  ) {
    return null;
  }

  await connectDB();

  const issue = await MagazineIssue.findOne({
    _id: issueId,
    status: "PUBLISHED",
    showOnHome: true,
  }).lean();

  if (!issue) return null;

  const article = await SchoolMagazineArticle.findOne({
    _id: articleId,
    school: issue.school,
    magazineIssue: issue._id,
    isMagazinePublished: true,
    isDeleted: { $ne: true },
  })
    .populate("authorStudent", "name grade rollNumber")
    .populate("school", "schoolName schoolLocation")
    .lean();

  if (!article) return null;

  const [schoolProfile, relatedArticles] = await Promise.all([
    SchoolShowcaseProfile.findOne({
      school: issue.school,
      visibility: "PUBLIC",
    })
      .select("coverImageUrl")
      .lean(),
    SchoolMagazineArticle.find({
      _id: { $ne: article._id },
      school: issue.school,
      magazineIssue: issue._id,
      isMagazinePublished: true,
      isDeleted: { $ne: true },
    })
      .populate("authorStudent", "name grade rollNumber")
      .populate("school", "schoolName schoolLocation")
      .sort({ magazinePublishedAt: 1, publishedAt: 1, updatedAt: 1 })
      .limit(3)
      .lean(),
  ]);

  return {
    issue: {
      id: String(issue._id),
      title: issue.title || "School Magazine",
      schoolId: String(issue.school),
    },
    article: serializeArticle(article, schoolProfile),
    relatedArticles: relatedArticles.map((item) =>
      serializeArticle(item, schoolProfile)
    ),
  };
}

export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  const data = await getMagazineArticleData(
    resolvedParams.id,
    resolvedParams.articleId
  );

  if (!data) {
    return {
      title: "Magazine writing not found",
    };
  }

  return {
    title: data.article.title,
    description: data.article.content.slice(0, 140),
  };
}

export default async function PublicMagazineArticlePage({ params }) {
  const resolvedParams = await params;
  const data = await getMagazineArticleData(
    resolvedParams.id,
    resolvedParams.articleId
  );

  if (!data) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#f8f9fd] text-[#17120a]">
      <PublicSiteNav active="schools" />
      <PublicWritingReader
        article={data.article}
        relatedArticles={data.relatedArticles}
        backHref={`/magazines/${data.issue.id}`}
        backLabel="Back to magazine"
        currentHref={`/magazines/${data.issue.id}/articles/${data.article.id}`}
        relatedHrefPrefix={`/magazines/${data.issue.id}/articles/`}
      />
    </main>
  );
}
