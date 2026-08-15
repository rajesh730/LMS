"use client";

import { useCallback, useEffect, useState } from "react";
import {
  useParentApp,
  useParentFetch,
} from "@/components/parent/ParentAppContext";
import JourneyTimeline from "@/components/parent/JourneyTimeline";
import ParentEmptyState from "@/components/parent/ParentEmptyState";

/**
 * The full Journey screen (§5).
 *
 * Filters and grouping are applied server-side and the result is paginated, so
 * a child with a long history does not ship their whole record to the phone
 * (§22). "Load more" appends rather than replacing, keeping scroll position.
 */

const FILTERS = [
  { key: "ALL", labelKey: "journey.all" },
  { key: "ACHIEVEMENTS", labelKey: "journey.achievements" },
  { key: "WRITING", labelKey: "journey.writing" },
  { key: "RESEARCH", labelKey: "journey.research" },
  { key: "EVENTS", labelKey: "journey.events" },
  { key: "CERTIFICATES", labelKey: "journey.certificates" },
];

const GROUPS = [
  { key: "YEAR", labelKey: "journey.groupByYear" },
  { key: "GRADE", labelKey: "journey.groupByGrade" },
  { key: "SCHOOL", labelKey: "journey.groupBySchool" },
];

export default function ParentJourneyPage() {
  const { t, selectedChildId, selectedChild } = useParentApp();
  const parentFetch = useParentFetch();

  const [filter, setFilter] = useState("ALL");
  const [groupBy, setGroupBy] = useState("YEAR");
  const [state, setState] = useState({
    loading: true,
    error: "",
    data: null,
    page: 1,
  });

  const load = useCallback(
    async (nextPage = 1, append = false) => {
      if (!selectedChildId) return;
      try {
        setState((prev) => ({ ...prev, loading: true, error: "" }));
        const data = await parentFetch(
          `/api/parent/journey?filter=${filter}&groupBy=${groupBy}&page=${nextPage}`
        );

        setState((prev) => ({
          loading: false,
          error: "",
          page: nextPage,
          data:
            append && prev.data
              ? { ...data, groups: mergeGroups(prev.data.groups, data.groups) }
              : data,
        }));
      } catch (err) {
        setState((prev) => ({ ...prev, loading: false, error: err.message }));
      }
    },
    [parentFetch, filter, groupBy, selectedChildId]
  );

  // Changing child, filter or grouping resets to page 1.
  useEffect(() => {
    load(1, false);
  }, [load]);

  if (!selectedChildId) return null;

  const data = state.data;
  const hasEntries = (data?.groups || []).some((g) => g.entries.length > 0);

  return (
    <div className="space-y-4">
      <header>
        <h1 className="flex items-center gap-2 text-xl font-bold text-[var(--brand-ink)]">
          <span aria-hidden="true">🌱</span>
          {t("journey.title", { name: selectedChild?.name || "" })}
        </h1>
        {data?.schools?.length > 1 ? (
          // Makes the continuity across schools explicit (§24).
          <p className="mt-1 text-xs text-[var(--brand-muted)]">
            {data.schools.map((school) => school.name).join(" · ")}
          </p>
        ) : null}
      </header>

      {/* Horizontally scrolling filter chips — no dropdowns on a phone. */}
      <div className="-mx-4 overflow-x-auto px-4 scrollbar-hidden">
        <div className="flex w-max gap-2 pb-1">
          {FILTERS.map((entry) => {
            const active = filter === entry.key;
            const count = data?.counts?.[entry.key];
            return (
              <button
                key={entry.key}
                type="button"
                onClick={() => setFilter(entry.key)}
                aria-pressed={active}
                className={[
                  "min-h-[40px] whitespace-nowrap rounded-full border px-4 text-sm font-semibold transition-colors",
                  active
                    ? "border-[var(--brand-primary)] bg-[var(--brand-primary)] text-white"
                    : "border-[var(--brand-border)] bg-white text-[var(--brand-muted)]",
                ].join(" ")}
              >
                {t(entry.labelKey)}
                {typeof count === "number" && count > 0 ? (
                  <span className={active ? "ml-1.5 text-white/80" : "ml-1.5 opacity-60"}>
                    {count}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-[var(--brand-muted)]">
          {t("journey.groupByYear")}:
        </span>
        {GROUPS.map((entry) => (
          <button
            key={entry.key}
            type="button"
            onClick={() => setGroupBy(entry.key)}
            aria-pressed={groupBy === entry.key}
            className={[
              "min-h-[36px] rounded-lg px-3 text-xs font-semibold transition-colors",
              groupBy === entry.key
                ? "bg-[var(--brand-primary-soft)] text-[var(--brand-primary)]"
                : "text-[var(--brand-muted)] hover:bg-slate-100",
            ].join(" ")}
          >
            {t(entry.labelKey)}
          </button>
        ))}
      </div>

      {state.loading && !data ? (
        <TimelineSkeleton />
      ) : state.error ? (
        <ParentEmptyState
          emoji="⚠️"
          tone="neutral"
          title={t("common.somethingWrong")}
        />
      ) : !hasEntries ? (
        <ParentEmptyState
          emoji="🌱"
          tone="neutral"
          title={t("journey.empty", { name: selectedChild?.name || "" })}
        />
      ) : (
        <>
          <JourneyTimeline groups={data.groups} />

          {data.pagination?.hasNextPage ? (
            <button
              type="button"
              onClick={() => load(state.page + 1, true)}
              disabled={state.loading}
              className="min-h-[48px] w-full rounded-xl border-2 border-[var(--brand-primary)] font-bold text-[var(--brand-primary)] disabled:opacity-50"
            >
              {state.loading ? t("common.loading") : t("common.retry")}
            </button>
          ) : null}
        </>
      )}
    </div>
  );
}

/**
 * Merge a newly-fetched page into the groups already on screen.
 * Groups are keyed, so an entry landing in an existing year appends to it
 * rather than creating a duplicate heading.
 */
function mergeGroups(previous = [], next = []) {
  const byKey = new Map(previous.map((group) => [group.key, { ...group }]));

  next.forEach((group) => {
    const existing = byKey.get(group.key);
    if (existing) {
      existing.entries = [...existing.entries, ...group.entries];
    } else {
      byKey.set(group.key, { ...group });
    }
  });

  return Array.from(byKey.values());
}

function TimelineSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true">
      {[0, 1, 2, 3].map((index) => (
        <div key={index} className="h-24 animate-pulse rounded-xl bg-slate-100" />
      ))}
    </div>
  );
}
