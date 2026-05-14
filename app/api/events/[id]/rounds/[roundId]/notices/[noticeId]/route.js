import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/db";
import EventNotice from "@/models/EventNotice";
import { getManageableEventOrResponse } from "@/lib/eventRoundAccess";

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
const TARGET_AUDIENCES = [
  "REGISTERED_SCHOOLS",
  "SHORTLISTED_SCHOOLS",
  "FINALIST_SCHOOLS",
  "ALL_SCHOOLS",
  "PUBLIC",
];

function cleanNoticePayload(body) {
  const payload = {};
  if (body.title !== undefined) payload.title = String(body.title).trim();
  if (body.message !== undefined) {
    payload.message = String(body.message).trim();
  }
  if (body.type !== undefined && NOTICE_TYPES.includes(body.type)) {
    payload.type = body.type;
  }
  if (
    body.targetAudience !== undefined &&
    TARGET_AUDIENCES.includes(body.targetAudience)
  ) {
    payload.targetAudience = body.targetAudience;
  }
  if (body.visibility !== undefined) {
    payload.visibility = body.visibility === "PUBLIC" ? "PUBLIC" : "PRIVATE";
  }
  if (body.status !== undefined) {
    payload.status = body.status === "PUBLISHED" ? "PUBLISHED" : "DRAFT";
    if (payload.status === "PUBLISHED") {
      payload.visibility = "PUBLIC";
    }
    payload.publishedAt = payload.status === "PUBLISHED" ? new Date() : null;
  }
  return payload;
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
    const params = await props.params;
    const access = await getManageableEventOrResponse(params.id, session);
    if (access.error) {
      return NextResponse.json(
        { message: access.error.message },
        { status: access.error.status }
      );
    }

    const notice = await EventNotice.findOne({
      _id: params.noticeId,
      event: params.id,
      round: params.roundId,
    });
    if (!notice) {
      return NextResponse.json(
        { message: "Notice not found" },
        { status: 404 }
      );
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

    return NextResponse.json({ message: "Notice updated", notice });
  } catch (error) {
    console.error("Update Round Notice Error:", error);
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
    const params = await props.params;
    const access = await getManageableEventOrResponse(params.id, session);
    if (access.error) {
      return NextResponse.json(
        { message: access.error.message },
        { status: access.error.status }
      );
    }

    await EventNotice.deleteOne({
      _id: params.noticeId,
      event: params.id,
      round: params.roundId,
    });

    return NextResponse.json({ message: "Notice deleted" });
  } catch (error) {
    console.error("Delete Round Notice Error:", error);
    return NextResponse.json(
      { message: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}
