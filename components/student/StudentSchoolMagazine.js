"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FaBookOpen,
  FaCalendarAlt,
  FaChevronRight,
  FaClock,
  FaCrown,
  FaEye,
  FaFeatherAlt,
  FaLayerGroup,
  FaPenNib,
  FaQuoteLeft,
  FaSearch,
  FaStar,
  FaTags,
  FaUser,
} from "react-icons/fa";
import AlertBanner from "@/components/ui/AlertBanner";
import EmptyState from "@/components/EmptyState";
import LoadingState from "@/components/ui/LoadingState";
import useRealtimeChannel from "@/lib/useRealtimeChannel";
import useWorkIndicators from "@/lib/useWorkIndicators";
import { normalizeWritingCategory } from "@/lib/writingCategories";

const CATEGORY_META = {
  BLOG_ARTICLE: {
    label: "Blog Article",
    accent: "text-indigo-700",
    chip: "border-indigo-200 bg-indigo-50 text-indigo-700",
    art: "from-indigo-100 via-white to-sky-100",
    icon: FaBookOpen,
  },
  POEM: {
    label: "Poem",
    accent: "text-fuchsia-700",
    chip: "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700",
    art: "from-fuchsia-100 via-white to-violet-100",
    icon: FaFeatherAlt,
  },
  RESEARCH: {
    label: "Research",
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
  CREATIVE_WRITING: {
    label: "Creative Writing",
    accent: "text-purple-700",
    chip: "border-purple-200 bg-purple-50 text-purple-700",
    art: "from-purple-100 via-white to-pink-100",
    icon: FaPenNib,
  },
};

function normalizeCategory(value) {
  return normalizeWritingCategory(value);
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

function getPreview(content = "", maxLength = 120) {
  const text = String(content || "").replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trim()}...`;
}

function getReadTime(content = "") {
  const words = String(content || "").trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 180));
}

function MagazineArt({ category, large = false }) {
  const meta = getCategoryMeta(category);
  const Icon = meta.icon;

  return (
    <div
      className={`pratyo-brand-panel relative overflow-hidden rounded-lg border ${
        large ? "h-52" : "h-36"
      }`}
    >
      <div className="absolute inset-0 opacity-70">
        <div className="absolute left-5 top-5 h-14 w-20 rotate-[-8deg] rounded-md border border-white/80 bg-white/75 shadow-sm" />
        <div className="absolute left-16 top-9 h-14 w-20 rotate-[8deg] rounded-md border border-white/80 bg-white/75 shadow-sm" />
        <div className="absolute bottom-6 right-7 h-1 w-24 rotate-[-18deg] rounded-full bg-white/35" />
        <div className="absolute bottom-10 right-10 h-1 w-16 rotate-[-18deg] rounded-full bg-white/35" />
      </div>
      <Icon
        className={`absolute right-5 top-5 text-white/82 ${
          large ? "text-5xl" : "text-4xl"
        } opacity-90`}
      />
      <FaPenNib
        className={`absolute bottom-5 left-6 text-white/72 ${
          large ? "text-3xl" : "text-2xl"
        } opacity-80`}
      />
      <span className="absolute bottom-4 right-4 rounded-full bg-white/80 px-3 py-1 text-[11px] font-bold text-[#17120a] shadow-sm">
        {meta.label}
      </span>
    </div>
  );
}

function ArticleMeta({ article }) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-[#52657d]">
      <span className="inline-flex items-center gap-1.5">
        <FaUser className="text-[#75869b]" />
        {article.authorStudent?.name || "Student"}
      </span>
      <span className="inline-flex items-center gap-1.5">
        <FaCalendarAlt className="text-[#75869b]" />
        {formatDate(article.publishedAt)}
      </span>
      <span className="inline-flex items-center gap-1.5">
        <FaClock className="text-[#75869b]" />
        {getReadTime(article.content)} min read
      </span>
    </div>
  );
}

function ArticleCard({ article }) {
  const meta = getCategoryMeta(article.category);

  return (
    <Link
      href={`/student/magazine/${article.id}`}
      className="group block min-w-0 rounded-lg border border-[#d7cdbb] bg-white p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-purple-200 hover:shadow-md"
    >
      <MagazineArt category={article.category} />
      <div className="mt-3">
        <span
          className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold ${meta.chip}`}
        >
          {meta.label}
        </span>
        <h3 className="mt-3 line-clamp-2 text-base font-bold leading-snug text-[#17120a] group-hover:text-purple-700">
          {article.title}
        </h3>
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#52657d]">
          {getPreview(article.content, 90)}
        </p>
        <ArticleMeta article={article} />
      </div>
    </Link>
  );
}

