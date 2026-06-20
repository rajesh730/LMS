import EventRound from "@/models/EventRound";
import ParticipationRequest from "@/models/ParticipationRequest";
import RoundParticipant from "@/models/RoundParticipant";

export const NON_FINAL_ROUND_STATUSES = [
  "SELECTED",
  "DISQUALIFIED",
  "NOT_ATTEMPTED",
];

export const FINAL_ROUND_STATUSES = [
  "WINNER",
  "RUNNER_UP",
  "THIRD_PLACE",
  "FINALIST",
  "DISQUALIFIED",
  "NOT_ATTEMPTED",
];

export const CERTIFICATE_BLOCKED_STATUSES = ["NOT_ATTEMPTED"];
const ROUND_VIEW_STATUS_PRIORITY = {
  WINNER: 1,
  RUNNER_UP: 2,
  THIRD_PLACE: 3,
  FINALIST: 4,
  SELECTED: 5,
  DISQUALIFIED: 6,
  NOT_ATTEMPTED: 7,
};

export function normalizeRoundParticipantStatus(value) {
  const normalizedValue = String(value || "").trim().toUpperCase();
  if (!normalizedValue) {
    return "";
  }
  if (normalizedValue === "PARTICIPATED") {
    return "NOT_ATTEMPTED";
  }
  return normalizedValue;
}

function inferLegacyFinalRound(title = "") {
  return /(^|\s)final(\s|$)/i.test(String(title || "").trim());
}

export function isTeamParticipationEvent(event) {
  return String(event?.participationFormat || "INDIVIDUAL").toUpperCase() === "TEAM";
}

export function buildTeamKey(schoolId, teamName = "") {
  return `${String(schoolId || "")}::${String(teamName || "")
    .trim()
    .toLowerCase() || "default-team"}`;
}

function pickPreferredRoundStatus(current, next) {
  const normalizedCurrent = normalizeRoundParticipantStatus(current);
  const normalizedNext = normalizeRoundParticipantStatus(next);
  const currentPriority =
    ROUND_VIEW_STATUS_PRIORITY[normalizedCurrent || "NOT_ATTEMPTED"] || 99;
  const nextPriority =
    ROUND_VIEW_STATUS_PRIORITY[normalizedNext || "NOT_ATTEMPTED"] || 99;
  return nextPriority < currentPriority ? normalizedNext : normalizedCurrent;
}

export function attachRoundSubmissions(participants = [], submissions = []) {
  const submissionsByStudentRound = new Map(
    submissions.map((submission) => [
      `${submission.round}-${submission.student}`,
      submission,
    ])
  );

  return participants.map((participant) => ({
    ...participant,
    submission:
      submissionsByStudentRound.get(
        `${participant.round}-${participant.student?._id || participant.student}`
      ) || null,
  }));
}

export function buildRoundParticipantEntries({
  event,
  participants = [],
  submissions = [],
}) {
  const withSubmissions = attachRoundSubmissions(participants, submissions);
  if (!isTeamParticipationEvent(event)) {
    return withSubmissions;
  }

  const teamMap = new Map();
  for (const participant of withSubmissions) {
    const schoolId = String(participant.school?._id || participant.school || "");
    const teamName = String(participant.teamName || "").trim() || "School Team";
    const teamKey = buildTeamKey(schoolId, teamName);

    if (!teamMap.has(teamKey)) {
      teamMap.set(teamKey, {
        _id: teamKey,
        entryKey: teamKey,
        isTeamEntry: true,
        teamKey,
        teamName,
        captainStudent: participant.captainStudent || null,
        school: participant.school || null,
        status: normalizeRoundParticipantStatus(participant.status) || "NOT_ATTEMPTED",
        round: participant.round,
        roundNumber: participant.roundNumber,
        sourceRoundNumber: participant.sourceRoundNumber || null,
        advancedToRoundNumber: participant.advancedToRoundNumber || null,
        advancedAt: participant.advancedAt || null,
        participantIds: [],
        members: [],
        memberCount: 0,
        submissions: [],
        submission: participant.submission || null,
        submissionStudentId:
          String(
            participant.captainStudent?._id ||
              participant.captainStudent ||
              participant.student?._id ||
              participant.student ||
              ""
          ) || "",
      });
    }

    const entry = teamMap.get(teamKey);
    entry.status = pickPreferredRoundStatus(entry.status, participant.status);
    entry.sourceRoundNumber =
      entry.sourceRoundNumber || participant.sourceRoundNumber || null;
    entry.advancedToRoundNumber =
      entry.advancedToRoundNumber || participant.advancedToRoundNumber || null;
    entry.advancedAt = entry.advancedAt || participant.advancedAt || null;
    entry.captainStudent = entry.captainStudent || participant.captainStudent || null;
    entry.participantIds.push(String(participant._id));

    if (participant.student) {
      const studentId = String(participant.student?._id || participant.student);
      const alreadyExists = entry.members.some(
        (member) => String(member?._id || member) === studentId
      );
      if (!alreadyExists) {
        entry.members.push(participant.student);
      }
    }

    if (participant.submission) {
      entry.submissions.push(participant.submission);
      if (
        !entry.submission ||
        String(entry.submission.student || "") !==
          String(entry.captainStudent?._id || entry.captainStudent || "")
      ) {
        entry.submission = participant.submission;
      }
    }
  }

  return Array.from(teamMap.values())
    .map((entry) => ({
      ...entry,
      memberCount: entry.members.length,
    }))
    .sort((a, b) => {
      const schoolDelta = String(a.school?.schoolName || "").localeCompare(
        String(b.school?.schoolName || "")
      );
      if (schoolDelta !== 0) return schoolDelta;
      return String(a.teamName || "").localeCompare(String(b.teamName || ""));
    });
}

