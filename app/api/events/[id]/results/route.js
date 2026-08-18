import mongoose from "mongoose";
import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Event from "@/models/Event";
import Achievement from "@/models/Achievement";
import EventRound from "@/models/EventRound";
import RoundParticipant from "@/models/RoundParticipant";
import ParticipationRequest from "@/models/ParticipationRequest";
import EventSchoolInvitation from "@/models/EventSchoolInvitation";
import AuditLog from "@/models/AuditLog";
import { requireApiSession } from "@/lib/authz";
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
// Result computation lives in the domain layer; this route only handles HTTP.
import {
  FINAL_STATUS_TO_PLACEMENT,
  STATUS_PRIORITY,
  achievementsToParticipantEntries,
  buildLevel,
  canViewEventResults,
  ensureTeamMemberAchievements,
  filterEntriesForSchool,
  getBetterStatus,
  getParticipationResultEntries,
  getRoundResultContext,
  getTeamRosterContext,
  isTeamEvent,
  mergeAchievements,
  placementLabel,
} from "@/lib/eventResults";

export const dynamic = "force-dynamic";

export async function GET(req, props) {
  try {
    const { session, error: authError } = await requireApiSession();
    if (authError) return authError;
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
    const { session, error: authError } = await requireApiSession();
    if (authError) return authError;
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
