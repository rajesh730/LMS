import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/db";
import Event from "@/models/Event";
import ParticipationRequest from "@/models/ParticipationRequest";

/**
 * PUT /api/events/[id]/manage/reject
 * Bulk reject participation requests with reasons
 */
export async function PUT(req, { params }) {
  try {
    const session = await getServerSession(authOptions);

    if (
      !session ||
      !["SCHOOL_ADMIN", "SUPER_ADMIN"].includes(session.user.role)
    ) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    await dbConnect();

    const { id: eventId } = params;
    const body = await req.json();
    const { requestIds, reason } = body;

    if (!Array.isArray(requestIds) || requestIds.length === 0) {
      return NextResponse.json(
        { message: "requestIds must be a non-empty array" },
        { status: 400 }
      );
    }

    // Get event
    const event = await Event.findById(eventId);

    if (!event) {
      return NextResponse.json(
        { message: "Event not found" },
        { status: 404 }
      );
    }

    // Update requests
    const result = await ParticipationRequest.updateMany(
      {
        _id: { $in: requestIds },
        event: eventId,
        status: "PENDING",
      },
      {
        $set: {
          status: "REJECTED",
          rejectedAt: new Date(),
          approvedBy: session.user.id,
          rejectionReason: reason || "Rejected by admin",
          studentNotifiedAt: new Date(),
        },
      }
    );

    return NextResponse.json(
      {
        message: `Rejected ${result.modifiedCount} requests`,
        rejectedCount: result.modifiedCount,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error rejecting requests:", error);
    return NextResponse.json(
      { message: "Internal server error", error: error.message },
      { status: 500 }
    );
  }
}
