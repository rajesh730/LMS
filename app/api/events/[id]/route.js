import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import Event from "@/models/Event";

export async function PUT(req, props) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const params = await props.params;
    const id = params.id;
    const {
      title,
      description,
      date,
      targetGroup,
      registrationDeadline,
      maxParticipants,
      maxParticipantsPerSchool,
      eligibleGrades,
    } = await req.json();

    await connectDB();
    const updatedEvent = await Event.findByIdAndUpdate(
      id,
      {
        title,
        description,
        date,
        targetGroup: targetGroup || null,
        registrationDeadline: registrationDeadline || null,
        maxParticipants: maxParticipants || null,
        maxParticipantsPerSchool: maxParticipantsPerSchool || null,
        eligibleGrades: eligibleGrades || [],
      },
      { new: true }
    );

    if (!updatedEvent) {
      return NextResponse.json({ message: "Event not found" }, { status: 404 });
    }

    return NextResponse.json(
      { message: "Event updated", event: updatedEvent },
      { status: 200 }
    );
  } catch (error) {
    console.error("Update Event Error:", error);
    return NextResponse.json(
      { message: "Error updating event" },
      { status: 500 }
    );
  }
}

export async function DELETE(req, props) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Next.js 15: props.params is a Promise
    const params = await props.params;
    const id = params.id;

    console.log(`[DELETE EVENT] Request received for ID: ${id}`);
    console.log(`[DELETE EVENT] Raw Params:`, params);
    console.log(`[DELETE EVENT] User Role: ${session?.user?.role}`);

    await connectDB();

    let deletedEvent;
    try {
      console.log("[DELETE EVENT] Attempting findByIdAndDelete...");
      deletedEvent = await Event.findByIdAndDelete(id);
      console.log(
        "[DELETE EVENT] Result:",
        deletedEvent ? "Deleted" : "Not Found"
      );

      // ===== CASCADE DELETE: Remove related participation requests =====
      if (deletedEvent) {
        const ParticipationRequest = (
          await import("@/models/ParticipationRequest")
        ).default;
        const deleteResult = await ParticipationRequest.deleteMany({
          event: id,
        });
        console.log(
          `[DELETE EVENT] Deleted ${deleteResult.deletedCount} related participation requests`
        );
      }
    } catch (dbError) {
      console.error("[DELETE EVENT] DB Error:", dbError);
      throw dbError;
    }

    if (!deletedEvent) {
      return NextResponse.json({ message: "Event not found" }, { status: 404 });
    }

    return NextResponse.json(
      { message: "Event and related requests deleted" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Delete Event Error:", error);
    return NextResponse.json(
      { message: "Error deleting event: " + error.message },
      { status: 500 }
    );
  }
}
