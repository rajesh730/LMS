import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/db";
import EventRound from "@/models/EventRound";
import RoundParticipant from "@/models/RoundParticipant";
import EventNotice from "@/models/EventNotice";
import Event from "@/models/Event";
import Achievement from "@/models/Achievement";
import { getManageableEventOrResponse } from "@/lib/eventRoundAccess";
import { getLatestRound } from "@/lib/competitionFlow";

const ROUND_MODES = ["ONLINE_SUBMISSION", "OFFLINE_VENUE", "LIVE_ONLINE"];
const ROUND_STATUSES = [
  "DRAFT",
  "SCHEDULED",
  "OPEN_FOR_SUBMISSION",
  "IN_PROGRESS",
  "JUDGING",
  "SHORTLIST_PUBLISHED",
  "COMPLETED",
  "POSTPONED",
  "CANCELLED",
];

function cleanRoundPayload(body) {
  const payload = {};
  if (body.title !== undefined) payload.title = String(body.title).trim();
  if (body.isFinal !== undefined) payload.isFinal = Boolean(body.isFinal);
  if (body.description !== undefined) {
    payload.description = String(body.description).trim();
  }
  if (body.mode !== undefined && ROUND_MODES.includes(body.mode)) {
    payload.mode = body.mode;
  }
  if (body.date !== undefined) payload.date = body.date || null;
  if (body.startTime !== undefined) {
    payload.startTime = String(body.startTime).trim();
  }
  if (body.endTime !== undefined) payload.endTime = String(body.endTime).trim();
  if (body.venue !== undefined) payload.venue = String(body.venue).trim();
  if (body.meetingLink !== undefined) {
    payload.meetingLink = String(body.meetingLink).trim();
  }
  if (body.submissionDeadline !== undefined) {
    payload.submissionDeadline = body.submissionDeadline || null;
  }
  if (body.instructions !== undefined) {
    payload.instructions = String(body.instructions).trim();
  }
  if (body.status !== undefined && ROUND_STATUSES.includes(body.status)) {
    payload.status = body.status;
  }
  return payload;
}

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
        { message: "Competition is already closed. Rounds are locked." },
        { status: 400 }
      );
    }

    const round = await EventRound.findOne({
      _id: params.roundId,
      event: params.id,
    });
    if (!round) {
      return NextResponse.json({ message: "Round not found" }, { status: 404 });
    }

    const payload = cleanRoundPayload(await req.json());
    if (payload.title !== undefined && !payload.title) {
      return NextResponse.json(
        { message: "Round title is required" },
        { status: 400 }
      );
    }

    const latestRound = await getLatestRound(params.id);
    if (
      payload.isFinal === true &&
      latestRound &&
      String(latestRound._id) !== String(round._id) &&
      Number(latestRound.roundNumber) > Number(round.roundNumber)
    ) {
      return NextResponse.json(
        { message: "Only the latest round can be converted into the final round." },
        { status: 400 }
      );
    }

    if (payload.isFinal === false && round.roundType === "FINAL") {
      return NextResponse.json(
        { message: "Final round type cannot be removed once set." },
        { status: 400 }
      );
    }

    Object.assign(round, payload);
    if (payload.isFinal !== undefined) {
      round.roundType = payload.isFinal ? "FINAL" : "REGULAR";
    }
    await round.save();

    return NextResponse.json({ message: "Round updated", round });
  } catch (error) {
    console.error("Update Event Round Error:", error);
    return NextResponse.json(
      { message: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(req, props) {
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

    const round = await EventRound.findOne({
      _id: params.roundId,
      event: params.id,
    });
    if (!round) {
      return NextResponse.json({ message: "Round not found" }, { status: 404 });
    }

    const participantCount = await RoundParticipant.countDocuments({
      round: params.roundId,
    });
    const latestRound = await getLatestRound(params.id);

    const isLatestRound =
      latestRound && String(latestRound._id) === String(params.roundId);

    if (participantCount > 0 && round.status !== "DRAFT" && !isLatestRound) {
      return NextResponse.json(
        {
          message:
            "Only the latest round can be deleted after participants are generated.",
        },
        { status: 400 }
      );
    }

    await Promise.all([
      RoundParticipant.updateMany(
        { event: params.id, advancedToRound: params.roundId },
        {
          $set: {
            advancedToRound: null,
            advancedToRoundNumber: null,
            advancedAt: null,
          },
        }
      ),
      RoundParticipant.deleteMany({ round: params.roundId }),
      EventNotice.deleteMany({ round: params.roundId }),
      EventRound.deleteOne({ _id: params.roundId }),
    ]);

    const remainingRoundCount = await EventRound.countDocuments({ event: params.id });

    const nextEventState = {
      resultsPublished: false,
      publicResultsEnabled: false,
    };
    if (remainingRoundCount === 0) {
      nextEventState.lifecycleStatus = "ACTIVE";
    }

    await Promise.all([
      Achievement.deleteMany({ event: params.id }),
      Event.updateOne(
        { _id: params.id },
        {
          $set: nextEventState,
        }
      ),
    ]);

    return NextResponse.json({ message: "Round deleted" });
  } catch (error) {
    console.error("Delete Event Round Error:", error);
    return NextResponse.json(
      { message: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}
