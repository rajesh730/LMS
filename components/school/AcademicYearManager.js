"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FiArrowUpCircle,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiSave,
} from "react-icons/fi";
import AlertBanner from "@/components/ui/AlertBanner";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

const SUMMARY_FIELDS = [
  ["admitted", "Admitted"],
  ["promoted", "Promoted"],
  ["retained", "Retained"],
  ["graduated", "Graduated"],
  ["transferredIn", "Transferred in"],
  ["transferredOut", "Transferred out"],
];

function formatDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function AcademicYearManager() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [calendar, setCalendar] = useState("AD");
  const [savingCalendar, setSavingCalendar] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Promotion flow
  const [promoteOpen, setPromoteOpen] = useState(false);
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [retained, setRetained] = useState(() => new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [promoting, setPromoting] = useState(false);
  const [promoteResult, setPromoteResult] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/school/academic-year", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Failed to load academic year");
      setData(json.data);
      setCalendar(json.data?.calendar || "AD");
    } catch (error) {
      setFeedback({ type: "error", title: "Could not load", message: error.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const saveCalendar = async () => {
    try {
      setSavingCalendar(true);
      setFeedback(null);
      const res = await fetch("/api/school/academic-year", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ calendar }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Failed to save");
      setFeedback({
        type: "success",
        title: "Saved",
        message: "Academic calendar updated.",
      });
      await load();
    } catch (error) {
      setFeedback({ type: "error", title: "Save failed", message: error.message });
    } finally {
      setSavingCalendar(false);
    }
  };

  const openPromote = async () => {
    setPromoteResult(null);
    setRetained(new Set());
    setPromoteOpen(true);
    try {
      setPreviewLoading(true);
      const res = await fetch("/api/school/academic-year/promote", {
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Failed to build preview");
      setPreview(json.data);
    } catch (error) {
      setFeedback({ type: "error", title: "Preview failed", message: error.message });
      setPromoteOpen(false);
    } finally {
      setPreviewLoading(false);
    }
  };

  const toggleStudent = (id) => {
    setRetained((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleGradeRetain = (students, retainAll) => {
    setRetained((prev) => {
      const next = new Set(prev);
      students.forEach((s) => {
        if (retainAll) next.add(s.id);
        else next.delete(s.id);
      });
      return next;
    });
  };

  const runPromotion = async () => {
    try {
      setPromoting(true);
      setConfirmOpen(false);
      const res = await fetch("/api/school/academic-year/promote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          confirm: true,
          retainStudentIds: Array.from(retained),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Promotion failed");
      setPromoteResult(json.data);
      setFeedback({ type: "success", title: "Promotion complete", message: json.message });
      await load();
    } catch (error) {
      setFeedback({ type: "error", title: "Promotion failed", message: error.message });
    } finally {
      setPromoting(false);
    }
  };

  const promoteCounts = useMemo(() => {
    if (!preview) return { promote: 0, retain: 0, graduate: 0 };
    let promote = 0;
    let retain = 0;
    let graduate = 0;
    preview.grades.forEach((group) => {
      group.students.forEach((s) => {
        if (retained.has(s.id)) retain += 1;
        else if (group.graduates) graduate += 1;
        else promote += 1;
      });
    });
    return { promote, retain, graduate };
  }, [preview, retained]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
        <div className="pravyo-skeleton h-6 w-48 rounded" />
        <div className="pravyo-skeleton mt-4 h-20 w-full rounded" />
      </div>
    );
  }

  const current = data?.current;

  return (
    <div className="space-y-6">
      {feedback && (
        <AlertBanner
          type={feedback.type}
          title={feedback.title}
          message={feedback.message}
        />
      )}

      {/* Current year + calendar + promote */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
        <h2 className="mb-5 flex items-center gap-2 text-xl font-semibold text-white">
          <FiCalendar className="text-blue-400" />
          Academic Year
        </h2>

        <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Current session
            </p>
            <p className="mt-2 text-2xl font-bold text-white">
              {current?.year || "—"}
            </p>
            <p className="mt-1 text-sm text-slate-400">
              Next will be {data?.upcoming?.year || "—"} after promotion.
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Calendar
            </label>
            <select
              value={calendar}
              onChange={(e) => setCalendar(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-white"
            >
              <option value="AD">AD (e.g. 2025-26)</option>
              <option value="BS">BS (e.g. 2082/83)</option>
            </select>
            <p className="mt-2 text-xs text-slate-500">
              Controls how academic years are displayed for your school.
            </p>
          </div>

          <button
            type="button"
            onClick={saveCalendar}
            disabled={savingCalendar || calendar === data?.calendar}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-700"
          >
            <FiSave />
            {savingCalendar ? "Saving..." : "Save"}
          </button>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
          <div>
            <p className="text-sm font-semibold text-white">Promote to next year</p>
            <p className="mt-1 text-xs text-slate-400">
              Move every grade up one level for {data?.upcoming?.year || "the next year"}.
              You can keep repeating students in their current grade, and the top
              grade graduates.
            </p>
          </div>
          <button
            type="button"
            onClick={openPromote}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 font-semibold text-white transition hover:bg-emerald-500"
          >
            <FiArrowUpCircle />
            Promote year
          </button>
        </div>
      </div>

      {/* History */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
        <h2 className="mb-1 flex items-center gap-2 text-xl font-semibold text-white">
          <FiClock className="text-amber-300" />
          Academic Year History
        </h2>
        <p className="mb-5 text-sm text-slate-400">
          What happened each academic year — admissions, promotions, retentions,
          graduations, and transfers.
        </p>

        {(data?.history || []).length === 0 ? (
          <p className="text-sm text-slate-500">No academic years recorded yet.</p>
        ) : (
          <div className="space-y-3">
            {data.history.map((year) => (
              <div
                key={year._id}
                className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-white">
                      {year.year}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                        year.status === "ACTIVE"
                          ? "bg-emerald-500/15 text-emerald-300"
                          : "bg-slate-700/40 text-slate-300"
                      }`}
                    >
                      {year.status === "ACTIVE" ? <FiCheckCircle /> : null}
                      {year.status === "ACTIVE" ? "Active" : "Closed"}
                    </span>
                  </div>
                  <span className="text-xs text-slate-500">
                    {formatDate(year.startedAt)}
                    {year.closedAt ? ` – ${formatDate(year.closedAt)}` : ""}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {SUMMARY_FIELDS.map(([key, label]) => (
                    <span
                      key={key}
                      className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-300"
                    >
                      <span className="font-bold text-white">
                        {year.summary?.[key] || 0}
                      </span>
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Promotion review modal */}
      {promoteOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[rgba(16,20,47,0.55)] p-4 backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
              <div>
                <h3 className="text-lg font-bold text-white">
                  Promote to {preview?.nextYear?.year || "next year"}
                </h3>
                <p className="mt-0.5 text-xs text-slate-400">
                  Unchecked students stay in their current grade (repeating). The
                  top grade graduates.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPromoteOpen(false)}
                className="rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-300 hover:bg-slate-800"
              >
                Close
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {previewLoading ? (
                <div className="space-y-3">
                  <div className="pravyo-skeleton h-16 w-full rounded" />
                  <div className="pravyo-skeleton h-16 w-full rounded" />
                </div>
              ) : promoteResult ? (
                <div className="space-y-4">
                  <AlertBanner
                    type="success"
                    title="Promotion complete"
                    message={`${promoteResult.summary.promoted} promoted, ${promoteResult.summary.retained} retained, ${promoteResult.summary.graduated} graduated.`}
                  />
                  {promoteResult.failures?.length > 0 && (
                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
                      <p className="text-sm font-semibold text-amber-200">
                        {promoteResult.failures.length} student(s) need attention
                      </p>
                      <ul className="mt-2 space-y-1 text-xs text-amber-100/90">
                        {promoteResult.failures.map((f) => (
                          <li key={f.id}>
                            {f.name} ({f.grade}, roll {f.rollNumber}) — {f.reason}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : preview && preview.totalStudents === 0 ? (
                <p className="text-sm text-slate-400">
                  No active students to promote. Running this will simply open{" "}
                  {preview?.nextYear?.year}.
                </p>
              ) : (
                <div className="space-y-4">
                  {preview?.grades
                    ?.filter((g) => g.count > 0)
                    .map((group) => {
                      const allRetained = group.students.every((s) =>
                        retained.has(s.id)
                      );
                      return (
                        <div
                          key={group.grade}
                          className="rounded-xl border border-slate-800 bg-slate-950/50 p-4"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-bold text-white">
                              {group.grade}{" "}
                              <span className="text-slate-400">→</span>{" "}
                              {group.graduates ? (
                                <span className="text-amber-300">Graduates</span>
                              ) : (
                                group.nextGrade
                              )}
                              <span className="ml-2 text-xs font-normal text-slate-500">
                                {group.count} students
                              </span>
                            </p>
                            <button
                              type="button"
                              onClick={() =>
                                toggleGradeRetain(group.students, !allRetained)
                              }
                              className="text-xs font-semibold text-blue-400 hover:text-blue-300"
                            >
                              {allRetained ? "Promote all" : "Retain all"}
                            </button>
                          </div>
                          <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
                            {group.students.map((s) => {
                              const isRetained = retained.has(s.id);
                              return (
                                <label
                                  key={s.id}
                                  className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-200 hover:bg-slate-800/60"
                                >
                                  <input
                                    type="checkbox"
                                    checked={!isRetained}
                                    onChange={() => toggleStudent(s.id)}
                                    className="rounded border-slate-600 bg-slate-800 text-emerald-600"
                                  />
                                  <span className="truncate">
                                    {s.name}
                                    <span className="ml-1 text-xs text-slate-500">
                                      roll {s.rollNumber}
                                    </span>
                                  </span>
                                  {isRetained && (
                                    <span className="ml-auto rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                                      Repeats
                                    </span>
                                  )}
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            {!promoteResult && !previewLoading && (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 px-5 py-4">
                <p className="text-xs text-slate-400">
                  <span className="font-semibold text-emerald-300">
                    {promoteCounts.promote}
                  </span>{" "}
                  promote ·{" "}
                  <span className="font-semibold text-amber-300">
                    {promoteCounts.retain}
                  </span>{" "}
                  retain ·{" "}
                  <span className="font-semibold text-blue-300">
                    {promoteCounts.graduate}
                  </span>{" "}
                  graduate
                </p>
                <button
                  type="button"
                  onClick={() => setConfirmOpen(true)}
                  disabled={promoting}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 font-semibold text-white transition hover:bg-emerald-500 disabled:bg-slate-700"
                >
                  <FiArrowUpCircle />
                  Run promotion
                </button>
              </div>
            )}

            {promoteResult && (
              <div className="flex justify-end border-t border-slate-800 px-5 py-4">
                <button
                  type="button"
                  onClick={() => setPromoteOpen(false)}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 font-semibold text-white transition hover:bg-blue-500"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title={`Promote to ${preview?.nextYear?.year || "next year"}?`}
        message={`This will advance the academic year and move ${promoteCounts.promote} students up, keep ${promoteCounts.retain} repeating, and graduate ${promoteCounts.graduate}. This cannot be undone.`}
        confirmLabel="Yes, promote"
        tone="warning"
        busy={promoting}
        onClose={() => setConfirmOpen(false)}
        onConfirm={runPromotion}
      />
    </div>
  );
}
