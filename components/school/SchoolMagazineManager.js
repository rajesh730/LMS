"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FaBookOpen,
  FaCalendarAlt,
  FaCheckCircle,
  FaEye,
  FaFileAlt,
  FaHome,
  FaInbox,
  FaPlus,
  FaRegNewspaper,
  FaTimes,
} from "react-icons/fa";
import SchoolMagazineReviewManager from "@/components/school/SchoolMagazineReviewManager";
import AlertBanner from "@/components/ui/AlertBanner";
import LoadingState from "@/components/ui/LoadingState";
import WritingContent from "@/components/WritingContent";
import AppDate from "@/components/common/AppDate";
import useWorkIndicators from "@/lib/useWorkIndicators";
import { getWritingCategoryLabel } from "@/lib/writingCategories";

function getReadMinutes(content) {
  return Math.max(1, Math.ceil(wordCount(content) / 180));
}

function formatIssueMonth(issue) {
  const date = new Date(issue.weekStart || issue.publishedAt || issue.createdAt || new Date());
  return date.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function getArticleFreshDate(article) {
  return new Date(
    article.submittedAt ||
      article.createdAt ||
      article.publishedAt ||
      article.updatedAt ||
      0
  );
}

function isFreshForMagazine(article) {
  const freshDate = getArticleFreshDate(article);
  if (Number.isNaN(freshDate.getTime())) return false;
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - 2);
  return freshDate >= cutoff;
}

