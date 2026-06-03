"use client";

import { useEffect, useState } from "react";
import { FaPaperPlane, FaStar } from "react-icons/fa";
import AlertBanner from "@/components/ui/AlertBanner";
import LoadingState from "@/components/ui/LoadingState";

const TYPE_OPTIONS = [
  ["GENERAL", "General"],
  ["BUG", "Problem / Bug"],
  ["SUGGESTION", "Suggestion"],
  ["EXPERIENCE", "Experience"],
];

const initialForm = {
  type: "GENERAL",
  rating: "",
  title: "",
  message: "",
};

function formatDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function FeedbackForm({ audience = "school" }) {
  const [form, setForm] = useState(initialForm);
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadFeedback = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/feedback", { cache: "no-store" });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.message || "Failed to load feedback");
      setFeedback(Array.isArray(payload.feedback) ? payload.feedback : []);
    } catch (loadError) {
      setError(loadError.message || "Failed to load feedback");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadFeedback();
  }, []);

  const update = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const submit = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          rating: form.rating ? Number(form.rating) : null,
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.message || "Failed to submit feedback");

      setSuccess(payload.message || "Feedback submitted");
      setForm(initialForm);
      await loadFeedback();
    } catch (submitError) {
      setError(submitError.message || "Failed to submit feedback");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      {error && <AlertBanner type="error" title="Feedback failed" message={error} />}
      {success && (
        <AlertBanner type="success" title="Feedback sent" message={success} />
      )}

      <form
        onSubmit={submit}
        className="rounded-2xl border border-[#e6eaf7] bg-white p-5 shadow-sm"
      >
        <div className="mb-5">
          <p className="text-xs font-black uppercase text-[#4326e8]">
            Feedback
          </p>
          <h2 className="mt-2 text-2xl font-black text-[#17120a]">
            Help improve Pratyo
          </h2>
          <p className="mt-2 text-sm leading-6 text-[#52657d]">
            Share what is working, what is confusing, or what should be improved
            for {audience === "student" ? "students" : "schools"}.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-[1fr_180px]">
          <label className="block">
            <span className="mb-2 block text-xs font-black uppercase text-[#52657d]">
              Feedback type
            </span>
            <select
              value={form.type}
              onChange={(event) => update("type", event.target.value)}
              className="min-h-11 w-full rounded-lg border border-[#d7ddea] bg-white px-3 text-sm font-bold text-[#17120a] outline-none focus:border-[#4326e8] focus:ring-4 focus:ring-[#4326e8]/10"
            >
              {TYPE_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-black uppercase text-[#52657d]">
              Rating
            </span>
            <select
              value={form.rating}
              onChange={(event) => update("rating", event.target.value)}
              className="min-h-11 w-full rounded-lg border border-[#d7ddea] bg-white px-3 text-sm font-bold text-[#17120a] outline-none focus:border-[#4326e8] focus:ring-4 focus:ring-[#4326e8]/10"
            >
              <option value="">No rating</option>
              {[5, 4, 3, 2, 1].map((rating) => (
                <option key={rating} value={rating}>
                  {rating} star{rating > 1 ? "s" : ""}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="mt-4 block">
          <span className="mb-2 block text-xs font-black uppercase text-[#52657d]">
            Title
          </span>
          <input
            value={form.title}
            onChange={(event) => update("title", event.target.value)}
            placeholder="Short feedback title"
            className="min-h-11 w-full rounded-lg border border-[#d7ddea] bg-white px-3 text-sm font-semibold text-[#17120a] outline-none placeholder:text-[#8a9ab1] focus:border-[#4326e8] focus:ring-4 focus:ring-[#4326e8]/10"
          />
        </label>

        <label className="mt-4 block">
          <span className="mb-2 block text-xs font-black uppercase text-[#52657d]">
            Message
          </span>
          <textarea
            value={form.message}
            onChange={(event) => update("message", event.target.value)}
            placeholder="Write your feedback..."
            className="min-h-36 w-full rounded-lg border border-[#d7ddea] bg-white px-3 py-3 text-sm font-semibold text-[#17120a] outline-none placeholder:text-[#8a9ab1] focus:border-[#4326e8] focus:ring-4 focus:ring-[#4326e8]/10"
          />
        </label>

        <div className="mt-5 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#4326e8] px-5 text-sm font-black text-white shadow-lg shadow-[#4326e8]/15 transition hover:bg-[#3217d3] disabled:opacity-60"
            style={{ color: "#ffffff" }}
          >
            <FaPaperPlane style={{ color: "#ffffff" }} />
            <span style={{ color: "#ffffff" }}>
              {saving ? "Sending..." : "Send feedback"}
            </span>
          </button>
        </div>
      </form>

      <section className="rounded-2xl border border-[#e6eaf7] bg-white p-5 shadow-sm">
        <h2 className="text-lg font-black text-[#17120a]">My Feedback</h2>
        {loading ? (
          <LoadingState
            title="Loading feedback"
            message="Preparing your previous feedback."
          />
        ) : feedback.length === 0 ? (
          <p className="mt-3 text-sm font-semibold text-[#52657d]">
            No feedback sent yet.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {feedback.map((item) => (
              <article
                key={item.id}
                className="rounded-xl border border-[#edf0f7] bg-[#f8f9fd] p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-black text-[#17120a]">{item.title}</h3>
                  <span className="rounded-full bg-[#f0edff] px-3 py-1 text-xs font-black text-[#4326e8]">
                    {item.status}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-[#52657d]">
                  {item.message}
                </p>
                <div className="mt-3 flex flex-wrap gap-3 text-xs font-bold text-[#75869b]">
                  <span>{item.type}</span>
                  {item.rating && (
                    <span className="inline-flex items-center gap-1">
                      <FaStar className="text-amber-500" />
                      {item.rating}
                    </span>
                  )}
                  <span>{formatDate(item.createdAt)}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
