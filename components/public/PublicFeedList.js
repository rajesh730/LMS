"use client";

import { useCallback, useEffect, useState } from "react";
import {
  FaArrowRight,
  FaAward,
  FaCalendarAlt,
  FaEllipsisH,
  FaSchool,
  FaThumbsUp,
  FaTrophy,
  FaUsers,
} from "react-icons/fa";
import useRealtimeChannel from "@/lib/useRealtimeChannel";

function formatDate(value) {
  if (!value) return "Date to be announced";

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function getInitials(value) {
  const parts = String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!parts.length) return "SC";

  return parts
    .slice(0, 4)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function SchoolSpotlightCard({ promotion, compact = false, className = "" }) {
  return (
    <a
      href={promotion.href}
      className={`group flex flex-col overflow-hidden rounded-[26px] border border-[#cfe0f6] bg-white shadow-[0_18px_45px_rgba(10,47,102,0.12)] transition hover:-translate-y-0.5 hover:border-[#2f7fdb]/45 ${className}`.trim()}
    >
      <div className="relative">
        <div
          className={compact ? "h-16 bg-cover bg-center" : "h-44 bg-cover bg-center"}
          style={{
            backgroundImage: promotion.profile?.coverImageUrl
              ? `linear-gradient(rgba(7,24,51,0.08), rgba(7,24,51,0.52)), url(${promotion.profile.coverImageUrl})`
              : "linear-gradient(135deg, rgba(47,127,219,.96), rgba(10,47,102,.92))",
          }}
        />
        <div className="absolute left-3 top-3 inline-flex rounded-full bg-white/90 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#0a2f66] shadow-sm">
          School Spotlight
        </div>
      </div>

      <div className={compact ? "flex flex-1 flex-col justify-between p-4" : "flex flex-1 flex-col justify-between p-5"}>
        <div>
          <h2 className={compact ? "text-base font-black leading-6 text-slate-950 group-hover:text-[#0a2f66]" : "text-xl font-black text-slate-950 group-hover:text-[#0a2f66]"}>
            {promotion.title}
          </h2>
          <p className="mt-1 line-clamp-1 text-sm leading-6 text-slate-500">
            {promotion.school.location || "School activity profile"}
          </p>
          <p className={compact ? "mt-2 line-clamp-2 text-sm leading-6 text-slate-700" : "mt-4 line-clamp-4 text-sm leading-6 text-slate-700"}>
            {promotion.tagline}
          </p>
        </div>

        <div className={compact ? "mt-3" : "mt-5 space-y-3"}>
          {!compact && (
            <div className="rounded-2xl border border-[#dce9fa] bg-[#f8fbff] px-4 py-3 text-sm text-slate-600">
              Highlighted school profiles stay separate from student writing.
            </div>
          )}
          <span className={compact ? "inline-flex items-center gap-2 text-sm font-black text-[#0a2f66]" : "inline-flex items-center gap-2 rounded-full bg-[#0a2f66] px-4 py-2 text-sm font-black text-white"}>
            View school
            <FaArrowRight />
          </span>
        </div>
      </div>
    </a>
  );
}

function PulseFeedCard({ item }) {
  const [expanded, setExpanded] = useState(false);
  const [liked, setLiked] = useState(Boolean(item.likedByViewer));
  const [reactionCount, setReactionCount] = useState(item.reactionCount ?? 0);
  const [likePending, setLikePending] = useState(false);
  const content = String(item.content || "");
  const needsReadMore = content.length > 220;
  const primaryLabel = item.challengeTitle || item.schoolName || "Pratyo Pulse";
  const showTitle =
    item.title &&
    String(item.title).trim().toLowerCase() !==
      String(primaryLabel).trim().toLowerCase();
  const schoolInitials = getInitials(item.schoolName);

  useEffect(() => {
    setLiked(Boolean(item.likedByViewer));
    setReactionCount(item.reactionCount ?? 0);
  }, [item.likedByViewer, item.reactionCount]);

  const toggleLike = async () => {
    if (likePending) return;

    const previousLiked = liked;
    const previousReactionCount = reactionCount;
    const optimisticLiked = !previousLiked;

    setLikePending(true);
    setLiked(optimisticLiked);
    setReactionCount((current) =>
      Math.max(0, current + (optimisticLiked ? 1 : -1))
    );

    try {
      const res = await fetch(`/api/public/feed/${item.id}/like`, {
        method: "POST",
      });
      const payload = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(payload.message || "Failed to update like");
      }

      setLiked(Boolean(payload.liked));
      setReactionCount(Math.max(0, Number(payload.reactionCount) || 0));
    } catch (_error) {
      setLiked(previousLiked);
      setReactionCount(previousReactionCount);
    } finally {
      setLikePending(false);
    }
  };

  return (
    <article className="bg-white px-5 py-3.5 sm:px-6">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#dce9fa] bg-[#f8fbff] text-[13px] font-black uppercase tracking-[0.08em] text-[#0a2f66]">
          {schoolInitials}
        </div>
        <div className="min-w-0 flex-1 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="line-clamp-2 text-[15px] font-black leading-5 text-slate-950">
              {primaryLabel}
            </p>
            <div className="mt-1 flex min-w-0 items-center gap-1.5 text-[11px] text-slate-500">
              <span className="shrink-0 whitespace-nowrap">{formatDate(item.date)}</span>
              <span className="shrink-0 text-slate-300">|</span>
              <span className="truncate">{item.schoolName || "School community"}</span>
            </div>
          </div>
          <button
            type="button"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            aria-label="Post options"
          >
            <FaEllipsisH className="text-xs" />
          </button>
        </div>
      </div>
      {showTitle ? (
        <h3 className="mt-3 text-[18px] font-black leading-6 text-[#145ab2]">
          {item.title}
        </h3>
      ) : null}
      <p
        className={`${showTitle ? "mt-3" : "mt-4"} whitespace-pre-line break-words text-[15px] leading-8 text-slate-800 ${
          needsReadMore && !expanded ? "line-clamp-4" : ""
        }`}
      >
        {content}
        {needsReadMore && !expanded ? "..." : ""}
      </p>
      {needsReadMore && (
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          className="mt-2 text-sm font-semibold text-slate-500 transition hover:text-slate-700"
        >
          {expanded ? "Show less" : "Read more"}
        </button>
      )}
      <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-200 pt-3 text-sm text-slate-500">
        <button
          type="button"
          onClick={toggleLike}
          disabled={likePending}
          className={`inline-flex items-center gap-2 transition ${
            liked ? "text-[#145ab2]" : "hover:text-slate-700"
          } ${likePending ? "cursor-wait opacity-70" : ""}`}
          aria-pressed={liked}
        >
          <FaThumbsUp />
          {reactionCount}
        </button>
        {item.schoolHref ? (
          <a
            href={item.schoolHref}
            className="inline-flex items-center gap-2 rounded-full bg-[#f6f9ff] px-3 py-1.5 text-xs font-black uppercase tracking-[0.1em] text-[#0a2f66] transition hover:bg-[#eaf2ff]"
          >
            <FaSchool />
            Visit school
          </a>
        ) : (
          <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
            <FaSchool />
            School
          </span>
        )}
      </div>
    </article>
  );
}

