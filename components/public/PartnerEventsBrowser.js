"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  FaArrowLeft,
  FaArrowRight,
  FaCalendarAlt,
  FaGlobeAsia,
  FaSearch,
  FaTrophy,
  FaUsers,
} from "react-icons/fa";

function formatDate(value) {
  if (!value) return "Date to be announced";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function getPreview(value = "", maxLength = 120) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trim()}...`;
}

function EventCard({ event }) {
  return (
    <Link
      href={`/events/${event.id}`}
      className="grid gap-4 rounded-xl border border-[#e6eaf7] bg-white p-4 transition hover:border-purple-200 hover:bg-[#f8fbff] md:grid-cols-[150px_minmax(0,1fr)_140px]"
    >
      <div className="pravyo-brand-panel relative h-28 overflow-hidden rounded-xl border">
        <FaTrophy className="absolute bottom-4 right-5 text-5xl text-white/80" />
        <span className="absolute left-3 top-3 rounded-full bg-white px-2.5 py-1 text-[9px] font-black uppercase text-purple-700">
          {event.eventType}
        </span>
      </div>
      <div className="min-w-0">
        <h3 className="line-clamp-1 text-lg font-black text-[#17120a]">
          {event.title}
        </h3>
        <p className="mt-1 line-clamp-2 text-sm leading-5 text-[#52657d]">
          {getPreview(event.description)}
        </p>
        <div className="mt-3 flex flex-wrap gap-4 text-xs font-bold text-[#52657d]">
          <span className="inline-flex items-center gap-1.5">
            <FaCalendarAlt className="text-purple-700" />
            {formatDate(event.date)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <FaGlobeAsia className="text-purple-700" />
            {event.schoolName || "Online Event"}
          </span>
        </div>
      </div>
      <div className="flex flex-col justify-center border-t border-[#e6eaf7] pt-3 md:border-l md:border-t-0 md:pl-5 md:pt-0">
        <p className="text-xs font-bold uppercase text-[#52657d]">Registrations</p>
        <p className="text-2xl font-black text-[#17120a]">{event.registrations}</p>
        <span className="mt-3 inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-purple-200 px-3 text-xs font-black text-purple-700">
          View Event
          <FaArrowRight />
        </span>
      </div>
    </Link>
  );
}

export default function PartnerEventsBrowser({ events = [] }) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const filteredEvents = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return events.filter((event) => {
      if (!normalizedQuery) return true;
      return `${event.title} ${event.description} ${event.eventType} ${event.schoolName}`
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [events, query]);

  const totalPages = Math.max(1, Math.ceil(filteredEvents.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const visibleEvents = filteredEvents.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize
  );

  const handleSearch = (value) => {
    setQuery(value);
    setPage(1);
  };

  return (
    <div id="events" className="scroll-mt-28 space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-bold text-[#52657d]">
            Showing {visibleEvents.length} of {filteredEvents.length} events
          </p>
        </div>
        <label className="relative block w-full md:max-w-xs">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[#52657d]" />
          <input
            value={query}
            onChange={(event) => handleSearch(event.target.value)}
            placeholder="Search events..."
            className="min-h-10 w-full rounded-xl border border-[#e6eaf7] bg-white pl-10 pr-3 text-sm font-semibold text-[#24314d] outline-none transition placeholder:text-[#8a9ab1] focus:border-purple-300 focus:ring-4 focus:ring-purple-50"
          />
        </label>
      </div>

      {visibleEvents.length === 0 ? (
        <div className="rounded-xl border border-[#e6eaf7] bg-[#f8fbff] p-8 text-center text-sm font-semibold text-[#52657d]">
          No events match this search.
        </div>
      ) : (
        <div className="space-y-3">
          {visibleEvents.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}

      {filteredEvents.length > pageSize && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#e6eaf7] bg-[#f8fbff] p-3">
          <p className="text-xs font-bold text-[#52657d]">
            Page {safePage} of {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={safePage === 1}
              className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-purple-200 bg-white px-3 text-xs font-black text-purple-700 disabled:cursor-not-allowed disabled:opacity-45"
            >
              <FaArrowLeft />
              Previous
            </button>
            <button
              type="button"
              onClick={() =>
                setPage((current) => Math.min(totalPages, current + 1))
              }
              disabled={safePage === totalPages}
              className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-purple-200 bg-white px-3 text-xs font-black text-purple-700 disabled:cursor-not-allowed disabled:opacity-45"
            >
              Next
              <FaArrowRight />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
