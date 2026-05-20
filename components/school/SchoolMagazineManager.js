"use client";

import { useEffect, useState } from "react";
import {
  FaBookOpen,
  FaCheckCircle,
  FaEye,
  FaInbox,
  FaRegNewspaper,
  FaTrophy,
} from "react-icons/fa";
import SchoolMagazineReviewManager from "@/components/school/SchoolMagazineReviewManager";
import PageHeader from "@/components/ui/PageHeader";
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

function ArticleCard({
  article,
  busyId,
  onPrimaryAction,
  primaryActionLabel,
  primaryBusyLabel,
  helper,
}) {
  return (
    <article className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6 shadow-sm transition hover:border-slate-700">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-200">
              {article.category}
            </span>
          </div>
          <h4 className="mt-4 text-xl font-bold text-white">{article.title}</h4>
          {article.submissionSource === "PLATFORM_CHALLENGE" && (
            <p className="mt-2 text-xs font-semibold text-amber-200">
              Challenge: {article.challengeTitle || "Student Challenge"}
            </p>
          )}
          <p className="mt-2 text-sm text-slate-400">
            {article.authorStudent?.name || "Student"} -{" "}
            {article.authorStudent?.grade || "Grade"} - Roll{" "}
            {article.authorStudent?.rollNumber || "-"}
          </p>
        </div>
        <div className="text-sm text-slate-500">
          {article.publishedAt
            ? `Published ${formatDate(article.publishedAt)}`
            : `Approved ${formatDate(article.reviewedAt || article.updatedAt)}`}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onPrimaryAction}
          disabled={busyId === article.id}
          className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-100 transition hover:bg-slate-700 disabled:opacity-60"
        >
          <FaEye />
          {busyId === article.id ? primaryBusyLabel : primaryActionLabel}
        </button>
        {helper && <p className="text-sm leading-6 text-slate-500">{helper}</p>}
      </div>
    </article>
  );
}

