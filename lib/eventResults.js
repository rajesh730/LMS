/**
 * Event results — domain rules.
 *
 * Extracted from `app/api/events/[id]/results/route.js` (1,022 lines), which
 * mixed HTTP handling with the whole of result computation: merging round
 * outcomes with achievements, deriving placements, resolving team rosters, and
 * deciding who is allowed to see results before publication.
 *
 * These are the rules a certificate depends on, so they need to be callable
 * from a test directly rather than only through a request. Nothing here returns
 * a Response — see docs/ARCHITECTURE.md §2.
 */
import mongoose from "mongoose";
import Event from "@/models/Event";
import Achievement from "@/models/Achievement";
import EventRound from "@/models/EventRound";
import RoundParticipant from "@/models/RoundParticipant";
import ParticipationRequest from "@/models/ParticipationRequest";
import EventSchoolInvitation from "@/models/EventSchoolInvitation";
import {
  canManageEventRounds,
  getEnrolledStudentForEvent,
} from "@/lib/eventRoundAccess";
import {
  buildCertificateCode,
  buildCertificatePath,
} from "@/lib/results";
import {
  CERTIFICATE_BLOCKED_STATUSES,
  normalizeRoundParticipantStatus,
} from "@/lib/competitionFlow";

export const FINAL_STATUS_TO_PLACEMENT = {
  WINNER: "WINNER",
  RUNNER_UP: "RUNNER_UP",
  THIRD_PLACE: "THIRD_PLACE",
  FINALIST: "FINALIST",
  SELECTED: "FINALIST",
  DISQUALIFIED: "PARTICIPANT",
};

export const STATUS_PRIORITY = {
  WINNER: 1,
  RUNNER_UP: 2,
  THIRD_PLACE: 3,
  FINALIST: 4,
  SELECTED: 5,
  DISQUALIFIED: 6,
};

export function isTeamEvent(event) {
  return String(event?.participationFormat || "INDIVIDUAL").toUpperCase() === "TEAM";
}

export function getBetterStatus(current, next) {
  const normalizedCurrent = normalizeRoundParticipantStatus(current);
  const normalizedNext = normalizeRoundParticipantStatus(next);
  const currentPriority = STATUS_PRIORITY[normalizedCurrent] || 99;
  const nextPriority = STATUS_PRIORITY[normalizedNext] || 99;
  return nextPriority < currentPriority ? normalizedNext : normalizedCurrent;
}

export async function getTeamRosterContext(eventId) {
  const requests = await ParticipationRequest.find({
    event: eventId,
    status: { $in: ["APPROVED", "ENROLLED"] },
  })
    .populate("student", "name grade")
    .populate("school", "schoolName")
    .populate("captainStudent", "name grade")
    .lean();

  const studentTeamMap = new Map();
  const teamMetaMap = new Map();

  for (const request of requests) {
    const schoolId = String(request.school || "");
    const studentId = String(request.student?._id || request.student || "");
    if (!schoolId || !studentId) continue;

    const normalizedTeamName = String(request.teamName || "").trim();
    const teamKey = `${schoolId}::${normalizedTeamName.toLowerCase() || "default-team"}`;

    studentTeamMap.set(studentId, {
      teamKey,
      teamName: normalizedTeamName || "School Team",
      captainStudent: request.captainStudent || null,
    });

    if (!teamMetaMap.has(teamKey)) {
      teamMetaMap.set(teamKey, {
        teamName: normalizedTeamName || "School Team",
        captainStudent: request.captainStudent || null,
        members: [],
      });
    }

    const teamEntry = teamMetaMap.get(teamKey);
    if (request.student) {
      const exists = teamEntry.members.some(
        (member) => String(member._id || member) === studentId
      );
      if (!exists) {
        teamEntry.members.push(request.student);
      }
    }
  }

  return { studentTeamMap, teamMetaMap };
}

