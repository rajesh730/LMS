"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  FaArrowRight,
  FaBuilding,
  FaCheckCircle,
  FaFire,
  FaLayerGroup,
  FaMapMarkerAlt,
  FaNewspaper,
  FaSearch,
  FaSlidersH,
  FaStar,
  FaSyncAlt,
  FaTrophy,
  FaUsers,
} from "react-icons/fa";
import { normalizeImageUrl } from "@/lib/imageUrls";
import PublicRegisterLink from "@/components/public/PublicRegisterLink";

function numberLabel(value) {
  const count = Number(value || 0);
  if (count >= 1000) return `${(count / 1000).toFixed(count >= 10000 ? 0 : 1)}k+`;
  return String(count);
}

function metricValue(school, key) {
  return Number(school.profile?.highlightMetrics?.[key] || 0);
}

function activityValue(school, key) {
  return Number(school.activity?.[key] || 0);
}

function getProvince(school) {
  return school.province || "Province not listed";
}

function getDistrict(school) {
  return school.district || "District not listed";
}

function scoreSchool(school) {
  const spotlightScore = school.spotlight
    ? school.spotlight.priority === "PREMIUM"
      ? 850
      : 650
    : 0;
  const publicPostCount = activityValue(school, "publicPostCount");
  const recentPublicPostCount = activityValue(school, "recentPublicPostCount");
  const lastPublicAt = school.activity?.lastPublicAt
    ? new Date(school.activity.lastPublicAt).getTime()
    : 0;
  const ageDays = lastPublicAt
    ? Math.max(0, (Date.now() - lastPublicAt) / 86400000)
    : 999;
  const freshnessScore = lastPublicAt ? Math.max(0, 90 - ageDays) * 2 : 0;

  return (
    spotlightScore +
    Math.min(publicPostCount, 40) * 18 +
    Math.min(recentPublicPostCount, 12) * 28 +
    freshnessScore +
    metricValue(school, "eventsHosted") * 12 +
    metricValue(school, "eventsParticipated") * 8 +
    metricValue(school, "awardsCount") * 16 +
    Math.min(Number(school.studentCount || 0), 500)
  );
}

function searchScore(school, normalizedQuery) {
  if (!normalizedQuery) return 0;
  const fields = [
    [school.name, 120],
    [school.location, 60],
    [school.district, 45],
    [school.province, 35],
    [school.profile?.tagline, 30],
    [school.profile?.summary, 18],
  ];

  return fields.reduce((score, [value, weight]) => {
    const text = String(value || "").toLowerCase();
    if (!text) return score;
    if (text === normalizedQuery) return score + weight * 2;
    if (text.startsWith(normalizedQuery)) return score + weight * 1.5;
    if (text.includes(normalizedQuery)) return score + weight;
    return score;
  }, 0);
}

function SchoolMark({ school, size = "h-12 w-12" }) {
  const [imageFailed, setImageFailed] = useState(false);
  const image = normalizeImageUrl(school.profile?.coverImageUrl);
  const initial = (school.name || "S").charAt(0).toUpperCase();
  return (
    <span
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#eef4f8] text-lg font-black text-[#1f4e79] ${size}`.trim()}
    >
      {image && !imageFailed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image}
          alt=""
          className="h-full w-full object-contain p-1"
          onError={() => setImageFailed(true)}
        />
      ) : (
        initial
      )}
    </span>
  );
}