export function isFinalRound(round) {
  return round?.roundType === "FINAL" || Boolean(round?.isFinal);
}

export function getAllowedParticipantStatuses(round) {
  return isFinalRound(round) ? FINAL_ROUND_STATUSES : NON_FINAL_ROUND_STATUSES;
}

export function getInitialStatusForRound(round) {
  return "NOT_ATTEMPTED";
}

function getDefaultRoundTitle(roundNumber, isFinal) {
  return isFinal ? "Final Round" : `Round ${roundNumber}`;
}

export async function repairLegacyRoundMetadata(round) {
  if (!round) return round;
  if (round.roundType === "FINAL" || round.roundType === "REGULAR") {
    return round;
  }

  const inferredFinal = Boolean(round.isFinal) || inferLegacyFinalRound(round.title);
  const roundType = inferredFinal ? "FINAL" : "REGULAR";

  if (typeof round.save === "function") {
    round.roundType = roundType;
    round.isFinal = inferredFinal;
    await round.save();
    return round;
  }

  await EventRound.updateOne(
    { _id: round._id },
    {
      $set: {
        roundType,
        isFinal: inferredFinal,
      },
    }
  );

  return {
    ...round,
    roundType,
    isFinal: inferredFinal,
  };
}

export async function getOrderedRounds(eventId) {
  const rounds = await EventRound.find({ event: eventId })
    .sort({ roundNumber: 1 })
    .lean();
  return Promise.all(rounds.map((round) => repairLegacyRoundMetadata(round)));
}

export async function getLatestRound(eventId) {
  const round = await EventRound.findOne({ event: eventId }).sort({ roundNumber: -1 });
  return repairLegacyRoundMetadata(round);
}

export async function getNextRoundFor(eventId, currentRound) {
  const nextRound = await EventRound.findOne({
    event: eventId,
    roundNumber: Number(currentRound.roundNumber || 0) + 1,
  });
  return repairLegacyRoundMetadata(nextRound);
}

export async function ensureRoundForEvent({
  eventId,
  createdBy,
  roundNumber,
  isFinal = false,
  title = "",
  description = "",
}) {
  let round = await EventRound.findOne(
    isFinal
      ? { event: eventId, roundType: "FINAL" }
      : { event: eventId, roundNumber, roundType: "REGULAR" }
  );

  if (round) return { round: await repairLegacyRoundMetadata(round), created: false };

  const fallbackLastRound = await getLatestRound(eventId);
  const resolvedRoundNumber =
    Number.isInteger(roundNumber) && roundNumber > 0
      ? roundNumber
      : (fallbackLastRound?.roundNumber || 0) + 1;

  round = await EventRound.create({
    event: eventId,
    roundNumber: resolvedRoundNumber,
    roundType: isFinal ? "FINAL" : "REGULAR",
    title: title || getDefaultRoundTitle(resolvedRoundNumber, isFinal),
    description:
      description || (isFinal ? "Final judging round" : "Competition round"),
    mode: "OFFLINE_VENUE",
    status: "SCHEDULED",
    createdBy,
  });

  return { round, created: true };
}

