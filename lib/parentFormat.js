/**
 * Date and label formatting for the Parent App.
 *
 * Kept deliberately plain. Parents read dates under time pressure — "Closes
 * today" is understood instantly, "2026-08-15T18:30:00Z" is not — so relative
 * wording is used for the near past and near future, and an explicit date
 * beyond that.
 *
 * Nepali (BS) dates are supported through the existing lib/nepaliDate helpers
 * rather than a second implementation; see formatParentDate's `calendar` arg.
 */

import { formatDate as formatNepaliDate } from "@/lib/nepaliDate";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function startOfDay(value) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

/**
 * Human date for a card or list row.
 *
 * @param {Date|string} value
 * @param {object} options
 * @param {"AD"|"BS"} options.calendar  Falls back to AD when not supplied.
 * @param {boolean} options.relative    Use "Today"/"Yesterday" wording.
 */
export function formatParentDate(value, options = {}) {
  if (!value) return "";

  const { calendar = "AD", relative = true } = options;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  if (relative) {
    const dayDelta = Math.round(
      (startOfDay(date) - startOfDay(new Date())) / MS_PER_DAY
    );
    if (dayDelta === 0) return "Today";
    if (dayDelta === -1) return "Yesterday";
    if (dayDelta === 1) return "Tomorrow";
    // Inside a week either way, a weekday name is easier to place than a date.
    if (dayDelta > 1 && dayDelta < 7) {
      return date.toLocaleDateString("en-US", { weekday: "long" });
    }
  }

  if (calendar === "BS") {
    // Reuse the platform's existing BS conversion — never re-derive it.
    const nepali = formatNepaliDate(date, "BS");
    if (nepali) return nepali;
  }

  return date.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year:
      date.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
  });
}

/** Short clock time for chat bubbles. */
export function formatParentTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * "2 minutes ago" style stamp for message lists.
 * Falls through to a date once something is more than a week old, because
 * "63 days ago" is harder to reason about than "12 Jun".
 */
export function formatRelativeShort(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;

  return date.toLocaleDateString("en-US", { day: "numeric", month: "short" });
}

/** Bytes → "1.2 MB", for document attachments. */
export function formatFileSize(bytes) {
  const size = Number(bytes) || 0;
  if (size <= 0) return "";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(0)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

/** Seconds → "0:42", for voice messages. */
export function formatDuration(seconds) {
  const total = Math.max(0, Math.round(Number(seconds) || 0));
  const minutes = Math.floor(total / 60);
  return `${minutes}:${String(total % 60).padStart(2, "0")}`;
}
