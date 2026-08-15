"use client";

import { useState } from "react";
import { FaTimes, FaPaperPlane } from "react-icons/fa";
import { useParentApp } from "./ParentAppContext";

/**
 * "What do you need help with?" — the routed-message chooser (§14).
 *
 * This is the interaction that replaces a staff directory. The parent picks a
 * TOPIC as a large icon tile; the school's configuration decides who receives
 * it. The parent is never shown a list of teachers to choose from, which is the
 * whole point of §14.
 *
 * Only topics the school actually offers appear — an unrouted topic would send
 * a parent's message into an inbox nobody reads.
 */
export default function TopicChooser({ topics, childName, onClose, onStarted }) {
  const { t, selectedChildId } = useParentApp();
  const [topic, setTopic] = useState(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const send = async () => {
    if (!topic || !message.trim()) return;
    setSending(true);
    setError("");

    try {
      const res = await fetch("/api/parent/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: selectedChildId,
          topic: topic.topic,
          message: message.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Failed to send");
      onStarted(json.data.conversationId);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("messages.whatDoYouNeed")}
      className="fixed inset-0 z-50 flex flex-col bg-white"
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
        <p className="flex-1 font-bold text-[var(--brand-ink)]">
          {t("messages.newConversation")}
        </p>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-5">
        <h2 className="text-lg font-bold text-[var(--brand-ink)]">
          {t("messages.whatDoYouNeed")}
        </h2>
        <p className="mt-1 text-sm text-[var(--brand-muted)]">
          {childName}
        </p>

        {/* Large tiles, two per row — comfortably tappable one-handed (§32). */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          {topics.map((entry) => {
            const active = topic?.topic === entry.topic;
            return (
              <button
                key={entry.topic}
                type="button"
                onClick={() => setTopic(entry)}
                aria-pressed={active}
                className={[
                  "flex min-h-[104px] flex-col items-center justify-center gap-2 rounded-2xl border-2 p-3 text-center transition-colors",
                  active
                    ? "border-[var(--brand-primary)] bg-[var(--brand-primary-soft)]"
                    : "border-[var(--brand-border)] bg-white",
                ].join(" ")}
              >
                <span aria-hidden="true" className="text-3xl">
                  {entry.emoji}
                </span>
                <span className="text-sm font-bold leading-tight text-[var(--brand-ink)]">
                  {t(entry.labelKey)}
                </span>
              </button>
            );
          })}
        </div>

        {topic ? (
          <div className="mt-6">
            <label
              htmlFor="parent-message"
              className="block text-sm font-bold text-[var(--brand-ink)]"
            >
              {t("messages.typeMessage")}
            </label>
            <textarea
              id="parent-message"
              rows={5}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              className="mt-2 w-full rounded-xl border border-[var(--brand-border)] p-3 text-base leading-relaxed focus:border-[var(--brand-primary)] focus:outline-none"
              placeholder={t("messages.typeMessage")}
            />
          </div>
        ) : null}

        {error ? (
          <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </p>
        ) : null}
      </div>

      <footer className="border-t border-[var(--brand-border)] p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <button
          type="button"
          disabled={!topic || !message.trim() || sending}
          onClick={send}
          className="flex min-h-[56px] w-full items-center justify-center gap-2 rounded-xl bg-[var(--brand-primary)] text-base font-bold text-white disabled:opacity-40"
        >
          <FaPaperPlane aria-hidden="true" className="h-4 w-4" />
          {sending ? t("common.loading") : t("messages.send")}
        </button>
      </footer>
    </div>
  );
}
