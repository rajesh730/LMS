import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import Event from "@/models/Event";
import TalentSubmission from "@/models/TalentSubmission";
import ParticipationRequest from "@/models/ParticipationRequest";
import Achievement from "@/models/Achievement";
import {
  buildCertificateCode,
  buildCertificatePath,
  buildScorecard,
  formatPlacementLabel,
  getScoreTotals,
  RESULT_PLACEMENTS,
  sanitizeScorecardCriteria,
} from "@/lib/results";

export const dynamic = "force-dynamic";

const ACTIVE_REQUEST_STATUSES = ["PENDING", "APPROVED", "ENROLLED"];

function canManageResults(session, event) {
  if (session.user.role === "SUPER_ADMIN") {
    return event.eventScope === "PLATFORM";
  }

  if (session.user.role === "SCHOOL_ADMIN") {
    return String(event.school) === session.user.id;
  }

  return false;
}

function buildLevel(event) {
  if (event.eventScope === "PLATFORM") return "PLATFORM";
  if (event.targetGroup) return "INTER_SCHOOL";
  return "SCHOOL";
}

function buildParticipants({ requests, submissions, achievements }) {
  const participantMap = new Map();

  for (const request of requests) {
    const studentId = String(request.student?._id || request.student || "");
    if (!studentId) continue;

    const existing = participantMap.get(studentId);
    const next = existing || {
      studentId,
      student: request.student || null,
      school: request.school || null,
      participationStatus: request.status,
      submissionTitles: [],
      submissionIds: [],
      submissionCount: 0,
      currentPlacement: "",
      resultNote: "",
      scorecard: [],
      totalScore: 0,
      scorePercentage: 0,
      certificateUrl: "",
      certificateCode: "",
      isPublicResult: false,
    };

    next.student = next.student || request.student || null;
    next.school = next.school || request.school || null;
    next.participationStatus = request.status;
    participantMap.set(studentId, next);
  }

  for (const submission of submissions) {
    const studentId = String(submission.student?._id || submission.student || "");
    if (!studentId) continue;

    const existing = participantMap.get(studentId) || {
      studentId,
      student: submission.student || null,
      school: submission.school || null,
      participationStatus: "SUBMITTED",
      submissionTitles: [],
      submissionIds: [],
      submissionCount: 0,
      currentPlacement: "",
      resultNote: "",
      scorecard: [],
      totalScore: 0,
      scorePercentage: 0,
      certificateUrl: "",
      certificateCode: "",
      isPublicResult: false,
    };

    existing.student = existing.student || submission.student || null;
    existing.school = existing.school || submission.school || null;

    if (!existing.submissionIds.includes(String(submission._id))) {
      existing.submissionIds.push(String(submission._id));
    }

    if (
      submission.title &&
      !existing.submissionTitles.includes(submission.title)
    ) {
      existing.submissionTitles.push(submission.title);
    }

    existing.submissionCount = existing.submissionIds.length;

    if (submission.resultPlacement) {
      existing.currentPlacement = submission.resultPlacement;
    }
    if (submission.resultNote) {
      existing.resultNote = submission.resultNote;
    }
    if (Array.isArray(submission.scorecard) && submission.scorecard.length > 0) {
      existing.scorecard = submission.scorecard;
      existing.totalScore = Number(submission.totalScore || 0);
      existing.scorePercentage = Number(submission.scorePercentage || 0);
    }
    if (submission.certificateUrl) {
      existing.certificateUrl = submission.certificateUrl;
    }

    participantMap.set(studentId, existing);
  }

  for (const achievement of achievements) {
    const studentId = String(achievement.student?._id || achievement.student || "");
    if (!studentId) continue;

    const existing = participantMap.get(studentId) || {
      studentId,
      student: achievement.student || null,
      school: achievement.school || null,
      participationStatus: "RESULT_ONLY",
      submissionTitles: [],
      submissionIds: [],
      submissionCount: 0,
      currentPlacement: "",
      resultNote: "",
      scorecard: [],
      totalScore: 0,
      scorePercentage: 0,
      certificateUrl: "",
      certificateCode: "",
      isPublicResult: false,
    };

    existing.currentPlacement = achievement.placement || "";
    existing.resultNote = achievement.description || "";
    existing.isPublicResult = Boolean(achievement.isPublic);
    existing.certificateUrl = achievement.certificateUrl || existing.certificateUrl;
    existing.certificateCode =
      achievement.certificateCode || existing.certificateCode;
    if (Array.isArray(achievement.scorecard) && achievement.scorecard.length > 0) {
      existing.scorecard = achievement.scorecard;
      existing.totalScore = Number(achievement.totalScore || 0);
      existing.scorePercentage = Number(achievement.scorePercentage || 0);
    }
    participantMap.set(studentId, existing);
  }

  return Array.from(participantMap.values()).sort((a, b) => {
    if ((b.totalScore || 0) !== (a.totalScore || 0)) {
      return (b.totalScore || 0) - (a.totalScore || 0);
    }

    return String(a.student?.name || "").localeCompare(
      String(b.student?.name || "")
    );
  });
}

