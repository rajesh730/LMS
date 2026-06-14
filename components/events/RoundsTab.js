"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FaBell,
  FaCheckCircle,
  FaEdit,
  FaEllipsisH,
  FaEye,
  FaLayerGroup,
  FaLock,
  FaPlus,
  FaSave,
  FaTrash,
  FaTrophy,
  FaUsers,
} from "react-icons/fa";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

const ROUND_STATUS_OPTIONS = [
  "DRAFT",
  "SCHEDULED",
  "IN_PROGRESS",
  "SHORTLIST_PUBLISHED",
  "COMPLETED",
];

const NON_FINAL_STATUS_BUTTONS = [
  { value: "SELECTED", label: "Selected" },
  { value: "DISQUALIFIED", label: "Disqualified" },
  { value: "NOT_ATTEMPTED", label: "Not Attempted" },
];

const FINAL_STATUS_BUTTONS = [
  { value: "WINNER", label: "Winner" },
  { value: "RUNNER_UP", label: "Runner Up" },
  { value: "FINALIST", label: "Finalist" },
  { value: "DISQUALIFIED", label: "Disqualified" },
  { value: "NOT_ATTEMPTED", label: "Not Attempted" },
];

const EMPTY_ROUND_FORM = {
  title: "",
  date: "",
  startTime: "",
  venue: "",
  meetingLink: "",
  instructions: "",
  status: "SCHEDULED",
  isFinal: false,
};

function label(value) {
  if (value === "RUNNER_UP") return "Runner Up";
  if (value === "NOT_ATTEMPTED") return "Not Attempted";
  if (value === "SHORTLIST_PUBLISHED") return "Shortlist Published";
  return String(value || "").replaceAll("_", " ");
}

