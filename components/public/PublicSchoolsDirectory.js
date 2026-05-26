"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  FaArrowRight,
  FaBuilding,
  FaCheckCircle,
  FaFilter,
  FaGraduationCap,
  FaLayerGroup,
  FaMapMarkerAlt,
  FaRegEye,
  FaSchool,
  FaSearch,
  FaShieldAlt,
  FaSlidersH,
  FaStar,
  FaSyncAlt,
  FaTrophy,
  FaUsers,
} from "react-icons/fa";

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

function getCategory(school) {
  const hosted = metricValue(school, "eventsHosted");
  const joined = metricValue(school, "eventsParticipated");
  const awards = metricValue(school, "awardsCount");
  if (awards >= hosted && awards >= joined && awards > 0) return "Awarded Schools";
  if (hosted >= joined && hosted > 0) return "Event Hosts";
  if (joined > 0) return "Active Participants";
  return "Public Profiles";
}

function SchoolVisual({ school, className = "" }) {
  const image = school.profile?.coverImageUrl;
  return (
    <div
      className={`relative overflow-hidden bg-[#eef6ff] ${className}`.trim()}
      style={
        image
          ? {
              backgroundImage: `linear-gradient(rgba(255,255,255,0.04), rgba(7,24,51,0.18)), url(${image})`,
              backgroundPosition: "center",
              backgroundSize: "cover",
            }
          : undefined
      }
    >
      {!image && (
        <>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(168,85,247,0.18),transparent_26%),radial-gradient(circle_at_82%_70%,rgba(245,158,11,0.18),transparent_28%)]" />
          <FaSchool className="absolute bottom-4 right-5 text-6xl text-[#0a2f66]/25" />
          <FaGraduationCap className="absolute left-5 top-5 text-4xl text-purple-600/40" />
        </>
      )}
    </div>
  );
}

function SelectShell({ label, value, children }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 flex items-center gap-2 text-[10px] font-black uppercase text-[#52657d]">
        <FaFilter className="text-purple-700" />
        {label}
      </span>
      {children || (
        <div className="flex min-h-11 items-center justify-between rounded-xl border border-[#e6eaf7] bg-white px-3 text-sm font-bold text-[#24314d]">
          <span className="truncate">{value}</span>
          <FaSlidersH className="shrink-0 text-[#0a2f66]" />
        </div>
      )}
    </label>
  );
}

function FeaturedSchoolCard({ school, premium = false }) {
  return (
    <Link
      href={`/schools/${school.id}`}
      className="group overflow-hidden rounded-xl border border-[#e6eaf7] bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-purple-200 hover:shadow-lg"
    >
      <div className="relative">
        <SchoolVisual school={school} className="h-[104px]" />
        <span
          className={`absolute left-2 top-2 rounded-md px-2 py-1 text-[9px] font-black uppercase text-white shadow-sm ${
            premium ? "bg-amber-400" : "bg-blue-600"
          }`}
        >
          {premium ? "Premium" : "Featured"}
        </span>
      </div>
      <div className="relative px-4 pb-4 pt-0">
        <div className="-mt-7 mb-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border-[3px] border-white bg-gradient-to-br from-purple-600 to-[#0a2f66] text-lg font-black text-white shadow-md">
            {school.name.charAt(0)}
          </div>
        </div>
        <h3 className="line-clamp-1 text-[15px] font-black text-[#17120a] group-hover:text-purple-700">
          {school.name}
        </h3>
        <p className="mt-1 line-clamp-1 text-[11px] font-semibold text-[#52657d]">
          <FaMapMarkerAlt className="mr-1 inline text-[#0a2f66]" />
          {school.location || "Location not listed"}
        </p>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          {[
            [metricValue(school, "eventsHosted"), "Events", FaBuilding, "text-red-500"],
            [metricValue(school, "awardsCount"), "Awards", FaTrophy, "text-amber-500"],
            [school.studentCount, "Students", FaUsers, "text-cyan-600"],
          ].map(([value, label, Icon, color]) => (
            <div key={label} className="min-w-0">
              <p className="inline-flex items-center justify-center gap-1 text-xs font-black text-[#17120a]">
                <Icon className={color} />
                {numberLabel(value)}
              </p>
              <p className="mt-0.5 truncate text-[10px] font-semibold text-[#52657d]">
                {label}
              </p>
            </div>
          ))}
        </div>
        <span className="mt-3 inline-flex min-h-8 w-full items-center justify-center gap-2 rounded-lg border border-purple-200 text-xs font-black text-purple-700 transition group-hover:bg-purple-50">
          View Portfolio
          <FaArrowRight />
        </span>
      </div>
    </Link>
  );
}

