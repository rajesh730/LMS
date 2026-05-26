"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  FaArrowRight,
  FaBriefcase,
  FaBuilding,
  FaCalendarAlt,
  FaCheckCircle,
  FaFilter,
  FaGlobeAsia,
  FaHandshake,
  FaMapMarkerAlt,
  FaMedal,
  FaMicrophone,
  FaRegLightbulb,
  FaSchool,
  FaSearch,
  FaSeedling,
  FaShieldAlt,
  FaSlidersH,
  FaStar,
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

function primaryRole(partner) {
  return partner.partnerRoles?.[0] || "ORGANIZER_PARTNER";
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
  if (category === "Media Partners") {
    return <FaMicrophone className={className} />;
  }
  if (category === "Training Partners") {
    return <FaRegLightbulb className={className} />;
  }
  if (category === "Venue Partners") return <FaBuilding className={className} />;
  return <FaHandshake className={className} />;
}

function PartnerLogo({ partner, className = "" }) {
  return (
    <div
      className={`flex items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-purple-50 to-amber-50 text-[#0a2f66] ${className}`.trim()}
    >
      {partner.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={partner.logoUrl}
          alt=""
          className="h-full w-full object-cover"
        />
      ) : (
        <span className="text-lg font-black">
          {partner.name.charAt(0).toUpperCase()}
        </span>
      )}
    </div>
  );
}

function PartnerVisual({ partner, compact = false }) {
  const category = partnerCategory(partner);
  return (
    <div
      className={`relative overflow-hidden rounded-xl bg-gradient-to-br from-[#eef6ff] via-white to-purple-50 ${
        compact ? "h-[104px]" : "h-64"
      }`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_18%,rgba(168,85,247,0.18),transparent_25%),radial-gradient(circle_at_82%_76%,rgba(245,158,11,0.2),transparent_28%)]" />
      <div className="absolute right-8 top-8 h-24 w-36 rotate-6 rounded-2xl border border-white/80 bg-white/70 shadow-xl" />
      <div className="absolute bottom-8 left-8 h-20 w-32 -rotate-6 rounded-2xl border border-white/80 bg-white/75 shadow-xl" />
      <PartnerCategoryIcon
        category={category}
        className="absolute right-10 top-10 text-5xl text-[#0a2f66]/65"
      />
      <FaHandshake className="absolute bottom-9 left-12 text-4xl text-purple-600/70" />
    </div>
  );
}

