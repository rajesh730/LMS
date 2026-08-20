"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import {
  FaSearch,
  FaInbox,
  FaPaperPlane,
  FaCheck,
  FaInfoCircle,
} from "react-icons/fa";
import DashboardLayout from "@/components/DashboardLayout";
import LoadingState from "@/components/ui/LoadingState";
import AlertBanner from "@/components/ui/AlertBanner";
import SchoolConversation from "@/components/school/SchoolConversation";
import useRealtimeChannel from "@/lib/client/useRealtimeChannel";
import { schoolMessagesChannel } from "@/lib/messagingChannels";
import { formatRelativeShort } from "@/lib/parentFormat";

/**
 * Parent messages — one screen for the whole channel.
 *
 * The audience choice sits ABOVE the list rather than inside a compose popup,
 * because it answers the question a school actually starts with: *who am I
 * dealing with right now?* Choosing "A whole class" reshapes the list to that
 * class; choosing "Choose parents" lets specific people be ticked. The list is
 * people, not just threads, so a parent who has never written still appears and
 * can be opened and messaged.
 *
 * That is the difference from an ordinary inbox, and it is the point: school →
 * parent contact is not a separate feature hidden behind a button, it is the
 * same list read the other way round.
 *
 * Live over SSE — a parent's message appears without anyone pressing refresh.
 */

const SCOPES = [
  { id: "CHOOSE", label: "Choose parents" },
  { id: "GRADE", label: "A whole class" },
  { id: "ALL", label: "Everyone" },
];

