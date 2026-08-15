"use client";

import Link from "next/link";
import { getStatus } from "@/lib/parentStatus";
import { useParentApp } from "./ParentAppContext";
import ListenButton from "./ListenButton";

/**
 * The Parent App's core card (§4, §32).
 *
 * The status system's rule is enforced structurally here: a card cannot render
 * its colour without also rendering the status ICON and the status TEXT. There
 * is no prop that produces a bare coloured card, so no future screen can
 * accidentally communicate urgency by colour alone.
 *
 * In Simple Parent Mode (§8) the card grows, the body text is dropped, and
 * exactly one primary action remains.
 */
export default function StatusCard({
  status = "INFO",
  emoji,
  eyebrow,
  title,
  body,
  meta,
  href,
  cta,
  onAction,
  listenText = "",
  live = false,
  children,
}) {
  const { t, simpleMode } = useParentApp();
  const descriptor = getStatus(status);

  const statusLabel = t(descriptor.labelKey);

  const action = cta ? (
    href ? (
      <Link
        href={href}
        className={[
          "flex min-h-[48px] items-center justify-center rounded-xl px-5 text-sm font-bold transition-colors",
          simpleMode ? "w-full text-base" : "",
          descriptor.classes.button,
        ].join(" ")}
      >
        {cta}
      </Link>
    ) : (
      <button
        type="button"
        onClick={onAction}
        className={[
          "flex min-h-[48px] items-center justify-center rounded-xl px-5 text-sm font-bold transition-colors",
          simpleMode ? "w-full text-base" : "",
          descriptor.classes.button,
        ].join(" ")}
      >
        {cta}
      </button>
    )
  ) : null;

  return (
    <article
      className={[
        "rounded-2xl border p-4 shadow-sm",
        descriptor.classes.card,
        simpleMode ? "p-5" : "",
      ].join(" ")}
    >
      {/* Status line: colour + icon + words, always together. */}
      <div className="mb-2 flex items-center gap-2">
        <span
          aria-hidden="true"
          className={[
            "flex items-center justify-center rounded-full font-bold text-white",
            descriptor.classes.dot,
            simpleMode ? "h-7 w-7 text-sm" : "h-6 w-6 text-xs",
          ].join(" ")}
        >
          {descriptor.icon}
        </span>
        <span
          className={[
            "font-bold uppercase tracking-wide",
            descriptor.classes.accent,
            simpleMode ? "text-sm" : "text-xs",
          ].join(" ")}
        >
          {eyebrow || statusLabel}
        </span>
        {live ? (
          // The pulse is decorative; "LIVE" in text is what carries the meaning.
          <span className="ml-auto flex items-center gap-1.5 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
            {t("status.live")}
          </span>
        ) : null}
      </div>

      <div className="flex gap-3">
        {emoji ? (
          <span
            aria-hidden="true"
            className={simpleMode ? "text-3xl" : "text-2xl"}
          >
            {emoji}
          </span>
        ) : null}

        <div className="min-w-0 flex-1">
          <h3
            className={[
              "font-bold leading-snug text-[var(--brand-ink)]",
              simpleMode ? "text-lg" : "text-base",
            ].join(" ")}
          >
            {title}
          </h3>

          {/* Simple Mode drops supporting prose — less to read, same action. */}
          {body && !simpleMode ? (
            <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-[var(--brand-muted)]">
              {body}
            </p>
          ) : null}

          {meta ? (
            <p className="mt-1.5 text-xs font-medium text-[var(--brand-muted)]">
              {meta}
            </p>
          ) : null}

          {children}
        </div>
      </div>

      {action || listenText ? (
        <div
          className={[
            "mt-4 flex gap-2",
            simpleMode ? "flex-col" : "flex-wrap items-center",
          ].join(" ")}
        >
          {action}
          {/* Listen sits beside the primary action, never replacing it (§7). */}
          {listenText ? (
            <ListenButton text={listenText} fullWidth={simpleMode} />
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
