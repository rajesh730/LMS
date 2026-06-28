"use client";

import {
  FaBookOpen,
  FaBullhorn,
  FaCalendarAlt,
  FaExchangeAlt,
  FaSchool,
  FaTrophy,
} from "react-icons/fa";

// Per-type visual identity (icon + colored avatar) so each category is instantly
// scannable, the way Instagram/Facebook colour-code notification kinds.
export const NOTIFICATION_TYPES = {
  ACHIEVEMENT: {
    label: "Achievement",
    Icon: FaTrophy,
    circle: "bg-amber-100 text-amber-700",
  },
  MAGAZINE: {
    label: "Magazine",
    Icon: FaBookOpen,
    circle: "bg-indigo-100 text-indigo-700",
  },
  TRANSFER: {
    label: "Transfer",
    Icon: FaExchangeAlt,
    circle: "bg-purple-100 text-purple-700",
  },
  EVENT: {
    label: "Event",
    Icon: FaCalendarAlt,
    circle: "bg-sky-100 text-sky-700",
  },
  GENERAL: {
    label: "Platform",
    Icon: FaBullhorn,
    circle: "bg-slate-100 text-slate-600",
  },
  SCHOOL: {
    label: "School",
    Icon: FaSchool,
    circle: "bg-emerald-100 text-emerald-700",
  },
};

export function getNotificationType(noticeType) {
  return NOTIFICATION_TYPES[noticeType] || NOTIFICATION_TYPES.SCHOOL;
}

// Compact relative time ("now", "5m", "3h", "2d", "1w") falling back to a date.
export function formatRelativeTime(value) {
  if (!value) return "";
  const then = new Date(value).getTime();
  if (!Number.isFinite(then)) return "";

  const diffMs = Date.now() - then;
  const sec = Math.max(0, Math.floor(diffMs / 1000));
  if (sec < 45) return "now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d`;
  const wk = Math.floor(day / 7);
  if (wk < 5) return `${wk}w`;
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// Buckets the feed into Today / This Week / Earlier sections (FB-style).
export function groupNotificationsByTime(notifications = []) {
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  ).getTime();
  const weekAgo = startOfToday - 6 * 24 * 60 * 60 * 1000;

  const today = [];
  const week = [];
  const earlier = [];

  for (const item of notifications) {
    const t = new Date(item.publishedAt || 0).getTime();
    if (t >= startOfToday) today.push(item);
    else if (t >= weekAgo) week.push(item);
    else earlier.push(item);
  }

  return [
    { key: "today", label: "Today", items: today },
    { key: "week", label: "This Week", items: week },
    { key: "earlier", label: "Earlier", items: earlier },
  ].filter((group) => group.items.length > 0);
}

// ── Legacy exports (still used by the full notices pages) ─────────────────────

export function getNotificationTypeLabel(noticeType, { detailed = false } = {}) {
  if (noticeType === "EVENT") return detailed ? "Event Notice" : "Event";
  if (noticeType === "MAGAZINE") return detailed ? "Magazine Notice" : "Magazine";
  if (noticeType === "ACHIEVEMENT") return detailed ? "Achievement" : "Achievement";
  if (noticeType === "TRANSFER") return detailed ? "Transfer Notice" : "Transfer";
  if (noticeType === "GENERAL") return detailed ? "Platform Notice" : "Platform";
  return detailed ? "School Notice" : "School";
}

export function NotificationTypeBadge({ noticeType, detailed = false }) {
  return (
    <span className="inline-flex rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-red-700">
      {getNotificationTypeLabel(noticeType, { detailed })}
    </span>
  );
}

export function NotificationNewBadge({ isRead }) {
  if (isRead) return null;
  return (
    <span className="inline-flex rounded-full bg-red-500 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white">
      New
    </span>
  );
}

export function NotificationMeta({ date, eventTitle, className = "" }) {
  return (
    <div className={`flex flex-wrap items-center gap-3 text-xs text-[#52657d] ${className}`}>
      {date && <span>{date}</span>}
      {eventTitle && <span>{eventTitle}</span>}
    </div>
  );
}
