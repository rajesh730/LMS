"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  FaBell,
  FaBookOpen,
  FaCheckCircle,
  FaClipboardList,
  FaDesktop,
  FaEnvelope,
  FaEye,
  FaFilter,
  FaBullhorn,
  FaSyncAlt,
} from "react-icons/fa";
import EmptyState from "@/components/EmptyState";
import LoadingState from "@/components/ui/LoadingState";
import useNotificationInbox from "@/lib/useNotificationInbox";

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

function isToday(value) {
  if (!value) return false;
  const date = new Date(value);
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

const TYPE_CONFIG = {
  ALL: {
    label: "All Notices",
    icon: FaClipboardList,
    tone: "purple",
    description: "All categories",
  },
  GENERAL: {
    label: "Platform",
    badge: "Platform",
    icon: FaDesktop,
    tone: "blue",
    description: "New updates",
  },
  EVENT: {
    label: "Event",
    badge: "Event",
    icon: FaBullhorn,
    tone: "rose",
    description: "Competitions & rounds",
  },
  MAGAZINE: {
    label: "Magazine",
    badge: "Magazine",
    icon: FaBookOpen,
    tone: "amber",
    description: "Submissions & reviews",
  },
};

const TONE_CLASSES = {
  purple: {
    card: "border-purple-100 bg-purple-50 text-purple-700",
    row: "border-l-purple-400",
    icon: "bg-purple-50 text-purple-700",
    badge: "bg-purple-50 text-purple-700",
  },
  blue: {
    card: "border-blue-100 bg-blue-50 text-[#0a2f66]",
    row: "border-l-blue-400",
    icon: "bg-blue-50 text-[#0a2f66]",
    badge: "bg-blue-50 text-[#0a2f66]",
  },
  rose: {
    card: "border-rose-100 bg-rose-50 text-rose-700",
    row: "border-l-rose-400",
    icon: "bg-rose-50 text-rose-700",
    badge: "bg-rose-50 text-rose-700",
  },
  amber: {
    card: "border-amber-100 bg-amber-50 text-amber-700",
    row: "border-l-amber-400",
    icon: "bg-amber-50 text-amber-700",
    badge: "bg-amber-50 text-amber-700",
  },
  emerald: {
    card: "border-emerald-100 bg-emerald-50 text-emerald-700",
    row: "border-l-emerald-400",
    icon: "bg-emerald-50 text-emerald-700",
    badge: "bg-emerald-50 text-emerald-700",
  },
};

function getTypeConfig(type) {
  return TYPE_CONFIG[type] || TYPE_CONFIG.GENERAL;
}

function NoticeMetric({ icon: Icon, value, label, note, tone }) {
  return (
    <div className="rounded-2xl border border-[#e6eaf7] bg-white p-5 shadow-sm">
      <div className="flex items-center gap-4">
        <span
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${
            TONE_CLASSES[tone]?.card || TONE_CLASSES.purple.card
          }`}
        >
          <Icon />
        </span>
        <span className="min-w-0">
          <strong className="block text-2xl font-black text-[#17120a]">
            {value}
          </strong>
          <span className="block truncate text-sm font-black text-[#24314d]">
            {label}
          </span>
          <span className="mt-1 block text-xs font-bold text-[#52657d]">
            {note}
          </span>
        </span>
      </div>
    </div>
  );
}

function NoticeRow({ notification }) {
  const config = getTypeConfig(notification.noticeType);
  const tone = TONE_CLASSES[config.tone] || TONE_CLASSES.purple;
  const Icon = config.icon;

  return (
    <article
      className={`rounded-xl border border-[#e1e7f2] border-l-4 bg-white p-4 shadow-sm transition hover:border-purple-200 hover:bg-[#f8fbff] ${tone.row}`}
    >
      <div className="grid gap-4 lg:grid-cols-[1fr_120px_48px] lg:items-center">
        <Link href={notification.href || "#"} className="min-w-0">
          <div className="flex items-start gap-4">
            <span
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${tone.icon}`}
            >
              <Icon />
            </span>
            <span className="min-w-0">
              <span
                className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-black uppercase ${tone.badge}`}
              >
                {config.badge || config.label}
              </span>
              <h3 className="mt-2 line-clamp-1 text-base font-black text-[#17120a]">
                {notification.title}
              </h3>
              <p className="mt-1 line-clamp-2 text-sm text-[#52657d]">
                {notification.message}
              </p>
              <span className="mt-3 flex flex-wrap items-center gap-3 text-xs font-bold text-[#75869b]">
                <span>
                  {notification.noticeType === "EVENT"
                    ? "Event Team"
                    : notification.noticeType === "MAGAZINE"
                      ? "Magazine Desk"
                      : "Super Admin"}
                </span>
                <span>{formatDate(notification.publishedAt)}</span>
                {notification.event?.title && <span>{notification.event.title}</span>}
              </span>
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-2 lg:justify-center">
          <span
            className={`h-2 w-2 rounded-full ${
              notification.isRead ? "bg-[#6f7f95]" : "bg-red-500"
            }`}
          />
          <span
            className={`text-xs font-black ${
              notification.isRead ? "text-[#52657d]" : "text-red-600"
            }`}
          >
            {notification.isRead ? "Read" : "Unread"}
          </span>
        </div>

        <div className="flex items-center justify-end gap-2">
          <Link
            href={notification.href || "#"}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#dbe5f4] bg-white text-[#0a2f66] transition hover:bg-[#f8fbff]"
            title="View notice"
          >
            <FaEye />
          </Link>
        </div>
      </div>
    </article>
  );
}

export default function SchoolNoticeBoard() {
  const [activeType, setActiveType] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const {
    loading,
    error,
    notifications,
    loadNotifications,
  } = useNotificationInbox({
    listUrl: "/api/school/notifications",
    readUrl: "/api/school/notifications/read",
    limit: 100,
    realtimeChannel: "school-notifications",
    markVisibleOnLoad: true,
  });

  const counts = useMemo(
    () => ({
      all: notifications.length,
      platform: notifications.filter((item) => item.noticeType === "GENERAL").length,
      event: notifications.filter((item) => item.noticeType === "EVENT").length,
      magazine: notifications.filter((item) => item.noticeType === "MAGAZINE").length,
      unread: notifications.filter((item) => !item.isRead).length,
    }),
    [notifications]
  );

  const filteredNotifications = useMemo(
    () =>
      notifications.filter((notification) => {
        const matchesType =
          activeType === "ALL" || notification.noticeType === activeType;
        const matchesStatus =
          statusFilter === "ALL" ||
          (statusFilter === "UNREAD" && !notification.isRead) ||
          (statusFilter === "READ" && notification.isRead);
        return matchesType && matchesStatus;
      }),
    [activeType, notifications, statusFilter]
  );

  const todayNotices = filteredNotifications.filter((item) =>
    isToday(item.publishedAt)
  );
  const earlierNotices = filteredNotifications.filter(
    (item) => !isToday(item.publishedAt)
  );

  const tabs = [
    ["ALL", "All Notices", FaClipboardList],
    ["GENERAL", "Platform", FaDesktop],
    ["EVENT", "Event", FaBullhorn],
    ["MAGAZINE", "Magazine", FaBookOpen],
  ];

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-[#e1e7f2] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-purple-50 text-xl text-purple-700">
              <FaBell />
            </span>
            <div>
              <h2 className="text-3xl font-black text-[#17120a]">
                Received Notices
              </h2>
              <p className="mt-2 max-w-2xl text-base text-[#52657d]">
                View platform updates, event notices, and magazine alerts sent to
                your school dashboard.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void loadNotifications()}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-purple-700 px-4 text-sm font-black text-white shadow-sm transition hover:bg-purple-800"
            >
              <FaSyncAlt />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <NoticeMetric
          icon={FaEnvelope}
          value={counts.all}
          label="Total Notices"
          note="All categories"
          tone="purple"
        />
        <NoticeMetric
          icon={FaDesktop}
          value={counts.platform}
          label="Platform Notices"
          note="New updates"
          tone="blue"
        />
        <NoticeMetric
          icon={FaBullhorn}
          value={counts.event}
          label="Event Notices"
          note="Competitions & rounds"
          tone="rose"
        />
        <NoticeMetric
          icon={FaBookOpen}
          value={counts.magazine}
          label="Magazine Notices"
          note="Submissions & reviews"
          tone="amber"
        />
        <NoticeMetric
          icon={FaCheckCircle}
          value={counts.unread}
          label="Unread"
          note="Requires your attention"
          tone="emerald"
        />
      </div>

      <section className="overflow-hidden rounded-2xl border border-[#e1e7f2] bg-white shadow-[0_14px_34px_rgba(10,47,102,0.08)]">
        <div className="flex flex-col gap-4 border-b border-[#e1e7f2] p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {tabs.map(([key, label, Icon]) => {
              const active = activeType === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveType(key)}
                  className={`inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-black transition ${
                    active
                      ? "bg-purple-50 text-purple-700 ring-1 ring-purple-100"
                      : "text-[#24314d] hover:bg-[#f8fbff] hover:text-purple-700"
                  }`}
                >
                  <Icon />
                  {label}
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="h-11 rounded-xl border border-[#dbe5f4] bg-white px-4 text-sm font-black text-[#24314d] outline-none transition focus:border-purple-300"
            >
              <option value="ALL">All Status</option>
              <option value="UNREAD">Unread</option>
              <option value="READ">Read</option>
            </select>
            <button
              type="button"
              onClick={() => {
                setActiveType("ALL");
                setStatusFilter("ALL");
              }}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#dbe5f4] bg-[#f8fbff] px-4 text-sm font-black text-[#0a2f66] transition hover:bg-white"
            >
              <FaFilter />
              Clear
            </button>
          </div>
        </div>

        <div className="p-5">
          {loading ? (
            <LoadingState
              title="Loading received notices"
              message="Preparing platform, event, and magazine updates."
            />
          ) : error ? (
            <EmptyState
              icon={FaBell}
              title="Unable to load notices"
              description={error}
            />
          ) : filteredNotifications.length === 0 ? (
            <EmptyState
              icon={FaBell}
              title="No received notices found"
              description="New platform, event, and magazine updates will appear here automatically."
            />
          ) : (
            <div className="space-y-5">
              {todayNotices.length > 0 && (
                <div>
                  <h3 className="mb-3 text-sm font-black uppercase text-[#75869b]">
                    Today
                  </h3>
                  <div className="space-y-3">
                    {todayNotices.map((notification) => (
                      <NoticeRow
                        key={`${notification.noticeType}-${notification.id}`}
                        notification={notification}
                      />
                    ))}
                  </div>
                </div>
              )}

              {earlierNotices.length > 0 && (
                <div>
                  <h3 className="mb-3 text-sm font-black uppercase text-[#75869b]">
                    Earlier
                  </h3>
                  <div className="space-y-3">
                    {earlierNotices.map((notification) => (
                      <NoticeRow
                        key={`${notification.noticeType}-${notification.id}`}
                        notification={notification}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