function formatDate(value) {
  if (!value) return "Not set";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function buildRoundForm(round) {
  return {
    title: round?.title || "",
    date: round?.date ? new Date(round.date).toISOString().split("T")[0] : "",
    startTime: round?.startTime || "",
    venue: round?.venue || "",
    meetingLink: round?.meetingLink || "",
    instructions: round?.instructions || "",
    status: round?.status || "SCHEDULED",
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
      : "border-amber-200 bg-amber-50 text-amber-700";
  }
  if (status === "RUNNER_UP") {
    return active
      ? "border-violet-600 bg-violet-600 text-white"
      : "border-violet-200 bg-violet-50 text-violet-700";
  }
  if (status === "FINALIST" || status === "SELECTED") {
    return active
      ? "border-[#2f7fdb] bg-[#2f7fdb] text-white"
      : "border-[#2f7fdb]/20 bg-[#2f7fdb]/10 text-[#1150a1]";
  }
  if (status === "DISQUALIFIED") {
    return active
      ? "border-rose-600 bg-rose-600 text-white"
      : "border-rose-200 bg-rose-50 text-rose-700";
  }
  if (status === "NOT_ATTEMPTED") {
    return active
      ? "border-slate-600 bg-slate-600 text-white"
      : "border-slate-200 bg-slate-100 text-slate-700";
  }
  return active
    ? "border-[#1c4a8d] bg-[#1c4a8d] text-white"
    : "border-[#d6e6fb] bg-[#f7fbff] text-[#33598f]";
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

export default function RoundsTab({ event, onCompetitionClosed, onAddNotice }) {
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
  const [roundModalOpen, setRoundModalOpen] = useState(false);
  const [editingRoundId, setEditingRoundId] = useState("");
  const [roundForm, setRoundForm] = useState(EMPTY_ROUND_FORM);
  const [busyKey, setBusyKey] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);

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

  const selectedRound =
    rounds.find((round) => round._id === selectedRoundId) || rounds[0] || null;
  const isFinalRound = isFinalRoundRecord(selectedRound);
  const latestRound = rounds[rounds.length - 1] || null;
  const isLatestRound =
    selectedRound && latestRound
      ? String(selectedRound._id) === String(latestRound._id)
      : false;
  const statusButtons = isFinalRound ? FINAL_STATUS_BUTTONS : NON_FINAL_STATUS_BUTTONS;
  const completedRoundCount = rounds.filter((round) =>
    ["COMPLETED", "SHORTLIST_PUBLISHED"].includes(round.status)
  ).length;
  const certificateCount = event?.resultsPublished
    ? rounds.flatMap((round) => round.participants || []).filter((participant) =>
        ["WINNER", "RUNNER_UP", "FINALIST", "SELECTED"].includes(participant.status)
      ).length
    : 0;

  const selectedCount = useMemo(
    () =>
      (selectedRound?.participants || []).filter(
        (participant) => participant.status === "SELECTED"
      ).length,
    [selectedRound]
  );

  const visibleParticipants = useMemo(() => {
    const participants = selectedRound?.participants || [];
    if (participantFilter === "selected") {
      return participants.filter((participant) => participant.status === "SELECTED");
    }
    return participants;
  }, [participantFilter, selectedRound]);

  const roundMetrics = useMemo(() => {
    const participants = selectedRound?.participants || [];
    const completedParticipants = participants.filter((participant) =>
      ["WINNER", "RUNNER_UP", "FINALIST", "SELECTED", "DISQUALIFIED", "NOT_ATTEMPTED"].includes(
        participant.status
      )
    );

    return {
      total: participants.length,
      selected: participants.filter((participant) => participant.status === "SELECTED")
        .length,
      winners: participants.filter((participant) => participant.status === "WINNER")
        .length,
      runnerUps: participants.filter((participant) => participant.status === "RUNNER_UP")
        .length,
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
        ...roundForm,
        isFinal: Boolean(roundForm.isFinal),
        mode: roundForm.meetingLink ? "LIVE_ONLINE" : "OFFLINE_VENUE",
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

  const closeCompetition = async () => {
    if (!selectedRound) return;
    try {
      setBusyKey(`close-${selectedRound._id}`);
      const res = await fetch(`/api/events/${eventId}/results`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resultsPublished: true,
          publishPublicly: true,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || "Failed to publish result.");
      }
      setMessage("Result published. Results and certificates are now generated.");
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

      <div className="overflow-hidden rounded-xl border border-[#e1e7f2] bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-[#e1e7f2] px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-black text-[#17120a]">Rounds</h2>
            <p className="mt-1 text-sm text-[#52657d]">
              Manage each round and update outcomes. Selected entries can move forward.
            </p>
          </div>
          {!competitionLocked && (
            <button
              type="button"
              onClick={openCreateRound}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-purple-700 px-4 text-sm font-black text-white hover:bg-purple-800"
            >
              <FaPlus />
              Add Round
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
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
                    No rounds yet. Round 1 will be created automatically once a
                    {isTeamEvent ? "team is approved." : "participant is approved."}
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
                        {formatDate(round.date)}
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
                            {isFinalRoundRecord(round) ? "Manage Final" : "View Details"}
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditRound(round)}
                            disabled={competitionLocked}
                            className="rounded-lg bg-[#f8fbff] p-2 text-[#0a2f66] hover:bg-[#edf4ff] disabled:opacity-50"
                            title="Edit round"
                          >
                            <FaEllipsisH />
                          </button>
                          <button
                            type="button"
                            disabled={competitionLocked || busyKey === `delete-${round._id}`}
                            onClick={() => setDeleteTarget(round)}
                            className="rounded-lg bg-rose-50 p-2 text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                            title="Delete round"
                          >
                            <FaTrash />
                          </button>
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
              <p className="mt-1 text-sm text-[#52657d]">
                {selectedRound.instructions || "No round instructions added yet."}
              </p>
              <p className="mt-2 text-xs font-bold text-[#52657d]">
                Date: {formatDate(selectedRound.date)} | Venue:{" "}
                {selectedRound.venue || "Not set"} | Status: {label(selectedRound.status)}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setParticipantFilter("all")}
                className={`inline-flex min-h-9 items-center gap-2 rounded-lg px-3 text-sm font-black ${
                  participantFilter === "all"
                    ? "bg-purple-700 text-white"
                    : "border border-purple-100 bg-white text-[#0a2f66]"
                }`}
              >
                <FaTrophy />
                {isFinalRound ? "Final Round" : selectedRound.title}
              </button>
              <button
                type="button"
                onClick={() => setParticipantFilter("selected")}
                className={`inline-flex min-h-9 items-center gap-2 rounded-lg px-3 text-sm font-black ${
                  participantFilter === "selected"
                    ? "bg-purple-700 text-white"
                    : "border border-purple-100 bg-white text-[#0a2f66]"
                }`}
              >
                <FaUsers />
                Selected Participants ({selectedCount})
              </button>
              <button
                type="button"
                onClick={() => onAddNotice?.(selectedRound)}
                disabled={competitionLocked}
                className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-purple-100 bg-white px-3 text-sm font-black text-[#0a2f66] hover:bg-[#f8fbff] disabled:opacity-50"
              >
                <FaBell />
                Add Notice
              </button>
              <button
                type="button"
                onClick={() => openEditRound(selectedRound)}
                disabled={competitionLocked}
                className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-purple-100 bg-white px-3 text-sm font-black text-[#0a2f66] hover:bg-[#f8fbff] disabled:opacity-50"
              >
                <FaEye />
                Round Details
              </button>
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
                  ? roundMetrics.winners + roundMetrics.runnerUps + roundMetrics.finalists
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
                  ? `Mark ${isTeamEvent ? "team" : "participant"} outcomes here, then close the competition.`
                  : `Select ${isTeamEvent ? "teams" : "participants"} and send them to the next round or final.`}
              </p>
            </div>
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
                  <th className="px-4 py-3">History</th>
                  <th className="px-4 py-3">Update Status</th>
                </tr>
              </thead>
              <tbody>
                {visibleParticipants.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-10 text-center text-[#52657d]">
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
                          {label(participant.status)}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-[#52657d]">
                        {participant.sourceRoundNumber ? (
                          <div>Moved from Round {participant.sourceRoundNumber}</div>
                        ) : (
                          <div>Entered in this round</div>
                        )}
                        {participant.advancedToRoundNumber ? (
                          <div className="mt-1 text-xs text-emerald-600">
                            Sent to Round {participant.advancedToRoundNumber}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-2">
                          {statusButtons.map((button) => (
                            <button
                              key={`${String(participant._id || participant.student?._id || participant.student)}-${button.value}`}
                              type="button"
                              disabled={
                                competitionLocked ||
                                busyKey ===
                                  `participant-${participant.teamKey || participant._id}`
                              }
                              onClick={() => updateParticipantStatus(participant, button.value)}
                              className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${getStatusPillClass(
                                button.value,
                                participant.status === button.value
                              )}`}
                            >
                              {button.label}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

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
                    className="rounded-lg bg-purple-700 px-4 py-2.5 text-sm font-black text-white hover:bg-purple-800 disabled:opacity-50"
                  >
                    Send to Next Round ({selectedCount}{" "}
                    {isTeamEvent ? "team" : "entry"}
                    {selectedCount === 1 ? "" : "s"})
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
                    className="rounded-lg bg-[#0a2f66] px-4 py-2.5 text-sm font-black text-white hover:bg-[#1150a1] disabled:opacity-50"
                  >
                    Send to Final Round ({selectedCount}{" "}
                    {isTeamEvent ? "team" : "entry"}
                    {selectedCount === 1 ? "" : "s"})
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
                  onClick={closeCompetition}
                  className="inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-black text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                >
                  <FaLock />
                  Publish Result
                </button>
              )}
              {!isLatestRound && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-600">
                  Only the latest round can send {isTeamEvent ? "teams" : "students"} forward or close the competition.
                </div>
              )}
            </div>
          </div>
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
              <label>
                <div className="mb-1 text-sm font-medium text-slate-700">Date</div>
                <input
                  type="date"
                  value={roundForm.date}
                  onChange={(e) =>
                    setRoundForm((current) => ({ ...current, date: e.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-900 outline-none focus:border-blue-500"
                />
              </label>
              <label>
                <div className="mb-1 text-sm font-medium text-slate-700">Start Time</div>
                <input
                  value={roundForm.startTime}
                  onChange={(e) =>
                    setRoundForm((current) => ({
                      ...current,
                      startTime: e.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-900 outline-none focus:border-blue-500"
                />
              </label>
              <label>
                <div className="mb-1 text-sm font-medium text-slate-700">Venue</div>
                <input
                  value={roundForm.venue}
                  onChange={(e) =>
                    setRoundForm((current) => ({ ...current, venue: e.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-900 outline-none focus:border-blue-500"
                />
              </label>
              <label>
                <div className="mb-1 text-sm font-medium text-slate-700">Online Link</div>
                <input
                  value={roundForm.meetingLink}
                  onChange={(e) =>
                    setRoundForm((current) => ({
                      ...current,
                      meetingLink: e.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-900 outline-none focus:border-blue-500"
                />
              </label>
              <label className="md:col-span-2">
                <div className="mb-1 text-sm font-medium text-slate-700">Instructions</div>
                <textarea
                  value={roundForm.instructions}
                  onChange={(e) =>
                    setRoundForm((current) => ({
                      ...current,
                      instructions: e.target.value,
                    }))
                  }
                  className="min-h-28 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-900 outline-none focus:border-blue-500"
                />
              </label>
              <label>
                <div className="mb-1 text-sm font-medium text-slate-700">Status</div>
                <select
                  value={roundForm.status}
                  onChange={(e) =>
                    setRoundForm((current) => ({ ...current, status: e.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-900 outline-none focus:border-blue-500"
                >
                  {ROUND_STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {label(status)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="mt-5 flex justify-end">
              <button
                type="submit"
                disabled={busyKey === "round-save"}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                <FaSave />
                {busyKey === "round-save" ? "Saving..." : "Save Round"}
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