export default function SchoolMessagesPage() {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const requestedConversationId = searchParams.get("conversation");

  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ messageable: 0, truncated: false });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [scope, setScope] = useState("ALL");
  const [grade, setGrade] = useState("");
  const [grades, setGrades] = useState([]);
  const [search, setSearch] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);

  // Ticked guardians in "Choose parents" mode, by link id.
  const [picked, setPicked] = useState(() => new Set());
  const [activeKey, setActiveKey] = useState(null);
  const [broadcast, setBroadcast] = useState(null);

  const load = useCallback(async () => {
    setError("");
    try {
      const url = new URL(
        "/api/school/messages/people",
        window.location.origin
      );
      url.searchParams.set("scope", scope);
      if (scope === "GRADE" && grade) url.searchParams.set("grade", grade);
      if (search.trim()) url.searchParams.set("search", search.trim());

      const res = await fetch(url.toString(), { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Could not load messages");

      setRows(json.data.rows);
      setMeta({
        messageable: json.data.messageable || 0,
        truncated: Boolean(json.data.truncated),
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [scope, grade, search]);

  useEffect(() => {
    const handle = setTimeout(load, 300);
    return () => clearTimeout(handle);
  }, [load]);

  // Class list for the "A whole class" option.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/school/grade-structure", {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = await res.json();
        if (active) setGrades(data.grades || []);
      } catch {
        // A missing class list only removes one option; messaging still works.
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const schoolId =
    session?.user?.role === "SCHOOL_ADMIN"
      ? session.user.id
      : session?.user?.schoolId;
  const channel = schoolId ? schoolMessagesChannel(schoolId) : "";

  // A parent's message lands here on its own — silence means "no news", not
  // "you forgot to reload".
  useRealtimeChannel(channel, load, { enabled: Boolean(schoolId) });

  const visible = useMemo(
    () => (unreadOnly ? rows.filter((row) => row.unreadCount > 0) : rows),
    [rows, unreadOnly]
  );

  // Derived, not stored: once a first message creates the thread, the row
  // reloads with a conversationId and the panel becomes the live chat by
  // itself — no second piece of state to keep in step.
  const activeRow = rows.find((row) => row.key === activeKey) || null;

  // Notifications deep-link to the actual conversation. Wait until the people
  // list has loaded, then select its row without overriding a later manual tap.
  useEffect(() => {
    if (!requestedConversationId || activeKey) return;
    const match = rows.find(
      (row) => String(row.conversationId || "") === requestedConversationId
    );
    if (match) setActiveKey(match.key);
  }, [rows, requestedConversationId, activeKey]);

  const chooseScope = (next) => {
    setScope(next);
    setPicked(new Set());
    setBroadcast(null);
    setActiveKey(null);
    if (next !== "GRADE") setGrade("");
  };

  const togglePicked = (linkId) => {
    setPicked((current) => {
      const next = new Set(current);
      if (next.has(linkId)) next.delete(linkId);
      else next.add(linkId);
      return next;
    });
  };

  if (status === "loading") {
    return (
      <DashboardLayout>
        <LoadingState title="Loading" message="Opening your messages." />
      </DashboardLayout>
    );
  }

  if (!["SCHOOL_ADMIN", "SUPER_ADMIN", "TEACHER"].includes(session?.user?.role)) {
    return (
      <DashboardLayout>
        <AlertBanner
          type="error"
          title="School access required"
          message="Only school staff can read parent messages."
        />
      </DashboardLayout>
    );
  }

  const unread = rows.filter((row) => row.unreadCount > 0).length;
  const gradeName =
    grades.find((g) => (g.originalValue || g._id) === grade)?.name || "";

  // The bulk action for whichever audience is chosen. One line each, because
  // the wording is what stops a school messaging 400 families by accident.
  const bulk =
    scope === "CHOOSE" && picked.size > 0
      ? {
          label: `Message ${picked.size} selected parent${picked.size === 1 ? "" : "s"}`,
          title: `${picked.size} selected parent${picked.size === 1 ? "" : "s"}`,
          target: { linkIds: Array.from(picked) },
        }
      : scope === "GRADE" && grade && meta.messageable > 0
        ? {
            label: `Message all parents of ${gradeName || grade}`,
            title: `Parents of ${gradeName || grade}`,
            target: { grade },
          }
        : scope === "ALL" && meta.messageable > 0
          ? {
              label: "Message every parent in the school",
              title: "Every parent in the school",
              target: { scope: "ALL" },
            }
          : null;

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl space-y-4">
        <div>
          <h1 className="text-3xl font-black text-[#17120a]">Parent Messages</h1>
          <p className="mt-1 text-base text-[#52657d]">
            {unread > 0
              ? `${unread} waiting for a reply`
              : "Everything has been answered"}
          </p>
        </div>

        {/* Who am I dealing with? Chips rather than a dropdown so every
            audience is visible at once — sending to the whole school by
            accident is the mistake this screen has to prevent. */}
        <div className="rounded-2xl border border-[#e1e7f2] bg-white p-3 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            {SCOPES.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => chooseScope(option.id)}
                aria-pressed={scope === option.id}
                className={`min-h-11 rounded-xl border px-4 text-sm font-black transition ${
                  scope === option.id
                    ? "border-purple-700 bg-purple-700 text-white"
                    : "border-[#dbe5f4] bg-white text-[#0a2f66] hover:bg-[#f8fbff]"
                }`}
              >
                {option.label}
              </button>
            ))}

            {scope === "GRADE" ? (
              <select
                value={grade}
                onChange={(event) => {
                  setGrade(event.target.value);
                  setActiveKey(null);
                  setBroadcast(null);
                }}
                className="min-h-11 rounded-xl border border-[#dbe5f4] bg-white px-3 text-sm font-black text-[#24314d]"
              >
                <option value="">Choose a class…</option>
                {grades.map((g) => (
                  <option key={g._id} value={g.originalValue || g._id}>
                    {g.name}
                  </option>
                ))}
              </select>
            ) : null}

            <div className="relative ml-auto">
              <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-[#75869b]" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search parent or student"
                className="h-11 w-56 rounded-xl border border-[#dbe5f4] bg-[#f8fbff] pl-11 pr-4 text-sm font-semibold outline-none focus:border-purple-300"
              />
            </div>

            <button
              type="button"
              onClick={() => setUnreadOnly((value) => !value)}
              aria-pressed={unreadOnly}
              className={`min-h-11 rounded-xl border px-4 text-sm font-black transition ${
                unreadOnly
                  ? "border-purple-700 bg-purple-700 text-white"
                  : "border-[#dbe5f4] bg-white text-[#0a2f66]"
              }`}
            >
              Unread only
            </button>
          </div>

          {bulk ? (
            <button
              type="button"
              onClick={() => {
                setBroadcast(bulk);
                setActiveKey(null);
              }}
              className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-purple-700 px-4 text-sm font-black text-white sm:w-auto"
            >
              <FaPaperPlane className="h-3.5 w-3.5" />
              {bulk.label}
            </button>
          ) : null}
        </div>

        {error ? (
          <AlertBanner type="error" title="Could not load" message={error} />
        ) : null}

        <div className="grid gap-4 lg:grid-cols-[minmax(300px,380px)_1fr]">
          {/* Who the school can talk to */}
          <div className="overflow-hidden rounded-2xl border border-[#e1e7f2] bg-white shadow-sm">
            {loading ? (
              <div className="space-y-2 p-3">
                {[0, 1, 2, 3].map((index) => (
                  <div
                    key={index}
                    className="h-20 animate-pulse rounded-xl bg-slate-100"
                  />
                ))}
              </div>
            ) : visible.length === 0 ? (
              <div className="px-5 py-14 text-center">
                <FaInbox className="mx-auto text-3xl text-[#c2ccdb]" />
                <p className="mt-3 font-black text-[#24314d]">
                  {unreadOnly
                    ? "Nothing unread"
                    : scope === "GRADE" && !grade
                      ? "Choose a class above"
                      : "Nobody to show"}
                </p>
                <p className="mt-1 text-sm text-[#52657d]">
                  {scope === "GRADE" && !grade
                    ? "Pick the class whose parents you want."
                    : "Parents appear here once guardians are connected."}
                </p>
              </div>
            ) : (
              <ul className="max-h-[70vh] divide-y divide-[#eef2f8] overflow-y-auto">
                {visible.map((row) => {
                  const selectable = scope === "CHOOSE" && row.linkId;
                  const isPicked = selectable && picked.has(row.linkId);

                  return (
                    <li key={row.key} className="flex items-stretch">
                      {selectable ? (
                        <button
                          type="button"
                          onClick={() => togglePicked(row.linkId)}
                          aria-pressed={isPicked}
                          aria-label={`Select ${row.guardianName}`}
                          className="flex shrink-0 items-center pl-3 pr-1"
                        >
                          <span
                            aria-hidden="true"
                            className={`flex h-5 w-5 items-center justify-center rounded border-2 ${
                              isPicked
                                ? "border-purple-700 bg-purple-700 text-white"
                                : "border-[#c8d4e6]"
                            }`}
                          >
                            {isPicked ? (
                              <FaCheck className="h-2.5 w-2.5" />
                            ) : null}
                          </span>
                        </button>
                      ) : null}

                      <button
                        type="button"
                        onClick={() => {
                          setActiveKey(row.key);
                          setBroadcast(null);
                        }}
                        className={`flex min-w-0 flex-1 items-start gap-3 py-3 pr-4 text-left transition hover:bg-[#f8fbff] ${
                          selectable ? "pl-2" : "pl-4"
                        } ${activeKey === row.key ? "bg-[#f1f5ff]" : ""}`}
                      >
                        <span
                          aria-hidden="true"
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f1f5ff] text-lg"
                        >
                          {row.emoji}
                        </span>

                        <span className="min-w-0 flex-1">
                          <span className="flex items-baseline gap-2">
                            <span className="min-w-0 flex-1 truncate font-black text-[#24314d]">
                              {row.guardianName}
                            </span>
                            {row.lastMessageAt ? (
                              <span className="shrink-0 text-[10px] text-[#75869b]">
                                {formatRelativeShort(row.lastMessageAt)}
                              </span>
                            ) : null}
                          </span>

                          {/* Which child — a parent with two children needs
                              disambiguating at a glance. */}
                          <span className="block truncate text-[11px] font-bold text-[#75869b]">
                            {row.studentName}
                            {row.grade ? ` · ${row.grade}` : ""}
                          </span>

                          <span
                            className={`mt-0.5 block truncate text-xs ${
                              row.unreadCount > 0
                                ? "font-bold text-[#24314d]"
                                : "text-[#75869b]"
                            }`}
                          >
                            {row.conversationId ? (
                              <>
                                {row.lastMessageSenderType === "STAFF"
                                  ? "You: "
                                  : ""}
                                {/* The headline first when there is one, so a
                                    long inbox is scannable by topic rather
                                    than by opening sentence. */}
                                {row.subject ? (
                                  <strong className="text-[#24314d]">
                                    {row.subject}
                                    {row.preview ? " — " : ""}
                                  </strong>
                                ) : null}
                                {row.preview}
                              </>
                            ) : (
                              <span className="italic text-[#9aa8bd]">
                                No messages yet
                              </span>
                            )}
                          </span>
                        </span>

                        {row.unreadCount > 0 ? (
                          <span className="mt-1 flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-purple-700 px-1.5 text-[10px] font-black text-white">
                            {row.unreadCount}
                          </span>
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            {meta.truncated ? (
              <p className="border-t border-[#eef2f8] px-4 py-2 text-xs text-amber-700">
                Showing the first 150. Search, or pick a class, to narrow this.
              </p>
            ) : null}
          </div>

          {/* The conversation, or a composer for whoever has no thread yet */}
          <div className="min-h-[420px] overflow-hidden rounded-2xl border border-[#e1e7f2] bg-white shadow-sm">
            {broadcast ? (
              <Composer
                key={broadcast.label}
                title={broadcast.title}
                subtitle="Each parent receives this in their own private thread, so replies never go to a group."
                target={broadcast.target}
                onCancel={() => setBroadcast(null)}
                onSent={() => {
                  setBroadcast(null);
                  setPicked(new Set());
                  load();
                }}
              />
            ) : activeRow?.conversationId ? (
              <SchoolConversation
                key={activeRow.conversationId}
                conversationId={activeRow.conversationId}
                channel={channel}
                onReplied={load}
                onClose={() => setActiveKey(null)}
              />
            ) : activeRow ? (
              <Composer
                key={activeRow.key}
                title={`${activeRow.guardianName} · ${activeRow.relationship}`}
                subtitle={`About ${activeRow.studentName}${
                  activeRow.grade ? ` · ${activeRow.grade}` : ""
                }. This starts the conversation.`}
                target={{ linkId: activeRow.linkId }}
                warning={
                  activeRow.connected
                    ? ""
                    : "This guardian has not used their Parent Access Card yet. The message waits for them."
                }
                onCancel={() => setActiveKey(null)}
                onSent={load}
              />
            ) : (
              <div className="flex h-full min-h-[420px] flex-col items-center justify-center px-6 text-center">
                <FaInbox className="text-4xl text-[#c2ccdb]" />
                <p className="mt-4 font-black text-[#24314d]">
                  Choose a parent to read and reply
                </p>
                <p className="mt-1 text-sm text-[#52657d]">
                  Replies are sent from the school, not from your personal
                  account.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

/**
 * Write and send — to one guardian, or to the whole chosen audience.
 *
 * Deliberately not a Notice: notices carry read receipts, acknowledgement and
 * consent. Using them for "the bus is late" teaches parents to skim the channel
 * that also carries school closures.
 */
function Composer({ title, subtitle, target, warning = "", onSent, onCancel }) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const send = async () => {
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/school/guardians/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, message, ...target }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Could not send");
      setResult(json.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  if (result) {
    return (
      <div className="flex h-full min-h-[420px] flex-col items-center justify-center px-6 text-center">
        <p className="text-4xl" aria-hidden="true">
          ✓
        </p>
        <p className="mt-3 text-xl font-black text-[#17120a]">
          Sent to {result.sent} guardian{result.sent === 1 ? "" : "s"}
        </p>
        {result.notConnected > 0 ? (
          <p className="mt-3 max-w-sm rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {result.notConnected} of them have not connected to Pravyo yet. The
            message is waiting, but they will not see it until they use their
            Parent Access Card.
          </p>
        ) : null}
        <button
          type="button"
          onClick={onSent}
          className="mt-5 min-h-11 rounded-xl bg-purple-700 px-6 font-black text-white"
        >
          Done
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-[420px] flex-col">
      <header className="border-b border-[#e6eaf7] px-5 py-4">
        <h2 className="text-lg font-black text-[#17120a]">{title}</h2>
        <p className="mt-0.5 text-sm text-[#52657d]">{subtitle}</p>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
        {warning ? (
          <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {warning}
          </p>
        ) : null}

        <div>
          <label
            htmlFor="msg-subject"
            className="block text-sm font-black text-[#24314d]"
          >
            Subject (optional)
          </label>
          <input
            id="msg-subject"
            type="text"
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            placeholder="e.g. Sports day"
            maxLength={200}
            className="mt-1.5 h-12 w-full rounded-xl border border-[#dbe5f4] px-4 text-sm"
          />
          <p className="mt-1 text-xs text-[#75869b]">
            Shown to parents as the heading above your message.
          </p>
        </div>

        <div>
          <label
            htmlFor="msg-body"
            className="block text-sm font-black text-[#24314d]"
          >
            Message
          </label>
          <textarea
            id="msg-body"
            rows={6}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Write in simple language. Many parents read this on a small phone."
            className="mt-1.5 w-full rounded-xl border border-[#dbe5f4] p-3 text-sm leading-relaxed"
          />
        </div>

        <p className="flex items-start gap-2 rounded-xl bg-sky-50 px-4 py-3 text-xs text-sky-900">
          <FaInfoCircle className="mt-0.5 shrink-0" />
          <span>
            This is a conversation, not a notice. If you need a read receipt, an
            acknowledgement, or permission from parents, publish a{" "}
            <strong>Notice</strong> instead.
          </span>
        </p>

        {error ? (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </p>
        ) : null}
      </div>

      <footer className="flex justify-end gap-2 border-t border-[#e6eaf7] px-5 py-3">
        <button
          type="button"
          onClick={onCancel}
          className="min-h-11 rounded-xl px-4 text-sm font-black text-[#52657d]"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={send}
          disabled={sending || !message.trim()}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-purple-700 px-5 text-sm font-black text-white disabled:opacity-40"
        >
          <FaPaperPlane className="h-3.5 w-3.5" />
          {sending ? "Sending…" : "Send message"}
        </button>
      </footer>
    </div>
  );
}
