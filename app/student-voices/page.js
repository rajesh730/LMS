import Link from "next/link";
import connectDB from "@/lib/db";
import SchoolMagazineArticle from "@/models/SchoolMagazineArticle";
import PublicExplorePanel from "@/components/public/PublicExplorePanel";
import PublicSiteNav from "@/components/public/PublicSiteNav";
import { stripWritingMarkup } from "@/components/WritingContent";
import { diversifyBySchool } from "@/lib/schoolDiversifiedFeed";
import {
  FaArrowRight,
  FaCalendarAlt,
  FaFeatherAlt,
  FaSchool,
  FaShare,
  FaShieldAlt,
  FaUserGraduate,
} from "react-icons/fa";
import "@/models/Student";
import "@/models/User";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Student Voices",
  description: "Read public student writing and featured school stories on Pravyo.",
};

function formatDate(value) {
  if (!value) return "Recently";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function getPreview(value = "", maxLength = 160) {
  const text = stripWritingMarkup(value).replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trim()}...`;
}

function getCategory(value) {
  const label = String(value || "Essay").replaceAll("_", " ").toLowerCase();
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function getInitials(value = "Student") {
  return String(value)
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

async function getStudentVoices() {
  await connectDB();

  const articles = await SchoolMagazineArticle.find({
    status: "APPROVED",
    isPublished: true,
    isDeleted: { $ne: true },
  })
    .select("title content category publishedAt updatedAt")
    .populate("authorStudent", "name grade")
    .populate("school", "schoolName schoolLocation")
    .sort({ publishedAt: -1, updatedAt: -1 })
    .limit(120)
    .lean();

  const serializedArticles = articles.map((article) => ({
    id: String(article._id),
    title: article.title,
    content: article.content,
    category: article.category,
    date: article.publishedAt || article.updatedAt,
    author: article.authorStudent?.name || "Student",
    grade: article.authorStudent?.grade || "",
    schoolName: article.school?.schoolName || "School",
    schoolHref: article.school?._id ? `/schools/${article.school._id}` : "/schools",
    schoolId: article.school?._id ? String(article.school._id) : "",
    href: `/writings/${article._id}`,
  }));

  return diversifyBySchool(serializedArticles, {
    limit: 30,
    getSchoolKey: (article) => article.schoolId || article.schoolName,
    getTime: (article) => article.date,
  });
}

function VoiceCard({ article, featured = false }) {
  return (
    <article
      className={`rounded-2xl border border-[#eceef8] bg-white p-5 shadow-sm ${
        featured ? "md:p-7" : ""
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#f1edff] text-sm font-black text-[#4326e8]">
          {getInitials(article.author)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-black text-[#10142f]">
            {article.author}
          </p>
          <Link
            href={article.schoolHref}
            className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-[#526071] hover:text-[#4326e8]"
          >
            <FaShieldAlt className="text-[#2f7fdb]" />
            {article.schoolName}
          </Link>
        </div>
        <span className="rounded-full bg-[#f1edff] px-3 py-1 text-[10px] font-black text-[#4326e8]">
          {getCategory(article.category)}
        </span>
      </div>

      <h2 className={`${featured ? "mt-6 text-3xl" : "mt-4 text-xl"} font-black leading-tight text-[#10142f]`}>
        {article.title}
      </h2>
      <p className={`${featured ? "mt-4 text-base" : "mt-2 text-sm"} leading-7 text-[#46536b]`}>
        {getPreview(article.content, featured ? 280 : 150)}
      </p>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#f0f2f8] pt-4 text-xs font-bold text-[#526071]">
        <span className="inline-flex items-center gap-2">
          <FaCalendarAlt />
          {formatDate(article.date)}
        </span>
        <Link
          href={article.href}
          className="inline-flex items-center gap-2 text-[#4326e8]"
        >
          <FaShare />
          Share Story
        </Link>
      </div>

      <Link
        href={article.href}
        className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#4326e8] px-4 text-sm font-black text-white public-primary-action"
      >
        Read Story
        <FaArrowRight />
      </Link>
    </article>
  );
}

export default async function StudentVoicesPage({ searchParams }) {
  const resolvedSearchParams = await searchParams;
  const query = String(resolvedSearchParams?.q || "").trim().toLowerCase();
  const allArticles = await getStudentVoices();
  const articles = query
    ? allArticles.filter((article) =>
        `${article.title} ${article.content} ${article.author} ${article.schoolName} ${article.category}`
          .toLowerCase()
          .includes(query)
      )
    : allArticles;
  const featured = articles[0] || null;
  const schoolCount = new Set(articles.map((article) => article.schoolName)).size;

  return (
    <main className="min-h-screen bg-[#fbfcff] text-[#10142f]">
      <PublicSiteNav active="home" searchPlaceholder="Search student voices..." />

      <div className="mx-auto grid max-w-[1500px] gap-6 px-4 py-6 pb-16 sm:px-6 xl:grid-cols-[230px_minmax(0,1fr)]">
        <PublicExplorePanel active="home" />

        <div className="min-w-0 space-y-6">
          <section className="rounded-2xl border border-[#eceef8] bg-white p-6 shadow-sm">
            <p className="text-xs font-black uppercase text-[#4326e8]">
              Student Voices
            </p>
            <div className="mt-3 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-end">
              <div>
                <h1 className="text-4xl font-black leading-tight text-[#10142f] md:text-5xl">
                  Read student stories with less noise.
                </h1>
                <p className="mt-4 max-w-2xl text-sm font-semibold leading-7 text-[#526071]">
                  {query
                    ? `Showing results for "${resolvedSearchParams.q}".`
                    : "Public writing from schools, organized as simple cards that lead directly to the full story."}
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  [articles.length, "Stories", FaFeatherAlt],
                  [schoolCount, "Schools", FaSchool],
                  ["Public", "Reading", FaUserGraduate],
                ].map(([value, label, Icon]) => (
                  <div key={label} className="rounded-xl bg-[#f8f7ff] p-4 text-center">
                    <Icon className="mx-auto text-[#4326e8]" />
                    <p className="mt-2 text-xl font-black text-[#10142f]">
                      {value}
                    </p>
                    <p className="text-[10px] font-black uppercase text-[#667085]">
                      {label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {featured ? (
            <VoiceCard article={featured} featured />
          ) : (
            <section className="rounded-2xl border border-dashed border-[#d9dcf2] bg-white p-10 text-center">
              <FaFeatherAlt className="mx-auto text-4xl text-[#4326e8]" />
              <h2 className="mt-4 text-xl font-black text-[#10142f]">
                No public stories yet
              </h2>
              <p className="mt-2 text-sm font-semibold text-[#526071]">
                Approved school magazine stories will appear here.
              </p>
            </section>
          )}

          {articles.length > 1 && (
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {articles.slice(1).map((article) => (
                <VoiceCard key={article.id} article={article} />
              ))}
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
