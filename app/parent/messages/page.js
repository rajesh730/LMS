"use client";

import { useParentApp } from "@/components/parent/ParentAppContext";
import ParentChat from "@/components/parent/ParentChat";

/**
 * The Messages tab — the guardian's conversation with the school.
 *
 * Opens straight into the chat. There is no list and no "new message" button:
 * a guardian has exactly one thread per child, so a list screen in front of it
 * was a tap that showed a single row and told nobody anything.
 *
 * The first message a guardian sends starts the thread; they are never asked to
 * categorise it first.
 */
export default function ParentMessagesPage() {
  const { t, selectedChildId, selectedChild } = useParentApp();

  if (!selectedChildId) return null;

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-xl font-bold text-[var(--brand-ink)]">
          {t("messages.title")}
        </h1>
        {/* Who they are talking to — the school, about this child. */}
        <p className="text-sm text-[var(--brand-muted)]">
          {selectedChild?.school?.name}
        </p>
      </div>

      <ParentChat />
    </div>
  );
}
