"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  FaCalendarAlt,
  FaExternalLinkAlt,
  FaPlus,
  FaSpinner,
  FaTrash,
} from "react-icons/fa";

const emptyAsset = { type: "LINK", label: "", url: "" };

const defaultForm = {
  eventId: "",
  title: "",
  description: "",
  submissionType: "SOLO",
  status: "SUBMITTED",
  assets: [emptyAsset],
};

export default function StudentTalentSubmissionManager() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [events, setEvents] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [formData, setFormData] = useState(defaultForm);

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/student/submissions", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to load submissions");
      }

      setSubmissions(data.data.submissions || []);
      setEvents(data.data.eligibleEvents || []);
      setPendingRequests(data.data.pendingRequests || []);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setFormData(defaultForm);
  };

  const updateAsset = (index, key, value) => {
    setFormData((prev) => {
      const assets = [...prev.assets];
      assets[index] = { ...assets[index], [key]: value };
      return { ...prev, assets };
    });
  };

  const addAsset = () => {
    setFormData((prev) => ({ ...prev, assets: [...prev.assets, emptyAsset] }));
  };

  const removeAsset = (index) => {
    setFormData((prev) => {
      const assets = [...prev.assets];
      assets.splice(index, 1);
      return { ...prev, assets: assets.length ? assets : [emptyAsset] };
    });
  };

  const startEdit = (submission) => {
    setEditingId(submission._id);
    setFormData({
      eventId:
        typeof submission.event === "string"
          ? submission.event
          : submission.event?._id || "",
      title: submission.title || "",
      description: submission.description || "",
      submissionType: submission.submissionType || "SOLO",
      status: submission.status || "SUBMITTED",
      assets:
        submission.assets?.length > 0
          ? submission.assets.map((asset) => ({
              type: asset.type || "LINK",
              label: asset.label || "",
              url: asset.url || "",
            }))
          : [emptyAsset],
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const res = await fetch(
        editingId ? `/api/student/submissions/${editingId}` : "/api/student/submissions",
        {
          method: editingId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to save submission");
      }
      resetForm();
      await loadData();
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (submissionId) => {
    if (!confirm("Delete this submission?")) return;
    setError("");
    try {
      const res = await fetch(`/api/student/submissions/${submissionId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to delete submission");
      }
      if (editingId === submissionId) resetForm();
      await loadData();
    } catch (deleteError) {
      setError(deleteError.message);
    }
  };

  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-8 text-slate-300 flex items-center gap-3">
        <FaSpinner className="animate-spin" />
        Loading submissions...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white">
              {editingId ? "Edit Submission" : "Create Submission"}
            </h2>
            <p className="text-slate-400 mt-1">
              Submit portfolio links or performance entries to events where your
              participation has already been approved.
            </p>
          </div>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-xl bg-slate-800 hover:bg-slate-700 px-4 py-2 text-slate-200"
            >
              Cancel Edit
            </button>
          )}
        </div>

        {pendingRequests.length > 0 && (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            Waiting for approval:{" "}
            {pendingRequests
              .map((request) => request.event?.title)
              .filter(Boolean)
              .join(", ")}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <div>
              <label className="block text-sm text-slate-300 mb-1">Event</label>
              <select
                value={formData.eventId}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, eventId: e.target.value }))
                }
                className="w-full rounded-xl bg-slate-800 text-white p-3 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              >
                <option value="">Select an event</option>
                {events.map((event) => (
                  <option key={event._id} value={event._id}>
                    {event.title} • {event.eventType}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-slate-300 mb-1">Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, title: e.target.value }))
                }
                className="w-full rounded-xl bg-slate-800 text-white p-3 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-1">Type</label>
              <select
                value={formData.submissionType}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    submissionType: e.target.value,
                  }))
                }
                className="w-full rounded-xl bg-slate-800 text-white p-3 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {["SOLO", "TEAM", "SCHOOL_SHOWCASE"].map((type) => (
                  <option key={type} value={type}>
                    {type.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, status: e.target.value }))
                }
                className="w-full rounded-xl bg-slate-800 text-white p-3 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="DRAFT">Draft</option>
                <option value="SUBMITTED">Submitted</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm text-slate-300 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, description: e.target.value }))
              }
              className="w-full rounded-xl bg-slate-800 text-white p-3 h-24 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="Explain your piece, performance, idea, or preparation."
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm text-slate-300">Assets / links</label>
              <button
                type="button"
                onClick={addAsset}
                className="text-sm text-emerald-400 hover:text-emerald-300"
              >
                <FaPlus className="inline mr-2" />
                Add asset
              </button>
            </div>
            <div className="space-y-3">
              {formData.assets.map((asset, index) => (
                <div
                  key={`${index}-${asset.url}`}
                  className="grid md:grid-cols-[140px_1fr_1fr_auto] gap-3 rounded-2xl border border-slate-800 bg-slate-950/70 p-4"
                >
                  <select
                    value={asset.type}
                    onChange={(e) => updateAsset(index, "type", e.target.value)}
                    className="rounded-xl bg-slate-800 text-white p-3 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {["LINK", "VIDEO", "AUDIO", "IMAGE", "DOCUMENT"].map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={asset.label}
                    onChange={(e) => updateAsset(index, "label", e.target.value)}
                    className="rounded-xl bg-slate-800 text-white p-3 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Label"
                  />
                  <input
                    type="url"
                    value={asset.url}
                    onChange={(e) => updateAsset(index, "url", e.target.value)}
                    className="rounded-xl bg-slate-800 text-white p-3 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="https://..."
                  />
                  <button
                    type="button"
                    onClick={() => removeAsset(index)}
                    className="rounded-xl bg-slate-800 hover:bg-slate-700 px-4 text-slate-200"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-red-300">{error}</p>}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-3 font-medium disabled:opacity-60"
            >
              {saving
                ? "Saving..."
                : editingId
                ? "Update Submission"
                : "Create Submission"}
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
        <h3 className="text-xl font-bold text-white mb-4">My Submissions</h3>
        {submissions.length === 0 ? (
          <p className="text-slate-500">
            {events.length === 0
              ? "No approved event registrations for submissions yet."
              : "No submissions yet."}
          </p>
        ) : (
          <div className="space-y-4">
            {submissions.map((submission) => (
              <div
                key={submission._id}
                className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5"
              >
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <h4 className="text-lg font-semibold text-white">
                        {submission.title}
                      </h4>
                      <span className="px-3 py-1 rounded-full text-xs border border-slate-700 text-slate-300">
                        {submission.status}
                      </span>
                    </div>
                    <p className="text-slate-400 mt-2">
                      {submission.event?.title || "Event unavailable"}
                    </p>
                    {submission.description && (
                      <p className="text-sm text-slate-300 mt-3">
                        {submission.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 mt-4 text-sm text-slate-400 flex-wrap">
                      <span className="inline-flex items-center gap-2">
                        <FaCalendarAlt />
                        {submission.event?.date
                          ? new Date(submission.event.date).toLocaleDateString()
                          : "No event date"}
                      </span>
                      {submission.resultPlacement && (
                        <span className="inline-flex items-center gap-2 text-amber-300">
                          <FaExternalLinkAlt className="text-xs" />
                          Result: {submission.resultPlacement.replaceAll("_", " ")}
                        </span>
                      )}
                      {submission.totalScore > 0 && (
                        <span className="text-emerald-300">
                          Score: {submission.totalScore}
                          {submission.scorePercentage > 0
                            ? ` (${submission.scorePercentage}%)`
                            : ""}
                        </span>
                      )}
                    </div>
                    {submission.resultNote && (
                      <p className="text-sm text-slate-300 mt-3">
                        Result note: {submission.resultNote}
                      </p>
                    )}
                    {submission.scorecard?.length > 0 && (
                      <div className="mt-4 grid gap-2 md:grid-cols-2">
                        {submission.scorecard.map((entry) => (
                          <div
                            key={`${submission._id}-${entry.label}`}
                            className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-sm"
                          >
                            <p className="text-slate-200 font-medium">{entry.label}</p>
                            <p className="text-emerald-300 mt-1">
                              {entry.score} / {entry.maxScore}
                            </p>
                            {entry.comment && (
                              <p className="text-xs text-slate-400 mt-2">
                                {entry.comment}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-3 flex-wrap">
                    {submission.event?._id && (
                      <Link
                        href={`/events/${submission.event._id}`}
                        className="rounded-xl bg-slate-800 hover:bg-slate-700 px-4 py-2 text-slate-200 inline-flex items-center gap-2"
                      >
                        View Event
                        <FaExternalLinkAlt />
                      </Link>
                    )}
                    {submission.certificateUrl && (
                      <a
                        href={submission.certificateUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-xl bg-emerald-600/15 hover:bg-emerald-600/25 px-4 py-2 text-emerald-300 inline-flex items-center gap-2"
                      >
                        Certificate
                        <FaExternalLinkAlt />
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => startEdit(submission)}
                      disabled={submission.status === "PUBLISHED"}
                      className="rounded-xl bg-blue-600/15 hover:bg-blue-600/25 px-4 py-2 text-blue-300"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(submission._id)}
                      disabled={submission.status === "PUBLISHED"}
                      className="rounded-xl bg-red-600/15 hover:bg-red-600/25 px-4 py-2 text-red-300 inline-flex items-center gap-2"
                    >
                      <FaTrash />
                      Delete
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
