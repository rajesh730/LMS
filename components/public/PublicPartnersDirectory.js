"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  FaArrowRight,
  FaBuilding,
  FaCalendarAlt,
  FaCheckCircle,
  FaFilter,
  FaHandshake,
  FaMapMarkerAlt,
  FaMedal,
  FaMicrophone,
  FaRegLightbulb,
  FaSchool,
  FaSearch,
  FaSyncAlt,
  FaTrophy,
  FaUsers,
} from "react-icons/fa";

function label(value) {
  return String(value || "Other")
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function numberLabel(value) {
  const count = Number(value || 0);
  if (count >= 1000) return `${(count / 1000).toFixed(count >= 10000 ? 0 : 1)}k+`;
  return String(count);
}

function partnerCategory(partner) {
  const roles = partner.partnerRoles || [];
  if (roles.includes("SPONSOR")) return "Sponsors";
  if (roles.includes("MEDIA_PARTNER")) return "Media Partners";
  if (roles.includes("MENTOR_PARTNER") || roles.includes("CHALLENGE_PARTNER")) {
    return "Training Partners";
  }
  if (roles.includes("VENUE_PARTNER")) return "Venue Partners";
  return "Event Partners";
}

function PartnerCategoryIcon({ category, className = "" }) {
  if (category === "Sponsors") return <FaMedal className={className} />;
  if (category === "Media Partners") return <FaMicrophone className={className} />;
  if (category === "Training Partners") return <FaRegLightbulb className={className} />;
  if (category === "Venue Partners") return <FaBuilding className={className} />;
  return <FaHandshake className={className} />;
}

function partnerHref(partner) {
  return partner.slug ? `/partners/${partner.slug}` : "/partners";
}

function PartnerLogo({ partner, size = "h-12 w-12" }) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#f4f1ff] text-lg font-black text-[#4326e8] ${size}`.trim()}
    >
      {partner.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={partner.logoUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        (partner.name || "P").charAt(0).toUpperCase()
      )}
    </span>
  );
}

