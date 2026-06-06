import Notice from "@/models/Notice";
import EventNotice from "@/models/EventNotice";
import EventSchoolInvitation from "@/models/EventSchoolInvitation";
import Event from "@/models/Event";
import ParticipationRequest from "@/models/ParticipationRequest";
import UserNotification from "@/models/UserNotification";
import UserSurfaceSeenState from "@/models/UserSurfaceSeenState";

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

async function getNotificationUnreadBaseline(session) {
  const now = new Date();
  const state = await UserSurfaceSeenState.findOneAndUpdate(
    { user: session.user.id, surface: "school.notifications" },
    {
      $setOnInsert: {
        user: session.user.id,
        role: session.user.role,
        surface: "school.notifications",
        seenAt: now,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean();

  return state?.seenAt || now;
}

function isReadForUser(item, session, userType, unreadAfter) {
  if (hasReadEntry(readByForItem(item), session.user.id, userType)) {
    return true;
  }

  const publishedAt = new Date(item.publishedAt || item.createdAt || 0).getTime();
  const baselineAt = new Date(unreadAfter || 0).getTime();
  return Number.isFinite(publishedAt) && publishedAt <= baselineAt;
}

function toNotification(item, options = {}, session) {
  return {
    id: String(item._id),
    noticeType: options.noticeType,
    storageType: options.noticeType === "EVENT" ? "EVENT_NOTICE" : "NOTICE",
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
    isRead: isReadForUser(
      item,
      session,
      "SCHOOL_ADMIN",
      options.unreadAfter
    ),
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

  const [unreadAfter, eventIds, platformNotices, userNotifications] = await Promise.all([
    getNotificationUnreadBaseline(session),
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
    UserNotification.find({
      targetRole: "SCHOOL_ADMIN",
      school: { $in: schoolIds },
      isDeleted: { $ne: true },
    })
      .select("title message href category publishedAt createdAt readBy metadata")
      .sort({ publishedAt: -1, createdAt: -1 })
      .limit(Math.max(limit, 50))
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
    ...userNotifications.map((notification) => ({
      id: String(notification._id),
      noticeType: notification.category || "MAGAZINE",
      storageType: "USER_NOTIFICATION",
      title: notification.title,
      message: notification.message || "",
      publishedAt: notification.publishedAt || notification.createdAt,
      event: null,
      href: notification.href || "/school/dashboard?tab=notices",
      isRead: isReadForUser(
        notification,
        session,
        "SCHOOL_ADMIN",
        unreadAfter
      ),
    })),
    ...eventNotices.map((notice) =>
      toNotification(notice, { noticeType: "EVENT", unreadAfter }, session)
    ),
    ...platformNotices.map((notice) =>
      toNotification(notice, { noticeType: "GENERAL", unreadAfter }, session)
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
