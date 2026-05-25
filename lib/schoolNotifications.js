import Notice from "@/models/Notice";
import EventNotice from "@/models/EventNotice";
import EventSchoolInvitation from "@/models/EventSchoolInvitation";
import Event from "@/models/Event";
import ParticipationRequest from "@/models/ParticipationRequest";

export function getSchoolIds(session) {
  return Array.from(
    new Set(
      [session?.user?.schoolId, session?.user?.id]
        .filter(Boolean)
        .map((value) => String(value))
    )
  );
}

function hasReadEntry(readBy, userId, userType) {
  return Array.isArray(readBy)
    ? readBy.some(
        (entry) =>
          String(entry?.user || "") === String(userId) &&
          String(entry?.userType || "") === String(userType)
      )
    : false;
}

function toNotification(item, options = {}, session) {
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
    isRead: hasReadEntry(readByForItem(item), session.user.id, "SCHOOL_ADMIN"),
  };
}

function readByForItem(item) {
  return Array.isArray(item?.readBy) ? item.readBy : [];
}

export async function getSchoolRelevantEventIds(schoolIds) {
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

export async function getSchoolNotificationPayload(session, limit = 20) {
  const schoolIds = getSchoolIds(session);

  const [eventIds, platformNotices] = await Promise.all([
    getSchoolRelevantEventIds(schoolIds),
    Notice.find({
      scope: "PLATFORM",
      status: "PUBLISHED",
      isActive: true,
      $or: [{ expiryDate: null }, { expiryDate: { $gte: new Date() } }],
    })
      .select("title content publishedAt createdAt readBy")
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
    .select("event title message publishedAt createdAt readBy")
    .sort({ publishedAt: -1, createdAt: -1 })
    .limit(18)
    .lean();

  const notifications = [
    ...eventNotices.map((notice) =>
      toNotification(notice, { noticeType: "EVENT" }, session)
    ),
    ...platformNotices.map((notice) =>
      toNotification(notice, { noticeType: "GENERAL" }, session)
    ),
  ]
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
    .slice(0, limit);

  return {
    notifications,
    unreadCount: notifications.filter((notification) => !notification.isRead)
      .length,
    eventIds,
    schoolIds,
  };
}
