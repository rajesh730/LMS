import Student from "@/models/Student";
import Notice from "@/models/Notice";
import Event from "@/models/Event";
import EventNotice from "@/models/EventNotice";
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

export async function getStudentNotificationPayload(session, limit = 20) {
  const student = await Student.findOne(buildStudentLookup(session))
    .select("grade school")
    .lean();

  if (!student) {
    return { error: { message: "Student profile not found", status: 404 } };
  }

  const eligibleGradeValues = getEquivalentGradeValues(student.grade);

  const [schoolNotices, schoolEvents] = await Promise.all([
    Notice.find({
      scope: "SCHOOL",
      school: student.school,
      status: "PUBLISHED",
      isActive: true,
      "targetAudience.students": true,
      $or: [{ expiryDate: null }, { expiryDate: { $gte: new Date() } }],
    })
      .select("title content grades publishedAt createdAt readBy")
      .sort({ publishedAt: -1, createdAt: -1 })
      .limit(Math.max(limit, 50))
      .lean(),
    Event.find({
      eventScope: "SCHOOL",
      school: student.school,
    })
      .select("_id title")
      .lean(),
  ]);

  const schoolNotifications = schoolNotices
    .filter((notice) => matchesStudentGradeFilter(notice, eligibleGradeValues))
    .map((notice) => ({
      id: String(notice._id),
      noticeType: "SCHOOL",
      title: notice.title,
      message: notice.content || "",
      publishedAt: notice.publishedAt || notice.createdAt,
      event: null,
      href: "/student/notices",
      isRead: hasReadEntry(notice.readBy, session.user.id, "STUDENT"),
    }));

  const schoolEventIds = schoolEvents.map((event) => event._id);
  const eventTitleMap = new Map(
    schoolEvents.map((event) => [String(event._id), event.title || "Event"])
  );

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
      title: notice.title,
      message: notice.message || "",
      publishedAt: notice.publishedAt || notice.createdAt,
      event: {
        id: String(notice.event),
        title: eventTitleMap.get(String(notice.event)) || "Event",
      },
      href: `/events/${String(notice.event)}`,
      isRead: hasReadEntry(notice.readBy, session.user.id, "STUDENT"),
    }));
  }

  const notifications = [...schoolNotifications, ...eventNotifications]
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
