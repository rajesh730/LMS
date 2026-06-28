"use client";

import { useEffect, useMemo, useState } from "react";
import {
  FaCertificate,
  FaExchangeAlt,
  FaFeatherAlt,
  FaGraduationCap,
  FaSchool,
  FaTrophy,
} from "react-icons/fa";
import LoadingState from "@/components/ui/LoadingState";
import AlertBanner from "@/components/ui/AlertBanner";
import EmptyState from "@/components/EmptyState";
import CalendarToggle from "@/components/common/CalendarToggle";
import useCalendarPreference from "@/lib/useCalendarPreference";
import { formatMonthYear } from "@/lib/nepaliDate";

const ENROLLMENT_STATUS = {
  CURRENT: { label: "Current", classes: "bg-emerald-50 text-emerald-700" },
  PROMOTED: { label: "Promoted", classes: "bg-blue-50 text-[var(--brand-primary)]" },
  RETAINED: { label: "Repeated", classes: "bg-amber-50 text-amber-700" },
  TRANSFERRED: { label: "Transferred", classes: "bg-purple-50 text-purple-700" },
  GRADUATED: { label: "Graduated", classes: "bg-slate-100 text-slate-600" },
};

// A human "when did they study here" range for a journey entry, in the viewer's
// chosen calendar (AD or BS).
function formatEnrollmentRange(entry, calendar) {
  const start = formatMonthYear(entry.startedAt, calendar);
  if (entry.status === "CURRENT") {
    return start ? `Since ${start} · Present` : "Present";
  }
  const end = formatMonthYear(entry.endedAt, calendar);
  if (start && end) return `${start} – ${end}`;
  if (start) return `From ${start}`;
  if (end) return `Until ${end}`;
  return "";
}

function formatPlacement(value) {
  return String(value || "Participant").replaceAll("_", " ");
}

