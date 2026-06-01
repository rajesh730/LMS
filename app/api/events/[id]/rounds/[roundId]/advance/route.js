import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/db";
import EventRound from "@/models/EventRound";
import { getManageableEventOrResponse } from "@/lib/eventRoundAccess";
import {
  advanceSelectedParticipants,
  repairLegacyRoundMetadata,
} from "@/lib/competitionFlow";

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

    if (event.resultsPublished || event.lifecycleStatus === "COMPLETED") {
      return NextResponse.json(
        { message: "Competition is already closed. Rounds are locked." },
        { status: 400 }
      );
    }

    const roundRecord = await EventRound.findOne({
      _id: params.roundId,
      event: params.id,
    });
    if (!roundRecord) {
      return NextResponse.json({ message: "Round not found" }, { status: 404 });
    }
    const currentRound = await repairLegacyRoundMetadata(roundRecord);

    let body;
    try {
      body = await req.json();
    } catch (error) {
      return NextResponse.json(
        { message: "Invalid JSON in request body" },
        { status: 400 }
      );
    }
    const target = body.target === "final" ? "final" : "next";

    const result = await advanceSelectedParticipants({
      eventId: params.id,
      currentRound,
      createdBy: session.user.id,
      target,
      event,
    });

    if (!result.targetRound) {
      return NextResponse.json(
        {
          message:
            String(event?.participationFormat || "INDIVIDUAL").toUpperCase() ===
            "TEAM"
              ? "No selected teams found in this round."
              : "No selected students found in this round.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      message:
        target === "final"
          ? `Selected ${
              String(event?.participationFormat || "INDIVIDUAL").toUpperCase() ===
              "TEAM"
                ? "teams"
                : "students"
            } moved to the final round`
          : `Selected ${
              String(event?.participationFormat || "INDIVIDUAL").toUpperCase() ===
              "TEAM"
                ? "teams"
                : "students"
            } moved to the next round`,
      created: result.createdParticipants,
      existing: result.existingParticipants,
      movedEntries: result.movedEntries,
      roundId: result.targetRound._id,
      roundTitle: result.targetRound.title,
      roundNumber: result.targetRound.roundNumber,
      createdTargetRound: result.createdTargetRound,
    });
  } catch (error) {
    console.error("Advance Round Error:", error);
    return NextResponse.json(
      { message: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}
