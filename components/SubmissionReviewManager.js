"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FaCheckCircle,
  FaClipboardCheck,
  FaExternalLinkAlt,
  FaSpinner,
  FaTimesCircle,
} from "react-icons/fa";

const STATUS_OPTIONS = [
  "ALL",
  "SUBMITTED",
  "SHORTLISTED",
  "REJECTED",
  "PUBLISHED",
];

function formatLabel(value) {
  return String(value || "").replaceAll("_", " ");
}

export default function SubmissionReviewManager({
  title = "Submission Review",
  description = "Review entries, control publishing, and prepare final event results.",
  compact = false,
}) {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({
    status: "ALL",
  });

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.status !== "ALL") params.set("status", filters.status);
    const text = params.toString();
    return text ? `?${text}` : "";
  }, [filters]);

  const loadSubmissions = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/school/submissions${queryString}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to load submissions");
      }
      setSubmissions(data.data || []);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, [queryString]);

  useEffect(() => {
    loadSubmissions();
  }, [loadSubmissions]);

  const updateSubmission = async (submission, changes) => {
    setSavingId(submission._id);
    setError("");

    try {
      const res = await fetch(`/api/school/submissions/${submission._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: changes.status ?? submission.status,
          reviewNotes: changes.reviewNotes ?? submission.reviewNotes ?? "",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to update submission");
      }
      setSubmissions((prev) =>
        prev.map((item) => (item._id === submission._id ? { ...item, ...data.data } : item))
      );
    } catch (updateError) {
      setError(updateError.message);
    } finally {
      setSavingId("");
    }
  };

  const saveNotes = (submission) =>
    updateSubmission(submission, {
      status: submission.status,
      reviewNotes: submission.reviewNotes ?? "",
    });

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
        <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
          <div>
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <FaClipboardCheck className="text-amber-400" />
              {title}
            </h2>
            <p className="text-sm text-slate-400 mt-1">{description}</p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <select
              value={filters.status}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, status: e.target.value }))
              }
              className="bg-slate-800 text-white rounded p-2 text-sm"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {formatLabel(option)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && <p className="text-sm text-red-300 mb-4">{error}</p>}

        {loading ? (
          <div className="text-slate-400 flex items-center gap-2">
            <FaSpinner className="animate-spin" />
            Loading submissions...
          </div>
        ) : submissions.length === 0 ? (
          <p className="text-slate-500 italic">
            No submissions match the current filters.
          </p>
        ) : (
          <div className="space-y-4">
            {submissions.map((submission) => (
              <div
                key={submission._id}
                className="rounded-xl border border-slate-800 bg-slate-950/70 p-4"
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <h3 className="text-white font-semibold">{submission.title}</h3>
                    <p className="text-sm text-slate-400 mt-1">
                      {submission.student?.name || "School showcase entry"}
                      {submission.student?.grade
                        ? ` • ${submission.student.grade}`
                        : ""}
                    </p>
                    <p className="text-sm text-slate-500 mt-1">
                      {submission.event?.title || "Event"}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <span className="px-2 py-1 rounded-full text-xs bg-blue-500/15 text-blue-300 border border-blue-500/30">
                      {formatLabel(submission.status)}
                    </span>
                  </div>
                </div>

                {submission.description && (
                  <p className="text-sm text-slate-400 mt-3">{submission.description}</p>
                )}

                {(submission.assets || []).length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      Submission Assets
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {submission.assets.map((asset, index) => (
                        <a
                          key={`${asset.url}-${index}`}
                          href={asset.url}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-2 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 text-sm inline-flex items-center gap-2"
                        >
                          {asset.label || asset.type || "Asset"}
                          <FaExternalLinkAlt className="text-xs" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                <div className={`grid gap-4 mt-4 ${compact ? "lg:grid-cols-1" : "lg:grid-cols-[1fr_auto]"}`}>
                  <div>
                    <label className="block text-sm text-slate-300 mb-1">
                      Review Notes
                    </label>
                    <textarea
                      value={submission.reviewNotes || ""}
                      onChange={(e) =>
                        setSubmissions((prev) =>
                          prev.map((item) =>
                            item._id === submission._id
                              ? { ...item, reviewNotes: e.target.value }
                              : item
                          )
                        )
                      }
                      className="w-full bg-slate-800 text-white rounded p-2 h-24"
                      placeholder="Add guidance, approval notes, or reasons for changes."
                    />
                    {(submission.reviewedByName || submission.reviewedAt) && (
                      <p className="text-xs text-slate-500 mt-2">
                        Last reviewed by {submission.reviewedByName || "team"}{" "}
                        {submission.reviewedByRole
                          ? `(${formatLabel(submission.reviewedByRole)})`
                          : ""}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 min-w-48">
                    <button
                      type="button"
                      disabled={savingId === submission._id}
                      onClick={() => saveNotes(submission)}
                      className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm disabled:opacity-60"
                    >
                      Save Notes
                    </button>
                    <button
                      type="button"
                      disabled={savingId === submission._id}
                      onClick={() =>
                        updateSubmission(submission, {
                          status: "SHORTLISTED",
                        })
                      }
                      className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm disabled:opacity-60"
                    >
                      <FaCheckCircle className="inline mr-2" />
                      Shortlist
                    </button>
                    <button
                      type="button"
                      disabled={savingId === submission._id}
                      onClick={() =>
                        updateSubmission(submission, {
                          status: "PUBLISHED",
                        })
                      }
                      className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm disabled:opacity-60"
                    >
                      Publish
                    </button>
                    <button
                      type="button"
                      disabled={savingId === submission._id}
                      onClick={() =>
                        updateSubmission(submission, {
                          status: "REJECTED",
                        })
                      }
                      className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm disabled:opacity-60"
                    >
                      <FaTimesCircle className="inline mr-2" />
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
