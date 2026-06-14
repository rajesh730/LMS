"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FaArrowRight,
  FaCalendarAlt,
  FaFlask,
  FaFutbol,
  FaLayerGroup,
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
  PUBLIC_EXPLORE_ITEMS,
  PublicSidebarGroup,
} from "@/components/public/PublicExplorePanel";

const CATEGORY_FILTERS = [
  ["ALL", "All", FaLayerGroup],
  ["COMPETITION", "Competition", FaTrophy],
  ["WORKSHOP", "Workshop", FaFlask],
  ["SPORTS", "Sports", FaFutbol],
  ["FESTIVAL", "Festival", FaMusic],
  ["EXHIBITION", "Exhibition", FaPaintBrush],
  ["SHOWCASE", "Showcase", FaTheaterMasks],
  ["OTHER", "Writing", FaPenNib],
];

const VIEW_FILTERS = [
  ["ALL", "All Events"],
  ["UPCOMING", "Open & Upcoming"],
  ["RESULTS", "Results Published"],
  ["SCHOOL", "School Hosted"],
];

function formatDate(value) {
  if (!value) return "Date to be announced";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function getPreview(value = "", maxLength = 126) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trim()}...`;
}

function getStatus(event) {
  if (event.resultsPublished) return ["Results Published", "bg-amber-50 text-amber-800"];
  if (event.registrationDeadline && new Date(event.registrationDeadline).getTime() >= Date.now()) {
    return ["Registration Open", "bg-emerald-50 text-emerald-800"];
  }
  if (event.date && new Date(event.date).getTime() >= Date.now()) {
    return ["Upcoming", "bg-blue-50 text-blue-800"];
  }
  return ["Completed", "bg-slate-100 text-slate-700"];
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
        <p className="text-[11px] font-black uppercase text-[#4326e8]">
          Events
        </p>
        <h1 className="mt-2 text-2xl font-black text-[#17120a]">
          Public events will appear here.
        </h1>
        <p className="mt-2 text-sm leading-6 text-[#52657d]">
          Once schools or partners publish approved events, students can explore
          details and results here.
        </p>
      </section>
    );
  }

  const [status, statusClass] = getStatus(event);
  return (
    <section className="rounded-xl border border-[#e6eaf7] bg-white p-5 shadow-sm">
      <div className="grid gap-5 lg:grid-cols-[92px_minmax(0,1fr)_auto] lg:items-center">
        <div className="hidden sm:flex h-20 w-20 items-center justify-center rounded-2xl bg-[#f4f1ff] text-3xl text-[#4326e8]">
          <EventTypeIcon eventType={event.eventType} />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[#f4f1ff] px-3 py-1 text-[10px] font-black uppercase text-[#4326e8]">
              Featured Event
            </span>
            <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase ${statusClass}`}>
              {status}
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
              <FaCalendarAlt className="text-[#4326e8]" />
              {formatDate(event.date)}
            </span>
            <span className="inline-flex items-center gap-2">
              <FaMapMarkerAlt className="text-[#4326e8]" />
              {event.schoolName || event.partnerName || "Pravyo"}
            </span>
            <span className="hidden sm:inline-flex items-center gap-2">
              <FaUsers className="text-[#4326e8]" />
              {event.participantCount}+ participants
            </span>
          </div>
        </div>
        <Link
          href={event.href}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#4326e8] px-5 text-sm font-black text-white transition hover:bg-[#3217d3]"
        >
          View Details
          <FaArrowRight />
        </Link>
      </div>
    </section>
  );
}

