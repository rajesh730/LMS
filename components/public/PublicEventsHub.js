"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FaArrowRight,
  FaCalendarAlt,
  FaCircle,
  FaFlask,
  FaFutbol,
  FaMapMarkerAlt,
  FaMusic,
  FaPaintBrush,
  FaPenNib,
  FaSchool,
  FaSearch,
  FaTheaterMasks,
  FaTrophy,
  FaUsers,
} from "react-icons/fa";
import useRealtimeChannel from "@/lib/useRealtimeChannel";
import {
  EVENT_STATUS_FILTERS,
  formatEventDate,
  getEventPublicStatus,
} from "@/lib/eventUiStatus";
import {
  PUBLIC_EXPLORE_ITEMS,
  PublicSidebarGroup,
} from "@/components/public/PublicExplorePanel";

const VIEW_FILTERS = [
  ["all", "All Events"],
  ...EVENT_STATUS_FILTERS.filter((filter) => filter.id !== "all").map(
    (filter) => [filter.id, filter.label]
  ),
];

function getPreview(value = "", maxLength = 126) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trim()}...`;
}

function EventTypeIcon({ eventType = "", className = "" }) {
  const type = String(eventType || "").toUpperCase();
  if (type.includes("SPORTS")) return <FaFutbol className={className} />;
  if (type.includes("FESTIVAL")) return <FaMusic className={className} />;
  if (type.includes("WORKSHOP")) return <FaFlask className={className} />;
  if (type.includes("EXHIBITION")) return <FaPaintBrush className={className} />;
  if (type.includes("SHOWCASE")) return <FaTheaterMasks className={className} />;
  if (type.includes("OTHER")) return <FaPenNib className={className} />;
  return <FaTrophy className={className} />;
}

function EventSidebar() {
  return (
    <aside className="hidden xl:block">
      <div className="sticky top-24">
        <PublicSidebarGroup
          title="Public Pages"
          items={PUBLIC_EXPLORE_ITEMS}
          active="events"
        />
      </div>
    </aside>
  );
}

function FeaturedEvent({ event }) {
  if (!event) {
    return (
      <section className="rounded-xl border border-[#e6eaf7] bg-white p-6 shadow-sm">
        <p className="text-[11px] font-black uppercase text-[#1f4e79]">
          Events
        </p>
        <h1 className="mt-2 text-2xl font-black text-[#17120a]">
          Public events will appear here.
        </h1>
        <p className="mt-2 text-sm leading-6 text-[#52657d]">
          Once schools publish approved events, students can explore
          details and results here.
        </p>
      </section>
    );
  }

  const status = getEventPublicStatus(event);
  return (
    <section className="rounded-xl border border-[#e6eaf7] bg-white p-5 shadow-sm">
      <div className="grid gap-5 lg:grid-cols-[92px_minmax(0,1fr)_auto] lg:items-center">
        <div className="hidden sm:flex h-20 w-20 items-center justify-center rounded-2xl bg-[#eef4f8] text-3xl text-[#1f4e79]">
          <EventTypeIcon eventType={event.eventType} />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[#eef4f8] px-3 py-1 text-[10px] font-black uppercase text-[#1f4e79]">
              Featured Event
            </span>
            <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase ${status.className}`}>
              {status.label}
            </span>
          </div>
          <h1 className="mt-3 break-words text-2xl font-black leading-tight text-[#17120a] md:text-4xl">
            {event.title}
          </h1>
          <p className="hidden sm:block mt-2 max-w-3xl text-sm leading-6 text-[#52657d]">
            {getPreview(event.description, 150)}
          </p>
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs font-bold text-[#52657d]">
            <span className="inline-flex items-center gap-2">
              <FaCalendarAlt className="text-[#1f4e79]" />
              {formatEventDate(event.date)}
            </span>
            <span className="inline-flex items-center gap-2">
              <FaMapMarkerAlt className="text-[#1f4e79]" />
              {event.schoolName || "Pravyo"}
            </span>
            <span className="hidden sm:inline-flex items-center gap-2">
              <FaUsers className="text-[#1f4e79]" />
              {event.participantCount}+ participants
            </span>
          </div>
        </div>
        <Link
          href={event.href}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#1f4e79] px-5 text-sm font-black text-white transition hover:bg-[#173f63]"
        >
          View Details
          <FaArrowRight />
        </Link>
      </div>
    </section>
  );
}

