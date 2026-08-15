"use client";

import Link from "next/link";
import { FaCheckCircle } from "react-icons/fa";
import { useParentApp } from "./ParentAppContext";
import { formatParentDate } from "@/lib/parentFormat";

/**
 * The child's Journey timeline (§5).
 *
 * A vertical rail with one node per milestone. Two things it must get right:
 *
 *  1. **School attribution survives a transfer** (§24). Each group header names
 *     the school, and any entry from a school other than the group's is
 *     labelled individually. A parent should be able to see at a glance that
 *     2025 happened at Orbit and 2026 at Green Village, with nothing rewritten.
 *
 *  2. **Certificates hang off achievements, not beside them.** The Journey has
 *     no separate certificate node — that would show the same milestone twice
 *     (§35). The certificate appears as a verified chip on the achievement that
 *     earned it.
 */
export default function JourneyTimeline({ groups }) {
  const { t, preferences } = useParentApp();

  if (!groups || groups.length === 0) return null;

  return (
    <div className="space-y-8">
      {groups.map((group) => (
        <section key={group.key}>
          <header className="sticky top-[76px] z-10 -mx-1 mb-3 bg-[var(--background)]/95 px-1 py-1.5 backdrop-blur">
            <h2 className="text-lg font-bold text-[var(--brand-ink)]">
              {group.label}
            </h2>
            {group.subLabel ? (
              <p className="text-xs font-medium text-[var(--brand-muted)]">
                {group.subLabel}
              </p>
            ) : null}
          </header>

          <ol className="relative space-y-3 border-l-2 border-[var(--brand-border)] pl-5">
            {group.entries.map((entry) => (
              <JourneyNode
                key={entry.id}
                entry={entry}
                groupSchool={group.subLabel}
                calendar={preferences.calendarPreference}
                t={t}
              />
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}

function JourneyNode({ entry, groupSchool, calendar, t }) {
  const { simpleMode } = useParentApp();

  // Only label the school when it differs from the group's, so a normal
  // timeline is not cluttered — but a cross-school entry is never ambiguous.
  const showSchool =
    entry.school?.name && entry.school.name !== groupSchool;

  return (
    <li className="relative">
      {/* Timeline node. The emoji carries the meaning; the ring is decoration. */}
      <span
        aria-hidden="true"
        className="absolute -left-[31px] flex h-8 w-8 items-center justify-center rounded-full bg-white text-base ring-2 ring-[var(--brand-border)]"
      >
        {entry.emoji}
      </span>

      <div className="rounded-xl border border-[var(--brand-border)] bg-white p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--brand-muted)]">
          {formatParentDate(entry.date, { calendar, relative: false })}
        </p>

        <h3
          className={[
            "mt-0.5 font-bold leading-snug text-[var(--brand-ink)]",
            simpleMode ? "text-base" : "text-sm",
          ].join(" ")}
        >
          {entry.title}
        </h3>

        {entry.placement && entry.type === "ACHIEVEMENT" ? (
          <p className="mt-0.5 text-sm font-semibold text-amber-700">
            {entry.placement}
            {entry.eventTitle ? ` · ${entry.eventTitle}` : ""}
          </p>
        ) : null}

        {entry.description && !simpleMode ? (
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[var(--brand-muted)]">
            {entry.description}
          </p>
        ) : null}

        <div className="mt-2 flex flex-wrap items-center gap-2">
          {showSchool ? (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
              {entry.school.name}
            </span>
          ) : null}

          {entry.teacherReviewed ? (
            <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-700">
              {t("child.teacherReviewed")}
            </span>
          ) : null}

          {/* Certificate chip, not a separate timeline node — see the note above. */}
          {entry.certificate ? (
            <Link
              href={entry.certificate.verifyPath || "/verify"}
              className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100"
            >
              <FaCheckCircle aria-hidden="true" className="h-3 w-3" />
              {t("child.verified")}
            </Link>
          ) : null}
        </div>
      </div>
    </li>
  );
}
