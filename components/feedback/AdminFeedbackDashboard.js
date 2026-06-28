"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FaCheckCircle, FaFilter, FaStar } from "react-icons/fa";
import AlertBanner from "@/components/ui/AlertBanner";
import LoadingState from "@/components/ui/LoadingState";
import AppDate from "@/components/common/AppDate";

export default function AdminFeedbackDashboard() {
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [status, setStatus] = useState("ALL");
  const [role, setRole] = useState("ALL");
  const [error, setError] = useState("");

  const loadFeedback = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const params = new URLSearchParams();
      if (status !== "ALL") params.set("status", status);
      if (role !== "ALL") params.set("role", role);
      const res = await fetch(`/api/feedback?${params.toString()}`, {
        cache: "no-store",
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.message || "Failed to load feedback");
      setFeedback(Array.isArray(payload.feedback) ? payload.feedback : []);
    } catch (loadError) {
      setError(loadError.message || "Failed to load feedback");
    } finally {
      setLoading(false);
    }
  }, [role, status]);

  useEffect(() => {
    void loadFeedback();
  }, [loadFeedback]);

  const counts = useMemo(
    () => ({
      total: feedback.length,
      newCount: feedback.filter((item) => item.status === "NEW").length,
    }),
    [feedback]
  );

  const updateStatus = async (item, nextStatus) => {
    try {
      setBusyId(item.id);
      const res = await fetch(`/api/feedback/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.message || "Failed to update feedback");
      await loadFeedback();
    } catch (updateError) {
      setError(updateError.message || "Failed to update feedback");
    } finally {
      setBusyId("");
    }
  };

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-[#e6eaf7] bg-white p-5 shadow-sm">
        <p className="text-xs font-black uppercase text-[#1f4e79]">
          Platform Feedback
        </p>
        <h1 className="mt-2 text-3xl font-black text-[#17120a]">
          Feedback Inbox
        </h1>
        <p className="mt-2 text-sm leading-6 text-[#52657d]">
          Review feedback submitted by schools and students.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <span className="rounded-lg bg-[#eef4f8] px-4 py-2 text-sm font-black text-[#1f4e79]">
            {counts.total} total
          </span>
          <span className="rounded-lg bg-amber-50 px-4 py-2 text-sm font-black text-amber-800">
            {counts.newCount} new
          </span>
        </div>
      </section>

      {error && <AlertBanner type="error" title="Feedback failed" message={error} />}

      <section className="rounded-2xl border border-[#e6eaf7] bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <label>
            <span className="mb-1.5 flex items-center gap-2 text-xs font-black uppercase text-[#52657d]">
              <FaFilter className="text-[#1f4e79]" />
              Status
            </span>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="min-h-11 w-full rounded-lg border border-[#d7ddea] bg-white px-3 text-sm font-bold text-[#17120a]"
            >
              {["ALL", "NEW", "REVIEWED", "ARCHIVED"].map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-black uppercase text-[#52657d]">
              Sender
            </span>
            <select
              value={role}
              onChange={(event) => setRole(event.target.value)}
              className="min-h-11 w-full rounded-lg border border-[#d7ddea] bg-white px-3 text-sm font-bold text-[#17120a]"
            >
              <option value="ALL">All senders</option>
              <option value="SCHOOL_ADMIN">Schools</option>
              <option value="STUDENT">Students</option>
            </select>
          </label>
          <button
            type="button"
            onClick={() => {
              setStatus("ALL");
              setRole("ALL");
            }}
            className="min-h-11 rounded-lg border border-[#d7ddea] px-4 text-sm font-black text-[#0a2f66]"
          >
            Clear
          </button>
        </div>
      </section>

      {loading ? (
        <LoadingState title="Loading feedback" message="Preparing feedback inbox." />
      ) : feedback.length === 0 ? (
        <section className="rounded-2xl border border-[#e6eaf7] bg-white p-8 text-center text-sm font-semibold text-[#52657d]">
          No feedback in this view.
        </section>
      ) : (
        <div className="space-y-3">
          {feedback.map((item) => (
            <article
              key={item.id}
              className="rounded-2xl border border-[#e6eaf7] bg-white p-5 shadow-sm"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-[#eef4f8] px-3 py-1 text-xs font-black text-[#1f4e79]">
                      {item.submitterRole === "STUDENT" ? "Student" : "School"}
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
                      {item.type}
                    </span>
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-800">
                      {item.status}
                    </span>
                  </div>
                  <h2 className="mt-3 text-xl font-black text-[#17120a]">
                    {item.title}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-[#52657d]">
                    {item.message}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-3 text-xs font-bold text-[#75869b]">
                    <span>{item.submitterName || "Unknown sender"}</span>
                    {item.schoolName && <span>{item.schoolName}</span>}
                    {item.rating && (
                      <span className="inline-flex items-center gap-1">
                        <FaStar className="text-amber-500" />
                        {item.rating}
                      </span>
                    )}
                    <span><AppDate value={item.createdAt} mode="dateTime" /></span>
                  </div>
                </div>
                {item.status === "NEW" && (
                  <button
                    type="button"
                    disabled={busyId === item.id}
                    onClick={() => updateStatus(item, "REVIEWED")}
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[#1f4e79] px-4 text-sm font-black text-white disabled:opacity-60"
                    style={{ color: "#ffffff" }}
                  >
                    <FaCheckCircle style={{ color: "#ffffff" }} />
                    <span style={{ color: "#ffffff" }}>Mark reviewed</span>
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
