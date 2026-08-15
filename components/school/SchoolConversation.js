"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { FaPaperPlane, FaTimes, FaCheckDouble } from "react-icons/fa";
import { formatParentTime, formatDuration } from "@/lib/parentFormat";
import useRealtimeChannel from "@/lib/useRealtimeChannel";
import { MESSAGE_EVENTS } from "@/lib/messagingChannels";

/**
 * One parent conversation, from the school side.
 *
 * Mirrors the parent's own thread view so both sides see the same shape of
 * conversation — the school should be able to picture exactly what the parent
 * is looking at.
 *
 * Replies are attributed to the SCHOOL (or the routed team label), never to the
 * individual staff member. A parent should not learn which teacher is on the
 * desk today, and staff should not become personally contactable through this
 * channel.
 */
export default function SchoolConversation({
  conversationId,
  channel,
  onReplied,
  onClose,
}) {
  const [state, setState] = useState({ loading: true, data: null, error: "" });
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/school/messages/${conversationId}`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Could not load");
      setState({ loading: false, data: json.data, error: "" });
    } catch (err) {
      setState({ loading: false, data: null, error: err.message });
    }
  }, [conversationId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [state.data?.messages?.length]);

  // Live thread: reload on anything touching THIS conversation. Both event
  // kinds matter — a new message adds a bubble, a read event flips ✓✓ on.
  useRealtimeChannel(
    channel || "",
    (payload) => {
      if (payload?.conversationId !== conversationId) return;
      if (
        payload.type === MESSAGE_EVENTS.NEW_MESSAGE ||
        payload.type === MESSAGE_EVENTS.THREAD_READ
      ) {
        load();
      }
    },
    { enabled: Boolean(channel) }
  );

  const send = async () => {
    const text = draft.trim();
    if (!text) return;

    setSending(true);
    try {
      const res = await fetch(`/api/school/messages/${conversationId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Could not send");

      setDraft("");
      await load();
      // Refresh the list so the preview and unread badge stay truthful.
      onReplied?.();
    } catch (err) {
      setState((prev) => ({ ...prev, error: err.message }));
    } finally {
      setSending(false);
    }
  };

  if (state.loading) {
    return <div className="h-full min-h-[400px] animate-pulse bg-slate-50" />;
  }

  if (!state.data) {
    return (
      <div className="p-5">
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">
          {state.error}
        </p>
      </div>
    );
  }

  const { conversation, messages } = state.data;

  return (
    <div className="flex h-full min-h-[400px] flex-col">
      <header className="flex items-start gap-3 border-b border-[#e1e7f2] px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="truncate font-black text-[#24314d]">
            {conversation.guardianName}
          </p>
          <p className="truncate text-xs text-[#75869b]">
            {conversation.child ? (
              <>
                About{" "}
                <Link
                  href={`/school/guardians?student=${conversation.child.id}`}
                  className="font-bold text-[#0a2f66] underline"
                >
                  {conversation.child.name}
                </Link>
                {conversation.child.grade ? ` · ${conversation.child.grade}` : ""}
              </>
            ) : (
              conversation.routedToLabel
            )}
          </p>
        </div>

        {conversation.isAnnouncement ? (
          <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-600">
            Announcement
          </span>
        ) : null}

        <button
          type="button"
          onClick={onClose}
          aria-label="Close conversation"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#75869b] hover:bg-slate-100 lg:hidden"
        >
          <FaTimes />
        </button>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto bg-[#f8fbff] px-4 py-4">
        {messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-[#75869b]">
            No messages yet.
          </p>
        ) : (
          messages.map((message) => (
            <Bubble key={message.id} message={message} />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {state.error ? (
        <p className="bg-red-50 px-4 py-2 text-xs text-red-800">{state.error}</p>
      ) : null}

      <footer className="border-t border-[#e1e7f2] p-3">
        <div className="flex items-end gap-2">
          <textarea
            rows={2}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                send();
              }
            }}
            placeholder="Write a reply. Keep it simple — many parents read this on a small phone."
            className="max-h-32 min-h-[52px] flex-1 resize-none rounded-xl border border-[#dbe5f4] px-3 py-2.5 text-sm outline-none focus:border-purple-300"
          />
          <button
            type="button"
            onClick={send}
            disabled={sending || !draft.trim()}
            aria-label="Send reply"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-purple-700 text-white disabled:opacity-40"
          >
            <FaPaperPlane className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-1.5 text-[11px] text-[#75869b]">
          Sent as <strong>{conversation.routedToLabel || "the school"}</strong> —
          your personal details are never shown to the parent.
        </p>
      </footer>
    </div>
  );
}

function Bubble({ message }) {
  const mine = message.mine;

  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div
        className={[
          "max-w-[80%] rounded-2xl px-3.5 py-2.5",
          mine
            ? "rounded-br-sm bg-purple-700 text-white"
            : "rounded-bl-sm border border-[#e1e7f2] bg-white text-[#27344a]",
        ].join(" ")}
      >
        {!mine && message.senderName ? (
          <p className="mb-0.5 text-[11px] font-black text-purple-800">
            {message.senderName}
          </p>
        ) : null}

        {message.attachments?.map((attachment, index) => (
          <Attachment key={index} attachment={attachment} mine={mine} />
        ))}

        {message.body ? (
          <p className="whitespace-pre-wrap text-sm leading-relaxed">
            {message.body}
          </p>
        ) : null}

        <p
          className={[
            "mt-1 flex items-center justify-end gap-1 text-[10px]",
            mine ? "text-white/70" : "text-[#75869b]",
          ].join(" ")}
        >
          {formatParentTime(message.createdAt)}
          {/* Only meaningful on our own messages: has the parent seen it? */}
          {mine && message.readByParent ? (
            <FaCheckDouble className="h-2.5 w-2.5" title="Read by parent" />
          ) : null}
        </p>
      </div>
    </div>
  );
}

function Attachment({ attachment, mine }) {
  if (attachment.kind === "VOICE") {
    return (
      <div className="mb-1.5">
        <audio controls preload="none" src={attachment.url} className="w-56 max-w-full">
          Voice message
        </audio>
        {attachment.durationSeconds ? (
          <p className={`text-[10px] ${mine ? "text-white/70" : "text-[#75869b]"}`}>
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
          alt={attachment.name || "Photo"}
          loading="lazy"
          decoding="async"
          className="max-h-48 w-full rounded-xl object-cover"
        />
      </a>
    );
  }

  return (
    <a
      href={attachment.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`mb-1.5 flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold ${
        mine ? "bg-white/15" : "bg-slate-100"
      }`}
    >
      📎 <span className="min-w-0 flex-1 truncate">{attachment.name || "Document"}</span>
    </a>
  );
}
