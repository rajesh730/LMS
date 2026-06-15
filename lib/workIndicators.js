import User from "@/models/User";
import Student from "@/models/Student";
import Notice from "@/models/Notice";
import EventNotice from "@/models/EventNotice";
import Event from "@/models/Event";
import EventSchoolInvitation from "@/models/EventSchoolInvitation";
import ParticipationRequest from "@/models/ParticipationRequest";
import SchoolMagazineArticle from "@/models/SchoolMagazineArticle";
import MagazineIssue from "@/models/MagazineIssue";
import UserSurfaceSeenState from "@/models/UserSurfaceSeenState";
import Feedback from "@/models/Feedback";
import { getSchoolNotificationPayload } from "@/lib/schoolNotifications";
import { getStudentNotificationPayload } from "@/lib/studentNotifications";
import SchoolPromotion from "@/models/SchoolPromotion";

function emptyIndicatorMap() {
  return {};
}

function normalizeCount(value) {
  return Math.max(0, Number(value) || 0);
}

function addIndicator(indicators, key, count, meta = {}) {
  const normalizedCount = normalizeCount(count);
  indicators[key] = {
    count: normalizedCount,
    tone: meta.tone || "action",
    label: meta.label || String(normalizedCount),
  };
}

function schoolIdsForSession(session) {
  return Array.from(
    new Set(
      [session?.user?.id, session?.user?.schoolId]
        .filter(Boolean)
        .map((value) => String(value))
    )
  );
}