function wordCount(value) {
  return String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function MagazineTabButton({
  id,
  activeTab,
  onClick,
  icon: Icon,
  label,
  helper,
  count = 0,
  tone = "neutral",
  dot = false,
}) {
  const isActive = activeTab === id;
  const pillClass = isActive
    ? "bg-white/20 text-white"
    : tone === "attention"
    ? "bg-amber-100 text-amber-700"
    : "bg-purple-50 text-purple-700";
  // The red "new activity here" dot stays visible (even on the active tab)
  // until the tab is clicked, which marks its content seen.
  const showDot = dot;

  return (
    <button
      type="button"
      onClick={() => onClick(id)}
      className={`flex min-h-16 items-center gap-3 rounded-lg border px-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
        isActive
          ? "border-purple-300 bg-purple-700 text-white"
          : "border-[#dbe5f4] bg-white text-[#0a2f66] hover:border-purple-200 hover:bg-[#f8fbff]"
      }`}
    >
      <span
        className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${
          isActive
            ? "border-white/30 bg-white/20 text-white"
            : "border-purple-100 bg-purple-50 text-purple-700"
        }`}
      >
        <Icon />
        {showDot && (
          <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-red-500 ring-2 ring-white" />
        )}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-black leading-tight">{label}</span>
        <span
          className={`mt-0.5 block text-[11px] font-semibold ${
            isActive ? "text-white/85" : "text-[#52657d]"
          }`}
        >
          {helper}
        </span>
      </span>
      {count > 0 && (
        <span
          className={`ml-auto inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-[11px] font-black ${pillClass}`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

function MetricCard({ label, value, icon: Icon, tone }) {
  return (
    <div className={`rounded-lg border px-4 py-4 ${tone}`}>
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/80">
          <Icon />
        </span>
        <strong className="text-2xl font-black text-[#17120a]">{value}</strong>
      </div>
      <div className="mt-2 text-[11px] font-black text-[#52657d]">{label}</div>
    </div>
  );
}

function StatusPill({ article }) {
  const magazineIssueTitle = article.magazineIssue?.title;
  return (
    <div className="flex flex-wrap gap-1.5">
      <span
        className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${
          article.isMagazinePublished
            ? "bg-emerald-50 text-emerald-700"
            : "bg-slate-100 text-slate-600"
        }`}
      >
        {article.isMagazinePublished ? "Magazine" : "School Wall"}
      </span>
      <span
        className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${
          article.isPublished
            ? "bg-sky-50 text-sky-700"
            : "bg-slate-100 text-slate-600"
        }`}
      >
        {article.isPublished ? "Homepage" : "Not Homepage"}
      </span>
      {magazineIssueTitle && (
        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-black uppercase text-amber-700">
          Used: {magazineIssueTitle}
        </span>
      )}
    </div>
  );
}

function getIssueLabel(article) {
  return article.magazineIssue?.title || "School magazine";
}

function isInIssue(article, issue) {
  if (!article.magazineIssue?.id || !issue?.id) return false;
  return article.magazineIssue.id === issue.id;
}

function ModeStatusPill({ article, mode }) {
  if (mode === "magazine") {
    if (article.isMagazinePublished) {
      return (
        <span className="w-fit rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase text-emerald-700">
          Shown
        </span>
      );
    }
    if (article.magazineIssue && !article.isMagazinePublished) {
      return (
        <span className="w-fit rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-black uppercase text-amber-700">
          Used: {getIssueLabel(article)}
        </span>
      );
    }
    return (
      <span className="w-fit rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase text-slate-600">
        Hidden
      </span>
    );
  }

  return article.isPublished ? (
    <span className="w-fit rounded-full bg-sky-50 px-2.5 py-1 text-[10px] font-black uppercase text-sky-700">
      Shown Public
    </span>
  ) : (
    <span className="w-fit rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase text-slate-600">
      Hidden Public
    </span>
  );
}

function WritingTable({ articles, busyId, emptyState, mode, onRead, onAction }) {
  if (articles.length === 0) return emptyState;

  const modeConfig = {
    magazine: {
      actionLabel: (article) =>
        article.isMagazinePublished
          ? "Hide"
          : article.magazineIssue
          ? "Used"
          : "Add",
      action: (article) =>
        article.isMagazinePublished ? "UNPUBLISH_MAGAZINE" : "PUBLISH_MAGAZINE",
      locked: (article) =>
        Boolean(article.magazineIssue) && !article.isMagazinePublished,
      title: (article) =>
        article.magazineIssue && !article.isMagazinePublished
          ? `Already used in ${getIssueLabel(article)}`
          : undefined,
      className:
        "publishing-desk-primary-button bg-[#1f4e79] text-white hover:bg-[#173f63] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500",
    },
    home: {
      actionLabel: (article) => (article.isPublished ? "Hide" : "Show"),
      action: (article) =>
        article.isPublished ? "UNPUBLISH_HOMEPAGE" : "PUBLISH_HOMEPAGE",
      locked: () => false,
      title: () => undefined,
      className: "publishing-desk-primary-button bg-[#1f4e79] text-white hover:bg-[#173f63] disabled:opacity-60",
    },
  }[mode];

  return (
    <div className="overflow-x-auto rounded-lg border border-[#e1e7f2] bg-white shadow-sm">
      <div className="grid min-w-[920px] grid-cols-[minmax(230px,1.45fr)_140px_90px_125px_190px_170px] gap-3 border-b border-[#e1e7f2] bg-[#f8fbff] px-4 py-3 text-[11px] font-black uppercase text-[#52657d]">
        <span>Writing</span>
        <span>Student</span>
        <span>Grade</span>
        <span>Type</span>
        <span>Status</span>
        <span className="text-right">Action</span>
      </div>
      <div>
        {articles.map((article) => {
          const locked = modeConfig.locked(article);

          return (
            <div
              key={article.id}
              className="grid min-w-[920px] grid-cols-[minmax(230px,1.45fr)_140px_90px_125px_190px_170px] gap-3 border-b border-[#eef2f7] px-4 py-4 text-sm last:border-b-0"
            >
            <div className="min-w-0">
              <p className="truncate font-black text-[#17120a]">{article.title}</p>
              <p className="mt-1 text-[11px] font-semibold text-[#52657d]">
                Posted <AppDate value={article.submittedAt || article.updatedAt} mode="dateTime" />
              </p>
            </div>
            <span className="truncate font-bold text-[#17120a]">
              {article.authorStudent?.name || "Student"}
            </span>
            <span className="font-bold text-[#52657d]">
              {article.authorStudent?.grade || "Grade"}
            </span>
            <span className="font-bold text-[#52657d]">
              {getWritingCategoryLabel(article.category)}
            </span>
            <ModeStatusPill article={article} mode={mode} />
            <div className="flex justify-end gap-1.5">
              <button
                type="button"
                onClick={() => onRead(article)}
                className="publishing-desk-primary-button inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#1f4e79] px-4 text-sm font-black text-white transition hover:bg-[#173f63]"
              >
                <FaEye />
                Read
              </button>
              <button
                type="button"
                onClick={() => onAction(article, modeConfig.action(article))}
                disabled={busyId === article.id || locked}
                title={modeConfig.title(article)}
                className={`inline-flex min-h-10 min-w-20 items-center justify-center rounded-xl px-4 text-sm font-black transition ${modeConfig.className}`}
              >
                {busyId === article.id ? "Updating..." : modeConfig.actionLabel(article)}
              </button>
            </div>
          </div>
          );
        })}
      </div>
    </div>
  );
}

export default function SchoolMagazineManager() {
  const { getIndicator, markSurfaceSeen } = useWorkIndicators();
  const [activeTab, setActiveTab] = useState("wall");
  const [activeGrade, setActiveGrade] = useState("ALL");
  const [gradeOptions, setGradeOptions] = useState([]);
  const [readingArticle, setReadingArticle] = useState(null);
  const [approvedArticles, setApprovedArticles] = useState([]);
  const [publishedArticles, setPublishedArticles] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [currentIssue, setCurrentIssue] = useState(null);

  // Clicking the School Wall tab marks its new posts "seen" → the red dot
  // clears until the next new post arrives.
  const handleSelectTab = (id) => {
    setActiveTab(id);
    if (id === "wall") void markSurfaceSeen("school.schoolWall");
  };
  const [magazineIssues, setMagazineIssues] = useState([]);
  const [selectedIssueId, setSelectedIssueId] = useState("");
  const [selectedIssueMonth, setSelectedIssueMonth] = useState("");
  const [isIssueWorkspaceOpen, setIsIssueWorkspaceOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [issueBusy, setIssueBusy] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const buildGradeQuery = useCallback((baseParams = {}) => {
    const params = new URLSearchParams(baseParams);
    if (activeGrade !== "ALL") params.set("grade", activeGrade);
    return params.toString();
  }, [activeGrade]);

  const loadArticles = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [approvedRes, publishedRes] = await Promise.all([
        fetch(`/api/school/magazine?${buildGradeQuery({ view: "approved" })}`, {
          cache: "no-store",
        }),
        fetch(`/api/school/magazine?${buildGradeQuery({ view: "magazine" })}`, {
          cache: "no-store",
        }),
      ]);

      const approvedPayload = await approvedRes.json().catch(() => ({}));
      const publishedPayload = await publishedRes.json().catch(() => ({}));

      if (!approvedRes.ok) {
        throw new Error(approvedPayload.message || "Failed to load posted writing");
      }
      if (!publishedRes.ok) {
        throw new Error(publishedPayload.message || "Failed to load published magazine articles");
      }

      setApprovedArticles(
        Array.isArray(approvedPayload.articles) ? approvedPayload.articles : []
      );
      setPublishedArticles(Array.isArray(publishedPayload.articles) ? publishedPayload.articles : []);
    } catch (loadError) {
      setError(loadError.message || "Failed to load school magazine");
    } finally {
      setLoading(false);
    }
  }, [buildGradeQuery]);

  const loadMagazineIssues = useCallback(async () => {
    try {
      const res = await fetch("/api/school/magazine-issues", {
        cache: "no-store",
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload.message || "Failed to load magazine issues");
      }
      setCurrentIssue(payload.currentIssue || null);
      setMagazineIssues(Array.isArray(payload.issues) ? payload.issues : []);
      setSelectedIssueId((currentSelected) => {
        if (currentSelected) {
          const exists = payload.issues?.some((issue) => issue.id === currentSelected);
          if (exists) return currentSelected;
        }
        return payload.currentIssue?.id || payload.issues?.[0]?.id || "";
      });
      setSelectedIssueMonth((currentMonth) => {
        if (currentMonth) return currentMonth;
        const firstIssue = payload.currentIssue || payload.issues?.[0];
        return firstIssue ? `${firstIssue.year}-${firstIssue.month}` : "";
      });
    } catch (issueLoadError) {
      setError(
        issueLoadError.message ||
          "Magazine was created, but the issue list could not refresh."
      );
    }
  }, []);

  const loadOverview = useCallback(async () => {
    try {
      const [pendingRes, approvedRes, publishedRes] = await Promise.all([
        fetch(
          `/api/school/magazine-submissions?${buildGradeQuery({
            status: "POSTED",
            page: "1",
            limit: "1",
          })}`,
          { cache: "no-store" }
        ),
        fetch(`/api/school/magazine?${buildGradeQuery({ view: "approved" })}`, {
          cache: "no-store",
        }),
        fetch(`/api/school/magazine?${buildGradeQuery({ view: "magazine" })}`, {
          cache: "no-store",
        }),
      ]);

      const [pendingPayload, approvedPayload, publishedPayload] =
        await Promise.all([
          pendingRes.json().catch(() => ({})),
          approvedRes.json().catch(() => ({})),
          publishedRes.json().catch(() => ({})),
        ]);

      if (pendingRes.ok) {
        setPendingCount(pendingPayload.pagination?.totalItems || pendingPayload.pagination?.totalSubmissions || 0);
      }
      if (approvedRes.ok) {
        setApprovedArticles(
          Array.isArray(approvedPayload.articles) ? approvedPayload.articles : []
        );
      }
      if (publishedRes.ok) {
        setPublishedArticles(Array.isArray(publishedPayload.articles) ? publishedPayload.articles : []);
      }
      void loadMagazineIssues();
    } catch {
      // Overview metrics are decorative; tab content will surface actionable errors.
    }
  }, [buildGradeQuery, loadMagazineIssues]);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  // Stable identity so the child's load effect isn't re-triggered on every
  // parent re-render (the parent re-renders several times as its own fetches
  // resolve). Only a { refresh: true } report should pull fresh overview data.
  const handleWallStatsChange = useCallback(
    ({ refresh } = {}) => {
      if (refresh) void loadOverview();
    },
    [loadOverview]
  );

  useEffect(() => {
    async function loadGrades() {
      try {
        const res = await fetch("/api/school/grade-structure", {
          cache: "no-store",
        });
        const payload = await res.json().catch(() => ({}));
        const grades = Array.isArray(payload.grades)
          ? payload.grades.map((grade) => grade.name || grade._id || grade)
          : [];
        setGradeOptions(grades.filter(Boolean));
      } catch {
        setGradeOptions([]);
      }
    }

    void loadGrades();
  }, []);

  useEffect(() => {
    if (activeTab !== "wall") {
      loadArticles();
      if (activeTab === "magazine") void loadMagazineIssues();
    } else {
      setLoading(false);
    }
  }, [activeTab, loadArticles, loadMagazineIssues]);

  const handleCreateIssue = async () => {
    try {
      setIssueBusy(true);
      setError("");
      setSuccess("");
      const res = await fetch("/api/school/magazine-issues", {
        method: "POST",
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload.message || "Failed to create magazine");
      }
      setSuccess(payload.message || "Magazine is ready");
      if (payload.issue?.id) {
        setCurrentIssue(payload.issue);
        setMagazineIssues((existingIssues) => {
          const exists = existingIssues.some(
            (issue) => issue.id === payload.issue.id
          );
          return exists
            ? existingIssues.map((issue) =>
                issue.id === payload.issue.id ? payload.issue : issue
              )
            : [payload.issue, ...existingIssues];
        });
        setSelectedIssueId(payload.issue.id);
        setSelectedIssueMonth(`${payload.issue.year}-${payload.issue.month}`);
        setIsIssueWorkspaceOpen(true);
      }
      void loadMagazineIssues();
    } catch (issueError) {
      setError(issueError.message || "Failed to create magazine");
    } finally {
      setIssueBusy(false);
    }
  };

  const handlePublishIssue = async (issueId) => {
    try {
      setIssueBusy(true);
      setError("");
      setSuccess("");
      const res = await fetch("/api/school/magazine-issues", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "PUBLISH", issueId }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload.message || "Failed to publish magazine");
      }
      setSuccess(payload.message || "Magazine published to students");
      if (payload.issue?.id) {
        setCurrentIssue((current) =>
          current?.id === payload.issue.id ? payload.issue : current
        );
        setMagazineIssues((existingIssues) =>
          existingIssues.map((issue) =>
            issue.id === payload.issue.id ? payload.issue : issue
          )
        );
      }
      await loadMagazineIssues();
    } catch (publishError) {
      setError(publishError.message || "Failed to publish magazine");
    } finally {
      setIssueBusy(false);
    }
  };

  const handleDeleteIssue = async (issueId) => {
    try {
      setIssueBusy(true);
      setError("");
      setSuccess("");
      const res = await fetch("/api/school/magazine-issues", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ issueId }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload.message || "Failed to delete magazine");
      }

      setSuccess(payload.message || "Magazine deleted");
      setMagazineIssues((existingIssues) =>
        existingIssues.filter((issue) => issue.id !== issueId)
      );
      setCurrentIssue((current) => (current?.id === issueId ? null : current));
      if (selectedIssueId === issueId) {
        setSelectedIssueId("");
        setIsIssueWorkspaceOpen(false);
      }
      await loadArticles();
      await loadMagazineIssues();
    } catch (deleteError) {
      setError(deleteError.message || "Failed to delete magazine");
    } finally {
      setIssueBusy(false);
    }
  };

  const handleToggleIssueHome = async (issue) => {
    try {
      setIssueBusy(true);
      setError("");
      setSuccess("");
      const res = await fetch("/api/school/magazine-issues", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: issue.showOnHome ? "HIDE_HOME" : "SHOW_HOME",
          issueId: issue.id,
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload.message || "Failed to update home showcase");
      }

      setSuccess(payload.message || "Magazine home visibility updated");
      if (payload.issue?.id) {
        setCurrentIssue((current) =>
          current?.id === payload.issue.id ? payload.issue : current
        );
        setMagazineIssues((existingIssues) =>
          existingIssues.map((item) =>
            item.id === payload.issue.id ? payload.issue : item
          )
        );
      }
      await loadMagazineIssues();
    } catch (toggleError) {
      setError(toggleError.message || "Failed to update home showcase");
    } finally {
      setIssueBusy(false);
    }
  };

  const handleAction = async (articleId, action, options = {}) => {
    try {
      setBusyId(articleId);
      setError("");
      setSuccess("");

      const res = await fetch(`/api/school/magazine/${articleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          ...(options.magazineIssueId
            ? { magazineIssueId: options.magazineIssueId }
            : {}),
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload.message || "Failed to update article");
      }

      setSuccess(payload.message || "Writing updated");
      await loadArticles();
      await loadOverview();
      if (action.includes("MAGAZINE")) await loadMagazineIssues();
    } catch (actionError) {
      setError(actionError.message || "Failed to update article");
    } finally {
      setBusyId("");
    }
  };

  const shownPublicly = approvedArticles.filter((article) => article.isPublished).length;

  const metrics = [
    ["School Wall Posts", pendingCount, FaFileAlt, "border-purple-100 bg-purple-50 text-purple-700"],
    ["Fresh For Magazine", approvedArticles.filter((article) => !article.magazineIssue && isFreshForMagazine(article)).length, FaCheckCircle, "border-emerald-100 bg-emerald-50 text-emerald-700"],
    ["Created Magazines", magazineIssues.length, FaCalendarAlt, "border-orange-100 bg-orange-50 text-orange-700"],
    ["In Magazines", publishedArticles.length, FaBookOpen, "border-sky-100 bg-sky-50 text-sky-700"],
  ];

  return (
    <div className="space-y-5 text-[#17120a]">
      <section className="rounded-lg border border-[#e1e7f2] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-start gap-4">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-purple-100 text-2xl text-purple-700">
              <FaBookOpen />
            </span>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-purple-700">
                Student Publishing
              </p>
              <h1 className="mt-2 text-3xl font-black leading-tight">Student Publishing</h1>
              <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-[#52657d]">
                School Wall, School Magazine, and Show To Home are separate
                publishing decisions.
              </p>
              <p className="mt-3 max-w-2xl rounded-lg border border-purple-100 bg-purple-50 px-4 py-3 text-xs font-black leading-5 text-purple-800">
                Students post freely to the school wall. Your school chooses
                what stays visible on the school wall, what becomes a school
                magazine piece, and what appears on the public home page.
              </p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map(([label, value, Icon, tone]) => (
              <MetricCard key={label} label={label} value={value} icon={Icon} tone={tone} />
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-[#e1e7f2] bg-white p-4 shadow-sm">
        <div className="grid gap-3 xl:grid-cols-[repeat(3,minmax(0,1fr))_auto] xl:items-center">
          <MagazineTabButton
            id="wall"
            activeTab={activeTab}
            onClick={handleSelectTab}
            icon={FaInbox}
            label="School Wall"
            helper="Student posts"
            count={pendingCount}
            dot={getIndicator("school.magazine").count > 0}
          />
          <MagazineTabButton
            id="magazine"
            activeTab={activeTab}
            onClick={handleSelectTab}
            icon={FaRegNewspaper}
            label="School Magazine"
            helper="Created magazines"
            count={magazineIssues.length}
          />
          <MagazineTabButton
            id="home"
            activeTab={activeTab}
            onClick={handleSelectTab}
            icon={FaHome}
            label="Show To Home"
            helper="Shown publicly"
            count={shownPublicly}
          />
          <label className="flex min-h-12 items-center gap-2 rounded-lg border border-[#dbe5f4] bg-white px-3 text-xs font-black text-[#0a2f66]">
            Grade
            <select
              value={activeGrade}
              onChange={(event) => setActiveGrade(event.target.value)}
              className="min-h-8 bg-transparent text-xs font-black text-[#0a2f66] outline-none"
            >
              <option value="ALL">All</option>
              {gradeOptions.map((grade) => (
                <option key={grade} value={grade}>
                  {grade}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <div className="grid gap-5">
        <main className="min-w-0">
          {activeTab === "wall" ? (
            <SchoolMagazineReviewManager
              selectedGrade={activeGrade}
              onGradeChange={setActiveGrade}
              providedGradeOptions={gradeOptions}
              onStatsChange={handleWallStatsChange}
            />
          ) : activeTab === "magazine" ? (
            <PublishingPanel
              mode="magazine"
              loading={loading}
              error={error}
              success={success}
              approvedArticles={approvedArticles}
              publishedArticles={publishedArticles}
              currentIssue={currentIssue}
              magazineIssues={magazineIssues}
              selectedIssueId={selectedIssueId}
              onSelectIssue={setSelectedIssueId}
              selectedIssueMonth={selectedIssueMonth}
              onSelectIssueMonth={setSelectedIssueMonth}
              isIssueWorkspaceOpen={isIssueWorkspaceOpen}
              onOpenIssueWorkspace={() => setIsIssueWorkspaceOpen(true)}
              onCloseIssueWorkspace={() => setIsIssueWorkspaceOpen(false)}
              issueBusy={issueBusy}
              busyId={busyId}
              onCreateIssue={handleCreateIssue}
              onPublishIssue={handlePublishIssue}
              onDeleteIssue={handleDeleteIssue}
              onToggleIssueHome={handleToggleIssueHome}
              onAction={handleAction}
              onRead={setReadingArticle}
            />
          ) : activeTab === "home" ? (
            <PublishingPanel
              mode="home"
              loading={loading}
              error={error}
              success={success}
              approvedArticles={approvedArticles}
              publishedArticles={approvedArticles.filter((article) => article.isPublished)}
              currentIssue={null}
              magazineIssues={[]}
              selectedIssueId=""
              onSelectIssue={() => {}}
              selectedIssueMonth=""
              onSelectIssueMonth={() => {}}
              isIssueWorkspaceOpen={false}
              onOpenIssueWorkspace={() => {}}
              onCloseIssueWorkspace={() => {}}
              issueBusy={false}
              busyId={busyId}
              onCreateIssue={() => {}}
              onPublishIssue={() => {}}
              onDeleteIssue={() => {}}
              onToggleIssueHome={() => {}}
              onAction={handleAction}
              onRead={setReadingArticle}
            />
          ) : null}
        </main>

      </div>

      {readingArticle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="rounded-full bg-purple-50 px-3 py-1 text-[10px] font-black uppercase text-purple-700">
                  {getWritingCategoryLabel(readingArticle.category)}
                </span>
                <h3 className="mt-3 text-2xl font-black text-[#17120a]">
                  {readingArticle.title}
                </h3>
                <p className="mt-2 text-sm font-bold text-[#52657d]">
                  {readingArticle.authorStudent?.name || "Student"} -{" "}
                  {readingArticle.authorStudent?.grade || "Grade"} - Roll{" "}
                  {readingArticle.authorStudent?.rollNumber || "-"}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] font-bold text-[#75869b]">
                  <span className="inline-flex items-center gap-1.5">
                    <FaCalendarAlt />
                    Posted <AppDate value={readingArticle.submittedAt || readingArticle.updatedAt} />
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <FaBookOpen />
                    {getReadMinutes(readingArticle.content)} min read
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReadingArticle(null)}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#dbe5f4] text-[#0a2f66] hover:bg-[#f8fbff]"
                aria-label="Close article"
              >
                <FaTimes />
              </button>
            </div>
            <WritingContent
              content={readingArticle.content}
              className="mt-5 rounded-lg border border-[#e1e7f2] bg-[#f8fbff] p-5 text-sm font-semibold leading-7 text-[#27364a]"
            />
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs font-black text-[#52657d]">
              <span>{wordCount(readingArticle.content)} words</span>
              <StatusPill article={readingArticle} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PublishingPanel({
  mode,
  loading,
  error,
  success,
  approvedArticles,
  publishedArticles,
  currentIssue,
  magazineIssues,
  selectedIssueId,
  onSelectIssue,
  selectedIssueMonth,
  onSelectIssueMonth,
  isIssueWorkspaceOpen,
  onOpenIssueWorkspace,
  onCloseIssueWorkspace,
  issueBusy,
  busyId,
  onCreateIssue,
  onPublishIssue,
  onDeleteIssue,
  onToggleIssueHome,
  onAction,
  onRead,
}) {
  const panelConfig = {
    magazine: {
      title: "School Magazine",
      eyebrow: "School Magazine",
      helper:
        "Create a monthly magazine issue, then select the best unused student writing for it.",
      loadingTitle: "Loading magazine writing",
      loadingMessage: "Preparing student writing for the magazine issue.",
      emptyTitle: "No writing ready for magazine",
      emptyDescription:
        "Student writing will appear here after students post it to school.",
      currentLabel: "In Latest Magazine",
      count: publishedArticles.length,
      icon: FaRegNewspaper,
    },
    home: {
      title: "Show To Home",
      eyebrow: "Public Homepage Selection",
      helper:
        "Writing stays hidden from public by default. Read first, choose the best pieces, then show them on the Pravyo home page.",
      loadingTitle: "Loading public choices",
      loadingMessage: "Preparing student writing for public homepage selection.",
      emptyTitle: "No writing ready for public home",
      emptyDescription:
        "Student writing will appear here after students post it to school. It remains hidden from public until you show it.",
      currentLabel: "Shown Publicly",
      count: publishedArticles.length,
      icon: FaHome,
    },
  }[mode];
  const Icon = panelConfig.icon;
  const allMagazineIssues = useMemo(() => {
    if (mode !== "magazine") return [];
    const issueMap = new Map();
    if (currentIssue?.id) issueMap.set(currentIssue.id, currentIssue);
    magazineIssues.forEach((issue) => {
      if (issue?.id) issueMap.set(issue.id, issue);
    });
    return Array.from(issueMap.values()).sort(
      (a, b) =>
        new Date(b.weekStart || b.publishedAt || 0) -
        new Date(a.weekStart || a.publishedAt || 0)
    );
  }, [currentIssue, magazineIssues, mode]);
  const selectedIssue =
    mode === "magazine"
      ? allMagazineIssues.find((issue) => issue.id === selectedIssueId) ||
        currentIssue ||
        allMagazineIssues[0] ||
        null
      : null;
  const issueMonths = useMemo(() => {
    const monthMap = new Map();
    allMagazineIssues.forEach((issue) => {
      const key = `${issue.year}-${issue.month}`;
      if (!monthMap.has(key)) {
        monthMap.set(key, {
          key,
          label: formatIssueMonth(issue),
        });
      }
    });
    return Array.from(monthMap.values());
  }, [allMagazineIssues]);
  const filteredMagazineIssues =
    mode === "magazine" && selectedIssueMonth
      ? allMagazineIssues.filter(
          (issue) => `${issue.year}-${issue.month}` === selectedIssueMonth
        )
      : allMagazineIssues;
  const visibleMagazineIssues =
    filteredMagazineIssues.length > 0
      ? filteredMagazineIssues
      : allMagazineIssues;
  const selectedMagazineArticles =
    mode === "magazine"
      ? approvedArticles.filter(
          (article) => article.isMagazinePublished && isInIssue(article, selectedIssue)
        )
      : publishedArticles;
  const availableMagazineArticles =
    mode === "magazine"
      ? selectedIssue
        ? approvedArticles.filter(
            (article) =>
              !article.isMagazinePublished &&
              !article.magazineIssue &&
              isFreshForMagazine(article)
          )
        : []
      : approvedArticles;
  const activeCount =
    mode === "magazine" ? selectedMagazineArticles.length : panelConfig.count;

  return (
    <div className="space-y-4">
      {error && <AlertBanner type="error" title="Could not load writing" message={error} />}
      {success && <AlertBanner type="success" title="Writing updated" message={success} />}

      {loading ? (
        <LoadingState
          title={panelConfig.loadingTitle}
          message={panelConfig.loadingMessage}
        />
      ) : (
        <>
          {mode === "magazine" && isIssueWorkspaceOpen && selectedIssue && (
            <section className="rounded-lg border border-[#dbe5f4] bg-white p-5 shadow-sm">
              <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.14em] text-emerald-700">
                    Open Magazine
                  </p>
                  <h2 className="mt-2 flex items-center gap-2 text-2xl font-black text-[#17120a]">
                    <FaRegNewspaper className="text-emerald-700" />
                    {selectedIssue.title}
                  </h2>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs font-black text-[#52657d]">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">
                      <FaCalendarAlt />
                      <AppDate value={selectedIssue.publishedAt || selectedIssue.weekStart} />
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 px-3 py-1 text-purple-700">
                      <FaBookOpen />
                      {selectedMagazineArticles.length} selected
                    </span>
                    <span className={`inline-flex rounded-full px-3 py-1 ${
                      selectedIssue.status === "PUBLISHED"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-amber-50 text-amber-700"
                    }`}>
                      {selectedIssue.status === "PUBLISHED" ? "Published" : "Draft"}
                    </span>
                  </div>
                  <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-[#52657d]">
                    Manage the writing inside this magazine. Add fresh student
                    writing, remove mistakes, then publish to students when ready.
                  </p>
                </div>
                <div className="flex flex-col justify-between gap-3 rounded-lg border border-emerald-100 bg-emerald-50 p-4">
                  <div>
                    <div className="text-3xl font-black text-[#17120a]">
                      {selectedMagazineArticles.length}
                    </div>
                    <div className="mt-1 text-[11px] font-black uppercase text-emerald-700">
                      In Open Magazine
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={onCloseIssueWorkspace}
                    className="inline-flex h-10 items-center justify-center rounded-lg border border-emerald-200 bg-white px-4 text-sm font-black text-emerald-800 hover:bg-emerald-50"
                  >
                    Back to Magazines
                  </button>
                  {selectedIssue && selectedIssue.status !== "PUBLISHED" && (
                    <button
                      type="button"
                      onClick={() => onPublishIssue(selectedIssue.id)}
                      disabled={issueBusy || selectedMagazineArticles.length === 0}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-purple-700 px-4 text-sm font-black text-white hover:bg-purple-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <FaCheckCircle />
                      Publish to Students
                    </button>
                  )}
                </div>
              </div>
            </section>
          )}

          {mode === "magazine" && !isIssueWorkspaceOpen && (
            <section className="rounded-lg border border-[#e1e7f2] bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.14em] text-purple-700">
                    Created Magazines
                  </p>
                  <h3 className="mt-2 text-xl font-black text-[#17120a]">
                    Open a magazine to manage its writing
                  </h3>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                  {issueMonths.length > 0 && (
                    <label className="block min-w-0 sm:w-64">
                      <span className="text-[11px] font-black uppercase text-[#52657d]">
                        Filter by month
                      </span>
                      <select
                        value={selectedIssueMonth}
                        onChange={(event) => {
                          const nextMonth = event.target.value;
                          onSelectIssueMonth(nextMonth);
                          const nextIssue = allMagazineIssues.find(
                            (issue) => `${issue.year}-${issue.month}` === nextMonth
                          );
                          if (nextIssue) onSelectIssue(nextIssue.id);
                        }}
                        className="mt-2 h-10 w-full rounded-lg border border-[#dbe5f4] bg-white px-3 text-sm font-black text-[#0a2f66] outline-none focus:border-purple-300"
                      >
                        {issueMonths.map((month) => (
                          <option key={month.key} value={month.key}>
                            {month.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  <button
                    type="button"
                    onClick={onCreateIssue}
                    disabled={issueBusy}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-purple-700 px-4 text-sm font-black text-white hover:bg-purple-800 disabled:opacity-60"
                  >
                    <FaPlus />
                    {issueBusy ? "Creating..." : "Create Magazine"}
                  </button>
                </div>
              </div>

              {allMagazineIssues.length === 0 ? (
                <p className="mt-4 rounded-lg border border-[#e1e7f2] bg-[#f8fbff] px-4 py-3 text-sm font-bold text-[#52657d]">
                  No magazines yet. Create the first magazine to begin.
                </p>
              ) : (
                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {visibleMagazineIssues.map((issue) => {
                    const isSelected = selectedIssue?.id === issue.id;
                    const openIssue = () => {
                      onSelectIssue(issue.id);
                      onOpenIssueWorkspace();
                    };

                    return (
                    <article
                      key={issue.id}
                      role="button"
                      tabIndex={0}
                      onClick={openIssue}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          openIssue();
                        }
                      }}
                      className={`rounded-lg border p-4 text-left text-[#17120a] transition hover:-translate-y-0.5 hover:shadow-md cursor-pointer outline-none focus:ring-2 focus:ring-purple-300 ${
                        isSelected
                          ? "border-purple-400 bg-purple-50 ring-2 ring-purple-200"
                          : "border-[#e1e7f2] bg-[#f8fbff] hover:border-purple-200"
                      }`}
                    >
                    <div className="flex items-start justify-between gap-3">
                      <div className="font-black">{issue.title}</div>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${
                          issue.status === "PUBLISHED"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {issue.status === "PUBLISHED" ? "Published" : "Draft"}
                      </span>
                    </div>
                    <div className="mt-2 text-xs font-bold text-[#52657d]">
                      <AppDate value={issue.publishedAt || issue.weekStart} />
                    </div>
                    <div className="mt-3 inline-flex rounded-full bg-white px-3 py-1 text-[11px] font-black uppercase text-purple-700 ring-1 ring-inset ring-purple-100">
                      {issue.articleCount || 0} writings
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {issue.status !== "PUBLISHED" && (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            onPublishIssue(issue.id);
                          }}
                          disabled={issueBusy || (issue.articleCount || 0) === 0}
                          className="inline-flex h-9 items-center justify-center rounded-lg bg-emerald-700 px-3 text-xs font-black text-white hover:bg-emerald-800 disabled:opacity-50"
                        >
                          Publish
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          onToggleIssueHome(issue);
                        }}
                        disabled={issueBusy || issue.status !== "PUBLISHED"}
                        className={`inline-flex h-9 items-center justify-center rounded-lg px-3 text-xs font-black disabled:opacity-50 ${
                          issue.showOnHome
                            ? "bg-sky-50 text-sky-700 hover:bg-sky-100"
                            : "bg-purple-50 text-purple-700 hover:bg-purple-100"
                        }`}
                      >
                        {issue.showOnHome ? "Hide from Home" : "Show to Home"}
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          onDeleteIssue(issue.id);
                        }}
                        disabled={issueBusy}
                        className="inline-flex h-9 items-center justify-center rounded-lg bg-rose-50 px-3 text-xs font-black text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                    </article>
                  )})}
                </div>
              )}
            </section>
          )}

          {mode !== "magazine" && (
          <section className="rounded-lg border border-[#e1e7f2] bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.14em] text-purple-700">
                  {panelConfig.eyebrow}
                </p>
                <h2 className="mt-2 flex items-center gap-2 text-2xl font-black text-[#17120a]">
                  <Icon className="text-purple-700" />
                  {panelConfig.title}
                </h2>
                <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-[#52657d]">
                  {panelConfig.helper}
                </p>
              </div>
              <div className="rounded-lg border border-purple-100 bg-purple-50 px-4 py-3 text-right">
                <div className="text-2xl font-black text-[#17120a]">
                  {activeCount}
                </div>
                <div className="mt-1 text-[11px] font-black uppercase text-purple-700">
                  {panelConfig.currentLabel}
                </div>
              </div>
            </div>
          </section>
          )}

          {mode === "magazine" && isIssueWorkspaceOpen && selectedIssue && selectedMagazineArticles.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-lg font-black text-[#17120a]">
                Inside {selectedIssue?.title || "Magazine"} ({selectedMagazineArticles.length})
              </h3>
              <WritingTable
                articles={selectedMagazineArticles}
                busyId={busyId}
                mode={mode}
                onRead={onRead}
                onAction={(article, action) =>
                  onAction(article.id, action, {
                    magazineIssueId: selectedIssue?.id,
                  })
                }
                emptyState={null}
              />
            </section>
          )}

          {(mode !== "magazine" || (isIssueWorkspaceOpen && selectedIssue)) && (
          <section className="space-y-3">
            <h3 className="text-lg font-black text-[#17120a]">
              Available School Wall Writing ({availableMagazineArticles.length})
            </h3>
            {availableMagazineArticles.length === 0 ? (
              <p className="rounded-lg border border-[#e1e7f2] bg-white px-4 py-3 text-sm font-bold text-[#52657d]">
                {mode === "magazine" && !selectedIssue
                  ? "Create or open a magazine to add writing."
                  : "No fresh unused writing is available right now."}
              </p>
            ) : (
              <WritingTable
                articles={availableMagazineArticles}
                busyId={busyId}
                mode={mode}
                onRead={onRead}
                onAction={(article, action) =>
                  onAction(article.id, action, {
                    magazineIssueId: selectedIssue?.id,
                  })
                }
                emptyState={null}
              />
            )}
          </section>
          )}
        </>
      )}
    </div>
  );
}