export async function getParticipationResultEntries(event) {
  const eventId = event._id || event;
  const requests = await ParticipationRequest.find({
    event: eventId,
    status: { $in: ["APPROVED", "ENROLLED"] },
  })
    .populate("student", "name grade")
    .populate("school", "schoolName")
    .populate("captainStudent", "name grade")
    .sort({ requestedAt: 1, createdAt: 1 })
    .lean();

  if (requests.length === 0) return [];

  if (!isTeamEvent(event)) {
    return requests
      .filter((request) => request.student && request.school)
      .map((request) => ({
        studentId: String(request.student._id || request.student),
        teamKey: "",
        teamName: "",
        captainStudent: null,
        members: [],
        student: request.student,
        school: request.school,
        highestRoundReached: 0,
        latestStatus: "PARTICIPANT",
        finalStatus: "PARTICIPANT",
        placement: "PARTICIPANT",
        history: [],
        latestRoundNumber: 0,
      }));
  }

  const groupedTeams = new Map();
  for (const request of requests) {
    const schoolId = String(request.school?._id || request.school || "");
    const teamName = String(request.teamName || "").trim() || "School Team";
    const teamKey = `${schoolId}::${teamName.toLowerCase() || "default-team"}`;
    if (!schoolId || !request.student) continue;

    if (!groupedTeams.has(teamKey)) {
      groupedTeams.set(teamKey, {
        studentId: "",
        teamKey,
        teamName,
        captainStudent: request.captainStudent || null,
        members: [],
        student: null,
        school: request.school,
        highestRoundReached: 0,
        latestStatus: "PARTICIPANT",
        finalStatus: "PARTICIPANT",
        placement: "PARTICIPANT",
        history: [],
        latestRoundNumber: 0,
      });
    }

    const entry = groupedTeams.get(teamKey);
    const studentId = String(request.student._id || request.student);
    if (!entry.members.some((member) => String(member._id || member) === studentId)) {
      entry.members.push(request.student);
    }
    if (!entry.captainStudent && request.captainStudent) {
      entry.captainStudent = request.captainStudent;
    }
  }

  return Array.from(groupedTeams.values());
}

export async function canViewEventResults(session, event) {
  if (canManageEventRounds(session, event)) return true;

  if (session?.user?.role !== "SCHOOL_ADMIN") return false;

  const schoolId = session.user.schoolId || session.user.id;
  if (!schoolId) return false;

  if (event.eventScope === "PLATFORM") {
    const [approvedInvitation, participation] = await Promise.all([
      EventSchoolInvitation.exists({
        event: event._id,
        school: schoolId,
        status: "APPROVED",
      }),
      ParticipationRequest.exists({
        event: event._id,
        school: schoolId,
        status: { $in: ["APPROVED", "ENROLLED"] },
      }),
    ]);

    return Boolean(approvedInvitation || participation);
  }

  return false;
}

export function filterEntriesForSchool(items = [], schoolId = "") {
  if (!schoolId) return items;
  return items.filter(
    (item) => String(item.school?._id || item.school || "") === String(schoolId)
  );
}

export function buildLevel(event) {
  return event.eventScope === "PLATFORM" ? "PLATFORM" : "SCHOOL";
}

export function placementLabel(placement) {
  if (placement === "RUNNER_UP") return "1st Runner Up";
  if (placement === "THIRD_PLACE") return "2nd Runner Up";
  return String(placement || "").replaceAll("_", " ");
}

