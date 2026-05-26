"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  FaArrowLeft,
  FaBookOpen,
  FaBookmark,
  FaCalendarAlt,
  FaClock,
  FaFeatherAlt,
  FaLayerGroup,
  FaPenNib,
  FaStar,
  FaUser,
} from "react-icons/fa";
import AlertBanner from "@/components/ui/AlertBanner";
import LoadingState from "@/components/ui/LoadingState";
import useRealtimeChannel from "@/lib/useRealtimeChannel";

const CATEGORY_META = {
  ESSAY: {
    label: "Essay",
    accent: "text-indigo-700",
    chip: "border-indigo-200 bg-indigo-50 text-indigo-700",
    art: "from-indigo-100 via-white to-sky-100",
    icon: FaBookOpen,
  },
  STORY: {
    label: "Story",
    accent: "text-rose-700",
    chip: "border-rose-200 bg-rose-50 text-rose-700",
    art: "from-rose-100 via-white to-orange-100",
    icon: FaBookmark,
  },
  POEM: {
    label: "Poem",
    accent: "text-fuchsia-700",
    chip: "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700",
    art: "from-fuchsia-100 via-white to-violet-100",
    icon: FaFeatherAlt,
  },
  REPORT: {
    label: "Report",
    accent: "text-emerald-700",
    chip: "border-emerald-200 bg-emerald-50 text-emerald-700",
    art: "from-emerald-100 via-white to-cyan-100",
    icon: FaLayerGroup,
  },
  OPINION: {
    label: "Opinion",
    accent: "text-amber-700",
    chip: "border-amber-200 bg-amber-50 text-amber-700",
    art: "from-amber-100 via-white to-yellow-100",
    icon: FaStar,
  },
  OTHER: {
    label: "Creative Writing",
    accent: "text-purple-700",
    chip: "border-purple-200 bg-purple-50 text-purple-700",
    art: "from-purple-100 via-white to-pink-100",
    icon: FaPenNib,
  },
};

function normalizeCategory(value) {
  const category = String(value || "OTHER").toUpperCase();
  return CATEGORY_META[category] ? category : "OTHER";
}

function getCategoryMeta(value) {
  return CATEGORY_META[normalizeCategory(value)];
}

function formatDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getReadTime(content = "") {
  const words = String(content || "").trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 180));
}

