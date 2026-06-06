"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FaArrowLeft,
  FaBookOpen,
  FaCalendarAlt,
  FaChevronRight,
  FaClock,
  FaFeatherAlt,
  FaLayerGroup,
  FaPenNib,
  FaStar,
  FaUser,
} from "react-icons/fa";
import AlertBanner from "@/components/ui/AlertBanner";
import LoadingState from "@/components/ui/LoadingState";
import { normalizeWritingCategory } from "@/lib/writingCategories";

const CATEGORY_META = {
  BLOG_ARTICLE: {
    label: "Blog Article",
    chip: "border-indigo-200 bg-indigo-50 text-indigo-700",
    icon: FaBookOpen,
  },
  POEM: {
    label: "Poem",
    chip: "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700",
    icon: FaFeatherAlt,
  },
  RESEARCH: {
    label: "Research",
    chip: "border-emerald-200 bg-emerald-50 text-emerald-700",
    icon: FaLayerGroup,
  },
  OPINION: {
    label: "Opinion",
    chip: "border-amber-200 bg-amber-50 text-amber-700",
    icon: FaStar,
  },
  CREATIVE_WRITING: {
    label: "Creative Writing",
    chip: "border-purple-200 bg-purple-50 text-purple-700",
    icon: FaPenNib,
  },
};

function getCategoryMeta(value) {
  return CATEGORY_META[normalizeWritingCategory(value)] || CATEGORY_META.BLOG_ARTICLE;
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

function getPreview(content = "", maxLength = 160) {
  const text = String(content || "").replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trim()}...`;
}

function IssueCoverArt({ issue, articles }) {
  const featured = articles[0];

  return (
    <div className="pratyo-brand-panel relative min-h-[420px] overflow-hidden rounded-xl border border-white/20 p-6 text-white shadow-2xl">
      <div className="absolute left-8 top-8 h-36 w-24 rounded-md bg-white/82 shadow-xl" />
      <div className="absolute left-28 top-20 h-36 w-24 rounded-md bg-white/68 shadow-xl" />
      <div className="absolute bottom-20 right-10 h-1.5 w-52 rotate-[-16deg] rounded-full bg-white/35" />
      <div className="absolute bottom-28 right-16 h-1.5 w-36 rotate-[-16deg] rounded-full bg-white/35" />
      <FaBookOpen className="absolute right-8 top-8 text-7xl text-white/88" />
      <FaFeatherAlt className="absolute bottom-8 left-10 text-5xl text-white/75" />

      <div className="relative flex min-h-[360px] flex-col justify-end">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-white/85">
          Pratyo School Magazine
        </p>
        <h1 className="mt-4 max-w-xl text-5xl font-black leading-tight md:text-6xl">
          {issue.title}
        </h1>
        <p className="mt-4 max-w-lg text-sm font-bold leading-6 text-white/86">
          {featured
            ? `Featuring ${featured.title} by ${featured.authorStudent?.name || "Student"}.`
            : "A curated collection of student writing."}
        </p>
        <div className="mt-6 flex flex-wrap gap-2 text-xs font-black">
          <span className="rounded-full bg-white px-3 py-1.5 text-[#17120a]">
            {articles.length} {articles.length === 1 ? "writing" : "writings"}
          </span>
          <span className="rounded-full bg-white/18 px-3 py-1.5 text-white">
            {formatDate(issue.publishedAt || issue.weekStart)}
          </span>
        </div>
      </div>
    </div>
  );
}

function ArticleMeta({ article }) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-bold text-[#607089]">
      <span className="inline-flex items-center gap-1.5">
        <FaUser />
        {article.authorStudent?.name || "Student"}
      </span>
      <span className="inline-flex items-center gap-1.5">
        <FaCalendarAlt />
        {formatDate(article.publishedAt)}
      </span>
      <span className="inline-flex items-center gap-1.5">
        <FaClock />
        {getReadTime(article.content)} min read
      </span>
    </div>
  );
}

function buildArticleHref(article, articleHrefPrefix) {
  if (articleHrefPrefix === "#article-") return `#article-${article.id}`;
  return `${articleHrefPrefix}${article.id}`;
}

function FeaturedStory({ article, articleHrefPrefix }) {
  if (!article) return null;
  const meta = getCategoryMeta(article.category);
  const Icon = meta.icon;

  return (
    <Link
      id={`article-${article.id}`}
      href={buildArticleHref(article, articleHrefPrefix)}
      className="grid overflow-hidden rounded-xl border border-[#d7cdbb] bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-purple-300 hover:shadow-lg lg:grid-cols-[0.82fr_1fr]"
    >
      <div className="pratyo-brand-panel relative min-h-72 overflow-hidden">
        <div className="absolute left-8 top-8 h-28 w-20 rounded-md bg-white/78 shadow-lg" />
        <div className="absolute left-24 top-16 h-28 w-20 rounded-md bg-white/58 shadow-lg" />
        <Icon className="absolute right-8 top-8 text-6xl text-white/86" />
        <FaPenNib className="absolute bottom-8 left-8 text-4xl text-white/72" />
      </div>
      <div className="p-6">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-purple-700">
          Featured Story
        </p>
        <span className={`mt-4 inline-flex rounded-full border px-3 py-1 text-xs font-black ${meta.chip}`}>
          {meta.label}
        </span>
        <h2 className="mt-4 text-4xl font-black leading-tight text-[#17120a]">
          {article.title}
        </h2>
        <ArticleMeta article={article} />
        <p className="mt-5 line-clamp-4 text-base leading-7 text-[#43526a]">
          {getPreview(article.content, 260)}
        </p>
        <span className="mt-6 inline-flex items-center gap-2 rounded-full bg-purple-700 px-4 py-2 text-sm font-black text-white">
          Read Featured Story
          <FaChevronRight />
        </span>
      </div>
    </Link>
  );
}

