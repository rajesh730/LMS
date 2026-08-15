"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParentApp, useParentFetch } from "./ParentAppContext";
import { formatParentDate } from "@/lib/parentFormat";

/**
 * The 2–3 most recent Journey milestones, shown at the bottom of Home (§3).
 *
 * Loaded separately from the Home payload and AFTER it, so the priority cards —
 * the things that actually need the parent's attention — paint first. On a slow
 * connection the preview simply arrives a moment later; it never delays what
 * matters (§22).
 */
export default function JourneyPreview({ childName }) {
  const { t, selectedChildId, preferences } = useParentApp();
  const parentFetch = useParentFetch();
  const [entries, setEntries] = useState(null);

  useEffect(() => {
    let active = true;
    if (!selectedChildId) return undefined;

    (async () => {
      try {
        const data = await parentFetch("/api/parent/journey?limit=3");
        if (!active) return;
        const flat = (data.groups || []).flatMap((group) => group.entries);
        setEntries(flat.slice(0, 3));
      } catch {
        // A failed preview must not disturb Home — render nothing.
        if (active) setEntries([]);
      }
    })();

    return () => {
      active = false;
    };
  }, [parentFetch, selectedChildId]);

  // Nothing to show and nothing to apologise for.
  if (!entries || entries.length === 0) return null;

  return (
    <section className="rounded-2xl border border-[var(--brand-border)] bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-base font-bold text-[var(--brand-ink)]">
          <span aria-hidden="true">🌱</span>
          {t("home.journeyTitle", { name: childName })}
        </h2>
      </div>

      <ol className="space-y-2.5">
        {entries.map((entry) => (
          <li key={entry.id} className="flex items-start gap-3">
            <span aria-hidden="true" className="text-lg leading-none">
              {entry.emoji}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-[var(--brand-ink)]">
                {entry.title}
              </p>
              <p className="text-xs text-[var(--brand-muted)]">
                {formatParentDate(entry.date, {
                  calendar: preferences.calendarPreference,
                  relative: false,
                })}
                {entry.school?.name ? ` · ${entry.school.name}` : ""}
              </p>
            </div>
          </li>
        ))}
      </ol>

      <Link
        href="/parent/journey"
        className="mt-4 flex min-h-[48px] items-center justify-center rounded-xl border-2 border-[var(--brand-primary)] font-bold text-[var(--brand-primary)] transition-colors hover:bg-[var(--brand-primary-soft)]"
      >
        {t("home.viewFullJourney")}
      </Link>
    </section>
  );
}
