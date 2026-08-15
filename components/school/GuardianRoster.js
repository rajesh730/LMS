"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FaSearch,
  FaFilter,
  FaDownload,
  FaChevronDown,
  FaChevronRight,
  FaUsers,
  FaUserCheck,
  FaUserClock,
  FaUserPlus,
  FaUserSlash,
  FaQrcode,
  FaPaperPlane,
  FaInbox,
  FaUserPlus as FaAddGuardian,
} from "react-icons/fa";
import Link from "next/link";
import AlertBanner from "@/components/ui/AlertBanner";
import PaginationControls from "@/components/PaginationControls";
import { COVERAGE_LABELS } from "@/lib/guardianRoster";
import GuardianManager from "./GuardianManager";
import BulkCardsDialog from "./BulkCardsDialog";
import ParentCardDialog from "./ParentCardDialog";

/**
 * The school-wide guardian roster.
 *
 * Replaces a search-one-student-at-a-time master/detail with the view a school
 * admin actually needs: every student, their guardian coverage, and the ability
 * to filter down to the gaps.
 *
 * Deliberately matches components/dashboard/StudentManager: metric cards →
 * filter bar → table → pagination → CSV. Two screens that answer adjacent
 * questions about the same people should not look like different products.
 *
 * Row expansion keeps the detailed per-student panel available without a
 * navigation step, so nothing is hidden behind a second page.
 */

const COVERAGE_FILTERS = [
  { value: "ALL", label: "All students" },
  { value: "UNLINKED_DATA", label: "Could not connect automatically" },
  { value: "NO_GUARDIAN", label: "No guardian at all" },
  { value: "NOT_ACTIVATED", label: "Card not used yet" },
  { value: "ACTIVATED", label: "Connected" },
  { value: "REVOKED", label: "Access removed" },
];