export default function StudentHistory() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);
  const [activeYear, setActiveYear] = useState("ALL");
  const { calendar } = useCalendarPreference();

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/student/history", { cache: "no-store" });
        const json = await res.json();
        if (!res.ok) throw new Error(json.message || "Failed to load history");
        if (active) setData(json.data);
      } catch (err) {
        if (active) setError(err.message);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const matchesYear = (yearStart) =>
    activeYear === "ALL" || String(yearStart) === String(activeYear);

  const filtered = useMemo(() => {
    if (!data) return { journey: [], achievements: [], writings: [] };
    return {
      journey: data.journey.filter((j) => matchesYear(j.academicYearStart)),
      achievements: data.achievements.filter((a) => matchesYear(a.academicYearStart)),
      writings: data.writings.filter((w) => matchesYear(w.academicYearStart)),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, activeYear]);

  if (loading) {
    return (
      <LoadingState
        title="Loading your journey"
        message="Gathering your schools, achievements, and writing."
        className="min-h-[50vh]"
      />
    );
  }

  if (error) {
    return <AlertBanner type="error" title="Could not load history" message={error} />;
  }

  const schoolsCount = data?.student?.schoolsCount || 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-lg font-black text-[#17120a]">My Journey</h1>
        <CalendarToggle />
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryTile icon={FaSchool} label="Schools" value={schoolsCount} />
        <SummaryTile icon={FaGraduationCap} label="Sessions" value={data?.years?.length || 0} />
        <SummaryTile icon={FaTrophy} label="Achievements" value={data?.achievements?.length || 0} />
        <SummaryTile icon={FaFeatherAlt} label="Writing" value={data?.writings?.length || 0} />
      </div>

      {/* Year filter */}
      <div className="flex flex-wrap gap-2">
        <FilterChip
          active={activeYear === "ALL"}
          onClick={() => setActiveYear("ALL")}
          label="All years"
        />
        {(data?.years || []).map((y) => (
          <FilterChip
            key={y.yearStart}
            active={String(activeYear) === String(y.yearStart)}
            onClick={() => setActiveYear(y.yearStart)}
            label={y.year}
          />
        ))}
      </div>

      {/* Journey timeline */}
      <section className="rounded-2xl border border-[#e1e8f4] bg-white p-5 shadow-sm">
        <h2 className="flex items-center gap-2 text-lg font-black text-[#17120a]">
          <FaExchangeAlt className="text-[var(--brand-primary)]" />
          School Journey
        </h2>
        {filtered.journey.length === 0 ? (
          <p className="mt-3 text-sm text-[#52657d]">No enrollment records for this year.</p>
        ) : (
          <ol className="relative mt-5 space-y-4 border-l-2 border-[#e1e8f4] pl-6">
            {filtered.journey.map((entry, index) => {
              const meta = ENROLLMENT_STATUS[entry.status] || ENROLLMENT_STATUS.CURRENT;
              const range = formatEnrollmentRange(entry, calendar);
              const isCurrent = entry.status === "CURRENT";
              return (
                <li
                  key={`${entry.school}-${entry.academicYearStart}-${index}`}
                  className="relative"
                >
                  <span
                    className={`absolute top-1.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-white shadow ${
                      isCurrent ? "bg-emerald-500" : "bg-[var(--brand-primary)]"
                    }`}
                    style={{ left: "-31px" }}
                  />
                  <div className="rounded-xl border border-[#e1e8f4] bg-[#f8fbff] p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-[var(--brand-primary)] shadow-sm">
                        <FaSchool className="text-xs" />
                      </span>
                      <p className="text-sm font-black text-[#17120a]">
                        {entry.schoolName}
                      </p>
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase ${meta.classes}`}>
                        {meta.label}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-[#52657d]">
                      {entry.grade}
                      {entry.academicYear ? ` · ${entry.academicYear}` : ""}
                      {entry.rollNumber ? ` · Roll ${entry.rollNumber}` : ""}
                    </p>
                    {range && (
                      <p className="mt-1 text-xs font-bold text-[var(--brand-primary)]">
                        {range}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      {/* Achievements */}
      <section className="rounded-2xl border border-[#e1e8f4] bg-white p-5 shadow-sm">
        <h2 className="flex items-center gap-2 text-lg font-black text-[#17120a]">
          <FaTrophy className="text-amber-500" />
          Achievements
        </h2>
        {filtered.achievements.length === 0 ? (
          <p className="mt-3 text-sm text-[#52657d]">No achievements for this year.</p>
        ) : (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {filtered.achievements.map((a) => (
              <div key={a.id} className="rounded-xl border border-[#e1e8f4] bg-white p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-black uppercase text-amber-700">
                    {formatPlacement(a.placement)}
                  </span>
                  {a.academicYear && (
                    <span className="rounded-full bg-[#eef5fb] px-2.5 py-0.5 text-[10px] font-black text-[var(--brand-primary)]">
                      {a.academicYear}
                    </span>
                  )}
                </div>
                <p className="mt-2 text-sm font-black text-[#17120a]">{a.title}</p>
                <p className="mt-1 text-xs text-[#52657d]">
                  {a.eventTitle ? `${a.eventTitle} · ` : ""}
                  {a.schoolName}
                  {a.awardedAt ? ` · ${formatMonthYear(a.awardedAt, calendar)}` : ""}
                </p>
                {a.certificateUrl && (
                  <a
                    href={a.certificateUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex items-center gap-1.5 text-xs font-black text-purple-700"
                  >
                    <FaCertificate /> Certificate
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Writing */}
      <section className="rounded-2xl border border-[#e1e8f4] bg-white p-5 shadow-sm">
        <h2 className="flex items-center gap-2 text-lg font-black text-[#17120a]">
          <FaFeatherAlt className="text-purple-700" />
          Published Writing
        </h2>
        {filtered.writings.length === 0 ? (
          <p className="mt-3 text-sm text-[#52657d]">No writing for this year.</p>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.writings.map((w) => (
              <a
                key={w.id}
                href={`/writings/${w.id}`}
                className="block rounded-xl border border-[#e1e8f4] bg-white p-4 transition hover:border-[#c9d8ea] hover:shadow-sm"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-purple-50 px-2.5 py-0.5 text-[10px] font-black uppercase text-purple-700">
                    {String(w.category || "Writing").replaceAll("_", " ")}
                  </span>
                  {w.academicYear && (
                    <span className="rounded-full bg-[#eef5fb] px-2.5 py-0.5 text-[10px] font-black text-[var(--brand-primary)]">
                      {w.academicYear}
                    </span>
                  )}
                </div>
                <p className="mt-2 line-clamp-2 text-sm font-black text-[#17120a]">
                  {w.title}
                </p>
                <p className="mt-1 text-xs text-[#52657d]">
                  {w.schoolName}
                  {w.date ? ` · ${formatMonthYear(w.date, calendar)}` : ""}
                </p>
              </a>
            ))}
          </div>
        )}
      </section>

      {schoolsCount === 0 &&
        (data?.achievements?.length || 0) === 0 &&
        (data?.writings?.length || 0) === 0 && (
          <EmptyState
            icon={FaGraduationCap}
            title="Your journey starts here"
            description="As you join events, win achievements, and publish writing, your full history across every school will appear here."
          />
        )}
    </div>
  );
}

function SummaryTile({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl border border-[#e1e8f4] bg-white p-4 shadow-sm">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--brand-primary-soft)] text-[var(--brand-primary)]">
        <Icon />
      </span>
      <p className="mt-3 text-2xl font-black text-[#17120a]">{value}</p>
      <p className="text-xs font-bold text-[#52657d]">{label}</p>
    </div>
  );
}

function FilterChip({ active, onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3.5 py-1.5 text-xs font-black transition ${
        active
          ? "bg-[var(--brand-primary)] text-white"
          : "border border-[#dbe5f4] bg-white text-[#52657d] hover:bg-[#f8fbff]"
      }`}
    >
      {label}
    </button>
  );
}
