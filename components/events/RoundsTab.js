"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FaBell,
  FaCheckCircle,
  FaEdit,
  FaEllipsisH,
  FaEye,
  FaLayerGroup,
  FaPlay,
  FaPlus,
  FaSave,
  FaSearch,
  FaTrash,
  FaTrophy,
  FaUsers,
} from "react-icons/fa";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import AppDate from "@/components/common/AppDate";
import { getEventStartState } from "@/lib/eventStartRules";

const NON_FINAL_STATUS_BUTTONS = [
  { value: "SELECTED", label: "Selected" },
  { value: "DISQUALIFIED", label: "Disqualified" },
  { value: "NOT_ATTEMPTED", label: "Not Attempted" },
];

const FINAL_STATUS_BUTTONS = [
  { value: "WINNER", label: "Winner" },
  { value: "RUNNER_UP", label: "1st Runner Up" },
  { value: "THIRD_PLACE", label: "2nd Runner Up" },
  { value: "FINALIST", label: "Finalist" },
  { value: "DISQUALIFIED", label: "Disqualified" },
  { value: "NOT_ATTEMPTED", label: "Not Attempted" },
];

const EMPTY_ROUND_FORM = {
  title: "",
  isFinal: false,
};

function label(value) {
  if (value === "RUNNER_UP") return "1st Runner Up";
  if (value === "THIRD_PLACE") return "2nd Runner Up";
  if (value === "NOT_ATTEMPTED") return "Not Attempted";
  if (value === "SHORTLIST_PUBLISHED") return "Shortlist Published";
  return String(value || "").replaceAll("_", " ");
}

function buildRoundForm(round) {
  return {
    title: round?.title || "",
    isFinal: Boolean(round?.roundType === "FINAL" || round?.isFinal),
  };
}

function isFinalRoundRecord(round) {
  return round?.roundType === "FINAL" || Boolean(round?.isFinal);
}

function getStatusPillClass(status, active = false) {
  if (status === "WINNER") {
    return active
      ? "border-amber-500 bg-amber-500 text-white"
      : "event-participant-selected-control round-status-not-attempted";
  }
  if (status === "RUNNER_UP" || status === "THIRD_PLACE") {
    return active
      ? "border-violet-600 bg-violet-600 text-white"
      : "event-participant-selected-control border-violet-600 bg-violet-600 text-white";
  }
  if (status === "FINALIST" || status === "SELECTED") {
    return active
      ? "round-status-selected border-emerald-600 bg-emerald-600 text-white"
      : status === "SELECTED"
      ? "event-participant-selected-control round-status-selected"
      : "event-participant-selected-control border-[#1f4e79] bg-[#1f4e79] text-white";
  }
  if (status === "DISQUALIFIED") {
    return active
      ? "border-rose-600 bg-rose-600 text-white"
      : "event-participant-selected-control round-status-disqualified";
  }
  if (status === "NOT_ATTEMPTED") {
    return active
      ? "border-slate-600 bg-slate-600 text-white"
      : "event-participant-selected-control round-status-not-attempted";
  }
  return active
    ? "border-[#1c4a8d] bg-[#1c4a8d] text-white"
    : "border-[#d6e6fb] bg-[#f7fbff] text-[#33598f]";
}

function getStatusActionButtonClass(status, active = false) {
  if (!active) {
    return "border-[#d6e2ea] bg-white text-[#0a2f66] hover:bg-[#f8fbff]";
  }
  if (status === "SELECTED" || status === "WINNER") {
    return "event-participant-selected-control round-action-bg-active round-status-selected";
  }
  if (status === "RUNNER_UP" || status === "THIRD_PLACE" || status === "FINALIST") {
    return "event-participant-selected-control round-action-bg-active round-status-final";
  }
  if (status === "DISQUALIFIED") {
    return "event-participant-selected-control round-action-bg-active round-status-disqualified";
  }
  if (status === "NOT_ATTEMPTED") {
    return "event-participant-selected-control round-action-bg-active round-status-not-attempted";
  }
  return "event-participant-selected-control round-action-bg-active round-status-final";
}

function summarizeTeamRoundParticipant(participant) {
  const members = Array.isArray(participant?.members) ? participant.members : [];
  return {
    schoolName:
      participant?.school?.schoolName || participant?.school?.name || "School",
    teamName: participant?.teamName || "School Team",
    captainName:
      participant?.captainStudent?.name || members[0]?.name || "Not set",
    members,
    memberCount: participant?.memberCount || members.length || 0,
  };
}