function SelectField({ label, value, onChange, options, className = "" }) {
  return (
    <label className={`block min-w-0 ${className}`.trim()}>
      <span className="mb-1.5 flex items-center gap-2 text-[10px] font-bold uppercase text-[#5f6368]">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-11 w-full rounded-full border border-[#dadce0] bg-white px-4 text-sm font-semibold text-[#3c4043] outline-none transition focus:border-[#1a73e8] focus:ring-4 focus:ring-[#1a73e8]/10"
      >
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function SchoolRow({ school }) {
  const metrics = [
    [metricValue(school, "eventsHosted"), "Hosted", FaBuilding],
    [metricValue(school, "eventsParticipated"), "Joined", FaLayerGroup],
    [metricValue(school, "awardsCount"), "Awards", FaTrophy],
    [school.studentCount, "Students", FaUsers],
  ];
  const publicPostCount = activityValue(school, "publicPostCount");
  const recentPublicPostCount = activityValue(school, "recentPublicPostCount");
  const href = school.spotlight?.href || `/schools/${school.id}`;

  return (
    <Link
      href={href}
      className={`school-directory-row group grid grid-cols-[44px_minmax(0,1fr)] gap-3 border-b bg-white px-1 py-5 transition hover:bg-[#f8fbff] md:grid-cols-[64px_minmax(0,1fr)_auto] md:gap-4 md:px-0 md:py-6 ${
        school.spotlight ? "border-[#d7e3ff]" : "border-[#e8eaed]"
      }`}
    >
      <SchoolMark school={school} size="school-directory-logo h-11 w-11 md:h-14 md:w-14" />
      <div className="min-w-0">
        <div className="flex flex-wrap gap-2 md:flex">
          {school.spotlight && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#e8f0fe] px-2.5 py-1 text-[10px] font-black uppercase text-[#1a73e8]">
              <FaStar />
              Featured
            </span>
          )}
          {recentPublicPostCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#fef7e0] px-2.5 py-1 text-[10px] font-black uppercase text-[#b06000]">
              <FaFire />
              Active
            </span>
          )}
          <span className="inline-flex items-center gap-1 rounded-full bg-[#e6f4ea] px-2.5 py-1 text-[10px] font-black uppercase text-[#137333]">
            <FaCheckCircle />
            Verified
          </span>
        </div>
        <h3 className="mt-2 break-words text-lg font-semibold leading-snug text-[#1a0dab] group-hover:underline md:text-xl">
          {school.name}
        </h3>
        <p className="mt-1 flex items-start gap-2 text-xs leading-5 text-[#4d5156] md:text-sm">
          <FaMapMarkerAlt className="mt-1 shrink-0 text-[#1a73e8]" />
          <span className="line-clamp-1 md:line-clamp-none">{school.location || "Location not listed"}</span>
        </p>
        {school.profile?.summary && (
          <p className="school-directory-summary mt-2 line-clamp-2 max-w-5xl text-sm leading-6 text-[#4d5156]">
            {school.profile.summary}
          </p>
        )}
        <div className="school-directory-metrics mt-3 flex flex-wrap gap-2 text-xs md:text-sm">
          {metrics.map(([value, label, Icon]) => (
            <span
              key={label}
              className="flex items-center gap-1.5 text-[#5f6368]"
            >
              <Icon className="text-[#1a73e8]" />
              {numberLabel(value)} {label}
            </span>
          ))}
          <span className="flex items-center gap-1.5 text-[#5f6368]">
            <FaNewspaper className="text-[#1a73e8]" />
            {numberLabel(publicPostCount)} Posts
          </span>
        </div>
      </div>
      <span className="school-directory-action col-span-2 inline-flex min-h-9 items-center justify-center gap-2 self-center rounded-full border border-[#dadce0] px-4 text-xs font-bold text-[#1a73e8] transition group-hover:bg-[#e8f0fe] md:col-span-1 md:min-h-10 md:text-sm">
        View Profile
        <FaArrowRight />
      </span>
    </Link>
  );
}

export default function PublicSchoolsDirectory({ schools = [] }) {
  const [query, setQuery] = useState("");
  const [province, setProvince] = useState("All Provinces");
  const [district, setDistrict] = useState("All Districts");
  const [visibleCount, setVisibleCount] = useState(24);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const provinces = useMemo(
    () => ["All Provinces", ...new Set(schools.map(getProvince))],
    [schools]
  );

  const districts = useMemo(() => {
    const scopedSchools =
      province === "All Provinces"
        ? schools
        : schools.filter((school) => getProvince(school) === province);
    return ["All Districts", ...new Set(scopedSchools.map(getDistrict))];
  }, [province, schools]);

  const filteredSchools = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return schools
      .map((school) => ({
        ...school,
        resultScore:
          scoreSchool(school) + (normalizedQuery ? searchScore(school, normalizedQuery) * 10 : 0),
      }))
      .filter((school) => {
        const searchable = `${school.name} ${school.location} ${school.profile?.tagline || ""} ${school.profile?.summary || ""}`.toLowerCase();
        if (normalizedQuery && !searchable.includes(normalizedQuery)) return false;
        if (province !== "All Provinces" && getProvince(school) !== province) return false;
        if (district !== "All Districts" && getDistrict(school) !== district) return false;
        return true;
      })
      .sort((a, b) => b.resultScore - a.resultScore);
  }, [district, province, query, schools]);

  const visibleSchools = filteredSchools.slice(0, visibleCount);
  const hasMore = visibleCount < filteredSchools.length;

  const clearFilters = () => {
    setQuery("");
    setProvince("All Provinces");
    setDistrict("All Districts");
    setVisibleCount(24);
  };

  return (
    <div className="min-w-0">
      <div className="min-w-0">
        <section className="schools-hero-panel bg-white px-1 pb-5 pt-3 md:px-0 md:pb-7 md:pt-5">
          <div className="flex flex-col gap-5">
            <div className="schools-hero-copy min-w-0">
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase text-[#5f6368]">
                <span className="h-2.5 w-2.5 rounded-full bg-[#4285f4]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#ea4335]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#fbbc04]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#34a853]" />
                School Search
              </div>
              <h1 className="mt-3 max-w-3xl text-3xl font-semibold leading-tight text-[#202124] md:text-4xl">
                Find public school profiles.
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#5f6368]">
                Results are ranked by featured placement, recent public activity,
                events, achievements, and search relevance.
              </p>
            </div>
          </div>
        </section>

        <section className="school-filter-panel sticky top-[64px] z-10 border-b border-[#e8eaed] bg-white/95 px-1 py-3 backdrop-blur md:px-0">
          <button
            type="button"
            onClick={() => setFiltersOpen((open) => !open)}
            className="school-filter-toggle hidden w-full min-h-10 items-center justify-between rounded-full border border-[#dadce0] bg-white px-4 text-sm font-bold text-[#202124]"
            aria-expanded={filtersOpen}
          >
            <span className="inline-flex items-center gap-2">
              <FaSlidersH />
              Search and filters
            </span>
            <span className="text-xs text-[#52657d]">
              {filtersOpen ? "Hide" : "Show"}
            </span>
          </button>
          <div className={`school-filter-fields flex flex-col gap-3 lg:flex-row lg:items-end ${filtersOpen ? "is-open" : ""}`}>
            <label className="block min-w-0 lg:flex-1">
              <span className="sr-only">Search schools</span>
              <div className="flex min-h-14 items-center gap-3 rounded-full border border-[#dadce0] bg-white px-5 shadow-[0_1px_6px_rgba(32,33,36,0.16)] transition focus-within:border-transparent focus-within:shadow-[0_2px_8px_rgba(32,33,36,0.22)]">
                <FaSearch className="shrink-0 text-[#5f6368]" />
                <input
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setVisibleCount(24);
                  }}
                  placeholder="Search school name, place, or profile"
                  className="min-h-12 w-full bg-transparent text-base font-medium text-[#202124] outline-none placeholder:text-[#80868b]"
                />
              </div>
            </label>
            <div className="school-filter-pair grid gap-3 lg:contents">
              <SelectField
                label="Province"
                value={province}
                onChange={(value) => {
                  setProvince(value);
                  setDistrict("All Districts");
                  setVisibleCount(24);
                }}
                options={provinces}
                className="lg:w-56"
              />
              <SelectField
                label="District"
                value={district}
                onChange={(value) => {
                  setDistrict(value);
                  setVisibleCount(24);
                }}
                options={districts}
                className="lg:w-56"
              />
            </div>
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#dadce0] px-4 text-sm font-bold text-[#3c4043] transition hover:bg-[#f8fafd]"
            >
              <FaSyncAlt />
              Clear
            </button>
          </div>
        </section>

        <section id="schools" className="scroll-mt-28">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#e8eaed] px-1 py-4 md:px-0">
            <div>
              <h2 className="text-base font-semibold text-[#202124]">
                {query.trim() ? "Search Results" : "Top School Results"}
              </h2>
              <p className="mt-0.5 text-xs font-medium text-[#70757a]">
                Showing {filteredSchools.length} of {schools.length} public schools
              </p>
            </div>
            <PublicRegisterLink className="schools-register-action" size="md" />
          </div>

          {filteredSchools.length === 0 ? (
            <div className="bg-white p-8 text-center text-sm font-semibold text-[#5f6368]">
              No schools match these filters yet.
            </div>
          ) : (
            <div className="bg-white">
              {visibleSchools.map((school) => (
                <SchoolRow key={school.id} school={school} />
              ))}
              {hasMore && (
                <div className="py-5 text-center">
                  <button
                    type="button"
                    onClick={() => setVisibleCount((count) => count + 24)}
                    className="inline-flex min-h-10 items-center justify-center rounded-full border border-[#dadce0] bg-white px-5 text-sm font-bold text-[#1a73e8] transition hover:bg-[#e8f0fe]"
                  >
                    Load more schools
                  </button>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
