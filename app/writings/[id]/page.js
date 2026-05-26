import mongoose from "mongoose";
import { notFound } from "next/navigation";
import connectDB from "@/lib/db";
import SchoolMagazineArticle from "@/models/SchoolMagazineArticle";
import PublicSiteNav from "@/components/public/PublicSiteNav";
import PublicWritingReader from "@/components/public/PublicWritingReader";
import "@/models/Student";
import "@/models/User";

export const dynamic = "force-dynamic";

function serializeArticle(article) {
  return {
    id: String(article._id),
    title: article.title,
    content: article.content,
    category: article.category,
    publishedAt: article.publishedAt || article.updatedAt,
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
        }
      : null,
  };
}

async function getWritingData(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;

  await connectDB();

  const article = await SchoolMagazineArticle.findOne({
    _id: id,
    status: "APPROVED",
    isPublished: true,
    isDeleted: { $ne: true },
  })
    .populate("authorStudent", "name grade rollNumber")
    .populate("school", "schoolName schoolLocation")
    .lean();

  if (!article) return null;

  const [relatedArticles, moreFromSchool] = await Promise.all([
    SchoolMagazineArticle.find({
      _id: { $ne: article._id },
      category: article.category,
      status: "APPROVED",
      isPublished: true,
      isDeleted: { $ne: true },
    })
      .populate("authorStudent", "name grade rollNumber")
      .populate("school", "schoolName schoolLocation")
      .sort({ publishedAt: -1, updatedAt: -1 })
      .limit(3)
      .lean(),
    SchoolMagazineArticle.find({
      _id: { $ne: article._id },
      school: article.school?._id || article.school,
      status: "APPROVED",
      isPublished: true,
      isDeleted: { $ne: true },
    })
      .populate("authorStudent", "name grade rollNumber")
      .populate("school", "schoolName schoolLocation")
      .sort({ publishedAt: -1, updatedAt: -1 })
      .limit(4)
      .lean(),
  ]);

  return {
    article: serializeArticle(article),
    relatedArticles: relatedArticles.map(serializeArticle),
    moreFromSchool: moreFromSchool.map(serializeArticle),
  };
}

export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  const data = await getWritingData(resolvedParams.id);

  if (!data) {
    return {
      title: "Writing not found",
    };
  }

  return {
    title: data.article.title,
    description: data.article.content.slice(0, 140),
  };
}

export default async function PublicWritingPage({ params }) {
  const resolvedParams = await params;
  const data = await getWritingData(resolvedParams.id);

  if (!data) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#f5f1e8] text-[#17120a]">
      <PublicSiteNav active="home" />
      <PublicWritingReader
        article={data.article}
        relatedArticles={data.relatedArticles}
        moreFromSchool={data.moreFromSchool}
      />
    </main>
  );
}
