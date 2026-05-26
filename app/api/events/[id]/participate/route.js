import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import Student from "@/models/Student";
import Event from "@/models/Event";
import EventSchoolInvitation from "@/models/EventSchoolInvitation";
import ParticipationRequest from "@/models/ParticipationRequest";
import User from "@/models/User";
import {
  successResponse,
  errorResponse,
  internalServerError,
} from "@/lib/apiResponse";
import { isAfterEndOfDay, isBeforeToday } from "@/lib/eventDates";
import { gradeListContains } from "@/lib/schoolGrades";
import {
  removeStudentsFromCompetition,
  syncApprovedRequestsToRoundOne,
} from "@/lib/competitionFlow";
import {
  ACTIVE_PARTICIPATION_REQUEST_STATUSES,
  applySchoolParticipationProjection,
  buildSchoolParticipationPresentation,
} from "@/lib/participationPresentation";
import { publishEventRealtimeUpdate } from "@/lib/eventRealtime";

function getRegistrationLockMessage(event, action = "change participation") {
  const lifecycleStatus = String(event.lifecycleStatus || "ACTIVE").toUpperCase();

  if (lifecycleStatus === "ARCHIVED") {
    return "This event is archived. Registration changes are locked.";
  }

  if (lifecycleStatus === "COMPLETED") {
    return "This event is completed. Registration changes are locked.";
  }

  if (isBeforeToday(event.date)) {
    return `Cannot ${action} for a past event.`;
  }

  if (event.registrationDeadline) {
    if (isAfterEndOfDay(event.registrationDeadline)) {
      return `Registration deadline has passed (${new Date(
        event.registrationDeadline
      ).toLocaleDateString()})`;
    }
  }

  return "";
}

function normalizeParticipationFormat(event) {
  if (
    String(event?.participationFormat || "").toUpperCase() === "TEAM" ||
    event?.minTeamSize ||
    event?.maxTeamSize
  ) {
    return "TEAM";
  }
  return "INDIVIDUAL";
}

