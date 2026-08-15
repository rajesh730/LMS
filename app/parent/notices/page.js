"use client";

import {
  useParentApp,
  useParentResource,
} from "@/components/parent/ParentAppContext";
import StatusCard from "@/components/parent/StatusCard";
import ParentEmptyState from "@/components/parent/ParentEmptyState";
import { formatParentDate } from "@/lib/parentFormat";

/**
 * The Parent Notice Centre (§11), in three sections:
 *   🔴 Action Required · 🟡 Unread · 🟢 Read
 *
 * Rendering this list does NOT mark anything read. The server records delivery
 * only; `openedAt` is written when the parent opens a notice's detail page.
 * Nothing on this screen should ever call the respond endpoint.
 */
export default function ParentNoticesPage() {
  const { t, selectedChildId, preferences } = useParentApp();
  const { loading, error, data, reload } = useParentResource(
    "/api/parent/notices"
  );

  if (!selectedChildId) return null;

  if (loading) {
    return (
      <div className="space-y-3" aria-busy="true">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-100" />
        ))}
      </div>
    );
  }

  if (error || !data) {
    return (
      <ParentEmptyState
        emoji="⚠️"
        tone="neutral"
        title={error || t("common.somethingWrong")}
        action={
          <button
            type="button"
            onClick={reload}
            className="min-h-[48px] rounded-xl bg-[var(--brand-primary)] px-6 font-bold text-white"
          >
            {t("common.retry")}
          </button>
        }
      />
    );
  }

  const { sections } = data;
  const total =
    sections.actionRequired.length +
    sections.unread.length +
    sections.read.length;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-[var(--brand-ink)]">
        {t("notices.title")}
      </h1>

      {total === 0 ? (
        <ParentEmptyState emoji="✓" title={t("notices.empty")} />
      ) : (
        <>
          <NoticeSection
            title={t("notices.actionRequired")}
            emoji="🔴"
            notices={sections.actionRequired}
            calendar={preferences.calendarPreference}
            t={t}
          />
          <NoticeSection
            title={t("notices.unread")}
            emoji="🟡"
            notices={sections.unread}
            calendar={preferences.calendarPreference}
            t={t}
          />
          <NoticeSection
            title={t("notices.read")}
            emoji="🟢"
            notices={sections.read}
            calendar={preferences.calendarPreference}
            t={t}
            muted
          />
        </>
      )}
    </div>
  );
}

function NoticeSection({ title, emoji, notices, calendar, t, muted = false }) {
  if (notices.length === 0) return null;

  return (
    <section>
      <h2 className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-[var(--brand-muted)]">
        <span aria-hidden="true">{emoji}</span>
        {title}
        <span className="rounded-full bg-slate-100 px-2 text-xs">
          {notices.length}
        </span>
      </h2>

      <div className={muted ? "space-y-2 opacity-75" : "space-y-3"}>
        {notices.map((notice) => (
          <StatusCard
            key={notice.id}
            status={notice.status}
            emoji={notice.requiresConsent ? "📝" : "📄"}
            title={notice.title}
            body={notice.preview}
            meta={
              notice.actionDeadline
                ? t("notices.deadline", {
                    date: formatParentDate(notice.actionDeadline, { calendar }),
                  })
                : formatParentDate(notice.publishedAt, { calendar })
            }
            href={`/parent/notices/${notice.id}`}
            cta={t("home.open")}
          />
        ))}
      </div>
    </section>
  );
}
