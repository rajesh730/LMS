"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FaPlus,
  FaSave,
  FaSpinner,
  FaTrash,
  FaTrophy,
} from "react-icons/fa";

const PLACEMENT_OPTIONS = [
  { value: "NONE", label: "No placement" },
  { value: "WINNER", label: "1st Place" },
  { value: "RUNNER_UP", label: "2nd Place" },
  { value: "THIRD_PLACE", label: "3rd Place" },
  { value: "MERIT", label: "Merit" },
  { value: "SPECIAL_MENTION", label: "Special Mention" },
  { value: "PARTICIPANT", label: "Participant" },
];

const EMPTY_CRITERION = { label: "", maxScore: 10 };

function formatLabel(value) {
  return String(value || "").replaceAll("_", " ");
}

function buildPlacementState(participants) {
  const next = {};

  for (const participant of participants || []) {
    next[participant.studentId] = {
      placement: participant.currentPlacement || "NONE",
      note: participant.resultNote || "",
      scores: Array.isArray(participant.scorecard) ? participant.scorecard : [],
    };
  }

  return next;
}

function getAlignedScores(criteria, scores) {
  const scoreMap = new Map(
    Array.isArray(scores)
      ? scores
          .filter((entry) => entry?.label)
          .map((entry) => [entry.label, entry])
      : []
  );

  return (criteria || [])
    .filter((criterion) => criterion?.label)
    .map((criterion) => ({
      label: criterion.label,
      maxScore: Number(criterion.maxScore || 10),
      score: Number(scoreMap.get(criterion.label)?.score || 0),
      comment: scoreMap.get(criterion.label)?.comment || "",
    }));
}

function getScoreSummary(criteria, scores) {
  const alignedScores = getAlignedScores(criteria, scores);
  const total = alignedScores.reduce(
    (sum, entry) => sum + Number(entry.score || 0),
    0
  );
  const max = alignedScores.reduce(
    (sum, entry) => sum + Number(entry.maxScore || 0),
    0
  );

  return {
    alignedScores,
    total: Math.round(total * 100) / 100,
    max,
    percentage: max > 0 ? Math.round((total / max) * 10000) / 100 : 0,
  };
}

