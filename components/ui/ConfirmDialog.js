"use client";

import { useEffect } from "react";
import { FaExclamationTriangle, FaInfoCircle, FaTimes } from "react-icons/fa";

const TONE = {
  danger: {
    icon: "text-rose-300 bg-rose-500/15",
    confirm: "bg-rose-600 hover:bg-rose-500 text-white",
  },
  warning: {
    icon: "text-amber-200 bg-amber-500/15",
    confirm: "bg-amber-500 hover:bg-amber-400 text-slate-950",
  },
  info: {
    icon: "text-sky-200 bg-sky-500/15",
    confirm: "bg-blue-600 hover:bg-blue-500 text-white",
  },
};

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "danger",
  busy = false,
  onConfirm,
  onClose,
}) {
  const styles = TONE[tone] || TONE.danger;
  const Icon = tone === "info" ? FaInfoCircle : FaExclamationTriangle;

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape" && !busy) onClose?.();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [busy, onClose, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl shadow-slate-950/60">
        <div className="flex items-start gap-4">
          <div className={`rounded-2xl p-3 ${styles.icon}`}>
            <Icon />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-xl font-black text-white">{title}</h2>
              <button
                type="button"
                disabled={busy}
                onClick={onClose}
                className="rounded-full p-2 text-slate-500 transition hover:bg-slate-800 hover:text-white disabled:opacity-50"
                aria-label="Close confirmation"
              >
                <FaTimes />
              </button>
            </div>
            {message && (
              <p className="mt-3 text-sm leading-6 text-slate-300">{message}</p>
            )}
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="rounded-xl border border-slate-700 px-4 py-3 text-sm font-bold text-slate-200 transition hover:bg-slate-800 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className={`rounded-xl px-4 py-3 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${styles.confirm}`}
          >
            {busy ? "Working..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
