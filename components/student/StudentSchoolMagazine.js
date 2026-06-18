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
  FaShieldAlt,
  FaSearch,
  FaStar,
  FaTags,
  FaUser,
} from "react-icons/fa";
import AlertBanner from "@/components/ui/AlertBanner";
import EmptyState from "@/components/EmptyState";
import LoadingState from "@/components/ui/LoadingState";
import StudentQuickNav from "@/components/student/StudentQuickNav";
import { stripWritingMarkup } from "@/components/WritingContent";
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

function formatMonth(value) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function formatMonthMagazineTitle(issue, issueNumber) {
  const issueDate = issue.publishedAt || issue.weekStart || new Date();
  const monthName = new Date(issueDate).toLocaleDateString("en-US", {
    month: "long",
  });
  return `${monthName} Magazine ${issueNumber}`;
}

function getPreview(content = "", maxLength = 120) {
  const text = stripWritingMarkup(content).replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trim()}...`;
}

function getReadTime(content = "") {
  const words = String(content || "").trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 180));
}

function getInitials(name = "") {
  const parts = String(name || "Student").trim().split(/\s+/).filter(Boolean);
  return (parts[0]?.[0] || "S") + (parts[1]?.[0] || "");
}

function formatGradeLabel(value) {
  const grade = String(value || "").trim();
  if (!grade) return "Grade";
  return /^grade\b/i.test(grade) ? grade : `Grade ${grade}`;
}

function MagazineArt({ category, large = false }) {
  const meta = getCategoryMeta(category);
  const Icon = meta.icon;

  return (
    <div
      className={`pravyo-brand-panel relative overflow-hidden rounded-lg border ${
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
      {article.magazineIssue?.title && (
        <span className="inline-flex items-center gap-1.5">
          <FaBookOpen className="text-[#75869b]" />
          {article.magazineIssue.title}
        </span>
      )}
    </div>
  );
}

function ArticleCard({ article, disableLink = false }) {
  const meta = getCategoryMeta(article.category);
  const className =
    "group block min-w-0 rounded-lg border border-[#d7cdbb] bg-white p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-purple-200 hover:shadow-md";
  const content = (
    <>
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
        <p className="mt-2 line-clamp-4 text-sm leading-6 text-[#52657d]">
          {getPreview(article.content, 240)}
        </p>
        <ArticleMeta article={article} />
      </div>
    </>
  );

  if (disableLink) {
    return <article className={className}>{content}</article>;
  }

  return (
    <Link
      href={`/student/magazine/${article.id}`}
      className={className}
    >
      {content}
    </Link>
  );
}

