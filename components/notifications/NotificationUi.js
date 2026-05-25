"use client";

export function getNotificationTypeLabel(noticeType, { detailed = false } = {}) {
  if (noticeType === "EVENT") return detailed ? "Event Notice" : "Event";
  if (noticeType === "GENERAL") return detailed ? "Platform Notice" : "Platform";
  return detailed ? "School Notice" : "School";
}

export function NotificationTypeBadge({ noticeType, detailed = false }) {
  const isEvent = noticeType === "EVENT";

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${
        isEvent
          ? "border border-[#bdefff] bg-[#e8fbff] text-[#07576b]"
          : "border border-[#bfd7f7] bg-[#eaf2ff] text-[#0a2f66]"
      }`}
    >
      {getNotificationTypeLabel(noticeType, { detailed })}
    </span>
  );
}

export function NotificationNewBadge({ isRead }) {
  if (isRead) return null;

  return (
    <span className="inline-flex rounded-full bg-[#0a2f66] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white">
      New
    </span>
  );
}

export function NotificationReadToggleButton({
  notification,
  onToggle,
  className = "",
  size = "sm",
}) {
  const sizeClasses =
    size === "xs"
      ? "px-2.5 py-1 text-[11px]"
      : "px-3 py-2 text-sm";

  return (
    <button
      type="button"
      onClick={() => onToggle(notification)}
      className={`inline-flex items-center rounded-lg border border-[#bfd7f7] bg-white font-semibold text-[#0a2f66] transition hover:bg-[#eaf2ff] ${sizeClasses} ${className}`}
    >
      {notification.isRead ? "Mark unread" : "Mark read"}
    </button>
  );
}

export function NotificationBulkActions({
  onMarkAllUnread,
  onMarkAllRead,
  compact = false,
  className = "",
}) {
  const buttonClass = compact
    ? "rounded-lg border border-[#bfd7f7] px-2.5 py-1 text-[11px] font-semibold text-[#0a2f66] transition hover:bg-[#eaf2ff]"
    : "inline-flex items-center gap-2 rounded-lg border border-[#bfd7f7] bg-white px-4 py-2 text-sm font-semibold text-[#0a2f66] transition hover:bg-[#eaf2ff]";

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      <button type="button" onClick={onMarkAllUnread} className={buttonClass}>
        Mark all unread
      </button>
      <button type="button" onClick={onMarkAllRead} className={buttonClass}>
        Mark all read
      </button>
    </div>
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