function getPreview(content = "", maxLength = 90) {
  const text = String(content || "").replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trim()}...`;
}

function MagazineArt({ category }) {
  const meta = getCategoryMeta(category);
  const Icon = meta.icon;

  return (
    <div
      className={`relative min-h-72 overflow-hidden rounded-2xl bg-gradient-to-br ${meta.art} p-8`}
    >
      <div className="absolute left-10 top-10 h-32 w-44 rotate-[-8deg] rounded-lg border border-white/80 bg-white/75 shadow-xl" />
      <div className="absolute left-32 top-16 h-32 w-44 rotate-[8deg] rounded-lg border border-white/80 bg-white/75 shadow-xl" />
      <div className="absolute bottom-12 right-16 h-1.5 w-48 rotate-[-18deg] rounded-full bg-current/20" />
      <div className="absolute bottom-20 right-24 h-1.5 w-32 rotate-[-18deg] rounded-full bg-current/20" />
      <Icon className={`absolute right-10 top-10 text-7xl ${meta.accent}`} />
      <FaPenNib className={`absolute bottom-12 left-12 text-5xl ${meta.accent}`} />
      <span className="absolute bottom-8 right-8 rounded-full bg-white/85 px-4 py-2 text-sm font-bold text-[#17120a] shadow-sm">
        {meta.label}
      </span>
    </div>
  );
}

function ArticleMeta({ article }) {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-[#52657d]">
      <span className="inline-flex items-center gap-2">
        <FaUser className="text-[#75869b]" />
        {article.authorStudent?.name || "Student"}
      </span>
      <span className="inline-flex items-center gap-2">
        <FaCalendarAlt className="text-[#75869b]" />
        {formatDate(article.publishedAt)}
      </span>
      <span className="inline-flex items-center gap-2">
        <FaClock className="text-[#75869b]" />
        {getReadTime(article.content)} min read
      </span>
    </div>
  );
}

export default function StudentMagazineArticleReader({ articleId }) {
  const [article, setArticle] = useState(null);
  const [relatedArticles, setRelatedArticles] = useState([]);
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(
    async ({ silent = false } = {}) => {
      try {
        if (!silent) setLoading(true);
        setError("");
        const res = await fetch(`/api/student/magazine/${articleId}`, {
          cache: "no-store",
        });
        const payload = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(payload.message || "Failed to load article");
        }

        setArticle(payload.article || null);
        setRelatedArticles(
          Array.isArray(payload.relatedArticles) ? payload.relatedArticles : []
        );
        setStudent(payload.student || null);
      } catch (loadError) {
        setError(loadError.message || "Failed to load article");
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [articleId]
  );

  useEffect(() => {
    void load();
  }, [load]);

  useRealtimeChannel(
    ["student-notifications", "work-indicators"],
    useCallback(() => {
      void load({ silent: true });
    }, [load])
  );

  if (loading) {
    return (
      <LoadingState
        title="Opening article"
        message="Preparing the full magazine reading page."
      />
    );
  }

  if (error || !article) {
    return (
      <AlertBanner
        type="error"
        title="Unable to open article"
        message={error || "Article not found."}
      />
    );
  }

  const meta = getCategoryMeta(article.category);

  return (
    <div className="space-y-6 text-[#27344a]">
      <Link
        href="/student/magazine"
        className="inline-flex items-center gap-2 rounded-lg border border-[#d7cdbb] bg-white px-4 py-2 text-sm font-semibold text-[#0a2f66] shadow-sm transition hover:bg-[#f8fbff]"
      >
        <FaArrowLeft />
        Back to magazine
      </Link>

      <article className="overflow-hidden rounded-2xl border border-[#d7cdbb] bg-white shadow-[0_18px_50px_rgba(10,47,102,0.08)]">
        <div className="grid gap-6 p-5 md:p-8 xl:grid-cols-[1fr_0.72fr]">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${meta.chip}`}
              >
                {meta.label}
              </span>
              {article.submissionSource === "PLATFORM_CHALLENGE" && (
                <span className="rounded-full border border-purple-200 bg-purple-50 px-3 py-1 text-xs font-bold text-purple-700">
                  Challenge: {article.challengeTitle || "Student Challenge"}
                </span>
              )}
            </div>

            <h1 className="mt-5 max-w-4xl text-4xl font-bold leading-tight text-[#17120a] md:text-5xl">
              {article.title}
            </h1>
            <ArticleMeta article={article} />
            {student && (
              <p className="mt-3 text-sm text-[#52657d]">
                Reading as {student.name} - {student.grade} - Roll{" "}
                {student.rollNumber || "-"}
              </p>
            )}
          </div>

          <MagazineArt category={article.category} />
        </div>

        <div className="border-t border-[#d7cdbb] bg-[#fffdf8] px-5 py-8 md:px-10">
          <div className="mx-auto max-w-3xl whitespace-pre-wrap text-base leading-8 text-[#27344a] md:text-lg">
            {article.content}
          </div>
        </div>
      </article>

      {relatedArticles.length > 0 && (
        <section className="rounded-xl border border-[#d7cdbb] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-[#17120a]">
            More {meta.label} Articles
          </h2>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {relatedArticles.map((related) => {
              const relatedMeta = getCategoryMeta(related.category);
              return (
                <Link
                  key={related.id}
                  href={`/student/magazine/${related.id}`}
                  className="rounded-lg border border-[#d7cdbb] bg-[#f8fbff] p-4 transition hover:-translate-y-0.5 hover:border-purple-200 hover:bg-white hover:shadow-md"
                >
                  <span
                    className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold ${relatedMeta.chip}`}
                  >
                    {relatedMeta.label}
                  </span>
                  <h3 className="mt-3 line-clamp-2 font-bold text-[#17120a]">
                    {related.title}
                  </h3>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#52657d]">
                    {getPreview(related.content)}
                  </p>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
