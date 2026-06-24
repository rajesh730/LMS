import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import Event from "@/models/Event";
import EventSchoolInvitation from "@/models/EventSchoolInvitation";
import ParticipationRequest from "@/models/ParticipationRequest";
import { ensureSchoolInvitationForEvent } from "@/lib/eventInvitations";
import { isAfterEndOfDay, isBeforeToday } from "@/lib/eventDates";
import { buildInvitationLifecycle, recordLifecycleAudit } from "@/lib/lifecycle";
import { publishWorkIndicatorsUpdate } from "@/lib/workIndicatorRealtime";
import { publishEventRealtimeUpdate } from "@/lib/eventRealtime";
import { ensureStudentEventNotification } from "@/lib/studentEventNotifications";

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

    const invitationObject =
      typeof invitation.toObject === "function" ? invitation.toObject() : invitation;

    return NextResponse.json(
      {
        invitation: {
          ...invitationObject,
          lifecycle: buildInvitationLifecycle(invitationObject),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Fetch School Invitation Error:", error);
    return NextResponse.json(
      { message: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}

// Toggle the per-school "let students register themselves" setting for a
// PLATFORM event. Only an approved school may enable it; disabling keeps any
// existing student self-registrations and simply blocks new ones.
export async function PATCH(req, props) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "SCHOOL_ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const params = await props.params;
    const body = await req.json().catch(() => ({}));
    const enabled = Boolean(body.studentSelfRegistration);

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

    if (enabled && invitation.status !== "APPROVED") {
      return NextResponse.json(
        {
          message:
            "Approve this event for your school before letting students register themselves.",
        },
        { status: 400 }
      );
    }

    invitation.studentSelfRegistration = enabled;
    await invitation.save();

    const event = await Event.findById(params.id).select(
      "title eventScope lifecycleStatus status"
    );

    publishEventRealtimeUpdate("school-event-invitation-updated", {
      event,
      eventId: params.id,
      schoolId: session.user.id,
      eventScope: event?.eventScope,
      status: invitation.status,
    });

    return NextResponse.json(
      {
        message: enabled
          ? "Students at your school can now register themselves for this event."
          : "Student self-registration turned off. Students already registered stay registered.",
        studentSelfRegistration: invitation.studentSelfRegistration,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Toggle Student Self-Registration Error:", error);
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

    const event = await Event.findById(params.id).select(
      "title date registrationDeadline eligibleGrades eventScope lifecycleStatus status"
    );
    if (!event) {
      return NextResponse.json({ message: "Event not found" }, { status: 404 });
    }

    const isEventPassed = isBeforeToday(event.date);
    const isRegistrationClosed = event.registrationDeadline
      ? isAfterEndOfDay(event.registrationDeadline)
      : false;

    if (action === "approve" && (isEventPassed || isRegistrationClosed)) {
      return NextResponse.json(
        {
          message:
            "This event can no longer be approved because the event date or registration deadline has passed.",
        },
        { status: 400 }
      );
    }

    let withdrawnCount = 0;
    if (action !== "approve") {
      const activeParticipationCount = await ParticipationRequest.countDocuments({
        event: params.id,
        school: session.user.id,
        status: { $in: ["PENDING", "APPROVED", "ENROLLED", "REJECTED"] },
      });

      if (activeParticipationCount > 0 && (isEventPassed || isRegistrationClosed)) {
        return NextResponse.json(
          {
            message:
              "Registration is closed, so this school team can no longer be withdrawn by changing the school decision.",
          },
          { status: 400 }
        );
      }

      if (activeParticipationCount > 0) {
        const result = await ParticipationRequest.deleteMany({
          event: params.id,
          school: session.user.id,
          status: { $in: ["PENDING", "APPROVED", "ENROLLED", "REJECTED"] },
        });
        withdrawnCount = result.deletedCount || 0;

        await Event.updateOne(
          { _id: params.id },
          { $pull: { participants: { school: session.user.id } } }
        );
      }
    }

    const now = new Date();
    const before = {
      status: invitation.status,
      decisionAt: invitation.decisionAt,
      reason: invitation.reason,
    };
    invitation.status = action === "approve" ? "APPROVED" : "DISAPPROVED";
    invitation.readAt = invitation.readAt || now;
    invitation.decisionAt = now;
    invitation.decisionBy = session.user.id;
    invitation.reason = body.reason || "";

    await invitation.save();
    await recordLifecycleAudit({
      entityType: "EventSchoolInvitation",
      entityId: invitation._id,
      action: invitation.status,
      session,
      reason: invitation.reason,
      before,
      after: {
        status: invitation.status,
        decisionAt: invitation.decisionAt,
        reason: invitation.reason,
      },
    });

    publishWorkIndicatorsUpdate("school-event-invitation-updated", {
      schoolId: String(session.user.id),
      eventId: String(params.id),
      status: invitation.status,
    });

    if (invitation.status === "APPROVED") {
      try {
        await ensureStudentEventNotification({
          event,
          schoolId: session.user.id,
          authorId: session.user.id,
          title: `New platform competition: ${event.title}`,
          content:
            "Your school has approved a platform competition. Open Student Events to view the details and follow updates.",
        });
      } catch (noticeError) {
        console.error("Create Platform Event Student Notice Error:", noticeError);
      }
    }

    publishEventRealtimeUpdate("school-event-invitation-updated", {
      event,
      eventId: params.id,
      schoolId: session.user.id,
      eventScope: event.eventScope,
      status: invitation.status,
    });

    const populatedInvitation = await EventSchoolInvitation.findById(
      invitation._id
    )
      .populate({
        path: "event",
        select:
          "title description date eventType visibility registrationDeadline maxParticipants maxParticipantsPerSchool participationFormat minTeamSize maxTeamSize eligibleGrades eventScope lifecycleStatus status",
      })
      .lean();

    const invitationWithLifecycle = {
      ...populatedInvitation,
      lifecycle: buildInvitationLifecycle(populatedInvitation),
    };

    return NextResponse.json(
      {
        message:
          invitation.status === "APPROVED"
            ? "Event approved for your school"
            : withdrawnCount > 0
            ? `Event disapproved for your school and ${withdrawnCount} team registration${withdrawnCount === 1 ? "" : "s"} withdrawn.`
            : "Event disapproved for your school",
        invitation: invitationWithLifecycle,
        withdrawnCount,
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
