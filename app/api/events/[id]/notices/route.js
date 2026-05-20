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

function cleanNoticePayload(body) {
  const status = body.status === "PUBLISHED" ? "PUBLISHED" : "DRAFT";

  return {
    title: String(body.title || "").trim(),
    message: String(body.message || "").trim(),
    type: NOTICE_TYPES.includes(body.type) ? body.type : "GENERAL",
    status,
    visibility: "PUBLIC",
    targetAudience: "PUBLIC",
  };
}

export async function GET(req, props) {
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

    const notices = await EventNotice.find({
      event: params.id,
      round: null,
    })
      .sort({ publishedAt: -1, createdAt: -1 })
      .lean();

    return NextResponse.json({ notices });
  } catch (error) {
    console.error("List Event Notices Error:", error);
    return NextResponse.json(
      { message: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
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
      round: null,
      createdBy: session.user.id,
    });

    return NextResponse.json(
      { message: "Notice saved", notice },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create Event Notice Error:", error);
    return NextResponse.json(
      { message: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}
