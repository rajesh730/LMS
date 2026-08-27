"use client";

import { useEffect, useState } from "react";
import { FaTimes } from "react-icons/fa";
import { useParentApp, useParentFetch } from "./ParentAppContext";
import ListenButton from "./ListenButton";
import { formatParentDate } from "@/lib/parentFormat";
import { WritingCover, WritingGallery, WritingTags } from "@/components/WritingMedia";

/**
 * Full-screen reader for one piece of the child's writing (§6, §7).
 *
 * The full text is fetched only when the parent opens it — the portfolio list
 * carries previews only, so a child with forty articles does not download forty
 * bodies to scroll a list (§22).
 *
 * The Listen button is given the server-prepared `speechText`, which has markup
 * stripped and block tags turned into sentence breaks. Feeding raw HTML to
 * speech synthesis makes it read tag names aloud.
 */
export default function WritingReader({ writingId, onClose }) {
  const { t, preferences } = useParentApp();
  const parentFetch = useParentFetch();
  const [state, setState] = useState({ loading: true, error: "", writing: null });

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const data = await parentFetch(`/api/parent/writings/${writingId}`);
        if (active) {
          setState({ loading: false, error: "", writing: data.writing });
        }
      } catch (err) {
        if (active) {
          setState({ loading: false, error: err.message, writing: null });
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [parentFetch, writingId]);

  // Lock background scroll while the reader is open, and close on Escape.
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  const writing = state.writing;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={writing?.title || t("child.writing")}
      className="fixed inset-0 z-50 flex min-h-0 flex-col overflow-hidden bg-white"
    >
      <header className="flex items-center gap-2 border-b border-[var(--brand-border)] px-4 py-3">
        <button
          type="button"
          onClick={onClose}
          aria-label={t("common.close")}
          className="flex h-11 w-11 items-center justify-center rounded-full text-[var(--brand-muted)] hover:bg-slate-100"
        >
          <FaTimes aria-hidden="true" className="h-5 w-5" />
        </button>
        <p className="flex-1 truncate text-sm font-semibold text-[var(--brand-muted)]">
          {t("child.writing")}
        </p>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:px-5">
        {state.loading ? (
          <div className="space-y-3" aria-busy="true">
            <div className="h-7 w-3/4 animate-pulse rounded bg-slate-200" />
            <div className="h-4 animate-pulse rounded bg-slate-100" />
            <div className="h-4 animate-pulse rounded bg-slate-100" />
            <div className="h-4 w-5/6 animate-pulse rounded bg-slate-100" />
          </div>
        ) : state.error ? (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">
            {state.error}
          </p>
        ) : (
          <article className="mx-auto max-w-2xl">
            <h1 className="break-words text-2xl font-bold leading-snug text-[var(--brand-ink)]">
              {writing.title}
            </h1>
            <p className="mt-1 text-xs text-[var(--brand-muted)]">
              {formatParentDate(writing.date, {
                calendar: preferences.calendarPreference,
                relative: false,
              })}
            </p>

            {writing.magazineSelected ? (
              <p className="mt-3 inline-flex rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
                {writing.magazinePublished
                  ? t("child.magazinePublished")
                  : t("child.magazineSelected")}
                {writing.magazineIssue?.title
                  ? ` · ${writing.magazineIssue.title}`
                  : ""}
              </p>
            ) : null}

            {writing.reviewNote ? (
              <div className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <p className="font-semibold">{t("child.teacherNote")}</p>
                <p className="mt-1 whitespace-pre-wrap">{writing.reviewNote}</p>
              </div>
            ) : null}

            <div className="mt-4">
              <ListenButton text={writing.speechText} fullWidth />
            </div>

            <WritingCover coverImage={writing.coverImage} images={writing.images} title={writing.title} className="mt-5 aspect-[16/9] max-h-[32rem]" />
            <WritingTags tags={writing.tags} className="mt-4" />
            <div className="prose-parent mt-5 whitespace-pre-wrap break-words text-[17px] leading-[1.75] text-[var(--brand-ink)]">
              {stripHtml(writing.content)}
            </div>

            {false && writing.images?.length ? (
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {writing.images.map((image, index) => (
                  <figure key={image.asset || image.url || index}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={image.url}
                      alt={image.altText || `Writing photo ${index + 1}`}
                      className="w-full rounded-2xl object-cover"
                      loading="lazy"
                    />
                    {image.caption ? (
                      <figcaption className="mt-1 text-sm text-[var(--brand-muted)]">
                        {image.caption}
                      </figcaption>
                    ) : null}
                  </figure>
                ))}
              </div>
            ) : null}
            <WritingGallery
              images={writing.images}
              coverImage={writing.coverImage}
              title={writing.title}
              className="mt-6"
            />
          </article>
        )}
      </div>
    </div>
  );
}

/**
 * Render stored content as plain text.
 *
 * Deliberately NOT dangerouslySetInnerHTML: this content is authored by
 * students and reviewed by teachers, but it is still user input, and injecting
 * it as markup into the parent app would be an XSS vector for the price of some
 * formatting.
 */
function stripHtml(value) {
  return String(value || "")
    .replace(/<\/(p|div|h[1-6]|li|blockquote)>/gi, "\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
