import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import Event from "@/models/Event";
import Achievement from "@/models/Achievement";
import EventRound from "@/models/EventRound";
import RoundParticipant from "@/models/RoundParticipant";
import ParticipationRequest from "@/models/ParticipationRequest";
import EventSchoolInvitation from "@/models/EventSchoolInvitation";
import AuditLog from "@/models/AuditLog";
import {
  canManageEventRounds,
  getEnrolledStudentForEvent,
} from "@/lib/eventRoundAccess";
import {
  buildCertificateCode,
  buildCertificatePath,
  sanitizeScorecardCriteria,
} from "@/lib/results";
import {
  CERTIFICATE_BLOCKED_STATUSES,
  normalizeRoundParticipantStatus,
} from "@/lib/competitionFlow";
import { publishEventRealtimeUpdate } from "@/lib/eventRealtime";
import { syncAchievementNotifications } from "@/lib/achievementNotifications";

export const dynamic = "force-dynamic";
const FINAL_STATUS_TO_PLACEMENT = {
  WINNER: "WINNER",
  RUNNER_UP: "RUNNER_UP",
  THIRD_PLACE: "THIRD_PLACE",
  FINALIST: "FINALIST",
  SELECTED: "FINALIST",
  DISQUALIFIED: "PARTICIPANT",
};

const STATUS_PRIORITY = {
  WINNER: 1,
  RUNNER_UP: 2,
  THIRD_PLACE: 3,
  FINALIST: 4,
  SELECTED: 5,
  DISQUALIFIED: 6,
};

function isTeamEvent(event) {
  return String(event?.participationFormat || "INDIVIDUAL").toUpperCase() === "TEAM";
}

function getBetterStatus(current, next) {
  const normalizedCurrent = normalizeRoundParticipantStatus(current);
  const normalizedNext = normalizeRoundParticipantStatus(next);
  const currentPriority = STATUS_PRIORITY[normalizedCurrent] || 99;
  const nextPriority = STATUS_PRIORITY[normalizedNext] || 99;
  return nextPriority < currentPriority ? normalizedNext : normalizedCurrent;
}

