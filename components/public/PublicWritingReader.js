import Link from "next/link";
import {
  FaArrowLeft,
  FaArrowRight,
  FaCalendarAlt,
  FaClock,
  FaSchool,
  FaShareAlt,
  FaUser,
} from "react-icons/fa";
import PublicExplorePanel from "@/components/public/PublicExplorePanel";

function formatDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function getReadTime(content = "") {
  const words = String(content || "").trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 180));
}

function getPreview(content = "", maxLength = 96) {
  const text = String(content || "").replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trim()}...`;
}

function getCategoryLabel(value) {
  const label = String(value || "Writing").replaceAll("_", " ").toLowerCase();
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export default function PublicWritingReader({
  article,
  relatedArticles = [],
  moreFromSchool = [],
}) {
  const author = article.authorStudent || {};
  const school = article.school || {};
  const schoolHref = school.id ? `/schools/${school.id}` : "/schools";
  const currentHref = `/writings/${article.id}`;
  const moreItems = moreFromSchool.length > 0 ? moreFromSchool : relatedArticles;

  return (
    <div className="mx-auto max-w-[1500px] px-4 py-5 pb-16 sm:px-6">
      <div className="grid gap-5 xl:grid-cols-[230px_minmax(0,1fr)]">
        <PublicExplorePanel active="student-voices" />

        <main className="min-w-0">
          <article className="rounded-xl border border-[#e6eaf7] bg-white p-5 shadow-sm md:p-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-sm font-black text-[#4326e8]"
              >
                <FaArrowLeft />
                Back to Home
              </Link>
              <Link
                href={currentHref}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[#d9dcf2] bg-white px-4 text-sm font-black text-[#4326e8] transition hover:bg-[#f8f7ff]"
              >
                <FaShareAlt />
                Share Story
              </Link>
            </div>

            <div className="mt-8 max-w-4xl">
              <span className="rounded-full bg-[#f4f1ff] px-3 py-1 text-xs font-black uppercase text-[#4326e8]">
                {getCategoryLabel(article.category)}
              </span>
              <h1 className="mt-4 break-words text-4xl font-black leading-tight text-[#10142f] md:text-5xl">
                {article.title}
              </h1>

              <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm font-bold text-[#526071]">
                <span className="inline-flex items-center gap-2">
                  <FaUser className="text-[#4326e8]" />
                  {author.name || "Student"}
                </span>
                <Link
                  href={schoolHref}
                  className="inline-flex items-center gap-2 hover:text-[#4326e8]"
                >
                  <FaSchool className="text-[#4326e8]" />
                  {school.schoolName || "School"}
                </Link>
                <span className="inline-flex items-center gap-2">
                  <FaCalendarAlt className="text-[#4326e8]" />
                  {formatDate(article.publishedAt)}
                </span>
                <span className="inline-flex items-center gap-2">
                  <FaClock className="text-[#4326e8]" />
                  {getReadTime(article.content)} min read
                </span>
              </div>
            </div>

            <div className="mx-auto mt-10 max-w-3xl whitespace-pre-wrap text-lg leading-9 text-[#27344a]">
              {article.content}
            </div>

            <div className="mt-10 flex flex-col gap-3 border-t border-[#edf0f7] pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-semibold text-[#526071]">
                Published by {school.schoolName || "a Pratyo school"}.
              </p>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={schoolHref}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[#d9dcf2] bg-white px-4 text-sm font-black text-[#4326e8] transition hover:bg-[#f8f7ff]"
                >
                  School Profile
                  <FaArrowRight />
                </Link>
                <Link
                  href="/"
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[#4326e8] px-4 text-sm font-black text-white public-primary-action transition hover:bg-[#3217d3]"
                >
                  More Stories
                  <FaArrowRight />
                </Link>
              </div>
            </div>
          </article>

          {moreItems.length > 0 && (
            <section className="mt-5 rounded-xl border border-[#e6eaf7] bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-black text-[#10142f]">
                  More from this school
                </h2>
                <Link href={schoolHref} className="text-sm font-black text-[#4326e8]">
                  View school
                </Link>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {moreItems.slice(0, 3).map((item) => (
                  <Link
                    key={item.id}
                    href={`/writings/${item.id}`}
                    className="rounded-lg border border-[#e6eaf7] bg-[#f8f9fd] p-4 transition hover:bg-white"
                  >
                    <span className="text-xs font-black uppercase text-[#4326e8]">
                      {getCategoryLabel(item.category)}
                    </span>
                    <h3 className="mt-2 line-clamp-2 text-sm font-black text-[#10142f]">
                      {item.title}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#526071]">
                      {getPreview(item.content)}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