export async function getRoundResultContext(event) {
  const eventId = event._id || event;
  const rounds = await EventRound.find({ event: eventId })
    .sort({ roundNumber: 1 })
    .lean();

  if (rounds.length === 0) {
    const certificateEntries = await getParticipationResultEntries(event);
    return {
      hasRounds: certificateEntries.length > 0,
      rounds: [],
      finalRound: null,
      participants: certificateEntries,
      certificateEntries,
    };
  }

  const finalRound =
    rounds.find((round) => round.isFinal) || rounds[rounds.length - 1] || null;

  const participants = await RoundParticipant.find({ event: eventId })
    .populate("student", "name grade")
    .populate("school", "schoolName")
    .sort({ roundNumber: 1, createdAt: 1 })
    .lean();

  const roundMap = new Map(rounds.map((round) => [String(round._id), round]));
  const participantMap = new Map();
  const teamEvent = isTeamEvent(event);
  const { studentTeamMap, teamMetaMap } = teamEvent
    ? await getTeamRosterContext(eventId)
    : { studentTeamMap: new Map(), teamMetaMap: new Map() };

  for (const participant of participants) {
    const participantStatus = normalizeRoundParticipantStatus(participant.status);
    const studentId = String(participant.student?._id || participant.student || "");
    if (!studentId) continue;
    const teamInfo = studentTeamMap.get(studentId);
    const participantKey = teamEvent
      ? teamInfo?.teamKey ||
        `${String(participant.school?._id || participant.school || "")}::default-team`
      : studentId;

    if (!participantMap.has(participantKey)) {
      participantMap.set(participantKey, {
        studentId: teamEvent ? "" : studentId,
        teamKey: teamEvent ? participantKey : "",
        teamName: teamEvent ? teamInfo?.teamName || "School Team" : "",
        captainStudent: teamEvent ? teamInfo?.captainStudent || null : null,
        members: teamEvent ? [...(teamMetaMap.get(participantKey)?.members || [])] : [],
        student: teamEvent ? null : participant.student || null,
        school: participant.school || null,
        highestRoundReached: 0,
        latestStatus: "",
        finalStatus: "",
        history: [],
        latestRoundNumber: 0,
      });
    }

    const entry = participantMap.get(participantKey);
    const round = roundMap.get(String(participant.round)) || null;
    entry.student = entry.student || (teamEvent ? null : participant.student || null);
    entry.school = entry.school || participant.school || null;
    entry.highestRoundReached = Math.max(
      entry.highestRoundReached,
      Number(participant.roundNumber || 0)
    );
    entry.latestRoundNumber = Math.max(
      entry.latestRoundNumber,
      Number(participant.roundNumber || 0)
    );
    entry.latestStatus = entry.latestStatus
      ? getBetterStatus(entry.latestStatus, participantStatus)
      : participantStatus;

    if (String(participant.round) === String(finalRound?._id)) {
      entry.finalStatus = entry.finalStatus
        ? getBetterStatus(entry.finalStatus, participantStatus)
        : participantStatus;
    }

    entry.history.push({
      roundId: String(participant.round),
      roundNumber: participant.roundNumber,
      roundTitle: round?.title || `Round ${participant.roundNumber}`,
      isFinal: Boolean(round?.isFinal),
      status: participantStatus,
      advancedToRoundNumber: participant.advancedToRoundNumber || null,
    });
  }

  let certificateEntries = Array.from(participantMap.values())
    .filter((entry) => !CERTIFICATE_BLOCKED_STATUSES.includes(entry.latestStatus))
    .map((entry) => {
      const status =
        normalizeRoundParticipantStatus(entry.finalStatus) ||
        normalizeRoundParticipantStatus(entry.latestStatus) ||
        "NOT_ATTEMPTED";
      const normalizedStatus =
        finalRound && entry.highestRoundReached === finalRound.roundNumber
          ? status
          : status === "DISQUALIFIED"
          ? "DISQUALIFIED"
          : "SELECTED";

      return {
        ...entry,
        finalStatus: normalizedStatus,
        placement:
          FINAL_STATUS_TO_PLACEMENT[normalizedStatus] || "PARTICIPANT",
      };
    })
    .sort((a, b) => {
      const statusDelta =
        (STATUS_PRIORITY[a.finalStatus] || 99) - (STATUS_PRIORITY[b.finalStatus] || 99);
      if (statusDelta !== 0) return statusDelta;
      if (b.highestRoundReached !== a.highestRoundReached) {
        return b.highestRoundReached - a.highestRoundReached;
      }
      return String(a.teamName || a.student?.name || "").localeCompare(
        String(b.teamName || b.student?.name || "")
      );
    });

  if (certificateEntries.length === 0) {
    certificateEntries = await getParticipationResultEntries(event);
  }

  return {
    hasRounds: true,
    rounds,
    finalRound,
    participants: Array.from(participantMap.values()),
    certificateEntries,
  };
}

export function mergeAchievements(entries, achievements) {
  const achievementMap = new Map(
    achievements.map((achievement) => [
      achievement.recipientType === "TEAM"
        ? `TEAM::${String(achievement.school?._id || achievement.school)}::${String(
            achievement.teamName || ""
          )
            .trim()
            .toLowerCase()}`
        : `STUDENT::${String(achievement.student)}`,
      achievement,
    ])
  );

  return entries.map((entry) => {
    const achievement = achievementMap.get(
      entry.teamName
        ? `TEAM::${String(entry.school?._id || entry.school)}::${String(entry.teamName || "")
            .trim()
            .toLowerCase()}`
        : `STUDENT::${entry.studentId}`
    );
    return {
      ...entry,
      currentPlacement: achievement?.placement || entry.placement || "PARTICIPANT",
      certificateUrl: achievement?.certificateUrl || "",
      certificateCode: achievement?.certificateCode || "",
      certificateState: achievement?.certificateState || "CERTIFICATE_PREVIEW",
      certificateRecipientName:
        achievement?.certificateRecipientName ||
        entry.teamName ||
        entry.student?.name ||
        "Student",
      isPublicResult: Boolean(achievement?.isPublic),
      resultId: achievement?._id || null,
      certificateIssuedAt: achievement?.certificateIssuedAt || null,
    };
  });
}

