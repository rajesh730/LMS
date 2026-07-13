import mongoose from "mongoose";
import { notFound } from "next/navigation";
import connectDB from "@/lib/db";
import SchoolMagazineArticle from "@/models/SchoolMagazineArticle";
import SchoolShowcaseProfile from "@/models/SchoolShowcaseProfile";
import PublicSiteNav from "@/components/public/PublicSiteNav";
import PublicWritingReader from "@/components/public/PublicWritingReader";
import { stripWritingMarkup } from "@/components/WritingContent";
import "@/models/Student";
import "@/models/User";

export const revalidate = 60;

// Prerender nothing at build; cache each visited writing on demand.
export async function generateStaticParams() {
  return [];
}

function serializeArticle(article, schoolProfile = null, authorCurrentSchoolProfile = null) {
  return {
    id: String(article._id),
    title: article.title,
    content: article.content,
    category: article.category,
    publishedAt: article.publishedAt || article.updatedAt,
    authorSchoolNameSnapshot: article.authorSchoolNameSnapshot || "",
    authorGrade: article.authorGrade || "",
    authorAcademicYear: article.authorAcademicYear || "",
    authorStudent: article.authorStudent
      ? {
          id: String(article.authorStudent._id),
          name: article.authorStudent.name,
          grade: article.authorStudent.grade,
          rollNumber: article.authorStudent.rollNumber,
          currentSchoolId: article.authorStudent.school?._id
            ? String(article.authorStudent.school._id)
            : "",
          currentSchoolName: article.authorStudent.school?.schoolName || "",
          currentSchoolLogoUrl: authorCurrentSchoolProfile?.coverImageUrl || "",
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

async function getWritingData(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;

  await connectDB();

  const article = await SchoolMagazineArticle.findOne({
    _id: id,
    status: "APPROVED",
    isPublished: true,
    isDeleted: { $ne: true },
  })
    .populate({
      path: "authorStudent",
      select: "name grade rollNumber school",
      populate: { path: "school", select: "schoolName" },
    })
    .populate("school", "schoolName schoolLocation")
    .lean();

  if (!article) return null;

  const schoolId = article.school?._id || article.school;
  const schoolProfile = schoolId
    ? await SchoolShowcaseProfile.findOne({ school: schoolId, visibility: "PUBLIC" })
        .select("coverImageUrl")
        .lean()
    : null;

  // The author's CURRENT school (for the "Now at X" byline logo) — only fetched
  // when she has moved on to a different school than the one she wrote this at.
  const authorCurrentSchoolId = article.authorStudent?.school?._id;
  const authorCurrentSchoolProfile =
    authorCurrentSchoolId && String(authorCurrentSchoolId) !== String(schoolId)
      ? await SchoolShowcaseProfile.findOne({
          school: authorCurrentSchoolId,
          visibility: "PUBLIC",
        })
          .select("coverImageUrl")
          .lean()
      : null;

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
    article: serializeArticle(article, schoolProfile, authorCurrentSchoolProfile),
    relatedArticles: relatedArticles.map((item) => serializeArticle(item)),
    moreFromSchool: moreFromSchool.map((item) => serializeArticle(item)),
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

  const { article } = data;
  const author = article.authorStudent?.name || "a student";
  const cleaned = stripWritingMarkup(article.content || "")
    .replace(/\s+/g, " ")
    .trim();
  const description =
    cleaned.length > 160
      ? `${cleaned.slice(0, 157)}...`
      : cleaned || `${article.title} — student writing on Pravyo.`;
  const url = `/writings/${resolvedParams.id}`;

  return {
    title: article.title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: article.title,
      description,
      url,
      type: "article",
      siteName: "Pravyo",
      publishedTime: article.publishedAt
        ? new Date(article.publishedAt).toISOString()
        : undefined,
      authors: [author],
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description,
    },
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
      <PublicSiteNav active="student-voices" />
      <PublicWritingReader
        article={data.article}
        relatedArticles={data.relatedArticles}
        moreFromSchool={data.moreFromSchool}
      />
    </main>
  );
}
