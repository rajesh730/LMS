import { buildStudentLookupForSession } from "@/lib/studentIdentity";
/**
 * Event participation — domain rules.
 *
 * Extracted from `app/api/events/[id]/participate/route.js`, which had grown to
 * 1,363 lines and held every rule about who may enter an event, how teams are
 * formed, and how capacity is enforced. None of that is HTTP concern: the same
 * rules are needed by the route, by `scripts/` backfills, and by tests that
 * should not have to construct a Request to run.
 *
 * Everything here takes plain arguments and returns plain values or an
 * `{ error }` object — never a Response. Turning a rule into a status code is
 * the route's job (see docs/ARCHITECTURE.md §2).
 */
import Student from "@/models/Student";
import User from "@/models/User";
import EventSchoolInvitation from "@/models/EventSchoolInvitation";
import ParticipationRequest from "@/models/ParticipationRequest";
import { gradeListContains } from "@/lib/schoolGrades";
import {
  removeStudentsFromCompetition,
  syncApprovedRequestsToRoundOne,
} from "@/lib/competitionFlow";
import {
  ACTIVE_PARTICIPATION_REQUEST_STATUSES,
  applySchoolParticipationProjection,
} from "@/lib/participationPresentation";

// Pure capacity check used both as a fast pre-check and as the post-insert
// verification that closes the over-enrollment race. Returns a message when a
// limit is exceeded, otherwise null.
export function capacityViolation({
  schoolActive = 0,
  globalActive = 0,
  maxPerSchool = 0,
  maxTotal = 0,
}) {
  if (maxPerSchool && schoolActive > maxPerSchool) {
    return `Your school has reached the limit of ${maxPerSchool} students for this event.`;
  }
  if (maxTotal && globalActive > maxTotal) {
    return `This event has reached its limit of ${maxTotal} students.`;
  }
  return null;
}

export function normalizeParticipationFormat(event) {
  if (
    String(event?.participationFormat || "").toUpperCase() === "TEAM" ||
    event?.minTeamSize ||
    event?.maxTeamSize
  ) {
    return "TEAM";
  }
  return "INDIVIDUAL";
}