export async function GET(req, props) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["SUPER_ADMIN", "SCHOOL_ADMIN"].includes(session.user.role)) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const params = await props.params;
    await connectDB();

    const event = await Event.findById(params.id)
      .populate("school", "schoolName")
      .populate("targetGroup", "name")
      .lean();

    if (!event) {
      return NextResponse.json(
        { success: false, message: "Event not found" },
        { status: 404 }
      );
    }

    if (!canManageResults(session, event)) {
      return NextResponse.json(
        { success: false, message: "Forbidden" },
        { status: 403 }
      );
    }

    const [requests, submissions, achievements] = await Promise.all([
      ParticipationRequest.find({
        event: params.id,
        status: { $in: ACTIVE_REQUEST_STATUSES },
      })
        .populate("student", "name grade")
        .populate("school", "schoolName")
        .sort({ createdAt: 1 })
        .lean(),
      TalentSubmission.find({
        event: params.id,
        status: { $in: ["SUBMITTED", "SHORTLISTED", "PUBLISHED"] },
      })
        .populate("student", "name grade")
        .populate("school", "schoolName")
        .sort({ updatedAt: -1 })
        .lean(),
      Achievement.find({ event: params.id })
        .populate("student", "name grade")
        .populate("school", "schoolName")
        .sort({ awardedAt: -1 })
        .lean(),
    ]);

    const participants = buildParticipants({ requests, submissions, achievements });
    const publishPublicly =
      Boolean(event.publicResultsEnabled) ||
      (Boolean(event.resultsPublished) &&
        achievements.some((achievement) => achievement.isPublic));

    return NextResponse.json(
      {
        success: true,
        data: {
          event: {
            _id: event._id,
            title: event.title,
            date: event.date,
            eventType: event.eventType,
            eventScope: event.eventScope,
            visibility: event.visibility,
            lifecycleStatus: event.lifecycleStatus,
            resultsPublished: Boolean(event.resultsPublished),
            school: event.school || null,
            targetGroup: event.targetGroup || null,
          },
          publishPublicly,
          scorecardCriteria: event.scorecardCriteria || [],
          participants,
          results: achievements,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Results GET error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to load event results" },
      { status: 500 }
    );
  }
}