function ArticleCard({ article, articleHrefPrefix }) {
  const meta = getCategoryMeta(article.category);
  const Icon = meta.icon;

  return (
    <Link
      id={`article-${article.id}`}
      href={buildArticleHref(article, articleHrefPrefix)}
      className="group rounded-xl border border-[#d7cdbb] bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-purple-300 hover:shadow-lg"
    >
      <div className="flex items-start justify-between gap-3">
        <span className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-black ${meta.chip}`}>
          {meta.label}
        </span>
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50 text-purple-700">
          <Icon />
        </span>
      </div>
      <h3 className="mt-5 line-clamp-2 text-xl font-black leading-snug text-[#17120a] group-hover:text-purple-700">
        {article.title}
      </h3>
      <p className="mt-3 line-clamp-3 text-sm leading-6 text-[#52657d]">
        {getPreview(article.content)}
      </p>
      <ArticleMeta article={article} />
      <span className="mt-5 inline-flex items-center gap-2 text-sm font-black text-purple-700">
        Read Article
        <FaChevronRight />
      </span>
    </Link>
  );
}

export default function StudentMagazineIssueReader({
  issueId,
  apiBasePath = "/api/student/magazine-issues",
  backHref = "/student/magazine",
  backHrefPattern = "",
  backLabel = "Back to magazines",
  articleHrefPrefix = "/student/magazine/",
}) {
  const [issue, setIssue] = useState(null);
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch(`${apiBasePath}/${issueId}`, {
        cache: "no-store",
      });
      const payload = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(payload.message || "Failed to load magazine");
      }

      setIssue(payload.issue || null);
      setArticles(Array.isArray(payload.articles) ? payload.articles : []);
    } catch (loadError) {
      setError(loadError.message || "Failed to load magazine");
    } finally {
      setLoading(false);
    }
  }, [apiBasePath, issueId]);

  useEffect(() => {
    void load();
  }, [load]);

  const categoryCounts = useMemo(() => {
    const counts = new Map();
    articles.forEach((article) => {
      const meta = getCategoryMeta(article.category);
      counts.set(meta.label, (counts.get(meta.label) || 0) + 1);
    });
    return Array.from(counts.entries());
  }, [articles]);

  if (loading) {
    return (
      <LoadingState
        title="Opening magazine"
        message="Preparing this issue and its selected student writing."
      />
    );
  }

  if (error || !issue) {
    return (
      <AlertBanner
        type="error"
        title="Unable to open magazine"
        message={error || "Magazine not found."}
      />
    );
  }

  const featuredArticle = articles[0] || null;
  const remainingArticles = articles.slice(1);
  const resolvedBackHref =
    backHrefPattern && issue?.schoolId
      ? backHrefPattern.replace("{schoolId}", issue.schoolId)
      : backHref;

  return (
    <div className="space-y-6 text-[#27344a]">
      <Link
        href={resolvedBackHref}
        className="inline-flex w-fit items-center gap-2 rounded-lg border border-[#d7cdbb] bg-white px-4 py-2 text-sm font-black text-[#0a2f66] shadow-sm transition hover:bg-purple-50"
      >
        <FaArrowLeft />
        {backLabel}
      </Link>

      <section className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <IssueCoverArt issue={issue} articles={articles} />

        <aside className="rounded-xl border border-[#d7cdbb] bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-purple-700">
            Issue Contents
          </p>
          <h2 className="mt-2 text-2xl font-black text-[#17120a]">
            {articles.length} selected {articles.length === 1 ? "piece" : "pieces"}
          </h2>
          <div className="mt-5 space-y-3">
            {articles.map((article, index) => (
              <Link
                key={article.id}
                href={buildArticleHref(article, articleHrefPrefix)}
                className="flex gap-3 rounded-lg border border-[#edf0f7] bg-[#f8fbff] p-3 transition hover:border-purple-200 hover:bg-white"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-100 text-xs font-black text-purple-700">
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <p className="line-clamp-1 text-sm font-black text-[#17120a]">
                    {article.title}
                  </p>
                  <p className="mt-1 text-xs font-bold text-[#607089]">
                    {article.authorStudent?.name || "Student"}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </aside>
      </section>

      {categoryCounts.length > 0 && (
        <section className="flex flex-wrap gap-2">
          {categoryCounts.map(([label, count]) => (
            <span
              key={label}
              className="rounded-full border border-[#d7cdbb] bg-white px-3 py-2 text-xs font-black text-[#52657d]"
            >
              {label}: {count}
            </span>
          ))}
        </section>
      )}

      <FeaturedStory
        article={featuredArticle}
        articleHrefPrefix={articleHrefPrefix}
      />

      {remainingArticles.length > 0 && (
        <section className="rounded-xl border border-[#d7cdbb] bg-[#f8fbff] p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-purple-700">
                More From This Issue
              </p>
              <h2 className="mt-2 text-2xl font-black text-[#17120a]">
                Student Writing
              </h2>
            </div>
            <p className="text-sm font-bold text-[#52657d]">
              Curated by your school
            </p>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {remainingArticles.map((article) => (
              <ArticleCard
                key={article.id}
                article={article}
                articleHrefPrefix={articleHrefPrefix}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
