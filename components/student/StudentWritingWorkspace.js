"use client";

import { useEffect, useMemo, useState } from "react";
import { FaBookOpen, FaEdit, FaFileAlt, FaLightbulb, FaPaperPlane, FaTrash } from "react-icons/fa";
import EmptyState from "@/components/EmptyState";
import AlertBanner from "@/components/ui/AlertBanner";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import LoadingState from "@/components/ui/LoadingState";
import PageHeader from "@/components/ui/PageHeader";

const CATEGORY_OPTIONS = [
  "ESSAY",
  "POEM",
  "REPORT",
  "OPINION",
  "STORY",
  "OTHER",
];

const STATUS_STYLES = {
  DRAFT: "border border-[#d7cdbb] bg-white text-[#40516b]",
  SUBMITTED: "border border-[#bfd7f7] bg-[#eaf2ff] text-[#0a2f66]",
  APPROVED: "border border-emerald-200 bg-emerald-50 text-emerald-800",
  REJECTED: "border border-red-200 bg-red-50 text-red-700",
};

function formatStatus(status) {
  return String(status || "").charAt(0) + String(status || "").slice(1).toLowerCase();
}

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

function buildEmptyForm() {
  return {
    id: "",
    title: "",
    content: "",
    category: "ESSAY",
    status: "DRAFT",
    challengeId: "",
    challengeTitle: "",
    challengePrompt: "",
  };
}