export default function GuardianRoster() {
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(null);
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [truncated, setTruncated] = useState(false);
  // How many guardians the automatic backfill linked on this load, and whether
  // a large school still has more to work through.
  const [autoLinked, setAutoLinked] = useState(0);
  const [idsAssigned, setIdsAssigned] = useState(0);
  const [backfillRunning, setBackfillRunning] = useState(false);

  const [search, setSearch] = useState("");
  const [grade, setGrade] = useState("");
  const [coverage, setCoverage] = useState("ALL");
  const [page, setPage] = useState(1);

  const [grades, setGrades] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [printingCards, setPrintingCards] = useState(false);
  // Set when the row's "add guardian" button is used, so the panel opens with
  // its form already showing rather than making the user find it again.
  const [addGuardianFor, setAddGuardianFor] = useState(null);

  // Row selection drives the bulk actions. Held as a Set of studentIds and
  // cleared whenever the filters change, so a hidden selection can never be
  // acted on by mistake.
  const [selected, setSelected] = useState(() => new Set());

  const toggleSelected = (studentId) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });
  };

  // Grade list for the filter, from the school's own configured structure.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/school/grade-structure", {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = await res.json();
        if (active) setGrades(data.grades || []);
      } catch {
        // A missing grade list only removes a filter; the roster still works.
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const url = new URL("/api/school/guardians/roster", window.location.origin);
      url.searchParams.set("page", String(page));
      url.searchParams.set("limit", "25");
      url.searchParams.set("coverage", coverage);
      if (search.trim()) url.searchParams.set("search", search.trim());
      if (grade) url.searchParams.set("grade", grade);

      const res = await fetch(url.toString(), { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Could not load the roster");

      setRows(json.data.rows);
      setSummary(json.data.summary);
      setPagination(json.data.pagination);
      setTruncated(Boolean(json.data.truncated));
      setAutoLinked(json.data.autoLinked || 0);
      setIdsAssigned(json.data.idsAssigned || 0);
      setBackfillRunning(Boolean(json.data.backfillInProgress));
    } catch (err) {
      setError(err.message);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [page, coverage, search, grade]);

  // Debounced so typing a name does not fire a query per keystroke against a
  // cluster with ~69ms RTT.
  useEffect(() => {
    const handle = setTimeout(load, 300);
    return () => clearTimeout(handle);
  }, [load]);

  // Any filter change returns to page 1 — staying on page 4 of a now-shorter
  // list shows an empty table and reads as a bug. The selection is dropped at
  // the same time: acting on rows the user can no longer see is a trap.
  useEffect(() => {
    setPage(1);
    setSelected(new Set());
  }, [search, grade, coverage]);

  // A large school is linked in batches, so keep pulling until it finishes.
  // The school never has to press anything or know it is happening.
  useEffect(() => {
    if (!backfillRunning) return undefined;
    const handle = setTimeout(load, 1500);
    return () => clearTimeout(handle);
  }, [backfillRunning, load]);

  const metricCards = useMemo(
    () => [
      {
        label: "Students",
        value: summary?.total ?? "—",
        note: "On the roster",
        icon: FaUsers,
        tone: "slate",
      },
      {
        label: "Connected",
        value: summary?.activated ?? "—",
        note: "Using the Parent App",
        icon: FaUserCheck,
        tone: "emerald",
      },
      {
        label: "Card not used",
        value: summary?.notActivated ?? "—",
        note: "Guardian added, not connected",
        icon: FaUserClock,
        tone: "amber",
      },
      {
        label: "Needs attention",
        value: summary?.unlinkedData ?? "—",
        note: "Could not connect automatically",
        icon: FaUserPlus,
        tone: "orange",
      },
      {
        label: "No guardian",
        value: summary?.noGuardian ?? "—",
        note: "Nothing on file at all",
        icon: FaUserSlash,
        tone: "red",
      },
    ],
    [summary]
  );

  const exportCsv = () => {
    const header = [
      "Student",
      "Grade",
      "Roll",
      "Coverage",
      "Guardians",
      "Guardian names",
      "Parent IDs",
      "Contact",
    ];
    const lines = rows.map((row) => [
      row.studentName,
      row.grade,
      row.rollNumber,
      COVERAGE_LABELS[row.coverage]?.label || row.coverage,
      row.guardianCount,
      row.guardians.map((g) => g.name).join(" / "),
      row.guardians.map((g) => g.parentIdentifier || "—").join(" / "),
      row.guardians
        .map((g) => g.email || g.phone || "none")
        .join(" / "),
    ]);

    const csv = [header, ...lines]
      .map((cells) =>
        cells
          .map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`)
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `guardians-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const toneClasses = {
    slate: "border-slate-200 bg-slate-50 text-slate-700",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    orange: "border-orange-200 bg-orange-50 text-orange-700",
    red: "border-red-200 bg-red-50 text-red-700",
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-black text-[#17120a]">
            Parents &amp; Guardians
          </h1>
          <p className="mt-2 text-base text-[#52657d]">
            Every student and who can see them. Connect guardians, print access
            cards, and find the families nobody has reached yet.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={exportCsv}
            disabled={rows.length === 0}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#dbe5f4] bg-white px-4 text-sm font-black text-[#0a2f66] shadow-sm transition hover:bg-[#f8fbff] disabled:opacity-50"
          >
            <FaDownload />
            Export CSV
          </button>
          {/* One door to messaging. "Message parents" opens the inbox — every
              conversation in one place, with New message inside it — rather
              than a compose box that hides the replies. */}
          <Link
            href="/school/messages"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#dbe5f4] bg-white px-4 text-sm font-black text-[#0a2f66] shadow-sm transition hover:bg-[#f8fbff]"
          >
            <FaPaperPlane />
            Message parents
          </Link>
          <button
            type="button"
            onClick={() => setPrintingCards(true)}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-purple-700 px-5 text-sm font-black text-white shadow-sm transition hover:bg-purple-800"
          >
            <FaQrcode />
            Print access cards
          </button>
        </div>
      </div>

      {/* Linking is automatic, so this reports what happened rather than
          asking the school to do anything. */}
      {autoLinked > 0 ? (
        <AlertBanner
          type="success"
          title={`${autoLinked} guardian${autoLinked === 1 ? "" : "s"} connected automatically`}
          message="Parent details from student registration were turned into guardian accounts. Print their access cards when you are ready to hand them out."
        />
      ) : null}

      {idsAssigned > 0 && autoLinked === 0 ? (
        <AlertBanner
          type="success"
          title={`${idsAssigned} Parent ID${idsAssigned === 1 ? "" : "s"} assigned`}
          message="Existing guardians now have a Pravyo Parent ID. You can read it to them over the phone — they still need a PIN from an access card to sign in."
        />
      ) : null}

      {backfillRunning ? (
        <AlertBanner
          type="info"
          title="Still connecting guardians…"
          message="Working through your student records in batches. This page will keep updating."
        />
      ) : null}

      {/* Only students whose registration held nothing usable remain here, so
          the wording is about missing data, not a task the school forgot. */}
      {summary?.unlinkedData > 0 && !backfillRunning ? (
        <AlertBanner
          type="warning"
          title={`${summary.unlinkedData} students could not be connected automatically`}
          message="Their registration record has a parent name that could not be used, or the guardian's details clash with an existing account. Open a row to add the guardian by hand."
          action={
            <button
              type="button"
              onClick={() => setCoverage("UNLINKED_DATA")}
              className="rounded-lg bg-white/80 px-3 py-2 text-xs font-black text-slate-900 transition hover:bg-white"
            >
              Show them
            </button>
          }
        />
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {metricCards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.label}
              type="button"
              // Cards double as filters — the natural next action after reading
              // "12 with no guardian" is to see those twelve.
              onClick={() =>
                setCoverage(
                  card.label === "Connected"
                    ? "ACTIVATED"
                    : card.label === "Card not used"
                      ? "NOT_ACTIVATED"
                      : card.label === "Details on file"
                        ? "UNLINKED_DATA"
                        : card.label === "No guardian"
                          ? "NO_GUARDIAN"
                          : "ALL"
                )
              }
              className="rounded-2xl border border-[#e6eaf7] bg-white p-5 text-left shadow-sm transition hover:border-purple-200"
            >
              <div className="flex items-center gap-4">
                <span
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${toneClasses[card.tone]}`}
                >
                  <Icon />
                </span>
                <span className="min-w-0">
                  <strong className="block text-2xl font-black text-[#17120a]">
                    {card.value}
                  </strong>
                  <span className="block truncate text-sm font-black text-[#24314d]">
                    {card.label}
                  </span>
                  <span className="mt-1 block text-xs font-bold text-[#52657d]">
                    {card.note}
                  </span>
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {error ? <AlertBanner type="error" title="Could not load" message={error} /> : null}

      {truncated ? (
        <AlertBanner
          type="info"
          title="Showing the first 1,500 matching students"
          message="Narrow the search or pick a grade to see the rest."
        />
      ) : null}

      {/* Filters */}
      <div className="rounded-2xl border border-[#e6eaf7] bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[minmax(240px,1fr)_180px_240px_auto]">
          <div className="relative">
            <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-[#75869b]" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search student, roll, or guardian name..."
              className="h-12 w-full rounded-xl border border-[#dbe5f4] bg-[#f8fbff] pl-11 pr-4 text-sm font-semibold outline-none transition focus:border-purple-300"
            />
          </div>

          <select
            value={grade}
            onChange={(event) => setGrade(event.target.value)}
            className="h-12 rounded-xl border border-[#dbe5f4] bg-white px-4 text-sm font-black text-[#24314d] outline-none transition focus:border-purple-300"
          >
            <option value="">All Grades</option>
            {grades.map((g) => (
              <option key={g._id} value={g.originalValue || g._id}>
                {g.name}
              </option>
            ))}
          </select>

          <select
            value={coverage}
            onChange={(event) => setCoverage(event.target.value)}
            className="h-12 rounded-xl border border-[#dbe5f4] bg-white px-4 text-sm font-black text-[#24314d] outline-none transition focus:border-purple-300"
          >
            {COVERAGE_FILTERS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => {
              setSearch("");
              setGrade("");
              setCoverage("ALL");
            }}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-[#dbe5f4] bg-white px-4 text-sm font-black text-[#0a2f66] transition hover:bg-[#f8fbff]"
          >
            <FaFilter />
            Clear Filters
          </button>
        </div>
      </div>

      {/* Selection bar — appears only when rows are ticked. */}
      {selected.size > 0 ? (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-purple-200 bg-purple-50 px-4 py-3">
          <span className="text-sm font-black text-purple-900">
            {selected.size} student{selected.size === 1 ? "" : "s"} selected
          </span>
          <div className="ml-auto flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setPrintingCards(true)}
              className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-purple-700 px-3 text-xs font-black text-white"
            >
              <FaQrcode />
              Print cards
            </button>
            <Link
              href="/school/messages"
              className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-purple-300 bg-white px-3 text-xs font-black text-purple-900"
            >
              <FaPaperPlane />
              Message
            </Link>
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="min-h-10 rounded-lg px-3 text-xs font-black text-purple-900"
            >
              Clear
            </button>
          </div>
        </div>
      ) : null}

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-[#e1e7f2] bg-white shadow-[0_14px_34px_rgba(10,47,102,0.08)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left text-sm text-[#27344a]">
            <thead className="border-b border-[#e1e7f2] bg-[#f8fbff] text-[11px] uppercase text-[#75869b]">
              <tr>
                <th className="w-10 px-3 py-3">
                  <input
                    type="checkbox"
                    aria-label="Select all on this page"
                    checked={
                      rows.length > 0 &&
                      rows.every((row) => selected.has(row.studentId))
                    }
                    onChange={(event) =>
                      setSelected(
                        event.target.checked
                          ? new Set(rows.map((row) => row.studentId))
                          : new Set()
                      )
                    }
                    className="h-4 w-4 rounded border-[#c8d4e6]"
                  />
                </th>
                <th className="w-10 px-3 py-3" />
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Grade</th>
                <th className="px-4 py-3">Guardians</th>
                <th className="px-4 py-3">Parent ID</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [0, 1, 2, 3, 4].map((index) => (
                  <tr key={index} className="border-b border-[#eef2f8]">
                    <td colSpan={8} className="px-4 py-4">
                      <div className="h-6 animate-pulse rounded bg-slate-100" />
                    </td>
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <p className="text-base font-black text-[#24314d]">
                      No students match these filters
                    </p>
                    <p className="mt-1 text-sm text-[#52657d]">
                      Try clearing the search or choosing a different grade.
                    </p>
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <RosterRow
                    key={row.studentId}
                    row={row}
                    expanded={expanded === row.studentId}
                    selected={selected.has(row.studentId)}
                    onSelect={() => toggleSelected(row.studentId)}
                    onToggle={() =>
                      setExpanded(expanded === row.studentId ? null : row.studentId)
                    }
                    onAddGuardian={() => {
                      setExpanded(row.studentId);
                      setAddGuardianFor(row.studentId);
                    }}
                    openAddForm={addGuardianFor === row.studentId}
                    onAddFormOpened={() => setAddGuardianFor(null)}
                    onChanged={load}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {pagination.totalPages > 1 ? (
          <div className="border-t border-[#e1e7f2] px-4 py-3">
            <PaginationControls
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages}
              totalItems={pagination.totalItems}
              start={pagination.start}
              end={pagination.end}
              onPageChange={(next) => setPage(next)}
            />
          </div>
        ) : null}
      </div>

      {printingCards ? (
        <BulkCardsDialog
          grades={grades}
          selectedStudentIds={Array.from(selected)}
          onClose={() => {
            setPrintingCards(false);
            // Access states change once cards are issued.
            load();
          }}
        />
      ) : null}

    </div>
  );
}

function RosterRow({
  row,
  expanded,
  selected,
  onSelect,
  onToggle,
  onAddGuardian,
  openAddForm,
  onAddFormOpened,
  onChanged,
}) {
  const coverage = COVERAGE_LABELS[row.coverage] || COVERAGE_LABELS.NO_GUARDIAN;
  const primary = row.guardians.find((g) => g.isPrimaryGuardian) || row.guardians[0];
  const [issuing, setIssuing] = useState(false);
  const [card, setCard] = useState(null);

  /**
   * Issue a card for this one guardian and SHOW it.
   *
   * Deliberately not a jump straight to the print view: most guardians are sent
   * their details by WhatsApp, and forcing a print dialog for that is friction
   * with no purpose. The dialog offers copy, share and print equally.
   */
  const showCard = async (linkId) => {
    setIssuing(true);
    try {
      const res = await fetch("/api/school/guardians/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ linkId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      setCard(json.data);
    } catch {
      // The expanded panel surfaces the detailed error; the row stays quiet.
      onChanged();
    } finally {
      setIssuing(false);
    }
  };

  return (
    <>
      <tr
        className={`border-b border-[#eef2f8] transition hover:bg-[#f8fbff] ${
          expanded ? "bg-[#f8fbff]" : selected ? "bg-purple-50/40" : ""
        }`}
      >
        <td className="px-3 py-3">
          <input
            type="checkbox"
            checked={selected}
            onChange={onSelect}
            aria-label={`Select ${row.studentName}`}
            className="h-4 w-4 rounded border-[#c8d4e6]"
          />
        </td>

        <td className="px-3 py-3">
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={expanded}
            aria-label={expanded ? "Hide details" : "Show details"}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#75869b] transition hover:bg-slate-100"
          >
            {expanded ? <FaChevronDown /> : <FaChevronRight />}
          </button>
        </td>

        <td className="px-4 py-3">
          <button type="button" onClick={onToggle} className="text-left">
            <span className="block font-bold text-[#24314d]">{row.studentName}</span>
            {row.rollNumber ? (
              <span className="block text-xs text-[#75869b]">
                Roll {row.rollNumber}
              </span>
            ) : null}
          </button>
        </td>

        <td className="px-4 py-3 font-semibold">{row.grade || "—"}</td>

        <td className="px-4 py-3">
          {row.guardians.length === 0 ? (
            // Never a bare dash: say what is missing and what can be done.
            row.registrationParent ? (
              <span className="text-[#b45309]">
                {row.registrationParent.name}
                <span className="block text-xs font-semibold">
                  on the student record — needs checking
                </span>
              </span>
            ) : (
              <span className="text-[#75869b]">Nobody connected</span>
            )
          ) : (
            // Every guardian, not just the primary — a school needs to see at a
            // glance that both parents are connected without expanding the row.
            <ul className="space-y-1">
              {row.guardians.map((guardian) => (
                <li key={guardian.linkId} className="leading-tight">
                  <span
                    className={
                      guardian.linkStatus === "ACTIVE"
                        ? "font-semibold text-[#24314d]"
                        : "font-semibold text-[#a3aec0] line-through"
                    }
                  >
                    {guardian.name}
                    {guardian.isHousehold ? " (family)" : ""}
                  </span>
                  <span className="ml-1.5 text-xs text-[#75869b]">
                    {relationshipLabel(guardian.relationshipType)}
                    {guardian.isPrimaryGuardian ? " · primary" : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </td>

        <td className="px-4 py-3">
          {primary?.parentIdentifier ? (
            <code className="rounded bg-slate-100 px-2 py-1 font-mono text-xs">
              {primary.parentIdentifier}
            </code>
          ) : (
            <span className="text-[#c2ccdb]">—</span>
          )}
        </td>

        <td className="px-4 py-3 text-xs">
          {primary ? (
            <>
              {primary.email ? (
                <span className="block">{primary.email}</span>
              ) : null}
              {primary.phone ? (
                <span className="block">{primary.phone}</span>
              ) : null}
              {!primary.email && !primary.phone ? (
                // Not an error state — a card-based guardian needs neither.
                <span className="text-[#75869b]">Card access only</span>
              ) : null}
            </>
          ) : row.registrationParent ? (
            <span className="text-[#b45309]">
              {row.registrationParent.phone ||
                row.registrationParent.email ||
                "No contact"}
            </span>
          ) : (
            <span className="text-[#c2ccdb]">—</span>
          )}
        </td>

        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <span
              title={coverage.hint}
              className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-black ${coverage.tone}`}
            >
              {coverage.emoji} {coverage.label}
            </span>

            {/* Add another guardian without hunting for it inside the panel.
                A student commonly has two. */}
            <button
              type="button"
              onClick={onAddGuardian}
              title="Add another guardian for this student"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#dbe5f4] text-[#0a2f66] transition hover:bg-[#f8fbff]"
            >
              <FaAddGuardian className="h-3 w-3" />
            </button>

            {/* Straight to a printed card for the common case, without needing
                to expand the row first. */}
            {primary && row.coverage !== "REVOKED" ? (
              <button
                type="button"
                onClick={() => showCard(primary.linkId)}
                disabled={issuing}
                title={
                  primary.accessState === "ACTIVATED"
                    ? "New card — this replaces their current PIN"
                    : "Show access card (QR, ID and PIN)"
                }
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#dbe5f4] text-[#0a2f66] transition hover:bg-[#f8fbff] disabled:opacity-40"
              >
                <FaQrcode className="h-3 w-3" />
              </button>
            ) : null}
          </div>
        </td>
      </tr>

      {card ? (
        <tr>
          <td colSpan={8} className="p-0">
            <ParentCardDialog
              card={card}
              schoolName={card.schoolName || "Your school"}
              studentName={row.studentName}
              guardianName={primary?.name || "Guardian"}
              onClose={() => {
                setCard(null);
                onChanged();
              }}
            />
          </td>
        </tr>
      ) : null}

      {expanded ? (
        <tr className="border-b border-[#eef2f8] bg-[#fbfcfe]">
          <td colSpan={8} className="px-4 py-4">
            <GuardianManager
              student={{
                id: row.studentId,
                name: row.studentName,
                grade: row.grade,
              }}
              registrationParent={row.registrationParent}
              openAddForm={openAddForm}
              onAddFormOpened={onAddFormOpened}
              onChanged={onChanged}
            />
          </td>
        </tr>
      ) : null}
    </>
  );
}

function relationshipLabel(value) {
  if (!value) return "Guardian";
  return String(value)
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
