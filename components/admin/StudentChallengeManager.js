"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FaEdit,
  FaFeatherAlt,
  FaPaperPlane,
  FaPlus,
  FaSave,
  FaTrash,
} from "react-icons/fa";
import PageHeader from "@/components/ui/PageHeader";
import AlertBanner from "@/components/ui/AlertBanner";
import LoadingState from "@/components/ui/LoadingState";
import EmptyState from "@/components/EmptyState";

const STATUS_STYLES = {
  DRAFT: "bg-slate-700 text-slate-100",
  PUBLISHED: "bg-emerald-500/15 text-emerald-200",
  CLOSED: "bg-amber-500/15 text-amber-200",
};

const emptyForm = {
  id: "",
  title: "",
  prompt: "",
  deadline: "",
  targetGrades: "",
  status: "DRAFT",
};

function formatDate(value) {
  if (!value) return "No deadline";
  return new Date(value).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toDateInputValue(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function parseGrades(value) {
  return String(value || "")
    .split(",")
    .map((grade) => grade.trim())
    .filter(Boolean);
}

export default function StudentChallengeManager() {
  const [challenges, setChallenges] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [submissionFilter, setSubmissionFilter] = useState("SUBMITTED");
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [reviewNote, setReviewNote] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [submissionsLoading, setSubmissionsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const formTitle = useMemo(
    () => (form.id ? "Edit Student Challenge" : "Create Student Challenge"),
    [form.id]
  );

  const loadChallenges = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch("/api/admin/challenges", { cache: "no-store" });
      const payload = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(payload.message || "Failed to load challenges");
      }

      setChallenges(Array.isArray(payload.challenges) ? payload.challenges : []);
    } catch (loadError) {
      setError(loadError.message || "Failed to load challenges");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChallenges();
  }, []);

  const loadSubmissions = useCallback(async (nextFilter = submissionFilter) => {
    try {
      setSubmissionsLoading(true);
      setError("");
      const res = await fetch(
        `/api/admin/challenges/submissions?status=${nextFilter}`,
        { cache: "no-store" }
      );
      const payload = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(payload.message || "Failed to load submissions");
      }

      const nextSubmissions = Array.isArray(payload.submissions)
        ? payload.submissions
        : [];
      setSubmissions(nextSubmissions);
      setSelectedSubmission((current) => {
        if (!current) return nextSubmissions[0] || null;
        return (
          nextSubmissions.find((submission) => submission.id === current.id) ||
          nextSubmissions[0] ||
          null
        );
      });
    } catch (loadError) {
      setError(loadError.message || "Failed to load submissions");
    } finally {
      setSubmissionsLoading(false);
    }
  }, [submissionFilter]);

  useEffect(() => {
    loadSubmissions(submissionFilter);
  }, [loadSubmissions, submissionFilter]);

  const resetForm = () => {
    setForm(emptyForm);
  };

  const startEdit = (challenge) => {
    setError("");
    setSuccess("");
    setForm({
      id: challenge.id,
      title: challenge.title || "",
      prompt: challenge.prompt || "",
      deadline: toDateInputValue(challenge.deadline),
      targetGrades: (challenge.targetGrades || []).join(", "),
      status: challenge.status || "DRAFT",
    });
  };

  const saveChallenge = async (nextStatus = form.status) => {
    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const url = form.id
        ? `/api/admin/challenges/${form.id}`
        : "/api/admin/challenges";
      const method = form.id ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          prompt: form.prompt,
          deadline: form.deadline || null,
          targetGrades: parseGrades(form.targetGrades),
          status: nextStatus,
        }),
      });

      const payload = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(payload.message || "Failed to save challenge");
      }

      setSuccess(payload.message || "Challenge saved");
      resetForm();
      await loadChallenges();
    } catch (saveError) {
      setError(saveError.message || "Failed to save challenge");
    } finally {
      setSaving(false);
    }
  };

  const deleteChallenge = async (challengeId) => {
    if (!confirm("Delete this student challenge?")) return;

    try {
      setBusyId(challengeId);
      setError("");
      setSuccess("");
      const res = await fetch(`/api/admin/challenges/${challengeId}`, {
        method: "DELETE",
      });
      const payload = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(payload.message || "Failed to delete challenge");
      }

      setSuccess(payload.message || "Challenge deleted");
      if (form.id === challengeId) resetForm();
      await loadChallenges();
    } catch (deleteError) {
      setError(deleteError.message || "Failed to delete challenge");
    } finally {
      setBusyId("");
    }
  };

  const openSubmission = (submission) => {
    setSelectedSubmission(submission);
    setReviewNote(submission.reviewNote || "");
  };

  const reviewSubmission = async (action) => {
    if (!selectedSubmission) return;

    try {
      setBusyId(selectedSubmission.id);
      setError("");
      setSuccess("");

      const res = await fetch(
        `/api/admin/challenges/submissions/${selectedSubmission.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, reviewNote }),
        }
      );
      const payload = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(payload.message || "Failed to update submission");
      }

      setSuccess(payload.message || "Submission updated");
      setReviewNote("");
      await loadSubmissions(submissionFilter);
    } catch (reviewError) {
      setError(reviewError.message || "Failed to update submission");
    } finally {
      setBusyId("");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={FaFeatherAlt}
        eyebrow="Platform writing program"
        title="Student Challenges"
        description="Create simple research or writing prompts, let students submit responses, then publish selected answers publicly with student and school credit."
      />

      {error && (
        <AlertBanner type="error" title="Challenge action failed" message={error} />
      )}
      {success && (
        <AlertBanner type="success" title="Challenge updated" message={success} />
      )}

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <h3 className="text-xl font-bold text-white">{formTitle}</h3>
            {form.id && (
              <button
                type="button"
                onClick={resetForm}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-100 transition hover:bg-slate-700"
              >
                <FaPlus /> New
              </button>
            )}
          </div>

          <div className="space-y-4">
            <input
              type="text"
              placeholder="Topic title"
              value={form.title}
              onChange={(event) =>
                setForm((current) => ({ ...current, title: event.target.value }))
              }
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none transition focus:border-blue-500"
            />

            <textarea
              placeholder="Topic or research instruction"
              value={form.prompt}
              onChange={(event) =>
                setForm((current) => ({ ...current, prompt: event.target.value }))
              }
              className="min-h-[180px] w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none transition focus:border-blue-500"
            />

            <input
              type="date"
              value={form.deadline}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  deadline: event.target.value,
                }))
              }
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none transition focus:border-blue-500"
            />

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                disabled={saving}
                onClick={() => saveChallenge("DRAFT")}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-600 disabled:opacity-60"
              >
                <FaSave />
                {saving ? "Saving..." : "Save Draft"}
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => saveChallenge("PUBLISHED")}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-60"
              >
                <FaPaperPlane />
                {saving ? "Publishing..." : "Publish"}
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <h3 className="text-xl font-bold text-white">
            All Challenges ({challenges.length})
          </h3>

          {loading ? (
            <LoadingState
              title="Loading challenges"
              message="Preparing platform writing challenges."
              className="mt-5"
            />
          ) : challenges.length === 0 ? (
            <div className="mt-5">
              <EmptyState
                icon={FaFeatherAlt}
                title="No student challenges yet"
                description="Create a challenge when you want students to respond to a platform topic."
              />
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              {challenges.map((challenge) => (
                <article
                  key={challenge.id}
                  className="rounded-xl border border-slate-800 bg-slate-950/70 p-5"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                          STATUS_STYLES[challenge.status] || STATUS_STYLES.DRAFT
                        }`}
                      >
                        {challenge.status}
                      </span>
                      <h4 className="mt-3 text-lg font-bold text-white">
                        {challenge.title}
                      </h4>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-300">
                        {challenge.prompt}
                      </p>
                      <p className="mt-3 text-xs text-slate-500">
                        Deadline: {formatDate(challenge.deadline)}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(challenge)}
                        className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-100 transition hover:bg-slate-700"
                      >
                        <FaEdit /> Edit
                      </button>
                      <button
                        type="button"
                        disabled={busyId === challenge.id}
                        onClick={() => deleteChallenge(challenge.id)}
                        className="inline-flex items-center gap-2 rounded-lg bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-200 transition hover:bg-red-500/20 disabled:opacity-60"
                      >
                        <FaTrash /> Delete
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-xl font-bold text-white">
              Challenge Submissions
            </h3>
            <p className="mt-1 text-sm text-slate-400">
              Review responses from all schools and publish selected answers for
              the public showcase.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {["SUBMITTED", "SELECTED", "REJECTED", "ALL"].map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setSubmissionFilter(status)}
                className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                  submissionFilter === status
                    ? "bg-blue-600 text-white"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
              >
                {status === "ALL" ? "All" : status}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
            {submissionsLoading ? (
              <LoadingState
                title="Loading submissions"
                message="Preparing student challenge responses for review."
              />
            ) : submissions.length === 0 ? (
              <EmptyState
                icon={FaFeatherAlt}
                title="No challenge submissions found"
                description="Student responses will appear here after they submit platform challenge work."
              />
            ) : (
              <div className="space-y-3">
                {submissions.map((submission) => (
                  <button
                    key={submission.id}
                    type="button"
                    onClick={() => openSubmission(submission)}
                    className={`w-full rounded-lg border p-4 text-left transition ${
                      selectedSubmission?.id === submission.id
                        ? "border-blue-500/40 bg-blue-500/10"
                        : "border-slate-800 bg-slate-900/60 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="font-bold text-white">
                          {submission.title}
                        </h4>
                        <p className="mt-1 text-xs font-semibold text-amber-200">
                          {submission.challenge?.title || "Student Challenge"}
                        </p>
                        <p className="mt-2 text-sm text-slate-400">
                          {submission.student?.name || "Student"} -{" "}
                          {submission.school?.name || "School"}
                        </p>
                      </div>
                      <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-200">
                        {submission.status}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-5">
            {!selectedSubmission ? (
              <div className="text-sm text-slate-400">
                Select a submission to review it.
              </div>
            ) : (
              <div className="space-y-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {selectedSubmission.category}
                  </p>
                  <h4 className="mt-2 text-2xl font-bold text-white">
                    {selectedSubmission.title}
                  </h4>
                  <p className="mt-2 text-sm text-slate-400">
                    {selectedSubmission.student?.name || "Student"} -{" "}
                    {selectedSubmission.student?.grade || "Grade"} -{" "}
                    {selectedSubmission.school?.name || "School"}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-amber-200">
                    Challenge:{" "}
                    {selectedSubmission.challenge?.title || "Student Challenge"}
                  </p>
                </div>

                <article className="whitespace-pre-wrap rounded-xl border border-slate-800 bg-slate-900/70 p-5 text-sm leading-7 text-slate-200">
                  {selectedSubmission.content}
                </article>

                <textarea
                  value={reviewNote}
                  onChange={(event) => setReviewNote(event.target.value)}
                  placeholder="Optional platform review note"
                  className="min-h-[110px] w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none transition focus:border-blue-500"
                />

                {selectedSubmission.status === "SUBMITTED" ? (
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      disabled={busyId === selectedSubmission.id}
                      onClick={() => reviewSubmission("SELECT_PUBLISH")}
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-60"
                    >
                      <FaPaperPlane />
                      Select & Publish Publicly
                    </button>
                    <button
                      type="button"
                      disabled={busyId === selectedSubmission.id}
                      onClick={() => reviewSubmission("REJECT")}
                      className="inline-flex items-center gap-2 rounded-xl bg-red-500/10 px-5 py-3 text-sm font-semibold text-red-200 transition hover:bg-red-500/20 disabled:opacity-60"
                    >
                      <FaTrash />
                      Reject
                    </button>
                  </div>
                ) : (
                  <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-4 text-sm text-slate-400">
                    This submission has already been reviewed.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

