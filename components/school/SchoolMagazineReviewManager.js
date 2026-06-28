"use client";

import { useCallback, useEffect, useState } from "react";
import { FaBookOpen, FaEye, FaFilter, FaSearch } from "react-icons/fa";
import AlertBanner from "@/components/ui/AlertBanner";
import LoadingState from "@/components/ui/LoadingState";
import EmptyState from "@/components/EmptyState";
import PaginationControls from "@/components/PaginationControls";
import WritingContent from "@/components/WritingContent";
import { getWritingCategoryLabel } from "@/lib/writingCategories";
import AppDate from "@/components/common/AppDate";


function categoryTone(category = "") {
  const normalized = category.toLowerCase();
  if (normalized.includes("speech")) return "bg-emerald-50 text-emerald-700";
  if (normalized.includes("poetry")) return "bg-amber-50 text-amber-700";
  if (normalized.includes("debate")) return "bg-purple-50 text-purple-700";
  return "bg-blue-50 text-blue-700";
}

export default function SchoolMagazineReviewManager({
  onStatsChange,
  selectedGrade,
  onGradeChange,
  providedGradeOptions = [],
}) {
  const [activeGrade, setActiveGrade] = useState("ALL");
  const [gradeOptions, setGradeOptions] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [search, setSearch] = useState("");
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    totalItems: 0,
    limit: 20,
  });
  const effectiveGrade = selectedGrade || activeGrade;
  const effectiveGradeOptions =
    providedGradeOptions.length > 0 ? providedGradeOptions : gradeOptions;

  const loadSubmissions = useCallback(
    async (page = 1) => {
      try {
        setLoading(true);
        setError("");
        const params = new URLSearchParams({
          status: "POSTED",
          page: String(page),
          limit: "12",
        });
        if (search.trim()) params.append("search", search.trim());
        if (effectiveGrade !== "ALL") params.append("grade", effectiveGrade);
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
            activeReviewFilter: "POSTED",
          });
        }
      } catch (loadError) {
        setError(loadError.message || "Failed to load submissions");
      } finally {
        setLoading(false);
      }
    },
    [effectiveGrade, onStatsChange, search]
  );

  useEffect(() => {
    // When the parent already supplies grade options, don't refetch them here —
    // that's a wasted request and the result would be ignored anyway.
    if (providedGradeOptions.length > 0) return;

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
  }, [providedGradeOptions.length]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadSubmissions(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [effectiveGrade, loadSubmissions]);

  const updateGrade = (grade) => {
    if (onGradeChange) {
      onGradeChange(grade);
      return;
    }
    setActiveGrade(grade);
  };

  const openSubmission = (submission) => {
    setSelectedSubmission(submission);
    setSuccess("");
    setError("");

    // Opening a post marks that specific post read → its unread dot clears.
    if (submission?.isUnread) {
      setSubmissions((current) =>
        current.map((item) =>
          item.id === submission.id ? { ...item, isUnread: false } : item
        )
      );
      fetch(`/api/school/magazine/${submission.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "MARK_READ" }),
      }).catch(() => {});
    }
  };

  const handleWallAction = async (submission, action) => {
    if (!submission) return;

    try {
      setBusyId(submission.id);
      setError("");
      setSuccess("");

      const res = await fetch(`/api/school/magazine/${submission.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload.message || "Failed to update writing");
      }

      setSuccess(payload.message || "Writing updated");
      if (payload.article?.id) {
        setSubmissions((currentSubmissions) =>
          currentSubmissions.map((item) =>
            item.id === payload.article.id
              ? {
                  ...item,
                  showOnSchoolWall:
                    payload.article.showOnSchoolWall ?? item.showOnSchoolWall,
                }
              : item
          )
        );
      }
      setSelectedSubmission(null);
    } catch (reviewError) {
      setError(reviewError.message || "Failed to update writing");
    } finally {
      setBusyId("");
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-black text-[#17120a]">School Wall</h2>
        <div className="mt-1 h-0.5 w-24 rounded-full bg-purple-700" />
      </div>

      {error && <AlertBanner type="error" title="School wall failed" message={error} />}
      {success && <AlertBanner type="success" title="School wall updated" message={success} />}

      <div className="rounded-lg border border-[#e1e7f2] bg-white p-3 shadow-sm">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="inline-flex min-h-11 w-full max-w-xs items-center justify-center rounded-lg border border-purple-200 bg-purple-50 px-4 text-xs font-black uppercase text-purple-700">
          Posted by Students
        </div>

        <div className="flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:justify-end">
          <select
            value={effectiveGrade}
            onChange={(event) => updateGrade(event.target.value)}
            className="h-10 rounded-lg border border-[#dbe5f4] bg-white px-3 text-xs font-black text-[#0a2f66] outline-none"
          >
            <option value="ALL">All grades</option>
            {effectiveGradeOptions.map((grade) => (
              <option key={grade} value={grade}>
                {grade}
              </option>
            ))}
          </select>
          <label className="relative block">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[#52657d]" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search title or student..."
              className="h-10 w-full rounded-lg border border-[#dbe5f4] bg-white pl-9 pr-3 text-xs font-bold text-[#0a2f66] outline-none lg:w-80"
            />
          </label>
          <button
            type="button"
            onClick={() => loadSubmissions(1)}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#dbe5f4] bg-white px-4 text-xs font-black text-[#0a2f66] hover:bg-[#f8fbff]"
          >
            <FaFilter />
            Filter
          </button>
        </div>
        </div>
      </div>

      {loading ? (
        <LoadingState
          title="Loading school wall"
          message="Preparing student posts for the school wall."
        />
      ) : submissions.length === 0 ? (
        <EmptyState
          icon={FaBookOpen}
          title="No posted writing in this view"
          description="Student writing will appear here after students post it to school."
        />
      ) : (
        <div className="space-y-3">
          <div className="overflow-x-auto rounded-lg border border-[#e1e7f2] bg-white shadow-sm">
            <div className="grid min-w-[980px] grid-cols-[minmax(240px,1.5fr)_150px_110px_150px_130px_210px] gap-3 border-b border-[#e1e7f2] bg-[#f8fbff] px-4 py-3 text-[11px] font-black uppercase text-[#52657d]">
              <span>Writing</span>
              <span>Student</span>
              <span>Grade</span>
              <span>Type</span>
              <span>Wall</span>
              <span className="text-right">Action</span>
            </div>
            <div>
              {submissions.map((submission) => {
                // Per-post unread: stays marked until the school opens/reads it.
                const isNew = Boolean(submission.isUnread);
                return (
                <div
                  key={submission.id}
                  className={`grid min-w-[980px] grid-cols-[minmax(240px,1.5fr)_150px_110px_150px_130px_210px] gap-3 border-b border-l-4 border-[#eef2f7] px-4 py-4 text-sm last:border-b-0 ${
                    isNew ? "border-l-amber-400 bg-amber-50/40" : "border-l-transparent"
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-black text-[#17120a]">
                        {submission.title}
                      </p>
                      {isNew && (
                        <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-amber-700">
                          New
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-[11px] font-semibold text-[#52657d]">
                      Posted{" "}
                      <AppDate
                        value={submission.submittedAt || submission.updatedAt}
                        mode="dateTime"
                      />
                    </p>
                  </div>
                  <span className="truncate font-bold text-[#17120a]">
                    {submission.authorStudent?.name || "Student"}
                  </span>
                  <span className="font-bold text-[#52657d]">
                    {submission.authorStudent?.grade || "Grade"}
                  </span>
                  <span
                    className={`w-fit rounded-full px-3 py-1 text-[10px] font-black uppercase leading-none ${categoryTone(
                      submission.category
                    )}`}
                  >
                    {getWritingCategoryLabel(submission.category)}
                  </span>
                  <span className="font-bold text-[#52657d]">
                    {submission.showOnSchoolWall ? "Visible" : "Hidden"}
                  </span>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => openSubmission(submission)}
                      className="publishing-desk-primary-button inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#1f4e79] px-4 text-sm font-black text-white transition hover:bg-[#173f63]"
                    >
                      <FaEye />
                      Read
                    </button>
                    <button
                      type="button"
                      disabled={busyId === submission.id}
                      onClick={() =>
                        handleWallAction(
                          submission,
                          submission.showOnSchoolWall
                            ? "HIDE_SCHOOL_WALL"
                            : "SHOW_SCHOOL_WALL"
                        )
                      }
                      className="publishing-desk-primary-button inline-flex min-h-10 items-center justify-center rounded-xl bg-[#1f4e79] px-4 text-sm font-black text-white transition hover:bg-[#173f63] disabled:opacity-60"
                    >
                      {submission.showOnSchoolWall ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>
                );
              })}
            </div>
          </div>

          <PaginationControls
            currentPage={pagination.page || pagination.currentPage || 1}
            totalPages={pagination.totalPages || 1}
            onPageChange={(page) => loadSubmissions(page)}
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
                <div className="flex flex-wrap gap-2">
                  <span className={`inline-flex rounded-full px-3 py-1 text-[10px] font-black uppercase ${categoryTone(selectedSubmission.category)}`}>
                    {getWritingCategoryLabel(selectedSubmission.category)}
                  </span>
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

            <WritingContent
              content={selectedSubmission.content}
              className="mt-5 rounded-lg border border-[#e1e7f2] bg-[#f8fbff] p-5 text-sm font-semibold leading-7 text-[#27364a]"
            />

            <div className="mt-5 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                disabled={busyId === selectedSubmission.id}
                onClick={() =>
                  handleWallAction(
                    selectedSubmission,
                    selectedSubmission.showOnSchoolWall
                      ? "HIDE_SCHOOL_WALL"
                      : "SHOW_SCHOOL_WALL"
                  )
                }
                className="publishing-desk-primary-button inline-flex min-h-10 items-center rounded-xl bg-[#1f4e79] px-4 text-sm font-black text-white transition hover:bg-[#173f63] disabled:opacity-60"
              >
                {selectedSubmission.showOnSchoolWall
                  ? "Hide from School Wall"
                  : "Show on School Wall"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
