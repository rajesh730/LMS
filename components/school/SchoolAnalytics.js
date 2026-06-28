"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  FaArrowDown,
  FaArrowUp,
  FaCalendarAlt,
  FaExchangeAlt,
  FaGraduationCap,
  FaSignInAlt,
  FaSignOutAlt,
  FaUserGraduate,
} from "react-icons/fa";
import LoadingState from "@/components/ui/LoadingState";
import AlertBanner from "@/components/ui/AlertBanner";
import AppDate from "@/components/common/AppDate";

const JOIN_TYPE = {
  ADMISSION: { label: "Admitted", classes: "bg-emerald-50 text-emerald-700" },
  TRANSFER_IN: { label: "Transferred in", classes: "bg-blue-50 text-[#0a2f66]" },
};
const LEAVE_TYPE = {
  TRANSFERRED: { label: "Transferred out", classes: "bg-purple-50 text-purple-700" },
  GRADUATED: { label: "Graduated", classes: "bg-slate-100 text-slate-600" },
};

function CountCard({ icon: Icon, value, label, note, tone = "blue" }) {
  const tones = {
    blue: "bg-blue-50 text-[#0a2f66] border-blue-100",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
    rose: "bg-rose-50 text-rose-700 border-rose-100",
    purple: "bg-purple-50 text-purple-700 border-purple-100",
  };
  return (
    <div className="rounded-2xl border border-[#e6eaf7] bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <span className={`flex h-11 w-11 items-center justify-center rounded-xl border ${tones[tone]}`}>
          <Icon />
        </span>
        <strong className="text-3xl font-black text-[#10142f]">{value}</strong>
      </div>
      <p className="mt-4 text-sm font-black text-[#24314d]">{label}</p>
      {note && <p className="mt-1 text-xs font-semibold text-[#526071]">{note}</p>}
    </div>
  );
}