function FilterSelect({ label: title, value, onChange, options }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 flex items-center gap-2 text-[10px] font-black uppercase text-[#52657d]">
        <FaFilter className="text-purple-700" />
        {title}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-11 w-full rounded-xl border border-[#e6eaf7] bg-white px-3 text-sm font-bold text-[#24314d] outline-none transition focus:border-purple-300 focus:ring-4 focus:ring-purple-50"
      >
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function FeaturedPartnerCard({ partner, premium = false }) {
  return (
    <Link
      href={`/partners/${partner.slug}`}
      className="group overflow-hidden rounded-xl border border-[#e6eaf7] bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-purple-200 hover:shadow-lg"
    >
      <div className="relative">
        <PartnerVisual partner={partner} compact />
        <span
          className={`absolute left-2 top-2 rounded-md px-2 py-1 text-[9px] font-black uppercase text-white shadow-sm ${
            premium ? "bg-amber-400" : "bg-blue-600"
          }`}
        >
          {premium ? "Premium" : "Featured"}
        </span>
      </div>
      <div className="relative px-4 pb-4 pt-0">
        <PartnerLogo partner={partner} className="-mt-7 mb-2 h-12 w-12 rounded-full border-[3px] border-white shadow-md" />
        <h3 className="line-clamp-1 text-[15px] font-black text-[#17120a] group-hover:text-purple-700">
          {partner.name}
        </h3>
        <p className="mt-1 line-clamp-1 text-[11px] font-semibold text-[#52657d]">
          <FaMapMarkerAlt className="mr-1 inline text-[#0a2f66]" />
          {partner.location || label(partner.organizationType)}
        </p>
        <p className="mt-2 line-clamp-2 min-h-9 text-xs leading-5 text-[#52657d]">
          {partner.description || "Verified partner supporting student opportunities."}
        </p>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          {[
            [partner.eventCount, "Events", FaCalendarAlt, "text-red-500"],
            [partner.schoolCount, "Schools", FaSchool, "text-amber-500"],
            [partner.studentCount, "Students", FaUsers, "text-cyan-600"],
          ].map(([value, statLabel, Icon, color]) => (
            <div key={statLabel} className="min-w-0">
              <p className="inline-flex items-center justify-center gap-1 text-xs font-black text-[#17120a]">
                <Icon className={color} />
                {numberLabel(value)}
              </p>
              <p className="mt-0.5 truncate text-[10px] font-semibold text-[#52657d]">
                {statLabel}
              </p>
            </div>
          ))}
        </div>
        <span className="mt-3 inline-flex min-h-8 w-full items-center justify-center gap-2 rounded-lg border border-purple-200 text-xs font-black text-purple-700 transition group-hover:bg-purple-50">
          View Profile
          <FaArrowRight />
        </span>
      </div>
    </Link>
  );
}

function PartnerGridCard({ partner }) {
  return (
    <Link
      href={`/partners/${partner.slug}`}
      className="group overflow-hidden rounded-xl border border-[#e6eaf7] bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-purple-200 hover:shadow-lg"
    >
      <div className="relative">
        <PartnerVisual partner={partner} compact />
        <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[9px] font-black uppercase text-emerald-700 shadow-sm">
          <FaCheckCircle />
          Verified
        </span>
      </div>
      <div className="relative px-4 pb-4 pt-0">
        <PartnerLogo partner={partner} className="-mt-7 mb-2 h-12 w-12 rounded-full border-[3px] border-white shadow-md" />
        <h3 className="line-clamp-1 text-[15px] font-black text-[#17120a] group-hover:text-purple-700">
          {partner.name}
        </h3>
        <p className="mt-1 line-clamp-1 text-[11px] font-semibold text-[#52657d]">
          <FaMapMarkerAlt className="mr-1 inline text-[#0a2f66]" />
          {label(primaryRole(partner))} - {partner.location || label(partner.organizationType)}
        </p>
        <p className="mt-2 line-clamp-2 min-h-9 text-xs leading-5 text-[#52657d]">
          {partner.description || "Verified partner supporting public student activities."}
        </p>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          {[
            [partner.eventCount, "Events", FaCalendarAlt, "text-red-500"],
            [partner.schoolCount, "Schools", FaSchool, "text-amber-500"],
            [partner.studentCount, "Students", FaUsers, "text-cyan-600"],
          ].map(([value, statLabel, Icon, color]) => (
            <div key={statLabel} className="min-w-0">
              <p className="inline-flex items-center justify-center gap-1 text-xs font-black text-[#17120a]">
                <Icon className={color} />
                {numberLabel(value)}
              </p>
              <p className="mt-0.5 truncate text-[10px] font-semibold text-[#52657d]">
                {statLabel}
              </p>
            </div>
          ))}
        </div>
        <span className="mt-3 inline-flex min-h-8 w-full items-center justify-center gap-2 rounded-lg border border-purple-200 text-xs font-black text-purple-700 transition group-hover:bg-purple-50">
          View Profile
          <FaArrowRight />
        </span>
      </div>
    </Link>
  );
}

function RightRail({ totals, partners }) {
  const categoryCounts = partners.reduce((map, partner) => {
    const category = partnerCategory(partner);
    map.set(category, (map.get(category) || 0) + 1);
    return map;
  }, new Map());

  return (
    <aside className="hidden lg:block">
      <div className="sticky top-24 space-y-5">
        <section className="rounded-2xl border border-[#e6eaf7] bg-white p-5 shadow-sm">
          <h2 className="text-sm font-black text-[#17120a]">Partners</h2>
          <div className="mt-4 grid gap-3">
            {[
              ["Active partners", totals.partnerCount, FaHandshake],
              ["Events collaborated", totals.eventCount, FaCalendarAlt],
              ["Schools connected", totals.schoolCount, FaSchool],
              ["Across all partnerships", totals.studentCount, FaUsers],
            ].map(([title, value, Icon]) => (
              <div key={title} className="flex items-center gap-3 rounded-xl bg-[#f8fbff] px-3 py-3">
                <Icon className="text-purple-700" />
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-black text-[#0a2f66]">{numberLabel(value)}</p>
                  <p className="text-[10px] font-bold uppercase text-[#52657d]">{title}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-[#e6eaf7] bg-white p-5 shadow-sm">
          <h2 className="text-sm font-black text-[#17120a]">Partner Categories</h2>
          <div className="mt-4 space-y-3">
            {[
              "Event Partners",
              "Sponsors",
              "Media Partners",
              "Training Partners",
              "Venue Partners",
            ].map((category) => {
              return (
                <div key={category} className="flex items-center gap-3 rounded-xl bg-[#f8fbff] px-3 py-2">
                  <PartnerCategoryIcon
                    category={category}
                    className="text-purple-700"
                  />
                  <span className="min-w-0 flex-1 text-sm font-bold text-[#24314d]">
                    {category}
                  </span>
                  <span className="rounded-full bg-white px-2 py-1 text-xs font-black text-[#52657d]">
                    {categoryCounts.get(category) || 0}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-purple-700 to-[#0a2f66] p-5 text-white shadow-[0_18px_45px_rgba(88,28,135,0.22)]">
          <div className="flex items-start gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15">
              <FaShieldAlt className="text-2xl text-amber-300" />
            </span>
            <div>
              <h2 className="text-sm font-black">Partner with Pratyo</h2>
              <p className="mt-2 text-xs leading-5 text-white/80">
                Collaborate with schools, empower students, and create meaningful impact.
              </p>
            </div>
          </div>
          <Link
            href="/organize-event"
            className="mt-5 inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-black text-purple-700"
          >
            Become a Partner
            <FaArrowRight />
          </Link>
        </section>
      </div>
    </aside>
  );
}

function CollaborationStrip({ events }) {
  if (!events.length) return null;

  return (
    <section className="rounded-2xl border border-[#e6eaf7] bg-white p-4 shadow-sm">
      <h2 className="text-sm font-black text-[#17120a]">Recent Collaborations</h2>
      <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
        {events.slice(0, 8).map((event) => (
          <Link
            key={event.id}
            href={`/events/${event.id}`}
            className="grid min-w-[230px] grid-cols-[44px_1fr] gap-3 rounded-xl border border-[#e6eaf7] bg-[#f8fbff] p-3 transition hover:bg-white"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-50 text-purple-700">
              <FaTrophy />
            </span>
            <span className="min-w-0">
              <strong className="line-clamp-1 text-xs text-[#17120a]">
                {event.title}
              </strong>
              <span className="mt-1 block text-[10px] font-semibold text-[#52657d]">
                {event.partnerName} - {event.studentCount} students
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
  const [location, setLocation] = useState("All Locations");
  const [level, setLevel] = useState("All Levels");
  const [sort, setSort] = useState("Most Active");
  const [quickView, setQuickView] = useState("All Partners");

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
        .slice(0, 4),
    [partners]
  );

  const categories = useMemo(
    () => ["All Categories", ...new Set(partners.map(partnerCategory))],
    [partners]
  );
  const locations = useMemo(
    () => [
      "All Locations",
      ...new Set(partners.map((partner) => partner.location || "Location not listed")),
    ],
    [partners]
  );
  const levels = useMemo(
    () => ["All Levels", ...new Set(partners.map((partner) => label(partner.trustLevel)))],
    [partners]
  );

  const filteredPartners = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return partners
      .filter((partner) => {
        const searchable = `${partner.name} ${partner.location} ${partner.description} ${partner.partnerRoles?.join(" ")}`.toLowerCase();
        if (normalizedQuery && !searchable.includes(normalizedQuery)) return false;
        if (category !== "All Categories" && partnerCategory(partner) !== category) return false;
        if (location !== "All Locations" && (partner.location || "Location not listed") !== location) return false;
        if (level !== "All Levels" && label(partner.trustLevel) !== level) return false;
        if (quickView !== "All Partners" && partnerCategory(partner) !== quickView) return false;
        return true;
      })
      .sort((a, b) => {
        if (sort === "Most Schools") return b.schoolCount - a.schoolCount;
        if (sort === "Most Students") return b.studentCount - a.studentCount;
        if (sort === "Recently Joined") {
          return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        }
        return b.eventCount + b.schoolCount - (a.eventCount + a.schoolCount);
      });
  }, [category, level, location, partners, query, quickView, sort]);

  return (
    <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_280px]">
      <div className="min-w-0 space-y-5">
        <section className="overflow-hidden rounded-2xl border border-[#e6eaf7] bg-white shadow-sm">
          <div className="grid gap-4 p-6 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-center lg:p-7">
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase text-purple-700">
                Partner Portfolio
              </p>
              <h1 className="mt-3 max-w-2xl text-4xl font-black leading-tight text-[#17120a] md:text-5xl">
                Organizations helping schools create{" "}
                <span className="text-purple-700">opportunities</span>
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-6 text-[#52657d] md:text-base md:leading-7">
                Platform-approved partners connected to public student events,
                competitions, sponsorships, and published outcomes.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/organize-event"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-purple-700 px-5 text-sm font-black text-white shadow-lg shadow-purple-700/15 transition hover:bg-purple-800"
                >
                  Propose an event
                  <FaArrowRight />
                </Link>
                <Link
                  href="#partners"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#e6eaf7] bg-white px-5 text-sm font-black text-purple-700 transition hover:bg-purple-50"
                >
                  How partnerships work
                  <FaArrowRight />
                </Link>
              </div>
            </div>

            <div className="relative min-h-64 overflow-hidden rounded-2xl bg-gradient-to-br from-purple-50 via-white to-amber-50">
              <PartnerVisual partner={featuredPartners[0] || partners[0] || { name: "Partner" }} />
              <div className="absolute bottom-6 left-1/2 grid w-[88%] -translate-x-1/2 grid-cols-3 gap-2 rounded-2xl border border-[#e6eaf7] bg-white/95 p-3 shadow-xl">
                {[
                  [totals.partnerCount, "Partners"],
                  [totals.eventCount, "Events"],
                  [totals.schoolCount, "Schools"],
                ].map(([value, statLabel]) => (
                  <div key={statLabel} className="text-center">
                    <p className="text-lg font-black text-[#0a2f66]">{numberLabel(value)}</p>
                    <p className="text-[10px] font-bold text-[#52657d]">{statLabel}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 rounded-2xl border border-[#e6eaf7] bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
          {[
            [totals.partnerCount, "Partners onboarded", FaHandshake],
            [totals.eventCount, "Events collaborated", FaCalendarAlt],
            [totals.schoolCount, "Schools connected", FaSchool],
            [totals.studentCount, "Students impacted", FaUsers],
          ].map(([value, statLabel, Icon]) => (
            <div key={statLabel} className="flex items-center gap-3 rounded-xl bg-[#f8fbff] px-4 py-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-purple-700 shadow-sm">
                <Icon />
              </span>
              <span>
                <strong className="block text-xl font-black text-[#0a2f66]">
                  {numberLabel(value)}
                </strong>
                <span className="text-xs font-bold text-[#52657d]">{statLabel}</span>
              </span>
            </div>
          ))}
        </section>

        <section className="rounded-2xl border border-[#e6eaf7] bg-white p-4 shadow-sm">
          <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1fr_auto] lg:items-end">
            <label className="block min-w-0">
              <span className="mb-1.5 flex items-center gap-2 text-[10px] font-black uppercase text-[#52657d]">
                <FaSearch className="text-purple-700" />
                Search
              </span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search partners..."
                className="min-h-11 w-full rounded-xl border border-[#e6eaf7] bg-white px-4 text-sm font-semibold text-[#24314d] outline-none transition placeholder:text-[#8a9ab1] focus:border-purple-300 focus:ring-4 focus:ring-purple-50"
              />
            </label>
            <FilterSelect label="Category" value={category} onChange={setCategory} options={categories} />
            <FilterSelect label="Location" value={location} onChange={setLocation} options={locations} />
            <FilterSelect label="Level" value={level} onChange={setLevel} options={levels} />
            <FilterSelect
              label="Sort By"
              value={sort}
              onChange={setSort}
              options={["Most Active", "Most Schools", "Most Students", "Recently Joined"]}
            />
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setCategory("All Categories");
                setLocation("All Locations");
                setLevel("All Levels");
                setSort("Most Active");
                setQuickView("All Partners");
              }}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#e6eaf7] px-4 text-sm font-black text-[#0a2f66] transition hover:bg-[#f8fbff]"
            >
              <FaSyncAlt />
              Clear
            </button>
          </div>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {[
              "All Partners",
              "Event Partners",
              "Sponsors",
              "Media Partners",
              "Training Partners",
            ].map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setQuickView(item)}
                className={`min-h-10 shrink-0 rounded-full px-4 text-xs font-black transition ${
                  quickView === item
                    ? "bg-purple-700 text-white"
                    : "border border-[#e6eaf7] bg-white text-[#24314d] hover:bg-purple-50 hover:text-purple-700"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-[#17120a]">Featured Partners</h2>
              <p className="text-xs font-semibold text-[#52657d]">
                Verified organizations creating student opportunities
              </p>
            </div>
            <Link href="#partners" className="inline-flex items-center gap-2 text-sm font-black text-purple-700">
              View all featured
              <FaArrowRight />
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {featuredPartners.map((partner, index) => (
              <FeaturedPartnerCard
                key={partner.id}
                partner={partner}
                premium={index % 2 === 1}
              />
            ))}
          </div>
        </section>

        <section id="partners" className="scroll-mt-28 space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-[#17120a]">All Partners</h2>
              <p className="text-xs font-semibold text-[#52657d]">
                Showing {filteredPartners.length} of {partners.length} partners
              </p>
            </div>
            <Link href="/organize-event" className="inline-flex items-center gap-2 text-sm font-black text-purple-700">
              Become a partner
              <FaArrowRight />
            </Link>
          </div>
          {filteredPartners.length === 0 ? (
            <div className="rounded-2xl border border-[#e6eaf7] bg-white p-10 text-center text-sm font-semibold text-[#52657d]">
              No partners match these filters yet.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {filteredPartners.map((partner) => (
                <PartnerGridCard key={partner.id} partner={partner} />
              ))}
            </div>
          )}
        </section>

        <CollaborationStrip events={recentEvents} />

        <section className="flex flex-col gap-4 rounded-2xl border border-purple-200 bg-gradient-to-r from-purple-50 to-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-purple-700 shadow-sm">
              <FaSeedling />
            </span>
            <div>
              <h2 className="text-lg font-black text-[#17120a]">
                Let&apos;s build opportunities together
              </h2>
              <p className="text-sm text-[#52657d]">
                Join our partner network and help students shine brighter.
              </p>
            </div>
          </div>
          <Link
            href="/organize-event"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-purple-700 px-5 text-sm font-black text-white"
          >
            Become a Partner
            <FaArrowRight />
          </Link>
        </section>
      </div>

      <RightRail totals={totals} partners={partners} />
    </div>
  );
}
