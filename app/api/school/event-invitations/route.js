import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import Event from "@/models/Event";
import EventSchoolInvitation from "@/models/EventSchoolInvitation";
import EventNotice from "@/models/EventNotice";
import ParticipationRequest from "@/models/ParticipationRequest";
import { ensureSchoolInvitationsForPublishedEvents } from "@/lib/eventInvitations";
import { buildInvitationLifecycle } from "@/lib/lifecycle";
import { buildPagination, escapeRegex, parsePagination } from "@/lib/pagination";
import "@/models/User";

export const dynamic = "force-dynamic";

function getSchoolIds(session) {
  return Array.from(
    new Set(
      [session?.user?.schoolId, session?.user?.id]
        .filter(Boolean)
        .map((value) => String(value))
    )
  );
}

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "SCHOOL_ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const schoolIds = getSchoolIds(session);
    await ensureSchoolInvitationsForPublishedEvents(session.user.id);

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const search = String(searchParams.get("search") || "").trim();
    const { page, limit, skip } = parsePagination(searchParams, {
      limit: 20,
      maxLimit: 100,
    });

    const eventQuery = {
      lifecycleStatus: { $nin: ["COMPLETED", "ARCHIVED"] },
    };
    if (search) {
      const safeSearch = escapeRegex(search);
      eventQuery.$or = [
        { title: { $regex: safeSearch, $options: "i" } },
        { description: { $regex: safeSearch, $options: "i" } },
      ];
    }

    const activeEventIds = (
      await Event.find(eventQuery).select("_id").lean()
    ).map((event) => event._id);

    const baseQuery = {
      school: { $in: schoolIds },
      status: { $ne: "WITHDRAWN" },
      event: { $in: activeEventIds },
    };

    const query = { ...baseQuery };
    if (status && status !== "ALL") {
      query.status = status;
    }

    const [
      totalInvitations,
      pendingCount,
      approvedCount,
      disapprovedCount,
      invitations,
    ] = await Promise.all([
      EventSchoolInvitation.countDocuments(query),
      EventSchoolInvitation.countDocuments({ ...baseQuery, status: "PENDING" }),
      EventSchoolInvitation.countDocuments({ ...baseQuery, status: "APPROVED" }),
      EventSchoolInvitation.countDocuments({
        ...baseQuery,
        status: "DISAPPROVED",
      }),
      EventSchoolInvitation.find(query)
        .sort({ notifiedAt: -1 })
        .populate({
          path: "event",
          select:
            "title description date eventType visibility registrationDeadline maxParticipants maxParticipantsPerSchool participationFormat minTeamSize maxTeamSize eligibleGrades eventScope lifecycleStatus status",
        })
        .populate("decisionBy", "name schoolName email")
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);
    const pagination = buildPagination({
      page,
      limit,
      total: totalInvitations,
    });
    const counts = {
      ALL: pendingCount + approvedCount + disapprovedCount,
      PENDING: pendingCount,
      APPROVED: approvedCount,
      DISAPPROVED: disapprovedCount,
    };

    const eventIds = invitations
      .map((invitation) => invitation.event?._id)
      .filter(Boolean);
    const [participationRequests, eventNotices] = await Promise.all([
      ParticipationRequest.find({
        school: { $in: schoolIds },
        event: { $in: eventIds },
        status: { $in: ["PENDING", "APPROVED", "ENROLLED"] },
      })
        .select("event status student")
        .lean(),
      EventNotice.find({
        event: { $in: eventIds },
        round: null,
        status: "PUBLISHED",
        visibility: "PUBLIC",
        isDeleted: { $ne: true },
      })
        .select("event title message type publishedAt createdAt")
        .sort({ publishedAt: -1, createdAt: -1 })
        .lean(),
    ]);

    const participationByEvent = new Map();
    participationRequests.forEach((request) => {
      const eventId = String(request.event);
      const summary = participationByEvent.get(eventId) || {
        hasParticipation: false,
        participationStatus: null,
        registeredStudentCount: 0,
      };

      summary.hasParticipation = true;
      summary.registeredStudentCount += 1;
      if (request.status === "APPROVED" || request.status === "ENROLLED") {
        summary.participationStatus = request.status;
      } else if (!summary.participationStatus) {
        summary.participationStatus = request.status;
      }
      participationByEvent.set(eventId, summary);
    });

    const latestNoticeByEvent = new Map();
    const noticeCountByEvent = new Map();
    eventNotices.forEach((notice) => {
      const eventId = String(notice.event || "");
      if (!eventId) return;
      noticeCountByEvent.set(eventId, (noticeCountByEvent.get(eventId) || 0) + 1);
      if (!latestNoticeByEvent.has(eventId)) {
        latestNoticeByEvent.set(eventId, {
          _id: notice._id,
          title: notice.title,
          message: notice.message,
          type: notice.type,
          publishedAt: notice.publishedAt || notice.createdAt,
        });
      }
    });

    const invitationsWithParticipation = invitations.map((invitation) => ({
      ...invitation,
      lifecycle: buildInvitationLifecycle(invitation),
      participation: participationByEvent.get(String(invitation.event?._id)) || {
        hasParticipation: false,
        participationStatus: null,
        registeredStudentCount: 0,
      },
      latestEventNotice:
        latestNoticeByEvent.get(String(invitation.event?._id)) || null,
      eventNoticeCount: noticeCountByEvent.get(String(invitation.event?._id)) || 0,
    }));

    return NextResponse.json(
      {
        invitations: invitationsWithParticipation,
        counts,
        pagination: {
          ...pagination,
          totalInvitations,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Fetch School Event Invitations Error:", error);
    return NextResponse.json(
      { message: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}
