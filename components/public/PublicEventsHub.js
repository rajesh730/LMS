"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FaArrowRight,
  FaBell,
  FaCalendarAlt,
  FaCheckCircle,
  FaClock,
  FaEnvelope,
  FaFilter,
  FaFlask,
  FaFutbol,
  FaGem,
  FaGraduationCap,
  FaLandmark,
  FaMusic,
  FaPaintBrush,
  FaPenNib,
  FaSchool,
  FaStar,
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
  ["ALL", "All Events", FaGem],
  ["COMPETITION", "Competitions", FaTrophy],
  ["FESTIVAL", "Music", FaMusic],
  ["SPORTS", "Sports", FaFutbol],
  ["SHOWCASE", "Dance", FaTheaterMasks],
  ["OTHER", "Writing", FaPenNib],
  ["WORKSHOP", "Science", FaFlask],
  ["EXHIBITION", "Art & Craft", FaPaintBrush],
];

function formatDate(value) {
  if (!value) return "Date to be announced";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function formatDateRange(event) {
  return formatDate(event?.date);
}

function getPreview(value = "", maxLength = 92) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trim()}...`;
}

function getEventArt(event) {
  const type = String(event?.eventType || "").toUpperCase();
  if (type.includes("FESTIVAL")) return "from-pink-700 via-purple-700 to-amber-400";
  if (type.includes("WORKSHOP")) return "from-emerald-700 via-teal-600 to-cyan-300";
  if (type.includes("EXHIBITION")) return "from-rose-500 via-orange-400 to-amber-200";
  if (type.includes("SHOWCASE")) return "from-indigo-700 via-purple-600 to-pink-300";
  return "from-[#0a2f66] via-purple-700 to-indigo-300";
}

function EventSidebar({ activeCategory, setActiveCategory }) {
  const discover = [
    ["All Events", "ALL", FaCalendarAlt],
    ["Upcoming Events", "UPCOMING", FaClock],
    ["Results Published", "RESULTS", FaTrophy],
    ["School Events", "SCHOOL", FaSchool],
    ["My Registrations", "REGISTER", FaUsers],
  ];

  return (
    <aside className="hidden xl:block">
      <div className="sticky top-24 space-y-5">
        <PublicSidebarGroup
          title="Explore"
          items={PUBLIC_EXPLORE_ITEMS}
          active="events"
        />

        <section className="rounded-2xl border border-[#e6eaf7] bg-white p-4 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
          <p className="px-1 text-[10px] font-black uppercase text-[#52657d]">
            Event Views
          </p>
          <div className="mt-3 space-y-1.5">
            {discover.map(([label, id, Icon]) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveCategory(id)}
                className={`flex min-h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-black transition ${
                  activeCategory === id
                    ? "bg-purple-50 text-purple-700"
                    : "text-[#24314d] hover:bg-[#f8fbff] hover:text-purple-700"
                }`}
              >
                <Icon className={activeCategory === id ? "text-purple-700" : "text-[#0a2f66]"} />
                {label}
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-[#e6eaf7] bg-white p-4 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
          <p className="px-1 text-[10px] font-black uppercase text-[#52657d]">
            Categories
          </p>
          <div className="mt-3 space-y-1.5">
            {CATEGORY_FILTERS.map(([id, label, Icon]) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveCategory(id)}
                className={`flex min-h-9 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-bold transition ${
                  activeCategory === id
                    ? "bg-purple-50 text-purple-700"
                    : "text-[#40516b] hover:bg-[#f8fbff] hover:text-purple-700"
                }`}
              >
                <Icon className="text-[#0a2f66]" />
                {label}
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-[#e6eaf7] bg-white p-5 text-center shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
          <div className="relative mx-auto h-28 w-28 rounded-2xl bg-gradient-to-br from-purple-50 to-amber-50">
            <FaTrophy className="absolute inset-0 m-auto text-6xl text-amber-400" />
          </div>
          <h3 className="mt-4 text-sm font-black text-[#17120a]">
            Organize an Event?
          </h3>
          <p className="mt-2 text-xs leading-5 text-[#52657d]">
            Bring students together and showcase talent on Pratyo.
          </p>
          <Link
            href="/organize-event"
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-purple-200 bg-white px-4 py-2 text-sm font-black text-purple-700 transition hover:bg-purple-50"
          >
            Submit Event
            <FaArrowRight />
          </Link>
        </section>
      </div>
    </aside>
  );
}

function FeaturedEvent({ event }) {
  if (!event) {
    return (
      <section className="rounded-2xl border border-[#e6eaf7] bg-white p-8 text-center shadow-sm">
        <FaCalendarAlt className="mx-auto text-5xl text-purple-700" />
        <h1 className="mt-4 text-2xl font-black text-[#17120a]">
          Public events are ready
        </h1>
        <p className="mt-2 text-sm text-[#52657d]">
          Featured events will appear here when schools or the platform publish them.
        </p>
      </section>
    );
  }

  return (
    <section
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-r ${getEventArt(event)} p-6 text-white shadow-[0_18px_45px_rgba(37,24,91,0.24)]`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_18%,rgba(255,255,255,0.35),transparent_20%),radial-gradient(circle_at_68%_80%,rgba(251,191,36,0.28),transparent_20%)]" />
      <div className="relative z-10 grid gap-6 lg:grid-cols-[1fr_260px] lg:items-center">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-black uppercase text-[#0a2f66]">
            <FaStar className="text-amber-500" />
            Featured Event
          </span>
          <h1 className="mt-5 max-w-3xl text-4xl font-black leading-tight">
            {event.title}
          </h1>
          <p className="mt-2 max-w-2xl text-sm font-semibold text-white/85">
            {getPreview(event.description, 130)}
          </p>
          <div className="mt-5 flex flex-wrap gap-4 text-sm font-bold text-white/90">
            <span className="inline-flex items-center gap-2">
              <FaCalendarAlt />
              {formatDateRange(event)}
            </span>
            <span className="inline-flex items-center gap-2">
              <FaLandmark />
              {event.schoolName || event.partnerName || "Kathmandu, Nepal"}
            </span>
            <span className="inline-flex items-center gap-2">
              <FaGraduationCap />
              Open for {event.eligibleGrades?.length ? event.eligibleGrades.join(", ") : "all grades"}
            </span>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <span className="rounded-lg bg-white/12 px-4 py-2 text-sm font-black">
              {event.schoolCount} Schools Registered
            </span>
            <span className="rounded-lg bg-white/12 px-4 py-2 text-sm font-black">
              {event.participantCount}+ Participants
            </span>
            <span className="rounded-lg bg-white/12 px-4 py-2 text-sm font-black">
              Prize / Certificates
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-5">
          <div className="relative h-48 w-full overflow-hidden rounded-2xl bg-white/12 backdrop-blur">
            <FaMusic className="absolute right-10 top-8 text-7xl text-white/75" />
            <FaTrophy className="absolute bottom-8 left-10 text-6xl text-amber-300" />
          </div>
          <Link
            href={event.href}
            className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-black text-[#0a2f66] transition hover:bg-[#f8fbff]"
          >
            View Details
            <FaArrowRight />
          </Link>
        </div>
      </div>
    </section>
  );
}