export default function StudentWritingWorkspace() {
  const [student, setStudent] = useState(null);
  const [writings, setWritings] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [challengesLoading, setChallengesLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState(buildEmptyForm());
  const [readingWriting, setReadingWriting] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const loadWritings = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch("/api/student/writings", { cache: "no-store" });
      const payload = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(payload.message || "Failed to load your writing space");
      }

      setStudent(payload.student || null);
      setWritings(Array.isArray(payload.writings) ? payload.writings : []);
    } catch (loadError) {
      setError(loadError.message || "Failed to load your writing space");
    } finally {
      setLoading(false);
    }
  };

  const loadChallenges = async () => {
    try {
      setChallengesLoading(true);
      const res = await fetch("/api/student/challenges", { cache: "no-store" });
      const payload = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(payload.message || "Failed to load student challenges");
      }

      setChallenges(Array.isArray(payload.challenges) ? payload.challenges : []);
    } catch (loadError) {
      setError(loadError.message || "Failed to load student challenges");
    } finally {
      setChallengesLoading(false);
    }
  };

  useEffect(() => {
    loadWritings();
    loadChallenges();
  }, []);

  const activeEditingLabel = useMemo(() => {
    if (!form.id) return "Create New Writing";
    return form.status === "REJECTED" ? "Revise Writing" : "Edit Draft";
  }, [form.id, form.status]);

  const resetForm = () => {
    setForm(buildEmptyForm());
  };

  const startEdit = (writing) => {
    setReadingWriting(null);
    setSuccess("");
    setError("");
    setForm({
      id: writing.id,
      title: writing.title || "",
      content: writing.content || "",
      category: writing.category || "ESSAY",
      status: writing.status || "DRAFT",
      challengeId: writing.challenge || "",
      challengeTitle: writing.challengeTitle || "",
      challengePrompt: "",
    });
  };

  const startChallengeResponse = (challenge) => {
    setSuccess("");
    setError("");

    if (challenge.response?.id) {
      const existingWriting = writings.find(
        (writing) => writing.id === challenge.response.id
      );
      if (existingWriting) {
        startEdit(existingWriting);
        return;
      }
    }

    setForm({
      ...buildEmptyForm(),
      title: challenge.title,
      category: "ESSAY",
      challengeId: challenge.id,
      challengeTitle: challenge.title,
      challengePrompt: challenge.prompt,
    });
  };

  const handleSave = async (nextStatus = "DRAFT") => {
    try {
      setSaving(true);
      setError("");
      setSuccess("");

      if (form.challengeId) {
        if (nextStatus !== "SUBMITTED") {
          setError("Challenge responses are submitted directly to platform review.");
          return;
        }

        const res = await fetch("/api/student/challenge-submissions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            challengeId: form.challengeId,
            title: form.title,
            content: form.content,
            category: form.category,
          }),
        });

        const payload = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(payload.message || "Failed to submit challenge response");
        }

        setSuccess(payload.message || "Challenge response submitted");
        resetForm();
        await loadChallenges();
        return;
      }

      const url = form.id
        ? `/api/student/writings/${form.id}`
        : "/api/student/writings";
      const method = form.id ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          content: form.content,
          category: form.category,
          status: nextStatus,
          challengeId: form.challengeId,
        }),
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload.message || "Failed to save writing");
      }

      setSuccess(payload.message || "Writing saved");
      resetForm();
      await loadWritings();
      await loadChallenges();
    } catch (saveError) {
      setError(saveError.message || "Failed to save writing");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setError("");
      setSuccess("");
      const res = await fetch(`/api/student/writings/${deleteTarget.id}`, {
        method: "DELETE",
      });
      const payload = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(payload.message || "Failed to delete writing");
      }

      if (form.id === deleteTarget.id) {
        resetForm();
      }
      setDeleteTarget(null);
      setSuccess(payload.message || "Writing deleted");
      await loadWritings();
    } catch (deleteError) {
      setError(deleteError.message || "Failed to delete writing");
      setDeleteTarget(null);
    }
  };

  const handleCreateRevision = async (writingId) => {
    try {
      setError("");
      setSuccess("");
      const res = await fetch(`/api/student/writings/${writingId}`, {
        method: "POST",
      });
      const payload = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(payload.message || "Failed to create revision draft");
      }

      setSuccess(payload.message || "Revision draft created");
      setReadingWriting(null);
      resetForm();
      await loadWritings();
    } catch (revisionError) {
      setError(revisionError.message || "Failed to create revision draft");
    }
  };

  return (
    <div className="space-y-6 text-[#27344a]">
      <PageHeader
        icon={FaEdit}
        eyebrow="Student Writing"
        title="My Writing"
        description="Write freely for your school magazine or respond to active platform challenges."
        meta={
          student ? (
            <p className="text-sm text-[#52657d]">
              {student.name} - {student.grade} - Roll {student.rollNumber}
            </p>
          ) : null
        }
      />

      {error && <AlertBanner type="error" title="Action needed" message={error} />}
      {success && <AlertBanner type="success" message={success} />}

      <section className="rounded-lg border border-[#d7cdbb] bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center gap-3">
          <FaLightbulb className="text-[#0a2f66]" />
          <div>
            <h2 className="text-xl font-bold text-[#17120a]">Student Challenges</h2>
            <p className="mt-1 text-sm text-[#52657d]">
              Respond to active platform topics. Selected responses can appear
              on Pratyo Pulse with student and school recognition.
            </p>
          </div>
        </div>

        {challengesLoading ? (
          <LoadingState
            title="Loading challenges"
            message="Preparing active platform writing topics."
            className="mt-5"
          />
        ) : challenges.length === 0 ? (
          <div className="mt-5">
            <EmptyState
              icon={FaLightbulb}
              title="No active challenges"
              description="Platform writing topics will appear here when super admin publishes a new challenge."
            />
          </div>
        ) : (
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {challenges.map((challenge) => (
              <article
                key={challenge.id}
                className="rounded-lg border border-[#d7cdbb] bg-[#f8fbff] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-[#17120a]">
                      {challenge.title}
                    </h3>
                    {challenge.deadline && (
                      <p className="mt-1 text-xs text-[#52657d]">
                        Deadline {formatDate(challenge.deadline)}
                      </p>
                    )}
                  </div>
                  {challenge.response && (
                    <span className="rounded-full border border-[#bfd7f7] bg-[#eaf2ff] px-3 py-1 text-xs font-semibold text-[#0a2f66]">
                      {formatStatus(challenge.response.status)}
                    </span>
                  )}
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[#52657d]">
                  {challenge.prompt}
                </p>
                <button
                  type="button"
                  disabled={Boolean(challenge.response)}
                  onClick={() => startChallengeResponse(challenge)}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#0a2f66] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#123f82] disabled:bg-[#eaf2ff] disabled:text-[#52657d]"
                >
                  <FaEdit />
                  {challenge.response ? "Submitted" : "Respond now"}
                </button>
              </article>
            ))}
          </div>
        )}
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
        <section className="rounded-lg border border-[#d7cdbb] bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-[#17120a]">
                {activeEditingLabel}
              </h2>
              <p className="mt-2 text-sm text-[#52657d]">
                {student
                  ? `${student.name} - ${student.grade} - Roll ${student.rollNumber}`
                  : "Your writing will be reviewed by your school before it appears in the magazine."}
              </p>
            </div>
            {form.id && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg border border-[#d7cdbb] bg-white px-3 py-2 text-sm font-semibold text-[#0a2f66] transition hover:bg-[#eaf2ff]"
              >
                New draft
              </button>
            )}
          </div>

          <div className="mt-6 space-y-4">
            {form.challengeId && (
              <div className="rounded-lg border border-[#bfd7f7] bg-[#eaf2ff] p-4 text-sm text-[#0a2f66]">
                <p className="font-semibold">
                  Challenge response: {form.challengeTitle}
                </p>
                {form.challengePrompt && (
                  <p className="mt-2 whitespace-pre-wrap text-[#40516b]">
                    {form.challengePrompt}
                  </p>
                )}
              </div>
            )}

            <input
              type="text"
              placeholder="Article title"
              value={form.title}
              onChange={(event) =>
                setForm((current) => ({ ...current, title: event.target.value }))
              }
              className="w-full rounded-lg border border-[#d7cdbb] bg-white px-4 py-3 text-[#17120a] outline-none transition focus:border-[#2f7fdb]"
            />

            {!form.challengeId && (
              <div className="grid gap-4 md:grid-cols-[220px_1fr]">
                <select
                  value={form.category}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      category: event.target.value,
                    }))
                  }
                  className="rounded-lg border border-[#d7cdbb] bg-white px-4 py-3 text-[#17120a] outline-none transition focus:border-[#2f7fdb]"
                >
                  {CATEGORY_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option.charAt(0) + option.slice(1).toLowerCase()}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <textarea
              placeholder="Write your article here..."
              value={form.content}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  content: event.target.value,
                }))
              }
              className="min-h-[320px] w-full rounded-lg border border-[#d7cdbb] bg-white px-4 py-3 text-[#17120a] outline-none transition focus:border-[#2f7fdb]"
            />

            <div className="flex flex-wrap gap-3">
              {!form.challengeId && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleSave("DRAFT")}
                  className="inline-flex items-center gap-2 rounded-lg border border-[#d7cdbb] bg-white px-5 py-3 text-sm font-semibold text-[#0a2f66] transition hover:bg-[#eaf2ff] disabled:opacity-60"
                >
                  <FaEdit />
                  {saving ? "Saving..." : form.id ? "Update draft" : "Save as draft"}
                </button>
              )}
              <button
                type="button"
                disabled={saving}
                onClick={() => handleSave("SUBMITTED")}
                className="inline-flex items-center gap-2 rounded-lg bg-[#0a2f66] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#123f82] disabled:opacity-60"
              >
                <FaPaperPlane />
                {saving
                  ? "Submitting..."
                  : form.challengeId
                  ? "Submit response"
                  : "Submit for review"}
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-[#d7cdbb] bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-3">
            <FaFileAlt className="text-[#0a2f66]" />
            <h2 className="text-xl font-bold text-[#17120a]">My Submissions</h2>
          </div>
          <p className="mt-2 text-sm text-[#52657d]">
            Drafts stay private. Submitted writings go to your school for review.
          </p>

          {loading ? (
            <LoadingState
              title="Loading your writings"
              message="Preparing your drafts, submissions, and approved writing."
              className="mt-6"
            />
          ) : writings.length === 0 ? (
            <div className="mt-6">
              <EmptyState
                icon={FaFileAlt}
                title="No writing yet"
                description="Start your first draft or respond to a platform challenge when one is available."
              />
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {writings.map((writing) => {
                const canEdit = ["DRAFT", "REJECTED", "SUBMITTED"].includes(
                  writing.status
                );
                const canDelete = ["DRAFT", "REJECTED"].includes(writing.status);
                const canRevise = writing.status === "APPROVED";

                return (
                  <article
                    key={writing.id}
                    className="rounded-lg border border-[#d7cdbb] bg-[#f8fbff] p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                            STATUS_STYLES[writing.status] || STATUS_STYLES.DRAFT
                          }`}
                        >
                          {formatStatus(writing.status)}
                        </div>
                        <h3 className="mt-3 text-base font-bold text-[#17120a]">
                          {writing.title}
                        </h3>
                        <p className="mt-1 text-xs font-semibold text-[#52657d]">
                          {writing.category}
                        </p>
                        {writing.submissionSource === "PLATFORM_CHALLENGE" && (
                          <p className="mt-2 text-xs font-semibold text-[#0a2f66]">
                            Challenge: {writing.challengeTitle || "Student Challenge"}
                          </p>
                        )}
                      </div>
                    </div>

                    {writing.reviewNote && (
                      <div className="mt-3 rounded-lg border border-[#bfd7f7] bg-[#eaf2ff] p-3 text-sm text-[#40516b]">
                        <span className="font-semibold">School note:</span>{" "}
                        {writing.reviewNote}
                      </div>
                    )}

                    <div className="mt-4 text-xs text-[#52657d]">
                      Updated {formatDate(writing.updatedAt)}
                      {writing.submittedAt && ` - Submitted ${formatDate(writing.submittedAt)}`}
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setReadingWriting(writing)}
                        className="inline-flex items-center gap-2 rounded-lg border border-[#d7cdbb] bg-white px-3 py-2 text-sm font-semibold text-[#0a2f66] transition hover:bg-[#eaf2ff]"
                      >
                        <FaBookOpen />
                        Read
                      </button>
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => startEdit(writing)}
                          className="inline-flex items-center gap-2 rounded-lg border border-[#d7cdbb] bg-white px-3 py-2 text-sm font-semibold text-[#0a2f66] transition hover:bg-[#eaf2ff]"
                        >
                          <FaEdit />
                          {writing.status === "REJECTED"
                            ? "Revise"
                            : writing.status === "SUBMITTED"
                            ? "Edit & Resubmit"
                            : "Edit"}
                        </button>
                      )}
                      {canRevise && (
                        <button
                        type="button"
                        onClick={() => handleCreateRevision(writing.id)}
                        className="inline-flex items-center gap-2 rounded-lg border border-[#bfd7f7] bg-[#eaf2ff] px-3 py-2 text-sm font-semibold text-[#0a2f66] transition hover:bg-[#dbeafe]"
                      >
                          <FaEdit />
                          Revise as Draft
                        </button>
                      )}
                      {canDelete && (
                        <button
                        type="button"
                        onClick={() => setDeleteTarget(writing)}
                        className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100"
                      >
                          <FaTrash />
                          Delete
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {readingWriting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-slate-700 bg-slate-950 p-6 shadow-2xl">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <span
                  className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                    STATUS_STYLES[readingWriting.status] || STATUS_STYLES.DRAFT
                  }`}
                >
                  {formatStatus(readingWriting.status)}
                </span>
                <h2 className="mt-4 text-3xl font-bold text-white">
                  {readingWriting.title}
                </h2>
                <p className="mt-2 text-sm uppercase tracking-wide text-slate-500">
                  {readingWriting.category}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReadingWriting(null)}
                className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-800"
              >
                Close
              </button>
            </div>

            <article className="mt-6 whitespace-pre-wrap rounded-xl border border-slate-800 bg-slate-900/70 p-6 text-base leading-8 text-slate-100">
              {readingWriting.content}
            </article>

            <div className="mt-5 flex flex-wrap gap-3">
              {["DRAFT", "REJECTED", "SUBMITTED"].includes(
                readingWriting.status
              ) && (
                <button
                  type="button"
                  onClick={() => startEdit(readingWriting)}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500"
                >
                  <FaEdit />
                  Edit
                </button>
              )}
              {readingWriting.status === "APPROVED" && (
                <button
                  type="button"
                  onClick={() => handleCreateRevision(readingWriting.id)}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-500/10 px-4 py-2 text-sm font-semibold text-blue-200 transition hover:bg-blue-500/20"
                >
                  <FaEdit />
                  Revise as Draft
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete this writing?"
        message={
          deleteTarget
            ? `"${deleteTarget.title}" will be removed from your writing list.`
            : ""
        }
        confirmLabel="Delete writing"
        tone="danger"
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
