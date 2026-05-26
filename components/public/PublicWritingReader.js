"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  FaArrowLeft,
  FaArrowRight,
  FaBookOpen,
  FaCalendarAlt,
  FaClock,
  FaExclamationTriangle,
  FaFlag,
  FaMoon,
  FaRegBookmark,
  FaSchool,
  FaShareAlt,
  FaStar,
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

function getWordCount(content = "") {
  return String(content || "").trim().split(/\s+/).filter(Boolean).length;
}

function getReadTime(content = "") {
  return Math.max(1, Math.ceil(getWordCount(content) / 180));
}

function getPreview(content = "", maxLength = 80) {
  const text = String(content || "").replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trim()}...`;
}

function getCategoryLabel(value) {
  const label = String(value || "Writing").replaceAll("_", " ").toLowerCase();
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function ReaderArt({ compact = false }) {
  return (
    <div
      className={`relative overflow-hidden rounded-xl bg-gradient-to-br from-amber-100 via-white to-sky-100 ${
        compact ? "h-20" : "h-72"
      }`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.85),transparent_32%),radial-gradient(circle_at_78%_70%,rgba(244,114,182,0.2),transparent_28%)]" />
      <div className="absolute left-8 top-8 h-28 w-40 rotate-[-8deg] rounded-lg border border-white/85 bg-white/80 shadow-xl" />
      <div className="absolute left-24 top-14 h-28 w-40 rotate-[7deg] rounded-lg border border-white/85 bg-white/85 shadow-xl" />
      <div className="absolute bottom-8 right-12 h-1.5 w-44 rotate-[-14deg] rounded-full bg-[#0a2f66]/20" />
      <div className="absolute bottom-14 right-16 h-1.5 w-32 rotate-[-14deg] rounded-full bg-[#0a2f66]/20" />
      <FaBookOpen className="absolute bottom-10 left-10 text-6xl text-purple-700" />
      <FaStar className="absolute right-14 top-10 text-2xl text-amber-500" />
    </div>
  );
}

function SidebarCard({ title, children }) {
  return (
    <section className="rounded-xl border border-[#e7dcc8] bg-white p-4 shadow-sm">
      <h2 className="text-sm font-black text-[#17120a]">{title}</h2>
      <div className="mt-3 h-1 w-10 rounded-full bg-purple-600" />
      <div className="mt-4">{children}</div>
    </section>
  );
}

function RelatedArticle({ article }) {
  return (
    <Link
      href={`/writings/${article.id}`}
      className="grid gap-3 rounded-lg border border-[#e7dcc8] bg-[#f8fbff] p-3 transition hover:bg-white sm:grid-cols-[72px_1fr]"
    >
      <ReaderArt compact />
      <div className="min-w-0">
        <h3 className="line-clamp-2 text-sm font-black text-[#17120a]">
          {article.title}
        </h3>
        <p className="mt-1 text-xs text-[#52657d]">
          {getCategoryLabel(article.category)} - {getReadTime(article.content)} min read
        </p>
      </div>
    </Link>
  );
}

export default function PublicWritingReader({ article, relatedArticles, moreFromSchool }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const updateProgress = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const maxScroll =
        document.documentElement.scrollHeight - window.innerHeight;
      setProgress(maxScroll > 0 ? Math.min(100, Math.round((scrollTop / maxScroll) * 100)) : 0);
    };

    updateProgress();
    window.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress);
    return () => {
      window.removeEventListener("scroll", updateProgress);
      window.removeEventListener("resize", updateProgress);
    };
  }, []);

  const author = article.authorStudent || {};
  const school = article.school || {};
  const schoolHref = school.id ? `/schools/${school.id}` : "/schools";

  return (
    <div className="mx-auto max-w-[1500px] px-4 py-6 pb-24 sm:px-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[230px_minmax(0,1fr)_320px]">
        <PublicExplorePanel active="writings" />

        <main className="min-w-0 rounded-2xl border border-[#e7dcc8] bg-white p-5 shadow-sm md:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <nav className="flex flex-wrap items-center gap-2 text-xs font-bold text-[#75869b]">
              <Link href="/" className="hover:text-purple-700">
                Home
              </Link>
              <span>/</span>
              <Link href="/challenges" className="hover:text-purple-700">
                Pratyo Pulse
              </Link>
              <span>/</span>
              <span>{getCategoryLabel(article.category)}</span>
            </nav>
            <div className="flex items-center gap-2">
              {[
                [FaShareAlt, "Share"],
                [FaRegBookmark, "Save"],
                [FaMoon, "Theme"],
              ].map(([Icon, label]) => (
                <button
                  key={label}
                  type="button"
                  aria-label={label}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#e7dcc8] text-[#0a2f66] transition hover:bg-[#f8fbff]"
                >
                  <Icon className="text-sm" />
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6">
            <div className="flex items-center gap-3 text-xs font-bold text-[#52657d]">
              <span>Reading progress</span>
              <div className="h-1 flex-1 overflow-hidden rounded-full bg-[#eaf2ff]">
                <div
                  className="h-full rounded-full bg-purple-700 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span>{progress}%</span>
            </div>
          </div>

          <article className="mt-8">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-black uppercase text-emerald-700">
                Published
              </span>
              <span className="rounded-full bg-purple-50 px-3 py-1 text-[11px] font-black uppercase text-purple-700">
                {getCategoryLabel(article.category)}
              </span>
            </div>

            <h1 className="mt-4 max-w-4xl text-4xl font-black leading-tight text-[#061a44] md:text-5xl">
              {article.title}
            </h1>

            <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-[#52657d]">
              <span className="inline-flex items-center gap-2">
                <FaUser className="text-purple-700" />
                By {author.name || "Student"}
              </span>
              <span className="inline-flex items-center gap-2">
                <FaSchool className="text-purple-700" />
                {school.schoolName || "School"}
              </span>
              <span className="inline-flex items-center gap-2">
                <FaCalendarAlt className="text-purple-700" />
                {formatDate(article.publishedAt)}
              </span>
              <span className="inline-flex items-center gap-2">
                <FaClock className="text-purple-700" />
                {getReadTime(article.content)} min read
              </span>
            </div>

            <div className="mt-7">
              <ReaderArt />
            </div>

            <div className="mx-auto mt-8 max-w-3xl whitespace-pre-wrap text-base leading-8 text-[#27344a] md:text-lg">
              {article.content}
            </div>
          </article>

          <div className="mt-8 flex flex-wrap gap-2">
            {["Student Writing", getCategoryLabel(article.category), school.schoolName || "School"].map(
              (tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-purple-50 px-3 py-1.5 text-xs font-bold text-purple-700"
                >
                  {tag}
                </span>
              )
            )}
          </div>

          <div className="mt-8 flex flex-col gap-3 rounded-xl border border-[#e7dcc8] bg-[#f8fbff] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="inline-flex items-center gap-2 text-sm font-bold text-[#52657d]">
              <FaStar className="text-purple-700" />
              You and 23 others liked this writing
            </div>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-bold text-red-700 transition hover:bg-red-50"
            >
              <FaFlag />
              Report
            </button>
          </div>

          <div className="mt-6 grid gap-3 rounded-xl border border-[#e7dcc8] bg-white p-4 sm:grid-cols-2">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-lg bg-[#f8fbff] px-4 py-3 text-sm font-bold text-[#0a2f66] transition hover:bg-[#eaf2ff]"
            >
              <FaArrowLeft />
              Previous article
            </Link>
            <Link
              href={schoolHref}
              className="inline-flex items-center justify-end gap-2 rounded-lg bg-[#f8fbff] px-4 py-3 text-sm font-bold text-[#0a2f66] transition hover:bg-[#eaf2ff]"
            >
              More from this school
              <FaArrowRight />
            </Link>
          </div>
        </main>

        <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          <SidebarCard title="About the Author">
            <div className="flex items-start gap-3">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-600 to-pink-500 text-xl font-black text-white">
                {(author.name || "S").charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="font-black text-[#17120a]">
                  {author.name || "Student"}
                </h3>
                <p className="mt-1 text-xs font-semibold text-[#52657d]">
                  {author.grade || "Student"} - {school.schoolName || "School"}
                </p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-[#52657d]">
              I love writing about culture, education, and social topics. Writing
              helps me express my thoughts and inspire others.
            </p>
          </SidebarCard>

          <SidebarCard title="About the School">
            <ReaderArt compact />
            <h3 className="mt-4 font-black text-[#17120a]">
              {school.schoolName || "School"}
            </h3>
            <p className="mt-2 text-sm leading-6 text-[#52657d]">
              {school.schoolLocation || "School community"}
            </p>
            <Link
              href={schoolHref}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-purple-200 bg-white px-4 py-3 text-sm font-black text-purple-700 transition hover:bg-purple-50"
            >
              View school profile
              <FaArrowRight />
            </Link>
          </SidebarCard>

          {relatedArticles.length > 0 && (
            <SidebarCard title="Related Articles">
              <div className="space-y-3">
                {relatedArticles.map((related) => (
                  <RelatedArticle key={related.id} article={related} />
                ))}
              </div>
            </SidebarCard>
          )}
        </aside>
      </div>

      {moreFromSchool.length > 0 && (
        <section className="mt-6 rounded-2xl border border-[#e7dcc8] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-black text-[#17120a]">
              More from {school.schoolName || "this school"}
            </h2>
            <Link href={schoolHref} className="text-sm font-black text-purple-700">
              View all writings
            </Link>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-4">
            {moreFromSchool.map((item) => (
              <Link
                key={item.id}
                href={`/writings/${item.id}`}
                className="rounded-xl border border-[#e7dcc8] bg-white p-3 transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <ReaderArt compact />
                <span className="mt-3 inline-flex rounded-full bg-purple-50 px-2.5 py-1 text-[10px] font-black uppercase text-purple-700">
                  {getCategoryLabel(item.category)}
                </span>
                <h3 className="mt-2 line-clamp-2 text-sm font-black text-[#17120a]">
                  {item.title}
                </h3>
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#52657d]">
                  {getPreview(item.content)}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