function CategoryTabs({ activeCategory, setActiveCategory }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {CATEGORY_FILTERS.slice(0, 8).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveCategory(id)}
            className={`min-h-10 shrink-0 rounded-full px-5 text-xs font-black transition ${
              activeCategory === id
                ? "bg-purple-700 text-white"
                : "bg-white text-[#24314d] shadow-sm hover:bg-purple-50 hover:text-purple-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <button
        type="button"
        className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#e6eaf7] bg-white px-4 text-sm font-black text-[#24314d]"
      >
        Upcoming
        <FaFilter />
      </button>
    </div>
  );
}

function EventCard({ event, result = false, school = false }) {
  return (
    <Link
      href={event.href}
      className="group block overflow-hidden rounded-xl border border-[#e6eaf7] bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-purple-200 hover:shadow-md"
    >
      {!school && (
        <div className={`relative h-28 bg-gradient-to-br ${getEventArt(event)}`}>
          <span className="absolute left-3 top-3 rounded-full bg-blue-600 px-2.5 py-1 text-[10px] font-black uppercase text-white">
            {result ? "Results Out" : "Upcoming"}
          </span>
          <span className="absolute right-3 top-3 rounded-full bg-white px-2.5 py-1 text-[10px] font-black uppercase text-purple-700">
            {event.eventType}
          </span>
          <FaTrophy className="absolute bottom-4 right-5 text-4xl text-white/80" />
        </div>
      )}
      <div className="p-4">
        {school && (
          <div className="mb-3 flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-50 text-purple-700">
              <FaSchool />
            </span>
            <div>
              <p className="text-xs font-black text-[#17120a]">
                {event.schoolName || "School event"}
              </p>
              <span className="rounded-full bg-purple-50 px-2 py-0.5 text-[9px] font-black uppercase text-purple-700">
                School Event
              </span>
            </div>
          </div>
        )}
        <h3 className="line-clamp-2 text-base font-black text-[#17120a] group-hover:text-purple-700">
          {event.title}
        </h3>
        <p className="mt-1 line-clamp-2 text-sm leading-5 text-[#52657d]">
          {getPreview(event.description, 86)}
        </p>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-[#52657d]">
          <span className="inline-flex items-center gap-1.5">
            <FaCalendarAlt className="text-[#0a2f66]" />
            {formatDate(event.date)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <FaUsers className="text-[#0a2f66]" />
            {event.schoolCount} Schools
          </span>
          <span className="inline-flex items-center gap-1.5">
            <FaUsers className="text-[#0a2f66]" />
            {event.participantCount}+ Participants
          </span>
        </div>
        <span className="mt-4 inline-flex w-full items-center justify-center rounded-lg border border-[#e6eaf7] px-3 py-2 text-sm font-black text-purple-700 transition group-hover:bg-purple-50">
          {result ? "View Results" : "View Details"}
        </span>
      </div>
    </Link>
  );
}

function SectionHeader({ title, href, label }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-lg font-black text-[#17120a]">{title}</h2>
      {href && (
        <Link href={href} className="inline-flex items-center gap-2 text-sm font-black text-purple-700">
          {label}
          <FaArrowRight />
        </Link>
      )}
    </div>
  );
}

function RightRail({ data }) {
  return (
    <aside className="hidden lg:block">
      <div className="sticky top-24 space-y-5">
        <section className="rounded-2xl border border-[#e6eaf7] bg-white p-5 shadow-sm">
          <h2 className="text-sm font-black text-[#17120a]">Event Quick Links</h2>
          <div className="mt-4 space-y-4">
            {[
              [FaCalendarAlt, "How Events Work", "Understand the process"],
              [FaUsers, "For Students", "How to participate"],
              [FaSchool, "For Schools", "How to register"],
              [FaTrophy, "Past Winners", "See achievements"],
            ].map(([Icon, title, text]) => (
              <Link key={title} href="/events" className="flex gap-3 rounded-lg p-2 transition hover:bg-[#f8fbff]">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-purple-50 text-purple-700">
                  <Icon />
                </span>
                <span>
                  <strong className="block text-sm text-[#17120a]">{title}</strong>
                  <span className="text-xs text-[#52657d]">{text}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-[#e6eaf7] bg-gradient-to-br from-white to-purple-50 p-5 shadow-sm">
          <h2 className="text-sm font-black text-[#17120a]">Stay Updated!</h2>
          <p className="mt-2 text-xs leading-5 text-[#52657d]">
            Subscribe to get notified about new events and competitions.
          </p>
          <div className="mt-4 flex gap-2">
            <input
              type="email"
              placeholder="Enter your email"
              className="min-h-10 min-w-0 flex-1 rounded-lg border border-[#e6eaf7] px-3 text-sm outline-none focus:border-purple-400"
            />
            <button
              type="button"
              className="rounded-lg bg-purple-700 px-4 text-sm font-black text-white"
            >
              <FaEnvelope />
            </button>
          </div>
          <button
            type="button"
            className="mt-3 min-h-10 w-full rounded-lg bg-purple-700 text-sm font-black text-white"
          >
            Subscribe
          </button>
        </section>

        <section className="rounded-2xl border border-[#e6eaf7] bg-white p-5 shadow-sm">
          <h2 className="text-sm font-black text-[#17120a]">Top Participating Schools</h2>
          <div className="mt-4 space-y-3">
            {data.topSchools.length === 0 ? (
              <p className="text-sm leading-6 text-[#52657d]">Schools appear here after registrations are approved.</p>
            ) : (
              data.topSchools.map((school, index) => (
                <Link key={school.id} href={school.href} className="flex items-center gap-3 rounded-lg p-2 transition hover:bg-[#f8fbff]">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-50 text-xs font-black text-amber-700">
                    {index + 1}
                  </span>
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-50 text-purple-700">
                    <FaSchool />
                  </span>
                  <span className="min-w-0">
                    <strong className="block truncate text-sm text-[#17120a]">{school.schoolName}</strong>
                    <span className="text-xs text-[#52657d]">{school.eventCount} Events</span>
                  </span>
                </Link>
              ))
            )}
          </div>
        </section>
      </div>
    </aside>
  );
}

export default function PublicEventsHub({ initialData }) {
  const [data, setData] = useState(initialData);
  const [activeCategory, setActiveCategory] = useState("ALL");
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

  const upcomingEvents = useMemo(() => {
    if (activeCategory === "ALL") return data.upcomingEvents;
    if (activeCategory === "UPCOMING") return data.upcomingEvents;
    if (activeCategory === "RESULTS") return data.resultsEvents;
    if (activeCategory === "SCHOOL") return data.schoolEvents;
    if (activeCategory === "REGISTER") return data.upcomingEvents;
    return data.upcomingEvents.filter((event) => event.eventType === activeCategory);
  }, [activeCategory, data.resultsEvents, data.schoolEvents, data.upcomingEvents]);

  return (
    <div className="mx-auto grid max-w-[1500px] gap-5 px-4 py-5 sm:px-6 xl:grid-cols-[230px_minmax(0,1fr)_290px]">
      <EventSidebar activeCategory={activeCategory} setActiveCategory={setActiveCategory} />

      <main className="min-w-0 space-y-6">
        <FeaturedEvent event={data.featuredEvent} />
        <CategoryTabs activeCategory={activeCategory} setActiveCategory={setActiveCategory} />

        <section className="space-y-4">
          <SectionHeader title="Upcoming Events" href="/events" label="View all upcoming" />
          {loading ? (
            <div className="rounded-2xl border border-[#e6eaf7] bg-white p-8 text-center text-sm font-bold text-[#52657d]">
              Refreshing public events...
            </div>
          ) : upcomingEvents.length === 0 ? (
            <div className="rounded-2xl border border-[#e6eaf7] bg-white p-8 text-center text-sm text-[#52657d]">
              No events in this view yet.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {upcomingEvents.slice(0, 4).map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          )}
        </section>

        <section className="space-y-4">
          <SectionHeader title="Results Published" href="/events" label="View all results" />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {data.resultsEvents.length === 0 ? (
              <div className="rounded-2xl border border-[#e6eaf7] bg-white p-6 text-sm text-[#52657d] md:col-span-2 xl:col-span-4">
                Results will appear after schools publish winners.
              </div>
            ) : (
              data.resultsEvents.slice(0, 4).map((event) => (
                <EventCard key={event.id} event={event} result />
              ))
            )}
          </div>
        </section>

        <section className="space-y-4">
          <SectionHeader title="School Hosted Events" href="/events" label="View all school events" />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {data.schoolEvents.length === 0 ? (
              <div className="rounded-2xl border border-[#e6eaf7] bg-white p-6 text-sm text-[#52657d] md:col-span-2 xl:col-span-4">
                School-hosted public events will appear here.
              </div>
            ) : (
              data.schoolEvents.slice(0, 4).map((event) => (
                <EventCard key={event.id} event={event} school />
              ))
            )}
          </div>
        </section>
      </main>

      <RightRail data={data} />
    </div>
  );
}
