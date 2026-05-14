import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/db";
import EventRound from "@/models/EventRound";
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
  return {
    title: String(body.title || "").trim(),
    message: String(body.message || "").trim(),
    type: NOTICE_TYPES.includes(body.type) ? body.type : "GENERAL",
    targetAudience: TARGET_AUDIENCES.includes(body.targetAudience)
      ? body.targetAudience
      : "REGISTERED_SCHOOLS",
    visibility:
      body.status === "PUBLISHED" || body.visibility === "PUBLIC"
        ? "PUBLIC"
        : "PRIVATE",
    status: body.status === "PUBLISHED" ? "PUBLISHED" : "DRAFT",
  };
}

export async function POST(req, props) {
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

    const round = await EventRound.findOne({
      _id: params.roundId,
      event: params.id,
    }).lean();
    if (!round) {
      return NextResponse.json({ message: "Round not found" }, { status: 404 });
    }

    const payload = cleanNoticePayload(await req.json());
    if (!payload.title || !payload.message) {
      return NextResponse.json(
        { message: "Notice title and message are required" },
        { status: 400 }
      );
    }

    const notice = await EventNotice.create({
      ...payload,
      event: params.id,
      round: params.roundId,
      createdBy: session.user.id,
    });

    return NextResponse.json(
      { message: "Notice saved", notice },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create Round Notice Error:", error);
    return NextResponse.json(
      { message: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}
