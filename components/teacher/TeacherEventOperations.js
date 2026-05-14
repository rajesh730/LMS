"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FaCalendarAlt,
  FaChalkboardTeacher,
  FaClock,
  FaExternalLinkAlt,
  FaSpinner,
  FaUsers,
} from "react-icons/fa";
import { formatShortDate, getEventStage, getStageClasses } from "@/lib/eventUiStatus";

function label(value) {
  return String(value || "").replaceAll("_", " ");
}

function roundStats(round) {
  const participants = round.participants || [];
  return {
    total: participants.length,
    submitted: participants.filter(
      (participant) =>
        participant.status === "SUBMITTED" ||
        Boolean(participant.submission?.submissionUrl)
    ).length,
    selected: participants.filter((participant) =>
      ["SELECTED", "FINALIST", "WINNER", "RUNNER_UP", "THIRD_PLACE"].includes(
        participant.status
      )
    ).length,
  };
}

function getActiveRound(rounds) {
  return (
    rounds.find((round) =>
      ["OPEN_FOR_SUBMISSION", "IN_PROGRESS", "JUDGING"].includes(round.status)
    ) ||
    rounds.find((round) => round.status !== "COMPLETED") ||
    rounds[rounds.length - 1]
  );
}

function nextRoundAction(round) {
  if (!round) return "Create rounds from the event management workspace.";
  const stats = roundStats(round);
  if (stats.total === 0) return "Generate participants for this round.";
  if (round.mode === "ONLINE_SUBMISSION" && stats.submitted === 0) {
    return "Share instructions and watch for submissions.";
  }
  if (["OPEN_FOR_SUBMISSION", "IN_PROGRESS", "JUDGING"].includes(round.status)) {
    return "Review submissions or attendance and mark selected students.";
  }
  if (round.status === "SHORTLIST_PUBLISHED") {
    return "Move selected students forward or prepare final results.";
  }
  return "Check notices, participants, and upcoming schedule.";
}

export default function TeacherEventOperations() {
  const [events, setEvents] = useState([]);
  const [roundsByEvent, setRoundsByEvent] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/events", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to load events");

      const loadedEvents = data.events || [];
      setEvents(loadedEvents);

      const roundResults = await Promise.all(
        loadedEvents.slice(0, 8).map(async (event) => {
          try {
            const roundRes = await fetch(`/api/events/${event._id}/rounds`, {
              cache: "no-store",
            });
            const roundData = await roundRes.json();
            return [
              event._id,
              roundRes.ok && Array.isArray(roundData.rounds)
                ? roundData.rounds
                : [],
            ];
          } catch {
            return [event._id, []];
          }
        })
      );

      setRoundsByEvent(Object.fromEntries(roundResults));
    } catch (loadError) {
      setError(loadError.message);
      setEvents([]);
      setRoundsByEvent({});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const activeRoundCards = useMemo(() => {
    return events
      .map((event) => {
        const rounds = roundsByEvent[event._id] || [];
        const round = getActiveRound(rounds);
        return round ? { event, round } : null;
      })
      .filter(Boolean);
  }, [events, roundsByEvent]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 text-slate-300">
        <FaSpinner className="mr-2 inline animate-spin" />
        Loading assigned events...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-2xl font-bold text-white">
              <FaChalkboardTeacher className="text-emerald-400" />
              Assigned Event Operations
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Events where you can support rounds, submissions, notices, and student selection.
            </p>
          </div>
          <button
            type="button"
            onClick={loadEvents}
            className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-700"
          >
            Refresh
          </button>
        </div>

        {error && <p className="mb-4 text-sm text-red-300">{error}</p>}

        {events.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-6 text-slate-400">
            No assigned events yet. Ask the school admin to assign you as a mentor
            on a school event.
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {events.map((event) => {
              const stage = getEventStage(event);
              const rounds = roundsByEvent[event._id] || [];
              const activeRound = getActiveRound(rounds);
              return (
                <article
                  key={event._id}
                  className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5"
                >
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-bold ${
                        event.eventScope === "PLATFORM"
                          ? "border-purple-500/30 bg-purple-500/10 text-purple-200"
                          : "border-blue-500/30 bg-blue-500/10 text-blue-200"
                      }`}
                    >
                      {event.eventScope === "PLATFORM"
                        ? "Platform Competition"
                        : "School Event"}
                    </span>
                    <span className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300">
                      {label(event.eventType)}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-white">{event.title}</h3>
                  <p className="mt-2 line-clamp-2 text-sm text-slate-400">
                    {event.description}
                  </p>

                  <div
                    className={`mt-4 rounded-xl border px-3 py-2 text-sm ${getStageClasses(
                      stage.tone
                    )}`}
                  >
                    <div className="font-semibold">{stage.label}</div>
                    <div className="text-xs opacity-90">{stage.nextAction}</div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-300">
                    <span className="inline-flex items-center gap-2">
                      <FaCalendarAlt className="text-slate-500" />
                      {formatShortDate(event.date)}
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <FaUsers className="text-slate-500" />
                      {event.studentCount || event.studentCapacityCount || 0} students
                    </span>
                  </div>

                  {activeRound ? (
                    <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900/70 p-4">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                            Current Round
                          </p>
                          <p className="font-semibold text-white">
                            Round {activeRound.roundNumber}: {activeRound.title}
                          </p>
                        </div>
                        <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                          {label(activeRound.status)}
                        </span>
                      </div>
                      <p className="text-sm text-slate-400">
                        {nextRoundAction(activeRound)}
                      </p>
                    </div>
                  ) : (
                    <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900/70 p-4 text-sm text-slate-400">
                      No rounds created yet.
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link
                      href={`/school/events/${event._id}/manage`}
                      className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
                    >
                      Manage Event
                      <FaExternalLinkAlt className="text-xs" />
                    </Link>
                    {event.visibility === "PUBLIC" && (
                      <Link
                        href={`/events/${event._id}`}
                        className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-700"
                      >
                        Public Page
                        <FaExternalLinkAlt className="text-xs" />
                      </Link>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
        <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-white">
          <FaClock className="text-blue-400" />
          Active Rounds
        </h2>
        {activeRoundCards.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-5 text-slate-400">
            <p className="font-semibold text-slate-300">No active rounds yet.</p>
            <p className="mt-1 text-sm text-slate-500">
              Once rounds are created or opened for your assigned events, they will appear here with review counts.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeRoundCards.map(({ event, round }) => {
              const stats = roundStats(round);
              return (
                <div
                  key={`${event._id}-${round._id}`}
                  className="rounded-xl border border-slate-800 bg-slate-950/70 p-4"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm text-slate-400">{event.title}</p>
                      <p className="font-semibold text-white">
                        Round {round.roundNumber}: {round.title}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {nextRoundAction(round)}
                      </p>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center text-xs text-slate-300">
                      <span className="rounded-lg bg-slate-800 px-3 py-2">
                        <strong className="block text-white">{stats.total}</strong>
                        Total
                      </span>
                      <span className="rounded-lg bg-slate-800 px-3 py-2">
                        <strong className="block text-white">{stats.submitted}</strong>
                        Submitted
                      </span>
                      <span className="rounded-lg bg-slate-800 px-3 py-2">
                        <strong className="block text-white">{stats.selected}</strong>
                        Selected
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
