import Student from "@/models/Student";
import Notice from "@/models/Notice";
import Event from "@/models/Event";
import EventNotice from "@/models/EventNotice";
import UserNotification from "@/models/UserNotification";
import UserSurfaceSeenState from "@/models/UserSurfaceSeenState";
import { getEquivalentGradeValues } from "@/lib/schoolGrades";

export function buildStudentLookup(session) {
  return {
    isDeleted: { $ne: true },
    status: "ACTIVE",
    $or: [
      { _id: session.user.id },
      { userId: session.user.id },
      { email: session.user.email },
      { username: session.user.email },
    ],
  };
}

export function matchesStudentGradeFilter(notice, eligibleGradeValues) {
  const noticeGrades = Array.isArray(notice?.grades)
    ? notice.grades.map((grade) => String(grade || "").trim()).filter(Boolean)
    : [];

  if (noticeGrades.length === 0) {
    return true;
  }

  return noticeGrades.some((grade) => eligibleGradeValues.includes(grade));
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
    { user: session.user.id, surface: "student.notifications" },
    {
      $setOnInsert: {
        user: session.user.id,
        role: session.user.role,
        surface: "student.notifications",
        seenAt: now,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean();

  return state?.seenAt || now;
}

function isReadForUser(item, session, userType, unreadAfter) {
  if (hasReadEntry(item.readBy, session.user.id, userType)) {
    return true;
  }

  const publishedAt = new Date(item.publishedAt || item.createdAt || 0).getTime();
  const baselineAt = new Date(unreadAfter || 0).getTime();
  return Number.isFinite(publishedAt) && publishedAt <= baselineAt;
}

export async function getStudentNotificationPayload(session, limit = 20) {
  const student = await Student.findOne(buildStudentLookup(session))
    .select("grade school")
    .lean();

  if (!student) {
    return { error: { message: "Student profile not found", status: 404 } };
  }

  const eligibleGradeValues = getEquivalentGradeValues(student.grade);

  const [unreadAfter, schoolNotices, schoolEvents, userNotifications] = await Promise.all([
    getNotificationUnreadBaseline(session),
    Notice.find({
      scope: "SCHOOL",
      school: student.school,
      status: "PUBLISHED",
      isActive: true,
      isDeleted: { $ne: true },
      "targetAudience.students": true,
      $or: [{ expiryDate: null }, { expiryDate: { $gte: new Date() } }],
    })
      .select("title content type event grades publishedAt createdAt readBy")
      .sort({ publishedAt: -1, createdAt: -1 })
      .limit(Math.max(limit, 50))
      .lean(),
    Event.find({
      eventScope: "SCHOOL",
      school: student.school,
    })
      .select("_id title")
      .lean(),
    UserNotification.find({
      targetRole: "STUDENT",
      recipientStudent: student._id,
      school: student.school,
      isDeleted: { $ne: true },
    })
      .select("title message href category publishedAt createdAt readBy metadata")
      .sort({ publishedAt: -1, createdAt: -1 })
      .limit(Math.max(limit, 50))
      .lean(),
  ]);

  const schoolEventIds = schoolEvents.map((event) => event._id);
  const eventTitleMap = new Map(
    schoolEvents.map((event) => [String(event._id), event.title || "Event"])
  );

  const schoolNotifications = schoolNotices
    .filter(
      (notice) => notice.event || matchesStudentGradeFilter(notice, eligibleGradeValues)
    )
    .map((notice) => {
      const eventId = notice.event ? String(notice.event) : "";
      return {
        id: String(notice._id),
        noticeType: eventId ? "EVENT" : "SCHOOL",
        storageType: "NOTICE",
        title: notice.title,
        message: notice.content || "",
        publishedAt: notice.publishedAt || notice.createdAt,
        event: eventId
          ? {
              id: eventId,
              title: eventTitleMap.get(eventId) || notice.title || "Event",
            }
          : null,
        href: eventId ? `/events/${eventId}` : "/student/notices",
        isRead: isReadForUser(notice, session, "STUDENT", unreadAfter),
      };
    });

  const personalNotifications = userNotifications.map((notification) => ({
    id: String(notification._id),
    noticeType: notification.category || "MAGAZINE",
    storageType: "USER_NOTIFICATION",
    title: notification.title,
    message: notification.message || "",
    publishedAt: notification.publishedAt || notification.createdAt,
    event: null,
    href: notification.href || "/student/notices",
    isRead: isReadForUser(notification, session, "STUDENT", unreadAfter),
  }));

  let eventNotifications = [];
  if (schoolEventIds.length > 0) {
    const eventNotices = await EventNotice.find({
      event: { $in: schoolEventIds },
      round: null,
      status: "PUBLISHED",
      visibility: "PUBLIC",
      isDeleted: { $ne: true },
    })
      .select("event title message publishedAt createdAt readBy")
      .sort({ publishedAt: -1, createdAt: -1 })
      .limit(Math.max(limit, 50))
      .lean();

    eventNotifications = eventNotices.map((notice) => ({
      id: String(notice._id),
      noticeType: "EVENT",
      storageType: "EVENT_NOTICE",
      title: notice.title,
      message: notice.message || "",
      publishedAt: notice.publishedAt || notice.createdAt,
      event: {
        id: String(notice.event),
        title: eventTitleMap.get(String(notice.event)) || "Event",
      },
      href: `/events/${String(notice.event)}`,
      isRead: isReadForUser(notice, session, "STUDENT", unreadAfter),
    }));
  }

  const notifications = [
    ...personalNotifications,
    ...schoolNotifications,
    ...eventNotifications,
  ]
    .sort(
      (a, b) =>
        new Date(b.publishedAt || 0).getTime() -
        new Date(a.publishedAt || 0).getTime()
    )
    .slice(0, limit);

  return {
    notifications,
    unreadCount: notifications.filter((notification) => !notification.isRead)
      .length,
    student,
    schoolEventIds: schoolEventIds.map(String),
  };
}