async function upsertResults(req, props) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["SUPER_ADMIN", "SCHOOL_ADMIN"].includes(session.user.role)) {
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

    if (!canManageResults(session, event)) {
      return NextResponse.json(
        { success: false, message: "Forbidden" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const rawPlacements = Array.isArray(body.placements) ? body.placements : [];
    const publishPublicly = Boolean(body.publishPublicly);
    const resultsPublished = Boolean(body.resultsPublished);
    const scorecardCriteria = sanitizeScorecardCriteria(
      body.scorecardCriteria ?? event.scorecardCriteria
    );
    const now = new Date();

    const [requests, submissions, existingAchievements] = await Promise.all([
      ParticipationRequest.find({
        event: params.id,
        status: { $in: ACTIVE_REQUEST_STATUSES },
      })
        .populate("student", "name")
        .lean(),
      TalentSubmission.find({ event: params.id })
        .populate("student", "name")
        .lean(),
      Achievement.find({ event: params.id })
        .select("_id student certificateCode")
        .lean(),
    ]);

    const participantMeta = new Map();

    for (const request of requests) {
      const studentId = String(request.student?._id || request.student || "");
      if (!studentId) continue;
      participantMeta.set(studentId, {
        school: request.school,
        studentName: request.student?.name || "Student",
        submissionIds: [],
      });
    }

    for (const submission of submissions) {
      const studentId = String(submission.student?._id || submission.student || "");
      if (!studentId) continue;

      const existing = participantMeta.get(studentId) || {
        school: submission.school,
        studentName: submission.student?.name || "Student",
        submissionIds: [],
      };

      existing.school = existing.school || submission.school;
      existing.studentName =
        existing.studentName || submission.student?.name || "Student";
      existing.submissionIds.push(submission._id);
      participantMeta.set(studentId, existing);
    }

    const existingAchievementMap = new Map(
      existingAchievements.map((achievement) => [
        String(achievement.student),
        achievement,
      ])
    );

    const normalizedEntries = [];
    const seenStudentIds = new Set();

    for (const entry of rawPlacements) {
      const studentId = String(entry?.studentId || "");
      if (!studentId || seenStudentIds.has(studentId)) continue;
      seenStudentIds.add(studentId);

      const placement = RESULT_PLACEMENTS.includes(entry?.placement)
        ? entry.placement
        : "NONE";
      const scorecard = buildScorecard(scorecardCriteria, entry?.scores);
      const { totalScore, scorePercentage } = getScoreTotals(scorecard);

      normalizedEntries.push({
        studentId,
        placement,
        note: String(entry?.note || "").trim(),
        scorecard,
        totalScore,
        scorePercentage,
      });
    }

    const nextAchievements = normalizedEntries
      .filter(
        (entry) =>
          entry.placement !== "NONE" && participantMeta.get(entry.studentId)?.school
      )
      .map((entry) => {
        const meta = participantMeta.get(entry.studentId);
        const existingAchievement = existingAchievementMap.get(entry.studentId);
        const achievementId =
          existingAchievement?._id || new mongoose.Types.ObjectId();
        const certificateCode =
          existingAchievement?.certificateCode ||
          buildCertificateCode(achievementId, now);
        const certificateUrl = resultsPublished
          ? buildCertificatePath(achievementId)
          : "";

        return {
          _id: achievementId,
          school: meta.school,
          student: entry.studentId,
          event: event._id,
          submission: meta.submissionIds?.[0] || null,
          title: `${formatPlacementLabel(entry.placement)} - ${event.title}`,
          description:
            entry.note ||
            `${meta.studentName} earned ${formatPlacementLabel(
              entry.placement
            ).toLowerCase()} in ${event.title}.`,
          level: buildLevel(event),
          placement: entry.placement,
          scorecard: entry.scorecard,
          totalScore: entry.totalScore,
          scorePercentage: entry.scorePercentage,
          certificateCode,
          certificateIssuedAt: resultsPublished ? now : null,
          certificateUrl,
          isPublic: resultsPublished && publishPublicly,
          awardedAt: now,
        };
      });

    await Achievement.deleteMany({ event: event._id });
    if (nextAchievements.length > 0) {
      await Achievement.insertMany(nextAchievements);
    }

    const achievementMap = new Map(
      nextAchievements.map((achievement) => [String(achievement.student), achievement])
    );

    await TalentSubmission.updateMany(
      { event: params.id },
      {
        $set: {
          resultPlacement: "",
          resultNote: "",
          scorecard: [],
          totalScore: 0,
          scorePercentage: 0,
          scorecardReviewedAt: null,
          resultPublishedAt: resultsPublished ? now : null,
          certificateUrl: "",
        },
      }
    );

    const submissionWrites = normalizedEntries
      .map((entry) => {
        const meta = participantMeta.get(entry.studentId);
        if (!meta?.submissionIds?.length) return null;

        const linkedAchievement = achievementMap.get(entry.studentId);

        return {
          updateMany: {
            filter: { _id: { $in: meta.submissionIds } },
            update: {
              $set: {
                resultPlacement: entry.placement === "NONE" ? "" : entry.placement,
                resultNote: entry.note || "",
                scorecard: entry.scorecard,
                totalScore: entry.totalScore,
                scorePercentage: entry.scorePercentage,
                scorecardReviewedAt: now,
                resultPublishedAt: resultsPublished ? now : null,
                certificateUrl: linkedAchievement?.certificateUrl || "",
              },
            },
          },
        };
      })
      .filter(Boolean);

    if (submissionWrites.length > 0) {
      await TalentSubmission.bulkWrite(submissionWrites);
    }

    event.scorecardCriteria = scorecardCriteria;
    event.publicResultsEnabled = publishPublicly;
    event.resultsPublished = resultsPublished;
    if (resultsPublished && event.lifecycleStatus === "ACTIVE") {
      event.lifecycleStatus = "COMPLETED";
    }
    await event.save();

    return NextResponse.json(
      {
        success: true,
        data: {
          achievementsCreated: nextAchievements.length,
          resultsPublished: event.resultsPublished,
          publishPublicly,
          scorecardCriteria,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Results save error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to save event results" },
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
