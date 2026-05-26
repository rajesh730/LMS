import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import Event from "@/models/Event";
import { canManageEventRecord } from "@/lib/authz";
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

    event.lifecycleStatus = "ARCHIVED";
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
