"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FaTimes, FaQrcode, FaExclamationTriangle } from "react-icons/fa";

/**
 * Generate Parent Access Cards for a whole grade, a selection, or the school.
 *
 * The destructive detail this dialog exists to make unmissable: **issuing a new
 * card invalidates the guardian's previous one.** For a family that has not
 * connected yet that is harmless. For a family already using the app it would
 * break their PIN with no warning — so already-connected guardians are excluded
 * by default and re-including them takes a deliberate, separately-worded tick.
 */
export default function BulkCardsDialog({
  grades,
  selectedStudentIds,
  onClose,
}) {
  const router = useRouter();

  const [grade, setGrade] = useState("");
  const [includeActivated, setIncludeActivated] = useState(false);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  const usingSelection = selectedStudentIds?.length > 0;

  const loadPreview = useCallback(async () => {
    if (usingSelection) {
      // A selection is already explicit; the count is what the user ticked.
      setPreview(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const url = new URL(
        "/api/school/guardians/cards",
        window.location.origin
      );
      if (grade) url.searchParams.set("grade", grade);

      const res = await fetch(url.toString(), { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Could not preview");
      setPreview(json.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [grade, usingSelection]);

  useEffect(() => {
    loadPreview();
  }, [loadPreview]);

  const generate = async () => {
    setGenerating(true);
    setError("");
    try {
      const res = await fetch("/api/school/guardians/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(usingSelection
            ? { studentIds: selectedStudentIds }
            : grade
              ? { grade }
              : { scope: "ALL" }),
          includeActivated,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Could not generate cards");

      if (!json.data.cards?.length) {
        throw new Error(
          "No cards to print for this selection. Everyone here is already connected."
        );
      }

      // Hand the batch to the print page in memory. PINs must not travel in a
      // URL, and the print page must not be able to re-issue on refresh.
      window.sessionStorage.setItem(
        "pravyo.cardBatch",
        JSON.stringify(json.data)
      );
      window.open("/school/guardians/cards", "_blank", "noopener");
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const willPrint = usingSelection
    ? selectedStudentIds.length
    : includeActivated
      ? preview?.total
      : preview?.needCard;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Print parent access cards"
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4"
    >
      <div className="mt-10 w-full max-w-lg rounded-2xl bg-white shadow-xl">
        <header className="flex items-center gap-3 border-b border-[#e6eaf7] px-5 py-4">
          <FaQrcode className="text-purple-700" />
          <h2 className="flex-1 text-lg font-black text-[#17120a]">
            Print Parent Access Cards
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-10 w-10 items-center justify-center rounded-full text-[#75869b] hover:bg-slate-100"
          >
            <FaTimes />
          </button>
        </header>

        <div className="px-5 py-5">
          <p className="text-sm leading-relaxed text-[#52657d]">
            Each card carries a QR code, a Parent ID and a PIN. Print them, cut
            them up, and hand one to each guardian. They scan it to connect —
            no email address or phone number needed.
          </p>

          {usingSelection ? (
            <p className="mt-4 rounded-xl bg-purple-50 px-4 py-3 text-sm font-bold text-purple-900">
              {selectedStudentIds.length} selected student
              {selectedStudentIds.length === 1 ? "" : "s"}
            </p>
          ) : (
            <div className="mt-4">
              <label
                htmlFor="card-grade"
                className="block text-sm font-black text-[#24314d]"
              >
                Which class?
              </label>
              <select
                id="card-grade"
                value={grade}
                onChange={(event) => setGrade(event.target.value)}
                className="mt-1.5 h-12 w-full rounded-xl border border-[#dbe5f4] bg-white px-4 text-sm font-black text-[#24314d]"
              >
                <option value="">All students</option>
                {grades.map((g) => (
                  <option key={g._id} value={g.originalValue || g._id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {loading ? (
            <div className="mt-5 h-24 animate-pulse rounded-xl bg-slate-100" />
          ) : preview ? (
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-2xl font-black text-emerald-800">
                  {preview.needCard}
                </p>
                <p className="text-xs font-bold text-emerald-800">
                  need a card
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-2xl font-black text-slate-700">
                  {preview.alreadyActivated}
                </p>
                <p className="text-xs font-bold text-slate-700">
                  already connected
                </p>
              </div>
            </div>
          ) : null}

          {/* The destructive option, worded so it cannot be ticked absently. */}
          {(preview?.alreadyActivated > 0 || usingSelection) && (
            <label className="mt-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
              <input
                type="checkbox"
                checked={includeActivated}
                onChange={(event) => setIncludeActivated(event.target.checked)}
                className="mt-0.5 h-5 w-5"
              />
              <span className="text-xs leading-relaxed text-amber-900">
                <strong className="block">
                  Also reprint for guardians who are already connected
                </strong>
                This gives them a new PIN and{" "}
                <strong>their current one will stop working</strong>. Only use
                this if their card was lost.
              </span>
            </label>
          )}

          {error ? (
            <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
            </p>
          ) : null}

          <p className="mt-4 flex items-start gap-2 rounded-xl bg-sky-50 px-4 py-3 text-xs text-sky-900">
            <FaExclamationTriangle className="mt-0.5 shrink-0" />
            <span>
              PINs are shown once and never stored in a readable form. Print the
              sheet before closing the tab.
            </span>
          </p>

          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-11 rounded-xl px-4 text-sm font-black text-[#52657d]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={generate}
              disabled={generating || loading || willPrint === 0}
              className="min-h-11 rounded-xl bg-purple-700 px-5 text-sm font-black text-white disabled:opacity-40"
            >
              {generating
                ? "Generating…"
                : `Generate ${willPrint ?? 0} card${willPrint === 1 ? "" : "s"}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
