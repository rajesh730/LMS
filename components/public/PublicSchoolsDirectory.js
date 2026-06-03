"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  FaArrowRight,
  FaBuilding,
  FaCheckCircle,
  FaLayerGroup,
  FaMapMarkerAlt,
  FaSearch,
  FaSyncAlt,
  FaTrophy,
  FaUsers,
} from "react-icons/fa";
import { normalizeImageUrl } from "@/lib/imageUrls";

function numberLabel(value) {
  const count = Number(value || 0);
  if (count >= 1000) return `${(count / 1000).toFixed(count >= 10000 ? 0 : 1)}k+`;
  return String(count);
}

function metricValue(school, key) {
  return Number(school.profile?.highlightMetrics?.[key] || 0);
}

function getProvince(school) {
  return school.province || "Province not listed";
}

function getDistrict(school) {
  return school.district || "District not listed";
}

function scoreSchool(school) {
  return (
    metricValue(school, "eventsHosted") * 12 +
    metricValue(school, "eventsParticipated") * 8 +
    metricValue(school, "awardsCount") * 16 +
    Number(school.studentCount || 0)
  );
}

function SchoolMark({ school, size = "h-12 w-12" }) {
  const [imageFailed, setImageFailed] = useState(false);
  const image = normalizeImageUrl(school.profile?.coverImageUrl);
  const initial = (school.name || "S").charAt(0).toUpperCase();
  return (
    <span
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#f4f1ff] text-lg font-black text-[#4326e8] ${size}`.trim()}
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
      <span className="mb-1.5 flex items-center gap-2 text-[10px] font-black uppercase text-[#52657d]">
        {label}
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

function SchoolRow({ school }) {
  const metrics = [
    [metricValue(school, "eventsHosted"), "Hosted", FaBuilding],
    [metricValue(school, "eventsParticipated"), "Joined", FaLayerGroup],
    [metricValue(school, "awardsCount"), "Awards", FaTrophy],
    [school.studentCount, "Students", FaUsers],
  ];

  return (
    <Link
      href={`/schools/${school.id}`}
      className="group grid gap-4 rounded-xl border border-[#e6eaf7] bg-white p-4 shadow-sm transition hover:border-[#cfc4ff] hover:shadow-md md:grid-cols-[64px_minmax(0,1fr)_auto]"
    >
      <SchoolMark school={school} size="h-14 w-14" />
      <div className="min-w-0">
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase text-emerald-800">
            <FaCheckCircle />
            Verified
          </span>
        </div>
        <h3 className="mt-2 break-words text-base font-black text-[#17120a] group-hover:text-[#4326e8]">
          {school.name}
        </h3>
        <p className="mt-1 flex items-start gap-2 text-sm leading-5 text-[#52657d]">
          <FaMapMarkerAlt className="mt-1 shrink-0 text-[#4326e8]" />
          <span>{school.location || "Location not listed"}</span>
        </p>
        {school.profile?.summary && (
          <p className="mt-2 line-clamp-2 text-sm leading-5 text-[#52657d]">
            {school.profile.summary}
          </p>
        )}
        <div className="mt-3 grid gap-2 text-xs sm:grid-cols-4">
          {metrics.map(([value, label, Icon]) => (
            <span
              key={label}
              className="flex items-center gap-2 rounded-lg bg-[#f8f9fd] px-3 py-2 font-bold text-[#24314d]"
            >
              <Icon className="text-[#4326e8]" />
              {numberLabel(value)} {label}
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

export default function PublicSchoolsDirectory({ schools = [] }) {
  const [query, setQuery] = useState("");
  const [province, setProvince] = useState("All Provinces");
  const [district, setDistrict] = useState("All Districts");

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
      .filter((school) => {
        const searchable = `${school.name} ${school.location} ${school.profile?.tagline || ""} ${school.profile?.summary || ""}`.toLowerCase();
        if (normalizedQuery && !searchable.includes(normalizedQuery)) return false;
        if (province !== "All Provinces" && getProvince(school) !== province) return false;
        if (district !== "All Districts" && getDistrict(school) !== district) return false;
        return true;
      })
      .sort((a, b) => scoreSchool(b) - scoreSchool(a));
  }, [district, province, query, schools]);

  const clearFilters = () => {
    setQuery("");
    setProvince("All Provinces");
    setDistrict("All Districts");
  };

  return (
    <div className="min-w-0">
      <div className="min-w-0 space-y-5">
        <section className="rounded-xl border border-[#e6eaf7] bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase text-[#4326e8]">
                Schools
              </p>
              <h1 className="mt-2 max-w-3xl text-3xl font-black leading-tight text-[#17120a] md:text-4xl">
                Discover verified school profiles, events, and achievements.
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#52657d]">
                A clean public directory for students, parents, and partners to
                explore active schools on Pratyo.
              </p>
            </div>
            <Link
              href="/register"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#4326e8] px-5 text-sm font-black text-white transition hover:bg-[#3217d3]"
            >
              Register School
              <FaArrowRight />
            </Link>
          </div>
        </section>

        <section className="rounded-xl border border-[#e6eaf7] bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
            <label className="block min-w-0 lg:flex-1">
              <span className="mb-1.5 flex items-center gap-2 text-[10px] font-black uppercase text-[#52657d]">
                <FaSearch className="text-[#4326e8]" />
                Search
              </span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search school or location..."
                className="min-h-11 w-full rounded-lg border border-[#e6eaf7] bg-[#f8f9fd] px-4 text-sm font-semibold text-[#24314d] outline-none transition placeholder:text-[#8a9ab1] focus:border-[#4326e8] focus:bg-white focus:ring-4 focus:ring-[#4326e8]/10"
              />
            </label>
            <SelectField
              label="Province"
              value={province}
              onChange={(value) => {
                setProvince(value);
                setDistrict("All Districts");
              }}
              options={provinces}
              className="lg:w-56"
            />
            <SelectField
              label="District"
              value={district}
              onChange={setDistrict}
              options={districts}
              className="lg:w-56"
            />
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

        <section id="schools" className="scroll-mt-28 space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-[#17120a]">All Schools</h2>
              <p className="text-xs font-semibold text-[#52657d]">
                Showing {filteredSchools.length} of {schools.length} schools
              </p>
            </div>
          </div>

          {filteredSchools.length === 0 ? (
            <div className="rounded-xl border border-[#e6eaf7] bg-white p-8 text-center text-sm font-semibold text-[#52657d]">
              No schools match these filters yet.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredSchools.map((school) => (
                <SchoolRow key={school.id} school={school} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