function buildStudentLookup(session) {
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

async function getSuperAdminIndicators() {
  const indicators = emptyIndicatorMap();

  const [
    pendingSchools,
    pendingEvents,
    newFeedback,
    pendingPromotions,
  ] = await Promise.all([
    User.countDocuments({ role: "SCHOOL_ADMIN", status: "PENDING" }),
    Event.countDocuments({ status: "PENDING", lifecycleStatus: { $ne: "ARCHIVED" } }),
    Feedback.countDocuments({ status: "NEW" }),
    SchoolPromotion.countDocuments({
      status: { $in: ["PENDING", "DRAFT", "ACTIVE"] },
      paymentStatus: "PENDING",
    }),
  ]);

  addIndicator(indicators, "admin.approvals", pendingSchools);
  addIndicator(indicators, "admin.events", pendingEvents);
  addIndicator(indicators, "admin.feedback", newFeedback);
  addIndicator(indicators, "admin.spotlight", pendingPromotions);

  return indicators;
}

async function getSchoolAdminIndicators(session) {
  const indicators = emptyIndicatorMap();
  const schoolIds = schoolIdsForSession(session);
  const [schoolNotifications, platformEventsSeenState] = await Promise.all([
    getSchoolNotificationPayload(session, 100),
    UserSurfaceSeenState.findOne({
      user: session.user.id,
      surface: "school.platformEvents",
    }).lean(),
  ]);

  const indicatorBaselineAt = new Date();
  const platformEventsSeenAt =
    platformEventsSeenState?.seenAt || indicatorBaselineAt;

  if (!platformEventsSeenState) {
    await UserSurfaceSeenState.updateOne(
      { user: session.user.id, surface: "school.platformEvents" },
      {
        $setOnInsert: {
          user: session.user.id,
          role: session.user.role,
          surface: "school.platformEvents",
          seenAt: indicatorBaselineAt,
        },
      },
      { upsert: true }
    );
  }

  const [
    magazineReview,
    newPlatformInvitations,
    pendingParticipationRequests,
    activeSchoolEvents,
  ] = await Promise.all([
    SchoolMagazineArticle.countDocuments({
      school: { $in: schoolIds },
      status: "SUBMITTED",
      isDeleted: { $ne: true },
    }),
    EventSchoolInvitation.countDocuments({
      school: { $in: schoolIds },
      status: { $ne: "WITHDRAWN" },
      $or: [
        { notifiedAt: { $gt: platformEventsSeenAt } },
        { createdAt: { $gt: platformEventsSeenAt } },
      ],
    }),
    ParticipationRequest.countDocuments({
      school: { $in: schoolIds },
      status: "PENDING",
    }),
    Event.countDocuments({
      eventScope: "SCHOOL",
      school: { $in: schoolIds },
      lifecycleStatus: { $nin: ["ARCHIVED", "COMPLETED"] },
    }),
  ]);

  addIndicator(indicators, "school.receivedNotices", schoolNotifications.unreadCount, {
    tone: "new",
  });
  addIndicator(indicators, "school.magazine", magazineReview);
  addIndicator(indicators, "school.platformEvents", newPlatformInvitations, {
    tone: "new",
  });
  addIndicator(
    indicators,
    "school.schoolEvents",
    pendingParticipationRequests + activeSchoolEvents
  );
  return indicators;
}

async function getStudentIndicators(session) {
  const indicators = emptyIndicatorMap();
  const student = await Student.findOne(buildStudentLookup(session))
    .select("_id school grade")
    .lean();

  if (!student) return indicators;

  const [studentNotifications, seenStates] = await Promise.all([
    getStudentNotificationPayload(session, 100),
    UserSurfaceSeenState.find({
      user: session.user.id,
      surface: { $in: ["student.schoolWall", "student.schoolMagazine"] },
    }).lean(),
  ]);

  const trackedStudentSurfaces = ["student.schoolWall", "student.schoolMagazine"];
  const indicatorBaselineAt = new Date();
  const seenBySurface = new Map(
    seenStates.map((state) => [state.surface, state.seenAt])
  );
  const missingSurfaces = trackedStudentSurfaces.filter(
    (surface) => !seenBySurface.has(surface)
  );

  if (missingSurfaces.length > 0) {
    await UserSurfaceSeenState.bulkWrite(
      missingSurfaces.map((surface) => ({
        updateOne: {
          filter: { user: session.user.id, surface },
          update: {
            $setOnInsert: {
              user: session.user.id,
              role: session.user.role,
              surface,
              seenAt: indicatorBaselineAt,
            },
          },
          upsert: true,
        },
      }))
    );
  }

  const schoolWallSeenAt =
    seenBySurface.get("student.schoolWall") || indicatorBaselineAt;
  const schoolMagazineSeenAt =
    seenBySurface.get("student.schoolMagazine") || indicatorBaselineAt;

  const [newSchoolWallPosts, newMagazineIssues] = await Promise.all([
    SchoolMagazineArticle.countDocuments({
      school: student.school,
      status: { $in: ["SUBMITTED", "APPROVED"] },
      showOnSchoolWall: { $ne: false },
      isDeleted: { $ne: true },
      $or: [
        { submittedAt: { $gt: schoolWallSeenAt } },
        { submittedAt: { $exists: false }, createdAt: { $gt: schoolWallSeenAt } },
      ],
    }),
    MagazineIssue.countDocuments({
      school: student.school,
      status: "PUBLISHED",
      publishedAt: { $gt: schoolMagazineSeenAt },
    }),
  ]);

  const unreadNotifications = studentNotifications.notifications.filter(
    (notification) => !notification.isRead
  );
  const unreadEventNotifications = unreadNotifications.filter(
    (notification) => notification.noticeType === "EVENT"
  );
  const unreadNoticeNotifications = unreadNotifications.filter(
    (notification) => notification.noticeType !== "EVENT"
  );

  addIndicator(indicators, "student.notices", unreadNoticeNotifications.length, {
    tone: "new",
  });
  addIndicator(indicators, "student.events", unreadEventNotifications.length, {
    tone: "new",
  });
  addIndicator(indicators, "student.schoolWall", newSchoolWallPosts, {
    tone: "new",
  });
  addIndicator(indicators, "student.schoolMagazine", newMagazineIssues, {
    tone: "new",
  });

  return indicators;
}

export async function getWorkIndicators(session) {
  if (!session?.user?.role) return emptyIndicatorMap();

  if (session.user.role === "SUPER_ADMIN") {
    return getSuperAdminIndicators(session);
  }

  if (session.user.role === "SCHOOL_ADMIN") {
    return getSchoolAdminIndicators(session);
  }

  if (session.user.role === "STUDENT") {
    return getStudentIndicators(session);
  }

  return emptyIndicatorMap();
}
