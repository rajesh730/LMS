"use client";

import { useCallback, useEffect, useState } from "react";
import { FaBookOpen, FaCheck, FaSearch, FaTimes } from "react-icons/fa";
import AlertBanner from "@/components/ui/AlertBanner";
import LoadingState from "@/components/ui/LoadingState";
import EmptyState from "@/components/EmptyState";
import LifecycleTimeline from "@/components/ui/LifecycleTimeline";
import PaginationControls from "@/components/PaginationControls";

const FILTERS = [
  { id: "SUBMITTED", label: "Pending Review" },
  { id: "APPROVED", label: "Approved" },
  { id: "REJECTED", label: "Rejected" },
  { id: "ALL", label: "All" },
];

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

export default function SchoolMagazineReviewManager() {
  const [activeFilter, setActiveFilter] = useState("SUBMITTED");
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [reviewNote, setReviewNote] = useState("");
  const [search, setSearch] = useState("");
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    totalItems: 0,
    limit: 20,
  });

  const loadSubmissions = useCallback(async (nextFilter = activeFilter, page = 1) => {
    try {
      setLoading(true);
      setError("");
      const params = new URLSearchParams({
        status: nextFilter,
        page: String(page),
        limit: "12",
      });
      if (search.trim()) params.append("search", search.trim());
      const res = await fetch(`/api/school/magazine-submissions?${params}`, {
        cache: "no-store",
      });
      const payload = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(payload.message || "Failed to load submissions");
      }

      const nextSubmissions = Array.isArray(payload.submissions)
        ? payload.submissions
        : [];
      setSubmissions(nextSubmissions);
      if (payload.pagination) {
        setPagination(payload.pagination);
      }
    } catch (loadError) {
      setError(loadError.message || "Failed to load submissions");
    } finally {
      setLoading(false);
    }
  }, [activeFilter, search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadSubmissions(activeFilter, 1);
    }, 300);
    return () => clearTimeout(timer);
  }, [activeFilter, loadSubmissions]);

  useEffect(() => {
    if (!selectedSubmission) return;

    const nextSelected = submissions.find(
      (submission) => submission.id === selectedSubmission.id
    );

    if (!nextSelected) {
      setSelectedSubmission(null);
      setReviewNote("");
      return;
    }

    setSelectedSubmission(nextSelected);
    setReviewNote((current) =>
      current === nextSelected.reviewNote ? current : nextSelected.reviewNote || ""
    );
  }, [submissions, selectedSubmission]);

  const openSubmission = (submission) => {
    setSelectedSubmission(submission);
    setReviewNote(submission.reviewNote || "");
    setSuccess("");
    setError("");
  };

  const handleReview = async (action) => {
    if (!selectedSubmission) return;

    try {
      setBusy(true);
      setError("");
      setSuccess("");

      const res = await fetch(
        `/api/school/magazine-submissions/${selectedSubmission.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action,
            reviewNote,
          }),
        }
      );

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload.message || "Failed to review submission");
      }

      setSuccess(payload.message || "Review updated");
      await loadSubmissions(activeFilter, pagination.page || 1);
    } catch (reviewError) {
      setError(reviewError.message || "Failed to review submission");
    } finally {
      setBusy(false);
    }
  };

  const showEditableReviewBox = selectedSubmission?.status === "SUBMITTED";
  const showSavedReviewNote =
    selectedSubmission?.status !== "SUBMITTED" && reviewNote.trim().length > 0;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
        <h2 className="flex items-center gap-3 text-2xl font-bold text-white">
          <FaBookOpen className="text-emerald-400" />
          Magazine Review
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          Review student writing, approve the strongest pieces, and send back
          the ones that need revision.
        </p>
      </div>

      {error && (
        <AlertBanner type="error" title="Review queue failed" message={error} />
      )}
      {success && (
        <AlertBanner type="success" title="Review saved" message={success} />
      )}

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((filter) => (
          <button
            key={filter.id}
            type="button"
            onClick={() => setActiveFilter(filter.id)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
              activeFilter === filter.id
                ? "bg-blue-600 text-white"
                : "bg-slate-900/60 text-slate-300 hover:bg-slate-800"
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <div className="relative max-w-xl">
        <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search title, challenge, or content..."
          className="w-full rounded-xl border border-slate-800 bg-slate-900/60 py-3 pl-10 pr-4 text-white outline-none transition focus:border-blue-500"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
          <h3 className="text-xl font-bold text-white">
            Student Submissions ({pagination.totalItems ?? submissions.length})
          </h3>

          {loading ? (
            <LoadingState
              title="Loading submissions"
              message="Preparing student writing for review."
              className="mt-6"
            />
          ) : submissions.length === 0 ? (
            <div className="mt-6">
              <EmptyState
                icon={FaBookOpen}
                title="No submissions in this view"
                description="Student writing will appear here after students submit it for school review."
              />
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {submissions.map((submission) => (
                <button
                  key={submission.id}
                  type="button"
                  onClick={() => openSubmission(submission)}
                  className={`w-full rounded-xl border p-4 text-left transition ${
                    selectedSubmission?.id === submission.id
                      ? "border-blue-500/40 bg-blue-500/10"
                      : "border-slate-800 bg-slate-950/70 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h4 className="text-lg font-semibold text-white">
                        {submission.title}
                      </h4>
                      {submission.submissionSource ===
                        "PLATFORM_CHALLENGE" && (
                        <p className="mt-1 text-xs font-semibold text-amber-200">
                          Challenge:{" "}
                          {submission.challengeTitle || "Student Challenge"}
                        </p>
                      )}
                      <p className="mt-1 text-sm text-slate-400">
                        {submission.authorStudent?.name || "Student"} -{" "}
                        {submission.authorStudent?.grade || "Grade"} - Roll{" "}
                        {submission.authorStudent?.rollNumber || "-"}
                      </p>
                    </div>
                    <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-200">
                      {submission.status}
                    </span>
                  </div>

                  <div className="mt-3 text-xs text-slate-500">
                    {submission.submittedAt
                      ? `Submitted ${formatDate(submission.submittedAt)}`
                      : `Updated ${formatDate(submission.updatedAt)}`}
                  </div>
                </button>
              ))}
              <PaginationControls
                currentPage={pagination.page || pagination.currentPage || 1}
                totalPages={pagination.totalPages || 1}
                onPageChange={(page) => loadSubmissions(activeFilter, page)}
                totalItems={pagination.totalItems}
                start={pagination.start}
                end={pagination.end}
              />
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
          {!selectedSubmission ? (
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-8 text-center text-sm text-slate-400">
              Select a student submission to review it here.
            </div>
          ) : (
            <div className="space-y-5">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {selectedSubmission.category}
                </div>
                {selectedSubmission.submissionSource ===
                  "PLATFORM_CHALLENGE" && (
                  <p className="mt-2 text-sm font-semibold text-amber-200">
                    Challenge response:{" "}
                    {selectedSubmission.challengeTitle || "Student Challenge"}
                  </p>
                )}
                <h3 className="mt-2 text-2xl font-bold text-white">
                  {selectedSubmission.title}
                </h3>
                <p className="mt-2 text-sm text-slate-400">
                  {selectedSubmission.authorStudent?.name || "Student"} -{" "}
                  {selectedSubmission.authorStudent?.grade || "Grade"} - Roll{" "}
                  {selectedSubmission.authorStudent?.rollNumber || "-"}
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  {selectedSubmission.submittedAt
                    ? `Submitted ${formatDate(selectedSubmission.submittedAt)}`
                    : `Updated ${formatDate(selectedSubmission.updatedAt)}`}
                </p>
              </div>

              <LifecycleTimeline
                title="Review history"
                items={selectedSubmission.lifecycle}
              />

              <article className="rounded-xl border border-slate-800 bg-slate-950/70 p-5 text-sm leading-7 text-slate-200 whitespace-pre-wrap">
                {selectedSubmission.content}
              </article>

              {showEditableReviewBox && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    School Review Note
                  </label>
                  <textarea
                    value={reviewNote}
                    onChange={(event) => setReviewNote(event.target.value)}
                    placeholder="Add guidance for the student or internal editorial note"
                    className="min-h-[120px] w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none transition focus:border-blue-500"
                  />
                </div>
              )}

              {showSavedReviewNote && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Saved Review Note
                  </label>
                  <div className="min-h-[120px] rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-sm leading-7 text-slate-300 whitespace-pre-wrap">
                    {reviewNote}
                  </div>
                </div>
              )}

              {selectedSubmission.status === "SUBMITTED" ? (
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => handleReview("APPROVE")}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-60"
                  >
                    <FaCheck />
                    {busy ? "Processing..." : "Approve"}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => handleReview("REJECT")}
                    className="inline-flex items-center gap-2 rounded-xl bg-amber-500/15 px-5 py-3 text-sm font-semibold text-amber-200 transition hover:bg-amber-500/25 disabled:opacity-60"
                  >
                    <FaTimes />
                    {busy ? "Processing..." : "Send Back"}
                  </button>
                </div>
              ) : (
                <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 text-sm text-slate-400">
                  {selectedSubmission.status === "APPROVED"
                    ? "This submission has been approved. Publish it from Magazine Publishing when you want students to read it."
                    : "This submission has already been reviewed."}
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