export async function syncApprovedRequestsToRoundOne({
  eventId,
  createdBy,
  requestIds = [],
}) {
  // A call scoped to specific requestIds is incremental (only adds those). A
  // call with no requestIds is a full sync and is treated as authoritative for
  // round 1, so it also prunes entries whose request is no longer approved.
  const isFullSync = requestIds.length === 0;

  const requests = await ParticipationRequest.find({
    event: eventId,
    status: { $in: ["APPROVED", "ENROLLED"] },
    ...(requestIds.length > 0 ? { _id: { $in: requestIds } } : {}),
  })
    .select("_id school student status teamName captainStudent")
    .lean();

  if (requests.length === 0) {
    // Full sync with no remaining approved requests means round 1 should be
    // empty — clear any stale entries left over from previously approved
    // students that were later rejected or withdrawn.
    let removed = 0;
    if (isFullSync) {
      const existingRoundOne = await EventRound.findOne({
        event: eventId,
        roundNumber: 1,
      })
        .select("_id")
        .lean();
      if (existingRoundOne) {
        const cleanup = await RoundParticipant.deleteMany({
          event: eventId,
          round: existingRoundOne._id,
        });
        removed = cleanup.deletedCount || 0;
      }
    }

    return {
      round: null,
      createdRound: false,
      createdParticipants: 0,
      existingParticipants: 0,
      removedParticipants: removed,
    };
  }

  const { round, created } = await ensureRoundForEvent({
    eventId,
    createdBy,
    roundNumber: 1,
    title: "Round 1",
    description: "Initial competition round",
  });

  const operations = requests.map((request) => ({
    updateOne: {
      filter: { event: eventId, round: round._id, student: request.student },
      update: {
        $setOnInsert: {
          event: eventId,
          round: round._id,
          roundNumber: 1,
          school: request.school,
          teamName: request.teamName || "",
          captainStudent: request.captainStudent || null,
          student: request.student,
          status: getInitialStatusForRound(round),
        },
      },
      upsert: true,
    },
  }));

  const [result] = await Promise.all([
    RoundParticipant.bulkWrite(operations),
    ParticipationRequest.updateMany(
      { _id: { $in: requests.map((request) => request._id) } },
      {
        $set: {
          status: "ENROLLED",
          enrollmentConfirmedAt: new Date(),
          studentNotifiedAt: new Date(),
        },
      }
    ),
  ]);

  // On a full sync, round 1 mirrors the approved roster exactly: prune any
  // entry whose student is no longer approved so the count cannot drift.
  let removedParticipants = 0;
  if (isFullSync) {
    const eligibleStudentIds = requests.map((request) => String(request.student));
    const cleanup = await RoundParticipant.deleteMany({
      event: eventId,
      round: round._id,
      student: { $nin: eligibleStudentIds },
    });
    removedParticipants = cleanup.deletedCount || 0;
  }

  return {
    round,
    createdRound: created,
    createdParticipants: result.upsertedCount || 0,
    existingParticipants: result.matchedCount || 0,
    removedParticipants,
  };
}

export async function removeStudentsFromCompetition({ eventId, studentIds = [] }) {
  const ids = studentIds.map(String).filter(Boolean);
  if (ids.length === 0) return;

  await RoundParticipant.deleteMany({
    event: eventId,
    student: { $in: ids },
  });
}

export async function resolveTargetRound({
  eventId,
  currentRound,
  createdBy,
  target = "next",
}) {
  if (target === "final") {
    const existingFinal = await EventRound.findOne({ event: eventId, roundType: "FINAL" });
    if (existingFinal) {
      const round = await repairLegacyRoundMetadata(existingFinal);
      return { round, created: false, targetLabel: round.title };
    }

    const lastRound = await getLatestRound(eventId);
    const nextNumber = (lastRound?.roundNumber || currentRound.roundNumber || 0) + 1;
    const result = await ensureRoundForEvent({
      eventId,
      createdBy,
      roundNumber: nextNumber,
      isFinal: true,
      title: "Final Round",
      description: "Automatic final round generated from selected participants.",
    });
    return { ...result, targetLabel: result.round.title };
  }

  const expectedRoundNumber = Number(currentRound.roundNumber || 0) + 1;
  const existingNext = await EventRound.findOne({
    event: eventId,
    roundNumber: expectedRoundNumber,
    roundType: "REGULAR",
  });

  if (existingNext) {
    const round = await repairLegacyRoundMetadata(existingNext);
    return { round, created: false, targetLabel: round.title };
  }

  const lastRound = await getLatestRound(eventId);
  const nextNumber = Math.max(expectedRoundNumber, (lastRound?.roundNumber || 0) + 1);
  const result = await ensureRoundForEvent({
    eventId,
    createdBy,
    roundNumber: nextNumber,
    title: `Round ${nextNumber}`,
    description: "Automatic round generated from selected participants.",
  });
  return { ...result, targetLabel: result.round.title };
}

