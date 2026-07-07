import User from "@/models/User";
import Student from "@/models/Student";
import Event from "@/models/Event";
import EventSchoolInvitation from "@/models/EventSchoolInvitation";
import ParticipationRequest from "@/models/ParticipationRequest";
import Achievement from "@/models/Achievement";
import StudentTransfer from "@/models/StudentTransfer";
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

const SCHOOL_SEEN_SURFACES = [
  "school.platformEvents",
  "school.schoolWall",
  "school.eventInvitations",
  "school.eventRegistrations",
  "school.eventResults",
];

async function getSchoolAdminIndicators(session) {
  const indicators = emptyIndicatorMap();
  const schoolIds = schoolIdsForSession(session);

  // Wave 1: the notification payload and every tracked seen-state in one query
  // each. (This used to be several sequential waves of findOnes — with a remote
  // DB every extra wave is a full network round-trip.)
  const [schoolNotifications, seenStates] = await Promise.all([
    getSchoolNotificationPayload(session, 100),
    UserSurfaceSeenState.find({
      user: session.user.id,
      surface: { $in: SCHOOL_SEEN_SURFACES },
    }).lean(),
  ]);

  const indicatorBaselineAt = new Date();
  const seenBySurface = new Map(
    seenStates.map((state) => [state.surface, state.seenAt])
  );
  const platformEventsSeenAt =
    seenBySurface.get("school.platformEvents") || indicatorBaselineAt;
  const schoolWallSeenAt =
    seenBySurface.get("school.schoolWall") || indicatorBaselineAt;
  const invitationsSeenAt =
    seenBySurface.get("school.eventInvitations") || indicatorBaselineAt;
  const registrationsSeenAt =
    seenBySurface.get("school.eventRegistrations") || indicatorBaselineAt;
  const resultsSeenAt =
    seenBySurface.get("school.eventResults") || indicatorBaselineAt;

  // Establish a "seen" baseline on first encounter so existing content does not
  // all show up as new. These writes only matter for future requests, so they
  // run in the same wave as the counts below.
  const seenBaselineInserts = SCHOOL_SEEN_SURFACES.filter(
    (surface) => !seenBySurface.has(surface)
  ).map((surface) =>
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

  // Wave 2: every count in a single parallel batch.
  const [
    magazineReview,
    newPlatformInvitations,
    pendingParticipationRequests,
    activeSchoolEvents,
    pendingTransfers,
    newEventInvitations,
    newEventRegistrations,
    newEventResults,
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
    StudentTransfer.countDocuments({
      $or: [
        { fromSchool: { $in: schoolIds }, status: { $in: ["PENDING_RELEASE", "PENDING"] } },
        { toSchool: { $in: schoolIds }, status: "PENDING_ADMISSION" },
      ],
    }),
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
    ...seenBaselineInserts,
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
  addIndicator(indicators, "school.studentTransfers", pendingTransfers, {
    label: `${pendingTransfers} student transfer${
      pendingTransfers === 1 ? "" : "s"
    } need your action`,
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

const STUDENT_SEEN_SURFACES = [
  "student.schoolWall",
  "student.schoolMagazine",
  "student.eventResults",
];

async function getStudentIndicators(session) {
  const indicators = emptyIndicatorMap();

  // Wave 1: the student record, notification payload, and every tracked
  // seen-state — all independent, all in parallel. (This used to be four
  // sequential waves; each wave costs a full network round-trip to the DB.)
  const [student, studentNotifications, seenStates] = await Promise.all([
    Student.findOne(buildStudentLookup(session)).select("_id school grade").lean(),
    getStudentNotificationPayload(session, 100),
    UserSurfaceSeenState.find({
      user: session.user.id,
      surface: { $in: STUDENT_SEEN_SURFACES },
    }).lean(),
  ]);

  if (!student) return indicators;

  const indicatorBaselineAt = new Date();
  const seenBySurface = new Map(
    seenStates.map((state) => [state.surface, state.seenAt])
  );
  const missingSurfaces = STUDENT_SEEN_SURFACES.filter(
    (surface) => !seenBySurface.has(surface)
  );

  const schoolWallSeenAt =
    seenBySurface.get("student.schoolWall") || indicatorBaselineAt;
  const schoolMagazineSeenAt =
    seenBySurface.get("student.schoolMagazine") || indicatorBaselineAt;
  const eventResultsSeenAt =
    seenBySurface.get("student.eventResults") || indicatorBaselineAt;

  // Wave 2: all counts, plus the first-visit baseline writes (which only matter
  // for future requests, so they can share the wave).
  const baselineWrite =
    missingSurfaces.length > 0
      ? UserSurfaceSeenState.bulkWrite(
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
        )
      : Promise.resolve();

  const [newSchoolWallPosts, newMagazineIssues, newStudentResults] =
    await Promise.all([
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
      Achievement.countDocuments({
        student: student._id,
        awardedAt: { $gt: eventResultsSeenAt },
      }),
      baselineWrite,
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

// ── Short per-user cache ─────────────────────────────────────
// The sidebar polls indicators every 60s per tab, and every page navigation can
// trigger a refetch. Badges tolerate a few seconds of staleness, so a short
// per-instance cache absorbs repeat hits (multiple tabs, quick navigations)
// without re-running the whole query set. Cleared for a user the moment they
// mark a surface seen so badge clears still feel instant.
const INDICATOR_CACHE_TTL_MS = 30000;
const INDICATOR_CACHE_MAX_ENTRIES = 1000;
const indicatorCache = new Map();

export function invalidateWorkIndicatorsCache(userId) {
  indicatorCache.delete(String(userId || ""));
}

export async function getWorkIndicatorsCached(session) {
  const userId = String(session?.user?.id || "");
  if (!userId) return getWorkIndicators(session);

  const cached = indicatorCache.get(userId);
  if (cached && Date.now() - cached.at < INDICATOR_CACHE_TTL_MS) {
    return cached.indicators;
  }

  const indicators = await getWorkIndicators(session);

  if (indicatorCache.size >= INDICATOR_CACHE_MAX_ENTRIES) {
    indicatorCache.clear();
  }
  indicatorCache.set(userId, { at: Date.now(), indicators });

  return indicators;
}