function Chip({ label, classes }) {
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase ${classes}`}>
      {label}
    </span>
  );
}

function PersonRow({ name, grade, year, chip }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-[#eef2f8] bg-[#fbfcff] px-4 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-black text-[#10142f]">{name}</p>
        <p className="truncate text-xs font-semibold text-[#526071]">
          {grade ? `Grade ${grade}` : "Grade —"}
          {year ? ` · ${year}` : ""}
        </p>
      </div>
      {chip && <Chip label={chip.label} classes={chip.classes} />}
    </div>
  );
}

function TransferRow({ row, direction }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-[#eef2f8] bg-[#fbfcff] px-4 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-black text-[#10142f]">{row.studentName}</p>
        <p className="truncate text-xs font-semibold text-[#526071]">
          {direction === "in" ? "From " : "To "}
          {row.counterpartSchool}
          {row.grade ? ` · Grade ${row.grade}` : ""}
        </p>
      </div>
      <span className="shrink-0 text-xs font-bold text-[#75869b]">
        <AppDate value={row.date} />
      </span>
    </div>
  );
}

function EmptyLine({ text }) {
  return (
    <p className="rounded-xl border border-dashed border-[#dbe5f4] bg-[#fbfcff] px-4 py-5 text-center text-sm font-semibold text-[#526071]">
      {text}
    </p>
  );
}

function Panel({ id, title, icon: Icon, children, sectionRef }) {
  return (
    <section
      id={id}
      ref={sectionRef}
      className="scroll-mt-24 rounded-2xl border border-[#e6eaf7] bg-white p-5 shadow-sm"
    >
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#eef4f8] text-[var(--brand-primary)]">
          <Icon />
        </span>
        <h2 className="text-lg font-black text-[#10142f]">{title}</h2>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default function SchoolAnalytics() {
  const searchParams = useSearchParams();
  const sectionParam = searchParams.get("section");

  const [data, setData] = useState(null);
  const [yearStart, setYearStart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const sectionRefs = {
    students: useRef(null),
    transfers: useRef(null),
    events: useRef(null),
  };

  const load = useCallback(async (selectedYear) => {
    try {
      setLoading(true);
      setError("");
      const query =
        selectedYear !== null && selectedYear !== undefined
          ? `?yearStart=${selectedYear}`
          : "";
      const res = await fetch(`/api/school/analytics${query}`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Failed to load analytics");
      setData(json.data);
      setYearStart(json.data?.selectedYearStart ?? null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Deep-link: when arriving with ?section=transfers etc., scroll there.
  useEffect(() => {
    if (!sectionParam || loading) return;
    const target = sectionRefs[sectionParam]?.current;
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionParam, loading]);

  if (loading && !data) {
    return (
      <LoadingState
        title="Loading analytics"
        message="Gathering students in/out, transfers, and events."
      />
    );
  }

  if (error) {
    return <AlertBanner type="error" title="Analytics unavailable" message={error} />;
  }

  if (!data || (data.years || []).length === 0) {
    return (
      <AlertBanner
        type="info"
        title="No academic years yet"
        message="Set up your academic year to start tracking students in/out, transfers, and events."
      />
    );
  }

  const summary = data.summary || {};
  const joined = data.joined || [];
  const left = data.left || [];
  const incoming = data.transfers?.incoming || [];
  const outgoing = data.transfers?.outgoing || [];
  const organized = data.events?.organized || [];
  const participated = data.events?.participated || [];

  const cameTotal = joined.length;
  const leftTotal = left.length;

  return (
    <div className="space-y-5">
      {/* Header + year selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#e6eaf7] bg-white p-5 shadow-sm">
        <div>
          <h2 className="text-lg font-black text-[#10142f]">
            Academic Year Analysis
          </h2>
          <p className="mt-1 text-sm font-semibold text-[#526071]">
            Who came, who left, transfers, and events for {data.selectedYearLabel}.
          </p>
        </div>
        <label className="flex items-center gap-2">
          <span className="text-xs font-black uppercase text-[#526071]">Session</span>
          <select
            value={yearStart ?? ""}
            onChange={(e) => {
              const next = Number.parseInt(e.target.value, 10);
              setYearStart(next);
              load(next);
            }}
            className="h-10 rounded-xl border border-[#dbe5f4] bg-white px-3 text-sm font-bold text-[#10142f]"
          >
            {data.years.map((y) => (
              <option key={y.yearStart} value={y.yearStart}>
                {y.year}
                {y.status === "ACTIVE" ? " (current)" : ""}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Headline cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <CountCard
          icon={FaArrowDown}
          value={cameTotal}
          label="Students Came"
          note={`${summary.admitted || 0} admitted · ${summary.transferredIn || 0} transferred in`}
          tone="emerald"
        />
        <CountCard
          icon={FaArrowUp}
          value={leftTotal}
          label="Students Left"
          note={`${summary.transferredOut || 0} transferred out · ${summary.graduated || 0} graduated`}
          tone="rose"
        />
        <CountCard
          icon={FaExchangeAlt}
          value={incoming.length + outgoing.length}
          label="Transfers"
          note={`${incoming.length} in · ${outgoing.length} out`}
          tone="purple"
        />
        <CountCard
          icon={FaCalendarAlt}
          value={organized.length + participated.length}
          label="Events"
          note={`${organized.length} organized · ${participated.length} joined`}
          tone="blue"
        />
      </div>

      {/* Students In / Out */}
      <Panel
        id="students"
        title="Students In / Out"
        icon={FaUserGraduate}
        sectionRef={sectionRefs.students}
      >
        <div className="grid gap-5 lg:grid-cols-2">
          <div>
            <p className="mb-3 flex items-center gap-2 text-sm font-black text-emerald-700">
              <FaSignInAlt /> Came in {data.selectedYearLabel} ({joined.length})
            </p>
            <div className="space-y-2">
              {joined.length === 0 ? (
                <EmptyLine text="No new students this session." />
              ) : (
                joined.map((s) => (
                  <PersonRow
                    key={`${s.studentId}-in`}
                    name={s.name}
                    grade={s.grade}
                    year={s.academicYear}
                    chip={JOIN_TYPE[s.type]}
                  />
                ))
              )}
            </div>
          </div>
          <div>
            <p className="mb-3 flex items-center gap-2 text-sm font-black text-rose-700">
              <FaSignOutAlt /> Left in {data.selectedYearLabel} ({left.length})
            </p>
            <div className="space-y-2">
              {left.length === 0 ? (
                <EmptyLine text="No students left this session." />
              ) : (
                left.map((s) => (
                  <PersonRow
                    key={`${s.studentId}-out`}
                    name={s.name}
                    grade={s.grade}
                    year={s.academicYear}
                    chip={LEAVE_TYPE[s.type]}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </Panel>

      {/* Transfer history */}
      <Panel
        id="transfers"
        title="Student Transfer History"
        icon={FaExchangeAlt}
        sectionRef={sectionRefs.transfers}
      >
        <div className="grid gap-5 lg:grid-cols-2">
          <div>
            <p className="mb-3 flex items-center gap-2 text-sm font-black text-[#0a2f66]">
              <FaSignInAlt /> Incoming ({incoming.length})
            </p>
            <div className="space-y-2">
              {incoming.length === 0 ? (
                <EmptyLine text="No incoming transfers this session." />
              ) : (
                incoming.map((row) => (
                  <TransferRow key={row.id} row={row} direction="in" />
                ))
              )}
            </div>
          </div>
          <div>
            <p className="mb-3 flex items-center gap-2 text-sm font-black text-purple-700">
              <FaSignOutAlt /> Outgoing ({outgoing.length})
            </p>
            <div className="space-y-2">
              {outgoing.length === 0 ? (
                <EmptyLine text="No outgoing transfers this session." />
              ) : (
                outgoing.map((row) => (
                  <TransferRow key={row.id} row={row} direction="out" />
                ))
              )}
            </div>
          </div>
        </div>
      </Panel>

      {/* Event history */}
      <Panel
        id="events"
        title="Event History"
        icon={FaCalendarAlt}
        sectionRef={sectionRefs.events}
      >
        <div className="grid gap-5 lg:grid-cols-2">
          <div>
            <p className="mb-3 flex items-center gap-2 text-sm font-black text-[#0a2f66]">
              <FaGraduationCap /> Organized ({organized.length})
            </p>
            <div className="space-y-2">
              {organized.length === 0 ? (
                <EmptyLine text="No school events this session." />
              ) : (
                organized.map((e) => (
                  <div
                    key={e.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-[#eef2f8] bg-[#fbfcff] px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-[#10142f]">
                        {e.title}
                      </p>
                      <p className="truncate text-xs font-semibold text-[#526071]">
                        {String(e.status || "").replaceAll("_", " ")}
                        {e.resultsPublished ? " · Results published" : ""}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs font-bold text-[#75869b]">
                      <AppDate value={e.date} />
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
          <div>
            <p className="mb-3 flex items-center gap-2 text-sm font-black text-purple-700">
              <FaCalendarAlt /> Participated ({participated.length})
            </p>
            <div className="space-y-2">
              {participated.length === 0 ? (
                <EmptyLine text="No events joined this session." />
              ) : (
                participated.map((e) => (
                  <div
                    key={e.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-[#eef2f8] bg-[#fbfcff] px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-[#10142f]">
                        {e.title}
                      </p>
                      <p className="truncate text-xs font-semibold text-[#526071]">
                        {String(e.scope || "").replaceAll("_", " ")} event
                      </p>
                    </div>
                    <span className="shrink-0 text-xs font-bold text-[#75869b]">
                      <AppDate value={e.date} />
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </Panel>
    </div>
  );
}