export default function RoundsTab({
  event,
  requests = [],
  readOnly = false,
  onCompetitionClosed,
  onEventStarted,
  onAddNotice,
}) {
  const eventId = event.id || event._id;
  const isTeamEvent =
    String(event?.participationFormat || "INDIVIDUAL").toUpperCase() === "TEAM";
  const competitionLocked = Boolean(
    event?.resultsPublished || event?.lifecycleStatus === "COMPLETED"
  );
  const [rounds, setRounds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [selectedRoundId, setSelectedRoundId] = useState("");
  const [participantFilter, setParticipantFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [roundModalOpen, setRoundModalOpen] = useState(false);
  const [editingRoundId, setEditingRoundId] = useState("");
  const [roundForm, setRoundForm] = useState(EMPTY_ROUND_FORM);
  const [busyKey, setBusyKey] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [openRoundMenuId, setOpenRoundMenuId] = useState("");
  const startState = useMemo(
    () => getEventStartState(event, requests),
    [event, requests]
  );

  const fetchRounds = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/events/${eventId}/rounds`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || "Failed to load rounds.");
      }
      const nextRounds = Array.isArray(data.rounds) ? data.rounds : [];
      setRounds(nextRounds);
      setSelectedRoundId((current) =>
        current && nextRounds.some((round) => round._id === current)
          ? current
          : nextRounds[nextRounds.length - 1]?._id || ""
      );
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchRounds();
  }, [fetchRounds]);

  useEffect(() => {
    if (!openRoundMenuId) return undefined;
    const closeMenu = (event) => {
      if (!event.target.closest("[data-round-action-menu]")) {
        setOpenRoundMenuId("");
      }
    };
    document.addEventListener("pointerdown", closeMenu);
    return () => document.removeEventListener("pointerdown", closeMenu);
  }, [openRoundMenuId]);

  const selectedRound =
    rounds.find((round) => round._id === selectedRoundId) || rounds[0] || null;
  const isFinalRound = isFinalRoundRecord(selectedRound);
  const latestRound = rounds[rounds.length - 1] || null;
  const isLatestRound =
    selectedRound && latestRound
      ? String(selectedRound._id) === String(latestRound._id)
      : false;
  const statusButtons = isFinalRound ? FINAL_STATUS_BUTTONS : NON_FINAL_STATUS_BUTTONS;

  const selectedCount = useMemo(
    () =>
      (selectedRound?.participants || []).filter(
        (participant) => participant.status === "SELECTED"
      ).length,
    [selectedRound]
  );

  const gradeOptions = useMemo(() => {
    if (isTeamEvent) return [];
    const grades = new Set();
    (selectedRound?.participants || []).forEach((participant) => {
      const grade = participant.student?.grade;
      if (grade) grades.add(String(grade));
    });
    return Array.from(grades).sort((a, b) => {
      const numA = parseInt(a, 10);
      const numB = parseInt(b, 10);
      if (!Number.isNaN(numA) && !Number.isNaN(numB)) return numA - numB;
      return a.localeCompare(b);
    });
  }, [isTeamEvent, selectedRound]);

  const visibleParticipants = useMemo(() => {
    let participants = selectedRound?.participants || [];
    if (participantFilter === "selected") {
      participants = participants.filter(
        (participant) => participant.status === "SELECTED"
      );
    }
    if (!isTeamEvent && gradeFilter !== "all") {
      participants = participants.filter(
        (participant) => String(participant.student?.grade || "") === gradeFilter
      );
    }
    const term = searchTerm.trim().toLowerCase();
    if (term) {
      participants = participants.filter((participant) => {
        const name = isTeamEvent
          ? participant.teamName || ""
          : participant.student?.name || "";
        const schoolName =
          participant.school?.schoolName || participant.school?.name || "";
        return (
          name.toLowerCase().includes(term) ||
          schoolName.toLowerCase().includes(term)
        );
      });
    }
    return participants;
  }, [participantFilter, selectedRound, isTeamEvent, gradeFilter, searchTerm]);

  const roundMetrics = useMemo(() => {
    const participants = selectedRound?.participants || [];
    const completedParticipants = participants.filter((participant) =>
      [
        "WINNER",
        "RUNNER_UP",
        "THIRD_PLACE",
        "FINALIST",
        "SELECTED",
        "DISQUALIFIED",
        "NOT_ATTEMPTED",
      ].includes(participant.status)
    );

    return {
      total: participants.length,
      selected: participants.filter((participant) => participant.status === "SELECTED")
        .length,
      winners: participants.filter((participant) => participant.status === "WINNER")
        .length,
      runnerUps: participants.filter((participant) => participant.status === "RUNNER_UP")
        .length,
      thirdPlaces: participants.filter(
        (participant) => participant.status === "THIRD_PLACE"
      ).length,
      finalists: participants.filter((participant) => participant.status === "FINALIST")
        .length,
      completed: completedParticipants.length,
      pending: Math.max(participants.length - completedParticipants.length, 0),
    };
  }, [selectedRound]);

  const openCreateRound = () => {
    if (competitionLocked) return;
    setEditingRoundId("");
    setRoundForm(EMPTY_ROUND_FORM);
    setRoundModalOpen(true);
  };

  const startEvent = async () => {
    if (!startState.canStart || competitionLocked) {
      setMessage(startState.reason || "This event cannot be started yet.");
      return;
    }

    try {
      setBusyKey("start-event");
      const res = await fetch(`/api/events/${eventId}/start-competition`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || "Failed to start event.");
      }
      setMessage(data.message || "Event started. Round 1 is ready.");
      await fetchRounds();
      await onEventStarted?.();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusyKey("");
    }
  };

  const openEditRound = (round) => {
    if (competitionLocked) return;
    setEditingRoundId(round._id);
    setRoundForm(buildRoundForm(round));
    setRoundModalOpen(true);
  };

  const saveRound = async (e) => {
    e.preventDefault();
    try {
      setBusyKey("round-save");
      const url = editingRoundId
        ? `/api/events/${eventId}/rounds/${editingRoundId}`
        : `/api/events/${eventId}/rounds`;
      const method = editingRoundId ? "PATCH" : "POST";
      const payload = {
        title: roundForm.title,
        isFinal: Boolean(roundForm.isFinal),
      };
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || "Failed to save round.");
      }
      setRoundModalOpen(false);
      setMessage(data.message || "Round saved.");
      await fetchRounds();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusyKey("");
    }
  };

  const deleteRound = async (roundId) => {
    if (competitionLocked) return;
    try {
      setBusyKey(`delete-${roundId}`);
      const res = await fetch(`/api/events/${eventId}/rounds/${roundId}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || "Failed to delete round.");
      }
      setMessage(data.message || "Round deleted.");
      setDeleteTarget(null);
      await fetchRounds();
    } catch (error) {
      setMessage(error.message);
      setDeleteTarget(null);
    } finally {
      setBusyKey("");
    }
  };

  const updateParticipantStatus = async (participant, status) => {
    if (!selectedRound || competitionLocked) return;
    const actionKey = participant.teamKey || participant._id;
    const payload =
      isTeamEvent && Array.isArray(participant.participantIds)
        ? { participantIds: participant.participantIds, status }
        : { participantId: participant._id, status };
    try {
      setBusyKey(`participant-${actionKey}`);
      const res = await fetch(
        `/api/events/${eventId}/rounds/${selectedRound._id}/participants`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          data.message ||
            `Failed to update ${isTeamEvent ? "team" : "participant"}.`
        );
      }
      await fetchRounds();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusyKey("");
    }
  };

  const moveSelected = async (target) => {
    if (!selectedRound || competitionLocked) return;
    if (selectedCount === 0) {
      setMessage(
        `Mark ${isTeamEvent ? "teams" : "participants"} as Selected first.`
      );
      return;
    }

    try {
      setBusyKey(`advance-${target}-${selectedRound._id}`);
      const res = await fetch(`/api/events/${eventId}/rounds/${selectedRound._id}/advance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          data.message ||
            `Failed to move selected ${isTeamEvent ? "teams" : "participants"}.`
        );
      }
      if (data.roundId) {
        setSelectedRoundId(String(data.roundId));
      }
      setMessage(data.message || "Participants moved.");
      await fetchRounds();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusyKey("");
    }
  };

  const finalizeResults = async () => {
    if (!selectedRound) return;
    try {
      setBusyKey(`close-${selectedRound._id}`);
      // Prepare a results draft (certificate previews) instead of publishing
      // directly. Publishing — which issues certificates and notifies students —
      // happens as a deliberate second step in the Results & Certificates tab.
      const res = await fetch(`/api/events/${eventId}/results`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resultsPublished: false,
          publishPublicly: false,
          confirmPublish: false,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || "Failed to prepare results.");
      }
      setMessage(
        "Results draft prepared. Review the placements and publish them in the Results & Certificates tab."
      );
      await onCompetitionClosed?.();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusyKey("");
    }
  };

  return (
    <div className="space-y-5">
      {message && (
        <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-bold text-[#0a2f66]">
          {message}
        </div>
      )}

      <div
        className={`rounded-xl border px-4 py-4 ${
          competitionLocked
            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
            : "border-blue-100 bg-blue-50 text-[#0a2f66]"
        }`}
      >
        <div className="flex items-start gap-3">
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
              competitionLocked
                ? "bg-emerald-600 text-white"
                : "bg-blue-600 text-white"
            }`}
          >
            {competitionLocked ? <FaCheckCircle /> : <FaLayerGroup />}
          </span>
          <div>
            <h2 className="text-base font-black">
              {competitionLocked ? "Competition is closed" : "Competition rounds are active"}
            </h2>
            <p className="mt-1 text-sm opacity-90">
              {competitionLocked
                ? "All rounds are locked. Certificates and results are available in the Results & Certificates tab."
                : `Approved ${isTeamEvent ? "teams" : "students"} move through each round automatically when selected.`}
            </p>
          </div>
        </div>
      </div>

      <div className="overflow-visible rounded-xl border border-[#e1e7f2] bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-[#e1e7f2] px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-black text-[#17120a]">Rounds</h2>
            <p className="mt-1 text-sm text-[#52657d]">
              {readOnly
                ? "View each round and its outcomes."
                : rounds.length === 0
                ? "Start the event to create Round 1 and freeze the participant list."
                : "Manage each round and update outcomes. Selected entries can move forward."}
            </p>
          </div>
          {!competitionLocked && !readOnly && rounds.length === 0 && (
            <button
              type="button"
              onClick={startEvent}
              disabled={!startState.canStart || busyKey === "start-event"}
              title={startState.canStart ? "Start Round 1" : startState.reason}
              className="event-participant-selected-control inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#0a2f66] px-4 text-sm font-black text-white hover:bg-[#123f7d] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FaPlay />
              <span className="event-participant-selected-label">
                {busyKey === "start-event" ? "Starting..." : "Start Event"}
              </span>
            </button>
          )}
          {!competitionLocked && !readOnly && rounds.length > 0 && (
            <button
              type="button"
              onClick={openCreateRound}
              className="event-participant-selected-control inline-flex min-h-10 items-center gap-2 rounded-xl bg-purple-700 px-4 text-sm font-black text-white hover:bg-purple-800"
            >
              <FaPlus />
              <span className="event-participant-selected-label">Add Round</span>
            </button>
          )}
        </div>

        <div className="overflow-x-auto md:overflow-visible">
          <table className="min-w-full text-left">
            <thead className="bg-[#f8fbff] text-[11px] uppercase tracking-wide text-[#52657d]">
              <tr>
                <th className="px-4 py-3">Round</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">
                  {isTeamEvent ? "Teams" : "Participants"}
                </th>
                <th className="px-4 py-3">
                  Selected {isTeamEvent ? "Teams" : ""}
                </th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-10 text-center text-[#52657d]">
                    Loading rounds...
                  </td>
                </tr>
              ) : rounds.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-10 text-center text-[#52657d]">
                    <p className="font-bold text-[#17120a]">
                      No rounds yet. Start the event to create Round 1.
                    </p>
                    <p className="mt-1 text-sm">
                      {startState.canStart
                        ? `${startState.entryCount} ${startState.unitLabel} ready.`
                        : startState.reason}
                    </p>
                  </td>
                </tr>
              ) : (
                rounds.map((round, index) => {
                  const roundKey = String(
                    round?._id ||
                      (round?.roundNumber !== undefined || round?.title
                        ? `${round?.roundNumber ?? "round"}-${round?.title ?? "untitled"}`
                        : `round-row-${index}`)
                  );
                  const participantCount = (round.participants || []).length;
                  const roundSelectedCount = (round.participants || []).filter(
                    (participant) => participant.status === "SELECTED"
                  ).length;
                  return (
                    <tr
                      key={roundKey}
                      className={`border-t border-[#e1e7f2] ${
                        String(selectedRoundId) === String(round._id)
                          ? "bg-purple-50/70"
                          : "bg-white"
                      }`}
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <span
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-black ${
                              isFinalRoundRecord(round)
                                ? "bg-purple-100 text-purple-700"
                                : round.status === "COMPLETED"
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-blue-100 text-[#0a2f66]"
                            }`}
                          >
                            {isFinalRoundRecord(round) ? <FaTrophy /> : round.roundNumber}
                          </span>
                          <span>
                            <span className="block font-black text-[#17120a]">
                              {round.title}
                            </span>
                            <span className="text-xs font-bold text-[#52657d]">
                              {isFinalRoundRecord(round)
                                ? "Final Round"
                                : round.roundNumber === 1
                                ? "Preliminary Round"
                                : `Round ${round.roundNumber}`}
                            </span>
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm font-bold text-[#52657d]">
                        <AppDate value={round.date} fallback="Not set" />
                      </td>
                      <td className="px-4 py-4 text-sm text-[#52657d]">
                        <strong className="block text-[#17120a]">{participantCount}</strong>
                        {isTeamEvent ? "Teams" : participantCount === 1 ? "Student" : "Students"}
                      </td>
                      <td className="px-4 py-4 text-sm text-[#52657d]">
                        <strong className="block text-[#17120a]">{roundSelectedCount}</strong>
                        Selected
                      </td>
                      <td className="px-4 py-4">
                        <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-700">
                          {label(round.status)}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedRoundId(String(round._id))}
                            className="rounded-lg border border-[#dbe5f4] bg-white px-3 py-2 text-xs font-black text-[#0a2f66] hover:bg-[#f8fbff]"
                          >
                            {isFinalRoundRecord(round)
                              ? readOnly
                                ? "View Final"
                                : "Manage Final"
                              : "View Details"}
                          </button>
                          {!readOnly && (
                          <div className="relative" data-round-action-menu>
                            <button
                              type="button"
                              onClick={() =>
                                setOpenRoundMenuId((current) =>
                                  current === String(round._id) ? "" : String(round._id)
                                )
                              }
                              disabled={competitionLocked}
                              className="rounded-lg bg-[#f8fbff] p-2 text-[#0a2f66] hover:bg-[#edf4ff] disabled:opacity-50"
                              title="Round actions"
                              aria-haspopup="menu"
                              aria-expanded={openRoundMenuId === String(round._id)}
                            >
                              <FaEllipsisH />
                            </button>
                            {openRoundMenuId === String(round._id) && (
                              <div className="absolute right-0 top-11 z-20 w-40 overflow-hidden rounded-lg border border-[#dbe5f4] bg-white py-1 shadow-lg">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenRoundMenuId("");
                                    openEditRound(round);
                                  }}
                                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-bold text-[#0a2f66] hover:bg-[#f8fbff]"
                                  role="menuitem"
                                >
                                  <FaEdit />
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  disabled={busyKey === `delete-${round._id}`}
                                  onClick={() => {
                                    setOpenRoundMenuId("");
                                    setDeleteTarget(round);
                                  }}
                                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                                  role="menuitem"
                                >
                                  <FaTrash />
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedRound && (
        <div className="overflow-hidden rounded-xl border border-purple-100 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-purple-100 bg-purple-50/40 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-black text-[#17120a]">
                  {selectedRound.title}
                </h3>
                <span className="rounded-full bg-purple-100 px-3 py-1 text-[11px] font-black uppercase text-purple-700">
                  {isFinalRound ? "Final Placement" : "Round Management"}
                </span>
              </div>
              <p className="mt-2 text-xs font-bold text-[#52657d]">
                Date: <AppDate value={selectedRound.date} fallback="Not set" />
              </p>
            </div>
            <div className="flex flex-wrap gap-2 lg:max-w-[720px]">
              <button
                type="button"
                onClick={() => setParticipantFilter("all")}
                className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-black ${
                  participantFilter === "all"
                    ? "event-participant-selected-control bg-purple-700 text-white"
                    : "border border-purple-100 bg-white text-[#0a2f66]"
                }`}
              >
                <FaTrophy />
                <span className={participantFilter === "all" ? "event-participant-selected-label" : ""}>
                  {isFinalRound ? "Final Round" : selectedRound.title}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setParticipantFilter("selected")}
                className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-black ${
                  participantFilter === "selected"
                    ? "event-participant-selected-control bg-purple-700 text-white"
                    : "border border-purple-100 bg-white text-[#0a2f66]"
                }`}
              >
                <FaUsers />
                <span className={participantFilter === "selected" ? "event-participant-selected-label" : ""}>
                  Selected ({selectedCount})
                </span>
              </button>
              {!readOnly && (
              <button
                type="button"
                onClick={() => onAddNotice?.(selectedRound)}
                disabled={competitionLocked}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-purple-100 bg-white px-3 text-sm font-black text-[#0a2f66] hover:bg-[#f8fbff] disabled:opacity-50"
              >
                <FaBell />
                Add Notice
              </button>
              )}
              {!readOnly && (
              <button
                type="button"
                onClick={() => openEditRound(selectedRound)}
                disabled={competitionLocked}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-purple-100 bg-white px-3 text-sm font-black text-[#0a2f66] hover:bg-[#f8fbff] disabled:opacity-50"
              >
                <FaEye />
                Round Details
              </button>
              )}
            </div>
          </div>

          <div className="grid gap-4 border-b border-purple-100 px-5 py-4 md:grid-cols-4">
            <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-4">
              <div className="text-xs font-black uppercase text-[#0a2f66]">
                {isTeamEvent ? "Teams In Round" : "Entries In Round"}
              </div>
              <div className="mt-2 text-3xl font-black text-[#17120a]">
                {roundMetrics.total}
              </div>
              <p className="mt-2 text-sm text-[#52657d]">
                {isTeamEvent
                  ? "All approved teams currently active in this round."
                  : "All approved participants currently active in this round."}
              </p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4">
              <div className="text-xs font-black uppercase text-emerald-700">
                Selected
              </div>
              <div className="mt-2 text-3xl font-black text-emerald-900">
                {isFinalRound
                  ? roundMetrics.winners +
                    roundMetrics.runnerUps +
                    roundMetrics.thirdPlaces +
                    roundMetrics.finalists
                  : roundMetrics.selected}
              </div>
              <p className="mt-2 text-sm text-emerald-700">
                {isFinalRound
                  ? "Participants with final placement."
                  : isTeamEvent
                  ? "Teams ready to move to the next stage."
                  : "Participants ready to move to the next stage."}
              </p>
            </div>
            <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-4">
              <div className="text-xs font-black uppercase text-[#0a2f66]">
                Awaiting Decision
              </div>
              <div className="mt-2 text-3xl font-black text-[#17120a]">
                {roundMetrics.pending}
              </div>
              <p className="mt-2 text-sm text-[#52657d]">
                Review these {isTeamEvent ? "teams" : "participants"} and set their
                round outcome.
              </p>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4">
              <div className="text-xs font-black uppercase text-amber-700">
                Advancement Mode
              </div>
              <div className="mt-2 text-lg font-black text-[#17120a]">
                {isFinalRound ? "Final Placement" : "Qualification"}
              </div>
              <p className="mt-2 text-sm text-amber-700">
                {isFinalRound
                  ? `Mark ${isTeamEvent ? "team" : "participant"} outcomes here, then finalize to review and publish results.`
                  : `Select ${isTeamEvent ? "teams" : "participants"} and send them to the next round or final.`}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 border-b border-purple-100 px-5 py-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <FaSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#94a3b8]" />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={
                  isTeamEvent
                    ? "Search by team or school name..."
                    : "Search by student or school name..."
                }
                className="w-full rounded-lg border border-[#dbe5f4] bg-white py-2 pl-9 pr-3 text-sm font-bold text-[#0a2f66] outline-none focus:border-purple-400"
              />
            </div>
            {!isTeamEvent && gradeOptions.length > 0 && (
              <select
                value={gradeFilter}
                onChange={(e) => setGradeFilter(e.target.value)}
                className="rounded-lg border border-[#dbe5f4] bg-white px-3 py-2 text-sm font-bold text-[#0a2f66] outline-none focus:border-purple-400 sm:w-48"
              >
                <option value="all">All Grades</option>
                {gradeOptions.map((grade) => (
                  <option key={grade} value={grade}>
                    {/^\d+$/.test(grade) ? `Grade ${grade}` : grade}
                  </option>
                ))}
              </select>
            )}
            {(searchTerm || gradeFilter !== "all") && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  setGradeFilter("all");
                }}
                className="rounded-lg border border-[#dbe5f4] bg-white px-3 py-2 text-sm font-black text-[#0a2f66] hover:bg-[#f8fbff]"
              >
                Clear
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead className="bg-[#f8fbff] text-[11px] uppercase tracking-wide text-[#52657d]">
                <tr>
                  <th className="px-4 py-3">School Name</th>
                  <th className="px-4 py-3">
                    {isTeamEvent ? "Team" : "Student Name"}
                  </th>
                  <th className="px-4 py-3">
                    {isTeamEvent ? "Members" : "Grade"}
                  </th>
                  <th className="px-4 py-3">Current Status</th>
                  {!readOnly && <th className="px-4 py-3">Update Status</th>}
                </tr>
              </thead>
              <tbody>
                {visibleParticipants.length === 0 ? (
                  <tr>
                    <td colSpan={readOnly ? "4" : "5"} className="px-6 py-10 text-center text-[#52657d]">
                      No {isTeamEvent ? "teams" : "participants"} in this view yet.
                    </td>
                  </tr>
                ) : (
                  visibleParticipants.map((participant) => (
                    <tr
                      key={String(
                        participant._id ||
                          participant.student?._id ||
                          participant.student ||
                          `${participant.school?._id || participant.school}-${participant.student?.name || "student"}`
                      )}
                      className="border-t border-[#e1e7f2]"
                    >
                      <td className="px-4 py-4 text-sm font-bold text-[#0a2f66]">
                        {isTeamEvent
                          ? summarizeTeamRoundParticipant(participant).schoolName
                          : participant.school?.schoolName ||
                            participant.school?.name ||
                            "School"}
                      </td>
                      <td className="px-4 py-4 font-bold text-[#17120a]">
                        {isTeamEvent ? (
                          <div>
                            <div className="font-semibold text-slate-900">
                              {summarizeTeamRoundParticipant(participant).teamName}
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                              Captain: {summarizeTeamRoundParticipant(participant).captainName}
                            </div>
                            <div className="mt-2 inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-700">
                              {summarizeTeamRoundParticipant(participant).memberCount} member
                              {summarizeTeamRoundParticipant(participant).memberCount === 1 ? "" : "s"}
                            </div>
                          </div>
                        ) : (
                          participant.student?.name || "Student"
                        )}
                      </td>
                      <td className="px-4 py-4 text-sm text-[#52657d]">
                        {isTeamEvent ? (
                          <div className="space-y-2">
                            <div className="font-medium text-slate-700">
                              {summarizeTeamRoundParticipant(participant).memberCount} members
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {summarizeTeamRoundParticipant(participant).members.length > 0 ? (
                                summarizeTeamRoundParticipant(participant).members.map((member) => (
                                  <span
                                    key={member?._id || member?.studentId || member?.name}
                                    className="inline-flex rounded-full bg-[#0a2f66]/8 px-2.5 py-1 text-xs font-medium text-[#0a2f66]"
                                  >
                                    {member?.name || "Member"}
                                  </span>
                                ))
                              ) : (
                                <span className="text-xs text-slate-500">
                                  No members linked
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          participant.student?.grade || "N/A"
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusPillClass(
                            participant.status
                          )}`}
                        >
                          <span className="event-participant-selected-label">
                            {label(participant.status)}
                          </span>
                        </span>
                      </td>
                      {!readOnly && (
                      <td className="px-4 py-4">
                        <div className="flex flex-nowrap gap-1.5 whitespace-nowrap">
                          {statusButtons.map((button) => {
                            const isActive = participant.status === button.value;
                            return (
                              <button
                                key={`${String(participant._id || participant.student?._id || participant.student)}-${button.value}`}
                                type="button"
                                disabled={
                                  competitionLocked ||
                                  busyKey ===
                                    `participant-${participant.teamKey || participant._id}`
                                }
                                onClick={() => updateParticipantStatus(participant, button.value)}
                                className={`min-h-8 rounded-lg border px-2.5 py-1 text-[11px] font-semibold leading-tight ${getStatusActionButtonClass(
                                  button.value,
                                  isActive
                                )}`}
                              >
                                <span className={isActive ? "event-participant-selected-label" : ""}>
                                  {button.label}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {!readOnly && (
          <div className="border-t border-[#e1e7f2] px-5 py-4">
            <div className="flex flex-wrap justify-end gap-3">
              {!isFinalRound && (
                <>
                  <button
                    type="button"
                    disabled={
                      !isLatestRound ||
                      competitionLocked ||
                      busyKey === `advance-next-${selectedRound._id}` ||
                      selectedCount === 0
                    }
                    onClick={() => moveSelected("next")}
                    className="event-participant-selected-control rounded-lg bg-purple-700 px-4 py-2.5 text-sm font-black text-white hover:bg-purple-800 disabled:opacity-50"
                  >
                    <span className="event-participant-selected-label">
                      Send to Next Round ({selectedCount}{" "}
                      {isTeamEvent ? "team" : "entry"}
                      {selectedCount === 1 ? "" : "s"})
                    </span>
                  </button>
                  <button
                    type="button"
                    disabled={
                      !isLatestRound ||
                      competitionLocked ||
                      busyKey === `advance-final-${selectedRound._id}` ||
                      selectedCount === 0
                    }
                    onClick={() => moveSelected("final")}
                    className="event-participant-selected-control rounded-lg bg-[#0a2f66] px-4 py-2.5 text-sm font-black text-white hover:bg-[#1150a1] disabled:opacity-50"
                  >
                    <span className="event-participant-selected-label">
                      Send to Final Round ({selectedCount}{" "}
                      {isTeamEvent ? "team" : "entry"}
                      {selectedCount === 1 ? "" : "s"})
                    </span>
                  </button>
                </>
              )}
              {isFinalRound && (
                <button
                  type="button"
                  disabled={
                    competitionLocked ||
                    !isLatestRound ||
                    busyKey === `close-${selectedRound._id}`
                  }
                  onClick={finalizeResults}
                  className="event-participant-selected-control inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-black text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  <FaCheckCircle />
                  <span className="event-participant-selected-label">
                    {busyKey === `close-${selectedRound._id}`
                      ? "Preparing..."
                      : "Finalize & Review Results"}
                  </span>
                </button>
              )}
              {!isLatestRound && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-600">
                  Only the latest round can send {isTeamEvent ? "teams" : "students"} forward or finalize results.
                </div>
              )}
            </div>
          </div>
          )}
        </div>
      )}

      {roundModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <form
            onSubmit={saveRound}
            className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">
                {editingRoundId ? "Edit Round" : "Create Round"}
              </h3>
              <button
                type="button"
                onClick={() => setRoundModalOpen(false)}
                className="text-sm text-slate-500 hover:text-slate-900"
              >
                Close
              </button>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="md:col-span-2">
                <div className="mb-1 text-sm font-medium text-slate-700">Round Name</div>
                <input
                  required
                  value={roundForm.title}
                  onChange={(e) =>
                    setRoundForm((current) => ({ ...current, title: e.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-900 outline-none focus:border-blue-500"
                />
              </label>
              <label className="md:col-span-2 flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={Boolean(roundForm.isFinal)}
                  onChange={(e) =>
                    setRoundForm((current) => ({
                      ...current,
                      isFinal: e.target.checked,
                      title:
                        e.target.checked && !current.title
                          ? "Final Round"
                          : current.title,
                    }))
                  }
                />
                Mark this as the final round
              </label>
            </div>
            <div className="mt-5 flex justify-end">
              <button
                type="submit"
                disabled={busyKey === "round-save"}
                className="event-participant-selected-control inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                <FaSave />
                <span className="event-participant-selected-label">
                  {busyKey === "round-save" ? "Saving..." : "Save Round"}
                </span>
              </button>
            </div>
          </form>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete this round?"
        message={
          deleteTarget
            ? `${deleteTarget.title} will be removed from this event's round plan.`
            : ""
        }
        confirmLabel="Delete round"
        tone="danger"
        busy={Boolean(deleteTarget && busyKey === `delete-${deleteTarget._id}`)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget?._id) deleteRound(deleteTarget._id);
        }}
      />

    </div>
  );
}