function SchoolGridCard({ school }) {
  return (
    <Link
      href={`/schools/${school.id}`}
      className="group overflow-hidden rounded-xl border border-[#e6eaf7] bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-purple-200 hover:shadow-lg"
    >
      <div className="relative">
        <SchoolVisual school={school} className="h-[104px]" />
        <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[9px] font-black uppercase text-emerald-700 shadow-sm">
          <FaCheckCircle />
          Verified
        </span>
      </div>
      <div className="relative px-4 pb-4 pt-0">
        <div className="-mt-7 mb-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border-[3px] border-white bg-gradient-to-br from-purple-600 to-[#0a2f66] text-lg font-black text-white shadow-md">
            {school.name.charAt(0)}
          </div>
        </div>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="line-clamp-1 text-[15px] font-black text-[#17120a] group-hover:text-purple-700">
              {school.name}
            </h3>
            <p className="mt-1 line-clamp-1 text-[11px] font-semibold text-[#52657d]">
              <FaMapMarkerAlt className="mr-1 inline text-[#0a2f66]" />
              {school.location || "Location not listed"}
            </p>
          </div>
          <FaArrowRight className="mt-1 shrink-0 text-purple-700 opacity-0 transition group-hover:opacity-100" />
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          {[
            [metricValue(school, "eventsHosted"), "Events", FaBuilding, "text-red-500"],
            [metricValue(school, "awardsCount"), "Awards", FaTrophy, "text-amber-500"],
            [school.studentCount, "Students", FaUsers, "text-cyan-600"],
          ].map(([value, label, Icon, color]) => (
            <div key={label} className="min-w-0">
              <p className="inline-flex items-center justify-center gap-1 text-xs font-black text-[#17120a]">
                <Icon className={color} />
                {numberLabel(value)}
              </p>
              <p className="mt-0.5 truncate text-[10px] font-semibold text-[#52657d]">
                {label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </Link>
  );
}

function RightRail({ totals }) {
  return (
    <aside className="hidden lg:block">
      <div className="sticky top-24 space-y-5">
        <section className="rounded-2xl border border-[#e6eaf7] bg-white p-5 shadow-sm">
          <h2 className="text-sm font-black text-[#17120a]">
            Why Schools Join Pratyo?
          </h2>
          <div className="mt-4 space-y-4">
            {[
              [FaRegEye, "Increase Visibility", "Show achievements to students and parents."],
              [FaStar, "Build Reputation", "Highlight awards, events, and student success."],
              [FaUsers, "Connect & Collaborate", "Partner with other schools and organizers."],
              [FaGraduationCap, "Empower Students", "Provide opportunities that inspire growth."],
            ].map(([Icon, title, text]) => (
              <div key={title} className="flex gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple-50 text-purple-700">
                  <Icon />
                </span>
                <span>
                  <strong className="block text-sm text-[#17120a]">{title}</strong>
                  <span className="text-xs leading-5 text-[#52657d]">{text}</span>
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-purple-700 to-[#0a2f66] p-5 text-white shadow-[0_18px_45px_rgba(88,28,135,0.22)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-sm font-black">Is your school active?</h2>
              <p className="mt-2 text-xs leading-5 text-white/80">
                Claim your profile to update info, add events, and highlight achievements.
              </p>
            </div>
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15">
              <FaShieldAlt className="text-2xl text-amber-300" />
            </span>
          </div>
          <Link
            href="/register"
            className="mt-5 inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-black text-purple-700"
          >
            Claim School Profile
            <FaArrowRight />
          </Link>
        </section>

        <section className="rounded-2xl border border-[#e6eaf7] bg-white p-5 shadow-sm">
          <h2 className="text-sm font-black text-[#17120a]">Top Categories</h2>
          <div className="mt-4 space-y-3">
            {[
              ["Active Profiles", totals.schoolCount, FaSchool],
              ["Events Hosted", totals.hostedEventCount, FaBuilding],
              ["Awards Earned", totals.awardCount, FaTrophy],
              ["Joined Events", totals.joinedEventCount, FaLayerGroup],
              ["Students Listed", totals.studentCount, FaUsers],
            ].map(([label, value, Icon]) => (
              <div key={label} className="flex items-center gap-3 rounded-xl bg-[#f8fbff] px-3 py-2">
                <Icon className="text-purple-700" />
                <span className="min-w-0 flex-1 text-sm font-bold text-[#24314d]">{label}</span>
                <span className="rounded-full bg-white px-2 py-1 text-xs font-black text-[#52657d]">
                  {numberLabel(value)}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </aside>
  );
}

export default function PublicSchoolsDirectory({ schools = [], spotlights = [], totals }) {
  const [query, setQuery] = useState("");
  const [province, setProvince] = useState("All Provinces");
  const [district, setDistrict] = useState("All Districts");
  const [category, setCategory] = useState("All Categories");
  const [sort, setSort] = useState("Most Active");
  const [quickView, setQuickView] = useState("All Schools");

  const featuredSchools = useMemo(() => {
    if (spotlights.length > 0) {
      return spotlights.map((promotion) => ({
        id: promotion.schoolId,
        name: promotion.title,
        location: promotion.location,
        studentCount: promotion.studentCount || 0,
        profile: promotion.profile || {},
      }));
    }
    return [...schools]
      .sort(
        (a, b) =>
          metricValue(b, "awardsCount") +
          metricValue(b, "eventsHosted") -
          (metricValue(a, "awardsCount") + metricValue(a, "eventsHosted"))
      )
      .slice(0, 4);
  }, [schools, spotlights]);

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
  const categories = useMemo(
    () => ["All Categories", ...new Set(schools.map(getCategory))],
    [schools]
  );

  const filteredSchools = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return schools
      .filter((school) => {
        const searchable = `${school.name} ${school.location} ${school.profile?.tagline || ""} ${school.profile?.summary || ""}`.toLowerCase();
        if (normalizedQuery && !searchable.includes(normalizedQuery)) return false;
        if (province !== "All Provinces" && getProvince(school) !== province) return false;
        if (district !== "All Districts" && getDistrict(school) !== district) return false;
        if (category !== "All Categories" && getCategory(school) !== category) return false;
        if (quickView === "Most Awarded" && metricValue(school, "awardsCount") === 0) return false;
        return true;
      })
      .sort((a, b) => {
        if (quickView === "Recently Joined" || sort === "Recently Joined") {
          return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        }
        if (sort === "Most Awarded") {
          return metricValue(b, "awardsCount") - metricValue(a, "awardsCount");
        }
        return (
          metricValue(b, "eventsHosted") +
          metricValue(b, "eventsParticipated") +
          metricValue(b, "awardsCount") -
          (metricValue(a, "eventsHosted") +
            metricValue(a, "eventsParticipated") +
            metricValue(a, "awardsCount"))
        );
      });
  }, [category, district, province, query, quickView, schools, sort]);

  return (
    <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_280px]">
      <div className="min-w-0 space-y-5">
        <section className="overflow-hidden rounded-2xl border border-[#e6eaf7] bg-white shadow-sm">
          <div className="grid gap-4 p-6 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-center lg:p-7">
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase text-purple-700">
                Explore Schools
              </p>
              <h1 className="mt-3 max-w-2xl text-4xl font-black leading-tight text-[#17120a] md:text-5xl">
                Discover active schools driving{" "}
                <span className="text-purple-700">talent</span> and{" "}
                <span className="text-amber-500">excellence</span>
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-6 text-[#52657d] md:text-base md:leading-7">
                Find schools participating in events, celebrating achievements,
                and nurturing student potential across Nepal.
              </p>
            </div>

            <div className="relative min-h-64 overflow-hidden rounded-2xl bg-gradient-to-br from-[#f8fbff] via-white to-amber-50">
              <SchoolVisual school={featuredSchools[0] || schools[0] || { profile: {} }} className="absolute inset-x-7 top-7 h-44 rounded-[2rem]" />
              <div className="absolute bottom-6 left-1/2 grid w-[88%] -translate-x-1/2 grid-cols-3 gap-2 rounded-2xl border border-[#e6eaf7] bg-white/95 p-3 shadow-xl">
                {[
                  [totals.schoolCount, "Schools"],
                  [totals.eventCount, "Events"],
                  [totals.studentCount, "Students"],
                ].map(([value, label]) => (
                  <div key={label} className="text-center">
                    <p className="text-lg font-black text-[#0a2f66]">{numberLabel(value)}</p>
                    <p className="text-[10px] font-bold text-[#52657d]">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
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
                placeholder="Search schools by name or location..."
                className="min-h-11 w-full rounded-xl border border-[#e6eaf7] bg-white px-4 text-sm font-semibold text-[#24314d] outline-none transition placeholder:text-[#8a9ab1] focus:border-purple-300 focus:ring-4 focus:ring-purple-50"
              />
            </label>
            <SelectShell label="Province">
              <select
                value={province}
                onChange={(event) => {
                  setProvince(event.target.value);
                  setDistrict("All Districts");
                }}
                className="min-h-11 w-full rounded-xl border border-[#e6eaf7] bg-white px-3 text-sm font-bold text-[#24314d] outline-none"
              >
                {provinces.map((item) => <option key={item}>{item}</option>)}
              </select>
            </SelectShell>
            <SelectShell label="District">
              <select value={district} onChange={(event) => setDistrict(event.target.value)} className="min-h-11 w-full rounded-xl border border-[#e6eaf7] bg-white px-3 text-sm font-bold text-[#24314d] outline-none">
                {districts.map((item) => <option key={item}>{item}</option>)}
              </select>
            </SelectShell>
            <SelectShell label="Category">
              <select value={category} onChange={(event) => setCategory(event.target.value)} className="min-h-11 w-full rounded-xl border border-[#e6eaf7] bg-white px-3 text-sm font-bold text-[#24314d] outline-none">
                {categories.map((item) => <option key={item}>{item}</option>)}
              </select>
            </SelectShell>
            <SelectShell label="Sort By">
              <select value={sort} onChange={(event) => setSort(event.target.value)} className="min-h-11 w-full rounded-xl border border-[#e6eaf7] bg-white px-3 text-sm font-bold text-[#24314d] outline-none">
                {["Most Active", "Most Awarded", "Recently Joined"].map((item) => <option key={item}>{item}</option>)}
              </select>
            </SelectShell>
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setProvince("All Provinces");
                setDistrict("All Districts");
                setCategory("All Categories");
                setSort("Most Active");
                setQuickView("All Schools");
              }}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#e6eaf7] px-4 text-sm font-black text-[#0a2f66] transition hover:bg-[#f8fbff]"
            >
              <FaSyncAlt />
              Clear
            </button>
          </div>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {[
              "All Schools",
              "Most Active",
              "Most Awarded",
              "Recently Joined",
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

        <section id="spotlights" className="scroll-mt-28 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-[#17120a]">Featured Schools</h2>
              <p className="text-xs font-semibold text-[#52657d]">
                Spotlighted schools making an impact
              </p>
            </div>
            <Link href="#schools" className="inline-flex items-center gap-2 text-sm font-black text-purple-700">
              View all featured
              <FaArrowRight />
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {featuredSchools.slice(0, 4).map((school, index) => (
              <FeaturedSchoolCard key={`${school.id}-${index}`} school={school} premium={index > 1} />
            ))}
          </div>
        </section>

        <section id="schools" className="scroll-mt-28 space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-[#17120a]">All Schools</h2>
              <p className="text-xs font-semibold text-[#52657d]">
                Showing {filteredSchools.length} of {schools.length} schools
              </p>
            </div>
            <Link href="/register" className="inline-flex items-center gap-2 text-sm font-black text-purple-700">
              Register your school
              <FaArrowRight />
            </Link>
          </div>

          {filteredSchools.length === 0 ? (
            <div className="rounded-2xl border border-[#e6eaf7] bg-white p-10 text-center text-sm font-semibold text-[#52657d]">
              No schools match these filters yet.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {filteredSchools.map((school) => (
                <SchoolGridCard key={school.id} school={school} />
              ))}
            </div>
          )}
        </section>
      </div>

      <RightRail totals={totals} />
    </div>
  );
}