function LiveEventsStrip({ events = [], onViewAll }) {
  if (!events.length) return null;

  return (
    <section className="rounded-xl border border-rose-100 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="inline-flex items-center gap-2 text-sm font-black uppercase text-rose-800">
            <FaCircle className="text-[0.65rem]" />
            Active / live
          </h2>
          <p className="mt-1 text-xs font-semibold text-[#52657d]">
            {events.length} event{events.length === 1 ? "" : "s"} currently active
          </p>
        </div>
        <button
          type="button"
          onClick={onViewAll}
          className="inline-flex min-h-9 items-center rounded-lg border border-rose-100 px-3 text-xs font-black text-rose-800 transition hover:bg-rose-50"
        >
          View active events
        </button>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {events.slice(0, 3).map((event) => (
          <Link
            key={event.id}
            href={event.href}
            className="group rounded-lg border border-[#e6eaf7] bg-[#fffafa] p-3 transition hover:border-rose-200 hover:bg-white"
          >
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-700">
                <EventTypeIcon eventType={event.eventType} />
              </span>
              <div className="min-w-0">
                <p className="line-clamp-1 text-sm font-black text-[#17120a] group-hover:text-rose-800">
                  {event.title}
                </p>
                <p className="mt-1 line-clamp-1 text-xs font-semibold text-[#52657d]">
                  {event.schoolName || "Pravyo"} - {formatEventDate(event.date)}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function EventRow({ event }) {
  const hasPublicResults =
    event.eventScope === "PLATFORM" &&
    event.resultsPublished &&
    event.publicResultsEnabled;
  const status = getEventPublicStatus(event);

  return (
    <Link
      href={event.href}
      className="group flex gap-3.5 items-start rounded-xl border border-[#e6eaf7] bg-white p-4 shadow-sm transition hover:border-[#cfc4ff] hover:shadow-md sm:grid sm:grid-cols-[72px_minmax(0,1fr)_auto] sm:gap-4 sm:items-center"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#eef4f8] text-xl text-[#1f4e79] sm:h-14 sm:w-14 sm:rounded-2xl sm:text-2xl">
        <EventTypeIcon eventType={event.eventType} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap gap-2">
          <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${status.className}`}>
            {status.label}
          </span>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase text-slate-700">
            {event.eventType}
          </span>
        </div>
        <h3 className="mt-2 line-clamp-2 text-base font-black text-[#17120a] group-hover:text-[#1f4e79]">
          {event.title}
        </h3>
        <p className="hidden sm:block mt-1 line-clamp-2 text-sm leading-5 text-[#52657d]">
          {getPreview(event.description)}
        </p>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs font-semibold text-[#52657d]">
          <span className="inline-flex items-center gap-1.5">
            <FaCalendarAlt className="text-[#1f4e79]" />
            {formatEventDate(event.date)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <FaSchool className="text-[#1f4e79]" />
            {event.schoolName || "Pravyo"}
          </span>
          <span className="hidden sm:inline-flex items-center gap-1.5">
            <FaUsers className="text-[#1f4e79]" />
            {event.schoolCount} schools / {event.participantCount}+ students
          </span>
        </div>
      </div>
      <div className="self-center text-[#8a9ab1] sm:hidden shrink-0 pl-1">
        <FaArrowRight className="text-xs text-[#1f4e79] group-hover:translate-x-0.5 transition-transform" />
      </div>
      <span className="hidden sm:inline-flex min-h-10 items-center justify-center gap-2 self-center rounded-lg border border-[#e6eaf7] px-4 text-sm font-black text-[#1f4e79] transition group-hover:bg-[#eef4f8]">
        {hasPublicResults ? "View Results" : "View Details"}
        <FaArrowRight />
      </span>
    </Link>
  );
}

export default function PublicEventsHub({ initialData }) {
  const [data, setData] = useState(initialData);
  const [activeView, setActiveView] = useState("all");
  const [activeCategory] = useState("ALL");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true);
      const res = await fetch("/api/public/events-hub", { cache: "no-store" });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.message || "Failed to load events");
      setData(payload);
    } catch (_error) {
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useRealtimeChannel(
    ["events", "public-feed", "work-indicators"],
    useCallback(() => {
      void load({ silent: true });
    }, [load])
  );

  useEffect(() => {
    void load({ silent: true });
  }, [load]);

  const allEvents = useMemo(() => {
    const map = new Map();
    [
      data.featuredEvent,
      ...(data.liveEvents || []),
      ...data.upcomingEvents,
      ...data.resultsEvents,
      ...data.schoolEvents,
    ]
      .filter(Boolean)
      .forEach((event) => map.set(event.id, event));
    return Array.from(map.values()).sort(
      (a, b) => new Date(a.date || 0) - new Date(b.date || 0)
    );
  }, [data.featuredEvent, data.liveEvents, data.resultsEvents, data.schoolEvents, data.upcomingEvents]);

  const filteredEvents = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return allEvents.filter((event) => {
      const status = getEventPublicStatus(event);
      if (activeView !== "all" && status.key !== activeView) return false;
      if (activeCategory !== "ALL" && event.eventType !== activeCategory) return false;
      if (!normalizedQuery) return true;
      return `${event.title} ${event.description} ${event.schoolName}`
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [activeCategory, activeView, allEvents, query]);

  return (
    <div className="mx-auto grid max-w-[1500px] gap-5 px-4 py-5 sm:px-6 xl:grid-cols-[230px_minmax(0,1fr)]">
      <EventSidebar />

      <main className="min-w-0 space-y-5">
        <FeaturedEvent event={data.featuredEvent} />

        <LiveEventsStrip
          events={data.liveEvents || []}
          onViewAll={() => setActiveView("live")}
        />

        <section className="rounded-xl border border-[#e6eaf7] bg-white p-4 shadow-sm">
          <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
            <label className="relative block min-w-0">
              <FaSearch className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#8a9ab1]" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search events or schools..."
                className="min-h-11 w-full rounded-lg border border-[#e6eaf7] bg-[#f8f9fd] pl-11 pr-4 text-sm font-semibold text-[#24314d] outline-none transition placeholder:text-[#8a9ab1] focus:border-[#1f4e79] focus:bg-white focus:ring-4 focus:ring-[#1f4e79]/10"
              />
            </label>
            <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {VIEW_FILTERS.map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveView(id)}
                  className={`min-h-10 shrink-0 rounded-full px-4 text-xs font-black transition ${
                    activeView === id
                      ? "bg-[#1f4e79] text-white"
                      : "border border-[#e6eaf7] bg-white text-[#24314d] hover:bg-[#eef4f8] hover:text-[#1f4e79]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-[#17120a]">
                Public Events
              </h2>
              <p className="text-xs font-semibold text-[#52657d]">
                Showing {filteredEvents.length} event{filteredEvents.length === 1 ? "" : "s"}
              </p>
            </div>
            {loading && (
              <span className="text-xs font-black text-[#52657d]">
                Refreshing...
              </span>
            )}
          </div>

          {filteredEvents.length === 0 ? (
            <div className="rounded-xl border border-[#e6eaf7] bg-white p-8 text-center text-sm font-semibold text-[#52657d]">
              No public events match this view yet.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredEvents.map((event) => (
                <EventRow key={event.id} event={event} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
