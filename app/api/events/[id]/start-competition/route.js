import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/db";
import Event from "@/models/Event";
import ParticipationRequest from "@/models/ParticipationRequest";
import { syncApprovedRequestsToRoundOne } from "@/lib/competitionFlow";
import { getEventStartState } from "@/lib/eventStartRules";

function canManageEvent(session, event) {
  if (!session?.user || !event) return false;
  if (session.user.role === "SUPER_ADMIN") return true;

  if (session.user.role === "SCHOOL_ADMIN") {
    const schoolId = session.user.schoolId || session.user.id;
    return (
      event.eventScope === "SCHOOL" &&
      event.school &&
      String(event.school) === String(schoolId)
    );
  }

  return false;
}

export async function POST(req, props) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["SUPER_ADMIN", "SCHOOL_ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const params = await props.params;
    const event = await Event.findById(params.id);
    if (!event) {
      return NextResponse.json({ message: "Event not found" }, { status: 404 });
    }
    if (!canManageEvent(session, event)) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const approvedRequests = await ParticipationRequest.find({
      event: params.id,
      status: { $in: ["APPROVED", "ENROLLED"] },
    })
      .select("school teamName status")
      .lean();
    const startState = getEventStartState(event, approvedRequests);
    if (!startState.canStart) {
      return NextResponse.json(
        {
          message: startState.reason || "This event cannot be started yet.",
          entryCount: startState.entryCount,
          unitLabel: startState.unitLabel,
        },
        { status: 400 }
      );
    }

    const syncResult = await syncApprovedRequestsToRoundOne({
      eventId: params.id,
      createdBy: session.user.id,
    });

    if (!syncResult.round) {
      return NextResponse.json(
        { message: "No approved participants are ready for competition." },
        { status: 400 }
      );
    }

    event.eventWorkflowStatus = "ROUND_ACTIVE";
    await event.save();

    return NextResponse.json({
      message: syncResult.createdRound
        ? "Round 1 created and approved participants were added automatically"
        : "Approved participants are already synced to Round 1",
      roundId: syncResult.round._id,
      roundTitle: syncResult.round.title,
      createdParticipants: syncResult.createdParticipants,
      existingParticipants: syncResult.existingParticipants,
    });
  } catch (error) {
    console.error("Start Competition Error:", error);
    return NextResponse.json(
      { message: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}
