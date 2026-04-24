import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import EventSchoolInvitation from "@/models/EventSchoolInvitation";
import { ensureSchoolInvitationForEvent } from "@/lib/eventInvitations";
import "@/models/Event";
import "@/models/ExternalOrganizer";

export const dynamic = "force-dynamic";

export async function GET(req, props) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "SCHOOL_ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const params = await props.params;
    await connectDB();

    const invitation = await ensureSchoolInvitationForEvent(
      params.id,
      session.user.id
    );

    if (!invitation) {
      return NextResponse.json(
        { message: "Invitation not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ invitation }, { status: 200 });
  } catch (error) {
    console.error("Fetch School Invitation Error:", error);
    return NextResponse.json(
      { message: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(req, props) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "SCHOOL_ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const params = await props.params;
    const body = await req.json();
    const action = String(body.action || "").toLowerCase();

    if (!["approve", "disapprove", "decline"].includes(action)) {
      return NextResponse.json(
        { message: "Action must be approve or disapprove" },
        { status: 400 }
      );
    }

    await connectDB();

    const invitation = await ensureSchoolInvitationForEvent(
      params.id,
      session.user.id
    );

    if (!invitation || invitation.status === "WITHDRAWN") {
      return NextResponse.json(
        { message: "Invitation not found" },
        { status: 404 }
      );
    }

    const now = new Date();
    invitation.status = action === "approve" ? "APPROVED" : "DISAPPROVED";
    invitation.readAt = invitation.readAt || now;
    invitation.decisionAt = now;
    invitation.decisionBy = session.user.id;
    invitation.reason = body.reason || "";

    await invitation.save();

    const populatedInvitation = await EventSchoolInvitation.findById(
      invitation._id
    )
      .populate({
        path: "event",
        select:
          "title description date eventType visibility registrationDeadline maxParticipants maxParticipantsPerSchool eligibleGrades eventScope lifecycleStatus status partnerBrandingEnabled partners targetGroup",
        populate: {
          path: "partners.organizer",
          select:
            "organizationName slug logoUrl website verificationStatus profileVisibility",
        },
      })
      .lean();

    return NextResponse.json(
      {
        message:
          invitation.status === "APPROVED"
            ? "Event approved for your school"
            : "Event disapproved for your school",
        invitation: populatedInvitation,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Update School Invitation Error:", error);
    return NextResponse.json(
      { message: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}
