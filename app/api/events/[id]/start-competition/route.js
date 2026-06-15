import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/db";
import Event from "@/models/Event";
import { syncApprovedRequestsToRoundOne } from "@/lib/competitionFlow";

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
    let body;
    try {
      body = await req.json();
    } catch (error) {
      return NextResponse.json(
        { message: "Invalid JSON in request body" },
        { status: 400 }
      );
    }
    const requestIds = Array.isArray(body.requestIds)
      ? body.requestIds.map(String).filter(Boolean)
      : [];

    const event = await Event.findById(params.id);
    if (!event) {
      return NextResponse.json({ message: "Event not found" }, { status: 404 });
    }
    if (!canManageEvent(session, event)) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const syncResult = await syncApprovedRequestsToRoundOne({
      eventId: params.id,
      createdBy: session.user.id,
      requestIds,
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