function CategoryTabs({ activeCategory, setActiveCategory }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {CATEGORY_FILTERS.map(([id, label, Icon]) => (
        <button
          key={id}
          type="button"
          onClick={() => setActiveCategory(id)}
          className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full px-4 text-xs font-black transition ${
            activeCategory === id
              ? "bg-[#4326e8] text-white"
              : "border border-[#e6eaf7] bg-white text-[#24314d] hover:bg-[#f4f1ff] hover:text-[#4326e8]"
          }`}
        >
          <Icon />
          {label}
        </button>
      ))}
    </div>
  );
}

function EventRow({ event }) {
  const [status, statusClass] = getStatus(event);

  return (
    <Link
      href={event.href}
      className="group flex gap-3.5 items-start rounded-xl border border-[#e6eaf7] bg-white p-4 shadow-sm transition hover:border-[#cfc4ff] hover:shadow-md sm:grid sm:grid-cols-[72px_minmax(0,1fr)_auto] sm:gap-4 sm:items-center"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#f4f1ff] text-xl text-[#4326e8] sm:h-14 sm:w-14 sm:rounded-2xl sm:text-2xl">
        <EventTypeIcon eventType={event.eventType} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap gap-2">
          <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${statusClass}`}>
            {status}
          </span>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase text-slate-700">
            {event.eventType}
          </span>
        </div>
        <h3 className="mt-2 line-clamp-2 text-base font-black text-[#17120a] group-hover:text-[#4326e8]">
          {event.title}
        </h3>
        <p className="hidden sm:block mt-1 line-clamp-2 text-sm leading-5 text-[#52657d]">
          {getPreview(event.description)}
        </p>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs font-semibold text-[#52657d]">
          <span className="inline-flex items-center gap-1.5">
            <FaCalendarAlt className="text-[#4326e8]" />
            {formatDate(event.date)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <FaSchool className="text-[#4326e8]" />
            {event.schoolName || event.partnerName || "Pravyo"}
          </span>
          <span className="hidden sm:inline-flex items-center gap-1.5">
            <FaUsers className="text-[#4326e8]" />
            {event.schoolCount} schools / {event.participantCount}+ students
          </span>
        </div>
      </div>
      <div className="self-center text-[#8a9ab1] sm:hidden shrink-0 pl-1">
        <FaArrowRight className="text-xs text-[#4326e8] group-hover:translate-x-0.5 transition-transform" />
      </div>
      <span className="hidden sm:inline-flex min-h-10 items-center justify-center gap-2 self-center rounded-lg border border-[#e6eaf7] px-4 text-sm font-black text-[#4326e8] transition group-hover:bg-[#f4f1ff]">
        {event.resultsPublished ? "View Results" : "View Details"}
        <FaArrowRight />
      </span>
    </Link>
  );
}

export default function PublicEventsHub({ initialData }) {
  const [data, setData] = useState(initialData);
  const [activeView, setActiveView] = useState("ALL");
  const [activeCategory, setActiveCategory] = useState("ALL");
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
      ...data.upcomingEvents,
      ...data.resultsEvents,
      ...data.schoolEvents,
    ]
      .filter(Boolean)
      .forEach((event) => map.set(event.id, event));
    return Array.from(map.values()).sort(
      (a, b) => new Date(a.date || 0) - new Date(b.date || 0)
    );
  }, [data.featuredEvent, data.resultsEvents, data.schoolEvents, data.upcomingEvents]);

  const filteredEvents = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return allEvents.filter((event) => {
      if (activeView === "UPCOMING" && event.resultsPublished) return false;
      if (activeView === "RESULTS" && !event.resultsPublished) return false;
      if (activeView === "SCHOOL" && event.eventScope !== "SCHOOL") return false;
      if (activeCategory !== "ALL" && event.eventType !== activeCategory) return false;
      if (!normalizedQuery) return true;
      return `${event.title} ${event.description} ${event.schoolName} ${event.partnerName}`
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [activeCategory, activeView, allEvents, query]);

  return (
    <div className="mx-auto grid max-w-[1500px] gap-5 px-4 py-5 sm:px-6 xl:grid-cols-[230px_minmax(0,1fr)]">
      <EventSidebar />

      <main className="min-w-0 space-y-5">
        <FeaturedEvent event={data.featuredEvent} />

        <section className="rounded-xl border border-[#e6eaf7] bg-white p-4 shadow-sm">
          <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
            <label className="relative block min-w-0">
              <FaSearch className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#8a9ab1]" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search events, schools, partners..."
                className="min-h-11 w-full rounded-lg border border-[#e6eaf7] bg-[#f8f9fd] pl-11 pr-4 text-sm font-semibold text-[#24314d] outline-none transition placeholder:text-[#8a9ab1] focus:border-[#4326e8] focus:bg-white focus:ring-4 focus:ring-[#4326e8]/10"
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
                      ? "bg-[#4326e8] text-white"
                      : "border border-[#e6eaf7] bg-white text-[#24314d] hover:bg-[#f4f1ff] hover:text-[#4326e8]"
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