export function achievementsToParticipantEntries(achievements = []) {
  return achievements.map((achievement) => ({
    studentId: String(achievement.student?._id || achievement.student || ""),
    teamKey:
      String(achievement.recipientType || "STUDENT").toUpperCase() === "TEAM"
        ? `TEAM::${String(achievement.school?._id || achievement.school || "")}::${String(
            achievement.teamName || ""
          )
            .trim()
            .toLowerCase()}`
        : "",
    teamName: achievement.teamName || "",
    captainStudent: achievement.captainStudent || null,
    members: [],
    student: achievement.student || null,
    school: achievement.school || null,
    highestRoundReached: achievement.highestRoundReached || 0,
    latestStatus: achievement.finalStatus || achievement.placement || "PARTICIPANT",
    finalStatus: achievement.finalStatus || achievement.placement || "PARTICIPANT",
    placement: achievement.placement || "PARTICIPANT",
    currentPlacement: achievement.placement || "PARTICIPANT",
    certificateUrl: achievement.certificateUrl || "",
    certificateCode: achievement.certificateCode || "",
    certificateState: achievement.certificateState || "CERTIFICATE_PREVIEW",
    certificateRecipientName:
      achievement.certificateRecipientName ||
      achievement.teamName ||
      achievement.student?.name ||
      "Student",
    isPublicResult: Boolean(achievement.isPublic),
    resultId: achievement._id || null,
    certificateIssuedAt: achievement.certificateIssuedAt || null,
  }));
}

export async function ensureTeamMemberAchievements({ event, achievements }) {
  if (!isTeamEvent(event) || !Array.isArray(achievements) || achievements.length === 0) {
    return false;
  }

  const teamAchievements = achievements.filter(
    (achievement) =>
      String(achievement.recipientType || "STUDENT").toUpperCase() === "TEAM"
  );

  if (teamAchievements.length === 0) {
    return false;
  }

  const { teamMetaMap } = await getTeamRosterContext(event._id || event);
  const existingMemberKeys = new Set(
    achievements
      .filter(
        (achievement) =>
          String(achievement.recipientType || "STUDENT").toUpperCase() !== "TEAM"
      )
      .map((achievement) => {
        const parentId = String(
          achievement.parentAchievement?._id || achievement.parentAchievement || ""
        );
        const studentId = String(achievement.student?._id || achievement.student || "");
        return `${parentId}::${studentId}`;
      })
  );

  const missingAchievements = [];
  const now = new Date();

  for (const teamAchievement of teamAchievements) {
    const teamKey = `${String(
      teamAchievement.school?._id || teamAchievement.school || ""
    )}::${String(teamAchievement.teamName || "")
      .trim()
      .toLowerCase() || "default-team"}`;
    const teamMeta = teamMetaMap.get(teamKey);
    const roster = Array.isArray(teamMeta?.members) ? teamMeta.members : [];

    for (const member of roster) {
      const studentId = String(member?._id || member || "");
      if (!studentId) continue;

      const memberKey = `${String(teamAchievement._id)}::${studentId}`;
      if (existingMemberKeys.has(memberKey)) continue;

      const memberAchievementId = new mongoose.Types.ObjectId();
      missingAchievements.push({
        _id: memberAchievementId,
        school: teamAchievement.school?._id || teamAchievement.school || null,
        student: member._id || member,
        recipientType: "STUDENT",
        teamName: teamAchievement.teamName || "",
        captainStudent:
          teamAchievement.captainStudent?._id ||
          teamAchievement.captainStudent ||
          teamMeta?.captainStudent?._id ||
          teamMeta?.captainStudent ||
          null,
        parentAchievement: teamAchievement._id,
        event: event._id,
        submission: null,
        title: `${placementLabel(teamAchievement.placement)} - ${member?.name || "Student"}`,
        description:
          teamAchievement.placement === "PARTICIPANT"
            ? `${member?.name || "Student"} participated in ${event.title} as part of ${
                teamAchievement.teamName || "School Team"
              }.`
            : `${member?.name || "Student"} achieved ${placementLabel(
                teamAchievement.placement
              ).toLowerCase()} in ${event.title} as part of ${
                teamAchievement.teamName || "School Team"
              }.`,
        level: teamAchievement.level || buildLevel(event),
        placement: teamAchievement.placement || "PARTICIPANT",
        finalStatus:
          normalizeRoundParticipantStatus(teamAchievement.finalStatus) ||
          "NOT_ATTEMPTED",
        highestRoundReached: teamAchievement.highestRoundReached || 0,
        certificateRecipientName: member?.name || "Student",
        certificateCode: buildCertificateCode(memberAchievementId, now),
        certificateState: teamAchievement.certificateIssuedAt
          ? "CERTIFICATE_ACTIVE"
          : "CERTIFICATE_PREVIEW",
        certificateIssuedAt: teamAchievement.certificateIssuedAt || null,
        schoolSharedAt: teamAchievement.schoolSharedAt || null,
        certificateUrl: teamAchievement.certificateIssuedAt
          ? buildCertificatePath(memberAchievementId)
          : "",
        isPublic: Boolean(teamAchievement.isPublic),
        awardedAt: teamAchievement.awardedAt || now,
      });
      existingMemberKeys.add(memberKey);
    }
  }

  if (missingAchievements.length === 0) {
    return false;
  }

  await Achievement.insertMany(missingAchievements);
  return true;
}
