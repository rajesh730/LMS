"use client";

export function getNotificationTypeLabel(noticeType, { detailed = false } = {}) {
  if (noticeType === "EVENT") return detailed ? "Event Notice" : "Event";
  if (noticeType === "MAGAZINE") return detailed ? "Magazine Notice" : "Magazine";
  if (noticeType === "ACHIEVEMENT") return detailed ? "Achievement" : "Achievement";
  if (noticeType === "GENERAL") return detailed ? "Platform Notice" : "Platform";
  return detailed ? "School Notice" : "School";
}

export function NotificationTypeBadge({ noticeType, detailed = false }) {
  return (
    <span
      className="inline-flex rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-red-700"
    >
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
