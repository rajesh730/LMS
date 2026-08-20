"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { FaArrowLeft, FaCheckCircle, FaRegCircle } from "react-icons/fa";
import {
  useParentApp,
  useParentFetch,
} from "@/components/parent/ParentAppContext";
import ListenButton from "@/components/parent/ListenButton";
import ParentEmptyState from "@/components/parent/ParentEmptyState";
import { getStatus } from "@/lib/parentStatus";
import { formatParentDate } from "@/lib/parentFormat";

/**
 * Notice detail (§11).
 *
 * Opening this page is what creates the read receipt — the GET request itself
 * records `openedAt` server-side, after the notice has been confirmed
 * deliverable to this child. Nothing here posts a "mark read" call, because
 * read state must reflect the parent actually reaching the content.
 *
 * Also renders the two action types the spec defines:
 *   - "✓ I Understand" for acknowledgement notices
 *   - "Allow {name} to participate?  YES / NO" for permission notices
 */
export default function ParentNoticeDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { t, selectedChildId, selectedChild, preferences, refreshBadges } =
    useParentApp();
  const parentFetch = useParentFetch();

  const [state, setState] = useState({ loading: true, error: "", data: null });
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!selectedChildId || !id) return;
    try {
      setState((prev) => ({ ...prev, loading: true, error: "" }));
      const data = await parentFetch(`/api/parent/notices/${id}`);
      setState({ loading: false, error: "", data });
      // The open just happened — the unread badge is now stale.
      refreshBadges();
    } catch (err) {
      setState({ loading: false, error: err.message, data: null });
    }
  }, [parentFetch, id, selectedChildId, refreshBadges]);

  useEffect(() => {
    load();
  }, [load]);

  const respond = async (payload) => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/parent/notices/${id}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, studentId: selectedChildId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Failed");
      await load();
    } catch (err) {
      setState((prev) => ({ ...prev, error: err.message }));
    } finally {
      setSubmitting(false);
    }
  };

  if (state.loading) {
    return <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />;
  }

  if (state.error && !state.data) {
    return (
      <ParentEmptyState
        emoji="⚠️"
        tone="neutral"
        title={t("common.somethingWrong")}
        action={
          <button
            type="button"
            onClick={() => router.push("/parent/notices")}
            className="min-h-[48px] rounded-xl bg-[var(--brand-primary)] px-6 font-bold text-white"
          >
            {t("common.back")}
          </button>
        }
      />
    );
  }

  const { notice, guardians, canGiveConsent } = state.data;
  const descriptor = getStatus(notice.status);
  const receipt = notice.receipt || {};
  const calendar = preferences.calendarPreference;

  // Plain text for speech: the body plus the title, so a parent hears what the
  // notice is called before its contents (§7).
  const speechText = `${notice.title}. ${stripHtml(notice.content)}`;

  return (
    <article className="space-y-5">
      <button
        type="button"
        onClick={() => router.push("/parent/notices")}
        className="flex min-h-[44px] items-center gap-2 text-sm font-semibold text-[var(--brand-muted)]"
      >
        <FaArrowLeft aria-hidden="true" className="h-3.5 w-3.5" />
        {t("notices.title")}
      </button>

      <header className={`rounded-2xl border p-4 ${descriptor.classes.card}`}>
        <div className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white ${descriptor.classes.dot}`}
          >
            {descriptor.icon}
          </span>
          <span
            className={`text-xs font-bold uppercase tracking-wide ${descriptor.classes.accent}`}
          >
            {t(descriptor.labelKey)}
          </span>
        </div>

        <h1 className="mt-2 break-words text-xl font-bold leading-snug text-[var(--brand-ink)]">
          {notice.title}
        </h1>
        <p className="mt-1 text-xs text-[var(--brand-muted)]">
          {formatParentDate(notice.publishedAt, { calendar, relative: false })}
        </p>
      </header>

      <ListenButton text={speechText} fullWidth />

      <div className="whitespace-pre-wrap break-words text-[15px] leading-relaxed text-[var(--brand-ink)]">
        {notice.content}
      </div>

      {notice.attachments?.length > 0 ? (
        <ul className="space-y-2">
          {notice.attachments.map((attachment, index) => (
            <li key={index}>
              <a
                href={attachment.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-[48px] items-center gap-2 rounded-xl border border-[var(--brand-border)] bg-white px-4 text-sm font-semibold text-[var(--brand-primary)]"
              >
                📎 {attachment.name || "Attachment"}
              </a>
            </li>
          ))}
        </ul>
      ) : null}

      {/* --- Acknowledgement --------------------------------------------- */}
      {notice.requiresAcknowledgement ? (
        receipt.acknowledgedAt ? (
          <p className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
            <FaCheckCircle aria-hidden="true" className="h-4 w-4" />
            {t("notices.acknowledged", {
              date: formatParentDate(receipt.acknowledgedAt, { calendar }),
            })}
          </p>
        ) : (
          <button
            type="button"
            disabled={submitting}
            onClick={() => respond({ action: "ACKNOWLEDGE" })}
            className="min-h-[56px] w-full rounded-xl bg-emerald-600 text-base font-bold text-white disabled:opacity-60"
          >
            ✓ {t("notices.iUnderstand")}
          </button>
        )
      ) : null}

      {/* --- Consent ------------------------------------------------------ */}
      {notice.requiresConsent ? (
        <section className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-4">
          <p className="text-base font-bold text-[var(--brand-ink)]">
            {t("notices.consentQuestion", { name: selectedChild?.name || "" })}
          </p>

          {receipt.consentDecision === "YES" ||
          receipt.consentDecision === "NO" ? (
            <p className="mt-3 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-[var(--brand-ink)]">
              {t("notices.consentRecorded", {
                answer:
                  receipt.consentDecision === "YES"
                    ? t("notices.yes")
                    : t("notices.no"),
                date: formatParentDate(receipt.consentDecidedAt, { calendar }),
              })}
            </p>
          ) : canGiveConsent ? (
            <div className="mt-4 grid grid-cols-1 gap-3 min-[360px]:grid-cols-2">
              <button
                type="button"
                disabled={submitting}
                onClick={() => respond({ action: "CONSENT", decision: "YES" })}
                className="min-h-[56px] rounded-xl bg-emerald-600 text-base font-bold text-white disabled:opacity-60"
              >
                {t("notices.yes")}
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => respond({ action: "CONSENT", decision: "NO" })}
                className="min-h-[56px] rounded-xl border-2 border-red-500 bg-white text-base font-bold text-red-700 disabled:opacity-60"
              >
                {t("notices.no")}
              </button>
            </div>
          ) : (
            // A guardian without consent rights sees the question and the
            // outcome, but no buttons — the school decides who may answer (§20).
            <p className="mt-3 text-sm text-[var(--brand-muted)]">
              Only a guardian approved by the school can answer this.
            </p>
          )}
        </section>
      ) : null}

      {/* --- Per-guardian read state (§11) -------------------------------- */}
      {guardians?.length > 1 ? (
        <section className="rounded-2xl border border-[var(--brand-border)] bg-white p-4">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-[var(--brand-muted)]">
            {t("notices.otherGuardians")}
          </h2>
          <ul className="space-y-2">
            {guardians.map((guardian, index) => (
              <li
                key={index}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <span className="font-medium text-[var(--brand-ink)]">
                  {relationshipLabel(guardian.relationshipType)}
                </span>
                {guardian.openedAt ? (
                  <span className="flex items-center gap-1.5 text-emerald-700">
                    <FaCheckCircle aria-hidden="true" className="h-3.5 w-3.5" />
                    {t("notices.read")}{" "}
                    {formatParentDate(guardian.openedAt, { calendar })}
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-[var(--brand-muted)]">
                    <FaRegCircle aria-hidden="true" className="h-3.5 w-3.5" />
                    {t("notices.notReadYet")}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </article>
  );
}

function relationshipLabel(value) {
  return String(value || "Guardian")
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function stripHtml(value) {
  return String(value || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
