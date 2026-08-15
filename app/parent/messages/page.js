"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FaPen } from "react-icons/fa";
import {
  useParentApp,
  useParentResource,
} from "@/components/parent/ParentAppContext";
import ParentEmptyState from "@/components/parent/ParentEmptyState";
import TopicChooser from "@/components/parent/TopicChooser";
import { formatRelativeShort } from "@/lib/parentFormat";

/**
 * The Messages tab (§13).
 *
 * Reads like WhatsApp, not like email: avatar-led rows, a one-line preview, a
 * relative timestamp, and an unread dot. No subject lines, no folders, no
 * checkboxes.
 *
 * Switching child switches the whole list — threads belong to a child, and the
 * server scopes by both student and this guardian's participation (§36, §19).
 */
export default function ParentMessagesPage() {
  const { t, selectedChildId, selectedChild } = useParentApp();
  const router = useRouter();
  const { loading, error, data, reload } = useParentResource(
    "/api/parent/messages"
  );
  const [composing, setComposing] = useState(false);

  if (!selectedChildId) return null;

  if (loading) {
    return (
      <div className="space-y-2" aria-busy="true">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-2xl bg-slate-100" />
        ))}
      </div>
    );
  }

  // A guardian without messaging rights gets a plain explanation, not a
  // disabled UI they will keep tapping (§20).
  if (error || !data) {
    return (
      <ParentEmptyState
        emoji="💬"
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

  const { conversations, topics } = data;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-[var(--brand-ink)]">
          {t("messages.title")}
        </h1>
        {topics.length > 0 ? (
          <button
            type="button"
            onClick={() => setComposing(true)}
            className="flex min-h-[44px] items-center gap-2 rounded-xl bg-[var(--brand-primary)] px-4 text-sm font-bold text-white"
          >
            <FaPen aria-hidden="true" className="h-3.5 w-3.5" />
            {t("messages.newConversation")}
          </button>
        ) : null}
      </div>

      {conversations.length === 0 ? (
        <ParentEmptyState
          emoji="💬"
          tone="neutral"
          title={t("messages.empty")}
          action={
            topics.length > 0 ? (
              <button
                type="button"
                onClick={() => setComposing(true)}
                className="min-h-[48px] rounded-xl bg-[var(--brand-primary)] px-6 font-bold text-white"
              >
                {t("messages.newConversation")}
              </button>
            ) : null
          }
        />
      ) : (
        <ul className="divide-y divide-[var(--brand-border)] overflow-hidden rounded-2xl border border-[var(--brand-border)] bg-white">
          {conversations.map((conversation) => (
            <li key={conversation.id}>
              <Link
                href={`/parent/messages/${conversation.id}`}
                className="flex min-h-[72px] items-center gap-3 px-4 py-3 transition-colors hover:bg-slate-50"
              >
                <span
                  aria-hidden="true"
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--brand-primary-soft)] text-xl"
                >
                  {conversation.emoji}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <p className="min-w-0 flex-1 truncate font-bold text-[var(--brand-ink)]">
                      {conversation.title}
                    </p>
                    <span className="shrink-0 text-[11px] text-[var(--brand-muted)]">
                      {formatRelativeShort(conversation.lastMessageAt)}
                    </span>
                  </div>
                  <p
                    className={[
                      "truncate text-sm",
                      conversation.unreadCount > 0
                        ? "font-semibold text-[var(--brand-ink)]"
                        : "text-[var(--brand-muted)]",
                    ].join(" ")}
                  >
                    {conversation.lastMessageSenderType === "PARENT"
                      ? "You: "
                      : ""}
                    {conversation.preview}
                  </p>
                </div>

                {conversation.unreadCount > 0 ? (
                  <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[var(--brand-primary)] px-1.5 text-[11px] font-bold text-white">
                    {conversation.unreadCount}
                  </span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}

      {composing ? (
        <TopicChooser
          topics={topics}
          childName={selectedChild?.name || ""}
          onClose={() => setComposing(false)}
          onStarted={(conversationId) => {
            setComposing(false);
            router.push(`/parent/messages/${conversationId}`);
          }}
        />
      ) : null}
    </div>
  );
}