function normalizeSchoolTeamBaseName(schoolName = "") {
  const cleaned = String(schoolName || "")
    .replace(/\bschool\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || "School";
}

function buildDefaultTeamName(schoolName = "", index = 0) {
  const base = `Team ${normalizeSchoolTeamBaseName(schoolName)}`.trim();
  return index > 0 ? `${base} ${index + 1}` : base;
}

async function resolveSchoolContactInfo(schoolId) {
  const school = await User.findById(schoolId)
    .select("name schoolName principalName principalPhone phone")
    .lean();

  return {
    contactPerson:
      school?.principalName || school?.name || school?.schoolName || "",
    contactPhone: school?.principalPhone || school?.phone || "",
  };
}

function validateTeamSelection(event, studentIds = [], teamName = "", captainStudentId = "") {
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

async function countActiveTeams(eventId, schoolId = null) {
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

function normalizeTeamPayload(rawTeams = []) {
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

function applyDefaultTeamNames(teams = [], schoolName = "") {
  return (Array.isArray(teams) ? teams : []).map((team, index) => ({
    ...team,
    teamName: String(team.teamName || "").trim() || buildDefaultTeamName(schoolName, index),
  }));
}

function validateMultiTeamPayload(event, teams = []) {
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

async function replaceTeamParticipation({
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

  const studentById = new Map(
    selectedStudents.map((student) => [String(student._id), student])
  );

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
      const student = studentById.get(studentId);
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

function studentLookupQuery(session) {
  return {
    status: "ACTIVE",
    isDeleted: { $ne: true },
    $or: [
      { _id: session.user.id },
      { userId: session.user.id },
      { email: session.user.email },
      { username: session.user.email },
    ],
  };
}

async function getPlatformInvitationBlocker(event, schoolId) {
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

function syncSchoolParticipants(event, schoolId, studentIds, contactInfo = {}) {
  const normalizedStudentIds = Array.from(
    new Set((studentIds || []).map((id) => String(id)))
  );

  const existingParticipant = event.participants.find(
    (participant) => participant.school?.toString() === schoolId.toString()
  );

  if (normalizedStudentIds.length === 0) {
    event.participants = event.participants.filter(
      (participant) => participant.school?.toString() !== schoolId.toString()
    );
    return;
  }

  if (existingParticipant) {
    existingParticipant.students = normalizedStudentIds;
    existingParticipant.contactPerson =
      contactInfo.contactPerson || existingParticipant.contactPerson;
    existingParticipant.contactPhone =
      contactInfo.contactPhone || existingParticipant.contactPhone;
    existingParticipant.notes =
      contactInfo.notes !== undefined ? contactInfo.notes : existingParticipant.notes;
    existingParticipant.expectedStudents = normalizedStudentIds.length;
    return;
  }

  event.participants.push({
    school: schoolId,
    students: normalizedStudentIds,
    joinedAt: new Date(),
    contactPerson: contactInfo.contactPerson || undefined,
    contactPhone: contactInfo.contactPhone || undefined,
    notes: contactInfo.notes || undefined,
    expectedStudents: normalizedStudentIds.length,
  });
}

export async function POST(req, { params }) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return errorResponse(401, "Unauthorized: Please log in");
    }

    const { id: eventId } = await params;

    // Validate event exists
    const event = await Event.findById(eventId);
    if (!event) {
      return errorResponse(404, "Event not found");
    }

    const lockMessage = getRegistrationLockMessage(event, "join");
    if (lockMessage) {
      return errorResponse(400, lockMessage);
    }

    // ==========================================
    // CASE 1: STUDENT SELF-REGISTRATION
    // ==========================================
    if (session.user.role === "STUDENT") {
      return errorResponse(
        403,
        "Student self-registration is disabled in phase 1. Please contact your teacher or school admin for registration."
      );
    }

    // ==========================================
    // CASE 2: SCHOOL ADMIN BULK REGISTRATION
    // ==========================================
    if (session.user.role === "SCHOOL_ADMIN") {
      if (event.registrationMode !== "THROUGH_SCHOOL") {
        return errorResponse(
          403,
          "This event uses direct student registration. School team management is not available here."
        );
      }

      const body = await req.json();
      const normalizedTeams = normalizeTeamPayload(body.teams);
      // Allow both naming conventions
      const studentIds = body.studentIds || body.students;
      const teamName = String(body.teamName || "").trim();
      const captainStudentId = body.captainStudentId || null;

      if (
        normalizeParticipationFormat(event) !== "TEAM" &&
        (!Array.isArray(studentIds) || studentIds.length === 0)
      ) {
        return errorResponse(400, "No students selected");
      }

      if (normalizeParticipationFormat(event) === "TEAM") {
        const multiTeamValidationMessage = validateMultiTeamPayload(
          event,
          normalizedTeams
        );
        if (multiTeamValidationMessage) {
          return errorResponse(400, multiTeamValidationMessage);
        }
      } else {
        const teamValidationMessage = validateTeamSelection(
          event,
          studentIds,
          teamName,
          captainStudentId
        );
        if (teamValidationMessage) {
          return errorResponse(400, teamValidationMessage);
        }
      }

      const schoolId = session.user.id;
      const schoolRecord =
        normalizeParticipationFormat(event) === "TEAM"
          ? await User.findById(schoolId).select("schoolName name").lean()
          : null;
      const schoolName =
        schoolRecord?.schoolName || schoolRecord?.name || session.user.schoolName || session.user.name || "";
      const schoolContactInfo = await resolveSchoolContactInfo(schoolId);
      const resolvedTeams =
        normalizeParticipationFormat(event) === "TEAM"
          ? applyDefaultTeamNames(normalizedTeams, schoolName)
          : normalizedTeams;
      const invitationBlocker = await getPlatformInvitationBlocker(
        event,
        schoolId
      );
      if (invitationBlocker) {
        return errorResponse(403, invitationBlocker);
      }

      if (normalizeParticipationFormat(event) === "TEAM") {
        const replacementResult = await replaceTeamParticipation({
          event,
          eventId,
          schoolId,
          sessionUserId: session.user.id,
          teams: resolvedTeams,
          schoolContactInfo,
        });

        if (replacementResult?.error) {
          return errorResponse(400, replacementResult.error);
        }

        publishEventRealtimeUpdate("participation-updated", {
          event,
          schoolId,
        });

        return successResponse(
          200,
          `Successfully registered ${replacementResult.teamCount} teams.`,
          replacementResult
        );
      }

      // ===== VALIDATION: Check Max Participants Per School =====
      if (event.maxParticipantsPerSchool) {
        if (normalizeParticipationFormat(event) === "TEAM") {
          const existingTeamCount = await countActiveTeams(eventId, schoolId);
          const availableTeamSlots =
            event.maxParticipantsPerSchool - existingTeamCount;

          if (availableTeamSlots <= 0) {
            return errorResponse(
              400,
              `Registration failed: Your school has already reached the limit of ${event.maxParticipantsPerSchool} team entries for this event.`
            );
          }
        } else {
        // Count existing active requests (PENDING, APPROVED, ENROLLED)
        const existingCount = await ParticipationRequest.countDocuments({
          event: eventId,
          school: schoolId,
          status: { $in: ACTIVE_PARTICIPATION_REQUEST_STATUSES },
        });

        const availableSlots = event.maxParticipantsPerSchool - existingCount;

        if (availableSlots <= 0) {
          return errorResponse(
            400,
            `Registration failed: Your school has already reached the limit of ${event.maxParticipantsPerSchool} students for this event.`
          );
        }

        // Filter out students who are already registered to avoid false positives
        const alreadyRegisteredCount =
          await ParticipationRequest.countDocuments({
            event: eventId,
            student: { $in: studentIds },
            status: { $in: ACTIVE_PARTICIPATION_REQUEST_STATUSES },
          });

        const newStudentsCount = studentIds.length - alreadyRegisteredCount;

        if (newStudentsCount > availableSlots) {
          return errorResponse(
            400,
            `Registration failed: You are trying to register ${newStudentsCount} new students, but only ${availableSlots} slots are remaining for your school (Limit: ${event.maxParticipantsPerSchool}).`
          );
        }
        }
      }

      if (event.maxParticipants) {
        if (normalizeParticipationFormat(event) === "TEAM") {
          const existingGlobalTeamCount = await countActiveTeams(eventId);
          const availableGlobalTeamSlots =
            event.maxParticipants - existingGlobalTeamCount;

          if (availableGlobalTeamSlots <= 0) {
            return errorResponse(
              400,
              `Registration failed: This event has already reached its limit of ${event.maxParticipants} team entries.`
            );
          }
        } else {
          const existingGlobalCount = await ParticipationRequest.countDocuments({
            event: eventId,
            status: { $in: ACTIVE_PARTICIPATION_REQUEST_STATUSES },
          });

          const alreadyRegisteredCount =
            await ParticipationRequest.countDocuments({
              event: eventId,
              student: { $in: studentIds },
              status: { $in: ACTIVE_PARTICIPATION_REQUEST_STATUSES },
            });

          const newStudentsCount = studentIds.length - alreadyRegisteredCount;
          const availableGlobalSlots = event.maxParticipants - existingGlobalCount;

          if (newStudentsCount > availableGlobalSlots) {
            return errorResponse(
              400,
              `Registration failed: You are trying to register ${newStudentsCount} new students, but only ${availableGlobalSlots} total slots remain for this event (Limit: ${event.maxParticipants}).`
            );
          }
        }
      }

      let successCount = 0;
      let errors = [];
      const approvedStudentIds = [];
      const now = new Date();

      // Process each student
      for (const studentId of studentIds) {
        try {
          // Verify student belongs to this school
          const student = await Student.findOne({
            _id: studentId,
            school: schoolId,
            status: "ACTIVE",
            isDeleted: { $ne: true },
          });

          if (!student) {
            errors.push(`Student ${studentId} not found or not in your school`);
            continue;
          }

          // Check Grade Eligibility
          if (event.eligibleGrades && event.eligibleGrades.length > 0) {
            if (!gradeListContains(event.eligibleGrades, student.grade)) {
              errors.push(
                `Student ${student.name} (Grade ${student.grade}) is not eligible for this event.`
              );
              continue;
            }
          }

          // Check if request already exists
          const existingRequest = await ParticipationRequest.findOne({
            student: studentId,
            event: eventId,
          });

          if (existingRequest) {
            if (
              existingRequest.status === "APPROVED" ||
              existingRequest.status === "ENROLLED"
            ) {
              approvedStudentIds.push(studentId);
            }
            continue;
          }

          // Create Request
          await ParticipationRequest.create({
            student: studentId,
            event: eventId,
            school: schoolId,
            status: "APPROVED",
            approvedAt: now,
            approvedBy: session.user.id,
            enrollmentConfirmedAt: now,
            studentNotifiedAt: now,
            contactPerson: schoolContactInfo.contactPerson || undefined,
            contactPhone: schoolContactInfo.contactPhone || undefined,
            teamName: teamName || undefined,
            captainStudent: captainStudentId || undefined,
          });

          approvedStudentIds.push(studentId);
          successCount++;
        } catch (err) {
          console.error(`Error processing student ${studentId}:`, err);
          errors.push(`Error processing student ${studentId}`);
        }
      }

      if (approvedStudentIds.length > 0) {
      const updatedRequests = await ParticipationRequest.find({
        event: eventId,
        school: schoolId,
      }).select(
        "status contactPerson contactPhone teamName captainStudent notes student requestedAt approvedAt enrollmentConfirmedAt"
      );
        applySchoolParticipationProjection(event, schoolId, updatedRequests);
        await event.save();
        await syncApprovedRequestsToRoundOne({
          eventId,
          createdBy: session.user.id,
        });
      }

      publishEventRealtimeUpdate("participation-updated", {
        event,
        schoolId,
      });

      return successResponse(
        200,
        `Successfully registered ${successCount} students.`,
        { successCount, errors }
      );
    }

    return errorResponse(
      403,
      "Only students or school admins can request participation"
    );
  } catch (error) {
    console.error("POST /api/events/[id]/participate error:", error);
    return internalServerError("Internal server error");
  }
}

export async function GET(req, { params }) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return errorResponse(401, "Unauthorized: Please log in");
    }

    const { id: eventId } = await params;

    // CASE 1: SCHOOL ADMIN
    if (session.user.role === "SCHOOL_ADMIN") {
      const requests = await ParticipationRequest.find({
        event: eventId,
        school: session.user.id,
      })
        .populate("student", "name grade")
        .populate("captainStudent", "name")
        .lean();

      if (!requests || requests.length === 0) {
        return successResponse(200, "No participation requests found", {
          requests: [],
        });
      }
      const participation = buildSchoolParticipationPresentation(requests);

      return successResponse(200, "Participation details found", {
        requests,
        contactInfo: participation.myParticipation
          ? {
              contactPerson: participation.myParticipation.contactPerson,
              contactPhone: participation.myParticipation.contactPhone,
              teamName: participation.myParticipation.teamName,
              captainStudent: participation.myParticipation.captainStudent,
              notes: participation.myParticipation.notes,
            }
          : {
              contactPerson: "",
              contactPhone: "",
              teamName: "",
              captainStudent: null,
              notes: "",
            },
        participation,
      });
    }

    // CASE 2: STUDENT
    if (session.user.role === "STUDENT") {
      const student = await Student.findOne(studentLookupQuery(session));
      if (!student) {
        return errorResponse(404, "Student not found");
      }

      // Check participation status
      const request = await ParticipationRequest.findOne({
        student: student._id,
        event: eventId,
        school: session.user.schoolId,
      })
        .populate("event", "title description")
        .lean();

      if (!request) {
        return successResponse(200, "No participation request found", null);
      }

      return successResponse(200, "Participation request found", request);
    }

    return errorResponse(403, "Unauthorized role");
  } catch (error) {
    console.error("GET /api/events/[id]/participate error:", error);
    return internalServerError("Internal server error");
  }
}

export async function DELETE(req, { params }) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return errorResponse(401, "Unauthorized: Please log in");
    }

    const { id: eventId } = await params;
    const event = await Event.findById(eventId);
    if (!event) {
      return errorResponse(404, "Event not found");
    }

    const lockMessage = getRegistrationLockMessage(event, "withdraw");
    if (lockMessage) {
      return errorResponse(400, lockMessage);
    }

    // CASE 1: SCHOOL ADMIN WITHDRAWAL (ALL)
    if (session.user.role === "SCHOOL_ADMIN") {
      if (event.registrationMode !== "THROUGH_SCHOOL") {
        return errorResponse(
          403,
          "This event uses direct student registration. School-wide withdrawal is not available here."
        );
      }

      const schoolId = session.user.id;

      const result = await ParticipationRequest.deleteMany({
        event: eventId,
        school: schoolId,
        status: { $in: ["PENDING", "APPROVED", "ENROLLED", "REJECTED"] },
      });

      applySchoolParticipationProjection(event, schoolId, []);
      await event.save();

      if (result.deletedCount === 0) {
        return errorResponse(404, "No active participation found to withdraw");
      }

      publishEventRealtimeUpdate("participation-withdrawn", {
        event,
        schoolId,
      });

      return successResponse(200, "School participation withdrawn", {
        count: result.deletedCount,
      });
    }

    // CASE 2: STUDENT WITHDRAWAL
    if (session.user.role !== "STUDENT") {
      return errorResponse(
        403,
        "Only students or school admins can withdraw requests"
      );
    }

    const student = await Student.findOne(studentLookupQuery(session));
    if (!student) {
      return errorResponse(404, "Student not found");
    }

    if (event.registrationMode !== "DIRECT") {
      return errorResponse(
        403,
        "This event is managed through the school. Please contact your school admin for registration changes."
      );
    }

    // Get school from student's record
    const schoolId = student.school || session.user.schoolId;
    if (!schoolId) {
      return errorResponse(400, "Student school information not found");
    }

    // Find and delete request (only if PENDING or REJECTED)
    const request = await ParticipationRequest.findOne({
      student: student._id,
      event: eventId,
      school: schoolId,
      status: { $in: ["PENDING", "REJECTED"] },
    });

    if (!request) {
      return errorResponse(404, "No pending request found to withdraw");
    }

    await ParticipationRequest.deleteOne({ _id: request._id });

    return successResponse(200, "Participation request withdrawn", null);
  } catch (error) {
    console.error("DELETE /api/events/[id]/participate error:", error);
    return internalServerError("Internal server error");
  }
}