export async function syncParticipantForward({
  eventId,
  currentRound,
  participantId,
  status,
}) {
  const round = await repairLegacyRoundMetadata(currentRound);
  if (!round || isFinalRound(round)) return;

  const participant = await RoundParticipant.findOne({
    _id: participantId,
    event: eventId,
    round: round._id,
  }).lean();
  if (!participant) return;

  const nextRound = await getNextRoundFor(eventId, round);
  if (!nextRound) return;

  if (status === "SELECTED") {
    await RoundParticipant.updateOne(
      {
        event: eventId,
        round: nextRound._id,
        student: participant.student,
      },
      {
        $setOnInsert: {
          event: eventId,
          round: nextRound._id,
          roundNumber: nextRound.roundNumber,
          school: participant.school,
          teamName: participant.teamName || "",
          captainStudent: participant.captainStudent || null,
          student: participant.student,
          status: getInitialStatusForRound(nextRound),
          sourceRound: round._id,
          sourceRoundNumber: round.roundNumber,
        },
      },
      { upsert: true }
    );

    await RoundParticipant.updateOne(
      { _id: participantId },
      {
        $set: {
          advancedToRound: nextRound._id,
          advancedToRoundNumber: nextRound.roundNumber,
          advancedAt: new Date(),
        },
      }
    );
    return;
  }

  await RoundParticipant.deleteMany({
    event: eventId,
    student: participant.student,
    roundNumber: { $gt: round.roundNumber },
  });

  await RoundParticipant.updateOne(
    { _id: participantId },
    {
      $set: {
        advancedToRound: null,
        advancedToRoundNumber: null,
        advancedAt: null,
      },
    }
  );
}

export async function advanceSelectedParticipants({
  eventId,
  currentRound,
  createdBy,
  target = "next",
  event = null,
}) {
  const round = await repairLegacyRoundMetadata(currentRound);
  const latestRound = await getLatestRound(eventId);

  if (!latestRound || String(latestRound._id) !== String(round._id)) {
    throw new Error("Only the latest round can send students forward.");
  }

  if (isFinalRound(round)) {
    throw new Error("Final round participants cannot be sent to another round.");
  }

  const selectedParticipants = await RoundParticipant.find({
    event: eventId,
    round: round._id,
    status: "SELECTED",
  })
    .select("school student teamName captainStudent")
    .lean();

  if (selectedParticipants.length === 0) {
    return {
      targetRound: null,
      createdTargetRound: false,
      createdParticipants: 0,
      existingParticipants: 0,
      movedParticipants: 0,
    };
  }

  const {
    round: targetRound,
    created: createdTargetRound,
    targetLabel,
  } = await resolveTargetRound({
    eventId,
    currentRound: round,
    createdBy,
    target,
  });

  const now = new Date();
  const operations = selectedParticipants.map((participant) => ({
    updateOne: {
      filter: { event: eventId, round: targetRound._id, student: participant.student },
      update: {
        $setOnInsert: {
          event: eventId,
          round: targetRound._id,
          roundNumber: targetRound.roundNumber,
          school: participant.school,
          teamName: participant.teamName || "",
          captainStudent: participant.captainStudent || null,
          student: participant.student,
          status: getInitialStatusForRound(targetRound),
          sourceRound: round._id,
          sourceRoundNumber: round.roundNumber,
        },
      },
      upsert: true,
    },
  }));

  const result = await RoundParticipant.bulkWrite(operations);
  const movedEntriesCount = isTeamParticipationEvent(event)
    ? new Set(
        selectedParticipants.map((participant) =>
          buildTeamKey(participant.school, participant.teamName || "")
        )
      ).size
    : selectedParticipants.length;

  await RoundParticipant.updateMany(
    {
      event: eventId,
      round: round._id,
      status: "SELECTED",
    },
    {
      $set: {
        advancedToRound: targetRound._id,
        advancedToRoundNumber: targetRound.roundNumber,
        advancedAt: now,
        updatedBy: createdBy,
      },
    }
  );

  if (round.status === "DRAFT") {
    round.status = "SHORTLIST_PUBLISHED";
    await round.save();
  }

  return {
    targetRound,
    createdTargetRound,
    createdParticipants: result.upsertedCount || 0,
    existingParticipants: result.matchedCount || 0,
    movedParticipants: selectedParticipants.length,
    movedEntries: movedEntriesCount,
  };
}
