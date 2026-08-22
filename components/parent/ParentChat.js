"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FaPaperPlane } from "react-icons/fa";
import { useParentApp } from "./ParentAppContext";
import useRealtimeChannel from "@/lib/client/useRealtimeChannel";
import {
  parentMessagesChannel,
  MESSAGE_EVENTS,
} from "@/lib/messagingChannels";
import {
  formatParentTime,
  formatDuration,
  formatFileSize,
} from "@/lib/parentFormat";

/**
 * The guardian's conversation with the school — messages and a composer.
 *
 * Now that a guardian has exactly ONE thread per child, a list screen in front
 * of it was a tap that never told anyone anything: open Messages, see one row,
 * tap it, arrive at the chat. So Messages opens straight into the chat, and
 * this component powers both that and the deep-linked thread page.
 *
 * `conversationId` is optional. Without one it shows the guardian's current
 * thread for the selected child, or an empty chat whose first message starts
 * one — no "new message" step to find.
 */
export default function ParentChat({ conversationId = null, onLoaded }) {
  const { t, selectedChildId, selectedChild, parent, refreshBadges } =
    useParentApp();

  const [state, setState] = useState({
    loading: true,
    error: "",
    conversation: null,
    messages: [],
    topics: [],
  });
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  const load = useCallback(async () => {
    if (!selectedChildId) return;

    try {
      // A specific thread (deep link), or whichever one this child has.
      let id = conversationId;
      let topics = [];

      if (!id) {
        const listRes = await fetch(
          `/api/parent/messages?studentId=${encodeURIComponent(selectedChildId)}`,
          { cache: "no-store" }
        );
        const listJson = await listRes.json();
        if (!listRes.ok) {
          throw new Error(listJson.message || t("common.somethingWrong"));
        }
        topics = listJson.data.topics || [];
        // Most recent first — normally the only one.
        id = listJson.data.conversations[0]?.id || null;
      }

      if (!id) {
        // No thread yet. Show an empty chat rather than a dead end.
        setState({
          loading: false,
          error: "",
          conversation: null,
          messages: [],
          topics,
        });
        onLoaded?.(null);
        return;
      }

      const res = await fetch(`/api/parent/messages/${id}`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || t("common.somethingWrong"));

      setState({
        loading: false,
        error: "",
        conversation: json.data.conversation,
        messages: json.data.messages,
        topics,
      });
      onLoaded?.(json.data);
      refreshBadges();
    } catch (err) {
      setState((prev) => ({ ...prev, loading: false, error: err.message }));
    }
  }, [conversationId, selectedChildId, t, onLoaded, refreshBadges]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [state.messages.length]);

  // Live: a reply appears without pulling to refresh, and ✓✓ turns on when the
  // school opens the thread.
  useRealtimeChannel(
    parent?.id ? parentMessagesChannel(parent.id) : "",
    (payload) => {
      if (
        payload?.type === MESSAGE_EVENTS.NEW_MESSAGE ||
        payload?.type === MESSAGE_EVENTS.THREAD_READ
      ) {
        load();
      }
    },
    { enabled: Boolean(parent?.id) }
  );

  const send = async ({ text = "", attachments = [] }) => {
    const body = text.trim();
    if (!body && attachments.length === 0) return;

    setSending(true);
    try {
      if (state.conversation) {
        const res = await fetch(
          `/api/parent/messages/${state.conversation.id}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: body, attachments }),
          }
        );
        const json = await res.json();
        if (!res.ok) throw new Error(json.message || "Failed to send");
      } else {
        // First message starts the thread. The topic only decides where it is
        // routed; a school that has not configured routing gets its office
        // inbox either way, so the guardian is never asked to categorise.
        const topic =
          state.topics.find((entry) => entry.configured)?.topic ||
          state.topics[0]?.topic ||
          "OTHER";

        const res = await fetch("/api/parent/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentId: selectedChildId,
            topic,
            message: body,
            attachments,
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.message || "Failed to send");
      }

      setDraft("");
      await load();
    } catch (err) {
      setState((prev) => ({ ...prev, error: err.message }));
    } finally {
      setSending(false);
    }
  };

  if (state.loading) {
    return <div className="h-80 animate-pulse rounded-2xl bg-slate-100" />;
  }

  // A hard failure (no messaging permission, revoked access) — say so plainly.
  if (state.error && !state.conversation && state.messages.length === 0) {
    return (
      <div className="rounded-2xl bg-red-50 px-4 py-4 text-sm text-red-800">
        {state.error}
      </div>
    );
  }

  return (
    <div className="-mx-3 flex h-[calc(100dvh-11.5rem)] flex-col overflow-hidden sm:-mx-4 md:mx-0 md:h-[calc(100dvh-10rem)]">
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain bg-[var(--background)] px-3 py-4 pb-24 sm:px-4 md:pb-4">
        {state.messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-6 text-center">
            <span aria-hidden="true" className="text-4xl">
              💬
            </span>
            <p className="mt-3 font-bold text-[var(--brand-ink)]">
              {t("messages.empty")}
            </p>
            <p className="mt-1 text-sm text-[var(--brand-muted)]">
              {selectedChild?.school?.name}
            </p>
          </div>
        ) : (
          state.messages.map((message) => (
            <MessageBubble key={message.id} message={message} t={t} />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {state.error ? (
        <p className="bg-red-50 px-4 py-2 text-xs text-red-800">{state.error}</p>
      ) : null}

      <footer className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-30 border-t border-[var(--brand-border)] bg-white md:static md:z-auto">
        <div className="mx-auto flex max-w-2xl items-end gap-2 p-3">
          <textarea
            rows={1}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              // Enter sends, Shift+Enter makes a new line.
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                send({ text: draft });
              }
            }}
            placeholder={t("messages.typeMessage")}
            className="max-h-32 min-h-[48px] flex-1 resize-none rounded-2xl border border-[var(--brand-border)] px-4 py-3 text-base focus:border-[var(--brand-primary)] focus:outline-none"
          />

          <button
            type="button"
            onClick={() => send({ text: draft })}
            disabled={sending || !draft.trim()}
            aria-label={t("messages.send")}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--brand-primary)] text-white disabled:opacity-40"
          >
            <FaPaperPlane aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
      </footer>
    </div>
  );
}

function MessageBubble({ message, t }) {
  const mine = message.mine;

  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div
        className={[
          "min-w-0 max-w-[88%] overflow-hidden rounded-2xl px-3.5 py-2.5 sm:max-w-[80%]",
          mine
            ? "rounded-br-sm bg-[var(--brand-primary)] text-white"
            : "rounded-bl-sm border border-[var(--brand-border)] bg-white text-[var(--brand-ink)]",
        ].join(" ")}
      >
        {!mine && message.senderName ? (
          <p className="mb-0.5 text-[11px] font-bold text-[var(--brand-primary)]">
            {message.senderName}
          </p>
        ) : null}

        {/* The school's headline, when this message is an announcement.
            Set apart from the body with weight and a rule rather than only
            size: a guardian skimming a long thread needs to find "Sports day"
            without reading three paragraphs, and §7's status rules mean type
            alone must carry the distinction — it cannot rely on colour. */}
        {message.subject ? (
          <p
            className={[
              "mb-1.5 border-b pb-1 text-[15px] font-bold leading-snug",
              mine
                ? "border-white/25"
                : "border-[var(--brand-border)] text-[var(--brand-ink)]",
            ].join(" ")}
          >
            {message.subject}
          </p>
        ) : null}

        {message.attachments?.map((attachment, index) => (
          <Attachment key={index} attachment={attachment} mine={mine} t={t} />
        ))}

        {message.body ? (
          <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed">
            {message.body}
          </p>
        ) : null}

        <p
          className={[
            "mt-1 text-right text-[10px]",
            mine ? "text-white/70" : "text-[var(--brand-muted)]",
          ].join(" ")}
        >
          {formatParentTime(message.createdAt)}
          {mine && message.readByStaff ? " · ✓✓" : ""}
        </p>
      </div>
    </div>
  );
}

function Attachment({ attachment, mine, t }) {
  if (attachment.kind === "VOICE") {
    return (
      <div className="mb-1.5">
        <audio
          controls
          preload="none"
          src={attachment.url}
          className="w-56 max-w-full"
        >
          {t("messages.voiceMessage")}
        </audio>
        {attachment.durationSeconds ? (
          <p
            className={`text-[10px] ${mine ? "text-white/70" : "text-[var(--brand-muted)]"}`}
          >
            {formatDuration(attachment.durationSeconds)}
          </p>
        ) : null}
      </div>
    );
  }

  if (attachment.kind === "IMAGE") {
    return (
      <a
        href={attachment.url}
        target="_blank"
        rel="noopener noreferrer"
        className="mb-1.5 block"
      >
        {/* Arbitrary uploaded URL — the image optimiser is not configured for
            these hosts. Same approach as elsewhere in the app. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={attachment.thumbnailUrl || attachment.url}
          alt={attachment.name || t("messages.photo")}
          loading="lazy"
          decoding="async"
          className="max-h-56 w-full rounded-xl object-cover"
        />
      </a>
    );
  }

  return (
    <a
      href={attachment.url}
      target="_blank"
      rel="noopener noreferrer"
      className={[
        "mb-1.5 flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium",
        mine ? "bg-white/15" : "bg-slate-100",
      ].join(" ")}
    >
      📎
      <span className="min-w-0 flex-1 truncate">
        {attachment.name || t("messages.document")}
      </span>
      {attachment.sizeBytes ? (
        <span className="shrink-0 text-[10px] opacity-70">
          {formatFileSize(attachment.sizeBytes)}
        </span>
      ) : null}
    </a>
  );
}
