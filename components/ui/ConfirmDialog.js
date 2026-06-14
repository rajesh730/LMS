"use client";

import { useEffect } from "react";
import { FaExclamationTriangle, FaInfoCircle, FaTimes } from "react-icons/fa";
import Button from "@/components/ui/Button";

const TONE = {
  danger: {
    icon: "text-red-600 bg-red-50",
    confirmVariant: "danger",
  },
  warning: {
    icon: "text-amber-700 bg-amber-50",
    confirmVariant: "primary",
  },
  info: {
    icon: "text-[var(--brand-primary)] bg-[var(--brand-primary-soft)]",
    confirmVariant: "primary",
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
    <div className="pravyo-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title">
      <div className="pravyo-modal-panel" >
        <div className="flex items-start gap-4">
          <div className={`rounded-xl p-3 ${styles.icon}`}>
            <Icon />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <h2 id="confirm-dialog-title" className="pravyo-heading text-lg">
                {title}
              </h2>
              <button
                type="button"
                disabled={busy}
                onClick={onClose}
                className="rounded-lg p-2 text-[var(--brand-muted)] transition hover:bg-[var(--brand-primary-soft)] hover:text-[var(--brand-ink)] disabled:opacity-50"
                aria-label="Close confirmation"
              >
                <FaTimes />
              </button>
            </div>
            {message && (
              <p className="mt-3 text-sm leading-6 text-[var(--brand-muted)]">{message}</p>
            )}
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:justify-end sm:gap-3">
          <Button variant="secondary" disabled={busy} onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button
            variant={styles.confirmVariant}
            disabled={busy}
            onClick={onConfirm}
            className={busy ? "opacity-70" : ""}
          >
            {busy ? "Working..." : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
