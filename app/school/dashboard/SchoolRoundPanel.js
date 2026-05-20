"use client";

import { useCallback, useEffect, useState } from "react";
import {
  FaBell,
  FaCalendarAlt,
  FaExternalLinkAlt,
  FaSave,
  FaUserGraduate,
} from "react-icons/fa";

function label(value) {
  return String(value || "").replaceAll("_", " ");
}

function formatDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function isPast(value) {
  return Boolean(value && new Date(value) < new Date());
}

export default function SchoolRoundPanel({ eventId }) {
  const [eventMeta, setEventMeta] = useState(null);
  const [rounds, setRounds] = useState([]);
  const [eventNotices, setEventNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [drafts, setDrafts] = useState({});
  const [savingKey, setSavingKey] = useState("");
  const isTeamEvent =
    String(eventMeta?.participationFormat || "INDIVIDUAL").toUpperCase() ===
    "TEAM";

  const fetchRounds = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/events/${eventId}/rounds/school`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to load rounds");
      setEventMeta(data.event || null);
      setRounds(Array.isArray(data.rounds) ? data.rounds : []);
      setEventNotices(Array.isArray(data.notices) ? data.notices : []);

      const nextDrafts = {};
      (data.rounds || []).forEach((round) => {
        (round.participants || []).forEach((participant) => {
          const key = `${round._id}-${participant.entryKey || participant.student?._id}`;
          nextDrafts[key] = {
            submissionUrl: participant.submission?.submissionUrl || "",
            submissionType: participant.submission?.submissionType || "VIDEO_LINK",
            remarks: participant.submission?.remarks || "",
          };
        });
      });
      setDrafts(nextDrafts);
    } catch (error) {
      setMessage(error.message || "Failed to load rounds");
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchRounds();
  }, [fetchRounds]);

  const setDraft = (key, updates) => {
    setDrafts((prev) => ({
      ...prev,
      [key]: { ...(prev[key] || {}), ...updates },
    }));
  };

  const submitLink = async (round, participant) => {
    const studentId =
      participant.submissionStudentId ||
      participant.captainStudent?._id ||
      participant.student?._id;
    const key = `${round._id}-${participant.entryKey || studentId}`;
    const draft = drafts[key] || {};

    setSavingKey(key);
    setMessage("");
    try {
      const res = await fetch(
        `/api/events/${eventId}/rounds/${round._id}/submissions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentId,
            submissionUrl: draft.submissionUrl,
            submissionType: draft.submissionType || "VIDEO_LINK",
            remarks: draft.remarks || "",
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to save link");
      setMessage("Submission link saved.");
      await fetchRounds();
    } catch (error) {
      setMessage(error.message || "Failed to save link");
    } finally {
      setSavingKey("");
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-4 text-sm text-slate-400">
        Loading round details...
      </div>
    );
  }

  if (rounds.length === 0 && eventNotices.length === 0) {
    return (
      <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-4 text-sm text-slate-400">
        No event notices or competition rounds have been opened for your school yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {message && (
        <div className="rounded-xl border border-slate-700 bg-slate-900/70 px-4 py-3 text-sm text-slate-200">
          {message}
        </div>
      )}

      {eventNotices.length > 0 && (
        <section className="rounded-xl border border-slate-700 bg-slate-900/50 p-4">
          <h4 className="flex items-center gap-2 text-base font-semibold text-slate-100">
            <FaBell /> Event Notices
          </h4>
          <div className="mt-3 space-y-3">
            {eventNotices.map((notice) => (
              <div
                key={notice._id}
                className="rounded-lg border border-slate-700 bg-slate-950/60 p-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-white">{notice.title}</p>
                  <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
                    {label(notice.type)}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-300">{notice.message}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {rounds.map((round) => {
        const isOnline = round.mode === "ONLINE_SUBMISSION";
        const submissionClosed = isPast(round.submissionDeadline);
        return (
          <section
            key={round._id}
            className="rounded-xl border border-slate-700 bg-slate-900/50 p-4"
          >
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="mb-2 flex flex-wrap gap-2">
                  <span className="rounded-full bg-blue-500/15 px-3 py-1 text-xs font-bold text-blue-200">
                    Round {round.roundNumber}
                  </span>
                  <span className="rounded-full bg-slate-700 px-3 py-1 text-xs text-slate-200">
                    {label(round.mode)}
                  </span>
                  <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs text-emerald-200">
                    {label(round.status)}
                  </span>
                </div>
                <h4 className="text-lg font-bold text-white">{round.title}</h4>
                {round.instructions && (
                  <p className="mt-2 text-sm text-slate-300">
                    {round.instructions}
                  </p>
                )}
              </div>

              <div className="space-y-1 text-sm text-slate-400">
                {round.date && (
                  <div className="flex items-center gap-2">
                    <FaCalendarAlt /> {formatDate(round.date)}
                  </div>
                )}
                {round.submissionDeadline && (
                  <div
                    className={
                      submissionClosed ? "text-red-300" : "text-slate-400"
                    }
                  >
                    {submissionClosed ? "Submission closed" : "Submit by"}{" "}
                    {formatDate(round.submissionDeadline)}
                  </div>
                )}
                {round.venue && <div>Venue: {round.venue}</div>}
                {round.meetingLink && (
                  <a
                    href={round.meetingLink}
                    target="_blank"
                    className="inline-flex items-center gap-2 text-blue-300 hover:text-blue-200"
                  >
                    Open link <FaExternalLinkAlt />
                  </a>
                )}
              </div>
            </div>

            <div className="mt-4">
              <h5 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-200">
                <FaUserGraduate /> {isTeamEvent ? "Your Teams" : "Your Students"}
              </h5>
              <div className="space-y-3">
                {(round.participants || []).map((participant) => {
                  const studentId =
                    participant.submissionStudentId ||
                    participant.captainStudent?._id ||
                    participant.student?._id;
                  const key = `${round._id}-${participant.entryKey || studentId}`;
                  const draft = drafts[key] || {};
                  return (
                    <div
                      key={participant._id}
                      className="rounded-lg border border-slate-700 bg-slate-950/50 p-3"
                    >
                      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="font-semibold text-white">
                            {isTeamEvent
                              ? participant.teamName || "School Team"
                              : participant.student?.name || "Student"}
                          </p>
                          <p className="text-xs text-slate-400">
                            {isTeamEvent ? (
                              <>
                                Captain:{" "}
                                {participant.captainStudent?.name ||
                                  participant.members?.[0]?.name ||
                                  "Not set"}{" "}
                                - {participant.memberCount || participant.members?.length || 0}{" "}
                                members - {label(participant.status)}
                              </>
                            ) : (
                              <>
                                {participant.student?.grade || "Grade not set"} -{" "}
                                {label(participant.status)}
                              </>
                            )}
                          </p>
                          {isTeamEvent && participant.members?.length > 0 && (
                            <p className="mt-1 text-xs text-slate-500">
                              {participant.members
                                .map((member) => member?.name)
                                .filter(Boolean)
                                .join(", ")}
                            </p>
                          )}
                          {participant.status === "SELECTED" && (
                            <p className="mt-1 text-xs font-semibold text-emerald-300">
                              Selected for the next round
                            </p>
                          )}
                          {participant.status === "DISQUALIFIED" && (
                            <p className="mt-1 text-xs font-semibold text-red-300">
                              Disqualified from this round
                            </p>
                          )}
                          {participant.status === "NOT_ATTEMPTED" && (
                            <p className="mt-1 text-xs font-semibold text-slate-400">
                              Awaiting round decision
                            </p>
                          )}
                        </div>
                        {participant.submission?.submissionUrl && (
                          <a
                            href={participant.submission.submissionUrl}
                            target="_blank"
                            className="inline-flex items-center gap-2 text-sm text-blue-300 hover:text-blue-200"
                          >
                            View submitted link <FaExternalLinkAlt />
                          </a>
                        )}
                      </div>

                      {isOnline && (
                        <div className="mt-3 grid gap-2 md:grid-cols-[150px_1fr_auto]">
                          <select
                            value={draft.submissionType || "VIDEO_LINK"}
                            disabled={submissionClosed}
                            onChange={(e) =>
                              setDraft(key, { submissionType: e.target.value })
                            }
                            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
                          >
                            <option value="VIDEO_LINK">Video link</option>
                            <option value="AUDIO_LINK">Audio link</option>
                            <option value="DOCUMENT_LINK">Document link</option>
                            <option value="OTHER_LINK">Other link</option>
                          </select>
                          <input
                            value={draft.submissionUrl || ""}
                            disabled={submissionClosed}
                            onChange={(e) =>
                              setDraft(key, { submissionUrl: e.target.value })
                            }
                            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
                            placeholder="Paste YouTube, Drive, OneDrive, or other link"
                          />
                          <button
                            disabled={savingKey === key || submissionClosed}
                            onClick={() => submitLink(round, participant)}
                            className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
                          >
                            {submissionClosed ? (
                              "Closed"
                            ) : savingKey === key ? (
                              "Saving..."
                            ) : (
                              <>
                                <FaSave /> Save
                              </>
                            )}
                          </button>
                        </div>
                      )}
                      {isOnline && isTeamEvent && (
                        <p className="mt-2 text-xs text-slate-500">
                          Save one shared submission link for the team. It will be
                          attached to the captain entry for round review.
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
