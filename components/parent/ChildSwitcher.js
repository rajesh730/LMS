"use client";

import { useEffect, useRef, useState } from "react";
import { FaChevronDown, FaCheck } from "react-icons/fa";
import { useParentApp } from "./ParentAppContext";
import ChildAvatar from "./ChildAvatar";

/**
 * The child switcher that sits at the top of every screen (§2).
 *
 * Handles all three scenarios the spec calls out:
 *   A. one parent, one child   → hidden because there is nothing to switch
 *   B. several children, one school
 *   C. several children, DIFFERENT schools
 *
 * For (C) the school name is shown against every child in the list, not just in
 * the header — with children at two schools, the school is the only thing that
 * disambiguates two similar-looking rows, and picking the wrong one shows a
 * parent the wrong school's notices.
 *
 * Switching child re-keys the whole app: consumers read `selectedChildId` from
 * context, so every screen refetches against the new child rather than showing
 * a blend of the two (§36).
 */
export default function ChildSwitcher() {
  const { childList, selectedChild, selectChild, t, simpleMode } =
    useParentApp();
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  // Close on outside click and on Escape — a dropdown that traps the user is
  // worse than no dropdown, especially on a phone with no obvious dismiss.
  useEffect(() => {
    if (!open) return undefined;

    const onPointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) setOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (!selectedChild) return null;

  const single = childList.length <= 1;

  // A repeated identity card consumes mobile header space without offering an
  // action. The child's dedicated tab already provides the profile; this
  // control is useful only when the guardian has a real choice.
  if (single) return null;

  const header = (
    <div className="flex min-w-0 items-center gap-2 text-left sm:gap-3">
      <ChildAvatar
        name={selectedChild.name}
        photoUrl={selectedChild.photoUrl}
        size={simpleMode ? 52 : 44}
      />
      <div className="min-w-0 flex-1">
        <p
          className={[
            "truncate font-bold text-[var(--brand-ink)]",
            simpleMode ? "text-lg" : "text-base",
          ].join(" ")}
        >
          {selectedChild.name}
        </p>
        <p
          className={[
            "truncate text-[var(--brand-muted)]",
            simpleMode ? "text-sm" : "text-xs",
          ].join(" ")}
        >
          {selectedChild.grade}
          {selectedChild.grade && selectedChild.school?.name ? " · " : ""}
          {selectedChild.school?.name}
        </p>
      </div>
      {!single ? (
        <FaChevronDown
          aria-hidden="true"
          className={[
            "h-4 w-4 shrink-0 text-[var(--brand-muted)] transition-transform",
            open ? "rotate-180" : "",
          ].join(" ")}
        />
      ) : null}
    </div>
  );

  return (
    <div ref={containerRef} className="relative min-w-0 px-2 py-2 sm:px-4">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={t("child.switch")}
        className="flex min-h-[56px] w-full items-center rounded-2xl px-2 py-2 transition-colors hover:bg-slate-50 active:bg-slate-100"
      >
        {header}
      </button>

      {open ? (
        <div
          role="listbox"
          aria-label={t("child.selectChild")}
          className="absolute inset-x-4 z-50 mt-1 overflow-hidden rounded-2xl border border-[var(--brand-border)] bg-white shadow-lg"
        >
          {childList.map((child) => {
            const active = child.studentId === selectedChild.studentId;
            return (
              <button
                key={child.studentId}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  selectChild(child.studentId);
                  setOpen(false);
                }}
                className={[
                  "flex min-h-[64px] w-full items-center gap-3 px-4 py-3 text-left transition-colors",
                  active ? "bg-[var(--brand-primary-soft)]" : "hover:bg-slate-50",
                ].join(" ")}
              >
                <ChildAvatar
                  name={child.name}
                  photoUrl={child.photoUrl}
                  size={40}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-[var(--brand-ink)]">
                    {child.name}
                  </span>
                  {/* School on every row — scenario C depends on it. */}
                  <span className="block truncate text-xs text-[var(--brand-muted)]">
                    {child.grade}
                    {child.grade && child.school?.name ? " · " : ""}
                    {child.school?.name}
                  </span>
                </span>
                {active ? (
                  <FaCheck
                    aria-hidden="true"
                    className="h-4 w-4 shrink-0 text-[var(--brand-primary)]"
                  />
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
