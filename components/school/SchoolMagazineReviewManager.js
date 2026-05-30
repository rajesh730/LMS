"use client";

import { useCallback, useEffect, useState } from "react";
import {
  FaBookOpen,
  FaCheck,
  FaEllipsisV,
  FaEye,
  FaFilter,
  FaPen,
  FaQuoteLeft,
  FaSearch,
  FaTimes,
} from "react-icons/fa";
import AlertBanner from "@/components/ui/AlertBanner";
import LoadingState from "@/components/ui/LoadingState";
import EmptyState from "@/components/EmptyState";
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

function wordCount(value) {
  return String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function categoryTone(category = "") {
  const normalized = category.toLowerCase();
  if (normalized.includes("speech")) return "bg-emerald-50 text-emerald-700";
  if (normalized.includes("poetry")) return "bg-amber-50 text-amber-700";
  if (normalized.includes("debate")) return "bg-purple-50 text-purple-700";
  return "bg-blue-50 text-blue-700";
}

function IllustrationTile({ category = "" }) {
  const normalized = category.toLowerCase();
  const tone = normalized.includes("education")
    ? "from-[#0d2a5c] via-[#2563eb] to-[#dbeafe]"
    : normalized.includes("environment")
    ? "from-[#0f5132] via-[#40a66b] to-[#d9f99d]"
    : "from-[#dbeafe] via-[#c7d2fe] to-[#f5d0fe]";

  return (
    <div className={`relative h-[112px] w-[112px] shrink-0 overflow-hidden rounded-lg bg-gradient-to-br ${tone}`}>
      <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-white/45 to-transparent" />
      <div className="absolute bottom-0 left-0 h-16 w-24 -skew-x-12 bg-white/35" />
      <div className="absolute bottom-0 right-0 h-14 w-24 skew-x-12 bg-white/25" />
      <div className="absolute bottom-5 left-6 h-10 w-14 rounded-t-full bg-white/30" />
      <div className="absolute right-4 top-4 h-4 w-4 rounded-full bg-white/75" />
      <div className="absolute left-5 top-8 h-1 w-8 rounded-full bg-white/50" />
    </div>
  );
}

export default function SchoolMagazineReviewManager({ onStatsChange }) {
  const [activeFilter, setActiveFilter] = useState("SUBMITTED");
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
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

  const loadSubmissions = useCallback(
    async (nextFilter = activeFilter, page = 1) => {
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

        setSubmissions(Array.isArray(payload.submissions) ? payload.submissions : []);
        if (payload.pagination) {
          setPagination(payload.pagination);
          onStatsChange?.({
            reviewTotal: payload.pagination.totalItems || payload.pagination.totalSubmissions || 0,
            activeReviewFilter: nextFilter,
          });
        }
      } catch (loadError) {
        setError(loadError.message || "Failed to load submissions");
      } finally {
        setLoading(false);
      }
    },
    [activeFilter, onStatsChange, search]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      loadSubmissions(activeFilter, 1);
    }, 300);
    return () => clearTimeout(timer);
  }, [activeFilter, loadSubmissions]);

  const openSubmission = (submission) => {
    setSelectedSubmission(submission);
    setReviewNote(submission.reviewNote || "");
    setSuccess("");
    setError("");
  };

  const handleReview = async (submission, action, note = "") => {
    if (!submission) return;

    try {
      setBusyId(submission.id);
      setError("");
      setSuccess("");

      const res = await fetch(`/api/school/magazine-submissions/${submission.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          reviewNote: note,
        }),
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload.message || "Failed to review submission");
      }

      setSuccess(payload.message || "Review updated");
      setSelectedSubmission(null);
      setReviewNote("");
      await loadSubmissions(activeFilter, pagination.page || 1);
      onStatsChange?.({ refresh: true });
    } catch (reviewError) {
      setError(reviewError.message || "Failed to review submission");
    } finally {
      setBusyId("");
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-black text-[#17120a]">Review Queue</h2>
        <div className="mt-1 h-0.5 w-24 rounded-full bg-purple-700" />
      </div>

      {error && <AlertBanner type="error" title="Review queue failed" message={error} />}
      {success && <AlertBanner type="success" title="Review saved" message={success} />}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => setActiveFilter(filter.id)}
              className={`rounded-lg px-4 py-2 text-xs font-black transition ${
                activeFilter === filter.id
                  ? "border-b-2 border-purple-700 bg-purple-50 text-purple-700"
                  : "text-[#0a2f66] hover:bg-[#f8fbff]"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="relative block">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[#52657d]" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search title, challenge, or student..."
              className="h-10 w-full rounded-lg border border-[#dbe5f4] bg-white pl-9 pr-3 text-xs font-bold text-[#0a2f66] outline-none sm:w-80"
            />
          </label>
          <button
            type="button"
            onClick={() => loadSubmissions(activeFilter, 1)}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#dbe5f4] bg-white px-4 text-xs font-black text-[#0a2f66] hover:bg-[#f8fbff]"
          >
            <FaFilter />
            Filter
          </button>
        </div>
      </div>

      {loading ? (
        <LoadingState
          title="Loading submissions"
          message="Preparing student writing for review."
        />
      ) : submissions.length === 0 ? (
        <EmptyState
          icon={FaBookOpen}
          title="No submissions in this view"
          description="Student writing will appear here after students submit it for school review."
        />
      ) : (
        <div className="space-y-3">
          {submissions.map((submission) => (
            <article
              key={submission.id}
              className="grid min-h-[136px] gap-4 overflow-hidden rounded-lg border border-l-4 border-[#e1e7f2] border-l-purple-600 bg-white p-4 shadow-sm md:grid-cols-[112px_minmax(0,1fr)_240px_116px_36px] md:items-center"
            >
              <IllustrationTile category={submission.category} />

              <div className="min-w-0">
                <h3 className="truncate text-[15px] font-black text-[#17120a]">
                  {submission.title}
                </h3>
                <p className="mt-2 truncate text-[11px] font-bold text-[#52657d]">
                  {submission.authorStudent?.name || "Student"} <span className="px-1">-</span>
                  {submission.authorStudent?.grade || "Grade"} <span className="px-1">-</span>
                  Roll {submission.authorStudent?.rollNumber || "-"}
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase leading-none ${categoryTone(submission.category)}`}>
                    {submission.category || "Essay"}
                  </span>
                  {submission.challengeTitle && (
                    <span className="rounded-full bg-purple-50 px-3 py-1 text-[10px] font-black leading-none text-purple-700">
                      {submission.challengeTitle}
                    </span>
                  )}
                  <span className="text-[10px] font-bold text-[#52657d]">
                    Submitted {formatDate(submission.submittedAt || submission.updatedAt)}
                  </span>
                </div>
              </div>

              <div className="h-[96px] rounded-lg bg-[#f8fbff] p-4">
                <FaQuoteLeft className="mb-2 text-lg text-[#7c3aed]" />
                <p className="line-clamp-2 text-[11px] font-semibold leading-5 text-[#27364a]">
                  {submission.content}
                </p>
                <p className="mt-2 text-[10px] font-black text-[#52657d]">
                  {wordCount(submission.content)} words
                </p>
              </div>

              <div className="flex items-center gap-2 md:flex-col md:items-stretch">
                {submission.status === "SUBMITTED" && (
                  <>
                    <button
                      type="button"
                      disabled={busyId === submission.id}
                      onClick={() => handleReview(submission, "APPROVE")}
                      className="magazine-review-action inline-flex items-center justify-center gap-2 bg-emerald-50 px-3 text-[11px] font-black text-emerald-700 hover:bg-emerald-100 disabled:opacity-60"
                    >
                      <FaCheck />
                      Approve
                    </button>
                    <button
                      type="button"
                      disabled={busyId === submission.id}
                      onClick={() => handleReview(submission, "REJECT")}
                      className="magazine-review-action inline-flex items-center justify-center gap-2 bg-rose-50 px-3 text-[11px] font-black text-rose-700 hover:bg-rose-100 disabled:opacity-60"
                    >
                      <FaTimes />
                      Reject
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => openSubmission(submission)}
                  className="magazine-review-action inline-flex items-center justify-center gap-2 bg-[#f1f5f9] px-3 text-[11px] font-black text-[#0a2f66] hover:bg-[#e6edf6]"
                >
                  <FaPen />
                  View & Edit
                </button>
              </div>

              <div className="flex justify-end md:block">
                <button
                  type="button"
                  onClick={() => openSubmission(submission)}
                  className="magazine-review-icon-action inline-flex items-center justify-center bg-[#f8fbff] text-[#0a2f66] hover:bg-[#e6edf6]"
                  title="More options"
                >
                  <FaEllipsisV />
                </button>
              </div>
            </article>
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

      {selectedSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className={`inline-flex rounded-full px-3 py-1 text-[10px] font-black uppercase ${categoryTone(selectedSubmission.category)}`}>
                  {selectedSubmission.category || "Essay"}
                </div>
                <h3 className="mt-3 text-2xl font-black text-[#17120a]">
                  {selectedSubmission.title}
                </h3>
                <p className="mt-2 text-sm font-bold text-[#52657d]">
                  {selectedSubmission.authorStudent?.name || "Student"} -{" "}
                  {selectedSubmission.authorStudent?.grade || "Grade"} - Roll{" "}
                  {selectedSubmission.authorStudent?.rollNumber || "-"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSubmission(null)}
                className="text-sm font-black text-[#52657d] hover:text-[#17120a]"
              >
                Close
              </button>
            </div>

            <article className="mt-5 whitespace-pre-wrap rounded-lg border border-[#e1e7f2] bg-[#f8fbff] p-5 text-sm font-semibold leading-7 text-[#27364a]">
              {selectedSubmission.content}
            </article>

            {selectedSubmission.status === "SUBMITTED" ? (
              <div className="mt-5 space-y-4">
                <label>
                  <div className="mb-2 text-sm font-black text-[#52657d]">
                    School Review Note
                  </div>
                  <textarea
                    value={reviewNote}
                    onChange={(event) => setReviewNote(event.target.value)}
                    placeholder="Add guidance for the student or an internal editorial note"
                    className="min-h-28 w-full rounded-lg border border-[#dbe5f4] px-4 py-3 text-sm font-semibold text-[#17120a] outline-none focus:border-purple-500"
                  />
                </label>
                <div className="flex flex-wrap justify-end gap-3">
                  <button
                    type="button"
                    disabled={busyId === selectedSubmission.id}
                    onClick={() => handleReview(selectedSubmission, "REJECT", reviewNote)}
                    className="inline-flex h-10 items-center gap-2 rounded-lg bg-rose-50 px-4 text-sm font-black text-rose-700 hover:bg-rose-100 disabled:opacity-60"
                  >
                    <FaTimes />
                    Reject
                  </button>
                  <button
                    type="button"
                    disabled={busyId === selectedSubmission.id}
                    onClick={() => handleReview(selectedSubmission, "APPROVE", reviewNote)}
                    className="inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-black text-white hover:bg-emerald-700 disabled:opacity-60"
                  >
                    <FaCheck />
                    Approve
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-5 rounded-lg border border-[#e1e7f2] bg-[#f8fbff] p-4 text-sm font-semibold text-[#52657d]">
                <FaEye className="mb-2 text-[#0a2f66]" />
                This submission has already been reviewed.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