async function getTeamRosterContext(eventId) {
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

async function getParticipationResultEntries(event) {
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

async function canViewEventResults(session, event) {
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

function filterEntriesForSchool(items = [], schoolId = "") {
  if (!schoolId) return items;
  return items.filter(
    (item) => String(item.school?._id || item.school || "") === String(schoolId)
  );
}

function buildLevel(event) {
  return event.eventScope === "PLATFORM" ? "PLATFORM" : "SCHOOL";
}

function placementLabel(placement) {
  if (placement === "RUNNER_UP") return "1st Runner Up";
  if (placement === "THIRD_PLACE") return "2nd Runner Up";
  return String(placement || "").replaceAll("_", " ");
}

async function getRoundResultContext(event) {
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

function mergeAchievements(entries, achievements) {
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

function achievementsToParticipantEntries(achievements = []) {
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

async function ensureTeamMemberAchievements({ event, achievements }) {
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

export async function GET(req, props) {
  try {
    const session = await getServerSession(authOptions);
    if (
      !session ||
      !["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER", "STUDENT"].includes(
        session.user.role
      )
    ) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const params = await props.params;
    await connectDB();

    const event = await Event.findById(params.id)
      .populate("school", "schoolName")
      .lean();

    if (!event) {
      return NextResponse.json(
        { success: false, message: "Event not found" },
        { status: 404 }
      );
    }

    // Enrolled students may view results read-only, scoped to their own school.
    const viewerStudent = await getEnrolledStudentForEvent(params.id, session);
    if (!viewerStudent && !(await canViewEventResults(session, event))) {
      return NextResponse.json(
        { success: false, message: "Forbidden" },
        { status: 403 }
      );
    }

    const [initialAchievements, roundContext] = await Promise.all([
      Achievement.find({ event: params.id }).lean(),
      getRoundResultContext(event),
    ]);
    const insertedMissingMembers = await ensureTeamMemberAchievements({
      event,
      achievements: initialAchievements,
    });
    const achievements = await Achievement.find({ event: params.id })
      .populate("parentAchievement", "certificateRecipientName teamName recipientType")
      .populate("student", "name grade")
      .populate("captainStudent", "name grade")
      .populate("school", "schoolName")
      .sort({ awardedAt: -1 })
      .lean();

    const schoolScopeId =
      session.user.role === "SCHOOL_ADMIN"
        ? session.user.schoolId || session.user.id
        : viewerStudent
        ? String(viewerStudent.school || "")
        : "";
    const scopedCertificateEntries = filterEntriesForSchool(
      roundContext.certificateEntries,
      schoolScopeId
    );
    const scopedAchievements = filterEntriesForSchool(achievements, schoolScopeId);
    const participants =
      scopedCertificateEntries.length > 0
        ? mergeAchievements(scopedCertificateEntries, scopedAchievements)
        : achievementsToParticipantEntries(scopedAchievements);

    return NextResponse.json(
      {
        success: true,
        data: {
          event: {
            _id: event._id,
            title: event.title,
            date: event.date,
            eventType: event.eventType,
            eventOwnershipType: event.eventOwnershipType,
            participationFormat: event.participationFormat || "INDIVIDUAL",
            eventScope: event.eventScope,
            visibility: event.visibility,
            lifecycleStatus: event.lifecycleStatus,
            eventWorkflowStatus: event.eventWorkflowStatus,
            resultsPublished: Boolean(event.resultsPublished),
            school: event.school || null,
          },
          publishPublicly: Boolean(event.publicResultsEnabled),
          scorecardCriteria: event.scorecardCriteria || [],
          participants,
          resultSource: roundContext.hasRounds ? "ROUND_HISTORY" : "ROUND_HISTORY",
          finalRound: roundContext.finalRound,
          rounds: roundContext.rounds,
          results: scopedAchievements,
          backfilledMemberCertificates: insertedMissingMembers,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Results GET error:", error);
    return NextResponse.json(
      {
        success: false,
        message:
          process.env.NODE_ENV === "development"
            ? error?.message || "Failed to load event results"
            : "Failed to load event results",
      },
      { status: 500 }
    );
  }
}

async function upsertResults(req, props) {
  try {
    const session = await getServerSession(authOptions);
    if (
      !session ||
      !["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER"].includes(session.user.role)
    ) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const params = await props.params;
    await connectDB();

    const event = await Event.findById(params.id);
    if (!event) {
      return NextResponse.json(
        { success: false, message: "Event not found" },
        { status: 404 }
      );
    }

    if (!canManageEventRounds(session, event)) {
      return NextResponse.json(
        { success: false, message: "Forbidden" },
        { status: 403 }
      );
    }

    let body;
    try {
      body = await req.json();
    } catch (error) {
      return NextResponse.json(
        { message: "Invalid JSON in request body" },
        { status: 400 }
      );
    }
    const requestedPublishPublicly = Boolean(body.publishPublicly);
    const resultsPublished = Boolean(body.resultsPublished);
    const confirmPublish = body.confirmPublish === true;
    const correctionReason = String(body.correctionReason || "").trim();
    const scorecardCriteria = sanitizeScorecardCriteria(
      body.scorecardCriteria ?? event.scorecardCriteria
    );
    const now = new Date();
    const publishPublicly =
      String(event.eventScope || "").toUpperCase() === "PLATFORM" &&
      requestedPublishPublicly;

    if (resultsPublished && !confirmPublish) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Final results require explicit organizer confirmation before publishing.",
        },
        { status: 400 }
      );
    }

    if (event.resultsPublished && resultsPublished && !correctionReason) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Results are already published. Please provide a correction reason before republishing.",
        },
        { status: 400 }
      );
    }

    const [existingAchievements, roundContext] = await Promise.all([
      Achievement.find({ event: params.id })
        .select("_id student school teamName captainStudent certificateCode certificateRecipientName recipientType parentAchievement")
        .lean(),
      getRoundResultContext(event),
    ]);

    const previousAuditState = {
      resultsPublished: Boolean(event.resultsPublished),
      publicResultsEnabled: Boolean(event.publicResultsEnabled),
      scorecardCriteria: event.scorecardCriteria || [],
      achievementCount: existingAchievements.length,
    };

    let entries = roundContext.certificateEntries.map((entry) => ({
        studentId: entry.studentId,
        teamKey: entry.teamKey || "",
        teamName: entry.teamName || "",
        captainStudent: entry.captainStudent?._id || entry.captainStudent || null,
        members: Array.isArray(entry.members) ? entry.members : [],
        school: entry.school?._id || entry.school,
        studentName: entry.student?.name || "Student",
        teamDisplayName: entry.teamName || "School Team",
        placement: entry.placement,
        finalStatus: entry.finalStatus,
        highestRoundReached: entry.highestRoundReached,
      }));

    const existingAchievementMap = new Map(
      existingAchievements.map((achievement) => [
        achievement.recipientType === "TEAM"
          ? `TEAM::${String(achievement.school)}::${String(achievement.teamName || "")
              .trim()
              .toLowerCase()}`
          : `STUDENT::${String(achievement.student)}`,
        achievement,
      ])
    );

    const nextAchievements = [];

    for (const entry of entries) {
      if (entry.teamName) {
        const teamKey = `TEAM::${String(entry.school)}::${String(entry.teamName || "")
          .trim()
          .toLowerCase()}`;
        const existingTeamAchievement = existingAchievementMap.get(teamKey);
        const teamAchievementId =
          existingTeamAchievement?._id || new mongoose.Types.ObjectId();
        const teamCertificateCode =
          existingTeamAchievement?.certificateCode ||
          buildCertificateCode(teamAchievementId, now);
        const teamCertificateIssuedAt = resultsPublished ? now : null;

        nextAchievements.push({
          _id: teamAchievementId,
          school: entry.school,
          student: null,
          recipientType: "TEAM",
          teamName: entry.teamName || "",
          captainStudent: entry.captainStudent || null,
          parentAchievement: null,
          event: event._id,
          submission: null,
          title: `${placementLabel(entry.placement)} - ${entry.teamName || event.title}`,
          description:
            entry.placement === "PARTICIPANT"
              ? `${entry.teamName || entry.teamDisplayName} participated in ${event.title}.`
              : `${entry.teamName || entry.teamDisplayName} achieved ${placementLabel(entry.placement).toLowerCase()} in ${event.title}.`,
          level: buildLevel(event),
          placement: entry.placement,
          finalStatus: entry.finalStatus,
          highestRoundReached: entry.highestRoundReached,
          certificateRecipientName:
            existingTeamAchievement?.certificateRecipientName ||
            entry.teamName ||
            entry.teamDisplayName,
        certificateCode: teamCertificateCode,
          certificateState: resultsPublished
            ? "CERTIFICATE_ACTIVE"
            : "CERTIFICATE_PREVIEW",
          certificateIssuedAt: teamCertificateIssuedAt,
          schoolSharedAt: resultsPublished ? now : null,
          certificateUrl: resultsPublished ? buildCertificatePath(teamAchievementId) : "",
          isPublic: resultsPublished && publishPublicly,
          awardedAt: now,
        });

        const teamRoster = Array.isArray(entry.members) ? entry.members : [];
        for (const member of teamRoster) {
          const memberId = String(member?._id || member || "");
          if (!memberId) continue;

          const existingMemberAchievement = existingAchievementMap.get(
            `STUDENT::${memberId}`
          );
          const memberAchievementId =
            existingMemberAchievement?._id || new mongoose.Types.ObjectId();
          const memberCertificateCode =
            existingMemberAchievement?.certificateCode ||
            buildCertificateCode(memberAchievementId, now);
          const memberCertificateIssuedAt = resultsPublished ? now : null;

          nextAchievements.push({
            _id: memberAchievementId,
            school: entry.school,
            student: member._id || member,
            recipientType: "STUDENT",
            teamName: entry.teamName || "",
            captainStudent: entry.captainStudent || null,
            parentAchievement: teamAchievementId,
            event: event._id,
            submission: null,
            title: `${placementLabel(entry.placement)} - ${member.name || "Student"}`,
            description:
              entry.placement === "PARTICIPANT"
                ? `${member.name || "Student"} participated in ${event.title} as part of ${entry.teamName || entry.teamDisplayName}.`
                : `${member.name || "Student"} achieved ${placementLabel(entry.placement).toLowerCase()} in ${event.title} as part of ${entry.teamName || entry.teamDisplayName}.`,
            level: buildLevel(event),
            placement: entry.placement,
            finalStatus: entry.finalStatus,
            highestRoundReached: entry.highestRoundReached,
            certificateRecipientName:
              existingMemberAchievement?.certificateRecipientName ||
              member.name ||
              "Student",
            certificateCode: memberCertificateCode,
            certificateState: resultsPublished
              ? "CERTIFICATE_ACTIVE"
              : "CERTIFICATE_PREVIEW",
            certificateIssuedAt: memberCertificateIssuedAt,
            schoolSharedAt: resultsPublished ? now : null,
            certificateUrl: resultsPublished
              ? buildCertificatePath(memberAchievementId)
              : "",
            isPublic: resultsPublished && publishPublicly,
            awardedAt: now,
          });
        }
      } else {
        const existingAchievement = existingAchievementMap.get(
          `STUDENT::${entry.studentId}`
        );
        const achievementId =
          existingAchievement?._id || new mongoose.Types.ObjectId();
        const certificateCode =
          existingAchievement?.certificateCode ||
          buildCertificateCode(achievementId, now);
        const certificateIssuedAt = resultsPublished ? now : null;

        nextAchievements.push({
          _id: achievementId,
          school: entry.school,
          student: entry.studentId,
          recipientType: "STUDENT",
          teamName: "",
          captainStudent: null,
          parentAchievement: null,
          event: event._id,
          submission: null,
          title: `${placementLabel(entry.placement)} - ${entry.studentName || event.title}`,
          description:
            entry.placement === "PARTICIPANT"
              ? `${entry.studentName} participated in ${event.title}.`
              : `${entry.studentName} achieved ${placementLabel(entry.placement).toLowerCase()} in ${event.title}.`,
          level: buildLevel(event),
          placement: entry.placement,
          finalStatus: entry.finalStatus,
          highestRoundReached: entry.highestRoundReached,
          certificateRecipientName:
            existingAchievement?.certificateRecipientName ||
            entry.studentName,
          certificateCode,
          certificateState: resultsPublished
            ? "CERTIFICATE_ACTIVE"
            : "CERTIFICATE_PREVIEW",
          certificateIssuedAt,
          schoolSharedAt: resultsPublished ? now : null,
          certificateUrl: resultsPublished ? buildCertificatePath(achievementId) : "",
          isPublic: resultsPublished && publishPublicly,
          awardedAt: now,
        });
      }
    }

    event.scorecardCriteria = scorecardCriteria;
    event.publicResultsEnabled = publishPublicly;
    event.resultsPublished = resultsPublished;
    event.eventWorkflowStatus = resultsPublished
      ? "RESULTS_PUBLISHED"
      : "RESULTS_DRAFT";

    // Replace the achievement set, complete rounds, and flip the event flags as
    // one atomic unit so a failed insert can't wipe the prior achievements.
    const dbSession = await mongoose.startSession();
    try {
      await dbSession.withTransaction(async () => {
        await Achievement.deleteMany(
          { event: event._id },
          { session: dbSession }
        );
        if (nextAchievements.length > 0) {
          await Achievement.insertMany(nextAchievements, {
            session: dbSession,
          });
        }
        if (resultsPublished) {
          await EventRound.updateMany(
            { event: params.id },
            { $set: { status: "COMPLETED" } },
            { session: dbSession }
          );
        }
        await event.save({ session: dbSession });
      });
    } finally {
      await dbSession.endSession();
    }

    if (resultsPublished) {
      await AuditLog.create({
        entityType: "Event",
        entityId: event._id,
        action: previousAuditState.resultsPublished
          ? "RESULTS_REPUBLISHED"
          : "RESULTS_PUBLISHED",
        performedBy: session.user.id,
        role: session.user.role,
        reason: previousAuditState.resultsPublished
          ? correctionReason
          : "Competition closed and final results published",
        before: previousAuditState,
        after: {
          resultsPublished: event.resultsPublished,
          publicResultsEnabled: event.publicResultsEnabled,
          scorecardCriteria,
          achievementCount: nextAchievements.length,
        },
      });
    }

    if (resultsPublished) {
      await syncAchievementNotifications({
        event,
        achievements: nextAchievements,
      });
    }

    publishEventRealtimeUpdate(
      resultsPublished ? "results-published" : "results-updated",
      { event }
    );

    return NextResponse.json(
      {
        success: true,
        data: {
          achievementsCreated: nextAchievements.length,
          resultsPublished: event.resultsPublished,
          draftPrepared: !event.resultsPublished,
          publishPublicly,
          scorecardCriteria,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Results save error:", error);
    return NextResponse.json(
      {
        success: false,
        message:
          process.env.NODE_ENV === "development"
            ? error?.message || "Failed to save event results"
            : "Failed to save event results",
      },
      { status: 500 }
    );
  }
}

export async function PUT(req, props) {
  return upsertResults(req, props);
}

export async function POST(req, props) {
  return upsertResults(req, props);
}
