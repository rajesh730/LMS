import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/db";
import EventNotice from "@/models/EventNotice";
import { getManageableEventOrResponse } from "@/lib/eventRoundAccess";
import { publishRealtimeEvent } from "@/lib/realtimeBus";

const NOTICE_TYPES = [
  "GENERAL",
  "REGISTRATION",
  "ROUND_INSTRUCTIONS",
  "SCHEDULE_UPDATE",
  "SHORTLIST",
  "POSTPONEMENT",
  "CANCELLATION",
  "FINAL_RESULT",
];

function cleanNoticePayload(body) {
  const payload = {};

  if (body.title !== undefined) payload.title = String(body.title).trim();
  if (body.message !== undefined) payload.message = String(body.message).trim();
  if (body.type !== undefined && NOTICE_TYPES.includes(body.type)) {
    payload.type = body.type;
  }
  if (body.visibility !== undefined) {
    payload.visibility = "PUBLIC";
  }
  if (body.status !== undefined) {
    payload.status = body.status === "PUBLISHED" ? "PUBLISHED" : "DRAFT";
    if (payload.status === "PUBLISHED") {
      payload.visibility = "PUBLIC";
      payload.targetAudience = "PUBLIC";
      payload.publishedAt = new Date();
    } else {
      payload.visibility = "PUBLIC";
      payload.targetAudience = "PUBLIC";
      payload.publishedAt = null;
    }
  }
  if (payload.targetAudience === undefined) {
    payload.visibility = "PUBLIC";
    payload.targetAudience = "PUBLIC";
  }

  return payload;
}

async function requireAccess(props, session) {
  const params = await props.params;
  const access = await getManageableEventOrResponse(params.id, session);
  if (access.error) {
    return {
      params,
      response: NextResponse.json(
        { message: access.error.message },
        { status: access.error.status }
      ),
    };
  }

  return { params };
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
    const access = await requireAccess(props, session);
    if (access.response) return access.response;

    const notice = await EventNotice.findOne({
      _id: access.params.noticeId,
      event: access.params.id,
      round: null,
      isDeleted: { $ne: true },
    });
    if (!notice) {
      return NextResponse.json({ message: "Notice not found" }, { status: 404 });
    }

    const payload = cleanNoticePayload(await req.json());
    if (payload.title !== undefined && !payload.title) {
      return NextResponse.json(
        { message: "Notice title is required" },
        { status: 400 }
      );
    }
    if (payload.message !== undefined && !payload.message) {
      return NextResponse.json(
        { message: "Notice message is required" },
        { status: 400 }
      );
    }

    Object.assign(notice, payload);
    await notice.save();

    publishRealtimeEvent("student-notifications", {
      kind: notice.status === "PUBLISHED" ? "event-notice-updated" : "event-notice-removed",
      eventId: access.params.id,
    });
    publishRealtimeEvent("school-notifications", {
      kind: notice.status === "PUBLISHED" ? "event-notice-updated" : "event-notice-removed",
      eventId: access.params.id,
    });
    publishRealtimeEvent(`event-${access.params.id}-notices`, {
      kind: notice.status === "PUBLISHED" ? "event-notice-updated" : "event-notice-removed",
      eventId: access.params.id,
    });

    return NextResponse.json({ message: "Notice updated", notice });
  } catch (error) {
    console.error("Update Event Notice Error:", error);
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
    const access = await requireAccess(props, session);
    if (access.response) return access.response;

    const notice = await EventNotice.findOne({
      _id: access.params.noticeId,
      event: access.params.id,
      round: null,
      isDeleted: { $ne: true },
    });

    if (!notice) {
      return NextResponse.json({ message: "Notice not found" }, { status: 404 });
    }

    notice.isDeleted = true;
    notice.deletedAt = new Date();
    notice.deletedBy = session.user.id;
    notice.status = "UNPUBLISHED";
    await notice.save();

    publishRealtimeEvent("student-notifications", {
      kind: "event-notice-removed",
      eventId: access.params.id,
    });
    publishRealtimeEvent("school-notifications", {
      kind: "event-notice-removed",
      eventId: access.params.id,
    });
    publishRealtimeEvent(`event-${access.params.id}-notices`, {
      kind: "event-notice-removed",
      eventId: access.params.id,
    });

    return NextResponse.json({ message: "Notice archived" });
  } catch (error) {
    console.error("Delete Event Notice Error:", error);
    return NextResponse.json(
      { message: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}