export async function PUT(req, { params }) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);

    if (!session || !session.user || session.user.role !== "SCHOOL_ADMIN") {
      return errorResponse(
        403,
        "Unauthorized: Only school admins can update participation"
      );
    }

    const { id: eventId } = await params;
    const body = await req.json();
    const normalizedTeams = normalizeTeamPayload(body.teams);

    // Allow both naming conventions (frontend sends 'students' and 'contactPhone')
    const studentIds = body.studentIds || body.students;
    const teamName = String(body.teamName || "").trim();
    const captainStudentId = body.captainStudentId || null;

    const schoolId = session.user.id;
    const event = await Event.findById(eventId);
    if (!event) {
      return errorResponse(404, "Event not found");
    }

    if (
      normalizeParticipationFormat(event) !== "TEAM" &&
      !Array.isArray(studentIds)
    ) {
      return errorResponse(400, "Invalid student list");
    }

    const normalizedStudentIds = Array.isArray(studentIds)
      ? studentIds.map((id) => String(id))
      : [];
    const schoolContactInfo = await resolveSchoolContactInfo(schoolId);

    if (event.registrationMode !== "THROUGH_SCHOOL") {
      return errorResponse(
        403,
        "This event uses direct student registration. School team updates are not available here."
      );
    }

    const lockMessage = getRegistrationLockMessage(event, "update participation");
    if (lockMessage) {
      return errorResponse(400, lockMessage);
    }

    const invitationBlocker = await getPlatformInvitationBlocker(
      event,
      schoolId
    );
    if (invitationBlocker) {
      return errorResponse(403, invitationBlocker);
    }

    if (normalizeParticipationFormat(event) === "TEAM") {
      const schoolRecord = await User.findById(schoolId).select("schoolName name").lean();
      const schoolName =
        schoolRecord?.schoolName || schoolRecord?.name || session.user.schoolName || session.user.name || "";
      const schoolContactInfo = await resolveSchoolContactInfo(schoolId);
      const resolvedTeams = applyDefaultTeamNames(normalizedTeams, schoolName);
      const multiTeamValidationMessage = validateMultiTeamPayload(
        event,
        resolvedTeams
      );
      if (multiTeamValidationMessage) {
        return errorResponse(400, multiTeamValidationMessage);
      }

      const replacementResult = await replaceTeamParticipation({
        event,
        eventId,
        schoolId,
        sessionUserId: session.user.id,
        teams: resolvedTeams,
        schoolContactInfo,
      });

      if (replacementResult?.error) {
        return errorResponse(400, replacementResult.error);
      }

      publishEventRealtimeUpdate("participation-updated", {
        event,
        schoolId,
      });

      return successResponse(200, "Team participation updated successfully", replacementResult);
    }

    const teamValidationMessage = validateTeamSelection(
      event,
      normalizedStudentIds,
      teamName,
      captainStudentId
    );
    if (teamValidationMessage) {
      return errorResponse(400, teamValidationMessage);
    }

    // Check Max Participants Per School
    if (
      normalizeParticipationFormat(event) !== "TEAM" &&
      event.maxParticipantsPerSchool &&
      normalizedStudentIds.length > event.maxParticipantsPerSchool
    ) {
      return errorResponse(
        400,
        `Cannot update: You selected ${normalizedStudentIds.length} students, but the limit is ${event.maxParticipantsPerSchool}.`
      );
    }

    const selectedStudents = await Student.find({
      _id: { $in: normalizedStudentIds },
      school: schoolId,
      status: "ACTIVE",
      isDeleted: { $ne: true },
    }).select("name grade");

    if (selectedStudents.length !== normalizedStudentIds.length) {
      return errorResponse(
        400,
        "One or more selected students were not found in your school."
      );
    }

    const ineligibleStudents = selectedStudents.filter(
      (student) => !gradeListContains(event.eligibleGrades, student.grade)
    );

    if (ineligibleStudents.length > 0) {
      return errorResponse(
        400,
        `Some selected students are not eligible for this event: ${ineligibleStudents
          .map((student) => `${student.name} (${student.grade})`)
          .join(", ")}`
      );
    }

    // Get existing requests
    const existingRequests = await ParticipationRequest.find({
      event: eventId,
      school: schoolId,
    });

    const existingStudentIds = existingRequests.map((r) =>
      r.student.toString()
    );

    // Determine to Add and to Remove
    const toAdd = normalizedStudentIds.filter(
      (id) => !existingStudentIds.includes(id)
    );
    const toRemove = existingStudentIds.filter(
      (id) => !normalizedStudentIds.includes(id)
    );

    if (event.maxParticipants && normalizeParticipationFormat(event) !== "TEAM") {
      const globalActiveCount = await ParticipationRequest.countDocuments({
        event: eventId,
        status: { $in: ACTIVE_PARTICIPATION_REQUEST_STATUSES },
      });
      const toRemoveActiveCount = existingRequests.filter(
        (request) =>
          toRemove.includes(request.student.toString()) &&
          ACTIVE_PARTICIPATION_REQUEST_STATUSES.includes(request.status)
      ).length;
      const reactivatedCount = existingRequests.filter(
        (request) =>
          normalizedStudentIds.includes(request.student.toString()) &&
          !ACTIVE_PARTICIPATION_REQUEST_STATUSES.includes(request.status)
      ).length;
      const projectedCount =
        globalActiveCount - toRemoveActiveCount + toAdd.length + reactivatedCount;

      if (projectedCount > event.maxParticipants) {
        return errorResponse(
          400,
          `Cannot update: This change would exceed the global event limit of ${event.maxParticipants} students.`
        );
      }
    }

    // Remove students
    if (toRemove.length > 0) {
      await ParticipationRequest.deleteMany({
        event: eventId,
        school: schoolId,
        student: { $in: toRemove },
      });
    }

    // Add new students
    const now = new Date();
    for (const studentId of toAdd) {
      // Verify student belongs to this school
      const student = await Student.findOne({
        _id: studentId,
        school: schoolId,
        status: "ACTIVE",
        isDeleted: { $ne: true },
      });

      if (student) {
        await ParticipationRequest.create({
          student: studentId,
          event: eventId,
          school: schoolId,
          status: "APPROVED",
          approvedAt: now,
          approvedBy: session.user.id,
          enrollmentConfirmedAt: now,
          studentNotifiedAt: now,
          contactPerson: schoolContactInfo.contactPerson || undefined,
          contactPhone: schoolContactInfo.contactPhone || undefined,
          teamName: teamName || undefined,
          captainStudent: captainStudentId || undefined,
        });
      }
    }

    // Update contact info and keep selected students approved
    const toKeep = normalizedStudentIds.filter((id) =>
      existingStudentIds.includes(id)
    );
    if (toKeep.length > 0) {
      const updateData = {
        status: "APPROVED",
        approvedAt: now,
        approvedBy: session.user.id,
        rejectedAt: null,
        rejectionReason: null,
      };

      if (schoolContactInfo.contactPerson) updateData.contactPerson = schoolContactInfo.contactPerson;
      if (schoolContactInfo.contactPhone) updateData.contactPhone = schoolContactInfo.contactPhone;
      updateData.teamName = teamName || "";
      updateData.captainStudent = captainStudentId || null;
      updateData.enrollmentConfirmedAt = now;
      updateData.studentNotifiedAt = now;

      await ParticipationRequest.updateMany(
        {
          event: eventId,
          school: schoolId,
          student: { $in: toKeep },
        },
        {
          $set: updateData,
        }
      );
    }

    const updatedRequests = await ParticipationRequest.find({
      event: eventId,
      school: schoolId,
    }).select(
      "status contactPerson contactPhone teamName captainStudent notes student requestedAt approvedAt enrollmentConfirmedAt"
    );
    applySchoolParticipationProjection(event, schoolId, updatedRequests);
    await event.save();
    await syncApprovedRequestsToRoundOne({
      eventId,
      createdBy: session.user.id,
    });

    publishEventRealtimeUpdate("participation-updated", {
      event,
      schoolId,
    });

    return successResponse(200, "Participation updated successfully");
  } catch (error) {
    console.error("PUT /api/events/[id]/participate error:", error);
    return internalServerError("Internal server error");
  }
}
