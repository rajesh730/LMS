import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/db";
import EventRound from "@/models/EventRound";
import RoundParticipant from "@/models/RoundParticipant";
import ParticipationRequest from "@/models/ParticipationRequest";
import { getManageableEventOrResponse } from "@/lib/eventRoundAccess";
import { getInitialStatusForRound } from "@/lib/competitionFlow";

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

    const round = await EventRound.findOne({
      _id: params.roundId,
      event: params.id,
    });
    if (!round) {
      return NextResponse.json({ message: "Round not found" }, { status: 404 });
    }

    let sourceParticipants = [];
    if (round.roundNumber === 1) {
      const requests = await ParticipationRequest.find({
        event: params.id,
        status: { $in: ["APPROVED", "ENROLLED"] },
      })
        .select("school student teamName captainStudent")
        .lean();
      sourceParticipants = requests.map((request) => ({
        school: request.school,
        student: request.student,
        teamName: request.teamName || "",
        captainStudent: request.captainStudent || null,
      }));
    } else {
      const previousRound = await EventRound.findOne({
        event: params.id,
        roundNumber: round.roundNumber - 1,
      }).lean();
      if (!previousRound) {
        return NextResponse.json(
          { message: "Previous round must exist before generating this round." },
          { status: 400 }
        );
      }

      const previousSelected = await RoundParticipant.find({
        event: params.id,
        round: previousRound._id,
        status: "SELECTED",
      })
        .select("school student teamName captainStudent")
        .lean();
      sourceParticipants = previousSelected.map((participant) => ({
        school: participant.school,
        student: participant.student,
        teamName: participant.teamName || "",
        captainStudent: participant.captainStudent || null,
      }));
    }

    if (sourceParticipants.length === 0) {
      return NextResponse.json(
        {
          message:
            String(event?.participationFormat || "INDIVIDUAL").toUpperCase() ===
            "TEAM"
              ? "No eligible team members found for this round."
              : "No eligible students found for this round.",
        },
        { status: 400 }
      );
    }

    const operations = sourceParticipants.map((participant) => ({
      updateOne: {
        filter: { round: round._id, student: participant.student },
        update: {
          $setOnInsert: {
            event: params.id,
            round: round._id,
            roundNumber: round.roundNumber,
            school: participant.school,
            teamName: participant.teamName || "",
            captainStudent: participant.captainStudent || null,
            student: participant.student,
            status: getInitialStatusForRound(round),
          },
        },
        upsert: true,
      },
    }));

    const result = await RoundParticipant.bulkWrite(operations);

    // Round 1 is derived directly from the approved/enrolled request roster, so
    // it must stay in sync with it. Drop any round-1 entries whose student is no
    // longer an eligible source participant (e.g. a request that was later
    // rejected or withdrawn) — otherwise the round keeps stale rows and its
    // count drifts away from the live participant list.
    let removed = 0;
    if (round.roundNumber === 1) {
      const eligibleStudentIds = sourceParticipants.map((participant) =>
        String(participant.student)
      );
      const cleanup = await RoundParticipant.deleteMany({
        event: params.id,
        round: round._id,
        student: { $nin: eligibleStudentIds },
      });
      removed = cleanup.deletedCount || 0;
    }

    event.eventWorkflowStatus = "ROUND_ACTIVE";
    await event.save();

    return NextResponse.json({
      message: "Round participants generated",
      created: result.upsertedCount || 0,
      matched: result.matchedCount || 0,
      removed,
    });
  } catch (error) {
    console.error("Generate Round Participants Error:", error);
    return NextResponse.json(
      { message: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}
