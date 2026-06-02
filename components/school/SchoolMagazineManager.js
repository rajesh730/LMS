"use client";

import { useCallback, useEffect, useState } from "react";
import {
  FaBookOpen,
  FaCalendarAlt,
  FaCheckCircle,
  FaEye,
  FaFileAlt,
  FaInbox,
  FaLightbulb,
  FaRegNewspaper,
  FaTimes,
} from "react-icons/fa";
import SchoolMagazineReviewManager from "@/components/school/SchoolMagazineReviewManager";
import AlertBanner from "@/components/ui/AlertBanner";
import LoadingState from "@/components/ui/LoadingState";
import EmptyState from "@/components/EmptyState";
import { getWritingCategoryLabel } from "@/lib/writingCategories";

function formatDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function wordCount(value) {
  return String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function MagazineTabButton({ id, activeTab, onClick, icon: Icon, label, helper }) {
  const isActive = activeTab === id;

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
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${
          isActive
            ? "border-white/30 bg-white/20 text-white"
            : "border-purple-100 bg-purple-50 text-purple-700"
        }`}
      >
        <Icon />
      </span>
      <span>
        <span className="block text-sm font-black leading-tight">{label}</span>
        <span
          className={`mt-0.5 block text-[11px] font-semibold ${
            isActive ? "text-white/85" : "text-[#52657d]"
          }`}
        >
          {helper}
        </span>
      </span>
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
  return (
    <div className="flex flex-wrap gap-1.5">
      <span
        className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${
          article.isMagazinePublished
            ? "bg-emerald-50 text-emerald-700"
            : "bg-slate-100 text-slate-600"
        }`}
      >
        {article.isMagazinePublished ? "Magazine" : "Accepted"}
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
    </div>
  );
}