function ResultFeedCard({ item }) {
  return (
    <article className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#eaf2ff] text-[#0a2f66]">
          <FaTrophy />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-[#eaf2ff] px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-[#0a2f66]">
              Result
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-slate-600">
              {item.placement}
            </span>
          </div>
          <h3 className="mt-4 text-2xl font-black tracking-tight text-slate-950">
            {item.title}
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            {item.recipientName || "Student"} from {item.schoolName || "School"}
          </p>
          <p className="mt-4 flex items-center gap-2 text-sm font-bold text-slate-600">
            <FaAward className="text-[#0a2f66]" />
            {item.eventTitle || "Published event result"}
          </p>
          {item.certificateUrl && (
            <a
              href={item.certificateUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#0a2f66] px-4 py-2 text-sm font-black text-white transition hover:bg-[#123f82]"
            >
              View certificate
              <FaArrowRight />
            </a>
          )}
        </div>
      </div>
    </article>
  );
}

function EventFeedCard({ item }) {
  return (
    <a
      href={item.href}
      className="group block rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#2f7fdb]/35 hover:shadow-xl hover:shadow-[#0a2f66]/10 sm:p-6"
    >
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#eaf2ff] text-[#0a2f66]">
          <FaCalendarAlt />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-[#eaf2ff] px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-[#0a2f66]">
              Event
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-slate-600">
              {item.eventScope || "Platform"}
            </span>
          </div>
          <h3 className="mt-4 text-2xl font-black tracking-tight text-slate-950 group-hover:text-[#0a2f66]">
            {item.title}
          </h3>
          <p className="mt-3 line-clamp-3 text-base leading-7 text-slate-700">
            {item.description}
          </p>
          <div className="mt-5 flex flex-wrap gap-4 text-sm font-bold text-slate-500">
            <span className="inline-flex items-center gap-2">
              <FaCalendarAlt className="text-[#0a2f66]" />
              {formatDate(item.date)}
            </span>
            <span className="inline-flex items-center gap-2">
              <FaUsers className="text-[#0a2f66]" />
              {item.eligibleGrades?.length
                ? item.eligibleGrades.join(", ")
                : "Eligible grades"}
            </span>
          </div>
        </div>
      </div>
    </a>
  );
}

function FeedCard({ item }) {
  if (item.type === "pulse") return <PulseFeedCard item={item} />;
  if (item.type === "result") return <ResultFeedCard item={item} />;
  return <EventFeedCard item={item} />;
}

export { SchoolSpotlightCard };

export default function PublicFeedList({
  initialItems = [],
  initialCursor = null,
  initialHasMore = false,
  feedType = "all",
}) {
  const [items, setItems] = useState(initialItems);
  const [cursor, setCursor] = useState(initialCursor);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useRealtimeChannel(
    "public-feed",
    useCallback((payload) => {
      if (payload.payload?.kind === "like-updated" && payload.payload?.itemId) {
        setItems((current) =>
          current.map((item) =>
            item.id === payload.payload.itemId
              ? {
                  ...item,
                  reactionCount: payload.payload.reactionCount,
                }
              : item
          )
        );
      }
    }, []),
    {
      enabled: feedType === "pulse" || feedType === "all",
    }
  );

  const loadMore = async () => {
    if (!hasMore || loading) return;

    try {
      setLoading(true);
      setError("");
      const params = new URLSearchParams({ limit: "8" });
      if (cursor) params.set("cursor", cursor);
      if (feedType !== "all") params.set("type", feedType);

      const res = await fetch(`/api/public/feed?${params.toString()}`, {
        cache: "no-store",
      });
      const payload = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(payload.message || "Failed to load more posts");
      }

      setItems((current) => [...current, ...(payload.items || [])]);
      setCursor(payload.nextCursor || null);
      setHasMore(Boolean(payload.hasMore));
    } catch (loadError) {
      setError(loadError.message || "Failed to load more posts");
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="rounded-[26px] border border-slate-200 bg-white p-8 text-center shadow-sm">
        <FaSchool className="mx-auto text-3xl text-[#0a2f66]" />
        <h2 className="mt-4 text-2xl font-black text-slate-950">
          The public feed is ready
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">
          Published student writing will appear here as schools start using the
          platform.
        </p>
      </div>
    );
  }

  return (
    <div
      className={
        feedType === "pulse"
          ? "overflow-hidden border-y border-slate-200 bg-white"
          : "space-y-4"
      }
    >
      {items.map((item, index) => (
        <div
          key={item.id}
          className={
            feedType === "pulse" && index > 0 ? "border-t border-slate-200" : ""
          }
        >
          <FeedCard item={item} />
        </div>
      ))}

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
          {error}
        </div>
      )}

      {hasMore && (
        <div className="pt-2 text-center">
          <button
            type="button"
            disabled={loading}
            onClick={loadMore}
            className="rounded-full bg-[#0a2f66] px-6 py-3 text-sm font-black text-white shadow-lg shadow-[#0a2f66]/15 transition hover:bg-[#123f82] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Loading..." : "Load more posts"}
          </button>
        </div>
      )}
    </div>
  );
}