export function normalizeSchoolTeamBaseName(schoolName = "") {
  const cleaned = String(schoolName || "")
    .replace(/\bschool\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || "School";
}

export function buildDefaultTeamName(schoolName = "", index = 0) {
  const base = `Team ${normalizeSchoolTeamBaseName(schoolName)}`.trim();
  return index > 0 ? `${base} ${index + 1}` : base;
}

export async function resolveSchoolContactInfo(schoolId) {
  const school = await User.findById(schoolId)
    .select("name schoolName principalName principalPhone phone")
    .lean();

  return {
    contactPerson:
      school?.principalName || school?.name || school?.schoolName || "",
    contactPhone: school?.principalPhone || school?.phone || "",
  };
}

export function validateTeamSelection(event, studentIds = [], teamName = "", captainStudentId = "") {
  if (normalizeParticipationFormat(event) !== "TEAM") {
    return null;
  }

  if (!String(teamName || "").trim()) {
    return "Team events require a team name.";
  }

  if (!captainStudentId) {
    return "Team events require a team captain.";
  }

  const normalizedStudentIds = Array.from(
    new Set((studentIds || []).map((id) => String(id)))
  );

  if (!normalizedStudentIds.includes(String(captainStudentId))) {
    return "Team captain must be included in the selected team members.";
  }

  const minTeamSize = Number(event.minTeamSize || 0) || 0;
  const maxTeamSize = Number(event.maxTeamSize || 0) || 0;

  if (minTeamSize && normalizedStudentIds.length < minTeamSize) {
    return `This event requires at least ${minTeamSize} team members.`;
  }

  if (maxTeamSize && normalizedStudentIds.length > maxTeamSize) {
    return `This event allows at most ${maxTeamSize} team members.`;
  }

  return null;
}

export async function countActiveTeams(eventId, schoolId = null) {
  const requests = await ParticipationRequest.find({
    event: eventId,
    ...(schoolId ? { school: schoolId } : {}),
    status: { $in: ACTIVE_PARTICIPATION_REQUEST_STATUSES },
  }).select("school teamName");

  const uniqueTeams = new Set(
    requests.map(
      (request) =>
        `${String(request.school)}::${String(request.teamName || "")
          .trim()
          .toLowerCase() || "default-team"}`
    )
  );

  return uniqueTeams.size;
}

export function normalizeTeamPayload(rawTeams = []) {
  return (Array.isArray(rawTeams) ? rawTeams : [])
    .map((team) => ({
      teamName: String(team?.teamName || "").trim(),
      captainStudentId: String(team?.captainStudentId || "").trim(),
      studentIds: Array.from(
        new Set((team?.studentIds || team?.students || []).map((id) => String(id)))
      ),
    }))
    .filter((team) => team.teamName || team.studentIds.length > 0);
}

export function applyDefaultTeamNames(teams = [], schoolName = "") {
  return (Array.isArray(teams) ? teams : []).map((team, index) => ({
    ...team,
    teamName: String(team.teamName || "").trim() || buildDefaultTeamName(schoolName, index),
  }));
}

export function validateMultiTeamPayload(event, teams = []) {
  if (normalizeParticipationFormat(event) !== "TEAM") {
    return null;
  }

  if (!Array.isArray(teams) || teams.length === 0) {
    return "Please create at least one team.";
  }

  const normalizedNames = new Set();
  const usedStudents = new Set();

  for (const team of teams) {
    const nameKey = String(team.teamName || "").trim().toLowerCase();
    if (!nameKey) {
      return "Every team must have a team name.";
    }
    if (normalizedNames.has(nameKey)) {
      return `Duplicate team name found: ${team.teamName}`;
    }
    normalizedNames.add(nameKey);

    const teamValidationMessage = validateTeamSelection(
      event,
      team.studentIds,
      team.teamName,
      team.captainStudentId
    );
    if (teamValidationMessage) {
      return `${team.teamName}: ${teamValidationMessage}`;
    }

    for (const studentId of team.studentIds) {
      if (usedStudents.has(studentId)) {
        return "A student cannot be added to more than one team in the same event.";
      }
      usedStudents.add(studentId);
    }
  }

  return null;
}

export async function replaceTeamParticipation({
  event,
  eventId,
  schoolId,
  sessionUserId,
  teams,
  schoolContactInfo = {},
}) {
  const allStudentIds = Array.from(
    new Set(teams.flatMap((team) => team.studentIds))
  );

  const selectedStudents = await Student.find({
    _id: { $in: allStudentIds },
    school: schoolId,
    status: "ACTIVE",
    isDeleted: { $ne: true },
  }).select("name grade");

  if (selectedStudents.length !== allStudentIds.length) {
    return { error: "One or more selected students were not found in your school." };
  }

  const ineligibleStudents = selectedStudents.filter(
    (student) => !gradeListContains(event.eligibleGrades, student.grade)
  );
  if (ineligibleStudents.length > 0) {
    return {
      error: `Some selected students are not eligible for this event: ${ineligibleStudents
        .map((student) => `${student.name} (${student.grade})`)
        .join(", ")}`,
    };
  }

  if (event.maxParticipantsPerSchool && teams.length > event.maxParticipantsPerSchool) {
    return {
      error: `This event allows at most ${event.maxParticipantsPerSchool} teams from one school.`,
    };
  }

  const existingRequests = await ParticipationRequest.find({
    event: eventId,
    school: schoolId,
  }).select("student");

  const existingStudentIds = existingRequests.map((request) =>
    String(request.student)
  );
  const removedStudentIds = existingStudentIds.filter(
    (studentId) => !allStudentIds.includes(studentId)
  );

  const otherSchoolTeamCount = event.maxParticipants
    ? (await countActiveTeams(eventId)) - (await countActiveTeams(eventId, schoolId))
    : 0;

  if (
    event.maxParticipants &&
    otherSchoolTeamCount + teams.length > event.maxParticipants
  ) {
    return {
      error: `This event allows at most ${event.maxParticipants} teams in total.`,
    };
  }

  await ParticipationRequest.deleteMany({
    event: eventId,
    school: schoolId,
  });

  const now = new Date();
  const documents = teams.flatMap((team) =>
    team.studentIds.map((studentId) => {
      return {
        student: studentId,
        event: eventId,
        school: schoolId,
        status: "APPROVED",
        approvedAt: now,
        approvedBy: sessionUserId,
        enrollmentConfirmedAt: now,
        studentNotifiedAt: now,
        contactPerson: schoolContactInfo.contactPerson || undefined,
        contactPhone: schoolContactInfo.contactPhone || undefined,
        teamName: team.teamName,
        captainStudent: team.captainStudentId || undefined,
        requestedAt: now,
      };
    })
  );

  if (documents.length > 0) {
    await ParticipationRequest.insertMany(documents);
  }

  const updatedRequests = await ParticipationRequest.find({
    event: eventId,
    school: schoolId,
  }).select(
    "status contactPerson contactPhone teamName captainStudent notes student requestedAt approvedAt enrollmentConfirmedAt"
  );
  applySchoolParticipationProjection(event, schoolId, updatedRequests);
  await event.save();

  if (removedStudentIds.length > 0) {
    await removeStudentsFromCompetition({
      eventId,
      studentIds: removedStudentIds,
    });
  }

  await syncApprovedRequestsToRoundOne({
    eventId,
    createdBy: sessionUserId,
  });

  return {
    success: true,
    teamCount: teams.length,
    memberCount: documents.length,
  };
}

export async function getPlatformInvitationBlocker(event, schoolId) {
  if (event.eventScope !== "PLATFORM") return null;

  const invitation = await EventSchoolInvitation.findOne({
    event: event._id,
    school: schoolId,
  }).select("status");

  if (invitation?.status === "APPROVED") return null;

  if (invitation?.status === "DISAPPROVED") {
    return "Your school has disapproved this platform event.";
  }

  if (invitation?.status === "WITHDRAWN") {
    return "This platform event is no longer available for your school.";
  }

  return "Your school must approve this platform event before students can participate.";
}
