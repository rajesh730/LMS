"use client";

import { useState } from "react";
import Link from "next/link";
import { FaTimes, FaPaperPlane, FaUserLock } from "react-icons/fa";

/**
 * Message ONE specific guardian.
 *
 * Distinct from the bulk composer on purpose. Selecting a student there reaches
 * every guardian of that child — right for "sports day is Friday", wrong for a
 * private word with one parent. In a separated-family arrangement sending to
 * both can be actively harmful, so this path targets a single
 * ParentStudentLink.
 */
export default function MessageGuardianDialog({
  linkId,
  guardianName,
  studentName,
  canReply = true,
  onClose,
}) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const send = async () => {
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/school/guardians/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ linkId, message }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Could not send");
      setSent(true);
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
      aria-label={`Message ${guardianName}`}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4"
    >
      <div className="mt-16 w-full max-w-md rounded-2xl bg-white shadow-xl">
        <header className="flex items-center gap-3 border-b border-[#e6eaf7] px-5 py-4">
          <FaPaperPlane className="text-purple-700" />
          <h2 className="flex-1 text-base font-black text-[#17120a]">
            Message {guardianName}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-10 w-10 items-center justify-center rounded-full text-[#75869b] hover:bg-slate-100"
          >
            <FaTimes />
          </button>
        </header>

        <div className="px-5 py-5">
          {sent ? (
            <div className="text-center">
              <p className="text-4xl" aria-hidden="true">
                ✓
              </p>
              <p className="mt-3 font-black text-[#17120a]">
                Sent to {guardianName}
              </p>
              <p className="mt-1 text-sm text-[#52657d]">
                Their reply will appear in{" "}
                <Link
                  href="/school/messages"
                  className="font-bold text-purple-700 underline"
                >
                  Parent Messages
                </Link>
                .
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-5 min-h-11 w-full rounded-xl bg-purple-700 font-black text-white"
              >
                Done
              </button>
            </div>
          ) : (
            <>
              <p className="rounded-xl bg-purple-50 px-4 py-3 text-sm text-purple-900">
                Only <strong>{guardianName}</strong> will see this. Other
                guardians of {studentName} will not.
              </p>

              {!canReply ? (
                <p className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50 px-4 py-3 text-xs text-amber-900">
                  <FaUserLock className="mt-0.5 shrink-0" />
                  <span>
                    Messaging is switched off for this guardian, so they will
                    receive this but <strong>cannot reply</strong>. Turn on
                    &quot;Message the school&quot; in their permissions if you
                    want an answer.
                  </span>
                </p>
              ) : null}

              <textarea
                rows={5}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder={`Write to ${guardianName} about ${studentName}...`}
                className="mt-4 w-full rounded-xl border border-[#dbe5f4] p-3 text-sm leading-relaxed"
              />

              {error ? (
                <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">
                  {error}
                </p>
              ) : null}

              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="min-h-11 rounded-xl px-4 text-sm font-black text-[#52657d]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={send}
                  disabled={sending || !message.trim()}
                  className="min-h-11 rounded-xl bg-purple-700 px-5 text-sm font-black text-white disabled:opacity-40"
                >
                  {sending ? "Sending…" : "Send"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
