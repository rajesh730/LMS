import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/db";
import EventRound from "@/models/EventRound";
import RoundParticipant, {
} from "@/models/RoundParticipant";
import { getManageableEventOrResponse } from "@/lib/eventRoundAccess";
import {
  getAllowedParticipantStatuses,
  repairLegacyRoundMetadata,
  syncParticipantForward,
} from "@/lib/competitionFlow";

export async function PATCH(req, props) {
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
        { message: "Competition is already closed. Round statuses are locked." },
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
    const round = await repairLegacyRoundMetadata(roundRecord);

    const body = await req.json();
    const updates = Array.isArray(body.participants)
      ? body.participants
      : [body];

    const allowedStatuses = getAllowedParticipantStatuses(round);
    for (const update of updates) {
      if (!allowedStatuses.includes(update.status)) {
        return NextResponse.json(
          { message: `Invalid participant status: ${update.status}` },
          { status: 400 }
        );
      }
    }

    const normalizedUpdates = updates.flatMap((update) => {
      const participantIds = Array.isArray(update.participantIds)
        ? update.participantIds.filter(Boolean)
        : update.participantId
        ? [update.participantId]
        : [];

      return participantIds.map((participantId) => ({
        participantId,
        status: update.status,
        remarks: update.remarks,
      }));
    });

    const operations = normalizedUpdates.map((update) => ({
      updateOne: {
        filter: {
          _id: update.participantId,
          event: params.id,
          round: params.roundId,
        },
        update: {
          $set: {
            status: update.status,
            shortlisted: update.status === "SELECTED",
            remarks:
              update.remarks === undefined
                ? ""
                : String(update.remarks || "").trim(),
            updatedBy: session.user.id,
          },
        },
      },
    }));

    if (operations.length === 0) {
      return NextResponse.json(
        { message: "No participants selected for update" },
        { status: 400 }
      );
    }

    await RoundParticipant.bulkWrite(operations);

    for (const update of normalizedUpdates.filter(
      (item) => item.participantId && item.status
    )) {
      await syncParticipantForward({
        eventId: params.id,
        currentRound: round,
        participantId: update.participantId,
        status: update.status,
      });
    }

    return NextResponse.json({ message: "Participant status updated" });
  } catch (error) {
    console.error("Update Round Participants Error:", error);
    return NextResponse.json(
      { message: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}