function WritingTable({ articles, busyId, emptyState, onRead, onAction }) {
  if (articles.length === 0) return emptyState;

  return (
    <div className="overflow-hidden rounded-lg border border-[#e1e7f2] bg-white shadow-sm">
      <div className="grid min-w-[980px] grid-cols-[minmax(210px,1.45fr)_130px_90px_125px_150px_260px] gap-3 border-b border-[#e1e7f2] bg-[#f8fbff] px-4 py-3 text-[11px] font-black uppercase text-[#52657d]">
        <span>Writing</span>
        <span>Student</span>
        <span>Grade</span>
        <span>Type</span>
        <span>Status</span>
        <span className="text-right">Action</span>
      </div>
      <div className="max-w-full overflow-x-auto">
        {articles.map((article) => (
          <div
            key={article.id}
            className="grid min-w-[980px] grid-cols-[minmax(210px,1.45fr)_130px_90px_125px_150px_260px] gap-3 border-b border-[#eef2f7] px-4 py-4 text-sm last:border-b-0"
          >
            <div className="min-w-0">
              <p className="truncate font-black text-[#17120a]">{article.title}</p>
              <p className="mt-1 text-[11px] font-semibold text-[#52657d]">
                Approved {formatDate(article.reviewedAt || article.updatedAt)}
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
            <StatusPill article={article} />
            <div className="flex justify-end gap-1.5">
              <button
                type="button"
                onClick={() => onRead(article)}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-[#dbe5f4] bg-white px-2.5 text-xs font-black text-[#0a2f66] hover:bg-[#f8fbff]"
              >
                <FaEye />
                Read
              </button>
              <button
                type="button"
                onClick={() =>
                  onAction(
                    article,
                    article.isMagazinePublished
                      ? "UNPUBLISH_MAGAZINE"
                      : "PUBLISH_MAGAZINE"
                  )
                }
                disabled={busyId === article.id}
                className="inline-flex h-9 items-center justify-center rounded-lg bg-emerald-600 px-2.5 text-xs font-black text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {article.isMagazinePublished ? "Unmagazine" : "Magazine"}
              </button>
              <button
                type="button"
                onClick={() =>
                  onAction(
                    article,
                    article.isPublished ? "UNPUBLISH_HOMEPAGE" : "PUBLISH_HOMEPAGE"
                  )
                }
                disabled={busyId === article.id}
                className="inline-flex h-9 items-center justify-center rounded-lg bg-purple-700 px-2.5 text-xs font-black text-white hover:bg-purple-800 disabled:opacity-60"
              >
                {busyId === article.id
                  ? "Updating..."
                  : article.isPublished
                  ? "Unhome"
                  : "Homepage"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SchoolMagazineManager() {
  const [activeTab, setActiveTab] = useState("review");
  const [activeGrade, setActiveGrade] = useState("ALL");
  const [gradeOptions, setGradeOptions] = useState([]);
  const [readingArticle, setReadingArticle] = useState(null);
  const [approvedArticles, setApprovedArticles] = useState([]);
  const [publishedArticles, setPublishedArticles] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [totalSubmissionCount, setTotalSubmissionCount] = useState(0);
  const [loading, setLoading] = useState(true);
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
        throw new Error(approvedPayload.message || "Failed to load approved magazine articles");
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

  const loadOverview = useCallback(async () => {
    try {
      const [pendingRes, allRes, approvedRes, publishedRes] = await Promise.all([
        fetch(
          `/api/school/magazine-submissions?${buildGradeQuery({
            status: "SUBMITTED",
            page: "1",
            limit: "1",
          })}`,
          { cache: "no-store" }
        ),
        fetch(
          `/api/school/magazine-submissions?${buildGradeQuery({
            status: "ALL",
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

      const [pendingPayload, allPayload, approvedPayload, publishedPayload] =
        await Promise.all([
          pendingRes.json().catch(() => ({})),
          allRes.json().catch(() => ({})),
          approvedRes.json().catch(() => ({})),
          publishedRes.json().catch(() => ({})),
        ]);

      if (pendingRes.ok) {
        setPendingCount(pendingPayload.pagination?.totalItems || pendingPayload.pagination?.totalSubmissions || 0);
      }
      if (allRes.ok) {
        setTotalSubmissionCount(allPayload.pagination?.totalItems || allPayload.pagination?.totalSubmissions || 0);
      }
      if (approvedRes.ok) {
        setApprovedArticles(
          Array.isArray(approvedPayload.articles) ? approvedPayload.articles : []
        );
      }
      if (publishedRes.ok) {
        setPublishedArticles(Array.isArray(publishedPayload.articles) ? publishedPayload.articles : []);
      }
    } catch {
      // Overview metrics are decorative; tab content will surface actionable errors.
    }
  }, [buildGradeQuery]);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

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
    if (activeTab === "publishing") {
      loadArticles();
    } else {
      setLoading(false);
    }
  }, [activeTab, loadArticles]);

  const handleAction = async (articleId, action) => {
    try {
      setBusyId(articleId);
      setError("");
      setSuccess("");

      const res = await fetch(`/api/school/magazine/${articleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload.message || "Failed to update article");
      }

      setSuccess(payload.message || "Magazine updated");
      await loadArticles();
      await loadOverview();
    } catch (actionError) {
      setError(actionError.message || "Failed to update article");
    } finally {
      setBusyId("");
    }
  };

  const metrics = [
    ["Waiting For Review", pendingCount, FaFileAlt, "border-purple-100 bg-purple-50 text-purple-700"],
    ["Accepted By School", approvedArticles.length, FaCheckCircle, "border-emerald-100 bg-emerald-50 text-emerald-700"],
    ["Not In Magazine Yet", approvedArticles.filter((article) => !article.isMagazinePublished).length, FaCalendarAlt, "border-orange-100 bg-orange-50 text-orange-700"],
    ["Visible In Magazine", publishedArticles.length, FaBookOpen, "border-sky-100 bg-sky-50 text-sky-700"],
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
              <h1 className="mt-2 text-3xl font-black leading-tight">School Magazine</h1>
              <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-[#52657d]">
                Curate, review, and publish student writing. Bring platform-hosted prompt responses into your school magazine when they fit.
              </p>
              <p className="mt-3 max-w-2xl rounded-lg border border-purple-100 bg-purple-50 px-4 py-3 text-xs font-black leading-5 text-purple-800">
                Review new writing first. Accepted writing moves to Publish Articles,
                where you choose Magazine, Homepage, or both.
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
        <div className="grid gap-3 lg:grid-cols-[repeat(2,minmax(0,1fr))_auto] lg:items-center">
          <MagazineTabButton
            id="review"
            activeTab={activeTab}
            onClick={setActiveTab}
            icon={FaInbox}
            label="Review Queue"
            helper="Review new submissions"
          />
          <MagazineTabButton
            id="publishing"
            activeTab={activeTab}
            onClick={setActiveTab}
            icon={FaRegNewspaper}
            label="Publish Articles"
            helper="Manage approved content"
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
          {activeTab === "review" ? (
            <SchoolMagazineReviewManager
              selectedGrade={activeGrade}
              onGradeChange={setActiveGrade}
              providedGradeOptions={gradeOptions}
              onStatsChange={({ refresh }) => {
                if (refresh) void loadOverview();
              }}
            />
          ) : activeTab === "publishing" ? (
            <PublishingPanel
              loading={loading}
              error={error}
              success={success}
              approvedArticles={approvedArticles}
              publishedArticles={publishedArticles}
              busyId={busyId}
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
            <article className="mt-5 whitespace-pre-wrap rounded-lg border border-[#e1e7f2] bg-[#f8fbff] p-5 text-sm font-semibold leading-7 text-[#27364a]">
              {readingArticle.content}
            </article>
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
  loading,
  error,
  success,
  approvedArticles,
  publishedArticles,
  busyId,
  onAction,
  onRead,
}) {
  return (
    <div className="space-y-4">
      {error && <AlertBanner type="error" title="Could not load magazine" message={error} />}
      {success && <AlertBanner type="success" title="Magazine updated" message={success} />}

      {loading ? (
        <LoadingState
          title="Loading magazine articles"
          message="Preparing approved and published student writing."
        />
      ) : (
        <>
          <section className="space-y-3">
            <h2 className="text-lg font-black text-[#17120a]">Accepted Articles ({approvedArticles.length})</h2>
            {approvedArticles.length === 0 ? (
              <EmptyState
                icon={FaCheckCircle}
                title="No approved articles waiting"
                description="Accepted student writing will appear here after school review."
              />
            ) : (
              <WritingTable
                articles={approvedArticles}
                busyId={busyId}
                onRead={onRead}
                onAction={(article, action) => onAction(article.id, action)}
                emptyState={null}
              />
            )}
          </section>
        </>
      )}
    </div>
  );
}
