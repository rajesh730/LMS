"use client";

import { useParentApp } from "./ParentAppContext";

/**
 * Friendly empty states (§31).
 *
 * "Never show empty tables." An empty section in a parent app is usually GOOD
 * news — nothing needs your attention — so the default tone here is reassurance
 * ("✓ Everything is up to date"), not apology or absence.
 *
 * Where the emptiness is about the child's future rather than the parent's
 * inbox, the copy is forward-looking: "Aayush's achievements will appear here
 * as their journey grows" reads very differently from "No achievements", which
 * a parent can easily hear as a judgement.
 */
export default function ParentEmptyState({
  emoji = "✓",
  title,
  message,
  action = null,
  tone = "positive",
}) {
  const { simpleMode } = useParentApp();

  const toneClasses =
    tone === "positive"
      ? "border-emerald-200 bg-emerald-50"
      : "border-[var(--brand-border)] bg-white";

  return (
    <div
      className={[
        "flex flex-col items-center rounded-2xl border px-6 py-10 text-center",
        toneClasses,
      ].join(" ")}
    >
      <span
        aria-hidden="true"
        className={simpleMode ? "text-5xl" : "text-4xl"}
      >
        {emoji}
      </span>
      {title ? (
        <p
          className={[
            "mt-3 font-bold text-[var(--brand-ink)]",
            simpleMode ? "text-lg" : "text-base",
          ].join(" ")}
        >
          {title}
        </p>
      ) : null}
      {message ? (
        <p
          className={[
            "mt-1 max-w-sm leading-relaxed text-[var(--brand-muted)]",
            simpleMode ? "text-base" : "text-sm",
          ].join(" ")}
        >
          {message}
        </p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
