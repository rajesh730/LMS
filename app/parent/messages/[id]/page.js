"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { FaArrowLeft, FaPaperPlane } from "react-icons/fa";
import {
  useParentApp,
  useParentFetch,
} from "@/components/parent/ParentAppContext";
import VoiceRecorder from "@/components/parent/VoiceRecorder";
import { formatParentTime, formatDuration, formatFileSize } from "@/lib/parentFormat";

/**
 * A conversation thread (§15).
 *
 * Modern-messaging conventions on purpose: right-aligned own messages, bubbles,
 * inline timestamps, a composer pinned to the bottom. The one addition that
 * matters most for this audience is the mic — a guardian who is uncomfortable
 * typing can hold it and speak (§15).
 */
export default function ParentConversationPage() {
  const { id } = useParams();
  const router = useRouter();
  const { t, selectedChildId, refreshBadges } = useParentApp();
  const parentFetch = useParentFetch();

  const [state, setState] = useState({ loading: true, error: "", data: null });
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  const load = useCallback(async () => {
    if (!selectedChildId || !id) return;
    try {
      const data = await parentFetch(`/api/parent/messages/${id}`);
      setState({ loading: false, error: "", data });
      refreshBadges();
    } catch (err) {
      setState({ loading: false, error: err.message, data: null });
    }
  }, [parentFetch, id, selectedChildId, refreshBadges]);

  useEffect(() => {
    load();
  }, [load]);

  // Jump to the newest message whenever the thread changes length.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [state.data?.messages?.length]);

  const send = async ({ text = "", attachments = [] }) => {
    const body = text.trim();
    if (!body && attachments.length === 0) return;

    setSending(true);
    try {
      const res = await fetch(`/api/parent/messages/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: selectedChildId,
          message: body,
          attachments,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Failed to send");
      setDraft("");
      await load();
    } catch (err) {
      setState((prev) => ({ ...prev, error: err.message }));
    } finally {
      setSending(false);
    }
  };

  if (state.loading) {
    return <div className="h-96 animate-pulse rounded-2xl bg-slate-100" />;
  }

  if (!state.data) {
    return (
      <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800">
        {state.error || t("common.somethingWrong")}
      </div>
    );
  }

  const { conversation, messages } = state.data;

  return (
    // Sized against the viewport so the composer stays pinned while the
    // message list scrolls independently.
    <div className="-mx-4 flex h-[calc(100vh-8rem)] flex-col md:mx-0">
      <header className="flex items-center gap-2 border-b border-[var(--brand-border)] bg-white px-3 py-2">
        <button
          type="button"
          onClick={() => router.push("/parent/messages")}
          aria-label={t("common.back")}
          className="flex h-11 w-11 items-center justify-center rounded-full text-[var(--brand-muted)] hover:bg-slate-100"
        >
          <FaArrowLeft aria-hidden="true" className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold text-[var(--brand-ink)]">
            {conversation.title}
          </p>
        </div>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto bg-[var(--background)] px-4 py-4">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} t={t} />
        ))}
        <div ref={bottomRef} />
      </div>

      {state.error ? (
        <p className="bg-red-50 px-4 py-2 text-xs text-red-800">{state.error}</p>
      ) : null}

      <footer className="border-t border-[var(--brand-border)] bg-white p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <div className="flex items-end gap-2">
          <textarea
            rows={1}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              // Enter sends, Shift+Enter makes a new line — the convention
              // every messaging app uses.
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                send({ text: draft });
              }
            }}
            placeholder={t("messages.typeMessage")}
            className="max-h-32 min-h-[48px] flex-1 resize-none rounded-2xl border border-[var(--brand-border)] px-4 py-3 text-base focus:border-[var(--brand-primary)] focus:outline-none"
          />

          {draft.trim() ? (
            <button
              type="button"
              onClick={() => send({ text: draft })}
              disabled={sending}
              aria-label={t("messages.send")}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--brand-primary)] text-white disabled:opacity-50"
            >
              <FaPaperPlane aria-hidden="true" className="h-4 w-4" />
            </button>
          ) : (
            // The mic replaces Send when there is nothing typed, so the primary
            // action for a non-typing guardian is always the biggest target.
            <VoiceRecorder
              disabled={sending}
              onRecorded={(attachment) => send({ attachments: [attachment] })}
            />
          )}
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
          "max-w-[80%] rounded-2xl px-3.5 py-2.5",
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

        {message.attachments?.map((attachment, index) => (
          <Attachment key={index} attachment={attachment} mine={mine} t={t} />
        ))}

        {message.body ? (
          <p className="whitespace-pre-wrap text-[15px] leading-relaxed">
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
      // Thumbnail first, full image only on tap (§22).
      <a
        href={attachment.url}
        target="_blank"
        rel="noopener noreferrer"
        className="mb-1.5 block"
      >
        {/* Arbitrary uploaded URLs, same reasoning as ChildAvatar. */}
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
