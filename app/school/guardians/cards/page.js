"use client";

import { useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import PrintableAccessCard from "@/components/school/PrintableAccessCard";
import PrintButton from "@/components/school/PrintButton";

/**
 * The bulk print sheet — one Parent Access Card per page, ready to cut and hand
 * out at the gate.
 *
 * The batch arrives through `sessionStorage`, not the URL and not a refetch.
 * Two reasons, both important:
 *
 *  1. **Hundreds of one-time PINs cannot go in a query string** — they would
 *     land in browser history, proxy logs and the referer header.
 *  2. **This page must never re-issue.** Generating a card invalidates the
 *     previous one, so a refresh that silently regenerated would kill the very
 *     cards the office just printed. Refreshing here shows a "generate again"
 *     prompt instead, and the school makes that choice knowingly.
 */
/**
 * Read the batch out of sessionStorage EXACTLY ONCE, at module scope.
 *
 * Two constraints meet here. The batch is genuinely external state that React
 * does not own, and it must be consumed on read — leaving hundreds of live PINs
 * in sessionStorage on a shared school-office machine would be careless.
 *
 * Caching the result in a module variable is what makes this safe as a
 * `useSyncExternalStore` snapshot: the getter returns the same reference on
 * every render, so it cannot loop, and the storage entry is cleared the first
 * time regardless of how many times React re-renders.
 */
let cachedBatch;
let hasRead = false;

function readBatchOnce() {
  if (!hasRead) {
    hasRead = true;
    try {
      const raw = window.sessionStorage.getItem("pravyo.cardBatch");
      cachedBatch = raw ? JSON.parse(raw) : null;
      if (raw) window.sessionStorage.removeItem("pravyo.cardBatch");
    } catch {
      cachedBatch = null;
    }
  }
  return cachedBatch ?? null;
}

export default function BulkCardsPage() {
  const router = useRouter();

  const batch = useSyncExternalStore(
    // Never changes after the first read, so there is nothing to subscribe to.
    () => () => {},
    readBatchOnce,
    // Server snapshot: nothing to render until the client has read storage.
    () => null
  );

  // No batch means the page was refreshed, or opened directly.
  if (batch === null) {
    return (
      <main className="card-page">
        <div className="card-missing">
          <p className="card-missing-icon" aria-hidden="true">
            🖨️
          </p>
          <h1 className="card-missing-title">These cards have been printed</h1>
          <p className="card-missing-text">
            For safety, PINs are shown only once and are never stored in a
            readable form.
          </p>
          <p className="card-missing-text">
            If you still need them, generate a new batch — the previous cards
            will stop working.
          </p>
          <button
            type="button"
            onClick={() => router.push("/school/guardians")}
            className="no-print mt-5 min-h-11 rounded-xl bg-purple-700 px-5 font-black text-white"
          >
            Back to Parents &amp; Guardians
          </button>
        </div>
      </main>
    );
  }

  const siteUrl =
    typeof window !== "undefined" ? window.location.origin : "";

  return (
    <main className="card-page">
      <div className="card-toolbar no-print">
        <div>
          <h1 className="card-toolbar-title">
            {batch.cards.length} Parent Access Card
            {batch.cards.length === 1 ? "" : "s"}
          </h1>
          <p className="card-toolbar-note">
            Print now — these PINs cannot be shown again. Each card prints on its
            own page.
          </p>
          {batch.failures?.length > 0 ? (
            <p className="mt-1 text-xs font-bold text-amber-700">
              {batch.failures.length} could not be generated.
            </p>
          ) : null}
        </div>
        <PrintButton label={`Print ${batch.cards.length} cards`} />
      </div>

      <div className="card-sheet space-y-6">
        {batch.cards.map((card, index) => (
          <div key={`${card.parentIdentifier}-${index}`} className="card-page-break">
            <PrintableAccessCard
              card={card}
              schoolName={batch.schoolName}
              siteUrl={siteUrl}
            />
          </div>
        ))}
      </div>
    </main>
  );
}
