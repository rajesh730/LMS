import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import Event from "@/models/Event";
import EventSchoolInvitation from "@/models/EventSchoolInvitation";
import ParticipationRequest from "@/models/ParticipationRequest";
import { canManageEventRecord } from "@/lib/authz";
import { getEventDeletionPolicy } from "@/lib/eventDeletion";
import { ensureStudentEventNotification } from "@/lib/studentEventNotifications";
import { recordLifecycleAudit } from "@/lib/lifecycle";
import { publishEventRealtimeUpdate } from "@/lib/eventRealtime";
import { publishWorkIndicatorsUpdate } from "@/lib/workIndicatorRealtime";

const ACTIVE_STATUSES = ["PENDING", "APPROVED", "ENROLLED"];

export const dynamic = "force-dynamic";

/**
 * POST /api/events/[id]/cancel
 * Stops an event that should not proceed (mistake, duplicate, aborted run).
 * Marks it CANCELLED, withdraws every registration + invitation, and notifies
 * the affected schools' students — instead of silently removing the event.
 */
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
    const eventId = params.id;
    const body = await req.json().catch(() => ({}));
    const reason = String(body.reason || "").trim();

    await connectDB();

    const event = await Event.findById(eventId);
    if (!event) {
      return NextResponse.json({ message: "Event not found" }, { status: 404 });
    }

    if (!canManageEventRecord(session, event)) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const policy = getEventDeletionPolicy(event);
    if (!policy.canCancel) {
      return NextResponse.json(
        { message: policy.cancelBlockedReason || "This event cannot be cancelled." },
        { status: 400 }
      );
    }

    // Collect every school that should be told the event is off: anyone with an
    // active registration, plus (for platform events) every school that joined.
    const activeRequests = await ParticipationRequest.find({
      event: eventId,
      status: { $in: ACTIVE_STATUSES },
    })
      .select("school")
      .lean();

    const affectedSchoolIds = new Set(
      activeRequests.map((request) => String(request.school)).filter(Boolean)
    );

    if (event.eventScope === "PLATFORM") {
      const approvedInvites = await EventSchoolInvitation.find({
        event: eventId,
        status: "APPROVED",
      })
        .select("school")
        .lean();
      approvedInvites.forEach((invite) =>
        affectedSchoolIds.add(String(invite.school))
      );
    } else if (event.school) {
      affectedSchoolIds.add(String(event.school));
    }

    // Withdraw all active registrations.
    await ParticipationRequest.updateMany(
      { event: eventId, status: { $in: ACTIVE_STATUSES } },
      { $set: { status: "WITHDRAWN", studentNotifiedAt: new Date() } }
    );

    // Withdraw any open school invitations (platform events).
    if (event.eventScope === "PLATFORM") {
      await EventSchoolInvitation.updateMany(
        {
          event: eventId,
          status: { $in: ["PENDING", "APPROVED", "DISAPPROVED"] },
        },
        {
          $set: {
            status: "WITHDRAWN",
            reason: reason
              ? `Event cancelled: ${reason}`
              : "This event has been cancelled.",
          },
        }
      );
    }

    const before = {
      lifecycleStatus: event.lifecycleStatus,
      eventWorkflowStatus: event.eventWorkflowStatus,
    };

    // Persist via a direct $set update (validators off) so the CANCELLED
    // lifecycle/workflow values save reliably even if a long-running process
    // cached an older enum. The in-memory doc is also updated for the
    // notifications/realtime payloads below.
    event.participants = [];
    event.lifecycleStatus = "CANCELLED";
    event.eventWorkflowStatus = "CANCELLED";
    await Event.updateOne(
      { _id: event._id },
      {
        $set: {
          participants: [],
          lifecycleStatus: "CANCELLED",
          eventWorkflowStatus: "CANCELLED",
        },
      }
    );

    // Tell each affected school's students the event is cancelled.
    const noticeTitle = `Event cancelled: ${event.title}`;
    const noticeContent = reason
      ? `"${event.title}" has been cancelled. Reason: ${reason}. Any registration for it has been withdrawn.`
      : `"${event.title}" has been cancelled. Any registration for it has been withdrawn.`;

    await Promise.all(
      Array.from(affectedSchoolIds).map((schoolId) =>
        ensureStudentEventNotification({
          event,
          schoolId,
          authorId: session.user.id,
          title: noticeTitle,
          content: noticeContent,
        }).catch((noticeError) => {
          console.error("Cancel Event Notice Error:", noticeError);
          return null;
        })
      )
    );

    await recordLifecycleAudit({
      entityType: "Event",
      entityId: event._id,
      action: "CANCELLED",
      session,
      reason,
      before,
      after: {
        lifecycleStatus: event.lifecycleStatus,
        eventWorkflowStatus: event.eventWorkflowStatus,
      },
    });

    publishEventRealtimeUpdate("event-cancelled", {
      event,
      eventScope: event.eventScope,
      schoolId: event.school || null,
    });
    affectedSchoolIds.forEach((schoolId) => {
      publishWorkIndicatorsUpdate("event-cancelled", {
        schoolId,
        eventId: String(eventId),
      });
    });

    return NextResponse.json(
      {
        message: "Event cancelled. Registered schools and students were notified.",
        notifiedSchools: affectedSchoolIds.size,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Cancel Event Error:", error);
    return NextResponse.json(
      { message: "Error cancelling event: " + error.message },
      { status: 500 }
    );
  }
}