function FilterSelect({ label: title, value, onChange, options }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 flex items-center gap-2 text-[10px] font-black uppercase text-[#52657d]">
        <FaFilter className="text-[#4326e8]" />
        {title}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-11 w-full rounded-lg border border-[#e6eaf7] bg-white px-3 text-sm font-bold text-[#24314d] outline-none transition focus:border-[#4326e8] focus:ring-4 focus:ring-[#4326e8]/10"
      >
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function StatStrip({ totals }) {
  const stats = [
    [totals.partnerCount, "Partners", FaHandshake],
    [totals.eventCount, "Events", FaCalendarAlt],
    [totals.schoolCount, "Schools", FaSchool],
    [totals.studentCount, "Students", FaUsers],
  ];

  return (
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map(([value, title, Icon]) => (
        <div
          key={title}
          className="flex items-center gap-3 rounded-xl border border-[#e6eaf7] bg-white p-4 shadow-sm"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#f4f1ff] text-[#4326e8]">
            <Icon />
          </span>
          <span>
            <strong className="block text-xl font-black text-[#17120a]">
              {numberLabel(value)}
            </strong>
            <span className="text-xs font-bold text-[#52657d]">{title}</span>
          </span>
        </div>
      ))}
    </section>
  );
}

function FeaturedPartners({ partners }) {
  if (!partners.length) return null;

  return (
    <section className="rounded-xl border border-[#e6eaf7] bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-black text-[#17120a]">
          Featured Partners
        </h2>
        <Link href="#partners" className="text-xs font-black text-[#4326e8]">
          View all
        </Link>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {partners.slice(0, 4).map((partner) => (
          <Link
            key={partner.id}
            href={partnerHref(partner)}
            className="flex min-w-0 items-center gap-3 rounded-lg border border-[#e6eaf7] bg-[#f8f9fd] p-3 transition hover:border-[#cfc4ff] hover:bg-white"
          >
            <PartnerLogo partner={partner} size="h-11 w-11" />
            <span className="min-w-0">
              <strong className="block truncate text-sm text-[#17120a]">
                {partner.name}
              </strong>
              <span className="block truncate text-xs font-bold text-[#4326e8]">
                {partnerCategory(partner)}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function PartnerRow({ partner }) {
  const category = partnerCategory(partner);
  const metrics = [
    [partner.eventCount, "Events", FaCalendarAlt],
    [partner.schoolCount, "Schools", FaSchool],
    [partner.studentCount, "Students", FaUsers],
  ];

  return (
    <Link
      href={partnerHref(partner)}
      className="group grid gap-4 rounded-xl border border-[#e6eaf7] bg-white p-4 shadow-sm transition hover:border-[#cfc4ff] hover:shadow-md md:grid-cols-[64px_minmax(0,1fr)_auto]"
    >
      <PartnerLogo partner={partner} size="h-14 w-14" />
      <div className="min-w-0">
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase text-emerald-800">
            <FaCheckCircle />
            Verified
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-[#f4f1ff] px-2.5 py-1 text-[10px] font-black uppercase text-[#4326e8]">
            <PartnerCategoryIcon category={category} />
            {category}
          </span>
        </div>
        <h3 className="mt-2 break-words text-base font-black text-[#17120a] group-hover:text-[#4326e8]">
          {partner.name}
        </h3>
        <p className="mt-1 flex items-start gap-2 text-sm leading-5 text-[#52657d]">
          <FaMapMarkerAlt className="mt-1 shrink-0 text-[#4326e8]" />
          <span>{partner.location || label(partner.organizationType)}</span>
        </p>
        <p className="mt-2 line-clamp-2 text-sm leading-5 text-[#52657d]">
          {partner.description || "Verified partner supporting public student opportunities."}
        </p>
        <div className="mt-3 grid gap-2 text-xs sm:grid-cols-3">
          {metrics.map(([value, title, MetricIcon]) => (
            <span
              key={title}
              className="flex items-center gap-2 rounded-lg bg-[#f8f9fd] px-3 py-2 font-bold text-[#24314d]"
            >
              <MetricIcon className="text-[#4326e8]" />
              {numberLabel(value)} {title}
            </span>
          ))}
        </div>
      </div>
      <span className="inline-flex min-h-10 items-center justify-center gap-2 self-center rounded-lg border border-[#e6eaf7] px-4 text-sm font-black text-[#4326e8] transition group-hover:bg-[#f4f1ff]">
        View Profile
        <FaArrowRight />
      </span>
    </Link>
  );
}

function CollaborationStrip({ events }) {
  if (!events.length) return null;

  return (
    <section className="rounded-xl border border-[#e6eaf7] bg-white p-4 shadow-sm">
      <h2 className="text-sm font-black text-[#17120a]">Recent Collaborations</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {events.slice(0, 6).map((event) => (
          <Link
            key={event.id}
            href={`/events/${event.id}`}
            className="grid grid-cols-[44px_1fr] gap-3 rounded-lg border border-[#e6eaf7] bg-[#f8f9fd] p-3 transition hover:bg-white"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#f4f1ff] text-[#4326e8]">
              <FaTrophy />
            </span>
            <span className="min-w-0">
              <strong className="line-clamp-1 text-sm text-[#17120a]">
                {event.title}
              </strong>
              <span className="mt-1 block text-xs font-semibold text-[#52657d]">
                {event.partnerName} / {event.studentCount} students
              </span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default function PublicPartnersDirectory({
  partners = [],
  totals,
  recentEvents = [],
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All Categories");

  const featuredPartners = useMemo(
    () =>
      [...partners]
        .sort((a, b) => {
          const featuredRank =
            (b.trustLevel === "FEATURED_PARTNER" ? 2 : 0) -
            (a.trustLevel === "FEATURED_PARTNER" ? 2 : 0);
          if (featuredRank !== 0) return featuredRank;
          return b.eventCount + b.schoolCount - (a.eventCount + a.schoolCount);
        })
        .slice(0, 6),
    [partners]
  );

  const categories = useMemo(
    () => ["All Categories", ...new Set(partners.map(partnerCategory))],
    [partners]
  );
  const filteredPartners = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return partners
      .filter((partner) => {
        const searchable = `${partner.name} ${partner.location} ${partner.description} ${partner.partnerRoles?.join(" ")}`.toLowerCase();
        if (normalizedQuery && !searchable.includes(normalizedQuery)) return false;
        if (category !== "All Categories" && partnerCategory(partner) !== category) return false;
        return true;
      })
      .sort((a, b) => b.eventCount + b.schoolCount - (a.eventCount + a.schoolCount));
  }, [category, partners, query]);

  const clearFilters = () => {
    setQuery("");
    setCategory("All Categories");
  };

  return (
    <div className="min-w-0">
      <div className="min-w-0 space-y-5">
        <section className="rounded-xl border border-[#e6eaf7] bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase text-[#4326e8]">
                Partners
              </p>
              <h1 className="mt-2 max-w-3xl text-3xl font-black leading-tight text-[#17120a] md:text-4xl">
                Verified organizations creating opportunities for students.
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#52657d]">
                Explore event organizers, sponsors, mentors, and trusted school
                collaborators approved for public activity on Pratyo.
              </p>
            </div>
            <Link
              href="/organize-event"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#4326e8] px-5 text-sm font-black text-white transition hover:bg-[#3217d3]"
            >
              Become a Partner
              <FaArrowRight />
            </Link>
          </div>
        </section>

        <StatStrip totals={totals} />
        <FeaturedPartners partners={featuredPartners} />

        <section className="rounded-xl border border-[#e6eaf7] bg-white p-4 shadow-sm">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_240px_auto] lg:items-end">
            <label className="block min-w-0">
              <span className="mb-1.5 flex items-center gap-2 text-[10px] font-black uppercase text-[#52657d]">
                <FaSearch className="text-[#4326e8]" />
                Search
              </span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search partners..."
                className="min-h-11 w-full rounded-lg border border-[#e6eaf7] bg-[#f8f9fd] px-4 text-sm font-semibold text-[#24314d] outline-none transition placeholder:text-[#8a9ab1] focus:border-[#4326e8] focus:bg-white focus:ring-4 focus:ring-[#4326e8]/10"
              />
            </label>
            <FilterSelect label="Category" value={category} onChange={setCategory} options={categories} />
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[#e6eaf7] px-4 text-sm font-black text-[#0a2f66] transition hover:bg-[#f8f9fd]"
            >
              <FaSyncAlt />
              Clear
            </button>
          </div>
        </section>

        <section id="partners" className="scroll-mt-28 space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-[#17120a]">All Partners</h2>
              <p className="text-xs font-semibold text-[#52657d]">
                Showing {filteredPartners.length} of {partners.length} partners
              </p>
            </div>
          </div>
          {filteredPartners.length === 0 ? (
            <div className="rounded-xl border border-[#e6eaf7] bg-white p-8 text-center text-sm font-semibold text-[#52657d]">
              No partners match these filters yet.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredPartners.map((partner) => (
                <PartnerRow key={partner.id} partner={partner} />
              ))}
            </div>
          )}
        </section>

        <CollaborationStrip events={recentEvents} />
      </div>
    </div>
  );
}
