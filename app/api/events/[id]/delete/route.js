import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import Event from "@/models/Event";
import Achievement from "@/models/Achievement";
import EventNotice from "@/models/EventNotice";
import EventRound from "@/models/EventRound";
import EventSchoolInvitation from "@/models/EventSchoolInvitation";
import ParticipationRequest from "@/models/ParticipationRequest";
import RoundParticipant from "@/models/RoundParticipant";
import Notice from "@/models/Notice";
import { canManageEventRecord } from "@/lib/authz";
import { getEventDeletionPolicy } from "@/lib/eventDeletion";
import { syncEventSchoolInvitations } from "@/lib/eventInvitations";
import { publishEventRealtimeUpdate } from "@/lib/eventRealtime";

export async function POST(req, props) {
  try {
    const session = await getServerSession(authOptions);
    if (
      !session ||
      !["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER"].includes(session.user.role)
    ) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const params = await props.params;
    const id = params.id;

    await connectDB();

    const event = await Event.findById(id);

    if (!event) {
      return NextResponse.json({ message: "Event not found" }, { status: 404 });
    }

    if (!canManageEventRecord(session, event)) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const archivePolicy = getEventDeletionPolicy(event);
    if (!archivePolicy.canArchive) {
      return NextResponse.json(
        { message: archivePolicy.archiveBlockedReason || "This event cannot be archived." },
        { status: 400 }
      );
    }

    event.lifecycleStatus = "ARCHIVED";
    event.eventWorkflowStatus = "ARCHIVED";
    await event.save();

    if (session.user.role === "SUPER_ADMIN") {
      try {
        await syncEventSchoolInvitations(event._id, {
          createdBy: session.user.id,
        });
      } catch (invitationError) {
        console.error("Archive Event Invitations Error:", invitationError);
      }
    }

    publishEventRealtimeUpdate("event-archived", { event });

    return NextResponse.json(
      { message: "Event archived successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Delete Event Error (POST):", error);
    return NextResponse.json(
      { message: "Error deleting event: " + error.message },
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

    const params = await props.params;

    await connectDB();

    const event = await Event.findById(params.id);
    if (!event) {
      return NextResponse.json({ message: "Event not found" }, { status: 404 });
    }

    if (!canManageEventRecord(session, event)) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const deletePolicy = getEventDeletionPolicy(event);
    if (!deletePolicy.canDelete) {
      return NextResponse.json(
        {
          message:
            deletePolicy.deleteBlockedReason ||
            "Only archived or cancelled events can be permanently deleted.",
        },
        { status: 400 }
      );
    }

    await Promise.all([
      Achievement.deleteMany({ event: event._id }),
      EventNotice.deleteMany({ event: event._id }),
      EventRound.deleteMany({ event: event._id }),
      EventSchoolInvitation.deleteMany({ event: event._id }),
      ParticipationRequest.deleteMany({ event: event._id }),
      RoundParticipant.deleteMany({ event: event._id }),
      // Student-facing EVENT notices reference the event; remove them too so we
      // don't leave notices pointing at a deleted event.
      Notice.deleteMany({ event: event._id }),
    ]);
    await Event.deleteOne({ _id: event._id });

    publishEventRealtimeUpdate("event-deleted", {
      event: {
        _id: event._id,
        eventScope: event.eventScope,
        school: event.school,
      },
    });

    return NextResponse.json(
      { message: "Event permanently deleted" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Permanent Delete Event Error:", error);
    return NextResponse.json(
      { message: "Error permanently deleting event: " + error.message },
      { status: 500 }
    );
  }
}