export default function EventResultsManager({
  title = "Event Results",
  description = "Highlight winners, keep participant history, and control whether results appear publicly.",
}) {
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [detail, setDetail] = useState(null);
  const [placements, setPlacements] = useState({});
  const [scorecardCriteria, setScorecardCriteria] = useState([]);
  const [publishPublicly, setPublishPublicly] = useState(false);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const selectedEvent = useMemo(
    () => events.find((event) => event._id === selectedEventId) || null,
    [events, selectedEventId]
  );

  const loadEvents = useCallback(async () => {
    setLoadingEvents(true);
    setError("");
    try {
      const res = await fetch("/api/results/events", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to load events");
      }

      setEvents(data.data || []);
      if (!selectedEventId && data.data?.length > 0) {
        setSelectedEventId(data.data[0]._id);
      }
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoadingEvents(false);
    }
  }, [selectedEventId]);

  const loadDetail = useCallback(async (eventId) => {
    if (!eventId) return;
    setLoadingDetail(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch(`/api/events/${eventId}/results`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to load results");
      }

      setDetail(data.data);
      setPlacements(buildPlacementState(data.data.participants || []));
      setPublishPublicly(Boolean(data.data.publishPublicly));
      setScorecardCriteria(
        Array.isArray(data.data.scorecardCriteria)
          ? data.data.scorecardCriteria
          : []
      );
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    if (selectedEventId) {
      loadDetail(selectedEventId);
    }
  }, [selectedEventId, loadDetail]);

  const updatePlacement = (studentId, key, value) => {
    setPlacements((prev) => ({
      ...prev,
      [studentId]: {
        placement: prev[studentId]?.placement || "NONE",
        note: prev[studentId]?.note || "",
        scores: prev[studentId]?.scores || [],
        [key]: value,
      },
    }));
  };

  const updateCriterion = (index, key, value) => {
    setScorecardCriteria((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [key]: value };
      return next;
    });
  };

  const addCriterion = () => {
    setScorecardCriteria((prev) => [...prev, EMPTY_CRITERION]);
  };

  const removeCriterion = (index) => {
    setScorecardCriteria((prev) => prev.filter((_, item) => item !== index));
  };

  const updateScore = (studentId, index, key, value) => {
    setPlacements((prev) => {
      const existing = prev[studentId] || {
        placement: "NONE",
        note: "",
        scores: [],
      };
      const scores = getAlignedScores(scorecardCriteria, existing.scores);
      scores[index] = {
        ...scores[index],
        [key]:
          key === "score"
            ? Number.isFinite(Number(value))
              ? Number(value)
              : 0
            : value,
      };

      return {
        ...prev,
        [studentId]: {
          ...existing,
          scores,
        },
      };
    });
  };

  const saveResults = async (resultsPublished) => {
    if (!selectedEventId) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        scorecardCriteria,
        placements: Object.entries(placements).map(([studentId, config]) => ({
          studentId,
          placement: config.placement || "NONE",
          note: config.note || "",
          scores: getAlignedScores(scorecardCriteria, config.scores),
        })),
        resultsPublished,
        publishPublicly,
      };

      const res = await fetch(`/api/events/${selectedEventId}/results`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to save results");
      }

      setSuccess(resultsPublished ? "Results published." : "Results draft saved.");
      await Promise.all([loadEvents(), loadDetail(selectedEventId)]);
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  };

  const assignedWinnerCount = Object.values(placements).filter(
    (entry) => entry.placement && entry.placement !== "NONE"
  ).length;
  const scorecardMaxScore = scorecardCriteria
    .filter((criterion) => String(criterion.label || "").trim())
    .reduce((sum, criterion) => sum + Number(criterion.maxScore || 0), 0);

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
        <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
          <div>
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <FaTrophy className="text-yellow-400" />
              {title}
            </h2>
            <p className="text-sm text-slate-400 mt-1">{description}</p>
          </div>

          {loadingEvents ? (
            <div className="text-slate-400 flex items-center gap-2">
              <FaSpinner className="animate-spin" />
              Loading events...
            </div>
          ) : (
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="bg-slate-800 text-white rounded p-2 min-w-72"
            >
              {events.length === 0 ? (
                <option value="">No events available</option>
              ) : (
                events.map((event) => (
                  <option key={event._id} value={event._id}>
                    {event.title}
                  </option>
                ))
              )}
            </select>
          )}
        </div>

        {error && <p className="text-sm text-red-300 mb-3">{error}</p>}
        {success && <p className="text-sm text-emerald-300 mb-3">{success}</p>}

        {selectedEvent && (
          <div className="grid md:grid-cols-4 gap-4">
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Date
              </p>
              <p className="text-white font-semibold mt-2">
                {new Date(selectedEvent.date).toLocaleDateString()}
              </p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Participants
              </p>
              <p className="text-white font-semibold mt-2">
                {selectedEvent.participantCount || 0}
              </p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Winners Marked
              </p>
              <p className="text-white font-semibold mt-2">
                {assignedWinnerCount}
              </p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Scorecard Max
              </p>
              <p className="text-white font-semibold mt-2">
                {scorecardMaxScore > 0 ? scorecardMaxScore : "Placement only"}
              </p>
            </div>
          </div>
        )}
      </div>

      {loadingDetail ? (
        <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 text-slate-300 flex items-center gap-2">
          <FaSpinner className="animate-spin" />
          Loading event results...
        </div>
      ) : detail ? (
        <>
          <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
            <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
              <div>
                <h3 className="text-lg font-semibold text-white">Scorecard Setup</h3>
                <p className="text-sm text-slate-400 mt-1">
                  Add flexible criteria only when you want scored results.
                  Leave this empty for placement-only events.
                </p>
              </div>
              <button
                type="button"
                onClick={addCriterion}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm"
              >
                <FaPlus className="inline mr-2" />
                Add Criterion
              </button>
            </div>

            {scorecardCriteria.length === 0 ? (
              <p className="text-sm text-slate-500 italic">
                No scorecard criteria yet. This event can still publish winner
                placements without scoring.
              </p>
            ) : (
              <div className="space-y-3">
                {scorecardCriteria.map((criterion, index) => (
                  <div
                    key={`${criterion.label}-${index}`}
                    className="grid md:grid-cols-[1fr_180px_auto] gap-3 rounded-xl border border-slate-800 bg-slate-950/70 p-4"
                  >
                    <input
                      type="text"
                      value={criterion.label}
                      onChange={(e) =>
                        updateCriterion(index, "label", e.target.value)
                      }
                      placeholder="Criterion name"
                      className="rounded-xl bg-slate-800 text-white p-3"
                    />
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={criterion.maxScore}
                      onChange={(e) =>
                        updateCriterion(index, "maxScore", e.target.value)
                      }
                      placeholder="Max score"
                      className="rounded-xl bg-slate-800 text-white p-3"
                    />
                    <button
                      type="button"
                      onClick={() => removeCriterion(index)}
                      className="rounded-xl bg-red-600/15 hover:bg-red-600/25 px-4 text-red-300"
                    >
                      <FaTrash />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
            <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
              <div>
                <h3 className="text-lg font-semibold text-white">Results Visibility</h3>
                <p className="text-sm text-slate-400 mt-1">
                  Keep results internal, or show winners on public event and school pages.
                </p>
              </div>
              <label className="flex items-center gap-3 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={publishPublicly}
                  onChange={(e) => setPublishPublicly(e.target.checked)}
                  className="rounded border-slate-600 bg-slate-800 text-blue-500"
                />
                Show winners publicly
              </label>
            </div>

            <div className="flex gap-3 flex-wrap">
              <button
                type="button"
                onClick={() => saveResults(false)}
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-60"
              >
                <FaSave className="inline mr-2" />
                {saving ? "Saving..." : "Save Draft"}
              </button>
              <button
                type="button"
                onClick={() => saveResults(true)}
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-60"
              >
                <FaTrophy className="inline mr-2" />
                {saving ? "Saving..." : "Publish Results"}
              </button>
            </div>
          </div>

          <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
            <h3 className="text-lg font-semibold text-white mb-4">
              Participants, Scores, and Placements
            </h3>

            {detail.participants.length === 0 ? (
              <p className="text-slate-500 italic">
                No participants or submission entries are available for this event yet.
              </p>
            ) : (
              <div className="space-y-4">
                {detail.participants.map((participant) => {
                  const scoreSummary = getScoreSummary(
                    scorecardCriteria,
                    placements[participant.studentId]?.scores
                  );

                  return (
                    <div
                      key={participant.studentId}
                      className="rounded-xl border border-slate-800 bg-slate-950/70 p-4"
                    >
                      <div className="grid xl:grid-cols-[1.2fr_1fr] gap-6">
                        <div>
                          <h4 className="text-white font-semibold">
                            {participant.student?.name || "Participant"}
                          </h4>
                          <p className="text-sm text-slate-400 mt-1">
                            {participant.student?.grade
                              ? participant.student.grade
                              : "Grade unavailable"}
                            {participant.school?.schoolName
                              ? ` • ${participant.school.schoolName}`
                              : ""}
                          </p>
                          <p className="text-xs text-slate-500 mt-2 uppercase tracking-wide">
                            Participation: {formatLabel(participant.participationStatus)}
                          </p>
                          {participant.submissionTitles?.length > 0 && (
                            <p className="text-sm text-slate-300 mt-3">
                              Submissions: {participant.submissionTitles.join(", ")}
                            </p>
                          )}

                          {scorecardCriteria.length > 0 && (
                            <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                              <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
                                <h5 className="text-sm font-semibold text-slate-200">
                                  Scorecard
                                </h5>
                                <div className="text-xs text-emerald-300">
                                  Total: {scoreSummary.total}/{scoreSummary.max || 0}
                                  {scoreSummary.max > 0
                                    ? ` (${scoreSummary.percentage}%)`
                                    : ""}
                                </div>
                              </div>

                              <div className="space-y-3">
                                {scoreSummary.alignedScores.map((entry, index) => (
                                  <div
                                    key={`${participant.studentId}-${entry.label}-${index}`}
                                    className="grid md:grid-cols-[1fr_120px] gap-3"
                                  >
                                    <div>
                                      <label className="block text-xs uppercase tracking-wide text-slate-500 mb-1">
                                        {entry.label} / {entry.maxScore}
                                      </label>
                                      <input
                                        type="text"
                                        value={entry.comment || ""}
                                        onChange={(e) =>
                                          updateScore(
                                            participant.studentId,
                                            index,
                                            "comment",
                                            e.target.value
                                          )
                                        }
                                        placeholder="Optional comment"
                                        className="w-full rounded-xl bg-slate-800 text-white p-3 text-sm"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-xs uppercase tracking-wide text-slate-500 mb-1">
                                        Score
                                      </label>
                                      <input
                                        type="number"
                                        min="0"
                                        max={entry.maxScore}
                                        step="0.5"
                                        value={entry.score}
                                        onChange={(e) =>
                                          updateScore(
                                            participant.studentId,
                                            index,
                                            "score",
                                            e.target.value
                                          )
                                        }
                                        className="w-full rounded-xl bg-slate-800 text-white p-3 text-sm"
                                      />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="space-y-3">
                          <select
                            value={placements[participant.studentId]?.placement || "NONE"}
                            onChange={(e) =>
                              updatePlacement(
                                participant.studentId,
                                "placement",
                                e.target.value
                              )
                            }
                            className="w-full rounded-xl bg-slate-800 text-white p-3 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                          >
                            {PLACEMENT_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          <input
                            type="text"
                            value={placements[participant.studentId]?.note || ""}
                            onChange={(e) =>
                              updatePlacement(participant.studentId, "note", e.target.value)
                            }
                            placeholder="Optional result note"
                            className="w-full rounded-xl bg-slate-800 text-white p-3 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                          />
                          {participant.certificateUrl && (
                            <a
                              href={participant.certificateUrl}
                              className="inline-flex text-sm text-emerald-300 hover:text-emerald-200"
                              target="_blank"
                              rel="noreferrer"
                            >
                              View latest certificate
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
            <h3 className="text-lg font-semibold text-white mb-4">Current Winner List</h3>
            {detail.results.length === 0 ? (
              <p className="text-slate-500 italic">No winners recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {detail.results.map((result) => (
                  <div
                    key={result._id}
                    className="rounded-xl border border-slate-800 bg-slate-950/70 p-4"
                  >
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div>
                        <h4 className="text-white font-semibold">{result.title}</h4>
                        <p className="text-sm text-slate-400 mt-1">
                          {result.student?.name || "Student"}
                          {result.school?.schoolName
                            ? ` • ${result.school.schoolName}`
                            : ""}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-yellow-300">
                          {formatLabel(result.placement)}
                        </div>
                        {result.totalScore > 0 && (
                          <div className="text-xs text-emerald-300 mt-1">
                            {result.totalScore} points
                            {result.scorePercentage > 0
                              ? ` • ${result.scorePercentage}%`
                              : ""}
                          </div>
                        )}
                      </div>
                    </div>
                    {result.description && (
                      <p className="text-sm text-slate-300 mt-3">{result.description}</p>
                    )}
                    {result.certificateUrl && (
                      <a
                        href={result.certificateUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex text-sm text-emerald-300 hover:text-emerald-200 mt-3"
                      >
                        Open certificate
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 text-slate-400">
          Select an event to manage results.
        </div>
      )}
    </div>
  );
}
