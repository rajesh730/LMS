import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/db";
import EventRound from "@/models/EventRound";
import RoundParticipant from "@/models/RoundParticipant";
import RoundSubmission from "@/models/RoundSubmission";
import ParticipationRequest from "@/models/ParticipationRequest";
import {
  getManageableEventOrResponse,
  getViewableEventOrResponse,
} from "@/lib/eventRoundAccess";
import {
  buildRoundParticipantEntries,
  ensureRoundForEvent,
  getLatestRound,
  getOrderedRounds,
  getInitialStatusForRound,
} from "@/lib/competitionFlow";
import "@/models/Student";
import "@/models/User";

function cleanRoundPayload(body) {
  return {
    title: String(body.title || "").trim(),
    isFinal: Boolean(body.isFinal),
    description: String(body.description || "").trim(),
    date: body.date || null,
    startTime: String(body.startTime || "").trim(),
    endTime: String(body.endTime || "").trim(),
    submissionDeadline: body.submissionDeadline || null,
  };
}

export async function GET(req, props) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const params = await props.params;
    const access = await getViewableEventOrResponse(params.id, session);
    if (access.error) {
      return NextResponse.json(
        { message: access.error.message },
        { status: access.error.status }
      );
    }
    const event = access.event;
    const canManage = access.canManage;

    const rounds = await getOrderedRounds(params.id);
    const roundIds = rounds.map((round) => round._id);
    const [participants, submissions, activeRequests] = await Promise.all([
      RoundParticipant.find({ round: { $in: roundIds } })
        .populate("student", "name grade rollNumber platformStudentId")
        .populate("captainStudent", "name grade")
        .populate("school", "schoolName name")
        .sort({ roundNumber: 1, createdAt: 1 })
        .lean(),
      RoundSubmission.find({ event: params.id, round: { $in: roundIds } })
        .sort({ submittedAt: -1 })
        .lean(),
      ParticipationRequest.find({
        event: params.id,
        status: { $in: ["APPROVED", "ENROLLED"] },
      })
        .select("student")
        .lean(),
    ]);

    // Round 1 is derived from the approved/enrolled roster, so it must mirror it
    // exactly. Historically, round entries were never pruned when a participant
    // was later removed, leaving the round showing the full roster instead of
    // the live participants. Heal that here: drop any round-1 entry whose
    // student is no longer an active participant, both from the response and
    // (best effort) from storage so every count stays consistent.
    const roundOne = rounds.find((round) => Number(round.roundNumber) === 1);
    let cleanedParticipants = participants;
    if (roundOne) {
      const activeStudentIds = new Set(
        activeRequests.map((request) => String(request.student))
      );
      const orphanIds = [];
      cleanedParticipants = participants.filter((participant) => {
        if (String(participant.round) !== String(roundOne._id)) return true;
        const studentId = String(participant.student?._id || participant.student);
        if (activeStudentIds.has(studentId)) return true;
        orphanIds.push(participant._id);
        return false;
      });
      // Only managers trigger the storage cleanup; read-only viewers (students)
      // still get the filtered response but never mutate data on a GET.
      if (orphanIds.length > 0 && canManage) {
        RoundParticipant.deleteMany({ _id: { $in: orphanIds } }).catch((error) =>
          console.error("Round 1 orphan cleanup failed:", error)
        );
      }
    }

    const participantsByRound = new Map();
    roundIds.forEach((roundId) => {
      const roundParticipants = cleanedParticipants.filter(
        (participant) => String(participant.round) === String(roundId)
      );
      participantsByRound.set(
        String(roundId),
        buildRoundParticipantEntries({
          event,
          participants: roundParticipants,
          submissions: submissions.filter(
            (submission) => String(submission.round) === String(roundId)
          ),
        })
      );
    });

    return NextResponse.json({
      rounds: rounds.map((round) => ({
        ...round,
        participants: participantsByRound.get(String(round._id)) || [],
      })),
    });
  } catch (error) {
    console.error("List Event Rounds Error:", error);
    return NextResponse.json(
      { message: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req, props) {
  try {
    const session = await getServerSession(authOptions);
    if (
      !session ||
      !["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER"].includes(session.user.role)
    ) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const params = await props.params;
    const access = await getManageableEventOrResponse(params.id, session);
    if (access.error) {
      return NextResponse.json(
        { message: access.error.message },
        { status: access.error.status }
      );
    }
    const event = access.event;

    const body = await req.json();
    const payload = cleanRoundPayload(body);
    if (!payload.title) {
      return NextResponse.json(
        { message: "Round title is required" },
        { status: 400 }
      );
    }

    if (event.resultsPublished || event.lifecycleStatus === "COMPLETED") {
      return NextResponse.json(
        { message: "Competition is already closed. Rounds are locked." },
        { status: 400 }
      );
    }

    const lastRound = await getLatestRound(params.id);
    const requestedRoundNumber = Number(body.roundNumber);
    const roundNumber =
      Number.isInteger(requestedRoundNumber) && requestedRoundNumber > 0
        ? requestedRoundNumber
        : (lastRound?.roundNumber || 0) + 1;

    if (lastRound?.roundType === "FINAL") {
      return NextResponse.json(
        { message: "No new rounds can be created after the final round exists." },
        { status: 400 }
      );
    }

    if (lastRound && roundNumber !== Number(lastRound.roundNumber) + 1) {
      return NextResponse.json(
        { message: "Rounds must be created only after the latest round." },
        { status: 400 }
      );
    }

    if (payload.isFinal) {
      const existingFinalRound = await EventRound.findOne({
        event: params.id,
        roundType: "FINAL",
      }).lean();
      if (existingFinalRound) {
        return NextResponse.json(
          { message: "A final round already exists for this event." },
          { status: 409 }
        );
      }
    }

    const ensureResult = await ensureRoundForEvent({
      eventId: params.id,
      createdBy: session.user.id,
      roundNumber,
      isFinal: payload.isFinal,
      title: payload.title,
      description: payload.description,
    });
    const round = ensureResult.round;

    Object.assign(round, {
      roundType: payload.isFinal ? "FINAL" : "REGULAR",
      date: payload.date || null,
      startTime: payload.startTime,
      endTime: payload.endTime,
      submissionDeadline: payload.submissionDeadline || null,
    });
    await round.save();
    event.eventWorkflowStatus = "ROUND_ACTIVE";
    await event.save();

    // Auto-populate participants
    let sourceParticipants = [];
    if (roundNumber === 1) {
      const requests = await ParticipationRequest.find({
        event: params.id,
        status: { $in: ["APPROVED", "ENROLLED"] },
      }).select("school student teamName captainStudent").lean();
      sourceParticipants = requests.map((req) => ({
        school: req.school,
        student: req.student,
        teamName: req.teamName || "",
        captainStudent: req.captainStudent || null,
      }));
    } else {
      const prevRound = await EventRound.findOne({
        event: params.id,
        roundNumber: roundNumber - 1,
      }).lean();
      if (prevRound) {
        const selected = await RoundParticipant.find({
          event: params.id,
          round: prevRound._id,
          status: { $in: ["SELECTED"] },
        }).select("school student teamName captainStudent").lean();
        sourceParticipants = selected.map((p) => ({
          school: p.school,
          student: p.student,
          teamName: p.teamName || "",
          captainStudent: p.captainStudent || null,
        }));
      }
    }

    if (sourceParticipants.length > 0) {
      const operations = sourceParticipants.map((p) => ({
        updateOne: {
          filter: { round: round._id, student: p.student },
          update: {
            $setOnInsert: {
              event: params.id,
              round: round._id,
              roundNumber: round.roundNumber,
              school: p.school,
              teamName: p.teamName || "",
              captainStudent: p.captainStudent || null,
              student: p.student,
              status: getInitialStatusForRound(round),
            },
          },
          upsert: true,
        },
      }));
      await RoundParticipant.bulkWrite(operations);

    }

    return NextResponse.json(
      { message: "Round created and populated", round },
      { status: 201 }
    );
  } catch (error) {
    if (error.code === 11000) {
      return NextResponse.json(
        { message: "A round with this number already exists for this event." },
        { status: 409 }
      );
    }

    console.error("Create Event Round Error:", error);
    return NextResponse.json(
      { message: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}