function StatCard({ icon: Icon, value, label, tone = "purple" }) {
  const tones = {
    purple: "bg-purple-50 text-purple-700 border-purple-100",
    pink: "bg-pink-50 text-pink-700 border-pink-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
  };

  return (
    <div className="rounded-lg border border-[#d7cdbb] bg-white px-4 py-3 shadow-sm">
      <div className="flex items-center gap-3">
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-lg border ${
            tones[tone] || tones.purple
          }`}
        >
          <Icon />
        </span>
        <div>
          <p className="text-lg font-bold leading-none text-[#17120a]">{value}</p>
          <p className="mt-1 text-xs font-semibold text-[#52657d]">{label}</p>
        </div>
      </div>
    </div>
  );
}

export default function StudentSchoolMagazine() {
  const { markSurfaceSeen } = useWorkIndicators();
  const [student, setStudent] = useState(null);
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeCategory, setActiveCategory] = useState("ALL");

  const load = useCallback(
    async ({ silent = false } = {}) => {
      try {
        if (!silent) setLoading(true);
        setError("");
        const res = await fetch("/api/student/magazine", { cache: "no-store" });
        const payload = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(payload.message || "Failed to load school magazine");
        }

        const nextArticles = Array.isArray(payload.articles)
          ? payload.articles
          : [];
        setStudent(payload.student || null);
        setArticles(nextArticles);
      } catch (loadError) {
        setError(loadError.message || "Failed to load school magazine");
      } finally {
        if (!silent) setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    void markSurfaceSeen("student.magazine");
  }, [markSurfaceSeen]);

  useEffect(() => {
    void load();
  }, [load]);

  useRealtimeChannel(
    ["student-notifications", "work-indicators"],
    useCallback(() => {
      void load({ silent: true });
    }, [load])
  );

  const categoryCounts = useMemo(() => {
    const counts = { ALL: articles.length };
    articles.forEach((article) => {
      const category = normalizeCategory(article.category);
      counts[category] = (counts[category] || 0) + 1;
    });
    return counts;
  }, [articles]);

  const filteredArticles = useMemo(
    () =>
      activeCategory === "ALL"
        ? articles
        : articles.filter(
            (article) => normalizeCategory(article.category) === activeCategory
          ),
    [activeCategory, articles]
  );

  const featuredArticle = articles[0] || null;
  const writerStats = useMemo(() => {
    const map = new Map();
    articles.forEach((article) => {
      const name = article.authorStudent?.name || "Student";
      const current = map.get(name) || {
        name,
        grade: article.authorStudent?.grade || "",
        rollNumber: article.authorStudent?.rollNumber || "",
        count: 0,
      };
      current.count += 1;
      map.set(name, current);
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [articles]);
  const spotlight = writerStats[0] || null;
  const categoryTotal = Object.keys(categoryCounts).filter(
    (category) => category !== "ALL" && categoryCounts[category] > 0
  ).length;
  const readTotal = articles.reduce(
    (sum, article) => sum + getReadTime(article.content),
    0
  );

  if (loading) {
    return (
      <LoadingState
        title="Opening school magazine"
        message="Preparing stories, writers, and reading collections."
      />
    );
  }

  if (error) {
    return (
      <AlertBanner
        type="error"
        title="Unable to load magazine"
        message={error}
      />
    );
  }

  if (articles.length === 0) {
    return (
      <EmptyState
        icon={FaFeatherAlt}
        title="No school magazine articles yet"
        description="Published student writing will appear here after your school makes it live."
      />
    );
  }

  return (
    <div className="space-y-6 text-[#27344a]">
      <section className="overflow-hidden rounded-2xl border border-[#d7cdbb] bg-white shadow-[0_18px_50px_rgba(10,47,102,0.08)]">
        <div className="grid gap-6 p-5 md:p-8 xl:grid-cols-[1fr_0.85fr]">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <span className="pratyo-brand-surface flex h-12 w-12 items-center justify-center rounded-xl text-white shadow-lg shadow-slate-950/20">
                <FaBookOpen />
              </span>
              <div>
                <h1 className="text-2xl font-bold text-[#17120a]">
                  School Magazine
                </h1>
                <p className="text-sm text-[#52657d]">School Reading Room</p>
              </div>
            </div>

            <div className="mt-8">
              <p className="text-sm font-semibold italic text-[#40516b]">
                Student voices. Real stories.
              </p>
              <div className="mt-2 h-1 w-20 rounded-full bg-purple-500" />
              <h2 className="mt-5 max-w-2xl text-4xl font-bold leading-tight text-[#17120a] md:text-5xl">
                Explore stories, ideas and{" "}
                <span className="text-purple-600">creativity</span>
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-6 text-[#52657d] md:text-base">
                Read inspiring articles written by students of your school
                community.
              </p>
            </div>

            <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                icon={FaBookOpen}
                value={articles.length}
                label={articles.length === 1 ? "Article" : "Articles"}
              />
              <StatCard
                icon={FaPenNib}
                value={writerStats.length}
                label={writerStats.length === 1 ? "Writer" : "Writers"}
                tone="pink"
              />
              <StatCard
                icon={FaStar}
                value={categoryTotal}
                label={categoryTotal === 1 ? "Category" : "Categories"}
                tone="amber"
              />
              <StatCard
                icon={FaEye}
                value={readTotal}
                label="Read minutes"
                tone="emerald"
              />
            </div>
          </div>

          <div className="pratyo-brand-surface relative min-h-72 overflow-hidden rounded-2xl p-6">
            <div className="absolute right-8 top-8 h-36 w-52 rotate-[-8deg] rounded-lg border border-[#d7cdbb] bg-white/80 shadow-xl" />
            <div className="absolute right-20 top-14 h-36 w-52 rotate-[8deg] rounded-lg border border-[#d7cdbb] bg-white/80 shadow-xl" />
            <FaFeatherAlt className="absolute right-10 top-10 text-5xl text-white/78" />
            <FaBookOpen className="absolute bottom-10 left-10 text-6xl text-white/72" />
            <div className="relative mt-44 rounded-xl border border-white/80 bg-white/75 p-4 shadow-sm backdrop-blur">
              <p className="text-sm font-bold text-[#17120a]">
                {student?.name || "Student"}&apos;s reading room
              </p>
              <p className="mt-1 text-xs text-[#52657d]">
                {student
                  ? `${student.grade || "Grade"} - Roll ${
                      student.rollNumber || "-"
                    }`
                  : "School community magazine"}
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[220px_1fr_280px]">
        <aside className="space-y-5">
          <section className="rounded-xl border border-[#d7cdbb] bg-white p-4 shadow-sm">
            <h2 className="text-sm font-bold text-[#17120a]">Categories</h2>
            <div className="mt-4 space-y-2">
              <button
                type="button"
                onClick={() => setActiveCategory("ALL")}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-semibold transition ${
                  activeCategory === "ALL"
                    ? "bg-purple-50 text-purple-700"
                    : "text-[#40516b] hover:bg-[#f8fbff]"
                }`}
              >
                <span className="inline-flex items-center gap-2">
                  <FaTags />
                  All Articles
                </span>
                <span>{categoryCounts.ALL || 0}</span>
              </button>
              {Object.entries(CATEGORY_META).map(([category, meta]) => {
                const Icon = meta.icon;
                const count = categoryCounts[category] || 0;
                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setActiveCategory(category)}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-semibold transition ${
                      activeCategory === category
                        ? "bg-purple-50 text-purple-700"
                        : "text-[#40516b] hover:bg-[#f8fbff]"
                    }`}
                  >
                    <span className="inline-flex items-center gap-2">
                      <Icon className={meta.accent} />
                      {meta.label}
                    </span>
                    <span>{count}</span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="pratyo-brand-surface rounded-xl border border-slate-700/20 p-5 text-center text-white shadow-sm">
            <FaQuoteLeft className="mx-auto text-2xl text-white/82" />
            <p className="mt-4 text-sm font-semibold italic leading-6 text-white">
              Writing is thinking made visible.
            </p>
            <p className="mt-3 text-xs text-white/72">School Magazine</p>
          </section>
        </aside>

        <main className="min-w-0 space-y-5">
          <section className="rounded-xl border border-[#d7cdbb] bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-[#17120a]">
                  Latest Articles
                </h2>
                <div className="mt-1 h-1 w-16 rounded-full bg-purple-500" />
              </div>
              <div className="flex items-center gap-2 rounded-full border border-[#d7cdbb] bg-[#f8fbff] px-3 py-2 text-sm text-[#52657d]">
                <FaSearch />
                {filteredArticles.length} showing
              </div>
            </div>

            {filteredArticles.length === 0 ? (
              <EmptyState
                icon={FaBookOpen}
                title="No articles in this category"
                description="Choose another category to continue reading."
              />
            ) : (
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {filteredArticles.map((article) => (
                  <ArticleCard
                    key={article.id}
                    article={article}
                  />
                ))}
              </div>
            )}
          </section>
        </main>

        <aside className="space-y-5">
          {featuredArticle && (
            <section className="rounded-xl border border-[#d7cdbb] bg-white p-4 shadow-sm">
              <h2 className="text-sm font-bold text-[#17120a]">
                Featured Article
              </h2>
              <div className="mt-3">
                <MagazineArt category={featuredArticle.category} large />
                <h3 className="mt-4 text-xl font-bold leading-tight text-[#17120a]">
                  {featuredArticle.title}
                </h3>
                <ArticleMeta article={featuredArticle} />
                <p className="mt-3 line-clamp-3 text-sm leading-6 text-[#52657d]">
                  {getPreview(featuredArticle.content, 130)}
                </p>
                <Link
                  href={`/student/magazine/${featuredArticle.id}`}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-pink-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-pink-500"
                >
                  Read Full Article
                  <FaChevronRight />
                </Link>
              </div>
            </section>
          )}

          {spotlight && (
            <section className="rounded-xl border border-[#d7cdbb] bg-white p-5 text-center shadow-sm">
              <h2 className="text-sm font-bold text-[#17120a]">
                Student Spotlight
              </h2>
              <div className="pratyo-brand-surface relative mx-auto mt-5 flex h-24 w-24 items-center justify-center rounded-full text-3xl font-bold text-white shadow-lg shadow-slate-950/20">
                {spotlight.name.charAt(0).toUpperCase()}
                <span className="absolute -right-1 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-amber-400 text-white shadow">
                  <FaCrown className="text-sm" />
                </span>
              </div>
              <p className="mt-4 font-bold text-[#17120a]">{spotlight.name}</p>
              <p className="mt-1 text-xs text-[#52657d]">
                {spotlight.count}{" "}
                {spotlight.count === 1 ? "article" : "articles"} published
              </p>
            </section>
          )}

          <section className="rounded-xl border border-[#d7cdbb] bg-white p-4 shadow-sm">
            <h2 className="text-sm font-bold text-[#17120a]">
              Explore by Theme
            </h2>
            <div className="mt-4 grid gap-3">
              {Object.entries(CATEGORY_META)
                .filter(([category]) => (categoryCounts[category] || 0) > 0)
                .slice(0, 4)
                .map(([category, meta]) => {
                  const Icon = meta.icon;
                  return (
                    <button
                      key={category}
                      type="button"
                      onClick={() => setActiveCategory(category)}
                      className="rounded-lg border border-[#d7cdbb] bg-white p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md"
                    >
                      <Icon className={`text-2xl ${meta.accent}`} />
                      <p className="mt-3 font-bold text-[#17120a]">
                        {meta.label}
                      </p>
                      <p className="text-xs text-[#52657d]">
                        {categoryCounts[category]}{" "}
                        {categoryCounts[category] === 1
                          ? "article"
                          : "articles"}
                      </p>
                    </button>
                  );
                })}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
