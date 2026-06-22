import User from "@/models/User";
import Student from "@/models/Student";
import Event from "@/models/Event";
import EventSchoolInvitation from "@/models/EventSchoolInvitation";
import ParticipationRequest from "@/models/ParticipationRequest";
import Achievement from "@/models/Achievement";
import SchoolMagazineArticle from "@/models/SchoolMagazineArticle";
import MagazineIssue from "@/models/MagazineIssue";
import UserSurfaceSeenState from "@/models/UserSurfaceSeenState";
import Feedback from "@/models/Feedback";
import { getSchoolNotificationPayload } from "@/lib/schoolNotifications";
import { getStudentNotificationPayload } from "@/lib/studentNotifications";
import { getEventWorkflowStatus } from "@/lib/eventWorkflow";
import SchoolPromotion from "@/models/SchoolPromotion";

// School-event workflow stages that are waiting on the admin to act. Everything
// else (open-and-waiting, rounds running, completed) is not a to-do.
const SCHOOL_EVENT_ACTION_STATUSES = ["REGISTRATION_CLOSED", "RESULTS_DRAFT"];

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
      status: "DRAFT",
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
  const [schoolNotifications, platformEventsSeenState, schoolWallSeenState] =
    await Promise.all([
      getSchoolNotificationPayload(session, 100),
      UserSurfaceSeenState.findOne({
        user: session.user.id,
        surface: "school.platformEvents",
      }).lean(),
      UserSurfaceSeenState.findOne({
        user: session.user.id,
        surface: "school.schoolWall",
      }).lean(),
    ]);

  const indicatorBaselineAt = new Date();
  const platformEventsSeenAt =
    platformEventsSeenState?.seenAt || indicatorBaselineAt;
  const schoolWallSeenAt = schoolWallSeenState?.seenAt || indicatorBaselineAt;

  // Establish a "seen" baseline on first encounter so existing content does not
  // all show up as new (matches the platform-events behaviour).
  const seenBaselineInserts = [];
  if (!platformEventsSeenState) {
    seenBaselineInserts.push(
      UserSurfaceSeenState.updateOne(
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
      )
    );
  }
  if (!schoolWallSeenState) {
    seenBaselineInserts.push(
      UserSurfaceSeenState.updateOne(
        { user: session.user.id, surface: "school.schoolWall" },
        {
          $setOnInsert: {
            user: session.user.id,
            role: session.user.role,
            surface: "school.schoolWall",
            seenAt: indicatorBaselineAt,
          },
        },
        { upsert: true }
      )
    );
  }
  if (seenBaselineInserts.length > 0) {
    await Promise.all(seenBaselineInserts);
  }

  const [
    magazineReview,
    newPlatformInvitations,
    pendingParticipationRequests,
    activeSchoolEvents,
  ] = await Promise.all([
    SchoolMagazineArticle.countDocuments({
      school: { $in: schoolIds },
      status: { $in: ["SUBMITTED", "APPROVED"] },
      isDeleted: { $ne: true },
      submittedAt: { $gt: schoolWallSeenAt },
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
    Event.find({
      eventScope: "SCHOOL",
      school: { $in: schoolIds },
      status: "APPROVED",
      lifecycleStatus: "ACTIVE",
      resultsPublished: { $ne: true },
    })
      .select(
        "eventWorkflowStatus registrationDeadline date status resultsPublished lifecycleStatus"
      )
      .lean(),
  ]);

  // The School Events badge counts only events waiting on the admin (start
  // rounds after registration closes, or publish drafted results) — plus any
  // pending registration approvals — not the total number of active events.
  const schoolEventsNeedingAction = activeSchoolEvents.filter((event) =>
    SCHOOL_EVENT_ACTION_STATUSES.includes(getEventWorkflowStatus(event))
  ).length;

  const schoolEventsTodo = pendingParticipationRequests + schoolEventsNeedingAction;

  addIndicator(indicators, "school.receivedNotices", schoolNotifications.unreadCount, {
    tone: "new",
    label: `${schoolNotifications.unreadCount} unread notice${
      schoolNotifications.unreadCount === 1 ? "" : "s"
    }`,
  });
  addIndicator(indicators, "school.magazine", magazineReview, {
    tone: "new",
    label: `${magazineReview} new student post${
      magazineReview === 1 ? "" : "s"
    } on the school wall`,
  });
  addIndicator(indicators, "school.platformEvents", newPlatformInvitations, {
    tone: "new",
    label: `${newPlatformInvitations} new platform event invitation${
      newPlatformInvitations === 1 ? "" : "s"
    }`,
  });
  addIndicator(indicators, "school.schoolEvents", schoolEventsTodo, {
    label: `${schoolEventsTodo} school event${
      schoolEventsTodo === 1 ? "" : "s"
    } need your action`,
  });

  // Per-event-tab "new since you last opened that tab" signals → sub-tab red
  // dots. Each surface is cleared when the school clicks that specific tab.
  const eventTabSurfaces = [
    "school.eventInvitations",
    "school.eventRegistrations",
    "school.eventResults",
  ];
  const eventTabSeenStates = await UserSurfaceSeenState.find({
    user: session.user.id,
    surface: { $in: eventTabSurfaces },
  }).lean();
  const eventTabSeen = new Map(
    eventTabSeenStates.map((state) => [state.surface, state.seenAt])
  );
  const eventTabBaselineInserts = eventTabSurfaces
    .filter((surface) => !eventTabSeen.has(surface))
    .map((surface) =>
      UserSurfaceSeenState.updateOne(
        { user: session.user.id, surface },
        {
          $setOnInsert: {
            user: session.user.id,
            role: session.user.role,
            surface,
            seenAt: indicatorBaselineAt,
          },
        },
        { upsert: true }
      )
    );
  if (eventTabBaselineInserts.length > 0) {
    await Promise.all(eventTabBaselineInserts);
  }
  const invitationsSeenAt =
    eventTabSeen.get("school.eventInvitations") || indicatorBaselineAt;
  const registrationsSeenAt =
    eventTabSeen.get("school.eventRegistrations") || indicatorBaselineAt;
  const resultsSeenAt =
    eventTabSeen.get("school.eventResults") || indicatorBaselineAt;

  const [newEventInvitations, newEventRegistrations, newEventResults] =
    await Promise.all([
      EventSchoolInvitation.countDocuments({
        school: { $in: schoolIds },
        status: { $nin: ["WITHDRAWN", "DISAPPROVED"] },
        $or: [
          { notifiedAt: { $gt: invitationsSeenAt } },
          { createdAt: { $gt: invitationsSeenAt } },
        ],
      }),
      ParticipationRequest.countDocuments({
        school: { $in: schoolIds },
        status: { $in: ["PENDING", "APPROVED", "ENROLLED"] },
        $or: [
          { requestedAt: { $gt: registrationsSeenAt } },
          { createdAt: { $gt: registrationsSeenAt } },
        ],
      }),
      Achievement.countDocuments({
        school: { $in: schoolIds },
        awardedAt: { $gt: resultsSeenAt },
      }),
    ]);

  addIndicator(indicators, "school.eventInvitations", newEventInvitations, {
    tone: "new",
  });
  addIndicator(indicators, "school.eventRegistrations", newEventRegistrations, {
    tone: "new",
  });
  addIndicator(indicators, "school.eventResults", newEventResults, {
    tone: "new",
  });

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

  // New results/certificates for the student since they last opened Results.
  const eventResultsSeenState = await UserSurfaceSeenState.findOne({
    user: session.user.id,
    surface: "student.eventResults",
  }).lean();
  const eventResultsSeenAt = eventResultsSeenState?.seenAt || indicatorBaselineAt;
  if (!eventResultsSeenState) {
    await UserSurfaceSeenState.updateOne(
      { user: session.user.id, surface: "student.eventResults" },
      {
        $setOnInsert: {
          user: session.user.id,
          role: session.user.role,
          surface: "student.eventResults",
          seenAt: indicatorBaselineAt,
        },
      },
      { upsert: true }
    );
  }
  const newStudentResults = await Achievement.countDocuments({
    student: student._id,
    awardedAt: { $gt: eventResultsSeenAt },
  });
  addIndicator(indicators, "student.eventResults", newStudentResults, {
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