function MagazineTabButton({ id, activeTab, onClick, icon: Icon, label, count }) {
  const isActive = activeTab === id;

  return (
    <button
      type="button"
      onClick={() => onClick(id)}
      className={`inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition ${
        isActive
          ? "bg-blue-600 text-white shadow-lg shadow-blue-950/30"
          : "bg-slate-900/70 text-slate-300 hover:bg-slate-800"
      }`}
    >
      <Icon />
      {label}
      {typeof count === "number" && (
        <span
          className={`rounded-full px-2 py-0.5 text-xs ${
            isActive ? "bg-white/15 text-white" : "bg-slate-800 text-slate-400"
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

export default function SchoolMagazineManager() {
  const [activeTab, setActiveTab] = useState("review");
  const [approvedArticles, setApprovedArticles] = useState([]);
  const [publishedArticles, setPublishedArticles] = useState([]);
  const [challengeWinners, setChallengeWinners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadArticles = async () => {
    try {
      setLoading(true);
      setError("");

      const [approvedRes, publishedRes] = await Promise.all([
        fetch("/api/school/magazine?view=approved", {
          cache: "no-store",
        }),
        fetch("/api/school/magazine?view=published", {
          cache: "no-store",
        }),
      ]);

      const approvedPayload = await approvedRes.json().catch(() => ({}));
      const publishedPayload = await publishedRes.json().catch(() => ({}));

      if (!approvedRes.ok) {
        throw new Error(
          approvedPayload.message || "Failed to load approved magazine articles"
        );
      }

      if (!publishedRes.ok) {
        throw new Error(
          publishedPayload.message || "Failed to load published magazine articles"
        );
      }

      const nextApproved = Array.isArray(approvedPayload.articles)
        ? approvedPayload.articles.filter((article) => !article.isPublished)
        : [];
      const nextPublished = Array.isArray(publishedPayload.articles)
        ? publishedPayload.articles
        : [];

      setApprovedArticles(nextApproved);
      setPublishedArticles(nextPublished);
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
      const res = await fetch("/api/school/challenge-winners", {
        cache: "no-store",
      });
      const payload = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(payload.message || "Failed to load challenge winners");
      }

      setChallengeWinners(
        Array.isArray(payload.submissions) ? payload.submissions : []
      );
    } catch (loadError) {
      setError(loadError.message || "Failed to load challenge winners");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "publishing") {
      loadArticles();
    } else if (activeTab === "winners") {
      loadChallengeWinners();
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
    } catch (actionError) {
      setError(actionError.message || "Failed to add response");
    } finally {
      setBusyId("");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={FaBookOpen}
        eyebrow="Student publishing"
        title="School Magazine"
        description="Approve student writing, decide what becomes visible to students, and optionally bring platform challenge winners into your private school magazine."
      />

      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
        <div className="flex flex-wrap gap-2">
          <MagazineTabButton
            id="review"
            activeTab={activeTab}
            onClick={setActiveTab}
            icon={FaInbox}
            label="Review Queue"
          />
          <MagazineTabButton
            id="publishing"
            activeTab={activeTab}
            onClick={setActiveTab}
            icon={FaRegNewspaper}
            label="Publish Articles"
            count={approvedArticles.length + publishedArticles.length}
          />
          <MagazineTabButton
            id="winners"
            activeTab={activeTab}
            onClick={setActiveTab}
            icon={FaTrophy}
            label="Challenge Winners"
            count={challengeWinners.length}
          />
        </div>
      </div>

      {activeTab === "review" ? (
        <SchoolMagazineReviewManager />
      ) : activeTab === "publishing" ? (
        <div className="space-y-4">
          {error && (
            <AlertBanner type="error" title="Could not load magazine" message={error} />
          )}
          {success && (
            <AlertBanner type="success" title="Magazine updated" message={success} />
          )}

          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
            <div className="flex items-center gap-3">
              <FaCheckCircle className="text-emerald-400" />
              <h3 className="text-xl font-bold text-white">
                School Magazine Publishing
              </h3>
            </div>
            <p className="mt-2 text-sm text-slate-400">
              Approved articles are not visible to students until you publish them. Once published, every student in your school can read them in School Magazine.
            </p>
          </div>

          {loading ? (
            <LoadingState
              title="Loading magazine articles"
              message="Preparing approved and published student writing."
            />
          ) : (
            <div className="space-y-8">
              <section className="space-y-4">
                <div>
                  <h4 className="text-lg font-bold text-white">
                    Ready to Publish ({approvedArticles.length})
                  </h4>
                  <p className="mt-1 text-sm text-slate-400">
                    These are approved, but students still cannot see them until you publish them.
                  </p>
                </div>

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
                      onPrimaryAction={() => handleAction(article.id, "PUBLISH")}
                      primaryActionLabel="Publish to Student Magazine"
                      primaryBusyLabel="Publishing..."
                      helper="Students can read this only after publishing."
                    />
                  ))
                )}
              </section>

              <section className="space-y-4">
                <div>
                  <h4 className="text-lg font-bold text-white">
                    Live Magazine ({publishedArticles.length})
                  </h4>
                  <p className="mt-1 text-sm text-slate-400">
                    These are already live for every student in your school.
                  </p>
                </div>

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
                      onPrimaryAction={() => handleAction(article.id, "UNPUBLISH")}
                      primaryActionLabel="Remove from Student Magazine"
                      primaryBusyLabel="Updating..."
                    />
                  ))
                )}
              </section>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {error && (
            <AlertBanner type="error" title="Could not load winners" message={error} />
          )}
          {success && (
            <AlertBanner type="success" title="Challenge response added" message={success} />
          )}

          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
            <h3 className="text-xl font-bold text-white">Challenge Winners</h3>
            <p className="mt-2 text-sm text-slate-400">
              Platform-selected responses from your students can be added to
              your private school magazine.
            </p>
          </div>

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
            <div className="space-y-4">
              {challengeWinners.map((submission) => (
                <article
                  key={submission.id}
                  className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-200">
                        {submission.challenge?.title || "Platform Challenge"}
                      </span>
                      <h4 className="mt-4 text-xl font-bold text-white">
                        {submission.title}
                      </h4>
                      <p className="mt-2 text-sm text-slate-400">
                        {submission.student?.name || "Student"} -{" "}
                        {submission.student?.grade || "Grade"} - Roll{" "}
                        {submission.student?.rollNumber || "-"}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={
                        busyId === submission.id ||
                        submission.addedToSchoolMagazine
                      }
                      onClick={() => importChallengeWinner(submission.id)}
                      className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-100 transition hover:bg-slate-700 disabled:opacity-60"
                    >
                      <FaEye />
                      {submission.addedToSchoolMagazine
                        ? "Already in Magazine"
                        : busyId === submission.id
                        ? "Adding..."
                        : "Add to School Magazine"}
                    </button>
                  </div>
                  <p className="mt-5 whitespace-pre-wrap text-sm leading-7 text-slate-300">
                    {submission.content}
                  </p>
                </article>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
