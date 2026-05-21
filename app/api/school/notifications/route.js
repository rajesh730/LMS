import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import Notice from "@/models/Notice";
import EventNotice from "@/models/EventNotice";
import EventSchoolInvitation from "@/models/EventSchoolInvitation";
import Event from "@/models/Event";
import ParticipationRequest from "@/models/ParticipationRequest";

function getSchoolIds(session) {
  return Array.from(
    new Set(
      [session?.user?.schoolId, session?.user?.id]
        .filter(Boolean)
        .map((value) => String(value))
    )
  );
}

function toNotification(item, options = {}) {
  return {
    id: String(item._id),
    noticeType: options.noticeType,
    title: item.title,
    message: item.message || item.content || "",
    publishedAt: item.publishedAt || item.createdAt,
    event: item.event
      ? {
          id: String(item.event._id || item.event),
          title: item.event.title || "Event",
          scope: item.event.eventScope || null,
        }
      : null,
    href:
      options.noticeType === "EVENT" && item.event?._id
        ? `/events/${item.event._id}`
        : "/school/dashboard?tab=notices",
  };
}

async function getSchoolRelevantEventIds(schoolIds) {
  const [invitations, schoolOwnedEvents, participationRequests] = await Promise.all([
    EventSchoolInvitation.find({
      school: { $in: schoolIds },
      status: { $ne: "WITHDRAWN" },
    })
      .select("event")
      .lean(),
    Event.find({
      eventScope: "SCHOOL",
      school: { $in: schoolIds },
      lifecycleStatus: { $ne: "ARCHIVED" },
    })
      .select("_id")
      .lean(),
    ParticipationRequest.find({
      school: { $in: schoolIds },
      status: { $in: ["PENDING", "APPROVED", "ENROLLED"] },
    })
      .select("event")
      .lean(),
  ]);

  const eventIds = new Set();
  invitations.forEach((invitation) => {
    if (invitation.event) eventIds.add(String(invitation.event));
  });
  schoolOwnedEvents.forEach((event) => {
    if (event._id) eventIds.add(String(event._id));
  });
  participationRequests.forEach((request) => {
    if (request.event) eventIds.add(String(request.event));
  });

  return Array.from(eventIds);
}

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "SCHOOL_ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const schoolIds = getSchoolIds(session);
    const { searchParams } = new URL(request.url);
    const requestedLimit = Number.parseInt(searchParams.get("limit") || "20", 10);
    const limit = Number.isFinite(requestedLimit)
      ? Math.max(1, Math.min(requestedLimit, 100))
      : 20;

    const [eventIds, platformNotices] = await Promise.all([
      getSchoolRelevantEventIds(schoolIds),
      Notice.find({
        scope: "PLATFORM",
        status: "PUBLISHED",
        isActive: true,
        $or: [{ expiryDate: null }, { expiryDate: { $gte: new Date() } }],
      })
        .select("title content publishedAt createdAt")
        .sort({ publishedAt: -1, createdAt: -1 })
        .limit(12)
        .lean(),
    ]);

    const eventNotices = await EventNotice.find({
      event: { $in: eventIds },
      round: null,
      status: "PUBLISHED",
      visibility: "PUBLIC",
      isDeleted: { $ne: true },
    })
      .populate("event", "title eventScope")
      .select("event title message publishedAt createdAt")
      .sort({ publishedAt: -1, createdAt: -1 })
      .limit(18)
      .lean();

    const notifications = [
      ...eventNotices.map((notice) =>
        toNotification(notice, { noticeType: "EVENT" })
      ),
      ...platformNotices.map((notice) =>
        toNotification(notice, { noticeType: "GENERAL" })
      ),
    ]
      .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
      .slice(0, limit);

    return NextResponse.json({ notifications });
  } catch (error) {
    console.error("GET /api/school/notifications error:", error);
    return NextResponse.json(
      { message: "Failed to load notifications" },
      { status: 500 }
    );
  }
}
