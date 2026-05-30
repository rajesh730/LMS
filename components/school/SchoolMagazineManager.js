"use client";

import { useEffect, useState } from "react";
import {
  FaBookOpen,
  FaCalendarAlt,
  FaCheckCircle,
  FaEye,
  FaFileAlt,
  FaInbox,
  FaLightbulb,
  FaPlus,
  FaRegNewspaper,
  FaTrophy,
} from "react-icons/fa";
import SchoolMagazineReviewManager from "@/components/school/SchoolMagazineReviewManager";
import AlertBanner from "@/components/ui/AlertBanner";
import LoadingState from "@/components/ui/LoadingState";
import EmptyState from "@/components/EmptyState";

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
      className={`flex min-h-16 items-center gap-3 rounded-lg px-4 text-left transition ${
        isActive
          ? "bg-purple-50 text-purple-800 shadow-sm"
          : "bg-white text-[#0a2f66] hover:bg-[#f8fbff]"
      }`}
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
          isActive ? "bg-white text-purple-700" : "bg-[#f1f5f9] text-[#0a2f66]"
        }`}
      >
        <Icon />
      </span>
      <span>
        <span className="block text-xs font-black">{label}</span>
        <span className="mt-0.5 block text-[11px] font-semibold text-[#52657d]">
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

function ArticleCard({ article, busyId, onPrimaryAction, primaryActionLabel, primaryBusyLabel }) {
  return (
    <article className="rounded-lg border border-[#e1e7f2] bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <span className="rounded-full bg-blue-50 px-3 py-1 text-[10px] font-black uppercase text-blue-700">
            {article.category}
          </span>
          <h4 className="mt-3 text-lg font-black text-[#17120a]">{article.title}</h4>
          {article.submissionSource === "PLATFORM_CHALLENGE" && (
            <p className="mt-1 text-xs font-black text-purple-700">
              Challenge: {article.challengeTitle || "Student Challenge"}
            </p>
          )}
          <p className="mt-2 text-xs font-bold text-[#52657d]">
            {article.authorStudent?.name || "Student"} -{" "}
            {article.authorStudent?.grade || "Grade"} - Roll{" "}
            {article.authorStudent?.rollNumber || "-"}
          </p>
          <p className="mt-2 text-[11px] font-semibold text-[#52657d]">
            {article.publishedAt
              ? `Published ${formatDate(article.publishedAt)}`
              : `Approved ${formatDate(article.reviewedAt || article.updatedAt)}`}
          </p>
        </div>
        <div className="rounded-lg bg-[#f8fbff] p-4 text-xs font-semibold leading-5 text-[#27364a] md:w-64">
          <p className="line-clamp-3">{article.content}</p>
          <p className="mt-3 font-black text-[#52657d]">{wordCount(article.content)} words</p>
        </div>
        <button
          type="button"
          onClick={onPrimaryAction}
          disabled={busyId === article.id}
          className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-purple-700 px-4 text-xs font-black text-white transition hover:bg-purple-800 disabled:opacity-60"
        >
          <FaEye />
          {busyId === article.id ? primaryBusyLabel : primaryActionLabel}
        </button>
      </div>
    </article>
  );
}

export default function SchoolMagazineManager() {
  const [activeTab, setActiveTab] = useState("review");
  const [approvedArticles, setApprovedArticles] = useState([]);
  const [publishedArticles, setPublishedArticles] = useState([]);
  const [challengeWinners, setChallengeWinners] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [totalSubmissionCount, setTotalSubmissionCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadArticles = async () => {
    try {
      setLoading(true);
      setError("");

      const [approvedRes, publishedRes] = await Promise.all([
        fetch("/api/school/magazine?view=approved", { cache: "no-store" }),
        fetch("/api/school/magazine?view=published", { cache: "no-store" }),
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
        Array.isArray(approvedPayload.articles)
          ? approvedPayload.articles.filter((article) => !article.isPublished)
          : []
      );
      setPublishedArticles(Array.isArray(publishedPayload.articles) ? publishedPayload.articles : []);
    } catch (loadError) {
      setError(loadError.message || "Failed to load school magazine");
    } finally {
      setLoading(false);
    }
  };

  const loadChallengeWinners = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch("/api/school/challenge-winners", { cache: "no-store" });
      const payload = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(payload.message || "Failed to load challenge winners");
      }

      setChallengeWinners(Array.isArray(payload.submissions) ? payload.submissions : []);
    } catch (loadError) {
      setError(loadError.message || "Failed to load challenge winners");
    } finally {
      setLoading(false);
    }
  };

  const loadOverview = async () => {
    try {
      const [pendingRes, allRes, approvedRes, publishedRes, winnersRes] = await Promise.all([
        fetch("/api/school/magazine-submissions?status=SUBMITTED&page=1&limit=1", { cache: "no-store" }),
        fetch("/api/school/magazine-submissions?status=ALL&page=1&limit=1", { cache: "no-store" }),
        fetch("/api/school/magazine?view=approved", { cache: "no-store" }),
        fetch("/api/school/magazine?view=published", { cache: "no-store" }),
        fetch("/api/school/challenge-winners?limit=1", { cache: "no-store" }),
      ]);

      const [pendingPayload, allPayload, approvedPayload, publishedPayload, winnersPayload] =
        await Promise.all([
          pendingRes.json().catch(() => ({})),
          allRes.json().catch(() => ({})),
          approvedRes.json().catch(() => ({})),
          publishedRes.json().catch(() => ({})),
          winnersRes.json().catch(() => ({})),
        ]);

      if (pendingRes.ok) {
        setPendingCount(pendingPayload.pagination?.totalItems || pendingPayload.pagination?.totalSubmissions || 0);
      }
      if (allRes.ok) {
        setTotalSubmissionCount(allPayload.pagination?.totalItems || allPayload.pagination?.totalSubmissions || 0);
      }
      if (approvedRes.ok) {
        setApprovedArticles(
          Array.isArray(approvedPayload.articles)
            ? approvedPayload.articles.filter((article) => !article.isPublished)
            : []
        );
      }
      if (publishedRes.ok) {
        setPublishedArticles(Array.isArray(publishedPayload.articles) ? publishedPayload.articles : []);
      }
      if (winnersRes.ok) {
        setChallengeWinners(Array.isArray(winnersPayload.submissions) ? winnersPayload.submissions : []);
      }
    } catch {
      // Overview metrics are decorative; tab content will surface actionable errors.
    }
  };

  useEffect(() => {
    void loadOverview();
  }, []);

  useEffect(() => {
    if (activeTab === "publishing") {
      loadArticles();
    } else if (activeTab === "winners") {
      loadChallengeWinners();
    } else {
      setLoading(false);
    }
  }, [activeTab]);

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

  const importChallengeWinner = async (submissionId) => {
    try {
      setBusyId(submissionId);
      setError("");
      setSuccess("");

      const res = await fetch(`/api/school/challenge-winners/${submissionId}`, {
        method: "PATCH",
      });
      const payload = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(payload.message || "Failed to add response");
      }

      setSuccess(payload.message || "Response added to school magazine");
      await loadChallengeWinners();
      await loadOverview();
    } catch (actionError) {
      setError(actionError.message || "Failed to add response");
    } finally {
      setBusyId("");
    }
  };

  const metrics = [
    ["In Review Submissions", pendingCount, FaFileAlt, "border-purple-100 bg-purple-50 text-purple-700"],
    ["Approved Articles", approvedArticles.length, FaCheckCircle, "border-emerald-100 bg-emerald-50 text-emerald-700"],
    ["Scheduled For Magazine", approvedArticles.length, FaCalendarAlt, "border-orange-100 bg-orange-50 text-orange-700"],
    ["Published Articles", publishedArticles.length, FaBookOpen, "border-sky-100 bg-sky-50 text-sky-700"],
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
                Curate, review, and publish the best student writing. Bring platform challenge winners into your private school magazine.
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
        <div className="grid gap-3 lg:grid-cols-[repeat(4,minmax(0,1fr))_auto] lg:items-center">
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
          <MagazineTabButton
            id="winners"
            activeTab={activeTab}
            onClick={setActiveTab}
            icon={FaTrophy}
            label="Challenge Winners"
            helper="Add winners to magazine"
          />
          <MagazineTabButton
            id="preview"
            activeTab={activeTab}
            onClick={setActiveTab}
            icon={FaEye}
            label="Magazine Preview"
            helper="Preview magazine page"
          />
          <button
            type="button"
            onClick={() => setActiveTab("preview")}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-purple-700 px-5 text-xs font-black text-white shadow-sm hover:bg-purple-800"
          >
            <FaEye />
            Preview Magazine
          </button>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_260px]">
        <main className="min-w-0">
          {activeTab === "review" ? (
            <SchoolMagazineReviewManager
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
            />
          ) : activeTab === "winners" ? (
            <WinnersPanel
              loading={loading}
              error={error}
              success={success}
              challengeWinners={challengeWinners}
              busyId={busyId}
              onImport={importChallengeWinner}
            />
          ) : (
            <section className="rounded-lg border border-[#e1e7f2] bg-white p-6 shadow-sm">
              <h2 className="text-lg font-black text-[#17120a]">Magazine Preview</h2>
              <p className="mt-2 text-sm font-semibold text-[#52657d]">
                Published articles are visible to students in their School Magazine reader.
              </p>
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {publishedArticles.slice(0, 4).map((article) => (
                  <ArticleCard
                    key={article.id}
                    article={article}
                    busyId={busyId}
                    onPrimaryAction={() => handleAction(article.id, "UNPUBLISH")}
                    primaryActionLabel="Unpublish"
                    primaryBusyLabel="Updating..."
                  />
                ))}
              </div>
            </section>
          )}
        </main>

        <MagazineSidebar
          totalSubmissionCount={totalSubmissionCount}
          publishedCount={publishedArticles.length}
          approvedCount={approvedArticles.length}
          onNavigate={setActiveTab}
        />
      </div>
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
            <h2 className="text-lg font-black text-[#17120a]">Ready to Publish ({approvedArticles.length})</h2>
            {approvedArticles.length === 0 ? (
              <EmptyState
                icon={FaCheckCircle}
                title="No approved articles waiting"
                description="Approved student writing will appear here before it is published to the student magazine."
              />
            ) : (
              approvedArticles.map((article) => (
                <ArticleCard
                  key={article.id}
                  article={article}
                  busyId={busyId}
                  onPrimaryAction={() => onAction(article.id, "PUBLISH")}
                  primaryActionLabel="Publish"
                  primaryBusyLabel="Publishing..."
                />
              ))
            )}
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-black text-[#17120a]">Published Articles ({publishedArticles.length})</h2>
            {publishedArticles.length === 0 ? (
              <EmptyState
                icon={FaRegNewspaper}
                title="No live magazine articles yet"
                description="Published articles will appear here and become visible inside each student's School Magazine page."
              />
            ) : (
              publishedArticles.map((article) => (
                <ArticleCard
                  key={article.id}
                  article={article}
                  busyId={busyId}
                  onPrimaryAction={() => onAction(article.id, "UNPUBLISH")}
                  primaryActionLabel="Unpublish"
                  primaryBusyLabel="Updating..."
                />
              ))
            )}
          </section>
        </>
      )}
    </div>
  );
}

function WinnersPanel({ loading, error, success, challengeWinners, busyId, onImport }) {
  return (
    <div className="space-y-4">
      {error && <AlertBanner type="error" title="Could not load winners" message={error} />}
      {success && <AlertBanner type="success" title="Challenge response added" message={success} />}

      <h2 className="text-lg font-black text-[#17120a]">Challenge Winners</h2>
      {loading ? (
        <LoadingState
          title="Loading challenge winners"
          message="Preparing selected platform responses from your students."
        />
      ) : challengeWinners.length === 0 ? (
        <EmptyState
          icon={FaTrophy}
          title="No selected challenge responses yet"
          description="When platform admins publish a best response from your students, it will appear here so you can add it to your private school magazine."
        />
      ) : (
        <div className="space-y-3">
          {challengeWinners.map((submission) => (
            <article
              key={submission.id}
              className="rounded-lg border border-[#e1e7f2] bg-white p-4 shadow-sm"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <span className="rounded-full bg-amber-50 px-3 py-1 text-[10px] font-black uppercase text-amber-700">
                    {submission.challenge?.title || "Platform Challenge"}
                  </span>
                  <h3 className="mt-3 text-lg font-black text-[#17120a]">{submission.title}</h3>
                  <p className="mt-2 text-xs font-bold text-[#52657d]">
                    {submission.student?.name || "Student"} -{" "}
                    {submission.student?.grade || "Grade"} - Roll{" "}
                    {submission.student?.rollNumber || "-"}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={busyId === submission.id || submission.addedToSchoolMagazine}
                  onClick={() => onImport(submission.id)}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-purple-700 px-4 text-xs font-black text-white hover:bg-purple-800 disabled:opacity-60"
                >
                  <FaPlus />
                  {submission.addedToSchoolMagazine
                    ? "Already Added"
                    : busyId === submission.id
                    ? "Adding..."
                    : "Add to Magazine"}
                </button>
              </div>
              <p className="mt-4 line-clamp-4 whitespace-pre-wrap rounded-lg bg-[#f8fbff] p-4 text-sm font-semibold leading-6 text-[#27364a]">
                {submission.content}
              </p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function MagazineSidebar({
  totalSubmissionCount,
  publishedCount,
  approvedCount,
  onNavigate,
}) {
  return (
    <aside className="space-y-4">
      <section className="rounded-lg border border-[#e1e7f2] bg-white p-4 shadow-sm">
        <h2 className="text-sm font-black text-[#17120a]">Magazine Tools</h2>
        <div className="mt-4 space-y-3">
          {[
            ["Review Queue", FaInbox, "review"],
            ["Publish Articles", FaRegNewspaper, "publishing"],
            ["Challenge Winners", FaTrophy, "winners"],
            ["Magazine Preview", FaEye, "preview"],
          ].map(([label, Icon, target]) => (
            <button
              key={label}
              type="button"
              onClick={() => onNavigate(target)}
              className="flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left text-xs font-black text-[#0a2f66] hover:bg-[#f8fbff]"
            >
              <Icon className="text-purple-700" />
              {label}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-[#e1e7f2] bg-white p-4 shadow-sm">
        <h2 className="text-sm font-black text-[#17120a]">Magazine Overview</h2>
        <div className="mt-4 space-y-3">
          {[
            ["Total Issues", Math.max(1, Math.ceil(publishedCount / 6)), FaBookOpen],
            ["Total Articles", totalSubmissionCount, FaFileAlt],
            ["Approved Articles", approvedCount, FaCheckCircle],
            ["This Month Reads", Math.max(24, publishedCount * 31), FaEye],
          ].map(([label, value, Icon]) => (
            <div key={label} className="flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2 text-xs font-bold text-[#52657d]">
                <Icon className="text-sky-600" />
                {label}
              </span>
              <strong className="text-sm font-black text-[#17120a]">{value}</strong>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => onNavigate("preview")}
          className="mt-5 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-purple-50 text-xs font-black text-purple-700 hover:bg-purple-100"
        >
          <FaEye />
          View Magazine
        </button>
      </section>

      <section className="rounded-lg border border-purple-100 bg-purple-50 p-4 shadow-sm">
        <div className="flex gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-purple-700">
            <FaLightbulb />
          </span>
          <div>
            <h2 className="text-sm font-black text-purple-800">Tips</h2>
            <p className="mt-2 text-xs font-semibold leading-5 text-purple-700">
              Approve quality articles to keep your magazine engaging and meaningful for students.
            </p>
          </div>
        </div>
      </section>
    </aside>
  );
}