function SchoolWallCard({ article, href }) {
  const meta = getCategoryMeta(article.category);
  const author = article.authorStudent?.name || "Student";
  const publishedDate = formatDate(article.publishedAt);
  const gradeLabel = formatGradeLabel(article.authorStudent?.grade);
  const articleHref = href || `/student/school-wall/${article.id}`;

  return (
    <article className="mobile-wall-card mobile-feed-card rounded-2xl border border-[#edf0f7] bg-white p-4 sm:p-5 text-[#111827] shadow-sm">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#f0edff] text-sm font-black text-[#4326e8]">
          {getInitials(author)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-black text-[#111827]">
            {author}
          </p>
          <p className="truncate text-xs font-bold text-[#667085]">
            <FaShieldAlt className="mr-1 inline text-[#2f7fdb]" />
            {gradeLabel}
            {publishedDate ? ` - ${publishedDate}` : ""}
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-[10px] font-black ${meta.chip}`}>
          {meta.label}
        </span>
      </div>

      <div className="mt-4">
        <h3 className="student-wall-card-title text-lg font-bold leading-tight text-[#111827] sm:text-xl">
          {article.title || "Student writing"}
        </h3>
        <p className="mt-2 line-clamp-4 text-sm leading-6 text-[#4b5565]">
          {getPreview(article.content, 280)}
        </p>
        <Link
          href={articleHref}
          className="mt-3 inline-flex text-sm font-black text-[#4326e8]"
        >
          Read More
          <FaChevronRight className="ml-2 mt-0.5" />
        </Link>
      </div>
    </article>
  );
}

function MagazineIssueCard({ issue }) {
  const coverArticle = issue.articles[0];

  return (
    <Link
      href={`/student/magazine/issues/${issue.id}`}
      className="student-magazine-issue-card mobile-wall-card mobile-feed-card group min-h-[280px] rounded-xl border border-[#d7cdbb] bg-white p-4 text-left shadow-sm transition hover:-translate-y-1 hover:border-purple-300 hover:shadow-xl"
    >
      <div className="student-magazine-issue-art pravyo-brand-panel relative h-40 overflow-hidden rounded-lg border">
        <div className="absolute inset-x-0 top-0 h-12 bg-white/12" />
        <div className="absolute left-5 top-6 h-20 w-14 rounded-sm bg-white/80 shadow-md" />
        <div className="absolute left-20 top-10 h-20 w-14 rounded-sm bg-white/65 shadow-md" />
        <FaBookOpen className="absolute right-6 top-8 text-5xl text-white/85" />
        <FaFeatherAlt className="absolute bottom-6 left-7 text-3xl text-white/75" />
        <span className="absolute bottom-4 right-4 rounded-full bg-white px-3 py-1 text-[11px] font-black text-[#17120a]">
          {issue.articles.length}{" "}
          {issue.articles.length === 1 ? "writing" : "writings"}
        </span>
      </div>
      <div className="mt-4">
        <p className="text-xs font-black uppercase text-purple-700">
          School Magazine
        </p>
        <h3 className="mt-1 text-xl font-bold text-[#17120a] transition group-hover:text-purple-700 sm:text-2xl">
          {issue.title}
        </h3>
        <p className="mt-2 line-clamp-2 text-sm font-semibold leading-6 text-[#52657d]">
          {coverArticle
            ? `${issue.articles.length} selected student ${
                issue.articles.length === 1 ? "writing" : "writings"
              } chosen by your school.`
            : "Open this magazine to read selected student writing."}
        </p>
        <span className="mt-4 inline-flex items-center gap-2 rounded-full bg-purple-50 px-3 py-2 text-xs font-black text-purple-700">
          Open Magazine
          <FaChevronRight />
        </span>
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

function buildMagazineMonths(articles = []) {
  const issueMap = new Map();

  articles.forEach((article) => {
    const issue = article.magazineIssue;
    if (!issue?.id) return;

    const existing = issueMap.get(issue.id) || {
      ...issue,
      articles: [],
    };
    existing.articles.push(article);
    issueMap.set(issue.id, existing);
  });

  const monthMap = new Map();
  Array.from(issueMap.values())
    .sort((a, b) => new Date(b.weekStart || 0) - new Date(a.weekStart || 0))
    .forEach((issue) => {
      const weekDate = issue.weekStart || issue.publishedAt || new Date();
      const date = new Date(weekDate);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const existing = monthMap.get(key) || {
        key,
        label: formatMonth(weekDate),
        issues: [],
      };
      existing.issues.push(issue);
      monthMap.set(key, existing);
    });

  return Array.from(monthMap.values()).map((month) => {
    const oldestFirst = [...month.issues].sort(
      (a, b) =>
        new Date(a.publishedAt || a.weekStart || 0) -
        new Date(b.publishedAt || b.weekStart || 0)
    );
    const issueNumberMap = new Map(
      oldestFirst.map((issue, index) => [issue.id, index + 1])
    );

    return {
      ...month,
      issues: month.issues.map((issue) => ({
        ...issue,
        title: formatMonthMagazineTitle(issue, issueNumberMap.get(issue.id) || 1),
      })),
    };
  });
}

export default function StudentSchoolMagazine({
  initialView = "school-wall",
  lockedView = false,
}) {
  const { markSurfaceSeen } = useWorkIndicators();
  const [student, setStudent] = useState(null);
  const [articles, setArticles] = useState([]);
  const [wallArticles, setWallArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeCategory, setActiveCategory] = useState("ALL");
  const [activeView, setActiveView] = useState(
    initialView === "global" ? "school-wall" : initialView
  );
  const [activeMagazineMonth, setActiveMagazineMonth] = useState("");
  const [activeMagazineIssueId, setActiveMagazineIssueId] = useState("");

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
        const nextWallArticles = Array.isArray(payload.wallArticles)
          ? payload.wallArticles
          : [];
        setStudent(payload.student || null);
        setArticles(nextArticles);
        setWallArticles(nextWallArticles);
      } catch (loadError) {
        setError(loadError.message || "Failed to load school magazine");
      } finally {
        if (!silent) setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (activeView === "school-wall") {
      void markSurfaceSeen("student.schoolWall");
    }
    if (activeView === "magazine") {
      void markSurfaceSeen("student.schoolMagazine");
    }
  }, [activeView, markSurfaceSeen]);

  useEffect(() => {
    void load();
  }, [load]);

  useRealtimeChannel(
    ["student-notifications", "work-indicators"],
    useCallback(() => {
      void load({ silent: true });
    }, [load])
  );

  const magazineMonths = useMemo(() => buildMagazineMonths(articles), [articles]);

  useEffect(() => {
    if (activeView !== "magazine" || magazineMonths.length === 0) return;

    const monthExists = magazineMonths.some(
      (month) => month.key === activeMagazineMonth
    );
    const month = monthExists
      ? magazineMonths.find((item) => item.key === activeMagazineMonth)
      : magazineMonths[0];
    const issueExists = month?.issues.some(
      (issue) => issue.id === activeMagazineIssueId
    );

    if (!monthExists) {
      setActiveMagazineMonth(month.key);
    }
    if (!issueExists) {
      setActiveMagazineIssueId(month.issues[0]?.id || "");
    }
  }, [
    activeMagazineIssueId,
    activeMagazineMonth,
    activeView,
    magazineMonths,
  ]);

  const selectedMagazineMonth =
    magazineMonths.find((month) => month.key === activeMagazineMonth) ||
    magazineMonths[0] ||
    null;
  const selectedMagazineIssue =
    selectedMagazineMonth?.issues.find(
      (issue) => issue.id === activeMagazineIssueId
    ) ||
    selectedMagazineMonth?.issues[0] ||
    null;

  const handleMagazineMonthChange = (event) => {
    const nextMonth = magazineMonths.find(
      (month) => month.key === event.target.value
    );
    setActiveMagazineMonth(nextMonth?.key || "");
    setActiveMagazineIssueId(nextMonth?.issues[0]?.id || "");
    setActiveCategory("ALL");
  };

  const activeArticles = useMemo(() => {
    if (activeView === "magazine") {
      return selectedMagazineIssue?.articles || [];
    }
    return wallArticles;
  }, [activeView, selectedMagazineIssue, wallArticles]);

  const categoryCounts = useMemo(() => {
    const counts = { ALL: activeArticles.length };
    activeArticles.forEach((article) => {
      const category = normalizeCategory(article.category);
      counts[category] = (counts[category] || 0) + 1;
    });
    return counts;
  }, [activeArticles]);

  const filteredArticles = useMemo(
    () =>
      activeCategory === "ALL"
        ? activeArticles
        : activeArticles.filter(
            (article) => normalizeCategory(article.category) === activeCategory
          ),
    [activeArticles, activeCategory]
  );

  const selectedArticle = activeArticles[0] || null;
  const selectedArticleHref =
    activeView === "school-wall"
      ? `/student/school-wall/${selectedArticle?.id}`
      : `/student/magazine/${selectedArticle?.id}`;
  const writerStats = useMemo(() => {
    const map = new Map();
    activeArticles.forEach((article) => {
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
  }, [activeArticles]);
  const spotlight = writerStats[0] || null;
  const categoryTotal = Object.keys(categoryCounts).filter(
    (category) => category !== "ALL" && categoryCounts[category] > 0
  ).length;
  const readTotal = activeArticles.reduce(
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

  if (articles.length === 0 && wallArticles.length === 0) {
    return (
      <EmptyState
        icon={FaFeatherAlt}
        title="No student writing yet"
        description="School wall posts and magazine articles will appear here after students start posting."
      />
    );
  }

  return (
    <div className="student-reading-mobile-shell space-y-4 text-[#27344a] sm:space-y-6">
      <StudentQuickNav className="sm:hidden" />
      <section className="mobile-accessory-info overflow-hidden rounded-2xl border border-[#d7cdbb] bg-white shadow-[0_18px_50px_rgba(10,47,102,0.08)] sm:block">
        <div className="grid gap-6 p-5 md:p-8 xl:grid-cols-[1fr_0.85fr]">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <span className="pravyo-brand-surface flex h-12 w-12 items-center justify-center rounded-xl text-white shadow-lg shadow-slate-950/20">
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
                value={activeArticles.length}
                label={activeArticles.length === 1 ? "Article" : "Articles"}
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

          <div className="pravyo-brand-surface relative min-h-72 overflow-hidden rounded-2xl p-6">
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

      <div className={lockedView ? "student-reading-content-grid grid gap-4 sm:gap-5" : "student-reading-content-grid grid gap-4 sm:gap-5 xl:grid-cols-[1fr_280px]"}>
        <main className="student-reading-content-main min-w-0 space-y-5">
          <section className="student-reading-mobile-surface student-magazine-view-surface mobile-tight-card rounded-xl border border-[#d7cdbb] bg-white p-3 shadow-sm sm:p-4">
            <div className="student-reading-view-heading flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="student-mobile-replaced-title">
                <h2 className="text-lg font-bold text-[#17120a]">
                  {activeView === "magazine"
                    ? "School Magazine"
                    : "School Wall"}
                </h2>
                <div className="mt-1 h-1 w-16 rounded-full bg-purple-500" />
              </div>
              {activeView !== "magazine" && (
                <div className="student-magazine-count-pill flex items-center gap-2 rounded-full border border-[#d7cdbb] bg-[#f8fbff] px-3 py-2 text-sm text-[#52657d]">
                  <FaSearch />
                  {`${filteredArticles.length} showing`}
                </div>
              )}
            </div>
            {!lockedView && (
              <div className="mt-4 flex flex-wrap gap-2">
                {[
                  ["school-wall", "School Wall", wallArticles.length],
                  ["magazine", "School Magazine", articles.length],
                ].map(([view, label, count]) => (
                  <button
                    key={view}
                    type="button"
                    onClick={() => {
                      setActiveView(view);
                      setActiveCategory("ALL");
                    }}
                    className={`rounded-full px-4 py-2 text-xs font-black transition ${
                      activeView === view
                        ? "bg-purple-700 text-white"
                        : "bg-purple-50 text-purple-700 hover:bg-purple-100"
                    }`}
                  >
                    {label} {count}
                  </button>
                ))}
              </div>
            )}

            {activeView === "magazine" && (
              <div className="student-magazine-month-panel mt-3 sm:mt-5">
                {magazineMonths.length === 0 ? (
                  <p className="text-sm font-semibold text-[#52657d]">
                    No magazines yet.
                  </p>
                ) : (
                  <>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                      <label className="block min-w-0 sm:w-72">
                        <span className="text-xs font-black uppercase text-[#52657d]">
                          Filter by month
                        </span>
                        <select
                          value={selectedMagazineMonth?.key || ""}
                          onChange={handleMagazineMonthChange}
                          className="mt-2 w-full rounded-lg border border-[#cfd8ea] bg-white px-3 py-2 text-sm font-black text-[#0a2f66] outline-none transition focus:border-purple-400 focus:ring-4 focus:ring-purple-100"
                        >
                          {magazineMonths.map((month) => (
                            <option key={month.key} value={month.key}>
                              {month.label}
                            </option>
                          ))}
                        </select>
                      </label>

                      <div className="student-magazine-month-count rounded-full border border-[#d7cdbb] bg-white px-3 py-2 text-xs font-black text-[#52657d]">
                        {selectedMagazineMonth?.issues.length || 0}{" "}
                        {selectedMagazineMonth?.issues.length === 1
                          ? "magazine"
                          : "magazines"}{" "}
                        in {selectedMagazineMonth?.label}
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-3">
                      {selectedMagazineMonth?.issues.map((issue) => (
                        <MagazineIssueCard
                          key={issue.id}
                          issue={issue}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {activeView === "magazine" ? null : filteredArticles.length === 0 ? (
              <EmptyState
                icon={FaBookOpen}
                title="No writing in this view"
                description="Choose another category or reading space to continue."
              />
            ) : (
              <>
                {activeView === "school-wall" ? (
                  <div className="student-wall-list mt-4 space-y-3 sm:mt-5 sm:space-y-4">
                    {filteredArticles.map((article) => (
                      <SchoolWallCard
                        key={article.id}
                        article={article}
                        href={`/student/school-wall/${article.id}`}
                      />
                    ))}
                  </div>
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
              </>
            )}
          </section>
        </main>

        {!lockedView && (
        <aside className="space-y-5">
          {selectedArticle && (
            <section className="rounded-xl border border-[#d7cdbb] bg-white p-4 shadow-sm">
              <h2 className="text-sm font-bold text-[#17120a]">
                Selected Writing
              </h2>
              <div className="mt-3">
                <MagazineArt category={selectedArticle.category} large />
                <h3 className="mt-4 text-xl font-bold leading-tight text-[#17120a]">
                  {selectedArticle.title}
                </h3>
                <ArticleMeta article={selectedArticle} />
                <p className="mt-3 line-clamp-4 text-sm leading-6 text-[#52657d]">
                  {getPreview(selectedArticle.content, 240)}
                </p>
                <Link
                  href={selectedArticleHref}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-pink-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-pink-500"
                >
                  Read Article
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
              <div className="pravyo-brand-surface relative mx-auto mt-5 flex h-24 w-24 items-center justify-center rounded-full text-3xl font-bold text-white shadow-lg shadow-slate-950/20">
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
        )}
      </div>
    </div>
  );
}
